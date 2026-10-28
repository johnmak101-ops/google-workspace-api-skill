import type { ApiOperation } from '../catalog.js';
import { integer, local, schema, scope, strings, text } from './helpers.js';

export const universalOperations: readonly ApiOperation[] = [
  local('universal', 'search', 'Search across Gmail, Drive, Calendar, and Chat using bounded local aggregation.', schema({ query: text, products: strings, pageSize: integer, spaceLimit: integer }, ['query']), [scope('gmail.readonly'), scope('drive.readonly'), scope('calendar.events.readonly'), scope('chat.spaces.readonly'), scope('chat.messages.readonly')]),
];
