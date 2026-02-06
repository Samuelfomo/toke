// nuclear-cleanup.js
import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

console.log('🚨 NETTOYAGE RADICAL EN COURS...');

const pidFile = join(process.cwd(), 'server.pid');
const port = process.env.PORT || '4891';

// 1. Arrêter PM2 complètement
try {
  console.log('🛑 Arrêt de PM2...');
  execSync('pm2 kill', { stdio: 'pipe' });
  console.log('✅ PM2 arrêté');
} catch (error) {
  console.log("ℹ️ PM2 n'était pas actif");
}

// 2. Tuer tous les processus liés à tsx/nodemon
try {
  console.log('🛑 Arrêt des processus tsx/nodemon...');
  execSync('pkill -f tsx', { stdio: 'pipe' });
  execSync('pkill -f nodemon', { stdio: 'pipe' });
  console.log('✅ Processus tsx/nodemon arrêtés');
} catch (error) {
  console.log('ℹ️ Aucun processus tsx/nodemon trouvé');
}

// 3. Tuer TOUS les processus Node.js
try {
  console.log('💀 ARRÊT DE TOUS LES PROCESSUS NODE.JS...');
  execSync('pkill -f node', { stdio: 'pipe' });
  console.log('✅ Tous les processus Node.js arrêtés');
} catch (error) {
  console.log('ℹ️ Aucun processus Node.js trouvé');
}

// 4. Nettoyer le port spécifiquement
try {
  console.log(`🔧 Nettoyage du port ${port}...`);
  const pids = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim();
  if (pids) {
    execSync(`kill -9 ${pids.replace(/\n/g, ' ')}`, { stdio: 'pipe' });
    console.log(`✅ Port ${port} libéré`);
  }
} catch (error) {
  console.log(`✅ Port ${port} était déjà libre`);
}

// 5. Supprimer le fichier PID
if (existsSync(pidFile)) {
  unlinkSync(pidFile);
  console.log('🗑️ Fichier PID supprimé');
}

// 6. Attendre un peu
console.log('⏳ Attente de 3 secondes...');
await new Promise((resolve) => setTimeout(resolve, 3000));

// 7. Vérification finale
try {
  const remainingProcesses = execSync('ps aux | grep node | grep -v grep', {
    encoding: 'utf8',
  }).trim();
  if (remainingProcesses) {
    console.log('⚠️ Processus Node.js restants:');
    console.log(remainingProcesses);
  } else {
    console.log('✅ Aucun processus Node.js restant');
  }
} catch (error) {
  console.log('✅ Aucun processus Node.js restant');
}

console.log('🎉 NETTOYAGE RADICAL TERMINÉ!');
console.log('🚀 Vous pouvez maintenant redémarrer proprement');
