import { randomUUID } from 'crypto';

import { Server as IOServer, Socket } from 'socket.io';

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

interface RealtimeTicketClient {
  id: number;
  name?: string;
  token?: string;
  active?: boolean;
  profile?: number | string;
  isRoot?: boolean;
}

interface RealtimeTicketRecord {
  ticket: string;
  client: RealtimeTicketClient;
  userGuid: string;
  expiresAt: number;
}

export class MemoEventsService {
  private static io: IOServer;
  private static tickets = new Map<string, RealtimeTicketRecord>();
  private static readonly TICKET_TTL_MS = 30 * 60 * 1000;

  static init(io: IOServer) {
    this.io = io;
  }

  static createRealtimeTicket(
    client: RealtimeTicketClient,
    userGuid: string,
  ): {
    ticket: string;
    expiresAt: string;
  } {
    this.cleanupExpiredTickets();

    const ticket = randomUUID();
    const expiresAt = Date.now() + this.TICKET_TTL_MS;

    this.tickets.set(ticket, {
      ticket,
      client,
      userGuid,
      expiresAt,
    });

    return {
      ticket,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  static validateRealtimeTicket(ticket: string): RealtimeTicketRecord | null {
    this.cleanupExpiredTickets();

    const record = this.tickets.get(ticket);
    if (!record || record.expiresAt <= Date.now()) {
      if (record) this.tickets.delete(ticket);
      return null;
    }

    return record;
  }

  /**
   * Enregistre un socket authentifié.
   * Le socket rejoint la room tenant/client et, si disponible, sa room utilisateur.
   */
  static register(socket: Socket) {
    const clientId = socket.data.client?.id;
    if (!clientId) return;

    const clientRoom = this.clientRoom(clientId);
    socket.join(clientRoom);

    const userGuid = socket.data.userGuid as string | undefined;
    const userRoom = userGuid ? this.userRoom(clientId, userGuid) : null;
    if (userRoom) socket.join(userRoom);

    socket.on('disconnect', () => {
      console.log(
        `🔌 Socket déconnecté (client: ${clientId}${userGuid ? `, user: ${userGuid}` : ''})`,
      );
    });
  }

  static emit(event: string, payload: any) {
    this.io?.emit(event, payload);
  }

  static emitToClient(clientId: number, event: string, payload: any) {
    if (!this.io) return;
    this.io.to(this.clientRoom(clientId)).emit(event, payload);
  }

  static emitToUser(clientId: number, userGuid: string, event: string, payload: any) {
    if (!this.io) return;
    this.io.to(this.userRoom(clientId, userGuid)).emit(event, payload);
  }

  /**
   * Émet une invalidation légère uniquement vers les utilisateurs concernés.
   * Aucun memo_content ni pièce jointe n'est poussé dans le socket.
   */
  static emitMemoChanged(clientId: number, payload: MemoRealtimePayload): void {
    if (!this.io) return;

    const uniqueUsers = [...new Set(payload.affectedUserGuids.filter(Boolean))];
    for (const userGuid of uniqueUsers) {
      this.emitToUser(clientId, userGuid, 'memo:changed', {
        ...payload,
        affectedUserGuids: uniqueUsers,
      });
    }
  }

  static emitToSocket(socketId: string, event: string, payload: any) {
    if (!this.io) return;
    this.io.to(socketId).emit(event, payload);
  }

  private static cleanupExpiredTickets(): void {
    const now = Date.now();
    for (const [ticket, record] of this.tickets.entries()) {
      if (record.expiresAt <= now) this.tickets.delete(ticket);
    }
  }

  private static clientRoom(clientId: number): string {
    return `client-${clientId}`;
  }

  private static userRoom(clientId: number, userGuid: string): string {
    return `client-${clientId}-user-${userGuid}`;
  }
}

// import { Server as IOServer, Socket } from 'socket.io';
//
// export class MemoEventsService {
//   // stocke la référence au serveur Socket.IO pour gérer les rooms
//   private static io: IOServer;
//
//   // initialiser avec le serveur IO
//   static init(io: IOServer) {
//     this.io = io;
//   }
//
//   /**
//    * Enregistrement d'un socket
//    * Chaque socket rejoint une room correspondant à son client
//    */
//   static register(socket: Socket) {
//     const clientId = socket.data.client?.id;
//     if (!clientId) return;
//
//     // chaque client a sa room dédiée
//     const roomName = `client-${clientId}`;
//     socket.join(roomName);
//
//     socket.on('disconnect', () => {
//       console.log(`🔌 Socket déconnecté (room: ${roomName})`);
//     });
//   }
//
//   /**
//    * Broadcast global (tous les sockets)
//    */
//   static emit(event: string, payload: any) {
//     this.io.emit(event, payload);
//   }
//
//   /**
//    * Émettre un événement à tous les sockets d'un client spécifique
//    */
//   static emitToClient(clientId: number, event: string, payload: any) {
//     const roomName = `client-${clientId}`;
//     this.io.to(roomName).emit(event, payload);
//   }
//
//   /**
//    * Optionnel : émettre à un socket précis
//    */
//   static emitToSocket(socketId: string, event: string, payload: any) {
//     this.io.to(socketId).emit(event, payload);
//   }
// }
