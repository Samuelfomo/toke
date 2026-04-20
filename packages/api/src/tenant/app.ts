// app.ts
import http, { Server } from 'http';

import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { TimezoneConfigUtils } from '@toke/shared';

import { SocketServer } from '../realtime/SocketServer.js';
// import dotenv from 'dotenv';
//
// dotenv.config();
// Importation des modules simplifiés
import { tenantMiddleware } from '../middle/tenant.middleware.js';
import { ServerAuth } from '../middle/server-auth.js';
import { TenantRevision } from '../tools/revision.js';
import { tableName } from '../utils/response.model.js';
import AuthCacheService from '../tools/auth.cache.service.js';

import userRoute from './routes/user.route.js';
import roleRoute from './routes/roles.route.js';
import userRoleRoute from './routes/user.role.route.js';
import timeEntriesRoute from './routes/time.entries.route.js';
import sitesRoute from './routes/sites.route.js';
import workSessionsRoute from './routes/work.sessions.route.js';
import orgHierarchyRoute from './routes/org.hierarchy.route.js';
import memosRoute from './routes/memos.route.js';
import uploadRoute from './routes/upload.route.js';
import fraudAlertsRoute from './routes/fraud.alerts.route.js';
import auditLogsRoute from './routes/audit.logs.route.js';
import qrCodeRoute from './routes/qr.code.route.js';
import sessionTemplatesRoute from './routes/session.templates.route.js';
import rotationGroupsRoute from './routes/rotation.groups.route.js';
import rotationAssignmentsRoute from './routes/rotation.assignments.route.js';
import scheduleAssignmentsRoute from './routes/schedule.assignments.route.js';
import groupsRoute from './routes/groups.route.js';
import deviceRoute from './routes/device.route.js';
import sessionModelRoute from './routes/session.model.route.js';
import authRoute from './routes/auth.route.js';

interface AppConfig {
  port: number;
  host: string;
  cors: boolean;
}

export default class App {
  private server: Server | null = null;
  private readonly app: express.Application;
  private config: AppConfig;
  private isShuttingDown = false;

  private httpServer: http.Server | null = null;

  constructor(config: Partial<AppConfig> = {}) {
    this.config = {
      port: config.port || parseInt(process.env.TN_PORT || '4892'),
      host: config.host || process.env.SERVER_HOST || '0.0.0.0',
      cors: config.cors ?? true,
    };

    this.app = express();
    this.setupMiddleware();
  }

  /**
   * Démarrage du serveur
   */
  async start(): Promise<void> {
    try {
      if (this.isShuttingDown) {
        throw new Error('Impossible de démarrer: arrêt en cours');
      }

      await this.setupRoutes();

      console.log(`🚀 Démarrage serveur sur ${this.config.host}:${this.config.port}...`);

      await new Promise<void>((resolve, reject) => {
        // ✅ UN seul serveur HTTP
        this.httpServer = http.createServer(this.app);

        // ✅ Socket.IO sur ce serveur
        SocketServer.init(this.httpServer);

        // ✅ C'est CE serveur qui écoute (pas app.listen)
        this.httpServer.listen(this.config.port, () => {
          console.log(`✅ Serveur actif sur http://${this.config.host}:${this.config.port}`);
          console.log(`📊 Health check: http://${this.config.host}:${this.config.port}/health`);
          console.log(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}`);
          console.log('🎉 Serveur prêt!');
          resolve();
        });

        this.httpServer.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            reject(new Error(`Port ${this.config.port} déjà utilisé`));
          } else {
            reject(error);
          }
        });

        // ✅ Même référence pour stop() et shutdown()
        this.server = this.httpServer;
      });

      this.setupGracefulShutdown();
    } catch (error) {
      console.error('❌ Erreur démarrage serveur:', error);
      throw error;
    }
  }
  /**
   * Arrêt forcé (pour tests)
   */
  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server?.close(() => resolve());
      });
    }
  }

  /**
   * Configuration des middlewares de base
   */
  private setupMiddleware(): void {
    // CORS
    if (this.config.cors) {
      this.app.use(cors());
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Logging simple en développement
    if (process.env.NODE_ENV !== 'production') {
      this.app.use((req, _res, next) => {
        console.log(`🌐 ${req.method} ${req.path}`);
        next();
      });
    }

    // Headers de sécurité basique
    this.app.use((_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      next();
    });

    // 🔐 MIDDLEWARE D'AUTHENTIFICATION GLOBAL
    // ⚠️ INTERCEPTE TOUTES LES REQUÊTES (même /health)
    this.app.use(ServerAuth.authenticate);

    // // Appliquer le middleware tenant sur toutes les routes API (sauf health)
    // this.app.use(tenantMiddleware);

    // ✅ Tenant middleware appliqué sauf sur /health
    this.app.use(this.skipMiddleware(tenantMiddleware, []));

    // // Appliquer tenantMiddleware sur toutes les routes sauf /health
    // this.app.use((req, res, next) => {
    //   if (req.path === '/health') {
    //     return next(); // on skip le tenantMiddleware
    //   }
    //   return tenantMiddleware(req, res, next);
    // });
  }

  /**
   * Wrapper pour les handlers async
   */
  private asyncHandler =
    (fn: any) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  /**
   * Configuration des routes
   */
  private async setupRoutes(): Promise<void> {
    console.log('📍 Configuration des routes...');

    await AuthCacheService.initialize();
    console.log('✅ Auth Cache Service initialisé');

    // Note: QRSocketService est déjà initialisé dans SocketServer.init()

    // Route de santé
    this.app.get(
      '/health',
      this.asyncHandler(async (_req: any, res: any) => {
        // const dbStatus = TableInitializer.isInitialized() ? 'connected' : 'disconnected';

        // return R.handleSuccess(res, {
        //   timestamp: TimezoneConfigUtils.getCurrentTime().toISOString(),
        //   uptime: process.uptime(),
        //   environment: process.env.NODE_ENV || 'development',
        //   revision: {
        //     Lexicon: (await MasterRevision.getLexiconRevision()) || 0,
        //   },
        // });

        res.json({
          success: true,
          timestamp: TimezoneConfigUtils.getCurrentTime().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          revision: {
            site: await TenantRevision.getRevision(tableName.SITES),
          },
        });
      }),
    );

    // Route racine
    this.app.get('/', (_req, res) => {
      res.json({
        message: 'API Server is running',
        timestamp: TimezoneConfigUtils.getCurrentTime().toISOString(),
        endpoints: ['GET /health - Health check', 'GET / - Cette page'],
      });
    });

    // TODO: Ajouter les routes métier ici

    this.app.use('/user', userRoute);
    this.app.use('/role', roleRoute);
    this.app.use('/org-hierarchy', orgHierarchyRoute);
    this.app.use('/user-role', userRoleRoute);
    this.app.use('/time-entries', timeEntriesRoute);
    this.app.use('/work-session', workSessionsRoute);
    this.app.use('/site', sitesRoute);
    this.app.use('/memo', memosRoute);
    this.app.use('/fraud-alerts', fraudAlertsRoute);
    this.app.use('/audit-logs', auditLogsRoute);

    this.app.use('/upload', uploadRoute);

    this.app.use('/qr-code', qrCodeRoute);
    this.app.use('/session-templates', sessionTemplatesRoute);
    this.app.use('/rotation-groups', rotationGroupsRoute);
    this.app.use('/rotation-assignments', rotationAssignmentsRoute);
    this.app.use('/schedule-assignments', scheduleAssignmentsRoute);
    this.app.use('/groups', groupsRoute);
    this.app.use('/devices', deviceRoute);
    this.app.use('/session-model', sessionModelRoute);
    this.app.use('/auth', authRoute);

    // Route 404
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'route_not_found',
          message: `Route ${req.method} ${req.originalUrl} introuvable`,
        },
      });
    });

    // Gestionnaire d'erreur global
    this.app.use(
      (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error('❌ Erreur:', {
          message: error.message,
          url: req.originalUrl,
          method: req.method,
        });

        const isDev = process.env.NODE_ENV !== 'production';

        res.status(error.status || 500).json({
          success: false,
          error: {
            code: error.code || 'internal_server_error',
            message: isDev ? error.message : 'Erreur interne du serveur',
            ...(isDev && { stack: error.stack }),
          },
        });

        next();
      },
    );

    console.log('✅ Routes configurées');
  }

  /**
   * Configuration de l'arrêt gracieux
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        console.log('🔄 Arrêt déjà en cours...');
        return;
      }

      this.isShuttingDown = true;
      console.log(`\n📡 Signal ${signal} reçu. Arrêt gracieux...`);

      try {
        // Arrêter Socket.IO (inclut QRSocketService)
        SocketServer.shutdown();
        console.log('✅ Socket.IO arrêté');

        // Arrêter le cache
        await AuthCacheService.shutdown();
        console.log('✅ Cache arrêté');

        // 1. Fermer le serveur HTTP
        if (this.server) {
          console.log('🔌 Fermeture serveur HTTP...');
          await new Promise<void>((resolve) => {
            this.server!.close(() => {
              console.log('✅ Serveur HTTP fermé');
              resolve();
            });
          });
        }

        console.log('✅ Arrêt gracieux terminé');
        process.exit(0);
      } catch (error) {
        console.error("❌ Erreur lors de l'arrêt:", error);
        process.exit(1);
      }
    };

    // Écouter les signaux d'arrêt
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Exceptions non gérées
    process.on('uncaughtException', (error) => {
      console.error('❌ Exception non gérée:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason) => {
      console.error('❌ Promise rejetée:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
  }

  // ✅ ta méthode utilitaire
  private skipMiddleware(
    middleware: (req: Request, res: Response, next: NextFunction) => any,
    excludePaths: string[],
  ): express.RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      // if (excludePaths.includes(req.originalUrl)) {
      //   return next();
      // }
      if (excludePaths.some((path) => req.originalUrl.startsWith(path))) {
        return next();
      }
      return middleware(req, res, next);
    };
  }
}
