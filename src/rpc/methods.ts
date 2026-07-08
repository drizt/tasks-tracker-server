// Registers Tasks Tracker JSON-RPC methods and validates incoming RPC params.

// To add a server method:
// 1. Define params/result types or reuse task repository types.
// 2. Add the method signature to ServerRpcMethods.
// 3. Add a Zod params schema and read*Params function.
// 4. Register the method in registerServerMethods.
// 5. Add RPC tests for success and invalid params.

import { JSONRPCErrorException, JSONRPCErrorCode } from 'json-rpc-2.0';
import { z } from 'zod';

import type {
  TaskArchiveParams,
  TaskChangedEvent,
  TaskCreateParams,
  TaskDeleteParams,
  TaskListParams,
  TaskRepository,
  TaskUpdateParams,
  TimeEntryChangedEvent,
  TimeEntryCreateParams,
  TimeEntryDeleteParams,
  TimeEntryListParams,
  TimeEntryUpdateParams,
} from '../tasks/types.ts';
import type { RpcConnection, ServerEventEmitter } from './rpc-connection.ts';

interface AuthHelloParams {
  clientId: string;
  protocolVersion: number;
}

interface AuthHelloResult {
  serverName: string;
  protocolVersion: number;
}

interface TaskListResult {
  tasks: Awaited<ReturnType<TaskRepository['list']>>;
}

interface TimeEntryListResult {
  timeEntries: Awaited<ReturnType<TaskRepository['listTimeEntries']>>;
}

type EmptyResult = Record<string, never>;

type ServerRpcMethods = {
  'auth.hello'(params: AuthHelloParams): AuthHelloResult;
  'tasks.list'(params: TaskListParams): Promise<TaskListResult>;
  'tasks.create'(params: TaskCreateParams): Promise<EmptyResult>;
  'tasks.update'(params: TaskUpdateParams): Promise<EmptyResult>;
  'tasks.archive'(params: TaskArchiveParams): Promise<EmptyResult>;
  'tasks.delete'(params: TaskDeleteParams): Promise<EmptyResult>;
  'timeEntries.list'(params: TimeEntryListParams): Promise<TimeEntryListResult>;
  'timeEntries.create'(params: TimeEntryCreateParams): Promise<EmptyResult>;
  'timeEntries.update'(params: TimeEntryUpdateParams): Promise<EmptyResult>;
  'timeEntries.delete'(params: TimeEntryDeleteParams): Promise<EmptyResult>;
};

type ClientRpcMethods = {
  'sync.applyChanges'(params: { tasks: TaskChangedEvent[] }): EmptyResult;
};

type ServerRpcEvents = {
  'tasks.changed'(params: TaskChangedEvent): void;
  'timeEntries.changed'(params: TimeEntryChangedEvent): void;
};

interface RpcServerParams {
  connection: RpcConnection;
}

const authHelloParamsSchema = z.object({
  clientId: nonEmptyString(),
  protocolVersion: finiteNumber(),
});

const taskListParamsSchema = z.object({
  includeArchived: z.boolean().optional(),
});

const taskCreateParamsSchema = z.object({
  id: nonEmptyString(),
  createdAt: dateString(),
  updatedAt: dateString(),
  title: nonEmptyString(),
  description: z.string(),
  statusId: finiteNumber(),
  isArchived: z.boolean(),
  archivedAt: dateString().nullable(),
});

const taskUpdateParamsSchema = z.object({
  id: nonEmptyString(),
  title: nonEmptyString().optional(),
  description: z.string().optional(),
  statusId: finiteNumber().optional(),
  isArchived: z.boolean().optional(),
  archivedAt: dateString().nullable().optional(),
});

const taskArchiveParamsSchema = z.object({
  id: nonEmptyString(),
});

const taskDeleteParamsSchema = z.object({
  id: nonEmptyString(),
});

const timeEntryListParamsSchema = z.object({
  taskId: nonEmptyString().optional(),
});

const timeEntryCreateParamsSchema = z.object({
  id: nonEmptyString(),
  taskId: nonEmptyString(),
  startedAt: dateString(),
  endedAt: dateString().nullable(),
  note: z.string(),
});

const timeEntryUpdateParamsSchema = z.object({
  id: nonEmptyString(),
  startedAt: dateString().optional(),
  endedAt: dateString().nullable().optional(),
  note: z.string().optional(),
});

const timeEntryDeleteParamsSchema = z.object({
  id: nonEmptyString(),
});

function registerServerMethods(
  connection: RpcConnection,
  tasks: TaskRepository,
  events: ServerEventEmitter = connection,
): void {
  connection.addMethod('auth.hello', (params) => {
    const helloParams = readAuthHelloParams(params);

    connection.clientId = helloParams.clientId;

    return {
      serverName: 'tasks-tracker-server',
      protocolVersion: 1,
    };
  });

  connection.addMethod('tasks.list', async (params) => {
    const listParams = readTaskListParams(params);
    return {
      tasks: await tasks.list(listParams),
    };
  });

  connection.addMethod('tasks.create', async (params) => {
    const createParams = readTaskCreateParams(params);
    const task = await tasks.create(createParams);
    events.emitEvent('tasks.changed', {
      task,
      operation: 'created',
    });
    return {};
  });

  connection.addMethod('tasks.update', async (params) => {
    const updateParams = readTaskUpdateParams(params);
    const task = await tasks.update(updateParams);
    events.emitEvent('tasks.changed', {
      task,
      operation: 'updated',
    });
    return {};
  });

  connection.addMethod('tasks.archive', async (params) => {
    const archiveParams = readTaskArchiveParams(params);
    const task = await tasks.archive(archiveParams);
    events.emitEvent('tasks.changed', {
      task,
      operation: 'archived',
    });
    return {};
  });

  connection.addMethod('tasks.delete', async (params) => {
    const deleteParams = readTaskDeleteParams(params);
    const task = await tasks.delete(deleteParams);
    events.emitEvent('tasks.changed', {
      task,
      operation: 'deleted',
    });
    return {};
  });

  connection.addMethod('timeEntries.list', async (params) => {
    const listParams = readTimeEntryListParams(params);
    return {
      timeEntries: await tasks.listTimeEntries(listParams),
    };
  });

  connection.addMethod('timeEntries.create', async (params) => {
    const createParams = readTimeEntryCreateParams(params);
    const timeEntry = await tasks.createTimeEntry(createParams);
    events.emitEvent('timeEntries.changed', {
      timeEntry,
      operation: 'created',
    });
    return {};
  });

  connection.addMethod('timeEntries.update', async (params) => {
    const updateParams = readTimeEntryUpdateParams(params);
    const timeEntry = await tasks.updateTimeEntry(updateParams);
    events.emitEvent('timeEntries.changed', {
      timeEntry,
      operation: 'updated',
    });
    return {};
  });

  connection.addMethod('timeEntries.delete', async (params) => {
    const deleteParams = readTimeEntryDeleteParams(params);
    const timeEntry = await tasks.deleteTimeEntry(deleteParams);
    events.emitEvent('timeEntries.changed', {
      timeEntry,
      operation: 'deleted',
    });
    return {};
  });
}

function readAuthHelloParams(params: unknown): AuthHelloParams {
  return parseParams(authHelloParamsSchema, params, 'auth.hello params');
}

function readTaskListParams(params: unknown): TaskListParams {
  const listParams = parseParams(
    taskListParamsSchema,
    params,
    'tasks.list params',
  );

  return {
    ...(listParams.includeArchived != undefined && {
      includeArchived: listParams.includeArchived,
    }),
  };
}

function readTaskCreateParams(params: unknown): TaskCreateParams {
  return parseParams(taskCreateParamsSchema, params, 'tasks.create params');
}

function readTaskUpdateParams(params: unknown): TaskUpdateParams {
  const updateParams = parseParams(
    taskUpdateParamsSchema,
    params,
    'tasks.update params',
  );

  return {
    id: updateParams.id,
    ...(updateParams.title != undefined && { title: updateParams.title }),
    ...(updateParams.description != undefined && {
      description: updateParams.description,
    }),
    ...(updateParams.statusId != undefined && {
      statusId: updateParams.statusId,
    }),
    ...(updateParams.isArchived != undefined && {
      isArchived: updateParams.isArchived,
    }),
    ...(updateParams.archivedAt !== undefined && {
      archivedAt:
        updateParams.archivedAt == null
          ? null
          : new Date(updateParams.archivedAt),
    }),
  };
}

function readTaskArchiveParams(params: unknown): TaskArchiveParams {
  return parseParams(taskArchiveParamsSchema, params, 'tasks.archive params');
}

function readTaskDeleteParams(params: unknown): TaskDeleteParams {
  return parseParams(taskDeleteParamsSchema, params, 'tasks.delete params');
}

function readTimeEntryListParams(params: unknown): TimeEntryListParams {
  const listParams = parseParams(
    timeEntryListParamsSchema,
    params,
    'timeEntries.list params',
  );

  return {
    ...(listParams.taskId != undefined && { taskId: listParams.taskId }),
  };
}

function readTimeEntryCreateParams(params: unknown): TimeEntryCreateParams {
  const createParams = parseParams(
    timeEntryCreateParamsSchema,
    params,
    'timeEntries.create params',
  );

  return {
    id: createParams.id,
    taskId: createParams.taskId,
    startedAt: createParams.startedAt,
    endedAt: createParams.endedAt,
    note: createParams.note,
  };
}

function readTimeEntryUpdateParams(params: unknown): TimeEntryUpdateParams {
  const updateParams = parseParams(
    timeEntryUpdateParamsSchema,
    params,
    'timeEntries.update params',
  );

  return {
    id: updateParams.id,
    ...(updateParams.startedAt != undefined && {
      startedAt: updateParams.startedAt,
    }),
    ...(updateParams.endedAt !== undefined && {
      endedAt: updateParams.endedAt,
    }),
    ...(updateParams.note != undefined && { note: updateParams.note }),
  };
}

function readTimeEntryDeleteParams(params: unknown): TimeEntryDeleteParams {
  return parseParams(
    timeEntryDeleteParamsSchema,
    params,
    'timeEntries.delete params',
  );
}

function parseParams<Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
  label: string,
): z.output<Schema> {
  if (!isPlainObject(value)) {
    throwInvalidParams(`${label} must be an object`);
  }

  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }

  throwInvalidParams(formatZodIssue(result.error.issues[0]));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value == 'object' && value != null && !Array.isArray(value);
}

function nonEmptyString(): z.ZodString {
  return z.string().min(1);
}

function finiteNumber(): z.ZodNumber {
  return z.number();
}

function dateString(): z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>> {
  return nonEmptyString()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: 'Invalid date string',
    })
    .transform((value) => new Date(value));
}

function formatZodIssue(issue: z.core.$ZodIssue | undefined): string {
  if (issue == undefined) {
    return 'Invalid params';
  }

  const path = issue.path.join('.');
  if (!path) {
    return issue.message;
  }

  return `${path}: ${issue.message}`;
}

function throwInvalidParams(message: string): never {
  throw new JSONRPCErrorException(message, JSONRPCErrorCode.InvalidParams);
}

export type {
  ClientRpcMethods,
  RpcServerParams,
  ServerRpcEvents,
  ServerRpcMethods,
};
export { registerServerMethods };
