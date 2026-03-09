// src/server.ts
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

import App from './app.js';

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
      port: parseInt(process.env.LOCAL_PORT || '4893'),
      host: process.env.HOST || '0.0.0.0',
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
