import { Server as IOServer, Socket } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import dotenv from 'dotenv';
import { ApiKeyManager } from '@toke/api/dist/tools/api-key-manager.js';

dotenv.config();

const inDev = process.env.NODE_ENV === 'development';
const masterUrl = inDev
  ? `https://${process.env.MST_HOST}`
  : `http://${process.env.HOST}:${process.env.MST_PORT}`;

const RELAY_EVENTS = [
  'connected',
  'authenticated',
  'rejected',
  'expired',
  'timeout',
  'error',
  'pong',
];

export class QrSocketBridgeService {
  private static masterConnections: Map<string, ClientSocket> = new Map();

  public static init(io: IOServer): void {
    const qrNamespace = io.of('/qr-auth');

    qrNamespace.on('connection', (clientSocket: Socket) => {
      this.handleConnection(clientSocket);
    });

    console.log('✅ QR Socket Bridge initialisé sur namespace /qr-auth');
  }

  public static shutdown(): void {
    this.masterConnections.forEach((socket, sessionId) => {
      socket.disconnect();
    });
    this.masterConnections.clear();
    console.log('👋 QR Socket Bridge arrêté');
  }

  private static handleConnection(clientSocket: Socket): void {
    const { sessionId } = clientSocket.handshake.query;

    if (!sessionId || typeof sessionId !== 'string') {
      clientSocket.emit('error', { message: 'sessionId required' });
      return;
    }

    console.log(`🔌 Client web connecté pour session ${sessionId}`);

    // Générer les credentials pour s'authentifier auprès du master
    const signature = ApiKeyManager.generate(process.env.SECRET_KEY!, process.env.API_KEY!);

    // Connexion au master AVEC les credentials — le client web ne voit jamais ça
    const masterSocket: ClientSocket = ioClient(`${masterUrl}/qr-auth`, {
      query: { sessionId },
      extraHeaders: {
        'x-api-key': process.env.API_KEY!,
        'x-api-signature': signature,
        'x-api-timestamp': Math.floor(Date.now() / 1000).toString(),
      },
      transports: ['websocket'],
    });

    this.masterConnections.set(sessionId, masterSocket);

    // Relayer tous les événements master → client web
    RELAY_EVENTS.forEach((event) => {
      masterSocket.on(event, (data: any) => {
        console.log(`📡 Relais événement [${event}] pour session ${sessionId}`);
        clientSocket.emit(event, data);
      });
    });

    masterSocket.on('connect', () => {
      console.log(`✅ Bridge connecté au master pour session ${sessionId}`);
    });

    masterSocket.on('connect_error', (err: any) => {
      console.error(`❌ Bridge erreur connexion master: ${err.message}`);
      clientSocket.emit('error', { message: 'Bridge connection failed' });
    });

    // Relayer ping du client → master
    clientSocket.on('ping', () => {
      masterSocket.emit('ping');
    });

    // Nettoyage à la déconnexion du client web
    clientSocket.on('disconnect', () => {
      console.log(`🔌 Client web déconnecté pour session ${sessionId}`);
      masterSocket.disconnect();
      this.masterConnections.delete(sessionId);
    });
  }
}
