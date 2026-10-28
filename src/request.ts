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

function requiredFields(operation: ApiOperation): Set<string> {
  const required = operation.inputSchema.required;
  const fields = Array.isArray(required) ? required.filter((value): value is string => typeof value === 'string') : [];
  return new Set([...fields, ...Object.entries(operation.queryParams).filter(([, param]) => param.required).map(([name]) => name)]);
}

function validateSchema(name: string, value: unknown, schema: unknown): void {
  if (value === null) invalid(name, 'non-null');
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) return;
  const definition = schema as Record<string, unknown>;
  const type = definition.type;
  if (type === 'string' && typeof value !== 'string') invalid(name, 'a string');
  if (type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) invalid(name, 'a finite number');
  if (type === 'integer' && (typeof value !== 'number' || !Number.isInteger(value))) invalid(name, 'an integer');
  if (type === 'boolean' && typeof value !== 'boolean') invalid(name, 'a boolean');
  if ((type === 'number' || type === 'integer') && typeof definition.minimum === 'number' && (value as number) < definition.minimum) invalid(name, `at least ${definition.minimum}`);
  if (type === 'array') {
    if (!Array.isArray(value)) invalid(name, 'an array');
    if (definition.items !== undefined) value.forEach((item, index) => validateSchema(`${name}[${index}]`, item, definition.items));
  }
  if (type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid(name, 'an object');
    const objectValue = value as Record<string, unknown>;
    const properties = definition.properties !== null && typeof definition.properties === 'object' && !Array.isArray(definition.properties)
      ? definition.properties as Record<string, unknown>
      : {};
    const required = Array.isArray(definition.required) ? definition.required : [];
    for (const field of required) {
      if (typeof field === 'string' && objectValue[field] === undefined) throw new WorkspaceError('INVALID_ARGUMENT', `Missing required field: ${name}.${field}`);
    }
    if (definition.additionalProperties === false) {
      for (const field of Object.keys(objectValue)) {
        if (!(field in properties)) throw new WorkspaceError('INVALID_ARGUMENT', `Unknown field: ${name}.${field}`);
      }
    }
    for (const [field, fieldValue] of Object.entries(objectValue)) {
      if (field in properties) validateSchema(`${name}.${field}`, fieldValue, properties[field]);
    }
  }
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

function jsonBody(operation: ApiOperation, args: Record<string, unknown>, metadataOnlyDrive: boolean): string {
  if (metadataOnlyDrive) return JSON.stringify(args.metadata ?? {});
  const body: Record<string, unknown> = {};
  for (const name of operation.bodyParams) {
    if (args[name] !== undefined) body[name] = args[name];
  }
  return JSON.stringify(body);
}

function multipartBody(args: Record<string, unknown>, properties: Record<string, unknown>): { body: string; contentType: string } {
  const metadata = args.metadata ?? {};
  validateSchema('metadata', metadata, properties.metadata);
  const encoded = args.contentBase64;
  if (encoded !== undefined) validateSchema('contentBase64', encoded, properties.contentBase64);
  const mimeType = args.mimeType ?? 'application/octet-stream';
  validateSchema('mimeType', mimeType, properties.mimeType);
  const boundary = 'google-workspace-api-boundary';
  const content = encoded ?? '';
  const body = [
    `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', JSON.stringify(metadata),
    `--${boundary}`, `Content-Type: ${mimeType}`, 'Content-Transfer-Encoding: base64', '', content, `--${boundary}--`, '',
  ].join('\r\n');
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

function isDriveMediaOperation(operation: ApiOperation): boolean {
  return operation.service === 'drive' && (operation.name === 'create_file' || operation.name === 'update_file');
}

export function prepareRequest(operation: ApiOperation, args: Record<string, unknown>): PreparedRequest {
  if (operation.kind === 'local') throw new WorkspaceError('LOCAL_OPERATION', `${operation.service}.${operation.name} is a local operation.`);
  const properties = schemaProperties(operation);
  const allowed = new Set([...operation.pathParams, ...Object.keys(operation.queryParams), ...operation.bodyParams]);
  for (const [name, value] of Object.entries(args)) {
    if (!allowed.has(name)) throw new WorkspaceError('INVALID_ARGUMENT', `Unknown argument for ${operation.name}: ${name}`);
    if (value === null) invalid(name, 'non-null');
    if (properties[name] !== undefined) validateSchema(name, value, properties[name]);
  }
  for (const name of requiredFields(operation)) {
    if (args[name] === undefined) throw new WorkspaceError('INVALID_ARGUMENT', `Missing required argument for ${operation.name}: ${name}`);
  }

  const mediaOperation = isDriveMediaOperation(operation);
  const hasMediaContent = mediaOperation && args.contentBase64 !== undefined;
  const metadataOnlyDrive = mediaOperation && !hasMediaContent;
  if (mediaOperation && args.uploadType !== undefined && (metadataOnlyDrive || args.uploadType !== 'multipart')) {
    throw new WorkspaceError('INVALID_ARGUMENT', 'uploadType is determined by the presence of contentBase64.');
  }
  const operationPath = metadataOnlyDrive ? operation.path.replace('/upload/', '/') : operation.path;
  const path = operationPath.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    if (!operation.pathParams.includes(name)) throw new WorkspaceError('INVALID_OPERATION', `Undeclared path parameter: ${name}`);
    const value = args[name];
    if (typeof value !== 'string' && typeof value !== 'number') invalid(name, 'a string or number');
    return encodeURIComponent(String(value));
  });
  const url = new URL(path, operation.origin);
  if (url.origin !== operation.origin) throw new WorkspaceError('INVALID_OPERATION', 'Operation origin mismatch.');

  for (const [name, param] of Object.entries(operation.queryParams)) {
    if (metadataOnlyDrive && name === 'uploadType') continue;
    const value = args[name] ?? param.defaultValue;
    if (value !== undefined) appendQuery(url.searchParams, name, value, param);
  }

  const headers: Record<string, string> = { accept: 'application/json' };
  const bodyKind = metadataOnlyDrive ? 'json' : operation.bodyKind;
  if (bodyKind === 'none') return { url: url.toString(), method: operation.method, headers };
  if (bodyKind === 'json') {
    const body = jsonBody(operation, args, metadataOnlyDrive);
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new WorkspaceError('ARGS_TOO_LARGE', 'Request body must not exceed 1 MB.');
    return { url: url.toString(), method: operation.method, headers: { ...headers, 'content-type': 'application/json' }, body };
  }
  const multipart = multipartBody(args, properties);
  if (Buffer.byteLength(multipart.body) > MAX_BODY_BYTES) throw new WorkspaceError('ARGS_TOO_LARGE', 'Request body must not exceed 1 MB.');
  return { url: url.toString(), method: operation.method, headers: { ...headers, 'content-type': multipart.contentType }, body: multipart.body };
}
