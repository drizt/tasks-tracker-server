import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

function getPackageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function getPrismaConfigPath(): string {
  return path.join(getPackageRoot(), 'prisma.config.ts');
}

async function runPrisma(args: string[]): Promise<void> {
  const prismaCliPath = require.resolve('prisma/build/index.js');
  const configArgs = ['--config', getPrismaConfigPath()];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [prismaCliPath, ...args, ...configArgs],
      {
        cwd: process.cwd(),
        stdio: 'inherit',
      },
    );

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code == 0) {
        resolve();
      } else {
        reject(new Error(`prisma ${args.join(' ')} exited with ${code}`));
      }
    });
  });
}

export { getPackageRoot, getPrismaConfigPath, runPrisma };
