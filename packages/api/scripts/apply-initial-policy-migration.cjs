'use strict';
const { Sequelize, QueryTypes } = require('/opt/toke/node_modules/sequelize');
const path = require('node:path');
const target = 'toke_master',
  name = '20261009160000-initial-policy-system-actor.cjs';
const db = new Sequelize(target, 'postgres', null, {
  host: '/var/run/postgresql',
  dialect: 'postgres',
  logging: false,
});
(async () => {
  try {
    const [current] = await db.query('SELECT current_database() AS name', {
      type: QueryTypes.SELECT,
    });
    if (current.name !== target) throw Error('Base incorrecte');
    const applied = await db.query('SELECT name FROM public."SequelizeMeta" WHERE name=:name', {
      replacements: { name },
      type: QueryTypes.SELECT,
    });
    if (applied.length) {
      console.log('Déjà appliquée :', name);
      return;
    }
    await require(path.join(__dirname, '../migrations', name)).up(db.getQueryInterface());
    await db.query('INSERT INTO public."SequelizeMeta" (name) VALUES (:name)', {
      replacements: { name },
    });
    console.log('Migration appliquée et enregistrée :', name);
  } catch (e) {
    console.error('ARRÊT :', e.message);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
})();
