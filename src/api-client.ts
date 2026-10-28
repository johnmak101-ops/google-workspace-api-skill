import { getOperation, type ServiceName } from './catalog.js';
import { ApiError } from './api-error.js';
import { WorkspaceError } from './errors.js';
import { prepareRequest } from './request.js';
import { ResultStore, type StoredResult } from './result-store.js';

export interface UnknownMutationResult {
  readonly status: 'unknown';
  readonly mayHaveCompleted: true;
  readonly error: { readonly code: 'CALL_UNKNOWN'; readonly message: string };
}

export interface BinaryApiResult {
  readonly content: 'Binary result saved.';
  readonly file: StoredResult;
}

type TokenProvider = (service: ServiceName, signal: AbortSignal) => Promise<string>;

export interface GoogleApiClientOptions {
  readonly getAccessToken: TokenProvider;
  readonly refreshAccessToken?: TokenProvider | undefined;
  readonly fetchImpl?: typeof fetch;
  readonly resultStore?: ResultStore | undefined;
  readonly timeoutMs?: number;
  readonly maxJsonBytes?: number;
  readonly maxBinaryBytes?: number;
}

function isAmbiguous(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 408 || error.status === 429 || error.status >= 500;
  return error instanceof TypeError || (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError'));
}

async function readLimitedText(response: Response, limit: number): Promise<string> {
  if (!response.body) return '';
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > limit) throw new WorkspaceError('RESPONSE_TOO_LARGE', `Response is too large (limit ${limit} bytes).`);
    chunks.push(decoder.decode(chunk, { stream: true }));
  }
  chunks.push(decoder.decode());
  return chunks.join('');
}

function googleMessage(body: string, status: number): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const error = (parsed as Record<string, unknown>).error;
      if (error !== null && typeof error === 'object' && !Array.isArray(error)) {
        const message = (error as Record<string, unknown>).message;
        if (typeof message === 'string') return message.slice(0, 500);
      }
    }
  } catch {
    // Fall through to the bounded status message.
  }
  return `Google API request failed with HTTP ${status}.`;
}

function parseJson(body: string): unknown {
  if (!body.trim()) return {};
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export class GoogleApiClient {
  private readonly getAccessToken: TokenProvider;
  private readonly refreshAccessToken: TokenProvider | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly resultStore: ResultStore | undefined;
  private readonly timeoutMs: number;
  private readonly maxJsonBytes: number;
  private readonly maxBinaryBytes: number;

  constructor(options: GoogleApiClientOptions) {
    this.getAccessToken = options.getAccessToken;
    this.refreshAccessToken = options.refreshAccessToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.resultStore = options.resultStore;
    this.timeoutMs = options.timeoutMs ?? 45_000;
    this.maxJsonBytes = options.maxJsonBytes ?? 5_000_000;
    this.maxBinaryBytes = options.maxBinaryBytes ?? 100_000_000;
  }

  private async respondToEvent(args: Record<string, unknown>): Promise<unknown | UnknownMutationResult | BinaryApiResult> {
    prepareRequest(getOperation('calendar', 'respond_to_event'), args);
    const event = await this.invoke('calendar', 'get_event', { calendarId: args.calendarId, eventId: args.eventId }, false);
    if (event === null || typeof event !== 'object' || Array.isArray(event)) throw new WorkspaceError('EVENT_RESPONSE', 'Calendar event response is invalid.');
    const attendees = (event as Record<string, unknown>).attendees;
    if (!Array.isArray(attendees)) throw new WorkspaceError('ATTENDEE_NOT_FOUND', 'The current user is not an attendee on this event.');
    let found = false;
    const updated = attendees.map((attendee) => {
      if (attendee !== null && typeof attendee === 'object' && !Array.isArray(attendee) && (attendee as Record<string, unknown>).self === true) {
        found = true;
        return { ...(attendee as Record<string, unknown>), responseStatus: args.responseStatus };
      }
      return attendee;
    });
    if (!found) throw new WorkspaceError('ATTENDEE_NOT_FOUND', 'The current user is not an attendee on this event.');
    return this.invoke('calendar', 'update_event', { calendarId: args.calendarId, eventId: args.eventId, attendees: updated }, true);
  }

  async invoke(service: ServiceName, name: string, args: Record<string, unknown>, mutation: boolean): Promise<unknown | UnknownMutationResult | BinaryApiResult> {
    const operation = getOperation(service, name);
    if (operation.kind === 'local') throw new WorkspaceError('LOCAL_OPERATION', `${service}.${name} requires local dispatch.`);
    if (mutation && operation.readOnly) throw new WorkspaceError('READ_ONLY_REQUIRED', `${name} is read-only. Use call.`);
    if (!mutation && !operation.readOnly) throw new WorkspaceError('MUTATION_REQUIRED', `${name} is a mutation. Use mutate after user confirmation.`);
    if (service === 'calendar' && name === 'respond_to_event') return this.respondToEvent(args);
    const request = prepareRequest(operation, args);
    const signal = AbortSignal.timeout(this.timeoutMs);
    let token = await this.getAccessToken(service, signal);
    let refreshed = false;
    let dispatched = false;
    try {
      while (true) {
        dispatched = true;
        const response = await this.fetchImpl(request.url, {
          method: request.method,
          headers: { ...request.headers, authorization: `Bearer ${token}` },
          ...(request.body !== undefined ? { body: request.body } : {}),
          redirect: 'error',
          signal,
        });
        if (response.status === 401 && !mutation && !refreshed && this.refreshAccessToken) {
          token = await this.refreshAccessToken(service, signal);
          refreshed = true;
          continue;
        }
        if (!response.ok) {
          let message: string;
          try {
            message = googleMessage(await readLimitedText(response, 65_536), response.status);
          } catch (error) {
            if (!(error instanceof WorkspaceError) || error.code !== 'RESPONSE_TOO_LARGE') throw error;
            message = `Google API returned HTTP ${response.status} with an oversized error response.`;
          }
          throw new ApiError(response.status, message);
        }
        if (operation.binaryResponse) {
          if (!this.resultStore) throw new WorkspaceError('RESULT_STORE_REQUIRED', 'Binary results require a result store.');
          const file = await this.resultStore.saveStream(response.body ?? new ReadableStream({ start: (controller) => controller.close() }), response.headers.get('content-type') || 'application/octet-stream', this.maxBinaryBytes);
          return { content: 'Binary result saved.', file };
        }
        return parseJson(await readLimitedText(response, this.maxJsonBytes));
      }
    } catch (error) {
      if (mutation && dispatched && isAmbiguous(error)) {
        return { status: 'unknown', mayHaveCompleted: true, error: { code: 'CALL_UNKNOWN', message: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500) } };
      }
      throw error;
    }
  }
}
