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

// import { Server as HttpServer } from 'http';
//
// import { Server } from 'socket.io';
//
// import { RealtimeContext } from './realtime.context.js';
// import { authenticateSocket } from './realtime.auth.js';
//
// class RealtimeServer {
//   private static instance: RealtimeServer;
//   private io!: Server;
//
//   private constructor() {}
//
//   static getInstance(): RealtimeServer {
//     if (!RealtimeServer.instance) {
//       RealtimeServer.instance = new RealtimeServer();
//     }
//     return RealtimeServer.instance;
//   }
//
//   /**
//    * Initialisation Socket.IO
//    */
//   init(server: HttpServer): void {
//     this.io = new Server(server, {
//       cors: {
//         origin: '*', // à restreindre plus tard
//       },
//     });
//
//     this.io.use(async (socket, next) => {
//       try {
//         await authenticateSocket(socket);
//         next();
//       } catch (err: any) {
//         next(err);
//       }
//     });
//
//     this.io.on('connection', (socket) => {
//       const context = socket.data.context as RealtimeContext;
//
//       console.log('🔌 WS connecté', context);
//
//       // Rooms logiques
//       socket.join(`user:${context.userId}`);
//       socket.join(`role:${context.role}`);
//
//       if (context.tenantId) {
//         socket.join(`tenant:${context.tenantId}`);
//       }
//
//       socket.on('disconnect', (reason) => {
//         console.log('❌ WS déconnecté', context.userId, reason);
//       });
//     });
//
//     console.log('📡 RealtimeServer initialisé');
//   }
//
//   /**
//    * Émettre à un utilisateur précis
//    */
//   emitToUser(userId: number, event: string, payload: any): void {
//     this.io.to(`user:${userId}`).emit(event, payload);
//   }
//
//   /**
//    * Émettre à un tenant
//    */
//   emitToTenant(tenantId: string, event: string, payload: any): void {
//     this.io.to(`tenant:${tenantId}`).emit(event, payload);
//   }
//
//   /**
//    * Émettre à un rôle
//    */
//   emitToRole(role: string, event: string, payload: any): void {
//     this.io.to(`role:${role}`).emit(event, payload);
//   }
// }
//
// export const Realtime = RealtimeServer.getInstance();
