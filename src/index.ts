import { readConfigInput, readServerConfig } from './config.ts';

async function main(): Promise<void> {
  const config = readServerConfig(await readConfigInput());
  console.log(config);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
