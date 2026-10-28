import type { ApiOperation } from '../catalog.js';
import { flag, integer, object, query, rest, schema, scope, text } from './helpers.js';

const origin = 'https://script.googleapis.com';
const projectsRead = [scope('script.projects.readonly')];
const projectsWrite = [scope('script.projects')];
const deploymentsRead = [scope('script.deployments.readonly')];
const deploymentsWrite = [scope('script.deployments')];
const run = [scope('script.scriptapp')];
const page = { pageSize: query('pageSize', 'number'), pageToken: query('pageToken') };

export const appscriptOperations: readonly ApiOperation[] = [
  rest({ service: 'appscript', name: 'get_project', description: 'Read an Apps Script project.', method: 'GET', origin, path: '/v1/projects/{scriptId}', readOnly: true, scopes: projectsRead, inputSchema: schema({ scriptId: text }, ['scriptId']), pathParams: ['scriptId'] }),
  rest({ service: 'appscript', name: 'create_project', description: 'Create an Apps Script project.', method: 'POST', origin, path: '/v1/projects', readOnly: false, scopes: projectsWrite, inputSchema: schema({ title: text, parentId: text }, ['title']), bodyParams: ['title', 'parentId'] }),
  rest({ service: 'appscript', name: 'get_content', description: 'Read Apps Script project content.', method: 'GET', origin, path: '/v1/projects/{scriptId}/content', readOnly: true, scopes: projectsRead, inputSchema: schema({ scriptId: text, versionNumber: integer }, ['scriptId']), pathParams: ['scriptId'], queryParams: { versionNumber: query('versionNumber', 'number') } }),
  rest({ service: 'appscript', name: 'update_content', description: 'Update Apps Script project files.', method: 'PUT', origin, path: '/v1/projects/{scriptId}/content', readOnly: false, scopes: projectsWrite, inputSchema: schema({ scriptId: text, files: { type: 'array', items: object } }, ['scriptId', 'files']), pathParams: ['scriptId'], bodyParams: ['files'] }),
  rest({ service: 'appscript', name: 'list_versions', description: 'List Apps Script project versions.', method: 'GET', origin, path: '/v1/projects/{scriptId}/versions', readOnly: true, scopes: projectsRead, inputSchema: schema({ scriptId: text, pageSize: integer, pageToken: text }, ['scriptId']), pathParams: ['scriptId'], queryParams: page }),
  rest({ service: 'appscript', name: 'create_version', description: 'Create an Apps Script project version.', method: 'POST', origin, path: '/v1/projects/{scriptId}/versions', readOnly: false, scopes: projectsWrite, inputSchema: schema({ scriptId: text, description: text }, ['scriptId']), pathParams: ['scriptId'], bodyParams: ['description'] }),
  rest({ service: 'appscript', name: 'list_deployments', description: 'List Apps Script project deployments.', method: 'GET', origin, path: '/v1/projects/{scriptId}/deployments', readOnly: true, scopes: deploymentsRead, inputSchema: schema({ scriptId: text, pageSize: integer, pageToken: text }, ['scriptId']), pathParams: ['scriptId'], queryParams: page }),
  rest({ service: 'appscript', name: 'create_deployment', description: 'Create an Apps Script deployment.', method: 'POST', origin, path: '/v1/projects/{scriptId}/deployments', readOnly: false, scopes: deploymentsWrite, inputSchema: schema({ scriptId: text, versionNumber: integer, description: text, manifestFileName: text }, ['scriptId', 'versionNumber']), pathParams: ['scriptId'], bodyParams: ['versionNumber', 'description', 'manifestFileName'] }),
  rest({ service: 'appscript', name: 'run_function', description: 'Run a function only in a same-project deployment enabled for API execution.', method: 'POST', origin, path: '/v1/scripts/{deploymentId}:run', readOnly: false, scopes: run, inputSchema: schema({ deploymentId: text, function: text, parameters: { type: 'array', items: {} }, devMode: flag }, ['deploymentId', 'function']), pathParams: ['deploymentId'], bodyParams: ['function', 'parameters', 'devMode'] }),
];
