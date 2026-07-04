// Verifies the Fastify app wiring that does not require a real database.

import { describe, expect, it } from '@jest/globals';

import { createApp } from '../src/server.ts';
import type { ServerConfig } from '../src/config.ts';
import type { TaskRepository } from '../src/tasks/types.ts';

const config: ServerConfig = {
  host: 'localhost',
  port: 0,
  databaseUrl: 'mysql://taskstracker@localhost/tasks_tracker',
  corsOrigin: 'http://localhost:3000',
};

const tasks: TaskRepository = {
  async list() {
    return [];
  },
  async create(params) {
    const now = new Date('2026-06-30T00:00:00.000Z');
    return {
      id: params.id,
      createdAt: now,
      updatedAt: now,
      title: params.title,
      description: params.description,
      statusId: params.statusId,
      isArchived: false,
      archivedAt: null,
    };
  },
  async update(params) {
    const now = new Date('2026-06-30T00:00:00.000Z');
    return {
      id: params.id,
      createdAt: now,
      updatedAt: now,
      title: params.title ?? 'Task',
      description: params.description ?? '',
      statusId: params.statusId ?? 1,
      isArchived: false,
      archivedAt: null,
    };
  },
  async archive(params) {
    const now = new Date('2026-06-30T00:00:00.000Z');
    return {
      id: params.id,
      createdAt: now,
      updatedAt: now,
      title: 'Task',
      description: '',
      statusId: 1,
      isArchived: true,
      archivedAt: now,
    };
  },
  async delete(params) {
    const now = new Date('2026-06-30T00:00:00.000Z');
    return {
      id: params.id,
      createdAt: now,
      updatedAt: now,
      title: 'Task',
      description: '',
      statusId: 1,
      isArchived: false,
      archivedAt: null,
    };
  },
  async listTimeEntries() {
    return [];
  },
  async createTimeEntry(params) {
    return {
      id: params.id,
      taskId: params.taskId,
      startedAt: params.startedAt,
      endedAt: params.endedAt ?? null,
      note: params.note,
    };
  },
  async updateTimeEntry(params) {
    return {
      id: params.id,
      taskId: 'task-client-ulid',
      startedAt: params.startedAt ?? new Date('2026-06-30T00:00:00.000Z'),
      endedAt: params.endedAt ?? null,
      note: params.note ?? '',
    };
  },
  async deleteTimeEntry(params) {
    return {
      id: params.id,
      taskId: 'task-client-ulid',
      startedAt: new Date('2026-06-30T00:00:00.000Z'),
      endedAt: null,
      note: '',
    };
  },
};

describe('createApp', () => {
  it('serves the health endpoint', async () => {
    const app = await createApp(config, { tasks });

    const response = await app.inject('/health');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });

    await app.close();
  });
});
