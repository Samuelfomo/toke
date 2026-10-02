'use strict';
module.exports = {
 async up(queryInterface) {
  await queryInterface.sequelize.transaction(async transaction => {
   await queryInterface.sequelize.query(`CREATE TABLE xa_seat_assignment (
    id BIGSERIAL PRIMARY KEY,
    global_license INTEGER NOT NULL REFERENCES xa_global_license(id),
    billing_cycle INTEGER NOT NULL REFERENCES xa_billing_cycle(id),
    employee_license INTEGER NOT NULL REFERENCES xa_employee_license(id),
    assigned_at TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL CHECK (valid_until > assigned_at),
    assigned_by_user_guid VARCHAR(128) NOT NULL,
    released_at TIMESTAMPTZ,
    released_by_user_guid VARCHAR(128),
    release_reason VARCHAR(64),
    CHECK (released_at IS NULL OR released_at >= assigned_at),
    CHECK ((released_at IS NULL AND release_reason IS NULL AND released_by_user_guid IS NULL) OR
      (released_at IS NOT NULL AND release_reason IS NOT NULL))
   );
   CREATE UNIQUE INDEX seat_assignment_open_employee ON xa_seat_assignment(employee_license) WHERE released_at IS NULL;
   CREATE INDEX seat_assignment_license_period ON xa_seat_assignment(global_license, valid_until)`, {transaction});
  });
 },
 async down(queryInterface) {
  await queryInterface.sequelize.transaction(async transaction => {
   const [rows] = await queryInterface.sequelize.query('SELECT COUNT(*) AS count FROM xa_seat_assignment', {transaction});
   if (Number(rows[0].count)>0) throw new Error('Assignment history exists: destructive rollback refused');
   await queryInterface.sequelize.query('DROP TABLE xa_seat_assignment', {transaction});
  });
 }
};
