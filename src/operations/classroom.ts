import type { ApiOperation } from '../catalog.js';
import { integer, object, query, rest, schema, scope, strings, text } from './helpers.js';

const origin = 'https://classroom.googleapis.com';
const courses = [scope('classroom.courses.readonly')];
const courseworkRead = [scope('classroom.coursework.students.readonly')];
const announcementsRead = [scope('classroom.announcements.readonly')];
const courseworkWrite = [scope('classroom.coursework.students')];
const announcementsWrite = [scope('classroom.announcements')];
const page = { pageSize: query('pageSize', 'number'), pageToken: query('pageToken') };

export const classroomOperations: readonly ApiOperation[] = [
  rest({ service: 'classroom', name: 'list_courses', description: 'List Classroom courses for the authenticated user.', method: 'GET', origin, path: '/v1/courses', readOnly: true, scopes: courses, inputSchema: schema({ pageSize: integer, pageToken: text, courseStates: strings }), queryParams: { ...page, courseStates: query('courseStates', 'stringArray') } }),
  rest({ service: 'classroom', name: 'get_course', description: 'Read one Classroom course.', method: 'GET', origin, path: '/v1/courses/{courseId}', readOnly: true, scopes: courses, inputSchema: schema({ courseId: text }, ['courseId']), pathParams: ['courseId'] }),
  rest({ service: 'classroom', name: 'list_coursework', description: 'List coursework in one Classroom course.', method: 'GET', origin, path: '/v1/courses/{courseId}/courseWork', readOnly: true, scopes: courseworkRead, inputSchema: schema({ courseId: text, pageSize: integer, pageToken: text }, ['courseId']), pathParams: ['courseId'], queryParams: page }),
  rest({ service: 'classroom', name: 'list_announcements', description: 'List announcements in one Classroom course.', method: 'GET', origin, path: '/v1/courses/{courseId}/announcements', readOnly: true, scopes: announcementsRead, inputSchema: schema({ courseId: text, pageSize: integer, pageToken: text }, ['courseId']), pathParams: ['courseId'], queryParams: page }),
  rest({ service: 'classroom', name: 'create_coursework', description: 'Create coursework in one Classroom course.', method: 'POST', origin, path: '/v1/courses/{courseId}/courseWork', readOnly: false, scopes: courseworkWrite, inputSchema: schema({ courseId: text, title: text, description: text, workType: text, dueDate: object, dueTime: object, maxPoints: { type: 'number' } }, ['courseId', 'title', 'workType']), pathParams: ['courseId'], bodyParams: ['title', 'description', 'workType', 'dueDate', 'dueTime', 'maxPoints'] }),
  rest({ service: 'classroom', name: 'create_announcement', description: 'Create an announcement in one Classroom course.', method: 'POST', origin, path: '/v1/courses/{courseId}/announcements', readOnly: false, scopes: announcementsWrite, inputSchema: schema({ courseId: text, text: text, materials: { type: 'array', items: object }, state: text }, ['courseId', 'text']), pathParams: ['courseId'], bodyParams: ['text', 'materials', 'state'] }),
];
