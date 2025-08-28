// src/server.ts
import App from './app.js'; // ajoute .js car tu es en ESM

/**
 * Point d'entrée principal
 */
async function main(): Promise<void> {
    try {
        const app = new App();
        await app.start();
    } catch (error) {
        console.error('❌ Application failed to start:', error);
        process.exit(1);
    }
}

/**
 * Lancement direct de l'application
 */
main().catch((err) => {
    console.error('❌ Erreur critique au démarrage:', err);
    process.exit(1);
});

// // Point d'entrée principal
// import App from './app';
//
// async function main(): Promise<void> {
//   try {
//     const app = new App();
//     await app.start();
//   } catch (error) {
//     console.error('❌ Application failed to start:', error);
//     process.exit(1);
//   }
// }
//
// // Démarrer l'application si ce fichier est exécuté directement
// if (require.main === module) {
//   main();
// }
