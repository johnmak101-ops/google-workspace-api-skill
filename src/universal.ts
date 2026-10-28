import { getOperation, UNIVERSAL_PRODUCTS, type ServiceName, type UniversalProduct } from './catalog.js';
import { WorkspaceError } from './errors.js';
import { redactError } from './output.js';

export interface UniversalSearchResult {
  readonly results: readonly { readonly service: UniversalProduct; readonly data: unknown }[];
  readonly errors: readonly { readonly service: string; readonly message: string }[];
}

export type InvokeRead = (service: ServiceName, name: string, args: Record<string, unknown>) => Promise<unknown>;

function isProduct(value: unknown): value is UniversalProduct {
  return typeof value === 'string' && (UNIVERSAL_PRODUCTS as readonly string[]).includes(value);
}

function positiveInteger(value: unknown, fallback: number, maximum: number, name: string): number {
  const resolved = value ?? fallback;
  if (typeof resolved !== 'number' || !Number.isInteger(resolved) || resolved < 1 || resolved > maximum) {
    throw new WorkspaceError('INVALID_ARGUMENT', `${name} must be an integer from 1 to ${maximum}.`);
  }
  return resolved;
}

function records(value: unknown, key: string): Record<string, unknown>[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [];
  const items = (value as Record<string, unknown>)[key];
  return Array.isArray(items) ? items.filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object' && !Array.isArray(item)) : [];
}

async function chatSearch(query: string, spaceLimit: number, invokeRead: InvokeRead): Promise<unknown> {
  const response = await invokeRead('chat', 'list_spaces', { pageSize: spaceLimit });
  const spaces = records(response, 'spaces').slice(0, spaceLimit);
  const needle = query.toLowerCase();
  const results = [];
  for (const space of spaces) {
    const name = typeof space.name === 'string' ? space.name : '';
    if (!name.startsWith('spaces/')) continue;
    const spaceId = name.slice('spaces/'.length);
    const messagesResponse = await invokeRead('chat', 'list_messages', { spaceId, pageSize: 10 });
    const messages = records(messagesResponse, 'messages').filter((message) => typeof message.text === 'string' && message.text.toLowerCase().includes(needle));
    results.push({ space: name, messages });
  }
  return results;
}

function driveQuery(query: string): string {
  return `fullText contains '${query.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export async function searchUniversal(args: Record<string, unknown>, invokeRead: InvokeRead): Promise<UniversalSearchResult> {
  const allowedKeys = new Set(['query', 'products', 'pageSize', 'spaceLimit']);
  for (const key of Object.keys(args)) {
    if (!allowedKeys.has(key)) throw new WorkspaceError('INVALID_ARGUMENT', `Unknown federated-search argument: ${key}`);
  }
  if (typeof args.query !== 'string' || !args.query.trim()) throw new WorkspaceError('INVALID_ARGUMENT', 'query must be a non-empty string.');
  const query = args.query.trim();
  if (args.products !== undefined && (!Array.isArray(args.products) || args.products.length === 0 || !args.products.every(isProduct))) {
    throw new WorkspaceError('INVALID_ARGUMENT', `products must contain only: ${UNIVERSAL_PRODUCTS.join(', ')}`);
  }
  const products: readonly UniversalProduct[] = args.products ?? UNIVERSAL_PRODUCTS;
  const pageSize = positiveInteger(args.pageSize, 3, 10, 'pageSize');
  const spaceLimit = positiveInteger(args.spaceLimit, 2, 5, 'spaceLimit');
  const tasks = products.map(async (product) => {
    if (product === 'gmail') return { service: product, data: await invokeRead('gmail', 'search_messages', { query, pageSize }) };
    if (product === 'drive') return { service: product, data: await invokeRead('drive', 'search_files', { query: driveQuery(query), pageSize }) };
    if (product === 'calendar') return { service: product, data: await invokeRead('calendar', 'search_events', { calendarId: 'primary', query, pageSize }) };
    return { service: product, data: await chatSearch(query, spaceLimit, invokeRead) };
  });
  const settled = await Promise.allSettled(tasks);
  const results: { service: UniversalProduct; data: unknown }[] = [];
  const errors: { service: string; message: string }[] = [];
  settled.forEach((result, index) => {
    const service = products[index] ?? 'unknown';
    if (result.status === 'fulfilled') results.push(result.value);
    else errors.push({ service, message: redactError(result.reason) });
  });
  return { results, errors };
}

export async function invokeReadOnly(service: ServiceName, name: string, args: Record<string, unknown>, invoke: InvokeRead): Promise<unknown> {
  if (!getOperation(service, name).readOnly) throw new WorkspaceError('READ_ONLY_REQUIRED', `${service}.${name} is not read-only.`);
  return invoke(service, name, args);
}
