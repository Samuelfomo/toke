// status.js
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const pidFile = join(process.cwd(), 'server.pid');

try {
  if (existsSync(pidFile)) {
    const pid = readFileSync(pidFile, 'utf8').trim();
    try {
      // Test si le processus existe (signal 0 ne fait rien mais lève une erreur si le processus n'existe pas)
      process.kill(parseInt(pid), 0);
      console.log('✅ Serveur actif (PID:', pid + ')');
    } catch (error) {
      // Le processus n'existe plus, nettoyer le fichier PID
      unlinkSync(pidFile);
      console.log('❌ PID obsolète supprimé');
    }
  } else {
    console.log('❌ Serveur arrêté');
  }
} catch (error) {
  console.log('ℹ️ Erreur lors de la vérification:', error.message);
}
