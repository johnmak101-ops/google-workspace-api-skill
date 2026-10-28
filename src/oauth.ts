import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { listServices, scopesFor, type ScopeOptions, type ServiceName, type ServiceSelection } from './catalog.js';
import type { OAuthConfig } from './config.js';
import { WorkspaceError } from './errors.js';
import { postForm } from './http.js';
import { TokenStore } from './token-store.js';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

export interface AuthorizationStatus {
  readonly service: ServiceName;
  readonly status: 'authorized' | 'partial' | 'unavailable';
  readonly grantedScopes: readonly string[];
}

export interface AuthorizeOptions extends ScopeOptions {
  readonly selection?: readonly ServiceSelection[] | undefined;
  readonly openBrowser?: (url: string) => Promise<void>;
  readonly tokenEndpoint?: string;
}

function openBrowser(url: string): Promise<void> {
  process.stderr.write(`Open this URL to authenticate: ${url}\n`);
  const command = process.platform === 'win32'
    ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'rundll32.exe')
    : process.platform === 'darwin' ? '/usr/bin/open' : '/usr/bin/xdg-open';
  if (!existsSync(command)) throw new WorkspaceError('BROWSER_UNAVAILABLE', `Browser launcher not found: ${command}`);
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/(SECRET|TOKEN|CREDENTIAL|PASSWORD|API_KEY)/i.test(key)));
  const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true, env });
  child.on('error', (error) => process.stderr.write(`Browser launcher failed: ${error.message}\n`));
  child.unref();
  return Promise.resolve();
}

function tokenString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value) throw new WorkspaceError('OAUTH_RESPONSE', `Google OAuth response is missing ${name.replace(/_/g, ' ')}.`);
  return value;
}

export class WorkspaceOAuth {
  constructor(private readonly config: OAuthConfig, private readonly store: TokenStore) {}

  async authorize(options: AuthorizeOptions): Promise<AuthorizationStatus[]> {
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(64).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const requested = options.selection ? [...options.selection] : undefined;
    if (requested?.some((item) => item.service === 'universal')) {
      for (const product of options.universalProducts ?? ['gmail', 'drive', 'calendar', 'chat'] as const) {
        if (!requested.some((item) => item.service === product)) requested.push({ service: product, write: false });
      }
    }
    const available = requested?.map((item) => item.service);
    const services = listServices().filter((service) => !available || available.includes(service.name));
    const selection: readonly ServiceSelection[] = services.map((service) => ({
      service: service.name,
      write: service.writeAvailable && (requested?.find((item) => item.service === service.name)?.write ?? true),
    }));
    const open = options.openBrowser || openBrowser;
    const tokenEndpoint = options.tokenEndpoint || GOOGLE_TOKEN;
    const authorizationUrl = new URL(GOOGLE_AUTH);
    authorizationUrl.searchParams.set('client_id', this.config.clientId);
    authorizationUrl.searchParams.set('redirect_uri', this.config.redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', scopesFor(selection, options).join(' '));
    authorizationUrl.searchParams.set('access_type', 'offline');
    authorizationUrl.searchParams.set('prompt', 'consent');
    authorizationUrl.searchParams.set('include_granted_scopes', 'true');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('code_challenge', challenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');
    let resolveResult: (value: AuthorizationStatus[]) => void = () => undefined;
    let rejectResult: (reason: Error) => void = () => undefined;
    const completed = new Promise<AuthorizationStatus[]>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    void completed.catch(() => undefined);
    const server = http.createServer((request, response) => {
      void (async () => {
        response.setHeader('connection', 'close');
        const host = request.headers.host || '';
        if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) {
          response.writeHead(403).end('Forbidden');
          return;
        }
        const callback = new URL(request.url || '/', 'http://localhost');
        if (request.method === 'GET' && callback.pathname === new URL(this.config.redirectUri).pathname) {
          if (callback.searchParams.get('state') !== state) {
            response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8', connection: 'close' });
            response.end('Invalid authentication state.');
            return;
          }
          const code = callback.searchParams.get('code');
          if (!code) {
            response.writeHead(400).end('Missing authorization code.');
            return;
          }
          try {
            const token = await postForm(tokenEndpoint, {
              code, client_id: this.config.clientId, client_secret: this.config.clientSecret,
              redirect_uri: this.config.redirectUri, grant_type: 'authorization_code', code_verifier: verifier,
            });
            const accessToken = tokenString(token.access_token, 'access_token');
            const refreshToken = tokenString(token.refresh_token, 'refresh_token');
            const expiresIn = typeof token.expires_in === 'number' ? token.expires_in : 3600;
            const requestedScopes = scopesFor(selection, options);
            const granted = new Set(typeof token.scope === 'string' ? token.scope.split(/\s+/) : requestedScopes);
            const statuses: AuthorizationStatus[] = [];
            for (const item of selection) {
              const required = scopesFor([item], options);
              const grantedScopes = required.filter((scope) => granted.has(scope));
              const service = item.service;
              const readRequired = scopesFor([{ service, write: false }], options);
              const status = readRequired.every((scope) => granted.has(scope))
                ? required.every((scope) => granted.has(scope)) ? 'authorized' : 'partial'
                : 'unavailable';
              if (grantedScopes.length > 0) {
                await this.store.write(service, {
                  account: 'current-user', clientId: this.config.clientId, accessToken, refreshToken,
                  expiresAt: Date.now() + expiresIn * 1000, grantedScopes,
                });
              } else {
                await this.store.remove(service);
              }
              statuses.push({ service, status, grantedScopes });
            }
            response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'none'" });
            response.end('<!doctype html><html lang="en"><title>Authentication complete</title><body>Authentication complete. You can close this page.</body></html>');
            resolveResult(statuses);
          } catch (error) {
            response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
            response.end('Authentication failed. Return to the terminal for details.');
            rejectResult(error instanceof Error ? error : new Error(String(error)));
          }
          return;
        }
        response.writeHead(404).end('Not found');
      })().catch((error) => {
        if (!response.headersSent) response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
        if (!response.writableEnded) response.end(error instanceof Error ? error.message : 'Authentication failed.');
        rejectResult(error instanceof Error ? error : new Error(String(error)));
      });
    });
    const address = new URL(this.config.redirectUri);
    const host = address.hostname === '[::1]' ? '::1' : address.hostname === 'localhost' ? '127.0.0.1' : address.hostname;
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(Number(address.port), host, resolve);
    });
    const timeout = setTimeout(() => rejectResult(new WorkspaceError('OAUTH_TIMEOUT', 'Authentication timed out. Run auth again.')), 300_000);
    try {
      await open(authorizationUrl.toString());
      return await completed;
    } finally {
      clearTimeout(timeout);
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }

  async getValidAccessToken(service: ServiceName, force = false, signal?: AbortSignal): Promise<string> {
    return this.store.refreshGrant(service, force, async (record) => {
      const token = await postForm(GOOGLE_TOKEN, {
        client_id: this.config.clientId, client_secret: this.config.clientSecret,
        refresh_token: record.refreshToken, grant_type: 'refresh_token',
      }, signal);
      return {
        accessToken: tokenString(token.access_token, 'access_token'),
        refreshToken: typeof token.refresh_token === 'string' ? token.refresh_token : '',
        expiresAt: Date.now() + (typeof token.expires_in === 'number' ? token.expires_in : 3600) * 1000,
      };
    });
  }
}
