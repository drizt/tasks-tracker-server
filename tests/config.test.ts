import { describe, expect, it } from '@jest/globals';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { readConfigInput, readServerConfig } from '../src/config.ts';

describe('readServerConfig', () => {
  it('uses defaults without reading process env', () => {
    expect(readServerConfig()).toEqual({
      host: 'localhost',
      port: 3000,
      databaseUrl: 'mysql://taskstracker@localhost/tasks_tracker',
      corsOrigin: 'http://localhost:3000',
    });
  });

  it('uses explicit input values', () => {
    expect(
      readServerConfig({
        host: '0.0.0.0',
        port: '4000',
        databaseUrl: 'mysql://user@localhost/custom',
        corsOrigin: 'https://one.example, https://two.example',
      }),
    ).toEqual({
      host: '0.0.0.0',
      port: 4000,
      databaseUrl: 'mysql://user@localhost/custom',
      corsOrigin: ['https://one.example', 'https://two.example'],
    });
  });
});

describe('readConfigInput', () => {
  it('reads .env and command line values without parameters', async () => {
    const oldArgv = process.argv;
    const oldCwd = process.cwd();
    const cwd = mkdtempSync(path.join(tmpdir(), 'tasks-tracker-config-'));

    try {
      writeFileSync(
        path.join(cwd, '.env'),
        [
          'HOST=127.0.0.1',
          'PORT=3001',
          'DATABASE_URL=mysql://env@localhost/env_db',
          'CORS_ORIGIN=http://env.example',
          '',
        ].join('\n'),
      );

      process.chdir(cwd);
      process.argv = [
        'node',
        'dist/index.js',
        '--port',
        '4002',
        '--cors-origin',
        'http://argv.example',
      ];

      await expect(readConfigInput()).resolves.toEqual({
        host: '127.0.0.1',
        port: 4002,
        databaseUrl: 'mysql://env@localhost/env_db',
        corsOrigin: 'http://argv.example',
      });
    } finally {
      process.argv = oldArgv;
      process.chdir(oldCwd);
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
