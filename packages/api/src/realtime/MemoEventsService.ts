import { Server as IOServer, Socket } from 'socket.io';

export class MemoEventsService {
  // stocke la référence au serveur Socket.IO pour gérer les rooms
  private static io: IOServer;

  // initialiser avec le serveur IO
  static init(io: IOServer) {
    this.io = io;
  }

  /**
   * Enregistrement d'un socket
   * Chaque socket rejoint une room correspondant à son client
   */
  static register(socket: Socket) {
    const clientId = socket.data.client?.id;
    if (!clientId) return;

    // chaque client a sa room dédiée
    const roomName = `client-${clientId}`;
    socket.join(roomName);

    socket.on('disconnect', () => {
      console.log(`🔌 Socket déconnecté (room: ${roomName})`);
    });
  }

  /**
   * Broadcast global (tous les sockets)
   */
  static emit(event: string, payload: any) {
    this.io.emit(event, payload);
  }

  /**
   * Émettre un événement à tous les sockets d'un client spécifique
   */
  static emitToClient(clientId: number, event: string, payload: any) {
    const roomName = `client-${clientId}`;
    this.io.to(roomName).emit(event, payload);
  }

  /**
   * Optionnel : émettre à un socket précis
   */
  static emitToSocket(socketId: string, event: string, payload: any) {
    this.io.to(socketId).emit(event, payload);
  }
}
