import { Server } from 'http';

import express from 'express';
import cors from 'cors';

// import dotenv from 'dotenv';
//
// dotenv.config();
// Importation des modules simplifiés
import ClientRoutes from '../temporaire_route/client.routes.js';
import { tableName } from '../utils/response.model.js';
import Revision from '../tools/revision.js';
import ProfileRoutes from '../temporaire_route/profile.routes.js';
import { ServerAuth } from '../middle/server-auth.js';

import Db from './database/db.config.js';
import { TableInitializer } from './database/db.initializer.js';
import CountryRoute from './routes/country.route.js';
import CurrencyRoute from './routes/currency.route.js';
import ExchangeRateRoute from './routes/exchange.rate.route.js';
import LanguageRoute from './routes/language.route.js';
import TaxRuleRoute from './routes/tax.rule.route.js';
import TenantRoute from './routes/tenant.route.js';
import GlobalLicenseRoute from './routes/global.license.route.js';
import LexiconRoute from './routes/lexicon.route.js';
import PaymentMethodRoute from './routes/payment.method.route.js';
import LicenseAdjustmentRoute from './routes/license.adjustment.route.js';
import PaymentTransactionRoute from './routes/payment.transaction.route.js';
import EmployeeLicenseRoute from './routes/employee.license.route.js';
import BillingCycleRoute from './routes/billing.cycle.route.js';
import FraudDetectionLogRoute from './routes/fraud.detection.log.route.js';
import ActivityMonitoringRoute from './routes/activity.monitoring.route.js';
import BillingRoute from './routes/manager/billing.route.js';
import FraudRoute from './routes/manager/fraud.route.js';
import SponsorRoute from './routes/sponsor.route.js';
import AppConfigRoute from './routes/app.config.route.js';

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
      port: config.port || parseInt(process.env.MT_PORT || '4891'),
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

      // Initialiser l'application
      await this.initializeApp();

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
      await this.cleanup();
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
    await this.cleanup();
  }

  /**
   * Getter pour Express (utile pour tests)
   */
  getExpressApp(): express.Application {
    return this.app;
  }

  /**
   * Vérifier si le serveur fonctionne
   */
  isRunning(): boolean {
    return this.server !== null && !this.isShuttingDown;
  }

  /**
   * Configuration des middlewares de base
   */
  private setupMiddleware(): void {
    // CORS
    if (this.config.cors) {
      this.app.use(cors());
    }

    // if (this.config.cors) {
    //   // ✅ Plus tard ces URLs viendront de la base
    //   const allowedOrigins = ['https://my.toke.cm', 'https://admin.toke.cm'];
    //
    //   this.app.use(
    //     cors({
    //       origin: (origin, callback) => {
    //         if (!origin || allowedOrigins.includes(origin)) {
    //           callback(null, true);
    //         } else {
    //           callback(new Error('Not allowed by CORS'));
    //         }
    //       },
    //       credentials: true,
    //       // methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    //       // allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    //     }),
    //   );
    //
    //   // // ✅ OBLIGATOIRE POUR AXIOS
    //   // this.app.options('/*', cors());
    // }

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
        const dbStatus = TableInitializer.isInitialized() ? 'connected' : 'disconnected';

        // return R.handleSuccess(res, {
        //   timestamp: new Date().toISOString(),
        //   uptime: process.uptime(),
        //   environment: process.env.NODE_ENV || 'development',
        //   database: dbStatus,
        //   tables: TableInitializer.getAllModels().size || 0,
        //   revision: {
        //     country: await Revision.getRevision(tableName.COUNTRY),
        //     currency: await Revision.getRevision(tableName.CURRENCY),
        //     exchange_rate: await Revision.getRevision(tableName.EXCHANGE_RATE),
        //     language: await Revision.getRevision(tableName.LANGUAGE),
        //     tax_rule: await Revision.getRevision(tableName.TAX_RULE),
        //     lexicon: await Revision.getRevision(tableName.LEXICON),
        //   },
        // });

        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          database: dbStatus,
          // tables: TableInitializer.getAllModels().size || 0,
          revision: {
            country: await Revision.getRevision(tableName.COUNTRY),
            currency: await Revision.getRevision(tableName.CURRENCY),
            exchange_rate: await Revision.getRevision(tableName.EXCHANGE_RATE),
            language: await Revision.getRevision(tableName.LANGUAGE),
            tax_rule: await Revision.getRevision(tableName.TAX_RULE),
            lexicon: await Revision.getRevision(tableName.LEXICON),
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

    // this.app.use(`/country`, CountryRoute);
    this.app.use(`/country`, CountryRoute);
    this.app.use(`/currency`, CurrencyRoute);
    this.app.use(`/exchange-rate`, ExchangeRateRoute);
    this.app.use(`/language`, LanguageRoute);
    this.app.use(`/tax-rule`, TaxRuleRoute);
    this.app.use(`/tenant`, TenantRoute);
    this.app.use(`/global-license`, GlobalLicenseRoute);
    this.app.use(`/employee-license`, EmployeeLicenseRoute);
    this.app.use(`/lexicon`, LexiconRoute);
    this.app.use(`/payment-method`, PaymentMethodRoute);
    this.app.use(`/license-adjustment`, LicenseAdjustmentRoute);
    this.app.use(`/payment-transaction`, PaymentTransactionRoute);
    this.app.use(`/billing-cycle`, BillingCycleRoute);
    this.app.use(`/fraud-detection-log`, FraudDetectionLogRoute);
    this.app.use(`/activity-monitoring`, ActivityMonitoringRoute);
    this.app.use(`/client`, ClientRoutes);
    this.app.use(`/profile`, ProfileRoutes);
    this.app.use('/sponsors', SponsorRoute);
    this.app.use('/app', AppConfigRoute);

    // *** Manager Route ***//
    this.app.use(`/billing`, BillingRoute);
    this.app.use(`/fraud`, FraudRoute);

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
   * Initialisation de la base de données
   */
  private async initializeDatabase(): Promise<void> {
    try {
      console.log('🗄️ Initialisation de la base de données...');

      // // 1. Obtenir la connexion Sequelize
      const sequelize = await Db.getInstance();
      //
      // // 2. Initialiser toutes les tables (statique)
      await TableInitializer.initialize(sequelize);

      console.log('✅ Base de données initialisée');
    } catch (error) {
      console.error('❌ Erreur initialisation DB:', error);
      throw error;
    }
  }

  /**
   * Initialisation complète de l'application
   */
  private async initializeApp(): Promise<void> {
    try {
      console.log("🚀 Initialisation de l'application...");

      // 1. Initialiser la base de données
      await this.initializeDatabase();

      // 2. Configurer les routes
      this.setupRoutes();

      console.log('✅ Application initialisée');
    } catch (error) {
      console.error('❌ Erreur initialisation app:', error);
      throw error;
    }
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

        // 2. Nettoyage
        await this.cleanup();

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

  /**
   * Nettoyage des ressources
   */
  private async cleanup(): Promise<void> {
    try {
      console.log('🧹 Nettoyage des ressources...');

      // Nettoyer l'initialisateur de tables (statique)
      TableInitializer.cleanup();

      // Fermer la connexion DB
      await Db.close();

      console.log('✅ Nettoyage terminé');
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
    }
  }
}
