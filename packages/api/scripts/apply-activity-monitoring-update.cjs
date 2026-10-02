'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { Sequelize, QueryTypes } = require('sequelize');
const target = process.argv[2];
if (!['toke_master', 'toke_master_license_test_20260930'].includes(target)) {
  console.error('Usage: node scripts/apply-activity-monitoring-update.cjs toke_master');
  process.exit(1);
}
const db = new Sequelize(target, 'postgres', null, {
  host: '/var/run/postgresql',
  port: 5432,
  dialect: 'postgres',
  logging: false,
});
const name = '20261002100000-reuse-activity-monitoring.cjs';
(async () => {
  try {
    const [current] = await db.query('SELECT current_database() AS name', {
      type: QueryTypes.SELECT,
    });
    if (current.name !== target) throw new Error('Incorrect database');
    const prior = await db.query('SELECT name FROM public."SequelizeMeta" WHERE name = :name', {
      type: QueryTypes.SELECT,
      replacements: { name },
    });
    if (prior.length) {
      console.log('Déjà enregistrée :', name);
      return;
    }
    const functions = await db.query(
      `SELECT pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN ('calculate_punch_counts','update_activity_monitoring','employee_license_activity_trigger','record_monitoring_activity','preserve_monitoring_activity_day') ORDER BY p.proname`,
      { type: QueryTypes.SELECT },
    );
    const backup =
      '/var/lib/postgresql/toke_monitoring_functions_' +
      new Date().toISOString().replace(/[^0-9]/g, '') +
      '.sql';
    fs.writeFileSync(
      backup,
      '-- Definitions before monitoring update; inspect before restoring.\n' +
        functions.map((f) => f.definition + ';').join('\n'),
      { flag: 'wx', mode: 0o600 },
    );
    console.log('Définitions précédentes sauvegardées :', backup);
    await require(path.join(__dirname, '../migrations', name)).up(db.getQueryInterface());
    await db.query('INSERT INTO public."SequelizeMeta"(name) VALUES(:name)', {
      replacements: { name },
    });
    console.log('Protection appliquée et enregistrée :', name);
  } catch (e) {
    console.error('ARRÊT :', e.message);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
})();
