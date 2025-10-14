// src/server.ts
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

import App from './app.js';

// Fichier PID pour permettre l'arrêt externe
const PID_FILE = join(process.cwd(), 'server.pid');

let appInstance: App | null = null;
let isShuttingDown = false;

/**
 * Gestion propre de l'arrêt du serveur
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.log('🔄 Arrêt déjà en cours...');
    return;
  }

  isShuttingDown = true;
  console.log(`\n🛑 Signal ${signal} reçu, arrêt du serveur...`);

  try {
    // Supprimer le fichier PID immédiatement
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
      console.log('📄 Fichier PID supprimé');
    }

    // Utiliser la méthode stop() de votre classe App
    if (appInstance) {
      await appInstance.stop();
      console.log('✅ Application arrêtée proprement');
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors de l'arrêt:", error);
    process.exit(1);
  }
}

/**
 * Vérification si le serveur est déjà en cours d'exécution
 */
function checkExistingServer(): void {
  if (existsSync(PID_FILE)) {
    try {
      const existingPid = require('fs').readFileSync(PID_FILE, 'utf8').trim();
      // Vérifier si le processus existe encore
      process.kill(parseInt(existingPid), 0);
      console.error(`❌ Serveur déjà en cours d'exécution (PID: ${existingPid})`);
      console.error('💡 Utilisez "npm run stop" pour l\'arrêter');
      process.exit(1);
    } catch (error) {
      // Le processus n'existe plus, supprimer le fichier PID obsolète
      unlinkSync(PID_FILE);
      console.log('🧹 Fichier PID obsolète supprimé');
    }
  }
}

/**
 * Point d'entrée principal
 */
async function main(): Promise<void> {
  try {
    // Vérifier s'il y a déjà une instance
    checkExistingServer();

    console.log('🚀 Démarrage du serveur API...');
    console.log(`📍 PID: ${process.pid}`);
    console.log(`🗂️ Répertoire: ${process.cwd()}`);
    console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);

    // Créer le fichier PID
    writeFileSync(PID_FILE, process.pid.toString());
    console.log(`📄 PID enregistré dans ${PID_FILE}`);

    // Initialiser l'application
    appInstance = new App({
      port: parseInt(process.env.MT_PORT || '4891'),
      host: process.env.SERVER_HOST || '0.0.0.0',
    });

    // Configurer les gestionnaires de signaux AVANT le démarrage
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Pour nodemon/PM2

    // Gestion des erreurs critiques
    process.on('uncaughtException', (error) => {
      console.error('❌ Exception non capturée:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Promise rejetée non gérée:', reason);
      console.error('📍 Promise:', promise);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Nettoyage automatique du PID à la sortie
    process.on('exit', (code) => {
      if (existsSync(PID_FILE)) {
        try {
          unlinkSync(PID_FILE);
        } catch (error) {
          // Ignorer les erreurs de suppression
        }
      }
      console.log(`👋 Processus terminé avec le code: ${code}`);
    });

    // Démarrer le serveur (votre classe App gère déjà l'arrêt gracieux)
    await appInstance.start();

    console.log('✅ Serveur démarré avec succès');
    console.log('💡 Utilisez Ctrl+C ou "npm run stop" pour arrêter');
  } catch (error) {
    console.error("❌ Échec du démarrage de l'application:", error);

    // Nettoyer le fichier PID en cas d'erreur
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }

    process.exit(1);
  }
}

/**
 * Lancement avec gestion d'erreur globale
 */
main().catch((err) => {
  console.error('❌ Erreur critique au démarrage:', err);

  // Nettoyer le fichier PID
  if (existsSync(PID_FILE)) {
    try {
      unlinkSync(PID_FILE);
    } catch (cleanupError) {
      console.error('❌ Erreur lors du nettoyage:', cleanupError);
    }
  }

  process.exit(1);
});

// Export pour les tests
export { appInstance, gracefulShutdown };

// // src/server.ts
// import { existsSync, unlinkSync, writeFileSync } from 'fs';
// import { join } from 'path';
//
// import express from 'express';
// import cors from 'cors';
//
// import MasterApp from './master/app.js';
// import TenantApp from './tenant/app.js';
// // import { tenantMiddleware } from './middleware/tenant-middleware.js';
// import { EntityRoute } from './utils/response.model.js';
//
// // Fichier PID pour permettre l'arrêt externe
// const PID_FILE = join(process.cwd(), 'server.pid');
//
// let masterAppInstance: MasterApp | null = null;
// let tenantAppInstance: TenantApp | null = null;
// let serverInstance: any = null;
// let isShuttingDown = false;
//
// interface GatewayConfig {
//   port: number;
//   host: string;
//   cors: boolean;
// }
//
// /**
//  * API Gateway Multi-tenant
//  */
// class ApiGateway {
//   private app: express.Application;
//   private config: GatewayConfig;
//
//   constructor(config: Partial<GatewayConfig> = {}) {
//     this.config = {
//       port: config.port || parseInt(process.env.PORT || '4891'),
//       host: config.host || process.env.SERVER_HOST || '0.0.0.0',
//       cors: config.cors ?? true,
//     };
//
//     this.app = express();
//   }
//
//   /**
//    * Initialisation du gateway
//    */
//   async initialize(): Promise<void> {
//     try {
//       console.log('🚀 Initialisation API Gateway Multi-tenant...');
//
//       // 1. Initialiser les applications
//       masterAppInstance = new MasterApp();
//       await masterAppInstance.start();
//       console.log('✅ Master App initialisée');
//
//       tenantAppInstance = new TenantApp();
//       await tenantAppInstance.start();
//       console.log('✅ Tenant App initialisée');
//
//       // 2. Configurer les middlewares de base
//       this.setupMiddleware();
//
//       // 3. Configurer le routage
//       this.setupRouting();
//
//       console.log('✅ API Gateway initialisé');
//     } catch (error) {
//       console.error('❌ Erreur initialisation API Gateway:', error);
//       throw error;
//     }
//   }
//
//   /**
//    * Démarrage du serveur
//    */
//   async start(): Promise<void> {
//     await this.initialize();
//
//     return new Promise<void>((resolve, reject) => {
//       serverInstance = this.app.listen(this.config.port, this.config.host, () => {
//         console.log(`✅ API Gateway actif sur http://${this.config.host}:${this.config.port}`);
//         console.log(`📊 Health check: http://${this.config.host}:${this.config.port}/health`);
//         console.log(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}`);
//         console.log('🎉 Gateway prêt!');
//         resolve();
//       });
//
//       serverInstance.on('error', (error: any) => {
//         if (error.code === 'EADDRINUSE') {
//           reject(new Error(`Port ${this.config.port} déjà utilisé`));
//         } else {
//           reject(error);
//         }
//       });
//     });
//   }
//
//   /**
//    * Arrêt du serveur
//    */
//   async stop(): Promise<void> {
//     console.log('🛑 Arrêt API Gateway...');
//
//     // Fermer le serveur HTTP
//     if (serverInstance) {
//       await new Promise<void>((resolve) => {
//         serverInstance.close(() => {
//           console.log('✅ Serveur HTTP fermé');
//           resolve();
//         });
//       });
//     }
//
//     // Arrêter les applications
//     if (masterAppInstance) {
//       await masterAppInstance.stop();
//       console.log('✅ Master App arrêtée');
//     }
//
//     if (tenantAppInstance) {
//       await tenantAppInstance.stop();
//       console.log('✅ Tenant App arrêtée');
//     }
//
//     console.log('✅ API Gateway arrêté proprement');
//   }
//
//   /**
//    * Vérifier si le gateway fonctionne
//    */
//   isRunning(): boolean {
//     return serverInstance !== null && !isShuttingDown;
//   }
//
//   /**
//    * Getter pour Express (utile pour tests)
//    */
//   getExpressApp(): express.Application {
//     return this.app;
//   }
//
//   /**
//    * Configuration des middlewares de base
//    */
//   private setupMiddleware(): void {
//     // CORS
//     if (this.config.cors) {
//       this.app.use(cors());
//     }
//
//     // Body parsing
//     this.app.use(express.json({ limit: '10mb' }));
//     this.app.use(express.urlencoded({ extended: true }));
//
//     // Logging simple en développement
//     if (process.env.NODE_ENV !== 'production') {
//       this.app.use((req, res, next) => {
//         console.log(`🌐 ${req.method} ${req.path}`);
//         next();
//       });
//     }
//
//     // Headers de sécurité basique
//     this.app.use((req, res, next) => {
//       res.setHeader('X-Content-Type-Options', 'nosniff');
//       res.setHeader('X-Frame-Options', 'DENY');
//       next();
//     });
//   }
//
//   /**
//    * Configuration du routage principal
//    */
//   private setupRouting(): void {
//     console.log('📍 Configuration du routage API Gateway...');
//
//     // Route de santé globale
//     this.app.get('/health', async (req, res) => {
//       try {
//         const masterHealth = masterAppInstance?.isRunning() ? 'running' : 'stopped';
//         const tenantHealth = tenantAppInstance?.isRunning() ? 'running' : 'stopped';
//
//         res.json({
//           status: true,
//           timestamp: new Date().toISOString(),
//           uptime: process.uptime(),
//           gateway: 'active',
//           services: {
//             master: masterHealth,
//             tenant: tenantHealth
//           },
//           endpoints: {
//             master: `/${EntityRoute.MASTER}/* - Gestion des licences`,
//             tenant: `/${EntityRoute.TENANT}/* - Système de pointage`
//           }
//         });
//       } catch (error: any) {
//         res.status(500).json({
//           status: false,
//           error: error.message
//         });
//       }
//     });
//
//     // Route racine
//     this.app.get('/', (req, res) => {
//       res.json({
//         message: 'Toké Multi-Tenant API Gateway',
//         version: '1.0.0',
//         timestamp: new Date().toISOString(),
//         endpoints: {
//           health: '/health - Vérification de santé',
//           master: `/${EntityRoute.MASTER}/* - Gestion des licences`,
//           tenant: `/${EntityRoute.TENANT}/* - Système de pointage`
//         }
//       });
//     });
//
//     // Routes Master (/m/*)
//     this.app.use(`/${EntityRoute.MASTER}`, (req, res, next) => {
//       // Ajouter le contexte master
//       req.context = { type: 'master' };
//
//       // Déléguer à l'application master (sans le préfixe /m)
//       masterAppInstance?.getExpressApp()(req, res, next);
//     });
//
//     // Routes Tenant (/t/*)
//     this.app.use(`/${EntityRoute.TENANT}`,
//       // tenantMiddleware,
//       (req, res, next) => {
//       // Le middleware a déjà résolu le tenant et ajouté req.context
//       // Déléguer à l'application tenant (sans le préfixe /t)
//       tenantAppInstance?.getExpressApp()(req, res, next);
//     });
//
//     // Route 404
//     this.app.use('*', (req, res) => {
//       res.status(404).json({
//         success: false,
//         error: {
//           code: 'route_not_found',
//           message: `Route ${req.method} ${req.originalUrl} introuvable`,
//           available_routes: [
//             `/${EntityRoute.MASTER}/* - Routes Master`,
//             `/${EntityRoute.TENANT}/* - Routes Tenant`,
//             '/health - Health check'
//           ]
//         }
//       });
//     });
//
//     // Gestionnaire d'erreur global
//     this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
//       console.error('❌ Erreur Gateway:', {
//         message: error.message,
//         url: req.originalUrl,
//         method: req.method,
//         context: req.context?.type || 'unknown'
//       });
//
//       const isDev = process.env.NODE_ENV !== 'production';
//
//       res.status(error.status || 500).json({
//         success: false,
//         error: {
//           code: error.code || 'gateway_error',
//           message: isDev ? error.message : 'Erreur interne du serveur',
//           ...(isDev && { stack: error.stack }),
//         },
//       });
//     });
//
//     console.log('✅ Routage API Gateway configuré');
//   }
// }
//
// let gatewayInstance: ApiGateway | null = null;
//
// /**
//  * Gestion propre de l'arrêt du serveur
//  */
// async function gracefulShutdown(signal: string): Promise<void> {
//   if (isShuttingDown) {
//     console.log('🔄 Arrêt déjà en cours...');
//     return;
//   }
//
//   isShuttingDown = true;
//   console.log(`\n🛑 Signal ${signal} reçu, arrêt du serveur...`);
//
//   try {
//     // Supprimer le fichier PID immédiatement
//     if (existsSync(PID_FILE)) {
//       unlinkSync(PID_FILE);
//       console.log('📄 Fichier PID supprimé');
//     }
//
//     // Arrêter le gateway
//     if (gatewayInstance) {
//       await gatewayInstance.stop();
//       console.log('✅ API Gateway arrêté proprement');
//     }
//
//     process.exit(0);
//   } catch (error) {
//     console.error('❌ Erreur lors de l\'arrêt:', error);
//     process.exit(1);
//   }
// }
//
// /**
//  * Vérification si le serveur est déjà en cours d'exécution
//  */
// function checkExistingServer(): void {
//   if (existsSync(PID_FILE)) {
//     try {
//       const existingPid = require('fs').readFileSync(PID_FILE, 'utf8').trim();
//       // Vérifier si le processus existe encore
//       process.kill(parseInt(existingPid), 0);
//       console.error(`❌ Serveur déjà en cours d'exécution (PID: ${existingPid})`);
//       console.error('💡 Utilisez "npm run stop" pour l\'arrêter');
//       process.exit(1);
//     } catch (error) {
//       // Le processus n'existe plus, supprimer le fichier PID obsolète
//       unlinkSync(PID_FILE);
//       console.log('🧹 Fichier PID obsolète supprimé');
//     }
//   }
// }
//
// /**
//  * Point d'entrée principal
//  */
// async function main(): Promise<void> {
//   try {
//     // Vérifier s'il y a déjà une instance
//     checkExistingServer();
//
//     console.log('🚀 Démarrage API Gateway Multi-tenant...');
//     console.log(`📍 PID: ${process.pid}`);
//     console.log(`🗂️ Répertoire: ${process.cwd()}`);
//     console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
//
//     // Créer le fichier PID
//     writeFileSync(PID_FILE, process.pid.toString());
//     console.log(`📄 PID enregistré dans ${PID_FILE}`);
//
//     // Initialiser le gateway
//     gatewayInstance = new ApiGateway({
//       port: parseInt(process.env.PORT || '4891'),
//       host: process.env.SERVER_HOST || '0.0.0.0',
//     });
//
//     // Configurer les gestionnaires de signaux AVANT le démarrage
//     process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
//     process.on('SIGINT', () => gracefulShutdown('SIGINT'));
//     process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Pour nodemon/PM2
//
//     // Gestion des erreurs critiques
//     process.on('uncaughtException', (error) => {
//       console.error('❌ Exception non capturée:', error);
//       gracefulShutdown('UNCAUGHT_EXCEPTION');
//     });
//
//     process.on('unhandledRejection', (reason, promise) => {
//       console.error('❌ Promise rejetée non gérée:', reason);
//       console.error('📍 Promise:', promise);
//       gracefulShutdown('UNHANDLED_REJECTION');
//     });
//
//     // Nettoyage automatique du PID à la sortie
//     process.on('exit', (code) => {
//       if (existsSync(PID_FILE)) {
//         try {
//           unlinkSync(PID_FILE);
//         } catch (error) {
//           // Ignorer les erreurs de suppression
//         }
//       }
//       console.log(`👋 Processus terminé avec le code: ${code}`);
//     });
//
//     // Démarrer le gateway
//     await gatewayInstance.start();
//
//     console.log('✅ API Gateway démarré avec succès');
//     console.log('💡 Utilisez Ctrl+C ou "npm run stop" pour arrêter');
//
//   } catch (error) {
//     console.error('❌ Échec du démarrage de l\'API Gateway:', error);
//
//     // Nettoyer le fichier PID en cas d'erreur
//     if (existsSync(PID_FILE)) {
//       unlinkSync(PID_FILE);
//     }
//
//     process.exit(1);
//   }
// }
//
// /**
//  * Lancement avec gestion d'erreur globale
//  */
// main().catch((err) => {
//   console.error('❌ Erreur critique au démarrage:', err);
//
//   // Nettoyer le fichier PID
//   if (existsSync(PID_FILE)) {
//     try {
//       unlinkSync(PID_FILE);
//     } catch (cleanupError) {
//       console.error('❌ Erreur lors du nettoyage:', cleanupError);
//     }
//   }
//
//   process.exit(1);
// });
//
// // Export pour les tests
// export { gatewayInstance, gracefulShutdown };
