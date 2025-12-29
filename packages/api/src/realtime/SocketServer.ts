import { Server as HttpServer } from 'http';

import { Server as IOServer, Socket } from 'socket.io';

import { SocketAuth } from './SocketAuth.js';
import { MemoEventsService } from './MemoEventsService.js';

export class SocketServer {
  private static io: IOServer;

  static init(server: HttpServer) {
    this.io = new IOServer(server, {
      cors: {
        origin: '*', // à restreindre plus tard
        methods: ['GET', 'POST'],
      },
    });

    // 🔐 Middleware d'auth API Key
    this.io.use(SocketAuth.authenticate);

    // ⚡️ initialiser MemoEventsService avec IO
    MemoEventsService.init(this.io);

    this.io.on('connection', (socket: Socket) => {
      const client = socket.data.client;

      console.log(`🔌 Socket connecté : ${client.name}`);

      // enregistrer le socket
      MemoEventsService.register(socket);

      socket.on('disconnect', () => {
        console.log(`❌ Socket déconnecté : ${client.name}`);
      });
    });
  }

  static getIO(): IOServer {
    return this.io;
  }
}
