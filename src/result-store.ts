import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { atomicWriteSecure, secureDirectory, secureFile } from './secure-fs.js';

export interface StoredResult {
  readonly path: string;
  readonly mimeType: string;
  readonly size: number;
}

export class ResultStore {
  constructor(private readonly directory: string) {}

  async saveText(text: string, mimeType: string): Promise<StoredResult> {
    const file = path.join(this.directory, `${randomUUID()}.txt`);
    await atomicWriteSecure(file, text);
    return { path: file, mimeType, size: Buffer.byteLength(text, 'utf8') };
  }

  async saveBytes(bytes: Buffer, mimeType: string): Promise<StoredResult> {
    await secureDirectory(this.directory);
    const file = path.join(this.directory, `${randomUUID()}.bin`);
    await fs.writeFile(file, bytes, { flag: 'wx', mode: 0o600 });
    await secureFile(file);
    return { path: file, mimeType, size: bytes.length };
  }
}
