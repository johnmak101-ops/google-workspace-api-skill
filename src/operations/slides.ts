import type { ApiOperation } from '../catalog.js';
import { object, rest, schema, scope, text } from './helpers.js';

const origin = 'https://slides.googleapis.com';
const read = [scope('presentations.readonly'), scope('drive.readonly')];
const write = [scope('presentations'), scope('drive.file')];

export const slidesOperations: readonly ApiOperation[] = [
  rest({ service: 'slides', name: 'read_presentation', description: 'Read a Google Slides presentation.', method: 'GET', origin, path: '/v1/presentations/{presentationId}', readOnly: true, scopes: read, inputSchema: schema({ presentationId: text }, ['presentationId']), pathParams: ['presentationId'] }),
  rest({ service: 'slides', name: 'create_presentation', description: 'Create a Google Slides presentation.', method: 'POST', origin, path: '/v1/presentations', readOnly: false, scopes: write, inputSchema: schema({ title: text }, ['title']), bodyParams: ['title'] }),
  rest({ service: 'slides', name: 'update_presentation', description: 'Apply batchUpdate requests to a presentation.', method: 'POST', origin, path: '/v1/presentations/{presentationId}:batchUpdate', readOnly: false, scopes: write, inputSchema: schema({ presentationId: text, requests: { type: 'array', items: object } }, ['presentationId', 'requests']), pathParams: ['presentationId'], bodyParams: ['requests'] }),
];
