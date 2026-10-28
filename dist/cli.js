"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/cli.ts
var cli_exports = {};
__export(cli_exports, {
  runCli: () => runCli
});
module.exports = __toCommonJS(cli_exports);
var import_node_fs6 = require("node:fs");
var import_node_path6 = __toESM(require("node:path"));

// src/api-error.ts
var ApiError = class extends Error {
  status;
  code;
  constructor(status, message) {
    super(message.slice(0, 500));
    this.name = "ApiError";
    this.status = status;
    this.code = `HTTP_${status}`;
  }
};

// src/errors.ts
var WorkspaceError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "WorkspaceError";
    this.code = code;
  }
};

// src/operations/helpers.ts
var scope = (name) => `https://www.googleapis.com/auth/${name}`;
var text = { type: "string" };
var integer = { type: "integer", minimum: 1 };
var flag = { type: "boolean" };
var strings = { type: "array", items: { type: "string" } };
var object = { type: "object", additionalProperties: true };
function schema(properties, required2 = []) {
  return { type: "object", properties, required: required2, additionalProperties: false };
}
function query(wireName, type = "string", required2 = false, extras = {}) {
  return { wireName, type, ...required2 ? { required: true } : {}, ...extras };
}
function rest(input) {
  const { pathParams = [], queryParams = {}, bodyParams = [], bodyKind, ...definition } = input;
  return {
    kind: "rest",
    pathParams,
    queryParams,
    bodyParams,
    bodyKind: bodyKind ?? (bodyParams.length > 0 ? "json" : "none"),
    ...definition
  };
}
function local(service, name, description, inputSchema, scopes) {
  return {
    kind: "local",
    service,
    name,
    description,
    inputSchema,
    scopes,
    method: "GET",
    origin: "local",
    path: "local",
    readOnly: true,
    pathParams: [],
    queryParams: {},
    bodyParams: [],
    bodyKind: "none"
  };
}

// src/operations/gmail.ts
var origin = "https://gmail.googleapis.com";
var read = [scope("gmail.readonly")];
var compose = [scope("gmail.compose")];
var modify = [scope("gmail.modify")];
var send = [scope("gmail.send")];
var page = { pageSize: query("maxResults", "number"), pageToken: query("pageToken") };
var gmailOperations = [
  rest({ service: "gmail", name: "search_messages", description: "Search Gmail messages with Gmail query syntax.", method: "GET", origin, path: "/gmail/v1/users/me/messages", readOnly: true, scopes: read, inputSchema: schema({ query: text, pageSize: integer, pageToken: text, includeSpamTrash: flag }), queryParams: { query: query("q"), ...page, includeSpamTrash: query("includeSpamTrash", "boolean") } }),
  rest({ service: "gmail", name: "search_threads", description: "Search Gmail threads with Gmail query syntax.", method: "GET", origin, path: "/gmail/v1/users/me/threads", readOnly: true, scopes: read, inputSchema: schema({ query: text, pageSize: integer, pageToken: text, includeSpamTrash: flag }), queryParams: { query: query("q"), ...page, includeSpamTrash: query("includeSpamTrash", "boolean") } }),
  rest({ service: "gmail", name: "get_message", description: "Read one Gmail message by ID.", method: "GET", origin, path: "/gmail/v1/users/me/messages/{messageId}", readOnly: true, scopes: read, inputSchema: schema({ messageId: text, format: text }, ["messageId"]), pathParams: ["messageId"], queryParams: { format: query("format") } }),
  rest({ service: "gmail", name: "get_thread", description: "Read one Gmail thread by ID.", method: "GET", origin, path: "/gmail/v1/users/me/threads/{threadId}", readOnly: true, scopes: read, inputSchema: schema({ threadId: text }, ["threadId"]), pathParams: ["threadId"] }),
  rest({ service: "gmail", name: "list_labels", description: "List Gmail labels.", method: "GET", origin, path: "/gmail/v1/users/me/labels", readOnly: true, scopes: read, inputSchema: schema({}) }),
  rest({ service: "gmail", name: "list_drafts", description: "List Gmail drafts with optional search and pagination.", method: "GET", origin, path: "/gmail/v1/users/me/drafts", readOnly: true, scopes: read, inputSchema: schema({ query: text, pageSize: integer, pageToken: text, includeSpamTrash: flag }), queryParams: { query: query("q"), ...page, includeSpamTrash: query("includeSpamTrash", "boolean") } }),
  rest({ service: "gmail", name: "create_draft", description: "Create a Gmail draft from a message resource.", method: "POST", origin, path: "/gmail/v1/users/me/drafts", readOnly: false, scopes: compose, inputSchema: schema({ message: { type: "object", properties: { raw: text, threadId: text }, required: ["raw"], additionalProperties: false } }, ["message"]), bodyParams: ["message"] }),
  rest({ service: "gmail", name: "send_message", description: "Send a Gmail message using its base64url-encoded RFC 2822 raw value.", method: "POST", origin, path: "/gmail/v1/users/me/messages/send", readOnly: false, scopes: send, inputSchema: schema({ raw: text, threadId: text }, ["raw"]), bodyParams: ["raw", "threadId"] }),
  rest({ service: "gmail", name: "update_message_labels", description: "Add and remove labels on one Gmail message.", method: "POST", origin, path: "/gmail/v1/users/me/messages/{messageId}/modify", readOnly: false, scopes: modify, inputSchema: schema({ messageId: text, addLabelIds: strings, removeLabelIds: strings }, ["messageId"]), pathParams: ["messageId"], bodyParams: ["addLabelIds", "removeLabelIds"] }),
  rest({ service: "gmail", name: "trash_message", description: "Move one Gmail message to Trash.", method: "POST", origin, path: "/gmail/v1/users/me/messages/{messageId}/trash", readOnly: false, scopes: modify, inputSchema: schema({ messageId: text }, ["messageId"]), pathParams: ["messageId"] }),
  rest({ service: "gmail", name: "untrash_message", description: "Remove one Gmail message from Trash.", method: "POST", origin, path: "/gmail/v1/users/me/messages/{messageId}/untrash", readOnly: false, scopes: modify, inputSchema: schema({ messageId: text }, ["messageId"]), pathParams: ["messageId"] })
];

// src/operations/drive.ts
var origin2 = "https://www.googleapis.com";
var read2 = [scope("drive.readonly")];
var write = [scope("drive.file")];
var common = { fields: query("fields"), supportsAllDrives: query("supportsAllDrives", "boolean") };
var metadata = schema({ fileId: text, fields: text, supportsAllDrives: flag }, ["fileId"]);
var driveOperations = [
  rest({ service: "drive", name: "search_files", description: "Search Drive files with Drive query syntax.", method: "GET", origin: origin2, path: "/drive/v3/files", readOnly: true, scopes: read2, inputSchema: schema({ query: text, pageSize: integer, pageToken: text, orderBy: text, fields: text, includeItemsFromAllDrives: flag, supportsAllDrives: flag }), queryParams: { query: query("q"), pageSize: query("pageSize", "number"), pageToken: query("pageToken"), orderBy: query("orderBy"), fields: query("fields"), includeItemsFromAllDrives: query("includeItemsFromAllDrives", "boolean"), supportsAllDrives: query("supportsAllDrives", "boolean") } }),
  rest({ service: "drive", name: "list_recent_files", description: "List recently modified Drive files.", method: "GET", origin: origin2, path: "/drive/v3/files", readOnly: true, scopes: read2, inputSchema: schema({ pageSize: integer, pageToken: text, fields: text }), queryParams: { pageSize: query("pageSize", "number"), pageToken: query("pageToken"), orderBy: query("orderBy", "string", false, { defaultValue: "modifiedTime desc" }), fields: query("fields") } }),
  rest({ service: "drive", name: "get_file_metadata", description: "Read Drive file metadata.", method: "GET", origin: origin2, path: "/drive/v3/files/{fileId}", readOnly: true, scopes: read2, inputSchema: metadata, pathParams: ["fileId"], queryParams: common }),
  rest({ service: "drive", name: "get_file_permissions", description: "List permissions on a Drive file.", method: "GET", origin: origin2, path: "/drive/v3/files/{fileId}/permissions", readOnly: true, scopes: read2, inputSchema: metadata, pathParams: ["fileId"], queryParams: common }),
  rest({ service: "drive", name: "download_file_content", description: "Download binary Drive file content.", method: "GET", origin: origin2, path: "/drive/v3/files/{fileId}", readOnly: true, scopes: read2, inputSchema: schema({ fileId: text }, ["fileId"]), pathParams: ["fileId"], queryParams: { alt: query("alt", "string", false, { defaultValue: "media" }), supportsAllDrives: query("supportsAllDrives", "boolean") }, binaryResponse: true }),
  rest({ service: "drive", name: "export_file_content", description: "Export a native Google Workspace file to another MIME type.", method: "GET", origin: origin2, path: "/drive/v3/files/{fileId}/export", readOnly: true, scopes: read2, inputSchema: schema({ fileId: text, mimeType: text }, ["fileId", "mimeType"]), pathParams: ["fileId"], queryParams: { mimeType: query("mimeType", "string", true) }, binaryResponse: true }),
  rest({ service: "drive", name: "create_file", description: "Create a Drive file with metadata and optional base64 content.", method: "POST", origin: origin2, path: "/upload/drive/v3/files", readOnly: false, scopes: write, inputSchema: schema({ metadata: object, contentBase64: text, mimeType: text }, ["metadata"]), queryParams: { uploadType: query("uploadType", "string", false, { defaultValue: "multipart" }), fields: query("fields") }, bodyParams: ["metadata", "contentBase64", "mimeType"], bodyKind: "multipart" }),
  rest({ service: "drive", name: "update_file", description: "Update Drive file metadata and optional base64 content.", method: "PATCH", origin: origin2, path: "/upload/drive/v3/files/{fileId}", readOnly: false, scopes: write, inputSchema: schema({ fileId: text, metadata: object, contentBase64: text, mimeType: text }, ["fileId"]), pathParams: ["fileId"], queryParams: { uploadType: query("uploadType", "string", false, { defaultValue: "multipart" }), fields: query("fields") }, bodyParams: ["metadata", "contentBase64", "mimeType"], bodyKind: "multipart" }),
  rest({ service: "drive", name: "copy_file", description: "Copy a Drive file.", method: "POST", origin: origin2, path: "/drive/v3/files/{fileId}/copy", readOnly: false, scopes: write, inputSchema: schema({ fileId: text, name: text, parents: strings }, ["fileId"]), pathParams: ["fileId"], bodyParams: ["name", "parents"] })
];

// src/operations/calendar.ts
var origin3 = "https://www.googleapis.com";
var listRead = [scope("calendar.calendarlist.readonly")];
var read3 = [scope("calendar.events.readonly")];
var freeBusy = [scope("calendar.events.freebusy")];
var write2 = [scope("calendar.events")];
var eventBody = { summary: text, description: text, location: text, start: object, end: object, attendees: { type: "array", items: object }, recurrence: strings };
var eventParams = ["summary", "description", "location", "start", "end", "attendees", "recurrence"];
var calendarOperations = [
  rest({ service: "calendar", name: "list_calendars", description: "List calendars visible to the user.", method: "GET", origin: origin3, path: "/calendar/v3/users/me/calendarList", readOnly: true, scopes: listRead, inputSchema: schema({ pageSize: integer, pageToken: text }), queryParams: { pageSize: query("maxResults", "number"), pageToken: query("pageToken") } }),
  rest({ service: "calendar", name: "list_events", description: "List events from one calendar.", method: "GET", origin: origin3, path: "/calendar/v3/calendars/{calendarId}/events", readOnly: true, scopes: read3, inputSchema: schema({ calendarId: text, timeMin: text, timeMax: text, pageSize: integer, pageToken: text, singleEvents: flag, orderBy: text }, ["calendarId"]), pathParams: ["calendarId"], queryParams: { timeMin: query("timeMin"), timeMax: query("timeMax"), pageSize: query("maxResults", "number"), pageToken: query("pageToken"), singleEvents: query("singleEvents", "boolean"), orderBy: query("orderBy") } }),
  rest({ service: "calendar", name: "search_events", description: "Search events in one calendar.", method: "GET", origin: origin3, path: "/calendar/v3/calendars/{calendarId}/events", readOnly: true, scopes: read3, inputSchema: schema({ calendarId: text, query: text, timeMin: text, timeMax: text, pageSize: integer, pageToken: text }, ["calendarId", "query"]), pathParams: ["calendarId"], queryParams: { query: query("q", "string", true), timeMin: query("timeMin"), timeMax: query("timeMax"), pageSize: query("maxResults", "number"), pageToken: query("pageToken") } }),
  rest({ service: "calendar", name: "get_event", description: "Read one calendar event.", method: "GET", origin: origin3, path: "/calendar/v3/calendars/{calendarId}/events/{eventId}", readOnly: true, scopes: read3, inputSchema: schema({ calendarId: text, eventId: text }, ["calendarId", "eventId"]), pathParams: ["calendarId", "eventId"] }),
  rest({ service: "calendar", name: "create_event", description: "Create a calendar event.", method: "POST", origin: origin3, path: "/calendar/v3/calendars/{calendarId}/events", readOnly: false, scopes: write2, inputSchema: schema({ calendarId: text, ...eventBody }, ["calendarId", "summary", "start", "end"]), pathParams: ["calendarId"], bodyParams: eventParams }),
  rest({ service: "calendar", name: "update_event", description: "Update a calendar event.", method: "PATCH", origin: origin3, path: "/calendar/v3/calendars/{calendarId}/events/{eventId}", readOnly: false, scopes: write2, inputSchema: schema({ calendarId: text, eventId: text, ...eventBody }, ["calendarId", "eventId"]), pathParams: ["calendarId", "eventId"], bodyParams: eventParams }),
  rest({ service: "calendar", name: "delete_event", description: "Delete a calendar event.", method: "DELETE", origin: origin3, path: "/calendar/v3/calendars/{calendarId}/events/{eventId}", readOnly: false, scopes: write2, inputSchema: schema({ calendarId: text, eventId: text }, ["calendarId", "eventId"]), pathParams: ["calendarId", "eventId"] }),
  rest({ service: "calendar", name: "respond_to_event", description: "Set attendee response status on an event.", method: "PATCH", origin: origin3, path: "/calendar/v3/calendars/{calendarId}/events/{eventId}", readOnly: false, scopes: write2, inputSchema: schema({ calendarId: text, eventId: text, attendees: { type: "array", items: object } }, ["calendarId", "eventId", "attendees"]), pathParams: ["calendarId", "eventId"], bodyParams: ["attendees"] }),
  rest({ service: "calendar", name: "check_free_busy", description: "Check free/busy information for calendars.", method: "POST", origin: origin3, path: "/calendar/v3/freeBusy", readOnly: true, scopes: freeBusy, inputSchema: schema({ timeMin: text, timeMax: text, items: { type: "array", items: object } }, ["timeMin", "timeMax", "items"]), bodyParams: ["timeMin", "timeMax", "items"] })
];

// src/operations/people.ts
var origin4 = "https://people.googleapis.com";
var profile = [scope("userinfo.profile")];
var contacts = [scope("contacts.readonly")];
var directory = [scope("directory.readonly")];
var peopleOperations = [
  rest({ service: "people", name: "get_user_profile", description: "Read the authenticated user profile.", method: "GET", origin: origin4, path: "/v1/people/me", readOnly: true, scopes: profile, inputSchema: schema({ personFields: strings }, ["personFields"]), queryParams: { personFields: query("personFields", "stringArray", true, { join: "," }) } }),
  rest({ service: "people", name: "search_contacts", description: "Search the authenticated user contacts.", method: "GET", origin: origin4, path: "/v1/people:searchContacts", readOnly: true, scopes: contacts, inputSchema: schema({ query: text, pageSize: integer, readMask: strings }, ["query", "readMask"]), queryParams: { query: query("query", "string", true), pageSize: query("pageSize", "number"), readMask: query("readMask", "stringArray", true, { join: "," }) } }),
  rest({ service: "people", name: "search_directory_people", description: "Search Workspace directory people; requires an administrator directory grant.", method: "GET", origin: origin4, path: "/v1/people:searchDirectoryPeople", readOnly: true, scopes: directory, inputSchema: schema({ query: text, pageSize: integer, readMask: strings, sources: strings }, ["query", "readMask"]), queryParams: { query: query("query", "string", true), pageSize: query("pageSize", "number"), readMask: query("readMask", "stringArray", true, { join: "," }), sources: query("sources", "stringArray") } })
];

// src/operations/docs.ts
var origin5 = "https://docs.googleapis.com";
var docsOperations = [
  rest({ service: "docs", name: "read_doc", description: "Read a Google Docs document.", method: "GET", origin: origin5, path: "/v1/documents/{documentId}", readOnly: true, scopes: [scope("documents.readonly"), scope("drive.readonly")], inputSchema: schema({ documentId: text }, ["documentId"]), pathParams: ["documentId"] }),
  rest({ service: "docs", name: "create_doc", description: "Create a Google Docs document.", method: "POST", origin: origin5, path: "/v1/documents", readOnly: false, scopes: [scope("documents"), scope("drive.file")], inputSchema: schema({ title: text }, ["title"]), bodyParams: ["title"] }),
  rest({ service: "docs", name: "update_doc", description: "Apply batchUpdate requests to a Google Docs document.", method: "POST", origin: origin5, path: "/v1/documents/{documentId}:batchUpdate", readOnly: false, scopes: [scope("documents"), scope("drive.file")], inputSchema: schema({ documentId: text, requests: { type: "array", items: object } }, ["documentId", "requests"]), pathParams: ["documentId"], bodyParams: ["requests"] })
];

// src/operations/sheets.ts
var origin6 = "https://sheets.googleapis.com";
var read4 = [scope("spreadsheets.readonly"), scope("drive.readonly")];
var write3 = [scope("spreadsheets"), scope("drive.file")];
var values = { type: "array", items: { type: "array", items: {} } };
var sheetsOperations = [
  rest({ service: "sheets", name: "get_spreadsheet", description: "Read spreadsheet metadata.", method: "GET", origin: origin6, path: "/v4/spreadsheets/{spreadsheetId}", readOnly: true, scopes: read4, inputSchema: schema({ spreadsheetId: text, fields: text }, ["spreadsheetId"]), pathParams: ["spreadsheetId"], queryParams: { fields: query("fields") } }),
  rest({ service: "sheets", name: "get_values", description: "Read a spreadsheet value range.", method: "GET", origin: origin6, path: "/v4/spreadsheets/{spreadsheetId}/values/{range}", readOnly: true, scopes: read4, inputSchema: schema({ spreadsheetId: text, range: text }, ["spreadsheetId", "range"]), pathParams: ["spreadsheetId", "range"] }),
  rest({ service: "sheets", name: "update_values", description: "Update a spreadsheet value range.", method: "PUT", origin: origin6, path: "/v4/spreadsheets/{spreadsheetId}/values/{range}", readOnly: false, scopes: write3, inputSchema: schema({ spreadsheetId: text, range: text, valueInputOption: text, majorDimension: text, values }, ["spreadsheetId", "range", "valueInputOption", "values"]), pathParams: ["spreadsheetId", "range"], queryParams: { valueInputOption: query("valueInputOption", "string", true) }, bodyParams: ["majorDimension", "values"] }),
  rest({ service: "sheets", name: "append_values", description: "Append values to a spreadsheet range.", method: "POST", origin: origin6, path: "/v4/spreadsheets/{spreadsheetId}/values/{range}:append", readOnly: false, scopes: write3, inputSchema: schema({ spreadsheetId: text, range: text, valueInputOption: text, insertDataOption: text, majorDimension: text, values }, ["spreadsheetId", "range", "valueInputOption", "values"]), pathParams: ["spreadsheetId", "range"], queryParams: { valueInputOption: query("valueInputOption", "string", true), insertDataOption: query("insertDataOption") }, bodyParams: ["majorDimension", "values"] }),
  rest({ service: "sheets", name: "update_spreadsheet", description: "Apply batchUpdate requests to a spreadsheet.", method: "POST", origin: origin6, path: "/v4/spreadsheets/{spreadsheetId}:batchUpdate", readOnly: false, scopes: write3, inputSchema: schema({ spreadsheetId: text, requests: { type: "array", items: object } }, ["spreadsheetId", "requests"]), pathParams: ["spreadsheetId"], bodyParams: ["requests"] })
];

// src/operations/slides.ts
var origin7 = "https://slides.googleapis.com";
var read5 = [scope("presentations.readonly"), scope("drive.readonly")];
var write4 = [scope("presentations"), scope("drive.file")];
var slidesOperations = [
  rest({ service: "slides", name: "read_presentation", description: "Read a Google Slides presentation.", method: "GET", origin: origin7, path: "/v1/presentations/{presentationId}", readOnly: true, scopes: read5, inputSchema: schema({ presentationId: text }, ["presentationId"]), pathParams: ["presentationId"] }),
  rest({ service: "slides", name: "create_presentation", description: "Create a Google Slides presentation.", method: "POST", origin: origin7, path: "/v1/presentations", readOnly: false, scopes: write4, inputSchema: schema({ title: text }, ["title"]), bodyParams: ["title"] }),
  rest({ service: "slides", name: "update_presentation", description: "Apply batchUpdate requests to a presentation.", method: "POST", origin: origin7, path: "/v1/presentations/{presentationId}:batchUpdate", readOnly: false, scopes: write4, inputSchema: schema({ presentationId: text, requests: { type: "array", items: object } }, ["presentationId", "requests"]), pathParams: ["presentationId"], bodyParams: ["requests"] })
];

// src/operations/chat.ts
var origin8 = "https://chat.googleapis.com";
var spaces = [scope("chat.spaces.readonly")];
var memberships = [scope("chat.memberships.readonly")];
var messages = [scope("chat.messages.readonly")];
var create = [scope("chat.messages.create")];
var page2 = { pageSize: query("pageSize", "number"), pageToken: query("pageToken") };
var chatOperations = [
  rest({ service: "chat", name: "list_spaces", description: "List Google Chat spaces.", method: "GET", origin: origin8, path: "/v1/spaces", readOnly: true, scopes: spaces, inputSchema: schema({ pageSize: integer, pageToken: text }), queryParams: page2 }),
  rest({ service: "chat", name: "list_messages", description: "List messages in one Google Chat space.", method: "GET", origin: origin8, path: "/v1/spaces/{spaceId}/messages", readOnly: true, scopes: messages, inputSchema: schema({ spaceId: text, pageSize: integer, pageToken: text }, ["spaceId"]), pathParams: ["spaceId"], queryParams: page2 }),
  rest({ service: "chat", name: "get_message", description: "Read one Google Chat message.", method: "GET", origin: origin8, path: "/v1/spaces/{spaceId}/messages/{messageId}", readOnly: true, scopes: messages, inputSchema: schema({ spaceId: text, messageId: text }, ["spaceId", "messageId"]), pathParams: ["spaceId", "messageId"] }),
  rest({ service: "chat", name: "list_memberships", description: "List memberships in one Google Chat space.", method: "GET", origin: origin8, path: "/v1/spaces/{spaceId}/members", readOnly: true, scopes: memberships, inputSchema: schema({ spaceId: text, pageSize: integer, pageToken: text }, ["spaceId"]), pathParams: ["spaceId"], queryParams: page2 }),
  rest({ service: "chat", name: "create_message", description: "Create a text message in a Google Chat space.", method: "POST", origin: origin8, path: "/v1/spaces/{spaceId}/messages", readOnly: false, scopes: create, inputSchema: schema({ spaceId: text, text }, ["spaceId", "text"]), pathParams: ["spaceId"], bodyParams: ["text"] })
];

// src/operations/classroom.ts
var origin9 = "https://classroom.googleapis.com";
var courses = [scope("classroom.courses.readonly")];
var courseworkRead = [scope("classroom.coursework.students.readonly")];
var announcementsRead = [scope("classroom.announcements.readonly")];
var courseworkWrite = [scope("classroom.coursework.students")];
var announcementsWrite = [scope("classroom.announcements")];
var page3 = { pageSize: query("pageSize", "number"), pageToken: query("pageToken") };
var classroomOperations = [
  rest({ service: "classroom", name: "list_courses", description: "List Classroom courses for the authenticated user.", method: "GET", origin: origin9, path: "/v1/courses", readOnly: true, scopes: courses, inputSchema: schema({ pageSize: integer, pageToken: text, courseStates: strings }), queryParams: { ...page3, courseStates: query("courseStates", "stringArray") } }),
  rest({ service: "classroom", name: "get_course", description: "Read one Classroom course.", method: "GET", origin: origin9, path: "/v1/courses/{courseId}", readOnly: true, scopes: courses, inputSchema: schema({ courseId: text }, ["courseId"]), pathParams: ["courseId"] }),
  rest({ service: "classroom", name: "list_coursework", description: "List coursework in one Classroom course.", method: "GET", origin: origin9, path: "/v1/courses/{courseId}/courseWork", readOnly: true, scopes: courseworkRead, inputSchema: schema({ courseId: text, pageSize: integer, pageToken: text }, ["courseId"]), pathParams: ["courseId"], queryParams: page3 }),
  rest({ service: "classroom", name: "list_announcements", description: "List announcements in one Classroom course.", method: "GET", origin: origin9, path: "/v1/courses/{courseId}/announcements", readOnly: true, scopes: announcementsRead, inputSchema: schema({ courseId: text, pageSize: integer, pageToken: text }, ["courseId"]), pathParams: ["courseId"], queryParams: page3 }),
  rest({ service: "classroom", name: "create_coursework", description: "Create coursework in one Classroom course.", method: "POST", origin: origin9, path: "/v1/courses/{courseId}/courseWork", readOnly: false, scopes: courseworkWrite, inputSchema: schema({ courseId: text, title: text, description: text, workType: text, dueDate: object, dueTime: object, maxPoints: { type: "number" } }, ["courseId", "title", "workType"]), pathParams: ["courseId"], bodyParams: ["title", "description", "workType", "dueDate", "dueTime", "maxPoints"] }),
  rest({ service: "classroom", name: "create_announcement", description: "Create an announcement in one Classroom course.", method: "POST", origin: origin9, path: "/v1/courses/{courseId}/announcements", readOnly: false, scopes: announcementsWrite, inputSchema: schema({ courseId: text, text, materials: { type: "array", items: object }, state: text }, ["courseId", "text"]), pathParams: ["courseId"], bodyParams: ["text", "materials", "state"] })
];

// src/operations/tasks.ts
var origin10 = "https://tasks.googleapis.com";
var read6 = [scope("tasks.readonly")];
var write5 = [scope("tasks")];
var page4 = { pageSize: query("maxResults", "number"), pageToken: query("pageToken") };
var taskBody = { title: text, notes: text, due: text, status: text, completed: text };
var tasksOperations = [
  rest({ service: "tasks", name: "list_task_lists", description: "List Google Tasks task lists.", method: "GET", origin: origin10, path: "/tasks/v1/users/@me/lists", readOnly: true, scopes: read6, inputSchema: schema({ pageSize: integer, pageToken: text }), queryParams: page4 }),
  rest({ service: "tasks", name: "list_tasks", description: "List tasks in one task list.", method: "GET", origin: origin10, path: "/tasks/v1/lists/{taskListId}/tasks", readOnly: true, scopes: read6, inputSchema: schema({ taskListId: text, pageSize: integer, pageToken: text, showCompleted: flag, showHidden: flag }, ["taskListId"]), pathParams: ["taskListId"], queryParams: { ...page4, showCompleted: query("showCompleted", "boolean"), showHidden: query("showHidden", "boolean") } }),
  rest({ service: "tasks", name: "get_task", description: "Read one task.", method: "GET", origin: origin10, path: "/tasks/v1/lists/{taskListId}/tasks/{taskId}", readOnly: true, scopes: read6, inputSchema: schema({ taskListId: text, taskId: text }, ["taskListId", "taskId"]), pathParams: ["taskListId", "taskId"] }),
  rest({ service: "tasks", name: "create_task", description: "Create a task.", method: "POST", origin: origin10, path: "/tasks/v1/lists/{taskListId}/tasks", readOnly: false, scopes: write5, inputSchema: schema({ taskListId: text, ...taskBody }, ["taskListId", "title"]), pathParams: ["taskListId"], bodyParams: ["title", "notes", "due"] }),
  rest({ service: "tasks", name: "update_task", description: "Update a task.", method: "PATCH", origin: origin10, path: "/tasks/v1/lists/{taskListId}/tasks/{taskId}", readOnly: false, scopes: write5, inputSchema: schema({ taskListId: text, taskId: text, ...taskBody }, ["taskListId", "taskId"]), pathParams: ["taskListId", "taskId"], bodyParams: ["title", "notes", "due", "status", "completed"] }),
  rest({ service: "tasks", name: "complete_task", description: "Mark a task completed.", method: "PATCH", origin: origin10, path: "/tasks/v1/lists/{taskListId}/tasks/{taskId}", readOnly: false, scopes: write5, inputSchema: schema({ taskListId: text, taskId: text, status: text }, ["taskListId", "taskId", "status"]), pathParams: ["taskListId", "taskId"], bodyParams: ["status"] }),
  rest({ service: "tasks", name: "delete_task", description: "Delete a task.", method: "DELETE", origin: origin10, path: "/tasks/v1/lists/{taskListId}/tasks/{taskId}", readOnly: false, scopes: write5, inputSchema: schema({ taskListId: text, taskId: text }, ["taskListId", "taskId"]), pathParams: ["taskListId", "taskId"] }),
  rest({ service: "tasks", name: "create_task_list", description: "Create a Google Tasks task list.", method: "POST", origin: origin10, path: "/tasks/v1/users/@me/lists", readOnly: false, scopes: write5, inputSchema: schema({ title: text }, ["title"]), bodyParams: ["title"] })
];

// src/operations/forms.ts
var origin11 = "https://forms.googleapis.com";
var bodyRead = [scope("forms.body.readonly")];
var responsesRead = [scope("forms.responses.readonly")];
var bodyWrite = [scope("forms.body")];
var formsOperations = [
  rest({ service: "forms", name: "get_form", description: "Read a Google Form structure.", method: "GET", origin: origin11, path: "/v1/forms/{formId}", readOnly: true, scopes: bodyRead, inputSchema: schema({ formId: text }, ["formId"]), pathParams: ["formId"] }),
  rest({ service: "forms", name: "create_form", description: "Create a Google Form with an info object; only the title is set on creation.", method: "POST", origin: origin11, path: "/v1/forms", readOnly: false, scopes: bodyWrite, inputSchema: schema({ info: object }, ["info"]), bodyParams: ["info"] }),
  rest({ service: "forms", name: "update_form", description: "Apply batchUpdate requests to a Google Form.", method: "POST", origin: origin11, path: "/v1/forms/{formId}:batchUpdate", readOnly: false, scopes: bodyWrite, inputSchema: schema({ formId: text, requests: { type: "array", items: object } }, ["formId", "requests"]), pathParams: ["formId"], bodyParams: ["requests"] }),
  rest({ service: "forms", name: "list_responses", description: "List responses to a Google Form.", method: "GET", origin: origin11, path: "/v1/forms/{formId}/responses", readOnly: true, scopes: responsesRead, inputSchema: schema({ formId: text, pageSize: integer, pageToken: text, filter: text }, ["formId"]), pathParams: ["formId"], queryParams: { pageSize: query("pageSize", "number"), pageToken: query("pageToken"), filter: query("filter") } }),
  rest({ service: "forms", name: "get_response", description: "Read one Google Form response.", method: "GET", origin: origin11, path: "/v1/forms/{formId}/responses/{responseId}", readOnly: true, scopes: responsesRead, inputSchema: schema({ formId: text, responseId: text }, ["formId", "responseId"]), pathParams: ["formId", "responseId"] })
];

// src/operations/appscript.ts
var origin12 = "https://script.googleapis.com";
var projectsRead = [scope("script.projects.readonly")];
var projectsWrite = [scope("script.projects")];
var deploymentsRead = [scope("script.deployments.readonly")];
var deploymentsWrite = [scope("script.deployments")];
var run = [scope("script.scriptapp")];
var page5 = { pageSize: query("pageSize", "number"), pageToken: query("pageToken") };
var appscriptOperations = [
  rest({ service: "appscript", name: "get_project", description: "Read an Apps Script project.", method: "GET", origin: origin12, path: "/v1/projects/{scriptId}", readOnly: true, scopes: projectsRead, inputSchema: schema({ scriptId: text }, ["scriptId"]), pathParams: ["scriptId"] }),
  rest({ service: "appscript", name: "create_project", description: "Create an Apps Script project.", method: "POST", origin: origin12, path: "/v1/projects", readOnly: false, scopes: projectsWrite, inputSchema: schema({ title: text, parentId: text }, ["title"]), bodyParams: ["title", "parentId"] }),
  rest({ service: "appscript", name: "get_content", description: "Read Apps Script project content.", method: "GET", origin: origin12, path: "/v1/projects/{scriptId}/content", readOnly: true, scopes: projectsRead, inputSchema: schema({ scriptId: text, versionNumber: integer }, ["scriptId"]), pathParams: ["scriptId"], queryParams: { versionNumber: query("versionNumber", "number") } }),
  rest({ service: "appscript", name: "update_content", description: "Update Apps Script project files.", method: "PUT", origin: origin12, path: "/v1/projects/{scriptId}/content", readOnly: false, scopes: projectsWrite, inputSchema: schema({ scriptId: text, files: { type: "array", items: object } }, ["scriptId", "files"]), pathParams: ["scriptId"], bodyParams: ["files"] }),
  rest({ service: "appscript", name: "list_versions", description: "List Apps Script project versions.", method: "GET", origin: origin12, path: "/v1/projects/{scriptId}/versions", readOnly: true, scopes: projectsRead, inputSchema: schema({ scriptId: text, pageSize: integer, pageToken: text }, ["scriptId"]), pathParams: ["scriptId"], queryParams: page5 }),
  rest({ service: "appscript", name: "create_version", description: "Create an Apps Script project version.", method: "POST", origin: origin12, path: "/v1/projects/{scriptId}/versions", readOnly: false, scopes: projectsWrite, inputSchema: schema({ scriptId: text, description: text }, ["scriptId"]), pathParams: ["scriptId"], bodyParams: ["description"] }),
  rest({ service: "appscript", name: "list_deployments", description: "List Apps Script project deployments.", method: "GET", origin: origin12, path: "/v1/projects/{scriptId}/deployments", readOnly: true, scopes: deploymentsRead, inputSchema: schema({ scriptId: text, pageSize: integer, pageToken: text }, ["scriptId"]), pathParams: ["scriptId"], queryParams: page5 }),
  rest({ service: "appscript", name: "create_deployment", description: "Create an Apps Script deployment.", method: "POST", origin: origin12, path: "/v1/projects/{scriptId}/deployments", readOnly: false, scopes: deploymentsWrite, inputSchema: schema({ scriptId: text, versionNumber: integer, description: text, manifestFileName: text }, ["scriptId", "versionNumber"]), pathParams: ["scriptId"], bodyParams: ["versionNumber", "description", "manifestFileName"] }),
  rest({ service: "appscript", name: "run_function", description: "Run a function only in a same-project deployment enabled for API execution.", method: "POST", origin: origin12, path: "/v1/scripts/{deploymentId}:run", readOnly: false, scopes: run, inputSchema: schema({ deploymentId: text, function: text, parameters: { type: "array", items: {} }, devMode: flag }, ["deploymentId", "function"]), pathParams: ["deploymentId"], bodyParams: ["function", "parameters", "devMode"] })
];

// src/operations/universal.ts
var universalOperations = [
  local("universal", "search", "Search across Gmail, Drive, Calendar, and Chat using bounded local aggregation.", schema({ query: text, products: strings, pageSize: integer, spaceLimit: integer }, ["query"]), [scope("gmail.readonly"), scope("drive.readonly"), scope("calendar.events.readonly"), scope("chat.spaces.readonly"), scope("chat.messages.readonly")])
];

// src/operations/index.ts
var operations = {
  gmail: gmailOperations,
  drive: driveOperations,
  calendar: calendarOperations,
  people: peopleOperations,
  docs: docsOperations,
  sheets: sheetsOperations,
  slides: slidesOperations,
  chat: chatOperations,
  classroom: classroomOperations,
  tasks: tasksOperations,
  forms: formsOperations,
  appscript: appscriptOperations,
  universal: universalOperations
};
function operationsFor(service) {
  return operations[service];
}
function operationFor(service, name) {
  const operation = operations[service].find((candidate) => candidate.name === name);
  if (!operation) throw new WorkspaceError("TOOL_NOT_FOUND", `Google API tool not found on ${service}: ${name}`);
  return operation;
}

// src/catalog.ts
var SERVICE_NAMES = [
  "gmail",
  "drive",
  "calendar",
  "people",
  "docs",
  "sheets",
  "slides",
  "chat",
  "classroom",
  "tasks",
  "forms",
  "appscript",
  "universal"
];
var scope2 = (name) => `https://www.googleapis.com/auth/${name}`;
var universalScopes = {
  gmail: scope2("gmail.readonly"),
  drive: scope2("drive.readonly"),
  calendar: scope2("calendar.events.readonly"),
  chat: scope2("chat.messages.readonly")
};
var UNIVERSAL_PRODUCTS = ["gmail", "drive", "calendar", "chat"];
var services = {
  gmail: {
    name: "gmail",
    origins: ["https://gmail.googleapis.com"],
    writeAvailable: true,
    readScopes: [scope2("gmail.readonly")],
    writeScopes: [scope2("gmail.compose"), scope2("gmail.modify"), scope2("gmail.send")],
    documentation: "https://developers.google.com/gmail/api/reference/rest"
  },
  drive: {
    name: "drive",
    origins: ["https://www.googleapis.com"],
    writeAvailable: true,
    readScopes: [scope2("drive.readonly")],
    writeScopes: [scope2("drive.file")],
    documentation: "https://developers.google.com/drive/api/reference/rest/v3"
  },
  calendar: {
    name: "calendar",
    origins: ["https://www.googleapis.com"],
    writeAvailable: true,
    readScopes: [scope2("calendar.calendarlist.readonly"), scope2("calendar.events.freebusy"), scope2("calendar.events.readonly")],
    writeScopes: [scope2("calendar.events")],
    documentation: "https://developers.google.com/calendar/api/v3/reference"
  },
  people: {
    name: "people",
    origins: ["https://people.googleapis.com"],
    writeAvailable: false,
    readScopes: [scope2("userinfo.profile"), scope2("contacts.readonly")],
    writeScopes: [],
    documentation: "https://developers.google.com/people/api/rest"
  },
  docs: {
    name: "docs",
    origins: ["https://docs.googleapis.com"],
    writeAvailable: true,
    readScopes: [scope2("documents.readonly"), scope2("drive.readonly")],
    writeScopes: [scope2("documents"), scope2("drive.file")],
    documentation: "https://developers.google.com/docs/api/reference/rest"
  },
  sheets: {
    name: "sheets",
    origins: ["https://sheets.googleapis.com"],
    writeAvailable: true,
    readScopes: [scope2("spreadsheets.readonly"), scope2("drive.readonly")],
    writeScopes: [scope2("spreadsheets"), scope2("drive.file")],
    documentation: "https://developers.google.com/sheets/api/reference/rest"
  },
  slides: {
    name: "slides",
    origins: ["https://slides.googleapis.com"],
    writeAvailable: true,
    readScopes: [scope2("presentations.readonly"), scope2("drive.readonly")],
    writeScopes: [scope2("presentations"), scope2("drive.file")],
    documentation: "https://developers.google.com/slides/api/reference/rest"
  },
  chat: {
    name: "chat",
    origins: ["https://chat.googleapis.com"],
    writeAvailable: true,
    readScopes: [scope2("chat.spaces.readonly"), scope2("chat.memberships.readonly"), scope2("chat.messages.readonly")],
    writeScopes: [scope2("chat.messages.create")],
    documentation: "https://developers.google.com/chat/api/reference/rest"
  },
  classroom: {
    name: "classroom",
    origins: ["https://classroom.googleapis.com"],
    writeAvailable: true,
    readScopes: [scope2("classroom.courses.readonly"), scope2("classroom.rosters.readonly"), scope2("classroom.student-submissions.students.readonly"), scope2("classroom.coursework.students.readonly"), scope2("classroom.courseworkmaterials.readonly"), scope2("classroom.announcements.readonly"), scope2("classroom.topics.readonly"), scope2("classroom.guardianlinks.students.readonly")],
    writeScopes: [scope2("classroom.announcements"), scope2("classroom.coursework.students"), scope2("classroom.courseworkmaterials"), scope2("classroom.topics")],
    documentation: "https://developers.google.com/classroom/reference/rest"
  },
  tasks: {
    name: "tasks",
    origins: ["https://tasks.googleapis.com"],
    writeAvailable: true,
    readScopes: [scope2("tasks.readonly")],
    writeScopes: [scope2("tasks")],
    documentation: "https://developers.google.com/tasks/reference/rest"
  },
  forms: {
    name: "forms",
    origins: ["https://forms.googleapis.com"],
    writeAvailable: true,
    readScopes: [scope2("forms.body.readonly"), scope2("forms.responses.readonly")],
    writeScopes: [scope2("forms.body")],
    documentation: "https://developers.google.com/forms/api/reference/rest"
  },
  appscript: {
    name: "appscript",
    origins: ["https://script.googleapis.com"],
    writeAvailable: true,
    readScopes: [scope2("script.projects.readonly"), scope2("script.deployments.readonly")],
    writeScopes: [scope2("script.projects"), scope2("script.deployments"), scope2("script.scriptapp")],
    documentation: "https://developers.google.com/apps-script/api/reference/rest"
  },
  universal: {
    name: "universal",
    origins: ["local"],
    writeAvailable: false,
    readScopes: [...Object.values(universalScopes), scope2("chat.spaces.readonly")],
    writeScopes: [],
    documentation: "https://developers.google.com/workspace"
  }
};
function listServices() {
  return SERVICE_NAMES.map((name) => services[name]);
}
function getService(name) {
  if (SERVICE_NAMES.includes(name)) return services[name];
  throw new WorkspaceError("UNSUPPORTED_SERVICE", `Unsupported Google API service: ${name}. Available: ${SERVICE_NAMES.join(", ")}`);
}
function scopesFor(selection, options = {}) {
  if (selection.length === 0) throw new WorkspaceError("EMPTY_SELECTION", "Select at least one Google service.");
  const scopes = /* @__PURE__ */ new Set();
  for (const item of selection) {
    const service = getService(item.service);
    const readScopes = service.name === "universal" && options.universalProducts ? options.universalProducts.map((product) => universalScopes[product]) : service.readScopes;
    for (const value of readScopes) scopes.add(value);
    if (service.name === "people" && options.directoryAdmin) scopes.add(scope2("directory.readonly"));
    if (item.write) {
      if (!service.writeAvailable) throw new WorkspaceError("READ_ONLY_SERVICE", `${service.name} is read-only in this skill.`);
      for (const value of service.writeScopes) scopes.add(value);
    }
  }
  return [...scopes].sort();
}
function listOperations(service) {
  return operationsFor(service);
}
function getOperation(service, name) {
  return operationFor(service, name);
}

// src/request.ts
var MAX_BODY_BYTES = 1e6;
function invalid(name, expectation) {
  throw new WorkspaceError("INVALID_ARGUMENT", `${name} must be ${expectation}.`);
}
function schemaProperties(operation) {
  const properties = operation.inputSchema.properties;
  return properties !== null && typeof properties === "object" && !Array.isArray(properties) ? properties : {};
}
function schemaType(properties, name) {
  const property = properties[name];
  if (property === null || typeof property !== "object" || Array.isArray(property)) return void 0;
  const type = property.type;
  return typeof type === "string" ? type : void 0;
}
function requiredFields(operation) {
  const required2 = operation.inputSchema.required;
  const fields = Array.isArray(required2) ? required2.filter((value) => typeof value === "string") : [];
  return /* @__PURE__ */ new Set([...fields, ...Object.entries(operation.queryParams).filter(([, param]) => param.required).map(([name]) => name)]);
}
function validateJsonValue(name, value, type) {
  if (value === null) invalid(name, "non-null");
  if (type === "string" && typeof value !== "string") invalid(name, "a string");
  if ((type === "number" || type === "integer") && (typeof value !== "number" || !Number.isFinite(value))) invalid(name, "a finite number");
  if (type === "boolean" && typeof value !== "boolean") invalid(name, "a boolean");
  if (type === "array" && !Array.isArray(value)) invalid(name, "an array");
  if (type === "object" && (typeof value !== "object" || value === null || Array.isArray(value))) invalid(name, "an object");
}
function validateQueryValue(name, value, param) {
  if (param.type === "stringArray") {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) invalid(name, "an array of strings");
    return;
  }
  if (param.type === "string" && typeof value !== "string") invalid(name, "a string");
  if (param.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) invalid(name, "a finite number");
  if (param.type === "boolean" && typeof value !== "boolean") invalid(name, "a boolean");
}
function appendQuery(search, name, value, param) {
  validateQueryValue(name, value, param);
  if (param.type === "stringArray") {
    const values2 = value;
    if (param.join === ",") search.append(param.wireName, values2.join(","));
    else for (const item of values2) search.append(param.wireName, item);
    return;
  }
  search.append(param.wireName, String(value));
}
function jsonBody(operation, args, properties) {
  const body = {};
  for (const name of operation.bodyParams) {
    const value = args[name];
    if (value === void 0) continue;
    validateJsonValue(name, value, schemaType(properties, name));
    body[name] = value;
  }
  return JSON.stringify(body);
}
function multipartBody(args) {
  const metadata2 = args.metadata ?? {};
  validateJsonValue("metadata", metadata2, "object");
  const encoded = args.contentBase64;
  if (encoded !== void 0) validateJsonValue("contentBase64", encoded, "string");
  const mimeType = args.mimeType ?? "application/octet-stream";
  validateJsonValue("mimeType", mimeType, "string");
  const boundary = "google-workspace-api-boundary";
  const content = encoded ?? "";
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata2),
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    "Content-Transfer-Encoding: base64",
    "",
    content,
    `--${boundary}--`,
    ""
  ].join("\r\n");
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}
function prepareRequest(operation, args) {
  if (operation.kind === "local") throw new WorkspaceError("LOCAL_OPERATION", `${operation.service}.${operation.name} is a local operation.`);
  const properties = schemaProperties(operation);
  const allowed = /* @__PURE__ */ new Set([...operation.pathParams, ...Object.keys(operation.queryParams), ...operation.bodyParams]);
  for (const name of Object.keys(args)) {
    if (!allowed.has(name)) throw new WorkspaceError("INVALID_ARGUMENT", `Unknown argument for ${operation.name}: ${name}`);
    if (args[name] === null) invalid(name, "non-null");
  }
  for (const name of requiredFields(operation)) {
    if (args[name] === void 0) throw new WorkspaceError("INVALID_ARGUMENT", `Missing required argument for ${operation.name}: ${name}`);
  }
  const path7 = operation.path.replace(/\{([^}]+)\}/g, (_match, name) => {
    if (!operation.pathParams.includes(name)) throw new WorkspaceError("INVALID_OPERATION", `Undeclared path parameter: ${name}`);
    const value = args[name];
    if (typeof value !== "string" && typeof value !== "number") invalid(name, "a string or number");
    return encodeURIComponent(String(value));
  });
  const url = new URL(path7, operation.origin);
  if (url.origin !== operation.origin) throw new WorkspaceError("INVALID_OPERATION", "Operation origin mismatch.");
  for (const [name, param] of Object.entries(operation.queryParams)) {
    const value = args[name] ?? param.defaultValue;
    if (value !== void 0) appendQuery(url.searchParams, name, value, param);
  }
  const headers = { accept: "application/json" };
  if (operation.bodyKind === "none") return { url: url.toString(), method: operation.method, headers };
  if (operation.bodyKind === "json") {
    const body = jsonBody(operation, args, properties);
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new WorkspaceError("ARGS_TOO_LARGE", "Request body must not exceed 1 MB.");
    return { url: url.toString(), method: operation.method, headers: { ...headers, "content-type": "application/json" }, body };
  }
  const multipart = multipartBody(args);
  if (Buffer.byteLength(multipart.body) > MAX_BODY_BYTES) throw new WorkspaceError("ARGS_TOO_LARGE", "Request body must not exceed 1 MB.");
  return { url: url.toString(), method: operation.method, headers: { ...headers, "content-type": multipart.contentType }, body: multipart.body };
}

// src/api-client.ts
function isAmbiguous(error) {
  if (error instanceof ApiError) return error.status === 408 || error.status === 429 || error.status >= 500;
  return error instanceof TypeError || error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}
async function readLimitedText(response, limit) {
  if (!response.body) return "";
  const decoder = new TextDecoder();
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > limit) throw new WorkspaceError("RESPONSE_TOO_LARGE", `Response is too large (limit ${limit} bytes).`);
    chunks.push(decoder.decode(chunk, { stream: true }));
  }
  chunks.push(decoder.decode());
  return chunks.join("");
}
function googleMessage(body, status) {
  try {
    const parsed = JSON.parse(body);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      const error = parsed.error;
      if (error !== null && typeof error === "object" && !Array.isArray(error)) {
        const message = error.message;
        if (typeof message === "string") return message.slice(0, 500);
      }
    }
  } catch {
  }
  return `Google API request failed with HTTP ${status}.`;
}
function parseJson(body) {
  if (!body.trim()) return {};
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}
var GoogleApiClient = class {
  getAccessToken;
  refreshAccessToken;
  fetchImpl;
  resultStore;
  timeoutMs;
  maxJsonBytes;
  maxBinaryBytes;
  constructor(options) {
    this.getAccessToken = options.getAccessToken;
    this.refreshAccessToken = options.refreshAccessToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.resultStore = options.resultStore;
    this.timeoutMs = options.timeoutMs ?? 45e3;
    this.maxJsonBytes = options.maxJsonBytes ?? 5e6;
    this.maxBinaryBytes = options.maxBinaryBytes ?? 1e8;
  }
  async invoke(service, name, args, mutation) {
    const operation = getOperation(service, name);
    if (operation.kind === "local") throw new WorkspaceError("LOCAL_OPERATION", `${service}.${name} requires local dispatch.`);
    if (mutation && operation.readOnly) throw new WorkspaceError("READ_ONLY_REQUIRED", `${name} is read-only. Use call.`);
    if (!mutation && !operation.readOnly) throw new WorkspaceError("MUTATION_REQUIRED", `${name} is a mutation. Use mutate after user confirmation.`);
    const request = prepareRequest(operation, args);
    const signal = AbortSignal.timeout(this.timeoutMs);
    let token = await this.getAccessToken(service, signal);
    let refreshed = false;
    let dispatched = false;
    try {
      while (true) {
        dispatched = true;
        const response = await this.fetchImpl(request.url, {
          method: request.method,
          headers: { ...request.headers, authorization: `Bearer ${token}` },
          ...request.body !== void 0 ? { body: request.body } : {},
          redirect: "error",
          signal
        });
        if (response.status === 401 && !mutation && !refreshed && this.refreshAccessToken) {
          token = await this.refreshAccessToken(service, signal);
          refreshed = true;
          continue;
        }
        if (!response.ok) {
          const body = await readLimitedText(response, 65536);
          throw new ApiError(response.status, googleMessage(body, response.status));
        }
        if (operation.binaryResponse) {
          if (!this.resultStore) throw new WorkspaceError("RESULT_STORE_REQUIRED", "Binary results require a result store.");
          const file = await this.resultStore.saveStream(response.body ?? new ReadableStream({ start: (controller) => controller.close() }), response.headers.get("content-type") || "application/octet-stream", this.maxBinaryBytes);
          return { content: "Binary result saved.", file };
        }
        return parseJson(await readLimitedText(response, this.maxJsonBytes));
      }
    } catch (error) {
      if (mutation && dispatched && isAmbiguous(error)) {
        return { status: "unknown", mayHaveCompleted: true, error: { code: "CALL_UNKNOWN", message: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500) } };
      }
      throw error;
    }
  }
};

// src/config.ts
var import_node_fs = require("node:fs");
var import_node_os = __toESM(require("node:os"));
var import_node_path = __toESM(require("node:path"));
function required(value, name) {
  const trimmed = value?.trim();
  if (!trimmed) throw new WorkspaceError("MISSING_CONFIG", `Missing ${name}. See references/setup.md.`);
  return trimmed;
}
function validateRedirectUri(value) {
  const redirect = value || "http://localhost:8080/callback";
  let url;
  try {
    url = new URL(redirect);
  } catch {
    throw new WorkspaceError("INVALID_REDIRECT", "GOOGLE_OAUTH_REDIRECT_URI must be an absolute loopback HTTP URL.");
  }
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "http:" || !loopback || !url.port || url.username || url.password || url.search || url.hash) {
    throw new WorkspaceError("INVALID_REDIRECT", "OAuth redirect must be an exact HTTP loopback URI with an explicit port and no query or fragment.");
  }
  return url.href;
}
function resolveHomeDir(env = process.env) {
  return env.WORKSPACE_API_HOME?.trim() || import_node_path.default.join(import_node_os.default.homedir(), ".google-workspace-api");
}
async function loadOAuthConfig(env = process.env) {
  const clientId = required(env.GOOGLE_OAUTH_CLIENT_ID, "GOOGLE_OAUTH_CLIENT_ID");
  let clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const secretFile = env.GOOGLE_OAUTH_CLIENT_SECRET_FILE?.trim();
  if (!clientSecret && secretFile) {
    const raw = (await import_node_fs.promises.readFile(secretFile, "utf8")).trim();
    if (raw.startsWith("{")) {
      try {
        const parsed = JSON.parse(raw);
        clientSecret = parsed.web?.client_secret || parsed.installed?.client_secret || "";
      } catch {
        throw new WorkspaceError("INVALID_SECRET_FILE", "The OAuth client secret file contains invalid JSON.");
      }
    } else {
      clientSecret = raw;
    }
  }
  if (!clientSecret) {
    throw new WorkspaceError("MISSING_CONFIG", "Missing GOOGLE_OAUTH_CLIENT_SECRET or GOOGLE_OAUTH_CLIENT_SECRET_FILE. See references/setup.md.");
  }
  return {
    clientId,
    clientSecret,
    redirectUri: validateRedirectUri(env.GOOGLE_OAUTH_REDIRECT_URI),
    homeDir: resolveHomeDir(env)
  };
}
function assertNodeVersion(version = process.versions.node) {
  const [major, minor] = version.split(".").map(Number);
  if (major !== 24 || minor !== 22) {
    throw new WorkspaceError("NODE_VERSION", `Node 24.22.x is required. Current version is ${version}.`);
  }
}
function parseJsonObject(input) {
  let value;
  try {
    value = JSON.parse(input);
  } catch {
    throw new WorkspaceError("INVALID_JSON", "Tool arguments must be valid JSON.");
  }
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new WorkspaceError("INVALID_JSON", "Tool arguments must be a JSON object.");
  }
  return value;
}

// src/oauth.ts
var import_node_crypto = require("node:crypto");
var import_node_fs2 = require("node:fs");
var import_node_child_process = require("node:child_process");
var import_node_http = __toESM(require("node:http"));
var import_node_path2 = __toESM(require("node:path"));

// src/http.ts
async function postForm(url, parameters, signal) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams(parameters),
    redirect: "manual",
    signal: signal ?? null
  });
  if (!response.ok) {
    const body = await response.text();
    if (body.includes("invalid_grant")) {
      throw new WorkspaceError("AUTH_REQUIRED", "Google rejected the stored grant. Run auth again to reconnect your account.");
    }
    throw new WorkspaceError("OAUTH_HTTP", `Google OAuth request failed with HTTP ${response.status}.`);
  }
  const value = await response.json();
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new WorkspaceError("OAUTH_RESPONSE", "Google OAuth returned an invalid response.");
  }
  return value;
}

// src/oauth.ts
var GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
var GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
function openBrowser(url) {
  process.stderr.write(`Open this URL to authenticate: ${url}
`);
  const command = process.platform === "win32" ? import_node_path2.default.join(process.env.SystemRoot || "C:\\Windows", "System32", "rundll32.exe") : process.platform === "darwin" ? "/usr/bin/open" : "/usr/bin/xdg-open";
  if (!(0, import_node_fs2.existsSync)(command)) throw new WorkspaceError("BROWSER_UNAVAILABLE", `Browser launcher not found: ${command}`);
  const args = process.platform === "win32" ? ["url.dll,FileProtocolHandler", url] : [url];
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/(SECRET|TOKEN|CREDENTIAL|PASSWORD|API_KEY)/i.test(key)));
  const child = (0, import_node_child_process.spawn)(command, args, { detached: true, stdio: "ignore", windowsHide: true, env });
  child.on("error", (error) => process.stderr.write(`Browser launcher failed: ${error.message}
`));
  child.unref();
  return Promise.resolve();
}
function tokenString(value, name) {
  if (typeof value !== "string" || !value) throw new WorkspaceError("OAUTH_RESPONSE", `Google OAuth response is missing ${name.replace(/_/g, " ")}.`);
  return value;
}
var WorkspaceOAuth = class {
  constructor(config, store2) {
    this.config = config;
    this.store = store2;
  }
  config;
  store;
  async authorize(options) {
    const state = (0, import_node_crypto.randomBytes)(32).toString("base64url");
    const verifier = (0, import_node_crypto.randomBytes)(64).toString("base64url");
    const challenge = (0, import_node_crypto.createHash)("sha256").update(verifier).digest("base64url");
    const available = options.selection ? options.selection.map((item) => item.service) : void 0;
    const services2 = listServices().filter((service) => !available || available.includes(service.name));
    const selection = services2.map((service) => ({
      service: service.name,
      write: service.writeAvailable && (options.selection?.find((item) => item.service === service.name)?.write ?? true)
    }));
    const open = options.openBrowser || openBrowser;
    const tokenEndpoint = options.tokenEndpoint || GOOGLE_TOKEN;
    const authorizationUrl = new URL(GOOGLE_AUTH);
    authorizationUrl.searchParams.set("client_id", this.config.clientId);
    authorizationUrl.searchParams.set("redirect_uri", this.config.redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", scopesFor(selection, options).join(" "));
    authorizationUrl.searchParams.set("access_type", "offline");
    authorizationUrl.searchParams.set("prompt", "consent");
    authorizationUrl.searchParams.set("include_granted_scopes", "true");
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("code_challenge", challenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
    let resolveResult = () => void 0;
    let rejectResult = () => void 0;
    const completed = new Promise((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    void completed.catch(() => void 0);
    const server = import_node_http.default.createServer((request, response) => {
      void (async () => {
        response.setHeader("connection", "close");
        const host2 = request.headers.host || "";
        if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host2)) {
          response.writeHead(403).end("Forbidden");
          return;
        }
        const callback = new URL(request.url || "/", "http://localhost");
        if (request.method === "GET" && callback.pathname === new URL(this.config.redirectUri).pathname) {
          if (callback.searchParams.get("state") !== state) {
            response.writeHead(400, { "content-type": "text/plain; charset=utf-8", connection: "close" });
            response.end("Invalid authentication state.");
            return;
          }
          const code = callback.searchParams.get("code");
          if (!code) {
            response.writeHead(400).end("Missing authorization code.");
            return;
          }
          try {
            const token = await postForm(tokenEndpoint, {
              code,
              client_id: this.config.clientId,
              client_secret: this.config.clientSecret,
              redirect_uri: this.config.redirectUri,
              grant_type: "authorization_code",
              code_verifier: verifier
            });
            const accessToken = tokenString(token.access_token, "access_token");
            const refreshToken = tokenString(token.refresh_token, "refresh_token");
            const expiresIn = typeof token.expires_in === "number" ? token.expires_in : 3600;
            const requestedScopes = scopesFor(selection, options);
            const granted = new Set(typeof token.scope === "string" ? token.scope.split(/\s+/) : requestedScopes);
            const statuses = [];
            for (const item of selection) {
              const required2 = scopesFor([item], options);
              const grantedScopes = required2.filter((scope3) => granted.has(scope3));
              const service = item.service;
              const readRequired = scopesFor([{ service, write: false }], options);
              const status = readRequired.every((scope3) => granted.has(scope3)) ? required2.every((scope3) => granted.has(scope3)) ? "authorized" : "partial" : "unavailable";
              if (grantedScopes.length > 0) {
                await this.store.write(service, {
                  account: "current-user",
                  clientId: this.config.clientId,
                  accessToken,
                  refreshToken,
                  expiresAt: Date.now() + expiresIn * 1e3,
                  grantedScopes
                });
              } else {
                await this.store.remove(service);
              }
              statuses.push({ service, status, grantedScopes });
            }
            response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": "default-src 'none'" });
            response.end('<!doctype html><html lang="en"><title>Authentication complete</title><body>Authentication complete. You can close this page.</body></html>');
            resolveResult(statuses);
          } catch (error) {
            response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
            response.end("Authentication failed. Return to the terminal for details.");
            rejectResult(error instanceof Error ? error : new Error(String(error)));
          }
          return;
        }
        response.writeHead(404).end("Not found");
      })().catch((error) => {
        if (!response.headersSent) response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        if (!response.writableEnded) response.end(error instanceof Error ? error.message : "Authentication failed.");
        rejectResult(error instanceof Error ? error : new Error(String(error)));
      });
    });
    const address = new URL(this.config.redirectUri);
    const host = address.hostname === "[::1]" ? "::1" : address.hostname === "localhost" ? "127.0.0.1" : address.hostname;
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(Number(address.port), host, resolve);
    });
    const timeout = setTimeout(() => rejectResult(new WorkspaceError("OAUTH_TIMEOUT", "Authentication timed out. Run auth again.")), 3e5);
    try {
      await open(authorizationUrl.toString());
      return await completed;
    } finally {
      clearTimeout(timeout);
      await new Promise((resolve) => server.close(() => resolve()));
    }
  }
  async getValidAccessToken(service, force = false, signal) {
    return this.store.refreshGrant(service, force, async (record) => {
      const token = await postForm(GOOGLE_TOKEN, {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: record.refreshToken,
        grant_type: "refresh_token"
      }, signal);
      return {
        accessToken: tokenString(token.access_token, "access_token"),
        refreshToken: typeof token.refresh_token === "string" ? token.refresh_token : "",
        expiresAt: Date.now() + (typeof token.expires_in === "number" ? token.expires_in : 3600) * 1e3
      };
    });
  }
};

// src/output.ts
var MAX_ENVELOPE_BYTES = 65535;
function redactError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/Bearer\s+\S+/gi, "Bearer REDACTED").replace(/ya29\.[A-Za-z0-9._-]+/g, "REDACTED").replace(/GOCSPX-[A-Za-z0-9._-]+/g, "REDACTED").replace(/1\/\/[A-Za-z0-9._-]+/g, "REDACTED").replace(/(refresh_token|access_token|client_secret|refreshToken|accessToken|clientSecret|authorizationCode)(["']?\s*[:=]\s*["']?)([^"',\s}]+)/gi, "$1$2REDACTED").replace(/([?&]code=)[^&\s]+/gi, "$1REDACTED");
}
function makeEnvelope(data) {
  const status = data.status || (data.error ? "error" : "ok");
  return {
    v: 1,
    ok: status === "ok",
    status,
    mayHaveCompleted: data.mayHaveCompleted ?? status === "unknown",
    ...data
  };
}
function preview(value, limit = 2048) {
  const text2 = (typeof value === "string" ? value : JSON.stringify(value)) ?? String(value);
  const buffer = Buffer.from(text2, "utf8");
  return buffer.length <= limit ? text2 : buffer.subarray(0, limit).toString("utf8");
}
function sanitizeValue(value) {
  if (typeof value === "string") return redactError(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value !== null && typeof value === "object") {
    if (Buffer.isBuffer(value)) return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeValue(item)]));
  }
  return value;
}
function capEnvelope(envelope) {
  if (Buffer.byteLength(JSON.stringify(envelope), "utf8") <= MAX_ENVELOPE_BYTES) return envelope;
  const file = envelope.file ? { ...envelope.file, mimeType: preview(envelope.file.mimeType, 256) } : void 0;
  const compact = makeEnvelope({
    service: typeof envelope.service === "string" ? preview(envelope.service, 128) : void 0,
    tool: typeof envelope.tool === "string" ? preview(envelope.tool, 256) : void 0,
    status: envelope.status,
    mayHaveCompleted: envelope.mayHaveCompleted,
    content: preview(envelope.content),
    size: envelope.size,
    truncated: true,
    file,
    error: envelope.error ? { code: preview(envelope.error.code, 128), message: preview(envelope.error.message) } : void 0
  });
  if (Buffer.byteLength(JSON.stringify(compact), "utf8") <= MAX_ENVELOPE_BYTES) return compact;
  return makeEnvelope({
    status: envelope.status,
    mayHaveCompleted: envelope.mayHaveCompleted,
    content: file ? "Result saved." : "Response exceeded the output limit.",
    truncated: true,
    file: file ? { ...file, path: preview(file.path, 1024) } : void 0
  });
}
function serializeEnvelope(envelope) {
  return `${JSON.stringify(capEnvelope(sanitizeValue(envelope)))}
`;
}
function embeddedResources(value) {
  if (value === null || typeof value !== "object") return [];
  const result = value;
  if (!Array.isArray(result.content)) return [];
  const resources = [];
  for (const block of result.content) {
    if (block === null || typeof block !== "object") continue;
    const resource = block.resource;
    if (resource === null || typeof resource !== "object") continue;
    const candidate = resource;
    if (typeof candidate.blob === "string") {
      resources.push({
        bytes: Buffer.from(candidate.blob, "base64"),
        mimeType: typeof candidate.mimeType === "string" ? candidate.mimeType : "application/octet-stream"
      });
    }
  }
  return resources;
}
async function writeBoundedResult(data, store2) {
  const embedded = embeddedResources(data.content);
  if (embedded.length > 0) {
    const files = [];
    for (const resource of embedded) files.push(await store2.saveBytes(resource.bytes, resource.mimeType));
    const original = data.content;
    const remaining = original.content.filter((block) => block.resource?.blob === void 0);
    if (embedded.length === 1 && files[0]) {
      if (remaining.length === 0) {
        return capEnvelope(makeEnvelope({ service: data.service, tool: data.tool, content: "Binary result saved.", size: files[0].size, truncated: false, file: files[0] }));
      }
      return capEnvelope(makeEnvelope({ service: data.service, tool: data.tool, content: remaining, files, size: files.reduce((total, file2) => total + file2.size, 0), truncated: false }));
    }
    return capEnvelope(makeEnvelope({ service: data.service, tool: data.tool, content: remaining, files, size: files.reduce((total, file2) => total + file2.size, 0), truncated: false }));
  }
  if (Buffer.isBuffer(data.content)) {
    const file2 = await store2.saveBytes(data.content, data.mimeType || "application/octet-stream");
    return capEnvelope(makeEnvelope({ service: data.service, tool: data.tool, content: "Binary result saved.", size: file2.size, truncated: false, file: file2 }));
  }
  const serialized = typeof data.content === "string" ? data.content : JSON.stringify(data.content);
  const size = Buffer.byteLength(serialized, "utf8");
  const candidate = makeEnvelope({ service: data.service, tool: data.tool, content: data.content, size, truncated: false });
  if (Buffer.byteLength(JSON.stringify(candidate), "utf8") <= MAX_ENVELOPE_BYTES) return candidate;
  const mimeType = data.mimeType || (typeof data.content === "string" ? "text/plain; charset=utf-8" : "application/json");
  const file = await store2.saveText(serialized, mimeType);
  return capEnvelope(makeEnvelope({ service: data.service, tool: data.tool, content: preview(data.content), size, truncated: true, file }));
}

// src/result-store.ts
var import_node_crypto2 = require("node:crypto");
var import_node_fs4 = require("node:fs");
var import_node_path4 = __toESM(require("node:path"));

// src/secure-fs.ts
var import_node_child_process2 = require("node:child_process");
var import_node_fs3 = require("node:fs");
var import_node_path3 = __toESM(require("node:path"));
var import_promises = require("node:timers/promises");
var import_node_util = require("node:util");
var execFileAsync = (0, import_node_util.promisify)(import_node_child_process2.execFile);
var verifiedDirectories = /* @__PURE__ */ new Set();
async function protectWindows(target, directory2) {
  const systemRoot = process.env.SystemRoot || "C:\\Windows";
  const whoamiExe = import_node_path3.default.join(systemRoot, "System32", "whoami.exe");
  const icaclsExe = import_node_path3.default.join(systemRoot, "System32", "icacls.exe");
  const powershellExe = import_node_path3.default.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const { stdout: whoami } = await execFileAsync(whoamiExe, [], { windowsHide: true });
  const principal = whoami.trim();
  if (!principal) throw new WorkspaceError("SECURE_STORAGE", "Cannot determine the Windows account for token protection.");
  const { stdout: userCsv } = await execFileAsync(whoamiExe, ["/user", "/fo", "csv"], { windowsHide: true, env: { ...process.env, MSYS_NO_PATHCONV: "1" } });
  const sid = userCsv.match(/S-\d+(?:-\d+)+/i)?.[0];
  if (!sid) throw new WorkspaceError("SECURE_STORAGE", "Cannot determine the Windows SID for token protection.");
  const ownerOnly = async () => {
    const literalPath = target.replace(/'/g, "''");
    const command = `(Get-Acl -LiteralPath '${literalPath}').Access | ForEach-Object { $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value }`;
    const { stdout } = await execFileAsync(powershellExe, ["-NoProfile", "-Command", command], { windowsHide: true });
    const entries = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return entries.length > 0 && entries.every((entry) => entry.toUpperCase() === sid.toUpperCase());
  };
  if (await ownerOnly()) return;
  const grant = directory2 ? `${principal}:(OI)(CI)F` : `${principal}:F`;
  await execFileAsync(icaclsExe, [target, "/reset"], { windowsHide: true });
  await execFileAsync(icaclsExe, [target, "/inheritance:r", "/grant:r", grant], { windowsHide: true });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await ownerOnly()) return;
    await (0, import_promises.setTimeout)(20);
  }
  throw new WorkspaceError("SECURE_STORAGE", `Windows token storage ACL is not restricted to the current account: ${target}`);
}
async function secureDirectory(directory2) {
  await import_node_fs3.promises.mkdir(directory2, { recursive: true, mode: 448 });
  if (process.platform === "win32") {
    if (verifiedDirectories.has(directory2)) return;
    await protectWindows(directory2, true);
    verifiedDirectories.add(directory2);
  } else {
    await import_node_fs3.promises.chmod(directory2, 448);
  }
}
async function secureFile(file) {
  if (process.platform === "win32") {
    if (verifiedDirectories.has(import_node_path3.default.dirname(file))) return;
    await protectWindows(file, false);
  } else {
    await import_node_fs3.promises.chmod(file, 384);
  }
}
async function atomicWriteSecure(file, contents) {
  await secureDirectory(import_node_path3.default.dirname(file));
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await import_node_fs3.promises.writeFile(temporary, contents, { encoding: "utf8", mode: 384, flag: "wx" });
  try {
    await secureFile(temporary);
    await import_node_fs3.promises.rename(temporary, file);
    await secureFile(file);
  } catch (error) {
    await import_node_fs3.promises.rm(temporary, { force: true });
    throw error;
  }
}

// src/result-store.ts
var ResultStore = class {
  constructor(directory2) {
    this.directory = directory2;
  }
  directory;
  async saveText(text2, mimeType) {
    const file = import_node_path4.default.join(this.directory, `${(0, import_node_crypto2.randomUUID)()}.txt`);
    await atomicWriteSecure(file, text2);
    return { path: file, mimeType, size: Buffer.byteLength(text2, "utf8") };
  }
  async saveBytes(bytes, mimeType) {
    await secureDirectory(this.directory);
    const file = import_node_path4.default.join(this.directory, `${(0, import_node_crypto2.randomUUID)()}.bin`);
    await import_node_fs4.promises.writeFile(file, bytes, { flag: "wx", mode: 384 });
    await secureFile(file);
    return { path: file, mimeType, size: bytes.length };
  }
  async saveStream(stream, mimeType, maxBytes) {
    await secureDirectory(this.directory);
    const file = import_node_path4.default.join(this.directory, `${(0, import_node_crypto2.randomUUID)()}.bin`);
    const handle = await import_node_fs4.promises.open(file, "wx", 384);
    let size = 0;
    try {
      for await (const chunk of stream) {
        const bytes = Buffer.from(chunk);
        size += bytes.length;
        if (size > maxBytes) throw new WorkspaceError("RESPONSE_TOO_LARGE", `Binary response is too large (limit ${maxBytes} bytes).`);
        await handle.write(bytes);
      }
      await handle.close();
      await secureFile(file);
      return { path: file, mimeType, size };
    } catch (error) {
      await handle.close().catch(() => void 0);
      await import_node_fs4.promises.rm(file, { force: true });
      throw error;
    }
  }
};

// src/token-store.ts
var import_node_crypto3 = require("node:crypto");
var import_node_fs5 = require("node:fs");
var import_node_path5 = __toESM(require("node:path"));
var import_promises2 = require("node:timers/promises");
function isTokenRecord(value) {
  if (value === null || typeof value !== "object") return false;
  const candidate = value;
  return typeof candidate.account === "string" && typeof candidate.clientId === "string" && typeof candidate.accessToken === "string" && typeof candidate.refreshToken === "string" && typeof candidate.expiresAt === "number" && Array.isArray(candidate.grantedScopes) && candidate.grantedScopes.every((scope3) => typeof scope3 === "string");
}
function grantIdFor(record) {
  return (0, import_node_crypto3.createHash)("sha256").update(record.refreshToken).digest("hex");
}
var TokenStore = class {
  tokensDir;
  locksDir;
  constructor(homeDir) {
    this.tokensDir = import_node_path5.default.join(homeDir, "tokens");
    this.locksDir = import_node_path5.default.join(homeDir, "locks");
  }
  file(service) {
    return import_node_path5.default.join(this.tokensDir, `${service}.json`);
  }
  async read(service) {
    try {
      const parsed = JSON.parse(await import_node_fs5.promises.readFile(this.file(service), "utf8"));
      if (!isTokenRecord(parsed)) throw new WorkspaceError("TOKEN_INVALID", `Stored ${service} credentials are invalid. Reauthenticate.`);
      return parsed;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }
  async write(service, record) {
    await this.withLock(`client-${record.clientId}`, async () => {
      const existing = await this.read(service);
      const refreshToken = record.refreshToken || existing?.refreshToken || "";
      if (!refreshToken) throw new WorkspaceError("REFRESH_REQUIRED", `Google did not return a refresh token for ${service}. Reauthenticate with consent.`);
      await atomicWriteSecure(this.file(service), JSON.stringify({ ...record, refreshToken }, null, 2));
    });
  }
  async refreshGrant(service, force, refresh) {
    const initial = await this.read(service);
    if (!initial) throw new WorkspaceError("AUTH_REQUIRED", `Authentication required for ${service}. Run the auth command.`);
    if (!force && initial.expiresAt > Date.now() + 6e4) return initial.accessToken;
    return this.withLock(`grant-${grantIdFor(initial)}`, async () => {
      const current = await this.read(service);
      if (!current) throw new WorkspaceError("AUTH_REQUIRED", `Authentication required for ${service}. Run the auth command.`);
      if (!force && current.expiresAt > Date.now() + 6e4) return current.accessToken;
      const updated = await refresh(current);
      const statuses = await this.status();
      for (const status of statuses) {
        if (status.clientId !== current.clientId) continue;
        const existing = await this.read(status.service);
        if (!existing || grantIdFor(existing) !== grantIdFor(current)) continue;
        await atomicWriteSecure(this.file(status.service), JSON.stringify({
          ...existing,
          accessToken: updated.accessToken,
          refreshToken: updated.refreshToken || existing.refreshToken,
          expiresAt: updated.expiresAt
        }, null, 2));
      }
      return updated.accessToken;
    });
  }
  async remove(service) {
    if (service) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          await import_node_fs5.promises.rm(this.file(service), { force: true });
          return;
        } catch (error) {
          if (process.platform !== "win32" || error.code !== "EPERM" || attempt === 4) throw error;
          await (0, import_promises2.setTimeout)(20);
        }
      }
      return;
    }
    await import_node_fs5.promises.rm(this.tokensDir, { recursive: true, force: true });
  }
  async status() {
    let names;
    try {
      names = await import_node_fs5.promises.readdir(this.tokensDir);
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
    const statuses = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const service = name.slice(0, -5);
      const record = await this.read(service);
      if (record) {
        statuses.push({
          service,
          account: record.account,
          clientId: record.clientId,
          expiresAt: record.expiresAt,
          grantedScopes: record.grantedScopes
        });
      }
    }
    return statuses;
  }
  async withLock(key, operation) {
    await secureDirectory(this.locksDir);
    const lock = import_node_path5.default.join(this.locksDir, `${key}.lock`);
    const deadline = Date.now() + 1e4;
    while (true) {
      let handle;
      try {
        handle = await import_node_fs5.promises.open(lock, "wx", 384);
      } catch (error) {
        const code = error.code;
        const contention = code === "EEXIST" || process.platform === "win32" && code === "EPERM";
        if (!contention) throw error;
        try {
          const stat = await import_node_fs5.promises.stat(lock);
          if (Date.now() - stat.mtimeMs > 3e4) await import_node_fs5.promises.rm(lock, { force: true });
        } catch (statError) {
          if (statError.code !== "ENOENT") throw statError;
        }
        if (Date.now() >= deadline) throw new WorkspaceError("LOCK_TIMEOUT", `Timed out waiting for credential lock: ${key}`);
        await (0, import_promises2.setTimeout)(25);
        continue;
      }
      const nonce = (0, import_node_crypto3.randomUUID)();
      await handle.writeFile(JSON.stringify({ nonce, pid: process.pid }), "utf8");
      const heartbeat = setInterval(() => {
        void import_node_fs5.promises.utimes(lock, /* @__PURE__ */ new Date(), /* @__PURE__ */ new Date()).catch(() => void 0);
      }, 5e3);
      heartbeat.unref();
      try {
        await secureFile(lock);
        return await operation();
      } finally {
        clearInterval(heartbeat);
        await handle.close();
        try {
          const contents = await import_node_fs5.promises.readFile(lock, "utf8");
          if (contents.includes(nonce)) await import_node_fs5.promises.rm(lock, { force: true });
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
    }
  }
};

// src/cli.ts
function home(io) {
  return resolveHomeDir(io.env);
}
function store(io) {
  return io.tokenStore || new TokenStore(home(io));
}
function results(io) {
  return io.resultStore || new ResultStore(import_node_path6.default.join(home(io), "results"));
}
function emit(io, envelope, json) {
  if (json) {
    io.stdout(serializeEnvelope(envelope));
    return;
  }
  const capped = capEnvelope(envelope);
  const content = capped.content;
  const metadata2 = capped.file ? `
Result saved to ${capped.file.path} (${capped.file.mimeType}, ${capped.file.size} bytes)` : "";
  io.stdout(`${redactError(typeof content === "string" ? content : JSON.stringify(content ?? capped, null, 2))}${metadata2}
`);
}
function flag2(argv, name) {
  return argv.includes(name);
}
function option(argv, name) {
  const index = argv.findIndex((value2) => value2 === name || value2.startsWith(`${name}=`));
  if (index < 0) return void 0;
  const token = argv[index];
  if (token?.startsWith(`${name}=`)) return token.slice(name.length + 1);
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new WorkspaceError("USAGE", `Option ${name} requires a value.`);
  return value;
}
function hasInlineArgs(argv) {
  return argv.some((value) => value === "--args" || value.startsWith("--args="));
}
async function context(io) {
  if (io.api) return { api: io.api, results: results(io) };
  const config = await loadOAuthConfig(io.env);
  const oauth = io.oauth || new WorkspaceOAuth(config, store(io));
  const api = new GoogleApiClient({
    getAccessToken: (service, signal) => oauth.getValidAccessToken(service, false, signal),
    refreshAccessToken: (service, signal) => oauth.getValidAccessToken(service, true, signal),
    resultStore: results(io)
  });
  return { api, results: results(io) };
}
var MAX_ARGUMENT_BYTES = 1e6;
async function readArguments(argv, io) {
  if (hasInlineArgs(argv)) throw new WorkspaceError("ARGS_FILE_REQUIRED", "Use --args-file or stdin so Workspace content stays out of command logs.");
  const file = option(argv, "--args-file");
  if (file !== void 0) {
    if (!file) throw new WorkspaceError("USAGE", "Option --args-file requires a value.");
    const stat = await import_node_fs6.promises.stat(file);
    if (stat.size > MAX_ARGUMENT_BYTES) throw new WorkspaceError("ARGS_TOO_LARGE", "Tool arguments are too large. Keep the JSON file under 1 MB.");
    return parseJsonObject(await import_node_fs6.promises.readFile(file, "utf8"));
  }
  if (flag2(argv, "--args")) throw new WorkspaceError("ARGS_FILE_REQUIRED", "Use --args-file or stdin so Workspace content stays out of command logs.");
  const chunks = [];
  let size = 0;
  for await (const chunk of io.stdin) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_ARGUMENT_BYTES) throw new WorkspaceError("ARGS_TOO_LARGE", "Tool arguments are too large. Keep the JSON input under 1 MB.");
    chunks.push(buffer);
  }
  const input = Buffer.concat(chunks).toString("utf8").trim();
  return input ? parseJsonObject(input) : {};
}
function authSelection(argv) {
  const services2 = option(argv, "--services");
  const readOnly = flag2(argv, "--read-only");
  const selection = services2 ? services2.split(",").map((name) => ({ service: getService(name.trim()).name, write: !readOnly })) : readOnly ? listServices().map((service) => ({ service: service.name, write: false })) : void 0;
  const products = option(argv, "--universal-products")?.split(",").map((name) => {
    const product = name.trim();
    if (!UNIVERSAL_PRODUCTS.includes(product)) {
      throw new WorkspaceError("UNIVERSAL_PRODUCT", `Unsupported federated-search product: ${product}. Available: ${UNIVERSAL_PRODUCTS.join(", ")}`);
    }
    return product;
  });
  return { selection, directoryAdmin: flag2(argv, "--directory-admin"), universalProducts: products };
}
function isUnknown(value) {
  return value !== null && typeof value === "object" && value.status === "unknown";
}
function isBinary(value) {
  if (value === null || typeof value !== "object") return false;
  const file = value.file;
  return file !== null && typeof file === "object" && typeof file.path === "string";
}
async function runCli(argv, io) {
  const [command, serviceName, toolName] = argv;
  try {
    if (!command || command === "--help" || command === "help") {
      io.stdout("Commands: auth, logout, services, tools, call, mutate, auth-status\nUse --args-file for tool arguments.\n");
      return 0;
    }
    if (command === "auth") {
      if (!io.stdin.isTTY) throw new WorkspaceError("TERMINAL_REQUIRED", "Run auth in an interactive terminal.");
      const config = await loadOAuthConfig(io.env);
      const oauth = io.oauth || new WorkspaceOAuth(config, store(io));
      const result = await oauth.authorize(authSelection(argv));
      emit(io, makeEnvelope({ content: result }), flag2(argv, "--json"));
      return 0;
    }
    if (command === "logout") {
      if (!io.stdin.isTTY) throw new WorkspaceError("TERMINAL_REQUIRED", "Run logout in an interactive terminal.");
      const service = option(argv, "--service") || serviceName;
      await store(io).remove(service ? getService(service).name : void 0);
      emit(io, makeEnvelope({ content: "Local credentials removed." }), flag2(argv, "--json"));
      return 0;
    }
    if (command === "services") {
      const services2 = listServices().map((service) => ({
        name: service.name,
        origins: service.origins,
        writeAvailable: service.writeAvailable,
        documentation: service.documentation
      }));
      const authorization = await store(io).status();
      emit(io, makeEnvelope({ content: services2, authorization }), flag2(argv, "--json"));
      return 0;
    }
    if (command === "auth-status") {
      emit(io, makeEnvelope({ content: await store(io).status() }), flag2(argv, "--json"));
      return 0;
    }
    if (command === "tools") {
      if (!serviceName || serviceName.startsWith("--")) throw new WorkspaceError("USAGE", "Usage: tools <service> [--tool <name>] [--json]");
      const service = getService(serviceName).name;
      const selectedTool = option(argv, "--tool");
      const content = selectedTool ? getOperation(service, selectedTool) : listOperations(service).map((tool) => ({ name: tool.name, description: tool.description }));
      emit(io, await writeBoundedResult({ service, content }, results(io)), flag2(argv, "--json"));
      return 0;
    }
    if (command === "call" || command === "mutate") {
      if (!serviceName || !toolName) throw new WorkspaceError("USAGE", `Usage: ${command} <service> <tool> [--args-file <path>] [--json]`);
      const service = getService(serviceName).name;
      const args = await readArguments(argv, io);
      const { api } = await context(io);
      const result = await api.invoke(service, toolName, args, command === "mutate");
      if (command === "mutate" && isUnknown(result)) {
        emit(io, makeEnvelope({ service, tool: toolName, status: "unknown", mayHaveCompleted: true, content: result }), flag2(argv, "--json"));
        return 3;
      } else if (isBinary(result)) {
        emit(io, makeEnvelope({ service, tool: toolName, content: result.content, size: result.file.size, truncated: false, file: result.file }), flag2(argv, "--json"));
      } else {
        emit(io, await writeBoundedResult({ service, tool: toolName, content: result }, results(io)), flag2(argv, "--json"));
      }
      return 0;
    }
    throw new WorkspaceError("UNKNOWN_COMMAND", `Unknown command: ${command}`);
  } catch (error) {
    const code = error instanceof WorkspaceError ? error.code : error instanceof ApiError ? error.status === 401 ? "AUTH_REQUIRED" : error.status === 403 ? "PERMISSION_DENIED" : error.code : "CLI_ERROR";
    const message = redactError(error);
    io.stderr(`${message}
`);
    if (flag2(argv, "--json")) io.stdout(serializeEnvelope(makeEnvelope({ status: "error", error: { code, message } })));
    return code === "USAGE" || code === "INVALID_JSON" || code === "ARGS_FILE_REQUIRED" ? 2 : 1;
  }
}
if (require.main === module) {
  assertNodeVersion();
  runCli(process.argv.slice(2), {
    stdout: (text2) => process.stdout.write(text2),
    stderr: (text2) => process.stderr.write(text2),
    stdin: process.stdin,
    env: process.env
  }).then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    process.stderr.write(`${redactError(error)}
`);
    process.exitCode = 1;
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runCli
});
