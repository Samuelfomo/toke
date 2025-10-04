import { Server } from 'http';

import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';

// import dotenv from 'dotenv';
//
// dotenv.config();
// Importation des modules simplifiés
import { tenantMiddleware } from '../middle/tenant.middleware.js';
import { ServerAuth } from '../middle/server-auth.js';
import { MasterRevision } from '../tools/revision.js';

import userRoute from './routes/user.route.js';
import roleRoute from './routes/roles.route.js';
import userRoleRoute from './routes/user.role.route.js';
import timeEntriesRoute from './routes/time.entries.route.js';
import sitesRoute from './routes/sites.route.js';
import workSessionsRoute from './routes/work.sessions.route.js';

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

  constructor(config: Partial<AppConfig> = {}) {
    this.config = {
      port: config.port || parseInt(process.env.TN_PORT || '4891'),
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

      // Configurer les routes
      this.setupRoutes();

      // Démarrer le serveur HTTP
      console.log(`🚀 Démarrage serveur sur ${this.config.host}:${this.config.port}...`);

      await new Promise<void>((resolve, reject) => {
        this.server = this.app.listen(
          this.config.port,
          // this.config.host,
          () => {
            console.log(`✅ Serveur actif sur http://${this.config.host}`);
            console.log(`📊 Health check: http://${this.config.host}/health`);
            console.log(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}`);
            console.log('🎉 Serveur prêt!');
            resolve();
          },
        );

        this.server?.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            reject(new Error(`Port ${this.config.port} déjà utilisé`));
          } else {
            reject(error);
          }
        });
      });

      // Configurer l'arrêt gracieux
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
        this.server!.close(() => resolve());
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
      this.app.use((req, res, next) => {
        console.log(`🌐 ${req.method} ${req.path}`);
        next();
      });
    }

    // Headers de sécurité basique
    this.app.use((req, res, next) => {
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
    this.app.use(this.skipMiddleware(tenantMiddleware, ['/health']));

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
  private setupRoutes(): void {
    console.log('📍 Configuration des routes...');

    // Route de santé
    this.app.get(
      '/health',
      this.asyncHandler(async (req: any, res: any) => {
        // const dbStatus = TableInitializer.isInitialized() ? 'connected' : 'disconnected';

        // return R.handleSuccess(res, {
        //   timestamp: new Date().toISOString(),
        //   uptime: process.uptime(),
        //   environment: process.env.NODE_ENV || 'development',
        //   revision: {
        //     Lexicon: (await MasterRevision.getLexiconRevision()) || 0,
        //   },
        // });

        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          revision: {
            Lexicon: (await MasterRevision.getLexiconRevision()) || 0,
          },
        });
      }),
    );

    // Route racine
    this.app.get('/', (req, res) => {
      res.json({
        message: 'API Server is running',
        timestamp: new Date().toISOString(),
        endpoints: ['GET /health - Health check', 'GET / - Cette page'],
      });
    });

    // TODO: Ajouter les routes métier ici

    this.app.use('/user', userRoute);
    this.app.use('/role', roleRoute);
    this.app.use('/user-role', userRoleRoute);
    this.app.use('/time-entries', timeEntriesRoute);
    this.app.use('/work-session', workSessionsRoute);
    this.app.use('/site', sitesRoute);

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
      if (excludePaths.includes(req.originalUrl)) {
        return next();
      }
      return middleware(req, res, next);
    };
  }
}
