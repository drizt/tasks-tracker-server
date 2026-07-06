# Tasks Tracker Server

JSON-RPC server for Tasks Tracker.

## Linux systemd install

Install from the repository checkout:

```bash
deploy/install.sh
```

The installer builds the npm package, installs it globally, creates the
`tasks-tracker` system user, installs the systemd unit, and starts the service.

On the first install, it runs `tasks-tracker-server-create-db` as the service
user from `/var/lib/tasks-tracker-server`. The command asks for the database URL
and root database credentials, writes `.env` in the service working directory,
copies it to `/etc/tasks-tracker-server/server.env`, and applies migrations. On
later runs, when that config already exists, the installer runs
`tasks-tracker-server-migrate` instead.

Useful options:

```bash
deploy/install.sh --no-deps
deploy/install.sh --skip-db
deploy/install.sh --create-db
```

## Installable package

Build and pack the server:

```bash
npm ci
npm test
npm pack
```

Install the generated package on the target machine:

```bash
sudo npm install -g tasks-tracker-server-0.1.0.tgz
```

This installs these commands:

```bash
tasks-tracker-server
tasks-tracker-server-create-db
tasks-tracker-server-migrate
```

## Configuration

For local development, the server reads `.env` from the current working
directory. The systemd service reads its deployment configuration from:

```text
/etc/tasks-tracker-server/server.env
```

Example values:

```env
HOST=127.0.0.1
PORT=3000
DATABASE_URL=mysql://taskstracker:change-me@localhost/tasks_tracker
CORS_ORIGIN=http://localhost:3000
```

Command-line options override `.env` and process environment values.

## systemd

The installer enables and restarts the service automatically. Check logs:

```bash
journalctl -u tasks-tracker-server -f
```
