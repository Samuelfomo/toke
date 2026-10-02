'use strict';
const { Sequelize, QueryTypes } = require('/opt/toke/node_modules/sequelize');
const target = 'toke_master';
const db = new Sequelize(target, 'postgres', null, {
  host: '/var/run/postgresql',
  port: 5432,
  dialect: 'postgres',
  logging: false,
});
(async () => {
  try {
    if (process.argv[2] !== '--apply') throw new Error('Explicit --apply is required');
    const [current] = await db.query('SELECT current_database() AS name', {
      type: QueryTypes.SELECT,
    });
    if (current.name !== target) throw new Error('Wrong database');
    const { applyCommercialTransition } =
      await import('/opt/toke/packages/api/dist/master/services/commercial-transition.js');
    const results = await applyCommercialTransition(db, {
      tenantGuids: [100014, 100001, 100016, 100008, 100017, 100020],
      actorUserGuid: '7173056141612204',
      actorTenantGuid: 100014,
      validFrom: new Date('2026-10-01T00:00:00+01:00'),
      validUntil: new Date('2026-11-01T00:00:00+01:00'),
      unitPriceUsd: '3.00',
      reason:
        'Octobre 2026 offert pour transition vers la facturation normale ; aucun encaissement.',
      key: 'TOKETRANSITION_OCT2026',
    });
    console.table(results);
  } catch (error) {
    console.error('ARRÊT :', error.message);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
})();
