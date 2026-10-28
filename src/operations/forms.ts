import type { ApiOperation } from '../catalog.js';
import { integer, object, query, rest, schema, scope, text } from './helpers.js';

const origin = 'https://forms.googleapis.com';
const bodyRead = [scope('forms.body.readonly')];
const responsesRead = [scope('forms.responses.readonly')];
const bodyWrite = [scope('forms.body')];

export const formsOperations: readonly ApiOperation[] = [
  rest({ service: 'forms', name: 'get_form', description: 'Read a Google Form structure.', method: 'GET', origin, path: '/v1/forms/{formId}', readOnly: true, scopes: bodyRead, inputSchema: schema({ formId: text }, ['formId']), pathParams: ['formId'] }),
  rest({ service: 'forms', name: 'create_form', description: 'Create a Google Form with an info object; only the title is set on creation.', method: 'POST', origin, path: '/v1/forms', readOnly: false, scopes: bodyWrite, inputSchema: schema({ info: object }, ['info']), bodyParams: ['info'] }),
  rest({ service: 'forms', name: 'update_form', description: 'Apply batchUpdate requests to a Google Form.', method: 'POST', origin, path: '/v1/forms/{formId}:batchUpdate', readOnly: false, scopes: bodyWrite, inputSchema: schema({ formId: text, requests: { type: 'array', items: object } }, ['formId', 'requests']), pathParams: ['formId'], bodyParams: ['requests'] }),
  rest({ service: 'forms', name: 'list_responses', description: 'List responses to a Google Form.', method: 'GET', origin, path: '/v1/forms/{formId}/responses', readOnly: true, scopes: responsesRead, inputSchema: schema({ formId: text, pageSize: integer, pageToken: text, filter: text }, ['formId']), pathParams: ['formId'], queryParams: { pageSize: query('pageSize', 'number'), pageToken: query('pageToken'), filter: query('filter') } }),
  rest({ service: 'forms', name: 'get_response', description: 'Read one Google Form response.', method: 'GET', origin, path: '/v1/forms/{formId}/responses/{responseId}', readOnly: true, scopes: responsesRead, inputSchema: schema({ formId: text, responseId: text }, ['formId', 'responseId']), pathParams: ['formId', 'responseId'] }),
];
