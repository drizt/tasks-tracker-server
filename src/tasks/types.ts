// Defines task and time-entry repository contracts shared by RPC and storage.

interface TaskRecord {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  description: string;
  statusId: number;
  isArchived: boolean;
  archivedAt: Date | null;
}

interface TaskListParams {
  includeArchived?: boolean;
}

interface TaskCreateParams {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  description: string;
  statusId: number;
  isArchived: boolean;
  archivedAt: Date | null;
}

interface TaskUpdateParams {
  id: string;
  title?: string;
  description?: string;
  statusId?: number;
  isArchived?: boolean;
  archivedAt?: Date | null;
}

interface TaskArchiveParams {
  id: string;
}

interface TaskDeleteParams {
  id: string;
}

interface TimeEntryRecord {
  id: string;
  taskId: string;
  startedAt: Date;
  endedAt: Date | null;
  note: string;
}

interface TimeEntryListParams {
  taskId?: string;
}

interface TimeEntryCreateParams {
  id: string;
  taskId: string;
  startedAt: Date;
  endedAt: Date | null;
  note: string;
}

interface TimeEntryUpdateParams {
  id: string;
  startedAt?: Date;
  endedAt?: Date | null;
  note?: string;
}

interface TimeEntryDeleteParams {
  id: string;
}

type TaskChangeOperation = 'created' | 'updated' | 'archived' | 'deleted';

interface TaskChangedEvent {
  task: TaskRecord;
  operation: TaskChangeOperation;
}

type TimeEntryChangeOperation = 'created' | 'updated' | 'deleted';

interface TimeEntryChangedEvent {
  timeEntry: TimeEntryRecord;
  operation: TimeEntryChangeOperation;
}

interface TaskRepository {
  list(params: TaskListParams): Promise<TaskRecord[]>;
  create(params: TaskCreateParams): Promise<TaskRecord>;
  update(params: TaskUpdateParams): Promise<TaskRecord>;
  archive(params: TaskArchiveParams): Promise<TaskRecord>;
  delete(params: TaskDeleteParams): Promise<TaskRecord>;
  listTimeEntries(params: TimeEntryListParams): Promise<TimeEntryRecord[]>;
  createTimeEntry(params: TimeEntryCreateParams): Promise<TimeEntryRecord>;
  updateTimeEntry(params: TimeEntryUpdateParams): Promise<TimeEntryRecord>;
  deleteTimeEntry(params: TimeEntryDeleteParams): Promise<TimeEntryRecord>;
}

export type {
  TaskArchiveParams,
  TaskChangeOperation,
  TaskChangedEvent,
  TaskCreateParams,
  TaskDeleteParams,
  TaskListParams,
  TaskRecord,
  TaskRepository,
  TaskUpdateParams,
  TimeEntryCreateParams,
  TimeEntryChangeOperation,
  TimeEntryChangedEvent,
  TimeEntryDeleteParams,
  TimeEntryListParams,
  TimeEntryRecord,
  TimeEntryUpdateParams,
};
