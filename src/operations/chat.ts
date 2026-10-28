import type { ApiOperation } from '../catalog.js';
import { integer, query, rest, schema, scope, text } from './helpers.js';

const origin = 'https://chat.googleapis.com';
const spaces = [scope('chat.spaces.readonly')];
const memberships = [scope('chat.memberships.readonly')];
const messages = [scope('chat.messages.readonly')];
const create = [scope('chat.messages.create')];
const page = { pageSize: query('pageSize', 'number'), pageToken: query('pageToken') };

export const chatOperations: readonly ApiOperation[] = [
  rest({ service: 'chat', name: 'list_spaces', description: 'List Google Chat spaces.', method: 'GET', origin, path: '/v1/spaces', readOnly: true, scopes: spaces, inputSchema: schema({ pageSize: integer, pageToken: text }), queryParams: page }),
  rest({ service: 'chat', name: 'list_messages', description: 'List messages in one Google Chat space.', method: 'GET', origin, path: '/v1/spaces/{spaceId}/messages', readOnly: true, scopes: messages, inputSchema: schema({ spaceId: text, pageSize: integer, pageToken: text }, ['spaceId']), pathParams: ['spaceId'], queryParams: page }),
  rest({ service: 'chat', name: 'get_message', description: 'Read one Google Chat message.', method: 'GET', origin, path: '/v1/spaces/{spaceId}/messages/{messageId}', readOnly: true, scopes: messages, inputSchema: schema({ spaceId: text, messageId: text }, ['spaceId', 'messageId']), pathParams: ['spaceId', 'messageId'] }),
  rest({ service: 'chat', name: 'list_memberships', description: 'List memberships in one Google Chat space.', method: 'GET', origin, path: '/v1/spaces/{spaceId}/members', readOnly: true, scopes: memberships, inputSchema: schema({ spaceId: text, pageSize: integer, pageToken: text }, ['spaceId']), pathParams: ['spaceId'], queryParams: page }),
  rest({ service: 'chat', name: 'create_message', description: 'Create a text message in a Google Chat space.', method: 'POST', origin, path: '/v1/spaces/{spaceId}/messages', readOnly: false, scopes: create, inputSchema: schema({ spaceId: text, text: text }, ['spaceId', 'text']), pathParams: ['spaceId'], bodyParams: ['text'] }),
];
