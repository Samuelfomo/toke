import { randomUUID } from 'crypto';

import type { Server as IOServer, Socket } from 'socket.io';
import { io as createSocketClient, type Socket as ClientSocket } from 'socket.io-client';

import { getTenantApiBaseUrl } from '../tools/api.factory.js';
import { UserService } from './user.service.js';

export type MemoRealtimeAction =
  | 'created'
  | 'updated'
  | 'responded'
  | 'validated'
  | 'rejected'
  | 'revoked'
  | 'deleted'
  | 'escalated';

export interface MemoRealtimePayload {
  guid: string;
  action: MemoRealtimeAction;
  affectedUserGuids: string[];
  actorUserGuid?: string;
  occurredAt: string;
}

interface BridgeTicketRecord {
  ticket: string;
  reference: string;
  userGuid: string;
  upstreamTicket: string;
  upstreamExpiresAt: number;
  expiresAt: number;
}

interface UpstreamTicket {
  realtime_ticket: string;
  expires_at: string;
}

/**
 * Bridge temps réel :
 *
 * navigateur <-> BFF Socket.IO <-> API tenant Socket.IO
 *
 * Le navigateur ne connaît jamais l'URL Socket.IO de l'API tenant ni son ticket.
 */
export class MemoSocketBridgeService {
  private static io: IOServer | null = null;
  private static tickets = new Map<string, BridgeTicketRecord>();
  private static upstreamSockets = new Set<ClientSocket>();

  private static readonly BRIDGE_TICKET_TTL_MS = 30 * 60 * 1000;
  private static readonly NAMESPACE = '/memo-realtime';

  static init(io: IOServer): void {
    this.io = io;

    const namespace = io.of(this.NAMESPACE);

    namespace.use((socket, next) => {
      try {
        const ticketValue = socket.handshake.auth?.realtimeTicket;
        if (typeof ticketValue !== 'string' || !ticketValue) {
          return next(new Error('memo_bridge_ticket_required'));
        }

        const ticket = this.validateBridgeTicket(ticketValue);
        if (!ticket) {
          return next(new Error('memo_bridge_ticket_invalid'));
        }

        socket.data.memoBridge = ticket;
        next();
      } catch (error) {
        console.error('❌ MemoSocketBridge auth error:', error);
        next(new Error('memo_bridge_auth_failed'));
      }
    });

    namespace.on('connection', (socket) => {
      void this.attachUpstream(socket);
    });

    console.log(`✅ MemoSocketBridgeService initialisé (${this.NAMESPACE})`);
  }

  static async createBridgeTicket(
    reference: string,
    userGuid: string,
  ): Promise<{ realtime_ticket: string; expires_at: string }> {
    this.cleanupExpiredTickets();

    const upstream = await this.requestUpstreamTicket(reference, userGuid);
    const now = Date.now();
    const upstreamExpiresAt = Date.parse(upstream.expires_at);

    if (!Number.isFinite(upstreamExpiresAt) || upstreamExpiresAt <= now) {
      throw new Error('memo_upstream_ticket_expired');
    }

    const expiresAt = Math.min(
      upstreamExpiresAt,
      now + this.BRIDGE_TICKET_TTL_MS,
    );

    const ticket = randomUUID();

    this.tickets.set(ticket, {
      ticket,
      reference,
      userGuid,
      upstreamTicket: upstream.realtime_ticket,
      upstreamExpiresAt,
      expiresAt,
    });

    return {
      realtime_ticket: ticket,
      expires_at: new Date(expiresAt).toISOString(),
    };
  }

  private static validateBridgeTicket(ticket: string): BridgeTicketRecord | null {
    this.cleanupExpiredTickets();

    const record = this.tickets.get(ticket);
    if (!record || record.expiresAt <= Date.now()) {
      if (record) this.tickets.delete(ticket);
      return null;
    }

    return record;
  }

  private static async attachUpstream(frontendSocket: Socket): Promise<void> {
    const record = frontendSocket.data.memoBridge as BridgeTicketRecord | undefined;

    if (!record) {
      frontendSocket.disconnect(true);
      return;
    }

    try {
      const apiUrl = await getTenantApiBaseUrl(record.reference);
      const upstreamPath = process.env.TENANT_SOCKET_PATH || '/socket.io';

      const upstream = createSocketClient(apiUrl, {
        path: upstreamPath,
        autoConnect: false,
        auth: {
          realtimeTicket: record.upstreamTicket,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });

      this.upstreamSockets.add(upstream);

      let refreshingTicket = false;
      let hasUpstreamConnectedOnce = false;

      upstream.on('connect', () => {
        const reconnected = hasUpstreamConnectedOnce;
        hasUpstreamConnectedOnce = true;

        frontendSocket.emit('memo:bridge-status', {
          connected: true,
          reconnected,
        });
      });

      upstream.on('memo:changed', (payload: MemoRealtimePayload) => {
        if (
          Array.isArray(payload?.affectedUserGuids) &&
          payload.affectedUserGuids.includes(record.userGuid)
        ) {
          frontendSocket.emit('memo:changed', payload);
        }
      });

      upstream.on('disconnect', (reason) => {
        frontendSocket.emit('memo:bridge-status', {
          connected: false,
          reason,
        });
      });

      upstream.on('connect_error', async (error: Error) => {
        if (error.message === 'realtime_ticket_invalid' && !refreshingTicket) {
          refreshingTicket = true;

          try {
            const refreshed = await this.requestUpstreamTicket(
              record.reference,
              record.userGuid,
            );

            record.upstreamTicket = refreshed.realtime_ticket;
            record.upstreamExpiresAt = Date.parse(refreshed.expires_at);
            upstream.auth = {
              realtimeTicket: record.upstreamTicket,
            };

            upstream.connect();
            return;
          } catch (refreshError: any) {
            console.error('❌ Refresh ticket memo upstream impossible:', refreshError);
            frontendSocket.emit('memo:bridge-error', {
              code: 'memo_upstream_ticket_refresh_failed',
              message: refreshError?.message || 'Unable to refresh realtime ticket',
            });
          } finally {
            refreshingTicket = false;
          }
        }

        frontendSocket.emit('memo:bridge-error', {
          code: error.message || 'memo_upstream_connection_failed',
          message: error.message || 'Unable to connect to tenant realtime API',
        });
      });

      frontendSocket.once('disconnect', () => {
        upstream.removeAllListeners();
        upstream.disconnect();
        this.upstreamSockets.delete(upstream);
      });

      upstream.connect();
    } catch (error: any) {
      console.error('❌ MemoSocketBridge upstream error:', error);

      frontendSocket.emit('memo:bridge-error', {
        code: 'memo_bridge_upstream_failed',
        message: error?.message || 'Unable to initialize memo realtime bridge',
      });
    }
  }

  private static async requestUpstreamTicket(
    reference: string,
    userGuid: string,
  ): Promise<UpstreamTicket> {
    const response = await UserService.createMemoRealtimeTicket(reference, userGuid);

    if (!response || response.status < 200 || response.status >= 300) {
      const message =
        response?.data?.error?.message ||
        response?.data?.message ||
        'Tenant API refused realtime ticket';

      throw new Error(message);
    }

    const data = response.data?.data ?? response.data;
    if (!data?.realtime_ticket || !data?.expires_at) {
      throw new Error('Invalid realtime ticket response from tenant API');
    }

    return {
      realtime_ticket: data.realtime_ticket,
      expires_at: data.expires_at,
    };
  }

  private static cleanupExpiredTickets(): void {
    const now = Date.now();
    for (const [ticket, record] of this.tickets.entries()) {
      if (record.expiresAt <= now) {
        this.tickets.delete(ticket);
      }
    }
  }

  static shutdown(): void {
    for (const socket of this.upstreamSockets) {
      socket.removeAllListeners();
      socket.disconnect();
    }

    this.upstreamSockets.clear();
    this.tickets.clear();
    this.io = null;

    console.log('✅ MemoSocketBridgeService arrêté');
  }
}
