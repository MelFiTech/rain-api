import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

export const WALLET_FUND_SESSION_PAID_EVENT = 'wallet:fund_session_paid';

export interface WalletFundSessionPaidPayload {
  sessionId: string;
}

@Injectable()
export class WalletRealtimeService {
  private server?: Server;

  bindServer(server: Server) {
    this.server = server;
  }

  notifyFundSessionPaid(institutionId: string, sessionId: string) {
    if (!this.server) return;
    const payload: WalletFundSessionPaidPayload = { sessionId };
    this.server
      .to(this.institutionRoom(institutionId))
      .emit(WALLET_FUND_SESSION_PAID_EVENT, payload);
  }

  institutionRoom(institutionId: string) {
    return `institution:${institutionId}`;
  }
}
