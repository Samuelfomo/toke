'use strict';
// Base master seulement. Ne pas installer dans les bases tenant.
const VIEW = 'xa_employee_license_with_billing_status';
module.exports = {
  async up(queryInterface) {
    const db = queryInterface.sequelize;
    await db.transaction(async transaction => {
      await db.query(`CREATE TABLE xa_license_lot2_rollback (
        singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
        view_definition text,
        constraint_definition text
      )`, { transaction });
      await db.query(`INSERT INTO xa_license_lot2_rollback (view_definition, constraint_definition)
        SELECT CASE WHEN to_regclass('${VIEW}') IS NOT NULL THEN pg_get_viewdef(to_regclass('${VIEW}'), true) END,
        (SELECT pg_get_constraintdef(oid) FROM pg_constraint
         WHERE conrelid = 'xa_employee_license'::regclass
         AND conname = 'no_long_leave_with_recent_activity')`, { transaction });
      await db.query(`ALTER TABLE xa_employee_license
        DROP CONSTRAINT IF EXISTS no_long_leave_with_recent_activity`, { transaction });
      await db.query(`DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_status_computed_enum') THEN
          CREATE TYPE billing_status_computed_enum AS ENUM ('BILLABLE', 'GRACE_PERIOD', 'NON_BILLABLE', 'TERMINATED');
        END IF;
      END $$`, { transaction });
      // Le pointage récent ne doit plus empêcher une déclaration de congé.
      // Exclure une éventuelle ancienne colonne physique de la projection.
      await db.query(`DO $$ DECLARE cols text; BEGIN
        SELECT string_agg(format('el.%I', attname), ', ' ORDER BY attnum) INTO cols
        FROM pg_attribute WHERE attrelid = 'xa_employee_license'::regclass
          AND attnum > 0 AND NOT attisdropped AND attname <> 'computed_billing_status';
        EXECUTE 'CREATE OR REPLACE VIEW ${VIEW} AS SELECT ' || cols || ',
          CASE
            WHEN el.contractual_status = ''TERMINATED'' THEN ''TERMINATED''::billing_status_computed_enum
            WHEN el.contractual_status <> ''ACTIVE'' THEN ''NON_BILLABLE''::billing_status_computed_enum
            WHEN el.deactivation_date IS NOT NULL AND el.deactivation_date <= CURRENT_TIMESTAMP
              THEN ''NON_BILLABLE''::billing_status_computed_enum
            WHEN el.declared_long_leave IS TRUE THEN ''NON_BILLABLE''::billing_status_computed_enum
            ELSE ''BILLABLE''::billing_status_computed_enum
          END AS computed_billing_status FROM xa_employee_license el';
      END $$`, { transaction });
    });
  },
  async down(queryInterface) {
    const db = queryInterface.sequelize;
    await db.transaction(async transaction => {
      const [rows] = await db.query('SELECT * FROM xa_license_lot2_rollback WHERE singleton = true', { transaction });
      if (rows.length !== 1) throw new Error('Lot 2 rollback snapshot is missing');
      if (rows[0].view_definition) {
        await db.query(`CREATE OR REPLACE VIEW ${VIEW} AS ${rows[0].view_definition}`, { transaction });
      } else {
        await db.query(`DROP VIEW ${VIEW}`, { transaction });
      }
      if (rows[0].constraint_definition) {
        await db.query(`ALTER TABLE xa_employee_license ADD CONSTRAINT no_long_leave_with_recent_activity ${rows[0].constraint_definition}`, { transaction });
      }
      await db.query('DROP TABLE xa_license_lot2_rollback', { transaction });
    });
  },
};
