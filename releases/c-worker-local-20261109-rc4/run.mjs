// Release launcher only: no HTTP, Master initialization, migration or test hook.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const releaseRoot = path.dirname(fileURLToPath(import.meta.url));
const configPath = process.env.C_WORKER_TENANT_CACHE_FILE;
if (!configPath || !path.isAbsolute(configPath) || !fs.statSync(configPath).isFile())
  throw Error('C_WORKER_EXPLICIT_EXTERNAL_CACHE_REQUIRED');
const tenants = JSON.parse(fs.readFileSync(configPath, 'utf8'));
if (
  !tenants ||
  Array.isArray(tenants) ||
  typeof tenants !== 'object' ||
  Object.entries(tenants).some(
    ([key, c]) =>
      !c ||
      c.subdomain !== key ||
      typeof c.active !== 'boolean' ||
      !c.host ||
      !c.database ||
      !c.username ||
      typeof c.password !== 'string' ||
      !Number.isInteger(c.port) ||
      c.port < 1 ||
      c.port > 65535,
  )
)
  throw Error('C_WORKER_CACHE_INVALID');
if (fs.existsSync(path.join(releaseRoot, '.env'))) throw Error('C_WORKER_ENV_FILE_FORBIDDEN');
process.chdir(releaseRoot);
process.env.TZ = 'Africa/Douala';
process.env.NODE_ENV = 'production';
const cron = (await import('node-cron')).default;
const TenantManager = (await import('./dist/tenant/database/db.tenant-manager.js')).default;
const { outsideTenantScope } = await import('./dist/tenant/database/tenant.context.js');
export const worker = await import('./dist/automate/automate.js');
// Manual execute() does not necessarily report status 'running' in node-cron.
// Track execution events as well, before admitting any shutdown signal.
const activeExecutions = new Set();
for (const task of cron.getTasks().values()) {
  task.on('execution:started', () => activeExecutions.add(task.id));
  task.on('execution:finished', () => activeExecutions.delete(task.id));
  task.on('execution:failed', () => activeExecutions.delete(task.id));
}
let stopping;
export function shutdown() {
  if (stopping) return stopping;
  stopping = (async () => {
    const tasks = [...cron.getTasks().values()];
    // Register completion listeners BEFORE stop(): node-cron stop changes status.
    const pending = tasks
      .filter((t) => t.isBusy() || activeExecutions.has(t.id))
      .map(
        (task) =>
          new Promise((resolve) => {
            const settled = () => {
              task.off('execution:finished', settled);
              task.off('execution:failed', settled);
              resolve();
            };
            task.once('execution:finished', settled);
            task.once('execution:failed', settled);
          }),
      );
    for (const task of tasks) await task.stop();
    let timer;
    try {
      await Promise.race([
        Promise.all(pending),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(Error('C_WORKER_DRAIN_TIMEOUT_OUTCOME_REVIEW_REQUIRED')),
            30000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
    for (const task of tasks) await task.destroy();
    await outsideTenantScope(() => TenantManager.closeAllConnections());
    console.log('C_WORKER_DRAINED');
  })();
  return stopping;
}
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => {
    shutdown().then(
      () => process.exit(0),
      () => {
        console.error('C_WORKER_SHUTDOWN_FAILED_OUTCOME_REVIEW_REQUIRED');
        process.exit(1);
      },
    );
  });
console.log('C_WORKER_READY');
