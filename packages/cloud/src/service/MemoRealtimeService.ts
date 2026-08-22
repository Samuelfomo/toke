import { io, type Socket } from 'socket.io-client';

import axiosClient from '@/tools/Fetch.Client';
import MemoService from '@/service/MemoService';

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

interface MemoRealtimeCallbacks {
  onChange: (payload: MemoRealtimePayload) => void | Promise<void>;
  onReconnect?: () => void | Promise<void>;
  onConnectionChange?: (connected: boolean) => void;
}

export default class MemoRealtimeService {
  private static socket: Socket | null = null;
  private static userGuid: string | null = null;
  private static callbacks: MemoRealtimeCallbacks | null = null;
  private static refreshTicketPromise: Promise<void> | null = null;
  private static hasConnectedOnce = false;

  private static getSocketUrl(): string {
    const configured =
      (import.meta.env.VITE_BFF_SOCKET_URL as string | undefined) ||
      (import.meta.env.VITE_SOCKET_URL as string | undefined);

    if (configured) return configured.replace(/\/+$/, '');

    const apiBase = axiosClient.defaults.baseURL;
    if (apiBase) {
      try {
        return new URL(apiBase, window.location.origin).origin;
      } catch {
        // same-origin fallback
      }
    }

    return window.location.origin;
  }

  private static getSocketPath(): string {
    const configured =
      (import.meta.env.VITE_BFF_SOCKET_PATH as string | undefined) ||
      (import.meta.env.VITE_SOCKET_PATH as string | undefined);

    if (configured) return configured;

    const apiBase = axiosClient.defaults.baseURL;
    if (apiBase) {
      try {
        const parsed = new URL(apiBase, window.location.origin);
        const basePath = parsed.pathname.replace(/\/+$/, '');

        if (basePath && basePath !== '/') {
          return `${basePath}/socket.io`;
        }
      } catch {
        // same-origin fallback
      }
    }

    return '/socket.io';
  }

  static async connect(userGuid: string, callbacks: MemoRealtimeCallbacks): Promise<void> {
    this.callbacks = callbacks;

    if (this.socket && this.userGuid === userGuid) {
      if (!this.socket.connected) this.socket.connect();
      return;
    }

    this.disconnect();
    this.userGuid = userGuid;
    this.callbacks = callbacks;
    this.hasConnectedOnce = false;

    const ticket = await MemoService.createRealtimeTicket(userGuid);
    const namespaceUrl = `${this.getSocketUrl()}/memo-realtime`;

    const socket = io(namespaceUrl, {
      path: this.getSocketPath(),
      autoConnect: false,
      auth: {
        realtimeTicket: ticket.realtime_ticket,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this.socket = socket;

    socket.on('connect', async () => {
      const reconnect = this.hasConnectedOnce;
      this.hasConnectedOnce = true;
      this.callbacks?.onConnectionChange?.(true);

      if (reconnect) {
        await this.callbacks?.onReconnect?.();
      }
    });

    socket.on('disconnect', () => {
      this.callbacks?.onConnectionChange?.(false);
    });

    socket.on('memo:changed', async (payload: MemoRealtimePayload) => {
      await this.callbacks?.onChange(payload);
    });

    socket.on(
      'memo:bridge-status',
      async (status: { connected?: boolean; reconnected?: boolean }) => {
        if (status?.connected === false) {
          this.callbacks?.onConnectionChange?.(false);
          return;
        }

        if (status?.connected === true) {
          this.callbacks?.onConnectionChange?.(true);

          // Le navigateur peut rester connecté au BFF pendant que le lien
          // BFF -> API tenant se coupe. Une reconnexion upstream implique
          // donc une resynchronisation REST unique pour rattraper les événements perdus.
          if (status.reconnected) {
            await this.callbacks?.onReconnect?.();
          }
        }
      },
    );

    socket.on('connect_error', async (error: Error) => {
      this.callbacks?.onConnectionChange?.(false);

      if (
        error.message === 'memo_bridge_ticket_invalid' ||
        error.message === 'memo_bridge_ticket_required'
      ) {
        await this.refreshTicketAndReconnect();
      }
    });

    socket.connect();
  }

  private static async refreshTicketAndReconnect(): Promise<void> {
    if (!this.socket || !this.userGuid) return;
    if (this.refreshTicketPromise) return this.refreshTicketPromise;

    this.refreshTicketPromise = (async () => {
      try {
        const ticket = await MemoService.createRealtimeTicket(this.userGuid!);

        if (!this.socket) return;

        this.socket.auth = {
          realtimeTicket: ticket.realtime_ticket,
        };

        this.socket.connect();
      } finally {
        this.refreshTicketPromise = null;
      }
    })();

    return this.refreshTicketPromise;
  }

  static disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.socket = null;
    this.userGuid = null;
    this.callbacks = null;
    this.refreshTicketPromise = null;
    this.hasConnectedOnce = false;
  }

  static isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }
}
