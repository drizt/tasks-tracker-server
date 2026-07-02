import * as fs from 'node:fs';
import { spawn } from 'node:child_process';

import { PrismaClient } from './generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import chalk from 'chalk';
import dotenv from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import prompts from 'prompts';

import { die, setDefaultDotEnvOption } from './utils.ts';

interface Options {
  force?: boolean; // recreate db
  dbName?: string;
  host?: string;
  port?: number;
  rootUser?: string;
  rootPassword?: string;
  url?: string;
  dev?: boolean; // developer mode
  shadowUrl?: string;
}

function readDotEnv(): Record<string, string> {
  const filename = '.env';

  if (!fs.existsSync(filename)) {
    return {};
  }

  return dotenv.parse(fs.readFileSync(filename));
}

function getEnvOption(dotEnv: Record<string, string>, key: string): string {
  return dotEnv[key] ?? process.env[key] ?? '';
}

async function askDbUrl(): Promise<string> {
  const host = 'localhost';
  const { db, port, user, password } = await prompts([
    {
      type: 'text',
      name: 'db',
      initial: 'tasks_tracker',
      message: 'Enter Tasks Tracker db name',
    },
    {
      type: 'number',
      name: 'port',
      initial: 0,
      message: 'Enter db port',
    },
    {
      type: 'text',
      name: 'user',
      initial: 'taskstracker',
      message: 'Enter Tasks Tracker db user',
    },
    {
      type: 'password',
      name: 'password',
      initial: '',
      message: 'Enter Tasks Tracker db password',
    },
  ]);

  let dbUrl = 'mysql://' + user;
  if (password) {
    dbUrl += ':' + password;
  }

  dbUrl += '@' + host;
  if (port) {
    dbUrl += ':' + port;
  }

  dbUrl += '/' + db;

  return dbUrl;
}

async function runCommand(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code == 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
      }
    });
  });
}

async function applyMigrations(): Promise<void> {
  console.log('');
  console.log('Applying migrations');

  await runCommand('npm', ['run', 'migrate:deploy']);
}

async function askDev(): Promise<boolean> {
  return (
    await prompts({
      type: 'confirm',
      name: 'value',
      initial: false,
      message: 'Yes to enable developer mode',
    })
  ).value;
}

async function parseCommandLine() {
  const cmdLine = yargs(hideBin(process.argv))
    .usage(
      `Usage: node $0 [options]

Initialize db for Tasks Tracker server`,
    )
    .option({
      'root-user': {
        alias: 'u',
        type: 'string',
        describe: 'Db root username',
      },
      'root-password': {
        alias: 'p',
        type: 'string',
        describe: 'Db root password',
      },
      force: {
        alias: 'f',
        type: 'boolean',
        describe: 'Recreate db if need',
        default: false,
      },
      url: {
        type: 'string',
        decribe: 'Tasks Tracker db url',
      },
      dev: {
        type: 'boolean',
        describe: 'Developer mode',
        default: false,
      },
    })
    .implies('root-password', 'root-user')
    .hide('version')
    .wrap(null);

  const argv = await cmdLine.parse();
  return argv;
}

async function main() {
  const argv = await parseCommandLine();
  const dotEnv = readDotEnv();

  const options: Options = {};
  const dropDatabase = getEnvOption(dotEnv, 'DROP_DATABASE');
  options.force =
    argv.force || (!!dropDatabase && dropDatabase != '0') || false;

  if (argv.dev) {
    options.dev = argv.dev;
  }

  if (argv.rootUser) {
    options.rootUser = argv.rootUser;
  } else {
    options.rootUser = getEnvOption(dotEnv, 'ROOT_USER');
  }

  if (argv.rootPassword) {
    options.rootPassword = argv.rootPassword;
  } else {
    options.rootPassword = getEnvOption(dotEnv, 'ROOT_PASSWORD');
  }

  const databaseUrl = getEnvOption(dotEnv, 'DATABASE_URL');
  const shadowDatabaseUrl = getEnvOption(dotEnv, 'SHADOW_DATABASE_URL');

  if (argv.url) {
    options.url = argv.url;
  } else if (databaseUrl) {
    options.url = databaseUrl;
    options.dev ??= !!shadowDatabaseUrl;
  } else {
    options.url = await askDbUrl();
    options.dev = await askDev();
  }

  let shadowUrl;

  if (shadowDatabaseUrl) {
    shadowUrl = new URL(shadowDatabaseUrl);
  } else {
    shadowUrl = new URL(options.url);
    shadowUrl.pathname = shadowUrl.pathname + '_shadow';
  }

  options.shadowUrl = shadowUrl.toString();

  const url = new URL(options.url);

  const dbConfig = {
    dialect: url.protocol.replace(':', ''),
    username: url.username,
    password: url.password,
    host: url.hostname,
    port: parseInt(url.port),
    database: url.pathname.replace(/^\//, ''),
    shadowHost: shadowUrl.hostname,
    shadowDatabase: shadowUrl.pathname.replace(/^\//, ''),
  };

  if (dbConfig.dialect != 'mysql') {
    die('invalid db dialect. Check DATABASE_URL in .env');
  } else if (!dbConfig.username) {
    die('invalid db username. Check DATABASE_URL in .env');
  } else if (!dbConfig.username.match(/^[A-Za-z0-9_]+$/)) {
    die(
      'db username can contains only letters, numbers or underscores. Check DATABASE_URL in .env',
    );
  } else if (!dbConfig.database.match(/^[A-Za-z0-9_]+$/)) {
    die(
      'db name can contains only letters, numbers or underscores. Check DATABASE_URL in .env',
    );
  } else if (
    dbConfig.password &&
    !dbConfig.password.match(/^[A-Za-z0-9!@#%^_+=-]{1,64}$/)
  ) {
    die(
      'db password can contains only letters, numbers or symbols: !@#%^_+=-. Check DATABASE_URL in .env',
    );
  } else if (!dbConfig.host) {
    die('invalid db host. Check DATABASE_URL in .env');
  } else if (dbConfig.host !== 'localhost') {
    die('db host must be localhost. Check DATABASE_URL in .env');
  } else if (options.dev && dbConfig.shadowHost !== 'localhost') {
    die('shadow db host must be localhost. Check SHADOW_DATABASE_URL in .env');
  }

  if (!options.rootUser) {
    options.rootUser = (
      await prompts({
        type: 'text',
        name: 'value',
        initial: 'root',
        message: 'Enter root db username',
      })
    ).value;

    options.rootPassword = (
      await prompts({
        type: 'password',
        name: 'value',
        message: 'Enter root db password',
      })
    ).value;

    if (!options.force) {
      options.force = (
        await prompts({
          type: 'confirm',
          name: 'value',
          message: 'Recreate db if need',
        })
      ).value;
    }
  }

  if (!options.rootUser) {
    die('No --root-user argument');
  }

  const adapter = new PrismaMariaDb({
    host: dbConfig.host,
    port: dbConfig.port,
    ...(options.rootUser !== undefined && {
      user: options.rootUser,
    }),

    ...(options.rootPassword !== undefined && {
      password: options.rootPassword,
    }),
  });

  const prisma = new PrismaClient({ adapter });

  const coding = 'utf8mb4';
  const collation = 'utf8mb4_unicode_ci';

  let sqlLines: string[];

  if (options.force) {
    sqlLines = [
      `CREATE OR REPLACE DATABASE \`${dbConfig.database}\` CHARACTER SET ${coding} COLLATE ${collation}`,
      `DROP USER IF EXISTS '${dbConfig.username}'@'localhost'`,
      `CREATE USER '${dbConfig.username}'@'localhost' IDENTIFIED BY '${dbConfig.password}'`,
      `GRANT ALL PRIVILEGES ON  \`${dbConfig.database}\`.* TO '${dbConfig.username}'@'localhost'`,
      `FLUSH PRIVILEGES`,
    ];
  } else {
    sqlLines = [
      `CREATE DATABASE \`${dbConfig.database}\` CHARACTER SET ${coding} COLLATE ${collation}`,
      `CREATE USER '${dbConfig.username}'@'localhost' IDENTIFIED BY '${dbConfig.password}'`,
      `GRANT ALL PRIVILEGES ON  \`${dbConfig.database}\`.* TO '${dbConfig.username}'@'localhost'`,
      `FLUSH PRIVILEGES`,
    ];
  }

  if (options.dev) {
    sqlLines = [
      ...sqlLines,
      `CREATE OR REPLACE DATABASE \`${dbConfig.shadowDatabase}\` CHARACTER SET ${coding} COLLATE ${collation}`,
      `GRANT ALL PRIVILEGES ON  \`${dbConfig.shadowDatabase}\`.* TO '${dbConfig.username}'@'localhost'`,
    ];
  }

  for (const sql of sqlLines) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      die(err instanceof Error ? err.message.trim() : String(err));
    }
  }

  await prisma.$disconnect();

  // Always save new url to .env file
  setDefaultDotEnvOption('DATABASE_URL', options.url);
  if (options.dev) {
    setDefaultDotEnvOption('SHADOW_DATABASE_URL', options.shadowUrl);
    setDefaultDotEnvOption('ROOT_USER', options.rootUser || '');
    setDefaultDotEnvOption('ROOT_PASSWORD', options.rootPassword || '');
  }

  console.log('');
  console.log('Created empty database ' + chalk.bold(dbConfig.database));
  if (options.dev) {
    console.log(
      'Created shadow database ' + chalk.bold(dbConfig.shadowDatabase),
    );
  }
  console.log('Created user ' + chalk.bold(dbConfig.username));

  if (!('DROP_DATABASE' in process.env)) {
    console.log('You can manually add DROP_DATABASE=1 to the .env file.');
  }

  try {
    await applyMigrations();
  } catch (err) {
    die(err instanceof Error ? err.message.trim() : String(err));
  }
}

await main();
