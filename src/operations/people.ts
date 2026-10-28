import type { ApiOperation } from '../catalog.js';
import { integer, query, rest, schema, scope, strings, text } from './helpers.js';

const origin = 'https://people.googleapis.com';
const profile = [scope('userinfo.profile')];
const contacts = [scope('contacts.readonly')];
const directory = [scope('directory.readonly')];

export const peopleOperations: readonly ApiOperation[] = [
  rest({ service: 'people', name: 'get_user_profile', description: 'Read the authenticated user profile.', method: 'GET', origin, path: '/v1/people/me', readOnly: true, scopes: profile, inputSchema: schema({ personFields: strings }, ['personFields']), queryParams: { personFields: query('personFields', 'stringArray', true, { join: ',' }) } }),
  rest({ service: 'people', name: 'search_contacts', description: 'Search the authenticated user contacts.', method: 'GET', origin, path: '/v1/people:searchContacts', readOnly: true, scopes: contacts, inputSchema: schema({ query: text, pageSize: integer, readMask: strings }, ['query', 'readMask']), queryParams: { query: query('query', 'string', true), pageSize: query('pageSize', 'number'), readMask: query('readMask', 'stringArray', true, { join: ',' }) } }),
  rest({ service: 'people', name: 'search_directory_people', description: 'Search Workspace directory people; requires an administrator directory grant.', method: 'GET', origin, path: '/v1/people:searchDirectoryPeople', readOnly: true, scopes: directory, inputSchema: schema({ query: text, pageSize: integer, readMask: strings, sources: strings }, ['query', 'readMask']), queryParams: { query: query('query', 'string', true), pageSize: query('pageSize', 'number'), readMask: query('readMask', 'stringArray', true, { join: ',' }), sources: query('sources', 'stringArray') } }),
];
