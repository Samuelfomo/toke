import { Server as IOServer, Socket } from 'socket.io';

import AuthCacheService from '../../tools/auth.cache.service.js';

/**
 * Service d'événements QR utilisant Socket.IO
 *
 * Contrairement au WebSocket brut, ce service s'intègre
 * dans votre infrastructure Socket.IO existante.
 *
 * Pattern : EventEmitter sur un namespace dédié "/qr-auth"
 */
export class QRSocketService {
  private static io: IOServer;
  private static connections: Map<string, Socket> = new Map();
  private static pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialise le namespace QR Auth dans Socket.IO existant
   * @param io - Instance Socket.IO (depuis SocketServer.getIO())
   */
  public static init(io: IOServer): void {
    this.io = io;

    // Créer un namespace dédié (pas d'auth API Key ici)
    const qrNamespace = io.of('/qr-auth');
    // const qrNamespace = io.of('/qr-auth');

    qrNamespace.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    console.log('✅ QR Socket Service initialisé sur namespace /qr-auth');
  }

  /**
   * Notifie manuellement un navigateur (optionnel)
   */
  public static notifyAuthentication(sessionId: string, token: string, userInfo: any): void {
    const socket = this.connections.get(sessionId);

    if (socket) {
      socket.emit('authenticated', {
        token,
        user: userInfo,
      });

      socket.disconnect();
      this.handleDisconnect(sessionId);

      console.log(`✅ Notification manuelle envoyée pour session ${sessionId}`);
    } else {
      console.log(`⚠️ Aucune connexion active pour session ${sessionId}`);
    }
  }

  /**
   * Arrête proprement le service
   */
  public static shutdown(): void {
    // Fermer toutes les connexions
    this.connections.forEach((socket, sessionId) => {
      socket.emit('server-shutdown', {
        message: 'Server is shutting down',
      });
      socket.disconnect();
    });

    // Arrêter tous les intervals
    this.pollingIntervals.forEach((interval) => {
      clearInterval(interval);
    });

    this.connections.clear();
    this.pollingIntervals.clear();

    console.log('👋 QR Socket Service arrêté');
  }

  /**
   * Statistiques
   */
  public static getStats(): {
    activeConnections: number;
    connections: Array<{ sessionId: string }>;
  } {
    const connections: Array<{ sessionId: string }> = [];

    this.connections.forEach((socket, sessionId) => {
      connections.push({ sessionId });
    });

    return {
      activeConnections: this.connections.size,
      connections,
    };
  }

  /**
   * Gère une nouvelle connexion navigateur
   */
  private static handleConnection(socket: Socket): void {
    const { sessionId } = socket.handshake.query;

    if (!sessionId || typeof sessionId !== 'string') {
      socket.emit('error', { message: 'sessionId required' });
      // socket.disconnect();
      return;
    }

    // Vérifier que la session existe
    AuthCacheService.getSession(sessionId).then((session) => {
      if (!session) {
        socket.emit('error', { message: 'Invalid session' });
        // socket.disconnect();
        return;
      }

      // Enregistrer la connexion
      this.connections.set(sessionId, socket);

      console.log(`✅ Navigateur connecté pour session ${sessionId}`);
      console.log(`📊 Connexions QR actives: ${this.connections.size}`);

      // socket.on('send-message', (data) => {
      //   console.log('📩 Message reçu:', data)
      //
      //   // envoyer à tous les clients
      //   socket.emit(sessionId, data)
      // })

      // Envoyer confirmation
      socket.emit('connected', {
        sessionId,
        message: 'Waiting for mobile authentication',
      });
      // socket.emit(sessionId, {
      //   sessionId,
      //   message: 'Waiting for mobile authentication',
      // });

      // Gérer la déconnexion
      socket.on('disconnect', () => {
        this.handleDisconnect(sessionId);
      });

      // Gérer le ping (optionnel)
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Démarrer le polling du statut
      this.startStatusPolling(sessionId, socket);
    });
  }

  /**
   * Gère la déconnexion d'un navigateur
   */
  private static handleDisconnect(sessionId: string): void {
    this.connections.delete(sessionId);

    // Arrêter le polling
    const interval = this.pollingIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(sessionId);
    }

    console.log(`🔌 Navigateur déconnecté pour session ${sessionId}`);
    console.log(`📊 Connexions QR restantes: ${this.connections.size}`);
  }

  /**
   * Poll le statut de la session et notifie quand authentifiée
   */
  private static startStatusPolling(sessionId: string, socket: Socket): void {
    // Poll toutes les secondes
    const pollInterval = setInterval(async () => {
      try {
        const session = await AuthCacheService.getSession(sessionId);

        if (!session) {
          // Session expirée
          socket.emit('expired', {
            message: 'QR code expired',
          });
          // socket.disconnect();
          this.handleDisconnect(sessionId);
          return;
        }

        if (session.status === 'authenticated' && session.token) {
          // ✅ Session authentifiée !
          socket.emit('authenticated', {
            token: session.token,
            user: session.userData?.toJSON(),
          });

          // Nettoyer
          socket.disconnect();
          this.handleDisconnect(sessionId);

          console.log(`✅ JWT envoyé au navigateur pour session ${sessionId}`);
        } else if (session.status === 'rejected') {
          // ❌ Session rejetée
          socket.emit('rejected', {
            message: 'Authentication rejected',
          });
          // socket.disconnect();
          this.handleDisconnect(sessionId);
        }
      } catch (error: any) {
        console.error('❌ Erreur polling QR status:', error);
      }
    }, 1000);

    this.pollingIntervals.set(sessionId, pollInterval);

    // Timeout après 2.5 minutes
    setTimeout(() => {
      const interval = this.pollingIntervals.get(sessionId);
      if (interval) {
        clearInterval(interval);
        this.pollingIntervals.delete(sessionId);

        const socket = this.connections.get(sessionId);
        if (socket) {
          socket.emit('timeout', {
            message: 'Authentication timeout',
          });
          socket.disconnect();
        }

        this.connections.delete(sessionId);
      }
    }, 150000); // 2.5 minutes
  }
}
