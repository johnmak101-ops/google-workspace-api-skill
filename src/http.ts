import { WorkspaceError } from './errors.js';

export type JsonObject = Record<string, unknown>;

export async function postForm(url: string, parameters: Record<string, string>, signal?: AbortSignal): Promise<JsonObject> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams(parameters),
    redirect: 'manual',
    signal: signal ?? null,
  });
  if (!response.ok) {
    const body = await response.text();
    if (body.includes('invalid_grant')) {
      throw new WorkspaceError('AUTH_REQUIRED', 'Google rejected the stored grant. Run auth again to reconnect your account.');
    }
    throw new WorkspaceError('OAUTH_HTTP', `Google OAuth request failed with HTTP ${response.status}.`);
  }
  const value: unknown = await response.json();
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw new WorkspaceError('OAUTH_RESPONSE', 'Google OAuth returned an invalid response.');
  }
  return value as JsonObject;
}
