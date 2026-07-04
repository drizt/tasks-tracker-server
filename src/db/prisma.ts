// Creates Prisma clients configured for the server database connection.

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../generated/prisma/client.ts';

function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaMariaDb(databaseUrl),
  });
}

export { createPrismaClient };
