import type { ApiOperation } from '../catalog.js';
import { object, query, rest, schema, scope, text } from './helpers.js';

const origin = 'https://sheets.googleapis.com';
const read = [scope('spreadsheets.readonly'), scope('drive.readonly')];
const write = [scope('spreadsheets'), scope('drive.file')];
const values = { type: 'array', items: { type: 'array', items: {} } };

export const sheetsOperations: readonly ApiOperation[] = [
  rest({ service: 'sheets', name: 'get_spreadsheet', description: 'Read spreadsheet metadata.', method: 'GET', origin, path: '/v4/spreadsheets/{spreadsheetId}', readOnly: true, scopes: read, inputSchema: schema({ spreadsheetId: text, fields: text }, ['spreadsheetId']), pathParams: ['spreadsheetId'], queryParams: { fields: query('fields') } }),
  rest({ service: 'sheets', name: 'get_values', description: 'Read a spreadsheet value range.', method: 'GET', origin, path: '/v4/spreadsheets/{spreadsheetId}/values/{range}', readOnly: true, scopes: read, inputSchema: schema({ spreadsheetId: text, range: text }, ['spreadsheetId', 'range']), pathParams: ['spreadsheetId', 'range'] }),
  rest({ service: 'sheets', name: 'update_values', description: 'Update a spreadsheet value range.', method: 'PUT', origin, path: '/v4/spreadsheets/{spreadsheetId}/values/{range}', readOnly: false, scopes: write, inputSchema: schema({ spreadsheetId: text, range: text, valueInputOption: text, majorDimension: text, values }, ['spreadsheetId', 'range', 'valueInputOption', 'values']), pathParams: ['spreadsheetId', 'range'], queryParams: { valueInputOption: query('valueInputOption', 'string', true) }, bodyParams: ['majorDimension', 'values'] }),
  rest({ service: 'sheets', name: 'append_values', description: 'Append values to a spreadsheet range.', method: 'POST', origin, path: '/v4/spreadsheets/{spreadsheetId}/values/{range}:append', readOnly: false, scopes: write, inputSchema: schema({ spreadsheetId: text, range: text, valueInputOption: text, insertDataOption: text, majorDimension: text, values }, ['spreadsheetId', 'range', 'valueInputOption', 'values']), pathParams: ['spreadsheetId', 'range'], queryParams: { valueInputOption: query('valueInputOption', 'string', true), insertDataOption: query('insertDataOption') }, bodyParams: ['majorDimension', 'values'] }),
  rest({ service: 'sheets', name: 'update_spreadsheet', description: 'Apply batchUpdate requests to a spreadsheet.', method: 'POST', origin, path: '/v4/spreadsheets/{spreadsheetId}:batchUpdate', readOnly: false, scopes: write, inputSchema: schema({ spreadsheetId: text, requests: { type: 'array', items: object } }, ['spreadsheetId', 'requests']), pathParams: ['spreadsheetId'], bodyParams: ['requests'] }),
];
