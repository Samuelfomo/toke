import { randomUUID } from 'node:crypto';
import type { Namespace, Server, Socket } from 'socket.io';

interface MemoState {
  revision: string;
  unreadTotal: number;
}

interface Ticket {
  readState: () => Promise<MemoState>;
  expiresAt: number;
}

const TICKET_TTL = 30_000;
const LEASE_TTL = 5 * 60_000;
const INTERVAL = 6_000;
const MAX_TICKETS = 2048;

function validateState(state: MemoState): MemoState {
  if (typeof state?.revision !== 'string' || state.revision.length > 100 ||
      !Number.isSafeInteger(state.unreadTotal) || state.unreadTotal < 0)
    throw new Error('memo_realtime_invalid_state');
  return { revision: state.revision, unreadTotal: state.unreadTotal };
}

/** Browser namespace. Each subscription reuses the issuing request's verified
 * proof and gets its own ACL-scoped snapshot from the Tenant API. */
export class MemoSocketBridgeService {
  private static namespace: Namespace | null = null;
  private static tickets = new Map<string, Ticket>();

  static init(io: Server): void {
    this.namespace = io.of('/memo-realtime');
    this.namespace.use((socket, next) => {
      const value = socket.handshake.auth?.realtimeTicket;
      const ticket = typeof value === 'string' ? this.tickets.get(value) : undefined;
      if (!ticket || ticket.expiresAt <= Date.now()) return next(new Error('memo_bridge_ticket_invalid'));
      this.tickets.delete(value);
      socket.data.memoTicket = ticket;
      next();
    });
    this.namespace.on('connection', socket => {
      const ticket = socket.data.memoTicket as Ticket;
      delete socket.data.memoTicket;
      this.subscribe(socket, ticket);
    });
  }

  static async createBridgeTicket(readState: Ticket['readState']) {
    if (!this.namespace || this.namespace.sockets.size >= MAX_TICKETS)
      throw new Error('memo_realtime_unavailable');
    validateState(await readState());
    for (const [key, ticket] of this.tickets) {
      if (ticket.expiresAt <= Date.now()) this.tickets.delete(key);
    }
    if (this.tickets.size >= MAX_TICKETS) throw new Error('memo_realtime_unavailable');
    const value = randomUUID();
    const expiresAt = Date.now() + TICKET_TTL;
    this.tickets.set(value, { readState, expiresAt });
    setTimeout(() => this.tickets.delete(value), TICKET_TTL).unref();
    return { realtime_ticket: value, expires_at: new Date(expiresAt).toISOString() };
  }

  private static subscribe(socket: Socket, ticket: Ticket): void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastRevision: string | undefined;
    let healthy = false;
    const lease = setTimeout(() => socket.disconnect(), LEASE_TTL);
    socket.once('disconnect', () => {
      clearTimeout(timer);
      clearTimeout(lease);
    });

    const scan = async () => {
      try {
        const state = validateState(await ticket.readState());
        if (!socket.connected) return;
        if (!healthy) socket.emit('memo:bridge-status', { connected: true, reconnected: lastRevision !== undefined });
        healthy = true;
        if (state.revision !== lastRevision) {
          lastRevision = state.revision;
          socket.emit('memo:changed', state);
        }
      } catch (error) {
        if (!socket.connected) return;
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) {
          socket.disconnect();
          return;
        }
        if (healthy) socket.emit('memo:bridge-status', { connected: false });
        healthy = false;
      }
      if (socket.connected) timer = setTimeout(() => { void scan(); }, INTERVAL);
    };
    void scan();
  }

  static shutdown(): void {
    this.namespace?.disconnectSockets();
    this.namespace = null;
    this.tickets.clear();
  }
}
