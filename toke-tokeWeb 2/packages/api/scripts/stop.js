// stop.js
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const pidFile = join(process.cwd(), 'server.pid');

try {
  if (existsSync(pidFile)) {
    const pid = readFileSync(pidFile, 'utf8').trim();
    process.kill(parseInt(pid), 'SIGTERM');
    console.log("🛑 Signal d'arrêt envoyé au PID:", pid);
  } else {
    console.log('ℹ️ Serveur non trouvé ou déjà arrêté');
  }
} catch (error) {
  if (error.code === 'ESRCH') {
    console.log('ℹ️ Processus déjà terminé');
  } else {
    console.log('ℹ️ Erreur:', error.message);
  }
}
