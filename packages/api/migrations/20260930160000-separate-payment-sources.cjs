'use strict';
module.exports = {
 async up(queryInterface) {
  const db = queryInterface.sequelize;
  await db.transaction(async transaction => {
   await db.query(`ALTER TABLE xa_payment_transaction ADD COLUMN source_type VARCHAR(16)`, {transaction});
   // Aucun lien historique n'est supprimé et aucune origine n'est devinée.
   await db.query(`UPDATE xa_payment_transaction SET source_type = 'LEGACY'`, {transaction});
   await db.query(`ALTER TABLE xa_payment_transaction
     ALTER COLUMN source_type SET NOT NULL,
     ALTER COLUMN billing_cycle DROP NOT NULL,
     ALTER COLUMN adjustment DROP NOT NULL,
     ADD CONSTRAINT payment_source_consistency CHECK (
       (source_type = 'CYCLE' AND billing_cycle IS NOT NULL AND adjustment IS NULL) OR
       (source_type = 'ADJUSTMENT' AND adjustment IS NOT NULL AND billing_cycle IS NULL) OR
       (source_type = 'LEGACY' AND billing_cycle IS NOT NULL AND adjustment IS NOT NULL)
     )`, {transaction});
  });
 },
 async down(queryInterface) {
  const db = queryInterface.sequelize;
  await db.transaction(async transaction => {
   const [rows] = await db.query(`SELECT COUNT(*) AS count FROM xa_payment_transaction
     WHERE billing_cycle IS NULL OR adjustment IS NULL`, {transaction});
   if (Number(rows[0].count) > 0) throw new Error('Rollback refused: single-source payments exist. Restore a backup or use a forward migration; do not fabricate historical links.');
   await db.query(`ALTER TABLE xa_payment_transaction
     DROP CONSTRAINT payment_source_consistency,
     ALTER COLUMN billing_cycle SET NOT NULL,
     ALTER COLUMN adjustment SET NOT NULL,
     DROP COLUMN source_type`, {transaction});
  });
 }
};
