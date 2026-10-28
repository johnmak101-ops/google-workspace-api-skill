import type { ApiOperation } from '../catalog.js';
import { object, rest, schema, scope, text } from './helpers.js';

const origin = 'https://docs.googleapis.com';

export const docsOperations: readonly ApiOperation[] = [
  rest({ service: 'docs', name: 'read_doc', description: 'Read a Google Docs document.', method: 'GET', origin, path: '/v1/documents/{documentId}', readOnly: true, scopes: [scope('documents.readonly'), scope('drive.readonly')], inputSchema: schema({ documentId: text }, ['documentId']), pathParams: ['documentId'] }),
  rest({ service: 'docs', name: 'create_doc', description: 'Create a Google Docs document.', method: 'POST', origin, path: '/v1/documents', readOnly: false, scopes: [scope('documents'), scope('drive.file')], inputSchema: schema({ title: text }, ['title']), bodyParams: ['title'] }),
  rest({ service: 'docs', name: 'update_doc', description: 'Apply batchUpdate requests to a Google Docs document.', method: 'POST', origin, path: '/v1/documents/{documentId}:batchUpdate', readOnly: false, scopes: [scope('documents'), scope('drive.file')], inputSchema: schema({ documentId: text, requests: { type: 'array', items: object } }, ['documentId', 'requests']), pathParams: ['documentId'], bodyParams: ['requests'] }),
];
