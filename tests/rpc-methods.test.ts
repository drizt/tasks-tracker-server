// Verifies the JSON-RPC task and time-entry methods exposed by the server.

import { describe, expect, it } from '@jest/globals';
import type { WebSocket } from 'ws';

import { RpcConnection, RpcConnectionSet } from '../src/rpc/rpc-connection.ts';
import { registerServerMethods } from '../src/rpc/methods.ts';
import type {
  TaskCreateParams,
  TaskDeleteParams,
  TaskListParams,
  TaskRecord,
  TaskRepository,
  TaskUpdateParams,
  TimeEntryCreateParams,
  TimeEntryDeleteParams,
  TimeEntryRecord,
  TimeEntryUpdateParams,
} from '../src/tasks/types.ts';

class FakeSocket {
  sent: unknown[] = [];

  send(payload: string): void {
    this.sent.push(JSON.parse(payload));
  }
}

function task(overrides: Partial<TaskRecord> = {}): TaskRecord {
  const now = new Date('2026-06-30T00:00:00.000Z');

  return {
    id: 'task-client-luuid',
    createdAt: now,
    updatedAt: now,
    title: 'Task',
    description: '',
    statusId: 1,
    isArchived: false,
    archivedAt: null,
    ...overrides,
  };
}

function serializedTask(record: TaskRecord): Record<string, unknown> {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    archivedAt: record.archivedAt?.toISOString() ?? null,
  };
}

function timeEntry(overrides: Partial<TimeEntryRecord> = {}): TimeEntryRecord {
  return {
    id: 'entry-client-ulid',
    taskId: 'task-client-ulid',
    startedAt: new Date('2026-06-30T01:00:00.000Z'),
    endedAt: null,
    note: '',
    ...overrides,
  };
}

function serializedTimeEntry(record: TimeEntryRecord): Record<string, unknown> {
  return {
    ...record,
    startedAt: record.startedAt.toISOString(),
    endedAt: record.endedAt?.toISOString() ?? null,
  };
}

function repository(): TaskRepository & {
  created: TaskCreateParams[];
  createdEntries: TimeEntryCreateParams[];
  deleted: TaskDeleteParams[];
  deletedEntries: TimeEntryDeleteParams[];
  listed: TaskListParams[];
  updated: TaskUpdateParams[];
  updatedEntries: TimeEntryUpdateParams[];
} {
  const calls = {
    created: [] as TaskCreateParams[],
    createdEntries: [] as TimeEntryCreateParams[],
    deleted: [] as TaskDeleteParams[],
    deletedEntries: [] as TimeEntryDeleteParams[],
    listed: [] as TaskListParams[],
    updated: [] as TaskUpdateParams[],
    updatedEntries: [] as TimeEntryUpdateParams[],
  };

  return {
    ...calls,
    async list(params) {
      calls.listed.push(params);
      return [task()];
    },
    async create(params) {
      calls.created.push(params);
      return task(params);
    },
    async update(params) {
      calls.updated.push(params);
      return task({ id: params.id, title: params.title ?? 'Task' });
    },
    async archive(params) {
      return task({
        id: params.id,
        isArchived: true,
        archivedAt: new Date('2026-06-30T00:00:00.000Z'),
      });
    },
    async delete(params) {
      calls.deleted.push(params);
      return task({ id: params.id });
    },
    async listTimeEntries() {
      return [timeEntry()];
    },
    async createTimeEntry(params) {
      calls.createdEntries.push(params);
      return timeEntry({
        id: params.id,
        taskId: params.taskId,
        startedAt: params.startedAt,
        endedAt: params.endedAt ?? null,
        note: params.note,
      });
    },
    async updateTimeEntry(params) {
      calls.updatedEntries.push(params);
      return timeEntry({
        id: params.id,
        ...(params.startedAt != undefined && { startedAt: params.startedAt }),
        ...(params.endedAt !== undefined && { endedAt: params.endedAt }),
        ...(params.note != undefined && { note: params.note }),
      });
    },
    async deleteTimeEntry(params) {
      calls.deletedEntries.push(params);
      return timeEntry({ id: params.id });
    },
  };
}

describe('RPC task methods', () => {
  it('lists tasks inside a result object', async () => {
    const socket = new FakeSocket();
    const connection = new RpcConnection(socket as unknown as WebSocket);
    registerServerMethods(connection, repository());

    await connection.receive(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-list-tasks',
        method: 'tasks.list',
        params: {},
      }),
    );

    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      id: 'rpc-list-tasks',
      result: {
        tasks: [serializedTask(task())],
      },
    });
  });

  it('rejects list calls without a params object', async () => {
    const socket = new FakeSocket();
    const connection = new RpcConnection(socket as unknown as WebSocket);
    registerServerMethods(connection, repository());

    await connection.receive(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-list-without-params',
        method: 'tasks.list',
      }),
    );

    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      id: 'rpc-list-without-params',
      error: {
        code: -32602,
        message: 'tasks.list params must be an object',
      },
    });
  });

  it('creates tasks with all fields supplied by the client', async () => {
    const socket = new FakeSocket();
    const tasks = repository();
    const connection = new RpcConnection(socket as unknown as WebSocket);
    registerServerMethods(connection, tasks);

    await connection.receive(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-1',
        method: 'tasks.create',
        params: {
          id: 'client-luuid-1',
          createdAt: '2026-06-30T00:00:00.000Z',
          updatedAt: '2026-06-30T00:30:00.000Z',
          title: 'Write RPC server',
          description: '',
          statusId: 1,
          isArchived: false,
          archivedAt: null,
        },
      }),
    );

    expect(tasks.created).toEqual([
      {
        id: 'client-luuid-1',
        createdAt: new Date('2026-06-30T00:00:00.000Z'),
        updatedAt: new Date('2026-06-30T00:30:00.000Z'),
        title: 'Write RPC server',
        description: '',
        statusId: 1,
        isArchived: false,
        archivedAt: null,
      },
    ]);
    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      method: 'tasks.changed',
      params: {
        task: {
          id: 'client-luuid-1',
          createdAt: '2026-06-30T00:00:00.000Z',
          updatedAt: '2026-06-30T00:30:00.000Z',
          title: 'Write RPC server',
          description: '',
          statusId: 1,
          isArchived: false,
          archivedAt: null,
        },
        operation: 'created',
      },
    });
    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      id: 'rpc-1',
      result: {},
    });
  });

  it('broadcasts task events to all connections', async () => {
    const callerSocket = new FakeSocket();
    const listenerSocket = new FakeSocket();
    const tasks = repository();
    const caller = new RpcConnection(callerSocket as unknown as WebSocket);
    const listener = new RpcConnection(listenerSocket as unknown as WebSocket);
    const connections = new RpcConnectionSet();
    connections.add(caller);
    connections.add(listener);
    registerServerMethods(caller, tasks, connections);

    await caller.receive(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-broadcast-task-create',
        method: 'tasks.create',
        params: {
          id: 'client-luuid-1',
          createdAt: '2026-06-30T00:00:00.000Z',
          updatedAt: '2026-06-30T00:30:00.000Z',
          title: 'Write RPC server',
          description: '',
          statusId: 1,
          isArchived: false,
          archivedAt: null,
        },
      }),
    );

    const event = {
      jsonrpc: '2.0',
      method: 'tasks.changed',
      params: {
        task: {
          id: 'client-luuid-1',
          createdAt: '2026-06-30T00:00:00.000Z',
          updatedAt: '2026-06-30T00:30:00.000Z',
          title: 'Write RPC server',
          description: '',
          statusId: 1,
          isArchived: false,
          archivedAt: null,
        },
        operation: 'created',
      },
    };

    expect(callerSocket.sent).toContainEqual(event);
    expect(listenerSocket.sent).toContainEqual(event);
    expect(callerSocket.sent).toContainEqual({
      jsonrpc: '2.0',
      id: 'rpc-broadcast-task-create',
      result: {},
    });
  });

  it('rejects create calls without a client-generated task id', async () => {
    const socket = new FakeSocket();
    const connection = new RpcConnection(socket as unknown as WebSocket);
    registerServerMethods(connection, repository());

    await connection.receive(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-2',
        method: 'tasks.create',
        params: {
          title: 'Missing id',
          createdAt: '2026-06-30T00:00:00.000Z',
          updatedAt: '2026-06-30T00:30:00.000Z',
          description: '',
          statusId: 1,
          isArchived: false,
          archivedAt: null,
        },
      }),
    );

    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      id: 'rpc-2',
      error: {
        code: -32602,
        message: 'id: Invalid input: expected string, received undefined',
      },
    });
  });

  it('rejects valid methods with invalid params structure', async () => {
    const socket = new FakeSocket();
    const connection = new RpcConnection(socket as unknown as WebSocket);
    registerServerMethods(connection, repository());

    await connection.receive(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-invalid-params',
        method: 'tasks.create',
        params: ['not', 'an', 'object'],
      }),
    );

    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      id: 'rpc-invalid-params',
      error: {
        code: -32602,
        message: 'tasks.create params must be an object',
      },
    });
  });

  it('updates tasks with an empty description', async () => {
    const socket = new FakeSocket();
    const tasks = repository();
    const connection = new RpcConnection(socket as unknown as WebSocket);
    registerServerMethods(connection, tasks);

    await connection.receive(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-update-empty-description',
        method: 'tasks.update',
        params: {
          id: 'client-luuid-1',
          description: '',
        },
      }),
    );

    expect(tasks.updated).toEqual([
      {
        id: 'client-luuid-1',
        description: '',
      },
    ]);
    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      id: 'rpc-update-empty-description',
      result: {},
    });
  });

  it('updates archived state when unarchiving tasks', async () => {
    const socket = new FakeSocket();
    const tasks = repository();
    const connection = new RpcConnection(socket as unknown as WebSocket);
    registerServerMethods(connection, tasks);

    await connection.receive(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-update-unarchive',
        method: 'tasks.update',
        params: {
          id: 'client-luuid-1',
          statusId: 1,
          isArchived: false,
          archivedAt: null,
        },
      }),
    );

    expect(tasks.updated).toEqual([
      {
        id: 'client-luuid-1',
        statusId: 1,
        isArchived: false,
        archivedAt: null,
      },
    ]);
    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      id: 'rpc-update-unarchive',
      result: {},
    });
  });

  it('deletes tasks and emits a deleted task event', async () => {
    const socket = new FakeSocket();
    const tasks = repository();
    const connection = new RpcConnection(socket as unknown as WebSocket);
    registerServerMethods(connection, tasks);

    await connection.receive(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-delete-task',
        method: 'tasks.delete',
        params: {
          id: 'client-luuid-1',
        },
      }),
    );

    expect(tasks.deleted).toEqual([
      {
        id: 'client-luuid-1',
      },
    ]);
    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      method: 'tasks.changed',
      params: {
        task: serializedTask(task({ id: 'client-luuid-1' })),
        operation: 'deleted',
      },
    });
    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      id: 'rpc-delete-task',
      result: {},
    });
  });

  it('rejects time entry params with invalid date strings', async () => {
    const socket = new FakeSocket();
    const connection = new RpcConnection(socket as unknown as WebSocket);
    registerServerMethods(connection, repository());

    await connection.receive(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-invalid-date',
        method: 'timeEntries.create',
        params: {
          id: 'entry-client-ulid',
          taskId: 'task-client-ulid',
          startedAt: 'not-a-date',
          endedAt: null,
          note: '',
        },
      }),
    );

    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      id: 'rpc-invalid-date',
      error: {
        code: -32602,
        message: 'startedAt: Invalid date string',
      },
    });
  });

  it('can call client methods over the same RPC connection', async () => {
    const socket = new FakeSocket();
    const connection = new RpcConnection(socket as unknown as WebSocket);
    const changedTask = task({ id: 'client-luuid-1' });

    const pendingRequest = Promise.resolve(
      connection.request('sync.applyChanges', {
        tasks: [
          {
            task: changedTask,
            operation: 'updated',
          },
        ],
      }),
    );

    expect(socket.sent).toEqual([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'sync.applyChanges',
        params: {
          tasks: [
            {
              task: serializedTask(changedTask),
              operation: 'updated',
            },
          ],
        },
      },
    ]);

    connection.rejectAllPendingRequests('Test finished');
    await expect(pendingRequest).rejects.toThrow('Test finished');
  });

  it('creates time entries with the id supplied by the client', async () => {
    const socket = new FakeSocket();
    const tasks = repository();
    const connection = new RpcConnection(socket as unknown as WebSocket);
    registerServerMethods(connection, tasks);

    await connection.receive(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-3',
        method: 'timeEntries.create',
        params: {
          id: 'entry-client-ulid',
          taskId: 'task-client-ulid',
          startedAt: '2026-06-30T01:00:00.000Z',
          endedAt: '2026-06-30T01:30:00.000Z',
          note: '',
        },
      }),
    );

    expect(tasks.createdEntries).toEqual([
      {
        id: 'entry-client-ulid',
        taskId: 'task-client-ulid',
        startedAt: new Date('2026-06-30T01:00:00.000Z'),
        endedAt: new Date('2026-06-30T01:30:00.000Z'),
        note: '',
      },
    ]);
    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      method: 'timeEntries.changed',
      params: {
        timeEntry: {
          id: 'entry-client-ulid',
          taskId: 'task-client-ulid',
          startedAt: '2026-06-30T01:00:00.000Z',
          endedAt: '2026-06-30T01:30:00.000Z',
          note: '',
        },
        operation: 'created',
      },
    });
    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      id: 'rpc-3',
      result: {},
    });
  });

  it('updates time entries and emits an updated time entry event', async () => {
    const socket = new FakeSocket();
    const tasks = repository();
    const connection = new RpcConnection(socket as unknown as WebSocket);
    registerServerMethods(connection, tasks);

    await connection.receive(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-update-time-entry',
        method: 'timeEntries.update',
        params: {
          id: 'entry-client-ulid',
          endedAt: null,
          note: '',
        },
      }),
    );

    expect(tasks.updatedEntries).toEqual([
      {
        id: 'entry-client-ulid',
        endedAt: null,
        note: '',
      },
    ]);
    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      method: 'timeEntries.changed',
      params: {
        timeEntry: serializedTimeEntry(
          timeEntry({
            id: 'entry-client-ulid',
            endedAt: null,
            note: '',
          }),
        ),
        operation: 'updated',
      },
    });
    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      id: 'rpc-update-time-entry',
      result: {},
    });
  });

  it('deletes time entries and emits a deleted time entry event', async () => {
    const socket = new FakeSocket();
    const tasks = repository();
    const connection = new RpcConnection(socket as unknown as WebSocket);
    registerServerMethods(connection, tasks);

    await connection.receive(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-delete-time-entry',
        method: 'timeEntries.delete',
        params: {
          id: 'entry-client-ulid',
        },
      }),
    );

    expect(tasks.deletedEntries).toEqual([
      {
        id: 'entry-client-ulid',
      },
    ]);
    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      method: 'timeEntries.changed',
      params: {
        timeEntry: serializedTimeEntry(timeEntry({ id: 'entry-client-ulid' })),
        operation: 'deleted',
      },
    });
    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      id: 'rpc-delete-time-entry',
      result: {},
    });
  });

  it('lists time entries inside a result object', async () => {
    const socket = new FakeSocket();
    const connection = new RpcConnection(socket as unknown as WebSocket);
    registerServerMethods(connection, repository());

    await connection.receive(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-list-time-entries',
        method: 'timeEntries.list',
        params: {},
      }),
    );

    expect(socket.sent).toContainEqual({
      jsonrpc: '2.0',
      id: 'rpc-list-time-entries',
      result: {
        timeEntries: [serializedTimeEntry(timeEntry())],
      },
    });
  });
});
