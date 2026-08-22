import { Socket } from 'socket.io';

import ClientCacheService from '../tools/client.cache.service.js';
import { ApiKeyManager } from '../tools/api-key-manager.js';
import { TableInitializer } from '../master/database/db.initializer.js';

import { MemoEventsService } from './MemoEventsService.js';

export class SocketAuth {
  static async authenticate(socket: Socket, next: (err?: Error) => void) {
    try {
      // Flux navigateur recommandé : ticket court obtenu via REST déjà authentifié.
      const realtimeTicket = socket.handshake.auth?.realtimeTicket;
      if (typeof realtimeTicket === 'string' && realtimeTicket.length > 0) {
        const ticket = MemoEventsService.validateRealtimeTicket(realtimeTicket);
        if (!ticket) return next(new Error('realtime_ticket_invalid'));

        socket.data.client = ticket.client;
        socket.data.userGuid = ticket.userGuid;
        return next();
      }

      // Compatibilité avec les anciens clients Socket utilisant l'API key en headers.
      const headers = socket.handshake.headers;
      const token =
        (headers['x-api-key'] as string) ||
        (headers['authorization'] as string)?.replace(/Bearer\s+/i, '');

      if (!token) {
        return next(new Error('auth_missing_api_key'));
      }

      let clientConfig = await ClientCacheService.getClientConfig(token);

      if (!clientConfig) {
        if (!TableInitializer.isInitialized()) {
          return next(new Error('service_initializing'));
        }

        const { default: Client } = await import('../master/class/Client.js');
        const clientRecord = await Client._load(token, true);

        if (!clientRecord) {
          return next(new Error('invalid_api_key'));
        }

        await ClientCacheService.setClientConfig(clientRecord);
        clientConfig = await ClientCacheService.getClientConfig(token);
      }

      if (!clientConfig?.active) {
        return next(new Error('client_blocked'));
      }

      if (!clientConfig.profile.root) {
        const signature = headers['x-api-signature'] as string;
        const timestamp = headers['x-api-timestamp'] as string;

        if (!signature || !timestamp) {
          return next(new Error('signature_required'));
        }

        const valid = ApiKeyManager.verify(signature, token, timestamp, clientConfig.secret);
        if (!valid) return next(new Error('invalid_signature'));
      }

      socket.data.client = {
        id: clientConfig.id,
        name: clientConfig.name,
        token: clientConfig.token,
        active: clientConfig.active,
        profile: clientConfig.profile.id,
        isRoot: clientConfig.profile.root,
      };

      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔑 Socket auth OK : ${clientConfig.name}`);
      }

      next();
    } catch (err: any) {
      console.error('❌ SocketAuth error:', err);
      next(new Error('AUTH_INTERNAL_ERROR'));
    }
  }
}
