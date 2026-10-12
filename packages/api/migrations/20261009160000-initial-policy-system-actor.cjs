'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query(`
        ALTER TABLE public.xa_monthly_license_policy
          ALTER COLUMN actor_user_guid DROP NOT NULL,
          ALTER COLUMN actor_tenant_guid DROP NOT NULL;
      `, { transaction });
    });
  },
  async down() {
    throw new Error('System-authored policies exist; use a reviewed forward migration');
  }
};
