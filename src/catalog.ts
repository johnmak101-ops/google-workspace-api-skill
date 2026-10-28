import { WorkspaceError } from './errors.js';
import { operationFor, operationsFor } from './operations/index.js';

export const SERVICE_NAMES = [
  'gmail', 'drive', 'calendar', 'people', 'docs', 'sheets', 'slides',
  'chat', 'classroom', 'tasks', 'forms', 'appscript', 'universal',
] as const;

export type ServiceName = (typeof SERVICE_NAMES)[number];
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ScalarType = 'string' | 'number' | 'boolean';
export type QueryType = ScalarType | 'stringArray';

export interface QueryParam {
  readonly wireName: string;
  readonly type: QueryType;
  readonly required?: boolean;
  readonly defaultValue?: string | number | boolean;
  readonly join?: ',';
}

export interface ApiOperation {
  readonly kind: 'rest' | 'local';
  readonly name: string;
  readonly service: ServiceName;
  readonly description: string;
  readonly method: HttpMethod;
  readonly origin: string;
  readonly path: string;
  readonly readOnly: boolean;
  readonly inputSchema: Record<string, unknown>;
  readonly pathParams: readonly string[];
  readonly queryParams: Readonly<Record<string, QueryParam>>;
  readonly bodyParams: readonly string[];
  readonly bodyKind: 'none' | 'json' | 'multipart';
  readonly scopes: readonly string[];
  readonly binaryResponse?: boolean;
}

export interface ServiceSelection {
  readonly service: ServiceName;
  readonly write: boolean;
}

export interface ScopeOptions {
  readonly directoryAdmin?: boolean;
  readonly universalProducts?: readonly UniversalProduct[] | undefined;
}

export interface ServiceConfig {
  readonly name: ServiceName;
  readonly origins: readonly string[];
  readonly readScopes: readonly string[];
  readonly writeScopes: readonly string[];
  readonly writeAvailable: boolean;
  readonly documentation: string;
}

const scope = (name: string): string => `https://www.googleapis.com/auth/${name}`;
const universalScopes = {
  gmail: scope('gmail.readonly'),
  drive: scope('drive.readonly'),
  calendar: scope('calendar.events.readonly'),
  chat: scope('chat.messages.readonly'),
} as const;

export const UNIVERSAL_PRODUCTS = ['gmail', 'drive', 'calendar', 'chat'] as const;
export type UniversalProduct = (typeof UNIVERSAL_PRODUCTS)[number];

const services: Readonly<Record<ServiceName, ServiceConfig>> = {
  gmail: {
    name: 'gmail', origins: ['https://gmail.googleapis.com'], writeAvailable: true,
    readScopes: [scope('gmail.readonly')],
    writeScopes: [scope('gmail.compose'), scope('gmail.modify'), scope('gmail.send')],
    documentation: 'https://developers.google.com/gmail/api/reference/rest',
  },
  drive: {
    name: 'drive', origins: ['https://www.googleapis.com'], writeAvailable: true,
    readScopes: [scope('drive.readonly')], writeScopes: [scope('drive.file')],
    documentation: 'https://developers.google.com/drive/api/reference/rest/v3',
  },
  calendar: {
    name: 'calendar', origins: ['https://www.googleapis.com'], writeAvailable: true,
    readScopes: [scope('calendar.calendarlist.readonly'), scope('calendar.events.freebusy'), scope('calendar.events.readonly')],
    writeScopes: [scope('calendar.events')],
    documentation: 'https://developers.google.com/calendar/api/v3/reference',
  },
  people: {
    name: 'people', origins: ['https://people.googleapis.com'], writeAvailable: false,
    readScopes: [scope('userinfo.profile'), scope('contacts.readonly')], writeScopes: [],
    documentation: 'https://developers.google.com/people/api/rest',
  },
  docs: {
    name: 'docs', origins: ['https://docs.googleapis.com'], writeAvailable: true,
    readScopes: [scope('documents.readonly'), scope('drive.readonly')],
    writeScopes: [scope('documents'), scope('drive.file')],
    documentation: 'https://developers.google.com/docs/api/reference/rest',
  },
  sheets: {
    name: 'sheets', origins: ['https://sheets.googleapis.com'], writeAvailable: true,
    readScopes: [scope('spreadsheets.readonly'), scope('drive.readonly')],
    writeScopes: [scope('spreadsheets'), scope('drive.file')],
    documentation: 'https://developers.google.com/sheets/api/reference/rest',
  },
  slides: {
    name: 'slides', origins: ['https://slides.googleapis.com'], writeAvailable: true,
    readScopes: [scope('presentations.readonly'), scope('drive.readonly')],
    writeScopes: [scope('presentations'), scope('drive.file')],
    documentation: 'https://developers.google.com/slides/api/reference/rest',
  },
  chat: {
    name: 'chat', origins: ['https://chat.googleapis.com'], writeAvailable: true,
    readScopes: [scope('chat.spaces.readonly'), scope('chat.memberships.readonly'), scope('chat.messages.readonly')],
    writeScopes: [scope('chat.messages.create')],
    documentation: 'https://developers.google.com/chat/api/reference/rest',
  },
  classroom: {
    name: 'classroom', origins: ['https://classroom.googleapis.com'], writeAvailable: true,
    readScopes: [scope('classroom.courses.readonly'), scope('classroom.rosters.readonly'), scope('classroom.student-submissions.students.readonly'), scope('classroom.coursework.students.readonly'), scope('classroom.courseworkmaterials.readonly'), scope('classroom.announcements.readonly'), scope('classroom.topics.readonly'), scope('classroom.guardianlinks.students.readonly')],
    writeScopes: [scope('classroom.announcements'), scope('classroom.coursework.students'), scope('classroom.courseworkmaterials'), scope('classroom.topics')],
    documentation: 'https://developers.google.com/classroom/reference/rest',
  },
  tasks: {
    name: 'tasks', origins: ['https://tasks.googleapis.com'], writeAvailable: true,
    readScopes: [scope('tasks.readonly')], writeScopes: [scope('tasks')],
    documentation: 'https://developers.google.com/tasks/reference/rest',
  },
  forms: {
    name: 'forms', origins: ['https://forms.googleapis.com'], writeAvailable: true,
    readScopes: [scope('forms.body.readonly'), scope('forms.responses.readonly')],
    writeScopes: [scope('forms.body')],
    documentation: 'https://developers.google.com/forms/api/reference/rest',
  },
  appscript: {
    name: 'appscript', origins: ['https://script.googleapis.com'], writeAvailable: true,
    readScopes: [scope('script.projects.readonly'), scope('script.deployments.readonly')],
    writeScopes: [scope('script.projects'), scope('script.deployments'), scope('script.scriptapp')],
    documentation: 'https://developers.google.com/apps-script/api/reference/rest',
  },
  universal: {
    name: 'universal', origins: ['local'], writeAvailable: false,
    readScopes: [...Object.values(universalScopes), scope('chat.spaces.readonly')], writeScopes: [],
    documentation: 'https://developers.google.com/workspace',
  },
};

export function listServices(): readonly ServiceConfig[] {
  return SERVICE_NAMES.map((name) => services[name]);
}

export function getService(name: string): ServiceConfig {
  if ((SERVICE_NAMES as readonly string[]).includes(name)) return services[name as ServiceName];
  throw new WorkspaceError('UNSUPPORTED_SERVICE', `Unsupported Google API service: ${name}. Available: ${SERVICE_NAMES.join(', ')}`);
}

export function scopesFor(selection: readonly ServiceSelection[], options: ScopeOptions = {}): string[] {
  if (selection.length === 0) throw new WorkspaceError('EMPTY_SELECTION', 'Select at least one Google service.');
  const scopes = new Set<string>();
  for (const item of selection) {
    const service = getService(item.service);
    const readScopes = service.name === 'universal' && options.universalProducts
      ? options.universalProducts.map((product) => universalScopes[product])
      : service.readScopes;
    for (const value of readScopes) scopes.add(value);
    if (service.name === 'people' && options.directoryAdmin) scopes.add(scope('directory.readonly'));
    if (item.write) {
      if (!service.writeAvailable) throw new WorkspaceError('READ_ONLY_SERVICE', `${service.name} is read-only in this skill.`);
      for (const value of service.writeScopes) scopes.add(value);
    }
  }
  return [...scopes].sort();
}

export function listOperations(service: ServiceName): readonly ApiOperation[] {
  return operationsFor(service);
}

export function getOperation(service: ServiceName, name: string): ApiOperation {
  return operationFor(service, name);
}
