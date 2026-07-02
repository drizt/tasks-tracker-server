/// <reference types="node" />

import * as fs from 'node:fs';

import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

const defaultDatabaseUrl = 'mysql://taskstracker@localhost/tasks_tracker';
const defaultDatabaseShadowUrl =
  'mysql://taskstracker@localhost/tasks_tracker_shadow';
const dotEnv = fs.existsSync('.env')
  ? dotenv.parse(fs.readFileSync('.env'))
  : {};

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: dotEnv.DATABASE_URL || process.env.DATABASE_URL || defaultDatabaseUrl,
    shadowDatabaseUrl:
      dotEnv.SHADOW_DATABASE_URL ||
      process.env.SHADOW_DATABASE_URL ||
      defaultDatabaseShadowUrl,
  },
});
