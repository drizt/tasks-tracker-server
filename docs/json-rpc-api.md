# JSON-RPC API

The server exposes a JSON-RPC 2.0 API over WebSocket.

## Transport

Connect to:

```text
ws://<host>:<port>/ws
```

For HTTPS deployments, use the matching secure WebSocket URL:

```text
wss://<host>/ws
```

Every WebSocket message is a JSON-RPC object serialized as JSON.

## Request Shape

All JSON-RPC `params` and successful `result` values are objects. Use `{}` when
no fields are needed. Arrays and primitive values must be wrapped in an object
field.

Client request:

```json
{
  "jsonrpc": "2.0",
  "id": "client-generated-request-id",
  "method": "tasks.create",
  "params": {}
}
```

Server success response:

```json
{
  "jsonrpc": "2.0",
  "id": "client-generated-request-id",
  "result": {}
}
```

Server error response:

```json
{
  "jsonrpc": "2.0",
  "id": "client-generated-request-id",
  "error": {
    "code": -32602,
    "message": "id: Invalid input: expected string, received undefined"
  }
}
```

Validation errors use JSON-RPC `InvalidParams` (`-32602`). Field-level Zod
errors are formatted as:

```text
<path>: <error text>
```

Invalid top-level params structure uses a method-specific message, for example:

```text
tasks.create params must be an object
```

## Scalar Conventions

- IDs are client-generated strings.
- The client can work offline and synchronize later, so create methods require
  all app-created record fields needed to preserve the client state.
- Dates are ISO-like date strings in requests.
- Dates are returned as serialized JSON date strings.
- `description` can be an empty string.
- `note` can be an empty string.
- `statusId` is a finite number.

## Records

### Task

```json
{
  "id": "task-ulid",
  "createdAt": "2026-06-30T00:00:00.000Z",
  "updatedAt": "2026-06-30T00:00:00.000Z",
  "title": "Write docs",
  "description": "",
  "statusId": 1,
  "isArchived": false,
  "archivedAt": null
}
```

### Time Entry

```json
{
  "id": "entry-ulid",
  "taskId": "task-ulid",
  "startedAt": "2026-06-30T01:00:00.000Z",
  "endedAt": null,
  "note": ""
}
```

## Server Methods

### `auth.hello`

Registers client connection metadata on the server-side RPC connection.

Params:

```json
{
  "clientId": "client-ulid",
  "protocolVersion": 1
}
```

Result:

```json
{
  "serverName": "tasks-tracker-server",
  "protocolVersion": 1
}
```

### `tasks.list`

Lists tasks.

Params can be an empty object.

```json
{
  "includeArchived": false
}
```

Result:

```json
{
  "tasks": [
    {
      "id": "task-ulid",
      "createdAt": "2026-06-30T00:00:00.000Z",
      "updatedAt": "2026-06-30T00:00:00.000Z",
      "title": "Write docs",
      "description": "",
      "statusId": 1,
      "isArchived": false,
      "archivedAt": null
    }
  ]
}
```

### `tasks.create`

Creates a task. The client must provide all task fields because tasks can be
created offline before the server sees them.

Params:

```json
{
  "id": "task-ulid",
  "createdAt": "2026-06-30T00:00:00.000Z",
  "updatedAt": "2026-06-30T00:00:00.000Z",
  "title": "Write docs",
  "description": "",
  "statusId": 1,
  "isArchived": false,
  "archivedAt": null
}
```

Result:

```json
{}
```

### `tasks.update`

Updates task fields. The client must provide the task ID. Other fields are
optional.

Params:

```json
{
  "id": "task-ulid",
  "title": "Write better docs",
  "description": "",
  "statusId": 1
}
```

Result:

```json
{}
```

### `tasks.archive`

Archives a task.

Params:

```json
{
  "id": "task-ulid"
}
```

Result:

```json
{}
```

### `tasks.delete`

Deletes a task. Related time entries are deleted with the task.

Params:

```json
{
  "id": "task-ulid"
}
```

Result:

```json
{}
```

### `timeEntries.list`

Lists time entries. When `taskId` is omitted, all time entries are returned.

Params can be an empty object.

```json
{
  "taskId": "task-ulid"
}
```

Result:

```json
{
  "timeEntries": [
    {
      "id": "entry-ulid",
      "taskId": "task-ulid",
      "startedAt": "2026-06-30T01:00:00.000Z",
      "endedAt": null,
      "note": ""
    }
  ]
}
```

### `timeEntries.create`

Creates a time entry. The client must provide all time entry fields because time
entries can be created offline before the server sees them.

Params:

```json
{
  "id": "entry-ulid",
  "taskId": "task-ulid",
  "startedAt": "2026-06-30T01:00:00.000Z",
  "endedAt": "2026-06-30T01:30:00.000Z",
  "note": ""
}
```

`endedAt` can be a date string or `null`.

Result:

```json
{}
```

### `timeEntries.update`

Updates time entry fields. The client must provide the time entry ID. Other
fields are optional.

Params:

```json
{
  "id": "entry-ulid",
  "startedAt": "2026-06-30T01:00:00.000Z",
  "endedAt": null,
  "note": ""
}
```

`endedAt` can be a date string or `null`.

Result:

```json
{}
```

### `timeEntries.delete`

Deletes a time entry.

Params:

```json
{
  "id": "entry-ulid"
}
```

Result:

```json
{}
```

## Server Events

The server can also send events to the client over the same WebSocket
connection. Events are JSON-RPC messages without an `id`, so they do not have a
response. Server events are broadcast to all active WebSocket connections.

### `tasks.changed`

Event sent by the server after successful task create, update, archive, or delete
operations.

Params:

```json
{
  "task": {
    "id": "task-ulid",
    "createdAt": "2026-06-30T00:00:00.000Z",
    "updatedAt": "2026-06-30T00:30:00.000Z",
    "title": "Write better docs",
    "description": "",
    "statusId": 1,
    "isArchived": false,
    "archivedAt": null
  },
  "operation": "created"
}
```

Allowed `operation` values:

- `created`
- `updated`
- `archived`
- `deleted`

### `timeEntries.changed`

Event sent by the server after successful time entry create, update, or delete
operations.

Params:

```json
{
  "timeEntry": {
    "id": "entry-ulid",
    "taskId": "task-ulid",
    "startedAt": "2026-06-30T01:00:00.000Z",
    "endedAt": null,
    "note": ""
  },
  "operation": "created"
}
```

Allowed `operation` values:

- `created`
- `updated`
- `deleted`

## Client Methods

The server can also call methods on the client over the same WebSocket
connection. Client methods are JSON-RPC requests with an `id`, so the client
must send a response.

### `sync.applyChanges`

Method called by the server when it needs the client to apply task changes.

Params:

```json
{
  "tasks": [
    {
      "task": {
        "id": "task-ulid",
        "createdAt": "2026-06-30T00:00:00.000Z",
        "updatedAt": "2026-06-30T00:30:00.000Z",
        "title": "Write better docs",
        "description": "",
        "statusId": 1,
        "isArchived": false,
        "archivedAt": null
      },
      "operation": "updated"
    }
  ]
}
```

Result:

```json
{}
```
