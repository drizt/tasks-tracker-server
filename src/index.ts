import { readConfigInput, readServerConfig } from './config.ts';
import { createPrismaClient } from './db/prisma.ts';
import { createApp } from './server.ts';
import { PrismaTaskRepository } from './tasks/prisma-task-repository.ts';

async function main(): Promise<void> {
  const config = readServerConfig(await readConfigInput());
  const prisma = createPrismaClient(config.databaseUrl);
  const app = await createApp(config, {
    tasks: new PrismaTaskRepository(prisma),
  });
  let isClosing = false;

  async function close(): Promise<void> {
    if (isClosing) {
      return;
    }

    isClosing = true;
    await app.close();
    await prisma.$disconnect();
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void close().then(
        () => {
          process.exit(0);
        },
        (error: unknown) => {
          app.log.error(error);
          process.exit(1);
        },
      );
    });
  }

  try {
    await app.listen({
      host: config.host,
      port: config.port,
    });
  } catch (error: unknown) {
    await prisma.$disconnect();
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
