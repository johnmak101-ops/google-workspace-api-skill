import type { ApiOperation, QueryParam } from './catalog.js';
import { WorkspaceError } from './errors.js';

const MAX_BODY_BYTES = 1_000_000;

export interface PreparedRequest {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body?: string;
}

function invalid(name: string, expectation: string): never {
  throw new WorkspaceError('INVALID_ARGUMENT', `${name} must be ${expectation}.`);
}

function schemaProperties(operation: ApiOperation): Record<string, unknown> {
  const properties = operation.inputSchema.properties;
  return properties !== null && typeof properties === 'object' && !Array.isArray(properties)
    ? properties as Record<string, unknown>
    : {};
}

function schemaType(properties: Record<string, unknown>, name: string): string | undefined {
  const property = properties[name];
  if (property === null || typeof property !== 'object' || Array.isArray(property)) return undefined;
  const type = (property as Record<string, unknown>).type;
  return typeof type === 'string' ? type : undefined;
}

function requiredFields(operation: ApiOperation): Set<string> {
  const required = operation.inputSchema.required;
  const fields = Array.isArray(required) ? required.filter((value): value is string => typeof value === 'string') : [];
  return new Set([...fields, ...Object.entries(operation.queryParams).filter(([, param]) => param.required).map(([name]) => name)]);
}

function validateJsonValue(name: string, value: unknown, type: string | undefined): void {
  if (value === null) invalid(name, 'non-null');
  if (type === 'string' && typeof value !== 'string') invalid(name, 'a string');
  if ((type === 'number' || type === 'integer') && (typeof value !== 'number' || !Number.isFinite(value))) invalid(name, 'a finite number');
  if (type === 'boolean' && typeof value !== 'boolean') invalid(name, 'a boolean');
  if (type === 'array' && !Array.isArray(value)) invalid(name, 'an array');
  if (type === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) invalid(name, 'an object');
}

function validateQueryValue(name: string, value: unknown, param: QueryParam): void {
  if (param.type === 'stringArray') {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) invalid(name, 'an array of strings');
    return;
  }
  if (param.type === 'string' && typeof value !== 'string') invalid(name, 'a string');
  if (param.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) invalid(name, 'a finite number');
  if (param.type === 'boolean' && typeof value !== 'boolean') invalid(name, 'a boolean');
}

function appendQuery(search: URLSearchParams, name: string, value: unknown, param: QueryParam): void {
  validateQueryValue(name, value, param);
  if (param.type === 'stringArray') {
    const values = value as string[];
    if (param.join === ',') search.append(param.wireName, values.join(','));
    else for (const item of values) search.append(param.wireName, item);
    return;
  }
  search.append(param.wireName, String(value));
}

function jsonBody(operation: ApiOperation, args: Record<string, unknown>, properties: Record<string, unknown>): string {
  const body: Record<string, unknown> = {};
  for (const name of operation.bodyParams) {
    const value = args[name];
    if (value === undefined) continue;
    validateJsonValue(name, value, schemaType(properties, name));
    body[name] = value;
  }
  return JSON.stringify(body);
}

function multipartBody(args: Record<string, unknown>): { body: string; contentType: string } {
  const metadata = args.metadata ?? {};
  validateJsonValue('metadata', metadata, 'object');
  const encoded = args.contentBase64;
  if (encoded !== undefined) validateJsonValue('contentBase64', encoded, 'string');
  const mimeType = args.mimeType ?? 'application/octet-stream';
  validateJsonValue('mimeType', mimeType, 'string');
  const boundary = 'google-workspace-api-boundary';
  const content = encoded ?? '';
  const body = [
    `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', JSON.stringify(metadata),
    `--${boundary}`, `Content-Type: ${mimeType}`, 'Content-Transfer-Encoding: base64', '', content, `--${boundary}--`, '',
  ].join('\r\n');
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

export function prepareRequest(operation: ApiOperation, args: Record<string, unknown>): PreparedRequest {
  if (operation.kind === 'local') throw new WorkspaceError('LOCAL_OPERATION', `${operation.service}.${operation.name} is a local operation.`);
  const properties = schemaProperties(operation);
  const allowed = new Set([...operation.pathParams, ...Object.keys(operation.queryParams), ...operation.bodyParams]);
  for (const name of Object.keys(args)) {
    if (!allowed.has(name)) throw new WorkspaceError('INVALID_ARGUMENT', `Unknown argument for ${operation.name}: ${name}`);
    if (args[name] === null) invalid(name, 'non-null');
  }
  for (const name of requiredFields(operation)) {
    if (args[name] === undefined) throw new WorkspaceError('INVALID_ARGUMENT', `Missing required argument for ${operation.name}: ${name}`);
  }

  const path = operation.path.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    if (!operation.pathParams.includes(name)) throw new WorkspaceError('INVALID_OPERATION', `Undeclared path parameter: ${name}`);
    const value = args[name];
    if (typeof value !== 'string' && typeof value !== 'number') invalid(name, 'a string or number');
    return encodeURIComponent(String(value));
  });
  const url = new URL(path, operation.origin);
  if (url.origin !== operation.origin) throw new WorkspaceError('INVALID_OPERATION', 'Operation origin mismatch.');

  for (const [name, param] of Object.entries(operation.queryParams)) {
    const value = args[name] ?? param.defaultValue;
    if (value !== undefined) appendQuery(url.searchParams, name, value, param);
  }

  const headers: Record<string, string> = { accept: 'application/json' };
  if (operation.bodyKind === 'none') return { url: url.toString(), method: operation.method, headers };
  if (operation.bodyKind === 'json') {
    const body = jsonBody(operation, args, properties);
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new WorkspaceError('ARGS_TOO_LARGE', 'Request body must not exceed 1 MB.');
    return { url: url.toString(), method: operation.method, headers: { ...headers, 'content-type': 'application/json' }, body };
  }
  const multipart = multipartBody(args);
  if (Buffer.byteLength(multipart.body) > MAX_BODY_BYTES) throw new WorkspaceError('ARGS_TOO_LARGE', 'Request body must not exceed 1 MB.');
  return { url: url.toString(), method: operation.method, headers: { ...headers, 'content-type': multipart.contentType }, body: multipart.body };
}
