// Builds the Fastify HTTP and WebSocket app for the Tasks Tracker server.

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import websocket from '@fastify/websocket';
import fastify from 'fastify';

import type { ServerConfig } from './config.ts';
import { RpcConnection, RpcConnectionSet } from './rpc/rpc-connection.ts';
import { registerServerMethods } from './rpc/methods.ts';
import type { TaskRepository } from './tasks/types.ts';

interface AppDependencies {
  tasks: TaskRepository;
}

async function createApp(
  config: ServerConfig,
  dependencies: AppDependencies,
): Promise<ReturnType<typeof fastify>> {
  const app = fastify({
    logger: true,
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: config.corsOrigin,
  });
  await app.register(websocket);

  app.get('/health', async () => {
    return { ok: true };
  });

  const connections = new RpcConnectionSet();

  app.get('/ws', { websocket: true }, (socket) => {
    const connection = new RpcConnection(socket);
    connections.add(connection);
    registerServerMethods(connection, dependencies.tasks, connections);

    socket.on('message', (message) => {
      connection.receive(message.toString()).catch((error: unknown) => {
        app.log.error(error);
        socket.close(1011, 'RPC message handling failed');
      });
    });

    socket.on('close', () => {
      connections.delete(connection);
      connection.rejectAllPendingRequests('Connection closed');
    });
  });

  return app;
}

export type { AppDependencies };
export { createApp };
