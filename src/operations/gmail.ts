import type { ApiOperation } from '../catalog.js';
import { flag, integer, query, rest, schema, scope, strings, text } from './helpers.js';

const origin = 'https://gmail.googleapis.com';
const read = [scope('gmail.readonly')];
const compose = [scope('gmail.compose')];
const modify = [scope('gmail.modify')];
const send = [scope('gmail.send')];
const page = { pageSize: query('maxResults', 'number'), pageToken: query('pageToken') };

export const gmailOperations: readonly ApiOperation[] = [
  rest({ service: 'gmail', name: 'search_messages', description: 'Search Gmail messages with Gmail query syntax.', method: 'GET', origin, path: '/gmail/v1/users/me/messages', readOnly: true, scopes: read, inputSchema: schema({ query: text, pageSize: integer, pageToken: text, includeSpamTrash: flag }), queryParams: { query: query('q'), ...page, includeSpamTrash: query('includeSpamTrash', 'boolean') } }),
  rest({ service: 'gmail', name: 'search_threads', description: 'Search Gmail threads with Gmail query syntax.', method: 'GET', origin, path: '/gmail/v1/users/me/threads', readOnly: true, scopes: read, inputSchema: schema({ query: text, pageSize: integer, pageToken: text, includeSpamTrash: flag }), queryParams: { query: query('q'), ...page, includeSpamTrash: query('includeSpamTrash', 'boolean') } }),
  rest({ service: 'gmail', name: 'get_message', description: 'Read one Gmail message by ID.', method: 'GET', origin, path: '/gmail/v1/users/me/messages/{messageId}', readOnly: true, scopes: read, inputSchema: schema({ messageId: text, format: text }, ['messageId']), pathParams: ['messageId'], queryParams: { format: query('format') } }),
  rest({ service: 'gmail', name: 'get_thread', description: 'Read one Gmail thread by ID.', method: 'GET', origin, path: '/gmail/v1/users/me/threads/{threadId}', readOnly: true, scopes: read, inputSchema: schema({ threadId: text }, ['threadId']), pathParams: ['threadId'] }),
  rest({ service: 'gmail', name: 'list_labels', description: 'List Gmail labels.', method: 'GET', origin, path: '/gmail/v1/users/me/labels', readOnly: true, scopes: read, inputSchema: schema({}) }),
  rest({ service: 'gmail', name: 'list_drafts', description: 'List Gmail drafts with optional search and pagination.', method: 'GET', origin, path: '/gmail/v1/users/me/drafts', readOnly: true, scopes: read, inputSchema: schema({ query: text, pageSize: integer, pageToken: text, includeSpamTrash: flag }), queryParams: { query: query('q'), ...page, includeSpamTrash: query('includeSpamTrash', 'boolean') } }),
  rest({ service: 'gmail', name: 'create_draft', description: 'Create a Gmail draft from a message resource.', method: 'POST', origin, path: '/gmail/v1/users/me/drafts', readOnly: false, scopes: compose, inputSchema: schema({ message: { type: 'object', properties: { raw: text, threadId: text }, required: ['raw'], additionalProperties: false } }, ['message']), bodyParams: ['message'] }),
  rest({ service: 'gmail', name: 'send_message', description: 'Send a Gmail message using its base64url-encoded RFC 2822 raw value.', method: 'POST', origin, path: '/gmail/v1/users/me/messages/send', readOnly: false, scopes: send, inputSchema: schema({ raw: text, threadId: text }, ['raw']), bodyParams: ['raw', 'threadId'] }),
  rest({ service: 'gmail', name: 'update_message_labels', description: 'Add and remove labels on one Gmail message.', method: 'POST', origin, path: '/gmail/v1/users/me/messages/{messageId}/modify', readOnly: false, scopes: modify, inputSchema: schema({ messageId: text, addLabelIds: strings, removeLabelIds: strings }, ['messageId']), pathParams: ['messageId'], bodyParams: ['addLabelIds', 'removeLabelIds'] }),
  rest({ service: 'gmail', name: 'trash_message', description: 'Move one Gmail message to Trash.', method: 'POST', origin, path: '/gmail/v1/users/me/messages/{messageId}/trash', readOnly: false, scopes: modify, inputSchema: schema({ messageId: text }, ['messageId']), pathParams: ['messageId'] }),
  rest({ service: 'gmail', name: 'untrash_message', description: 'Remove one Gmail message from Trash.', method: 'POST', origin, path: '/gmail/v1/users/me/messages/{messageId}/untrash', readOnly: false, scopes: modify, inputSchema: schema({ messageId: text }, ['messageId']), pathParams: ['messageId'] }),
];
