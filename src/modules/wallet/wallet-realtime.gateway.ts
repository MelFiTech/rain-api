import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  LoginSessionRepository,
  UserRepository,
} from '../../persistence';
import type { JwtPayload } from '../auth/jwt.strategy';
import { WalletRealtimeService } from './wallet-realtime.service';

@Injectable()
@WebSocketGateway({
  namespace: '/platform/realtime',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class WalletRealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WalletRealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly loginSessions: LoginSessionRepository,
    private readonly users: UserRepository,
    private readonly walletRealtime: WalletRealtimeService,
  ) {}

  afterInit(server: Server) {
    this.walletRealtime.bindServer(server);
  }

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      const session = await this.loginSessions.findById(payload.sid);
      if (!session || session.userId !== payload.sub) {
        client.disconnect(true);
        return;
      }
      const user = await this.users.findById(payload.sub);
      if (!user || user.institutionId !== payload.institutionId) {
        client.disconnect(true);
        return;
      }

      await client.join(
        this.walletRealtime.institutionRoom(user.institutionId),
      );
      client.data.institutionId = user.institutionId;
      client.data.userId = user.id;
    } catch (error) {
      this.logger.debug(
        `Realtime connection rejected: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    void client;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim()) {
      return queryToken.trim();
    }
    return null;
  }
}
