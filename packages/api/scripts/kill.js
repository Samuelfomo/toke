// kill.js
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const pidFile = join(process.cwd(), 'server.pid');

try {
  if (existsSync(pidFile)) {
    const pid = readFileSync(pidFile, 'utf8').trim();
    process.kill(parseInt(pid), 'SIGKILL');
    unlinkSync(pidFile);
    console.log("💀 Processus forcé à s'arrêter (PID:", pid + ')');
  } else {
    console.log('ℹ️ Aucun fichier PID trouvé - serveur probablement arrêté');
  }
} catch (error) {
  if (error.code === 'ESRCH') {
    // Le processus n'existe plus, nettoyer le fichier PID
    if (existsSync(pidFile)) {
      unlinkSync(pidFile);
    }
    console.log('ℹ️ Processus déjà terminé, fichier PID nettoyé');
  } else {
    console.log('ℹ️ Erreur:', error.message);
  }
}
