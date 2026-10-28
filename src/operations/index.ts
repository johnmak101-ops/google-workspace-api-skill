import type { ApiOperation, ServiceName } from '../catalog.js';
import { WorkspaceError } from '../errors.js';
import { gmailOperations } from './gmail.js';
import { driveOperations } from './drive.js';
import { calendarOperations } from './calendar.js';
import { peopleOperations } from './people.js';
import { docsOperations } from './docs.js';
import { sheetsOperations } from './sheets.js';
import { slidesOperations } from './slides.js';
import { chatOperations } from './chat.js';
import { classroomOperations } from './classroom.js';
import { tasksOperations } from './tasks.js';
import { formsOperations } from './forms.js';
import { appscriptOperations } from './appscript.js';
import { universalOperations } from './universal.js';

const operations: Readonly<Record<ServiceName, readonly ApiOperation[]>> = {
  gmail: gmailOperations,
  drive: driveOperations,
  calendar: calendarOperations,
  people: peopleOperations,
  docs: docsOperations,
  sheets: sheetsOperations,
  slides: slidesOperations,
  chat: chatOperations,
  classroom: classroomOperations,
  tasks: tasksOperations,
  forms: formsOperations,
  appscript: appscriptOperations,
  universal: universalOperations,
};

export function operationsFor(service: ServiceName): readonly ApiOperation[] {
  return operations[service];
}

export function operationFor(service: ServiceName, name: string): ApiOperation {
  const operation = operations[service].find((candidate) => candidate.name === name);
  if (!operation) throw new WorkspaceError('TOOL_NOT_FOUND', `Google API tool not found on ${service}: ${name}`);
  return operation;
}
