import type { ServiceName } from './catalog.js';

export type ProbeStatus = 'enabled' | 'disabled' | 'unauthorized' | 'forbidden' | 'unverified' | 'error';

export interface ProbeCheck {
  readonly service: string;
  readonly status: ProbeStatus;
  readonly detail?: string;
  readonly enableUrl?: string;
}

export interface DoctorReport {
  readonly checks: readonly ProbeCheck[];
  readonly skipped: readonly { readonly service: string; readonly reason: string }[];
}

type Invoke = (service: ServiceName, tool: string, args: Record<string, unknown>) => Promise<unknown>;

const PROBES: readonly { readonly service: ServiceName; readonly tool: string; readonly args: Record<string, unknown> }[] = [
  { service: 'gmail', tool: 'list_labels', args: {} },
  { service: 'drive', tool: 'list_recent_files', args: {} },
  { service: 'calendar', tool: 'list_calendars', args: {} },
  { service: 'people', tool: 'get_user_profile', args: { personFields: ['names'] } },
  { service: 'tasks', tool: 'list_task_lists', args: {} },
  { service: 'chat', tool: 'list_spaces', args: {} },
  { service: 'classroom', tool: 'list_courses', args: {} },
];

const SKIPPED: readonly { readonly service: string; readonly reason: string }[] = [
  { service: 'docs', reason: 'Needs a document ID. Run tools docs, then call docs read_doc.' },
  { service: 'sheets', reason: 'Needs a spreadsheet ID. Run tools sheets, then call sheets get_spreadsheet.' },
  { service: 'slides', reason: 'Needs a presentation ID. Run tools slides, then call slides read_presentation.' },
  { service: 'forms', reason: 'Needs a form ID. Run tools forms, then call forms get_form.' },
  { service: 'appscript', reason: 'Needs a script ID. Run tools appscript, then call appscript get_project.' },
];

const ENABLE_URL = /https:\/\/console\.developers\.google\.com\/apis\/api\/\S+/;

function classify(error: unknown): { status: ProbeStatus; detail?: string; enableUrl?: string } {
  const message = (error instanceof Error ? error.message : String(error)).replace(/\s+/g, ' ').trim().slice(0, 300);
  const record = error as { code?: unknown; status?: unknown } | null;
  const code = typeof record?.code === 'string' ? record.code : undefined;
  const status = typeof record?.status === 'number' ? record.status : undefined;
  if (code === 'AUTH_REQUIRED' || status === 401) return { status: 'unauthorized', detail: message };
  if (status === 403 && /has not been used in project|is disabled/i.test(message)) {
    const enableUrl = ENABLE_URL.exec(message)?.[0];
    return { status: 'disabled', detail: message, ...(enableUrl ? { enableUrl } : {}) };
  }
  if (status === 403) return { status: 'forbidden', detail: message };
  return { status: 'error', detail: message };
}

export async function runDoctor(invoke: Invoke): Promise<DoctorReport> {
  const checks: ProbeCheck[] = [];
  for (const probe of PROBES) {
    try {
      await invoke(probe.service, probe.tool, probe.args);
      checks.push({ service: probe.service, status: 'enabled' });
    } catch (error) {
      checks.push({ service: probe.service, ...classify(error) });
    }
  }
  return { checks, skipped: SKIPPED };
}
