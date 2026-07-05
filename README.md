# Tasks Tracker Server

JSON-RPC server for Tasks Tracker.

## Installable Package

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
directory. For systemd deployments, use an environment file:

```text
/etc/tasks-tracker-server/server.env
```

Example:

```env
HOST=127.0.0.1
PORT=3000
DATABASE_URL=mysql://taskstracker:change-me@localhost/tasks_tracker
CORS_ORIGIN=http://localhost:3000
```

Command-line options override `.env` and process environment values.

## Database

Create the service user and directories:

```bash
sudo useradd --system \
  --home-dir /var/lib/tasks-tracker-server \
  --shell /usr/sbin/nologin \
  tasks-tracker
sudo install -d -m 0750 -o tasks-tracker -g tasks-tracker \
  /var/lib/tasks-tracker-server
sudo install -d -m 0750 -o root -g tasks-tracker \
  /etc/tasks-tracker-server
sudo install -m 0640 -o root -g tasks-tracker deploy/server.env.example \
  /etc/tasks-tracker-server/server.env
```

Create the database and user when setting up a new machine:

```bash
sudo -u tasks-tracker bash -lc \
  'set -a; . /etc/tasks-tracker-server/server.env; set +a; \
   cd /var/lib/tasks-tracker-server; tasks-tracker-server-create-db'
```

Apply migrations after package upgrades:

```bash
sudo -u tasks-tracker bash -lc \
  'set -a; . /etc/tasks-tracker-server/server.env; set +a; \
   cd /var/lib/tasks-tracker-server; tasks-tracker-server-migrate'
```

## systemd

Install the example unit:

```bash
sudo install -D -m 0644 deploy/tasks-tracker-server.service \
  /etc/systemd/system/tasks-tracker-server.service
sudo systemctl daemon-reload
sudo systemctl enable --now tasks-tracker-server
```

Check logs:

```bash
journalctl -u tasks-tracker-server -f
```
