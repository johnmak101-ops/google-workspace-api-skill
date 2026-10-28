import { ResultStore, type StoredResult } from './result-store.js';

const MAX_ENVELOPE_BYTES = 65_535;

export interface Envelope {
  readonly v: 1;
  readonly ok: boolean;
  readonly status: 'ok' | 'error' | 'unknown';
  readonly mayHaveCompleted: boolean;
  readonly content?: unknown;
  readonly size?: number;
  readonly truncated?: boolean;
  readonly file?: StoredResult;
  readonly files?: readonly StoredResult[];
  readonly error?: { readonly code: string; readonly message: string } | undefined;
  readonly [key: string]: unknown;
}

export function redactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/Bearer\s+\S+/gi, 'Bearer REDACTED')
    .replace(/ya29\.[A-Za-z0-9._-]+/g, 'REDACTED')
    .replace(/GOCSPX-[A-Za-z0-9._-]+/g, 'REDACTED')
    .replace(/1\/\/[A-Za-z0-9._-]+/g, 'REDACTED')
    .replace(/(refresh_token|access_token|client_secret|refreshToken|accessToken|clientSecret|authorizationCode)(["']?\s*[:=]\s*["']?)([^"',\s}]+)/gi, '$1$2REDACTED')
    .replace(/([?&]code=)[^&\s]+/gi, '$1REDACTED');
}

export function makeEnvelope(data: {
  readonly service?: string | undefined;
  readonly tool?: string | undefined;
  readonly content?: unknown;
  readonly status?: 'ok' | 'error' | 'unknown';
  readonly mayHaveCompleted?: boolean;
  readonly error?: { readonly code: string; readonly message: string } | undefined;
  readonly [key: string]: unknown;
}): Envelope {
  const status = data.status || (data.error ? 'error' : 'ok');
  return {
    v: 1,
    ok: status === 'ok',
    status,
    mayHaveCompleted: data.mayHaveCompleted ?? status === 'unknown',
    ...data,
  };
}

function preview(value: unknown, limit = 2048): string {
  const text = (typeof value === 'string' ? value : JSON.stringify(value)) ?? String(value);
  const buffer = Buffer.from(text, 'utf8');
  return buffer.length <= limit ? text : buffer.subarray(0, limit).toString('utf8');
}

function sanitizeValue<T>(value: T): T {
  if (typeof value === 'string') return redactError(value) as T;
  if (Array.isArray(value)) return value.map(sanitizeValue) as T;
  if (value !== null && typeof value === 'object') {
    if (Buffer.isBuffer(value)) return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeValue(item)])) as T;
  }
  return value;
}

export function capEnvelope(envelope: Envelope): Envelope {
  if (Buffer.byteLength(JSON.stringify(envelope), 'utf8') <= MAX_ENVELOPE_BYTES) return envelope;
  const file = envelope.file ? { ...envelope.file, mimeType: preview(envelope.file.mimeType, 256) } : undefined;
  const compact = makeEnvelope({
    service: typeof envelope.service === 'string' ? preview(envelope.service, 128) : undefined,
    tool: typeof envelope.tool === 'string' ? preview(envelope.tool, 256) : undefined,
    status: envelope.status,
    mayHaveCompleted: envelope.mayHaveCompleted,
    content: preview(envelope.content),
    size: envelope.size,
    truncated: true,
    file,
    error: envelope.error ? { code: preview(envelope.error.code, 128), message: preview(envelope.error.message) } : undefined,
  });
  if (Buffer.byteLength(JSON.stringify(compact), 'utf8') <= MAX_ENVELOPE_BYTES) return compact;
  return makeEnvelope({
    status: envelope.status,
    mayHaveCompleted: envelope.mayHaveCompleted,
    content: file ? 'Result saved.' : 'Response exceeded the output limit.',
    truncated: true,
    file: file ? { ...file, path: preview(file.path, 1024) } : undefined,
  });
}

export function serializeEnvelope(envelope: Envelope): string {
  return `${JSON.stringify(capEnvelope(sanitizeValue(envelope)))}\n`;
}

function embeddedResources(value: unknown): readonly { readonly bytes: Buffer; readonly mimeType: string }[] {
  if (value === null || typeof value !== 'object') return [];
  const result = value as { content?: unknown };
  if (!Array.isArray(result.content)) return [];
  const resources: { readonly bytes: Buffer; readonly mimeType: string }[] = [];
  for (const block of result.content) {
    if (block === null || typeof block !== 'object') continue;
    const resource = (block as { resource?: unknown }).resource;
    if (resource === null || typeof resource !== 'object') continue;
    const candidate = resource as { blob?: unknown; mimeType?: unknown };
    if (typeof candidate.blob === 'string') {
      resources.push({
        bytes: Buffer.from(candidate.blob, 'base64'),
        mimeType: typeof candidate.mimeType === 'string' ? candidate.mimeType : 'application/octet-stream',
      });
    }
  }
  return resources;
}

export async function writeBoundedResult(data: {
  readonly service: string;
  readonly tool?: string | undefined;
  readonly content: unknown;
  readonly mimeType?: string;
}, store: ResultStore): Promise<Envelope> {
  const embedded = embeddedResources(data.content);
  if (embedded.length > 0) {
    const files = [];
    for (const resource of embedded) files.push(await store.saveBytes(resource.bytes, resource.mimeType));
    const original = data.content as { content: { resource?: { blob?: unknown } }[] };
    const remaining = original.content.filter((block) => block.resource?.blob === undefined);
    if (embedded.length === 1 && files[0]) {
      if (remaining.length === 0) {
        return capEnvelope(makeEnvelope({ service: data.service, tool: data.tool, content: 'Binary result saved.', size: files[0].size, truncated: false, file: files[0] }));
      }
      return capEnvelope(makeEnvelope({ service: data.service, tool: data.tool, content: remaining, files, size: files.reduce((total, file) => total + file.size, 0), truncated: false }));
    }
    return capEnvelope(makeEnvelope({ service: data.service, tool: data.tool, content: remaining, files, size: files.reduce((total, file) => total + file.size, 0), truncated: false }));
  }
  if (Buffer.isBuffer(data.content)) {
    const file = await store.saveBytes(data.content, data.mimeType || 'application/octet-stream');
    return capEnvelope(makeEnvelope({ service: data.service, tool: data.tool, content: 'Binary result saved.', size: file.size, truncated: false, file }));
  }
  const serialized = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
  const size = Buffer.byteLength(serialized, 'utf8');
  const candidate = makeEnvelope({ service: data.service, tool: data.tool, content: data.content, size, truncated: false });
  if (Buffer.byteLength(JSON.stringify(candidate), 'utf8') <= MAX_ENVELOPE_BYTES) return candidate;
  const mimeType = data.mimeType || (typeof data.content === 'string' ? 'text/plain; charset=utf-8' : 'application/json');
  const file = await store.saveText(serialized, mimeType);
  return capEnvelope(makeEnvelope({ service: data.service, tool: data.tool, content: preview(data.content), size, truncated: true, file }));
}
