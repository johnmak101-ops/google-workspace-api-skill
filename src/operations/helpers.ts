import type { ApiOperation, QueryParam, QueryType, ServiceName } from '../catalog.js';

export const scope = (name: string): string => `https://www.googleapis.com/auth/${name}`;
export const text = { type: 'string' } as const;
export const integer = { type: 'integer', minimum: 1 } as const;
export const flag = { type: 'boolean' } as const;
export const strings = { type: 'array', items: { type: 'string' } } as const;
export const object = { type: 'object', additionalProperties: true } as const;

export function schema(properties: Record<string, unknown>, required: readonly string[] = []): Record<string, unknown> {
  return { type: 'object', properties, required, additionalProperties: false };
}

export function query(wireName: string, type: QueryType = 'string', required = false, extras: Pick<QueryParam, 'defaultValue' | 'join'> = {}): QueryParam {
  return { wireName, type, ...(required ? { required: true } : {}), ...extras };
}

type RestInput = Omit<ApiOperation, 'kind' | 'pathParams' | 'queryParams' | 'bodyParams' | 'bodyKind' | 'binaryResponse'> & {
  readonly pathParams?: readonly string[];
  readonly queryParams?: Readonly<Record<string, QueryParam>>;
  readonly bodyParams?: readonly string[];
  readonly bodyKind?: 'none' | 'json' | 'multipart';
  readonly binaryResponse?: boolean;
};

export function rest(input: RestInput): ApiOperation {
  const { pathParams = [], queryParams = {}, bodyParams = [], bodyKind, ...definition } = input;
  return {
    kind: 'rest', pathParams, queryParams, bodyParams,
    bodyKind: bodyKind ?? (bodyParams.length > 0 ? 'json' : 'none'),
    ...definition,
  };
}

export function local(service: ServiceName, name: string, description: string, inputSchema: Record<string, unknown>, scopes: readonly string[]): ApiOperation {
  return {
    kind: 'local', service, name, description, inputSchema, scopes,
    method: 'GET', origin: 'local', path: 'local', readOnly: true,
    pathParams: [], queryParams: {}, bodyParams: [], bodyKind: 'none',
  };
}
