import { Server } from 'http';

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { TimezoneConfigUtils } from '@toke/shared';

import tenantRoute from './src/routes/tenant.route.js';
import userRoute from './src/routes/user.route.js';
import timeEntriesRoute from './src/routes/time.entries.route.js';
import memosRoute from './src/routes/memos.route.js';
import siteRoute from './src/routes/site.route.js';
import scheduleRoute from './src/routes/schedule.route.js';
import rotationGroupsRoute from './src/routes/rotation.groups.route.js';
import scheduleAssignmentsRoute from './src/routes/schedule.assignments.route.js';
import rotationAssignmentsRoute from './src/routes/rotation.assignments.route.js';
import groupsRoute from './src/routes/groups.route.js';

dotenv.config();

// dotenv.config({ path: './.env' });

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
      port: config.port || parseInt(process.env.LOCAL_PORT || '4893'),
      host: config.host || process.env.HOST || '0.0.0.0',
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

      // 2. Configurer les routes
      this.setupRoutes();

      // Démarrer le serveur HTTP
      console.log(`🚀 Démarrage serveur sur ${this.config.host}:${this.config.port}...`);

      await new Promise<void>((resolve, reject) => {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          console.log(`✅ Serveur actif sur http://${this.config.host}:${this.config.port}`);
          console.log(`📊 Health check: http://${this.config.host}:${this.config.port}/health`);
          console.log(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}`);
          console.log('🎉 Serveur prêt!');
          resolve();
        });

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
    this.app.use(express.json({ limit: '50mb' }));
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
        res.json({
          success: true,
          timestamp: TimezoneConfigUtils.getCurrentTime().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
        });
      }),
    );

    // Route racine
    this.app.get('/', (req, res) => {
      res.json({
        message: 'API Server is running',
        timestamp: TimezoneConfigUtils.getCurrentTime().toISOString(),
        endpoints: ['GET /health - Health check', 'GET / - Cette page'],
      });
    });

    // TODO: Ajouter les routes métier ici

    this.app.use('/tenant', tenantRoute);
    this.app.use('/user', userRoute);
    this.app.use('/time-entries', timeEntriesRoute);
    this.app.use('/site', siteRoute);
    this.app.use('/memo', memosRoute);
    this.app.use('/session-templates', scheduleRoute);
    this.app.use('/rotation-groups', rotationGroupsRoute);
    this.app.use('/schedule-assignments', scheduleAssignmentsRoute);
    this.app.use('/rotation-assignments', rotationAssignmentsRoute);
    this.app.use('/groups', groupsRoute);

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
}
