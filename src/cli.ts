import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { ApiError } from './api-error.js';
import { GoogleApiClient } from './api-client.js';
import { getOperation, getService, listOperations, listServices, UNIVERSAL_PRODUCTS, type ScopeOptions, type ServiceSelection } from './catalog.js';
import { assertNodeVersion, loadOAuthConfig, parseJsonObject, resolveHomeDir } from './config.js';
import { WorkspaceError } from './errors.js';
import { WorkspaceOAuth } from './oauth.js';
import { capEnvelope, makeEnvelope, redactError, serializeEnvelope, writeBoundedResult, type Envelope } from './output.js';
import { ResultStore, type StoredResult } from './result-store.js';
import { TokenStore } from './token-store.js';

export interface CliIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
  readonly stdin: Readable & { readonly isTTY?: boolean };
  readonly env: NodeJS.ProcessEnv;
  readonly api?: Pick<GoogleApiClient, 'invoke'>;
  readonly oauth?: WorkspaceOAuth;
  readonly tokenStore?: TokenStore;
  readonly resultStore?: ResultStore;
}

function home(io: CliIo): string {
  return resolveHomeDir(io.env);
}

function store(io: CliIo): TokenStore {
  return io.tokenStore || new TokenStore(home(io));
}

function results(io: CliIo): ResultStore {
  return io.resultStore || new ResultStore(path.join(home(io), 'results'));
}

function emit(io: CliIo, envelope: Envelope, json: boolean): void {
  if (json) {
    io.stdout(serializeEnvelope(envelope));
    return;
  }
  const capped = capEnvelope(envelope);
  const content = capped.content;
  const metadata = capped.file ? `\nResult saved to ${capped.file.path} (${capped.file.mimeType}, ${capped.file.size} bytes)` : '';
  io.stdout(`${redactError(typeof content === 'string' ? content : JSON.stringify(content ?? capped, null, 2))}${metadata}\n`);
}

function flag(argv: readonly string[], name: string): boolean {
  return argv.includes(name);
}

function option(argv: readonly string[], name: string): string | undefined {
  const index = argv.findIndex((value) => value === name || value.startsWith(`${name}=`));
  if (index < 0) return undefined;
  const token = argv[index];
  if (token?.startsWith(`${name}=`)) return token.slice(name.length + 1);
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new WorkspaceError('USAGE', `Option ${name} requires a value.`);
  return value;
}

function hasInlineArgs(argv: readonly string[]): boolean {
  return argv.some((value) => value === '--args' || value.startsWith('--args='));
}

async function context(io: CliIo): Promise<{ api: Pick<GoogleApiClient, 'invoke'>; results: ResultStore }> {
  if (io.api) return { api: io.api, results: results(io) };
  const config = await loadOAuthConfig(io.env);
  const oauth = io.oauth || new WorkspaceOAuth(config, store(io));
  const api = new GoogleApiClient({
    getAccessToken: (service, signal) => oauth.getValidAccessToken(service, false, signal),
    refreshAccessToken: (service, signal) => oauth.getValidAccessToken(service, true, signal),
    resultStore: results(io),
  });
  return { api, results: results(io) };
}

const MAX_ARGUMENT_BYTES = 1_000_000;

async function readArguments(argv: readonly string[], io: CliIo): Promise<Record<string, unknown>> {
  if (hasInlineArgs(argv)) throw new WorkspaceError('ARGS_FILE_REQUIRED', 'Use --args-file or stdin so Workspace content stays out of command logs.');
  const file = option(argv, '--args-file');
  if (file !== undefined) {
    if (!file) throw new WorkspaceError('USAGE', 'Option --args-file requires a value.');
    const stat = await fs.stat(file);
    if (stat.size > MAX_ARGUMENT_BYTES) throw new WorkspaceError('ARGS_TOO_LARGE', 'Tool arguments are too large. Keep the JSON file under 1 MB.');
    return parseJsonObject(await fs.readFile(file, 'utf8'));
  }
  if (flag(argv, '--args')) throw new WorkspaceError('ARGS_FILE_REQUIRED', 'Use --args-file or stdin so Workspace content stays out of command logs.');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of io.stdin) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_ARGUMENT_BYTES) throw new WorkspaceError('ARGS_TOO_LARGE', 'Tool arguments are too large. Keep the JSON input under 1 MB.');
    chunks.push(buffer);
  }
  const input = Buffer.concat(chunks).toString('utf8').trim();
  return input ? parseJsonObject(input) : {};
}

function authSelection(argv: readonly string[]): ScopeOptions & { selection?: readonly ServiceSelection[] | undefined } {
  const services = option(argv, '--services');
  const readOnly = flag(argv, '--read-only');
  const selection = services
    ? services.split(',').map((name) => ({ service: getService(name.trim()).name, write: !readOnly }))
    : readOnly ? listServices().map((service) => ({ service: service.name, write: false })) : undefined;
  const products = option(argv, '--universal-products')?.split(',').map((name) => {
    const product = name.trim();
    if (!(UNIVERSAL_PRODUCTS as readonly string[]).includes(product)) {
      throw new WorkspaceError('UNIVERSAL_PRODUCT', `Unsupported federated-search product: ${product}. Available: ${UNIVERSAL_PRODUCTS.join(', ')}`);
    }
    return product as (typeof UNIVERSAL_PRODUCTS)[number];
  });
  return { selection, directoryAdmin: flag(argv, '--directory-admin'), universalProducts: products };
}

function isUnknown(value: unknown): value is { status: 'unknown'; mayHaveCompleted: true } {
  return value !== null && typeof value === 'object' && (value as Record<string, unknown>).status === 'unknown';
}

function isBinary(value: unknown): value is { content: 'Binary result saved.'; file: StoredResult } {
  if (value === null || typeof value !== 'object') return false;
  const file = (value as Record<string, unknown>).file;
  return file !== null && typeof file === 'object' && typeof (file as Record<string, unknown>).path === 'string';
}

export async function runCli(argv: readonly string[], io: CliIo): Promise<number> {
  const [command, serviceName, toolName] = argv;
  try {
    if (!command || command === '--help' || command === 'help') {
      io.stdout('Commands: auth, logout, services, tools, call, mutate, auth-status\nUse --args-file for tool arguments.\n');
      return 0;
    }
    if (command === 'auth') {
      if (!io.stdin.isTTY) throw new WorkspaceError('TERMINAL_REQUIRED', 'Run auth in an interactive terminal.');
      const config = await loadOAuthConfig(io.env);
      const oauth = io.oauth || new WorkspaceOAuth(config, store(io));
      const result = await oauth.authorize(authSelection(argv));
      emit(io, makeEnvelope({ content: result }), flag(argv, '--json'));
      return 0;
    }
    if (command === 'logout') {
      if (!io.stdin.isTTY) throw new WorkspaceError('TERMINAL_REQUIRED', 'Run logout in an interactive terminal.');
      const service = option(argv, '--service') || serviceName;
      await store(io).remove(service ? getService(service).name : undefined);
      emit(io, makeEnvelope({ content: 'Local credentials removed.' }), flag(argv, '--json'));
      return 0;
    }
    if (command === 'services') {
      const services = listServices().map((service) => ({
        name: service.name,
        origins: service.origins,
        writeAvailable: service.writeAvailable,
        documentation: service.documentation,
      }));
      const authorization = await store(io).status();
      emit(io, makeEnvelope({ content: services, authorization }), flag(argv, '--json'));
      return 0;
    }
    if (command === 'auth-status') {
      emit(io, makeEnvelope({ content: await store(io).status() }), flag(argv, '--json'));
      return 0;
    }
    if (command === 'tools') {
      if (!serviceName || serviceName.startsWith('--')) throw new WorkspaceError('USAGE', 'Usage: tools <service> [--tool <name>] [--json]');
      const service = getService(serviceName).name;
      const selectedTool = option(argv, '--tool');
      const content = selectedTool
        ? getOperation(service, selectedTool)
        : listOperations(service).map((tool) => ({ name: tool.name, description: tool.description }));
      emit(io, await writeBoundedResult({ service, content }, results(io)), flag(argv, '--json'));
      return 0;
    }
    if (command === 'call' || command === 'mutate') {
      if (!serviceName || !toolName) throw new WorkspaceError('USAGE', `Usage: ${command} <service> <tool> [--args-file <path>] [--json]`);
      const service = getService(serviceName).name;
      const args = await readArguments(argv, io);
      const { api } = await context(io);
      const result = await api.invoke(service, toolName, args, command === 'mutate');
      if (command === 'mutate' && isUnknown(result)) {
        emit(io, makeEnvelope({ service, tool: toolName, status: 'unknown', mayHaveCompleted: true, content: result }), flag(argv, '--json'));
        return 3;
      } else if (isBinary(result)) {
        emit(io, makeEnvelope({ service, tool: toolName, content: result.content, size: result.file.size, truncated: false, file: result.file }), flag(argv, '--json'));
      } else {
        emit(io, await writeBoundedResult({ service, tool: toolName, content: result }, results(io)), flag(argv, '--json'));
      }
      return 0;
    }
    throw new WorkspaceError('UNKNOWN_COMMAND', `Unknown command: ${command}`);
  } catch (error) {
    const code = error instanceof WorkspaceError ? error.code
      : error instanceof ApiError
        ? error.status === 401 ? 'AUTH_REQUIRED' : error.status === 403 ? 'PERMISSION_DENIED' : error.code
        : 'CLI_ERROR';
    const message = redactError(error);
    io.stderr(`${message}\n`);
    if (flag(argv, '--json')) io.stdout(serializeEnvelope(makeEnvelope({ status: 'error', error: { code, message } })));
    return code === 'USAGE' || code === 'INVALID_JSON' || code === 'ARGS_FILE_REQUIRED' ? 2 : 1;
  }
}

if (require.main === module) {
  assertNodeVersion();
  runCli(process.argv.slice(2), {
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
    stdin: process.stdin,
    env: process.env,
  }).then((code) => { process.exitCode = code; }).catch((error) => {
    process.stderr.write(`${redactError(error)}\n`);
    process.exitCode = 1;
  });
}
