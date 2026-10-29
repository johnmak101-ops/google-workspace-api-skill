import { promises as fs } from 'node:fs';
import path from 'node:path';
import { CONFIG_FILE, resolveHomeDir, validateRedirectUri } from './config.js';
import { WorkspaceError } from './errors.js';
import { atomicWriteSecure } from './secure-fs.js';

export interface SetupOptions {
  readonly clientSecretFile?: string | undefined;
  readonly clientId?: string | undefined;
  readonly redirectUri?: string | undefined;
  readonly force?: boolean | undefined;
}

export interface SetupResult {
  readonly configPath: string;
  readonly clientId: string;
  readonly clientType: 'installed';
  readonly redirectUri: string;
}

interface ClientCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

export function parseClientCredentials(raw: string, fallbackClientId?: string): ClientCredentials {
  const value = raw.trim();
  if (!value) throw new WorkspaceError('INVALID_CLIENT_FILE', 'The client secret file is empty.');
  if (!value.startsWith('{')) {
    if (!fallbackClientId?.trim()) {
      throw new WorkspaceError('INVALID_CLIENT_FILE', 'A raw client secret needs --client-id. Pass the downloaded Desktop app JSON instead.');
    }
    return { clientId: fallbackClientId.trim(), clientSecret: value };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new WorkspaceError('INVALID_CLIENT_FILE', 'The client secret file is not valid JSON.');
  }
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new WorkspaceError('INVALID_CLIENT_FILE', 'The client secret file must contain a JSON object.');
  }
  const record = parsed as Record<string, unknown>;
  if (!record.installed && record.web) {
    throw new WorkspaceError('CLIENT_TYPE', 'This is a Web application OAuth client. Create a Desktop app client: the loopback flow does not need a shared web secret.');
  }
  const block = (record.installed ?? record) as Record<string, unknown>;
  const clientId = typeof block.client_id === 'string' ? block.client_id.trim() : '';
  const clientSecret = typeof block.client_secret === 'string' ? block.client_secret.trim() : '';
  if (!clientId || !clientSecret) {
    throw new WorkspaceError('INVALID_CLIENT_FILE', 'The client secret file is missing client_id or client_secret.');
  }
  return { clientId, clientSecret };
}

export async function runSetup(env: NodeJS.ProcessEnv, options: SetupOptions): Promise<SetupResult> {
  const homeDir = resolveHomeDir(env);
  const configPath = path.join(homeDir, CONFIG_FILE);
  const file = options.clientSecretFile?.trim();
  if (!file) {
    throw new WorkspaceError('USAGE', 'Usage: setup --client-secret-file <downloaded-desktop-client.json> [--redirect-uri <uri>] [--force]');
  }
  const redirectUri = validateRedirectUri(options.redirectUri?.trim() || env.GOOGLE_OAUTH_REDIRECT_URI);
  let exists = true;
  try {
    await fs.access(configPath);
  } catch {
    exists = false;
  }
  if (exists && !options.force) {
    throw new WorkspaceError('CONFIG_EXISTS', `Configuration already exists at ${configPath}. Use --force to replace it.`);
  }
  const credentials = parseClientCredentials(await fs.readFile(file, 'utf8'), options.clientId);
  await atomicWriteSecure(configPath, `${JSON.stringify({ ...credentials, redirectUri }, null, 2)}\n`);
  return { configPath, clientId: credentials.clientId, clientType: 'installed', redirectUri };
}
