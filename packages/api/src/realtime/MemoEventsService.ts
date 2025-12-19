import { Socket } from 'socket.io';

export class MemoEventsService {
  private static sockets = new Map<string, Socket>();

  static register(socket: Socket) {
    this.sockets.set(socket.id, socket);

    socket.on('disconnect', () => {
      this.sockets.delete(socket.id);
    });
  }

  // 🔊 Broadcast global
  static emit(event: string, payload: any) {
    for (const socket of this.sockets.values()) {
      socket.emit(event, payload);
    }
  }

  // 🎯 Ciblage par client applicatif
  static emitToClient(clientId: number, event: string, payload: any) {
    for (const socket of this.sockets.values()) {
      if (socket.data.client?.id === clientId) {
        socket.emit(event, payload);
      }
    }
  }
}
