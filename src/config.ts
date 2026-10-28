import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WorkspaceError } from './errors.js';

export interface OAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly homeDir: string;
}

function required(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new WorkspaceError('MISSING_CONFIG', `Missing ${name}. See references/setup.md.`);
  return trimmed;
}

function validateRedirectUri(value: string | undefined): string {
  const redirect = value || 'http://localhost:8080/callback';
  let url: URL;
  try {
    url = new URL(redirect);
  } catch {
    throw new WorkspaceError('INVALID_REDIRECT', 'GOOGLE_OAUTH_REDIRECT_URI must be an absolute loopback HTTP URL.');
  }
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (url.protocol !== 'http:' || !loopback || !url.port || url.username || url.password || url.search || url.hash) {
    throw new WorkspaceError('INVALID_REDIRECT', 'OAuth redirect must be an exact HTTP loopback URI with an explicit port and no query or fragment.');
  }
  return url.href;
}

export function resolveHomeDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.WORKSPACE_API_HOME?.trim() || path.join(os.homedir(), '.google-workspace-api');
}

export async function loadOAuthConfig(env: NodeJS.ProcessEnv = process.env): Promise<OAuthConfig> {
  const clientId = required(env.GOOGLE_OAUTH_CLIENT_ID, 'GOOGLE_OAUTH_CLIENT_ID');
  let clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const secretFile = env.GOOGLE_OAUTH_CLIENT_SECRET_FILE?.trim();
  if (!clientSecret && secretFile) {
    const raw = (await fs.readFile(secretFile, 'utf8')).trim();
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw) as { web?: { client_secret?: string }; installed?: { client_secret?: string } };
        clientSecret = parsed.web?.client_secret || parsed.installed?.client_secret || '';
      } catch {
        throw new WorkspaceError('INVALID_SECRET_FILE', 'The OAuth client secret file contains invalid JSON.');
      }
    } else {
      clientSecret = raw;
    }
  }
  if (!clientSecret) {
    throw new WorkspaceError('MISSING_CONFIG', 'Missing GOOGLE_OAUTH_CLIENT_SECRET or GOOGLE_OAUTH_CLIENT_SECRET_FILE. See references/setup.md.');
  }
  return {
    clientId,
    clientSecret,
    redirectUri: validateRedirectUri(env.GOOGLE_OAUTH_REDIRECT_URI),
    homeDir: resolveHomeDir(env),
  };
}

export function assertNodeVersion(version = process.versions.node): void {
  const [major, minor] = version.split('.').map(Number);
  if (major !== 24 || minor !== 22) {
    throw new WorkspaceError('NODE_VERSION', `Node 24.22.x is required. Current version is ${version}.`);
  }
}

export function parseJsonObject(input: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    throw new WorkspaceError('INVALID_JSON', 'Tool arguments must be valid JSON.');
  }
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw new WorkspaceError('INVALID_JSON', 'Tool arguments must be a JSON object.');
  }
  return value as Record<string, unknown>;
}
