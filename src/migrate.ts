#!/usr/bin/env node

import { runPrisma } from './prisma-cli.ts';

async function main(): Promise<void> {
  await runPrisma(['migrate', 'deploy', ...process.argv.slice(2)]);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
