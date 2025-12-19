import { Socket } from 'socket.io';

import ClientCacheService from '../tools/client.cache.service.js';
import { ApiKeyManager } from '../tools/api-key-manager.js';
import { TableInitializer } from '../master/database/db.initializer.js';

export class SocketAuth {
  static async authenticate(socket: Socket, next: (err?: Error) => void) {
    try {
      const headers = socket.handshake.headers;

      const token =
        (headers['x-api-key'] as string) ||
        (headers['authorization'] as string)?.replace(/Bearer\s+/i, '');

      if (!token) {
        return next(new Error('AUTH_MISSING_API_KEY'));
      }

      // 1️⃣ cache first
      let clientConfig = await ClientCacheService.getClientConfig(token);

      if (!clientConfig) {
        if (!TableInitializer.isInitialized()) {
          return next(new Error('SERVICE_INITIALIZING'));
        }

        const { default: Client } = await import('../master/class/Client.js');
        const clientRecord = await Client._load(token, true);

        if (!clientRecord) {
          return next(new Error('INVALID_API_KEY'));
        }

        await ClientCacheService.setClientConfig(clientRecord);
        clientConfig = await ClientCacheService.getClientConfig(token);
      }

      if (!clientConfig?.active) {
        return next(new Error('CLIENT_BLOCKED'));
      }

      // 2️⃣ Signature (si pas root)
      if (!clientConfig.profile.root) {
        const signature = headers['x-api-signature'] as string;
        const timestamp = headers['x-api-timestamp'] as string;

        if (!signature || !timestamp) {
          return next(new Error('SIGNATURE_REQUIRED'));
        }

        const valid = ApiKeyManager.verify(signature, token, timestamp, clientConfig.secret);

        if (!valid) {
          return next(new Error('INVALID_SIGNATURE'));
        }
      }

      // 3️⃣ Contexte socket
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

// import { Socket } from 'socket.io';
//
// import { ServerAuth } from '../middle/server-auth.js';
//
// import { RealtimeContext } from './realtime.context.js';
//
// export async function authenticateSocket(socket: Socket): Promise<void> {
//   const token =
//     socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
//
//   if (!token) {
//     throw new Error('Missing auth token');
//   }
//
//   // 🔥 Réutilisation de TA logique existante
//   const authResult = await ServerAuth.verifyToken(token);
//
//   if (!authResult?.user) {
//     throw new Error('Invalid token');
//   }
//
//   const context: RealtimeContext = {
//     userId: authResult.user.id,
//     role: authResult.user.role,
//     tenantId: authResult.tenant?.id,
//   };
//
//   socket.data.context = context;
// }
