// Wraps a WebSocket with bidirectional JSON-RPC request and event handling.

import {
  JSONRPCClient,
  JSONRPCServer,
  JSONRPCServerAndClient,
} from 'json-rpc-2.0';
import type { TypedJSONRPCServerAndClient } from 'json-rpc-2.0';
import type { WebSocket } from 'ws';

import type {
  ClientRpcMethods,
  RpcServerParams,
  ServerRpcEvents,
  ServerRpcMethods,
} from './methods.ts';

type ServerMethodName = keyof ServerRpcMethods & string;
type ClientMethodName = keyof ClientRpcMethods & string;
type ServerEventName = keyof ServerRpcEvents & string;
type OutgoingClientRpcContract = ClientRpcMethods & ServerRpcEvents;

type ClientMethodParams<Name extends ClientMethodName> = Parameters<
  ClientRpcMethods[Name]
>[0];
type ClientMethodResult<Name extends ClientMethodName> = ReturnType<
  ClientRpcMethods[Name]
>;
type RpcRequest = <Name extends ClientMethodName>(
  name: Name,
  params: ClientMethodParams<Name>,
  clientParams: void,
) => PromiseLike<ClientMethodResult<Name>>;
type ServerEventParams<Name extends ServerEventName> = Parameters<
  ServerRpcEvents[Name]
>[0];

interface ServerEventEmitter {
  emitEvent<Name extends ServerEventName>(
    name: Name,
    params: ServerEventParams<Name>,
  ): void;
}

class RpcConnection implements ServerEventEmitter {
  private static nextConnectionNumber = 1;

  clientId: string | undefined;

  private readonly connectionNumber = RpcConnection.nextConnectionNumber++;
  private readonly rpc: TypedJSONRPCServerAndClient<
    ServerRpcMethods,
    OutgoingClientRpcContract,
    RpcServerParams,
    void
  >;

  constructor(private readonly socket: WebSocket) {
    this.rpc = new JSONRPCServerAndClient(
      new JSONRPCServer({
        errorListener: () => undefined,
      }),
      new JSONRPCClient((request) => {
        this.logJsonRpcObject('out', request);
        this.socket.send(JSON.stringify(request));
      }),
      {
        errorListener: () => undefined,
      },
    );
  }

  addMethod<Name extends ServerMethodName>(
    name: Name,
    method: (
      params: Parameters<ServerRpcMethods[Name]>[0],
      serverParams: RpcServerParams,
    ) =>
      | ReturnType<ServerRpcMethods[Name]>
      | PromiseLike<ReturnType<ServerRpcMethods[Name]>>,
  ): void {
    this.rpc.addMethod(name, method);
  }

  async receive(payload: string): Promise<void> {
    const parsedPayload = JSON.parse(payload);
    this.logJsonRpcPayload('in', parsedPayload);

    await this.rpc.receiveAndSend(
      parsedPayload,
      { connection: this },
      undefined,
    );
  }

  request<Name extends ClientMethodName>(
    name: Name,
    params: ClientMethodParams<Name>,
  ): PromiseLike<ClientMethodResult<Name>> {
    const request = this.rpc.request.bind(this.rpc) as RpcRequest;
    return request(name, params, undefined);
  }

  emitEvent<Name extends ServerEventName>(
    name: Name,
    params: ServerEventParams<Name>,
  ): void {
    this.rpc.notify(name, params, undefined);
  }

  rejectAllPendingRequests(message: string): void {
    this.rpc.rejectAllPendingRequests(message);
  }

  private logJsonRpcPayload(direction: 'in' | 'out', payload: unknown): void {
    if (Array.isArray(payload)) {
      for (const item of payload) {
        this.logJsonRpcObject(direction, item);
      }
      return;
    }

    this.logJsonRpcObject(direction, payload);
  }

  private logJsonRpcObject(direction: 'in' | 'out', payload: unknown): void {
    const prefix = direction == 'in' ? '<-' : '->';
    const kind = jsonRpcKind(payload);

    console.log(
      `${kind.emoji} JSON-RPC ${this.connectionLabel} ${prefix} ${kind.label}`,
    );
    console.log(JSON.stringify(payload, null, 2));
  }

  private get connectionLabel(): string {
    if (this.clientId == undefined) {
      return `connection ${this.connectionNumber}`;
    }

    return `connection ${this.connectionNumber} (${this.clientId})`;
  }
}

class RpcConnectionSet implements ServerEventEmitter {
  private readonly connections = new Set<RpcConnection>();

  add(connection: RpcConnection): void {
    this.connections.add(connection);
  }

  delete(connection: RpcConnection): void {
    this.connections.delete(connection);
  }

  emitEvent<Name extends ServerEventName>(
    name: Name,
    params: ServerEventParams<Name>,
  ): void {
    for (const connection of this.connections) {
      connection.emitEvent(name, params);
    }
  }
}

function jsonRpcKind(payload: unknown): { emoji: string; label: string } {
  if (typeof payload != 'object' || payload == null) {
    return { emoji: '❓', label: 'unknown' };
  }

  if ('result' in payload || 'error' in payload) {
    return { emoji: '✅', label: 'response' };
  }

  if ('method' in payload && 'id' in payload) {
    return { emoji: '➡️', label: 'request' };
  }

  if ('method' in payload) {
    return { emoji: '🔔', label: 'event' };
  }

  return { emoji: '❓', label: 'unknown' };
}

export type { ServerEventEmitter };
export { RpcConnection, RpcConnectionSet };
