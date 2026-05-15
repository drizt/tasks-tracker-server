/// <reference types="node" />

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const defaultDatabaseUrl = 'mysql://taskstracker@localhost/tasks_tracker';
const defaultDatabaseShadowUrl =
  'mysql://taskstracker@localhost/tasks_tracker_shadow';

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL || defaultDatabaseUrl,
    shadowDatabaseUrl:
      process.env.SHADOW_DATABASE_URL || defaultDatabaseShadowUrl,
  },
});
