// Implements task and time-entry storage using Prisma models.

import type { PrismaClient } from '../generated/prisma/client.ts';
import type {
  TaskArchiveParams,
  TaskCreateParams,
  TaskDeleteParams,
  TaskListParams,
  TaskRecord,
  TaskRepository,
  TaskUpdateParams,
  TimeEntryCreateParams,
  TimeEntryDeleteParams,
  TimeEntryListParams,
  TimeEntryRecord,
  TimeEntryUpdateParams,
} from './types.ts';

class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(params: TaskListParams): Promise<TaskRecord[]> {
    if (params.includeArchived) {
      return await this.prisma.task.findMany({
        orderBy: { createdAt: 'asc' },
      });
    }

    return await this.prisma.task.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(params: TaskCreateParams): Promise<TaskRecord> {
    return await this.prisma.task.create({
      data: {
        id: params.id,
        createdAt: params.createdAt,
        updatedAt: params.updatedAt,
        title: params.title,
        description: params.description,
        statusId: params.statusId,
        isArchived: params.isArchived,
        archivedAt: params.archivedAt,
      },
    });
  }

  async update(params: TaskUpdateParams): Promise<TaskRecord> {
    const data: Partial<
      Pick<TaskRecord, 'title' | 'description' | 'statusId'>
    > = {};

    if (params.title != undefined) {
      data.title = params.title;
    }

    if (params.description != undefined) {
      data.description = params.description;
    }

    if (params.statusId != undefined) {
      data.statusId = params.statusId;
    }

    return await this.prisma.task.update({
      where: { id: params.id },
      data,
    });
  }

  async archive(params: TaskArchiveParams): Promise<TaskRecord> {
    return await this.prisma.task.update({
      where: { id: params.id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }

  async delete(params: TaskDeleteParams): Promise<TaskRecord> {
    return await this.prisma.task.delete({
      where: { id: params.id },
    });
  }

  async listTimeEntries(
    params: TimeEntryListParams,
  ): Promise<TimeEntryRecord[]> {
    if (params.taskId == undefined) {
      return await this.prisma.timeEntry.findMany({
        orderBy: { startedAt: 'asc' },
      });
    }

    return await this.prisma.timeEntry.findMany({
      where: { taskId: params.taskId },
      orderBy: { startedAt: 'asc' },
    });
  }

  async createTimeEntry(
    params: TimeEntryCreateParams,
  ): Promise<TimeEntryRecord> {
    const data = {
      id: params.id,
      taskId: params.taskId,
      startedAt: params.startedAt,
      endedAt: params.endedAt,
      note: params.note,
    };

    return await this.prisma.timeEntry.create({
      data,
    });
  }

  async updateTimeEntry(
    params: TimeEntryUpdateParams,
  ): Promise<TimeEntryRecord> {
    const data: Partial<
      Pick<TimeEntryRecord, 'startedAt' | 'endedAt' | 'note'>
    > = {};

    if (params.startedAt != undefined) {
      data.startedAt = params.startedAt;
    }

    if (params.endedAt !== undefined) {
      data.endedAt = params.endedAt;
    }

    if (params.note != undefined) {
      data.note = params.note;
    }

    return await this.prisma.timeEntry.update({
      where: { id: params.id },
      data,
    });
  }

  async deleteTimeEntry(
    params: TimeEntryDeleteParams,
  ): Promise<TimeEntryRecord> {
    return await this.prisma.timeEntry.delete({
      where: { id: params.id },
    });
  }
}

export { PrismaTaskRepository };
