import type { ApiOperation } from '../catalog.js';
import { flag, integer, query, rest, schema, scope, text } from './helpers.js';

const origin = 'https://tasks.googleapis.com';
const read = [scope('tasks.readonly')];
const write = [scope('tasks')];
const page = { pageSize: query('maxResults', 'number'), pageToken: query('pageToken') };
const taskBody = { title: text, notes: text, due: text, status: text, completed: text };

export const tasksOperations: readonly ApiOperation[] = [
  rest({ service: 'tasks', name: 'list_task_lists', description: 'List Google Tasks task lists.', method: 'GET', origin, path: '/tasks/v1/users/@me/lists', readOnly: true, scopes: read, inputSchema: schema({ pageSize: integer, pageToken: text }), queryParams: page }),
  rest({ service: 'tasks', name: 'list_tasks', description: 'List tasks in one task list.', method: 'GET', origin, path: '/tasks/v1/lists/{taskListId}/tasks', readOnly: true, scopes: read, inputSchema: schema({ taskListId: text, pageSize: integer, pageToken: text, showCompleted: flag, showHidden: flag }, ['taskListId']), pathParams: ['taskListId'], queryParams: { ...page, showCompleted: query('showCompleted', 'boolean'), showHidden: query('showHidden', 'boolean') } }),
  rest({ service: 'tasks', name: 'get_task', description: 'Read one task.', method: 'GET', origin, path: '/tasks/v1/lists/{taskListId}/tasks/{taskId}', readOnly: true, scopes: read, inputSchema: schema({ taskListId: text, taskId: text }, ['taskListId', 'taskId']), pathParams: ['taskListId', 'taskId'] }),
  rest({ service: 'tasks', name: 'create_task', description: 'Create a task.', method: 'POST', origin, path: '/tasks/v1/lists/{taskListId}/tasks', readOnly: false, scopes: write, inputSchema: schema({ taskListId: text, ...taskBody }, ['taskListId', 'title']), pathParams: ['taskListId'], bodyParams: ['title', 'notes', 'due'] }),
  rest({ service: 'tasks', name: 'update_task', description: 'Update a task.', method: 'PATCH', origin, path: '/tasks/v1/lists/{taskListId}/tasks/{taskId}', readOnly: false, scopes: write, inputSchema: schema({ taskListId: text, taskId: text, ...taskBody }, ['taskListId', 'taskId']), pathParams: ['taskListId', 'taskId'], bodyParams: ['title', 'notes', 'due', 'status', 'completed'] }),
  rest({ service: 'tasks', name: 'complete_task', description: 'Mark a task completed.', method: 'PATCH', origin, path: '/tasks/v1/lists/{taskListId}/tasks/{taskId}', readOnly: false, scopes: write, inputSchema: schema({ taskListId: text, taskId: text, status: text }, ['taskListId', 'taskId', 'status']), pathParams: ['taskListId', 'taskId'], bodyParams: ['status'] }),
  rest({ service: 'tasks', name: 'delete_task', description: 'Delete a task.', method: 'DELETE', origin, path: '/tasks/v1/lists/{taskListId}/tasks/{taskId}', readOnly: false, scopes: write, inputSchema: schema({ taskListId: text, taskId: text }, ['taskListId', 'taskId']), pathParams: ['taskListId', 'taskId'] }),
  rest({ service: 'tasks', name: 'create_task_list', description: 'Create a Google Tasks task list.', method: 'POST', origin, path: '/tasks/v1/users/@me/lists', readOnly: false, scopes: write, inputSchema: schema({ title: text }, ['title']), bodyParams: ['title'] }),
];
