'use strict';
module.exports = {
 async up(queryInterface) {
  await queryInterface.sequelize.transaction(async transaction => {
   await queryInterface.sequelize.query('ALTER TABLE xa_cash_receipt RENAME COLUMN actor_id TO actor_user_guid', {transaction});
  });
 },
 async down(queryInterface) {
  await queryInterface.sequelize.transaction(async transaction => {
   await queryInterface.sequelize.query('ALTER TABLE xa_cash_receipt RENAME COLUMN actor_user_guid TO actor_id', {transaction});
  });
 }
};
