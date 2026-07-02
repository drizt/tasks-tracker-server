import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { readDotEnvFile } from './utils.ts';

interface ServerConfig {
  host: string;
  port: number;
  databaseUrl: string;
  corsOrigin: string | string[];
}

interface ServerConfigInput {
  host?: string;
  port?: string | number;
  databaseUrl?: string;
  corsOrigin?: string;
}

async function parseCommandLine() {
  const cmdLine = yargs(hideBin(process.argv))
    .scriptName('npm start --')
    .usage(
      `Usage: $0 [options]

Start Tasks Tracker server`,
    )
    .option({
      host: {
        type: 'string',
        describe: 'HTTP server host',
      },
      port: {
        type: 'number',
        describe: 'HTTP server port',
      },
      'database-url': {
        type: 'string',
        describe: 'Tasks Tracker db url',
      },
      'cors-origin': {
        type: 'string',
        describe: 'Allowed browser origin, or comma-separated origins',
      },
    })
    .help('help')
    .alias('help', 'h')
    .hide('version')
    .wrap(null);

  const argv = await cmdLine.parse();
  return argv;
}

async function readConfigInput(): Promise<ServerConfigInput> {
  const dotEnv = readDotEnvFile();
  const argv = await parseCommandLine();

  return {
    host: argv.host ?? dotEnv.HOST,
    port: argv.port ?? dotEnv.PORT,
    databaseUrl: argv['database-url'] ?? dotEnv.DATABASE_URL,
    corsOrigin: argv['cors-origin'] ?? dotEnv.CORS_ORIGIN,
  };
}

function readServerConfig(input: ServerConfigInput = {}): ServerConfig {
  return {
    host: input.host || 'localhost',
    port: readPort(input.port),
    databaseUrl:
      input.databaseUrl || 'mysql://taskstracker@localhost/tasks_tracker',
    corsOrigin: parseCorsOrigin(input.corsOrigin),
  };
}

function readPort(value: string | number | undefined): number {
  if (typeof value == 'number') {
    return value;
  }

  return Number.parseInt(value || '3000', 10);
}

function parseCorsOrigin(value: string | undefined): string | string[] {
  if (!value) {
    return 'http://localhost:3000';
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export type { ServerConfig, ServerConfigInput };
export { readConfigInput, readServerConfig };
