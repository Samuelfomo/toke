'use strict';
const { Sequelize, QueryTypes } = require('sequelize');
(async () => {
  const args = process.argv.slice(2);
  const value = (p) => args.find((x) => x.startsWith(p))?.slice(p.length);
  const target = value('--database=') || 'toke_master',
    transaction = Number(value('--transaction='));
  if (
    !/^toke_master(?:_license_test_[A-Za-z0-9_]+)?$/.test(target) ||
    !Number.isInteger(transaction) ||
    transaction < 100000 ||
    transaction > 999999
  )
    throw Error('Specify --transaction=<public GUID> and an allowed master database');
  const db = new Sequelize(target, 'postgres', null, {
    host: '/var/run/postgresql',
    port: 5432,
    dialect: 'postgres',
    logging: false,
  });
  try {
    const [current] = await db.query('SELECT current_database() AS name', {
      type: QueryTypes.SELECT,
    });
    if (current.name !== target) throw Error('Database mismatch');
    const { default: Db } =
      await import('../dist/master/database/base_model/db.normalize-initial-xaf.js');
    const { default: Business } = await import('../dist/master/class/NormalizeInitialXaf.js');
    const service = new Business(new Db(db));
    console.log(
      await (args.includes('--apply') ? service.apply(transaction) : service.preview(transaction)),
    );
  } finally {
    await db.close();
  }
})().catch((error) => {
  console.error('Normalization stopped:', error.message);
  process.exitCode = 1;
});
