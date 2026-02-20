import { Server as HttpServer } from 'http';

import { Server as IOServer, Socket } from 'socket.io';

import { SocketAuth } from './SocketAuth.js';
import { MemoEventsService } from './MemoEventsService.js';
import { QRSocketService } from './services/qr-socket.service.js'; // 🆕 IMPORT

export class SocketServer {
  private static io: IOServer;

  static init(server: HttpServer) {
    this.io = new IOServer(server, {
      cors: {
        origin: '*', // à restreindre plus tard
        methods: ['GET', 'POST'],
      },
    });

    // ============================================
    // 🔐 NAMESPACE PRINCIPAL (avec auth API Key)
    // ============================================
    // this.io.use(SocketAuth.authenticate);

    const mainNamespace = this.io.of('/');

    console.log(`🔌 Socket ici`);
    mainNamespace.use(SocketAuth.authenticate); // ✅ seulement sur "/"

    // ⚡️ Initialiser MemoEventsService avec IO
    MemoEventsService.init(this.io);

    // this.io.on('connection', (socket: Socket) => {
    //   const client = socket.data.client;
    //
    //   console.log(`🔌 Socket connecté : ${client.name}`);
    //
    //   // Enregistrer le socket
    //   MemoEventsService.register(socket);
    //
    //   socket.on('disconnect', () => {
    //     console.log(`❌ Socket déconnecté : ${client.name}`);
    //   });
    // });

    mainNamespace.on('connection', (socket: Socket) => {
      const client = socket.data.client;

      console.log(`🔌 Socket connecté : ${client}`);

      // ✅ Guard : ignorer les sockets sans client (ex: /qr-auth)
      if (!client) return;

      console.log(`🔌 Socket connecté : ${client.name}`);
      MemoEventsService.register(socket);

      socket.on('disconnect', () => {
        console.log(`❌ Socket déconnecté : ${client.name}`);
      });
    });

    // ============================================
    // 🆕 NAMESPACE QR AUTH (sans auth API Key)
    // ============================================
    QRSocketService.init(this.io);

    console.log('✅ SocketServer initialisé (namespaces: /, /qr-auth)');
  }

  static getIO(): IOServer {
    return this.io;
  }

  // 🆕 Méthode pour arrêt propre
  static shutdown(): void {
    QRSocketService.shutdown();

    if (this.io) {
      this.io.close();
      console.log('✅ SocketServer fermé');
    }
  }
}
