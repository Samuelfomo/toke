// Release launcher only: no HTTP, Master initialization, migration or test hook.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const releaseRoot=path.dirname(fileURLToPath(import.meta.url));
const configPath=process.env.C_WORKER_TENANT_CACHE_FILE;
if(!configPath||!path.isAbsolute(configPath)||!fs.statSync(configPath).isFile())throw Error('C_WORKER_EXPLICIT_EXTERNAL_CACHE_REQUIRED');
if(fs.existsSync(path.join(releaseRoot,'.env')))throw Error('C_WORKER_ENV_FILE_FORBIDDEN');
process.chdir(releaseRoot);
process.env.TZ='Africa/Douala';
process.env.NODE_ENV='production';
const cron=(await import('node-cron')).default;
const TenantManager=(await import('./dist/tenant/database/db.tenant-manager.js')).default;
const {outsideTenantScope}=await import('./dist/tenant/database/tenant.context.js');
export const worker=await import('./dist/automate/automate.js');
let stopping;
export function shutdown(){
 if(stopping)return stopping;
 stopping=(async()=>{
  const tasks=[...cron.getTasks().values()];
  for(const task of tasks)await task.stop();
  const deadline=Date.now()+30000;
  // stop() prevents new triggers; running execution must finish before pools close.
  while(tasks.some(t=>t.isBusy())){
   if(Date.now()>deadline)throw Error('C_WORKER_DRAIN_TIMEOUT_OUTCOME_REVIEW_REQUIRED');
   await new Promise(r=>setTimeout(r,25));
  }
  for(const task of tasks)await task.destroy();
  await outsideTenantScope(()=>TenantManager.closeAllConnections());
  console.log('C_WORKER_DRAINED');
 })();return stopping;
}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{
 shutdown().then(()=>process.exit(0),()=>{console.error('C_WORKER_SHUTDOWN_FAILED_OUTCOME_REVIEW_REQUIRED');process.exit(1);});
});
console.log('C_WORKER_READY');
