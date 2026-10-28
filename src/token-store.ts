import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { ServiceName } from './catalog.js';
import { WorkspaceError } from './errors.js';
import { atomicWriteSecure, secureDirectory, secureFile } from './secure-fs.js';

export interface TokenRecord {
  readonly account: string;
  readonly clientId: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly grantedScopes: readonly string[];
}

export interface TokenStatus {
  readonly service: ServiceName;
  readonly account: string;
  readonly clientId: string;
  readonly expiresAt: number;
  readonly grantedScopes: readonly string[];
}

function isTokenRecord(value: unknown): value is TokenRecord {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.account === 'string' && typeof candidate.clientId === 'string' &&
    typeof candidate.accessToken === 'string' && typeof candidate.refreshToken === 'string' &&
    typeof candidate.expiresAt === 'number' && Array.isArray(candidate.grantedScopes) &&
    candidate.grantedScopes.every((scope) => typeof scope === 'string');
}

function grantIdFor(record: TokenRecord): string {
  return createHash('sha256').update(record.refreshToken).digest('hex');
}

export class TokenStore {
  private readonly tokensDir: string;
  private readonly locksDir: string;

  constructor(homeDir: string) {
    this.tokensDir = path.join(homeDir, 'tokens');
    this.locksDir = path.join(homeDir, 'locks');
  }

  private file(service: ServiceName): string {
    return path.join(this.tokensDir, `${service}.json`);
  }

  async read(service: ServiceName): Promise<TokenRecord | null> {
    try {
      const parsed: unknown = JSON.parse(await fs.readFile(this.file(service), 'utf8'));
      if (!isTokenRecord(parsed)) throw new WorkspaceError('TOKEN_INVALID', `Stored ${service} credentials are invalid. Reauthenticate.`);
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async write(service: ServiceName, record: TokenRecord): Promise<void> {
    await this.withLock(`client-${record.clientId}`, async () => {
      const existing = await this.read(service);
      const refreshToken = record.refreshToken || existing?.refreshToken || '';
      if (!refreshToken) throw new WorkspaceError('REFRESH_REQUIRED', `Google did not return a refresh token for ${service}. Reauthenticate with consent.`);
      await atomicWriteSecure(this.file(service), JSON.stringify({ ...record, refreshToken }, null, 2));
    });
  }

  async refreshGrant(
    service: ServiceName,
    force: boolean,
    refresh: (record: TokenRecord) => Promise<Pick<TokenRecord, 'accessToken' | 'refreshToken' | 'expiresAt'>>,
  ): Promise<string> {
    const initial = await this.read(service);
    if (!initial) throw new WorkspaceError('AUTH_REQUIRED', `Authentication required for ${service}. Run the auth command.`);
    if (!force && initial.expiresAt > Date.now() + 60_000) return initial.accessToken;
    return this.withLock(`grant-${grantIdFor(initial)}`, async () => {
      const current = await this.read(service);
      if (!current) throw new WorkspaceError('AUTH_REQUIRED', `Authentication required for ${service}. Run the auth command.`);
      if (!force && current.expiresAt > Date.now() + 60_000) return current.accessToken;
      const updated = await refresh(current);
      const statuses = await this.status();
      for (const status of statuses) {
        if (status.clientId !== current.clientId) continue;
        const existing = await this.read(status.service);
        if (!existing || grantIdFor(existing) !== grantIdFor(current)) continue;
        await atomicWriteSecure(this.file(status.service), JSON.stringify({
          ...existing,
          accessToken: updated.accessToken,
          refreshToken: updated.refreshToken || existing.refreshToken,
          expiresAt: updated.expiresAt,
        }, null, 2));
      }
      return updated.accessToken;
    });
  }

  async remove(service?: ServiceName): Promise<void> {
    if (service) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          await fs.rm(this.file(service), { force: true });
          return;
        } catch (error) {
          if (process.platform !== 'win32' || (error as NodeJS.ErrnoException).code !== 'EPERM' || attempt === 4) throw error;
          await delay(20);
        }
      }
      return;
    }
    await fs.rm(this.tokensDir, { recursive: true, force: true });
  }

  async status(): Promise<TokenStatus[]> {
    let names: string[];
    try {
      names = await fs.readdir(this.tokensDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const statuses: TokenStatus[] = [];
    for (const name of names) {
      if (!name.endsWith('.json')) continue;
      const service = name.slice(0, -5) as ServiceName;
      const record = await this.read(service);
      if (record) {
        statuses.push({
          service, account: record.account, clientId: record.clientId,
          expiresAt: record.expiresAt, grantedScopes: record.grantedScopes,
        });
      }
    }
    return statuses;
  }

  async withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
    await secureDirectory(this.locksDir);
    const lock = path.join(this.locksDir, `${key}.lock`);
    const deadline = Date.now() + 10_000;
    while (true) {
      let handle: Awaited<ReturnType<typeof fs.open>>;
      try {
        handle = await fs.open(lock, 'wx', 0o600);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        const contention = code === 'EEXIST' || (process.platform === 'win32' && code === 'EPERM');
        if (!contention) throw error;
        try {
          const stat = await fs.stat(lock);
          if (Date.now() - stat.mtimeMs > 30_000) await fs.rm(lock, { force: true });
        } catch (statError) {
          if ((statError as NodeJS.ErrnoException).code !== 'ENOENT') throw statError;
        }
        if (Date.now() >= deadline) throw new WorkspaceError('LOCK_TIMEOUT', `Timed out waiting for credential lock: ${key}`);
        await delay(25);
        continue;
      }
      const nonce = randomUUID();
      await handle.writeFile(JSON.stringify({ nonce, pid: process.pid }), 'utf8');
      const heartbeat = setInterval(() => {
        void fs.utimes(lock, new Date(), new Date()).catch(() => undefined);
      }, 5000);
      heartbeat.unref();
      try {
        await secureFile(lock);
        return await operation();
      } finally {
        clearInterval(heartbeat);
        await handle.close();
        try {
          const contents = await fs.readFile(lock, 'utf8');
          if (contents.includes(nonce)) await fs.rm(lock, { force: true });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
      }
    }
  }
}
