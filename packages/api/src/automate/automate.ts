// automate.ts
// Planificateur de rotation multi-tenant.
// À lancer via PM2 en tant que worker séparé (pas importé dans app.ts).
//
// ecosystem.config.cjs :
//   { name: 'toke-rotation', script: 'dist/automate.js', instances: 1,
//     exec_mode: 'fork', env_production: { NODE_ENV: 'production', TZ: 'Africa/Douala' } }

import cron from 'node-cron';

import TenantCacheService from '../tools/tenant-cache.service.js';
import TenantManager from '../tenant/database/db.tenant-manager.js';
import { TableInitializer } from '../tenant/database/db.initializer.js';

import { RotationCronResult, runRotationCron } from './rotation.cron.js';

// ─── Résumé global d'une exécution sur tous les tenants ───────────────────────

interface AutomateRunSummary {
  startedAt: Date;
  tenants: {
    subdomain: string;
    status: 'ok' | 'error';
    result?: RotationCronResult;
    error?: string;
  }[];
}

// ─── Exécution du cron pour UN tenant ─────────────────────────────────────────

async function runForTenant(subdomain: string): Promise<RotationCronResult> {
  // 1. Récupérer la config depuis le cache fichier
  const tenantConfig = await TenantCacheService.getTenantConfig(subdomain);
  if (!tenantConfig) {
    throw new Error(`Tenant '${subdomain}' introuvable ou inactif dans le cache`);
  }

  // 2. Positionner le tenant courant (requis par getConnectionSync dans les classes)
  TenantManager.setCurrentTenant(subdomain);

  // 3. Initialiser la connexion DB (réutilisée si déjà ouverte)
  const connection = await TenantManager.getConnectionForTenant(subdomain, {
    host: tenantConfig.host,
    port: tenantConfig.port,
    username: tenantConfig.username,
    password: tenantConfig.password,
    database: tenantConfig.database,
  });

  // 4. Initialiser les modèles Sequelize sur cette connexion
  await TableInitializer.initialize(connection);

  // 5. Lancer le cron métier — c'est getCyclesElapsed() qui décide si on avance
  return runRotationCron();
}

// ─── Exécution sur tous les tenants actifs ────────────────────────────────────

async function runForAllTenants(): Promise<AutomateRunSummary> {
  const startedAt = new Date();
  const summary: AutomateRunSummary = { startedAt, tenants: [] };

  const subdomains = await TenantCacheService.listTenants();

  if (subdomains.length === 0) {
    console.warn('[Automate] Aucun tenant dans le cache');
    return summary;
  }

  console.log(`[Automate] Lancement rotation pour ${subdomains.length} tenant(s)…`);

  // Séquentiel : évite les conflits sur TenantManager.currentTenant (variable statique)
  // Pour du parallèle un jour → migrer vers AsyncLocalStorage
  for (const subdomain of subdomains) {
    try {
      const result = await runForTenant(subdomain);

      summary.tenants.push({ subdomain, status: 'ok', result });

      console.log(
        `[Automate] ✅ ${subdomain} — processed=${result.processed} skipped=${result.skipped} failed=${result.failed}`,
      );
    } catch (err: any) {
      const error = err?.message ?? String(err);
      summary.tenants.push({ subdomain, status: 'error', error });
      console.error(`[Automate] ❌ ${subdomain} — ${error}`);
      // Continue — une erreur sur un tenant ne bloque pas les autres
    }
  }

  const ok = summary.tenants.filter((t) => t.status === 'ok').length;
  const error = summary.tenants.filter((t) => t.status === 'error').length;

  console.log(
    `[Automate] Terminé — ok=${ok} erreurs=${error} (démarré à ${startedAt.toISOString()})`,
  );

  return summary;
}

// ─── Planification ────────────────────────────────────────────────────────────
// Un seul cron chaque jour à minuit.
// C'est getCyclesElapsed() dans rotation.cron.ts qui décide si
// l'offset avance — pas le jour de la semaine ni le cycleUnit.
// Résultat :
//   - Assignation créée mercredi avec cycle_unit=week → avance le mercredi suivant
//   - Assignation créée lundi avec cycle_unit=day    → avance chaque nuit

cron.schedule(
  '0 0 * * *',
  async () => {
    console.log('[Automate] ⏰ Déclenchement rotation');
    await runForAllTenants();
  },
  { timezone: 'Africa/Douala' },
);

// cron.schedule(
//   '*/1 * * * *',
//   async () => {
//     console.log('[Automate] ⏰ Déclenchement rotation (TEST 1min)');
//     await runForAllTenants();
//   },
//   { timezone: 'Africa/Douala' },
// );

console.log('[Automate] 🚀 Planificateur de rotation démarré');
console.log('[Automate]   • Vérification chaque nuit à minuit (Africa/Douala)');
console.log('[Automate]   • Avancement basé sur start_date du RotationGroup');

// ─── Export pour tests manuels ────────────────────────────────────────────────

export { runForTenant, runForAllTenants };
