'use strict';
module.exports = {
 async up(queryInterface) {
  await queryInterface.sequelize.transaction(async transaction => {
   await queryInterface.sequelize.query(`CREATE TABLE xa_paid_seat_grant (
    id BIGSERIAL PRIMARY KEY,
    global_license INTEGER NOT NULL REFERENCES xa_global_license(id),
    billing_cycle INTEGER NOT NULL REFERENCES xa_billing_cycle(id),
    adjustment INTEGER UNIQUE REFERENCES xa_license_adjustment(id),
    payment_transaction INTEGER NOT NULL UNIQUE REFERENCES xa_payment_transaction(id),
    source_type VARCHAR(16) NOT NULL CHECK (source_type IN ('CYCLE','ADJUSTMENT')),
    seats INTEGER NOT NULL CHECK (seats > 0),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL CHECK (valid_until > valid_from),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((source_type='CYCLE' AND adjustment IS NULL) OR (source_type='ADJUSTMENT' AND adjustment IS NOT NULL))
   );
   CREATE UNIQUE INDEX paid_cycle_grant_unique ON xa_paid_seat_grant (billing_cycle) WHERE source_type='CYCLE';
   CREATE FUNCTION prevent_paid_seat_grant_mutation() RETURNS TRIGGER AS $$
    BEGIN RAISE EXCEPTION 'Paid seat grants are append-only'; END; $$ LANGUAGE plpgsql;
   CREATE TRIGGER paid_seat_grant_append_only BEFORE UPDATE OR DELETE ON xa_paid_seat_grant
    FOR EACH ROW EXECUTE FUNCTION prevent_paid_seat_grant_mutation()`, {transaction});
  });
 },
 async down(queryInterface) {
  await queryInterface.sequelize.transaction(async transaction => {
   const [rows] = await queryInterface.sequelize.query('SELECT COUNT(*) AS count FROM xa_paid_seat_grant', {transaction});
   if (Number(rows[0].count)>0) throw new Error('Paid grants exist: destructive rollback refused');
   await queryInterface.sequelize.query('DROP TABLE xa_paid_seat_grant; DROP FUNCTION prevent_paid_seat_grant_mutation()', {transaction});
  });
 }
};
