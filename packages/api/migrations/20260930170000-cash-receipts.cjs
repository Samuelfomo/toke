'use strict';
module.exports = {
 async up(queryInterface) {
  await queryInterface.sequelize.transaction(async transaction => {
   await queryInterface.sequelize.query(`CREATE TABLE xa_cash_receipt (
    id BIGSERIAL PRIMARY KEY,
    payment_transaction INTEGER NOT NULL UNIQUE REFERENCES xa_payment_transaction(id),
    tenant INTEGER NOT NULL REFERENCES xa_tenant(id),
    actor_id VARCHAR(255) NOT NULL,
    receipt_reference VARCHAR(128) NOT NULL UNIQUE,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    amount_local NUMERIC(12,2) NOT NULL CHECK (amount_local > 0),
    currency_code VARCHAR(3) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ NOT NULL,
    access_action VARCHAR(48) NOT NULL
   )`, {transaction});
   await queryInterface.sequelize.query(`CREATE FUNCTION prevent_cash_receipt_mutation() RETURNS TRIGGER AS $$
    BEGIN RAISE EXCEPTION 'Cash receipts are append-only'; END; $$ LANGUAGE plpgsql;
    CREATE TRIGGER cash_receipt_append_only BEFORE UPDATE OR DELETE ON xa_cash_receipt
    FOR EACH ROW EXECUTE FUNCTION prevent_cash_receipt_mutation()`, {transaction});
  });
 },
 async down(queryInterface) {
  await queryInterface.sequelize.transaction(async transaction => {
   const [rows] = await queryInterface.sequelize.query('SELECT COUNT(*) AS count FROM xa_cash_receipt', {transaction});
   if (Number(rows[0].count) > 0) throw new Error('Cash receipts exist: destructive rollback refused');
   await queryInterface.sequelize.query('DROP TABLE xa_cash_receipt; DROP FUNCTION prevent_cash_receipt_mutation()', {transaction});
  });
 }
};
