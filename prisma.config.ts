/// <reference types="node" />

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

const defaultDatabaseUrl = 'mysql://taskstracker@localhost/tasks_tracker';
const defaultDatabaseShadowUrl =
  'mysql://taskstracker@localhost/tasks_tracker_shadow';
const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const dotEnvPath = path.join(process.cwd(), '.env');
const dotEnv = fs.existsSync(dotEnvPath)
  ? dotenv.parse(fs.readFileSync(dotEnvPath))
  : {};

export default defineConfig({
  schema: path.join(packageRoot, 'prisma/schema.prisma'),
  migrations: {
    path: path.join(packageRoot, 'prisma/migrations'),
  },
  datasource: {
    url: dotEnv.DATABASE_URL || process.env.DATABASE_URL || defaultDatabaseUrl,
    shadowDatabaseUrl:
      dotEnv.SHADOW_DATABASE_URL ||
      process.env.SHADOW_DATABASE_URL ||
      defaultDatabaseShadowUrl,
  },
});
