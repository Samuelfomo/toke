// migrations/20250909094204-add-computed-billing-status.cjs
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Créer les types ENUM s'ils n'existent pas déjà
      await queryInterface.sequelize.query(
        `
        DO $$ 
        BEGIN
          -- Type pour le statut contractuel
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contractual_status_enum') THEN
            CREATE TYPE contractual_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED');
          END IF;
          
          -- Type pour les types de congé
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_type_enum') THEN
            CREATE TYPE leave_type_enum AS ENUM ('PARENTAL', 'MEDICAL', 'TECHNICAL', 'SABBATICAL', 'OTHER');
          END IF;
          
          -- Type pour le statut de facturation calculé
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_status_computed_enum') THEN
            CREATE TYPE billing_status_computed_enum AS ENUM ('BILLABLE', 'GRACE_PERIOD', 'NON_BILLABLE', 'TERMINATED');
          END IF;
        END $$;
      `,
        { transaction },
      );

      // 2. Vérifier si la colonne existe déjà (créée par Sequelize sync)
      const [results] = await queryInterface.sequelize.query(
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'xa_employee_license' 
        AND column_name = 'computed_billing_status';
      `,
        { transaction },
      );

      // 3. Supprimer la colonne normale si elle existe
      if (results.length > 0) {
        await queryInterface.removeColumn('xa_employee_license', 'computed_billing_status', {
          transaction,
        });
        console.log('🔄 Colonne computed_billing_status normale supprimée');
      }

      // 4. Créer une vue au lieu d'une colonne générée (pour éviter le problème d'immutabilité)
      await queryInterface.sequelize.query(
        `
        CREATE OR REPLACE VIEW xa_employee_license_with_billing_status AS
        SELECT 
          *,
          CASE
            -- Règle 1: A pointé dans les 7 derniers jours = TOUJOURS facturable
            WHEN last_activity_date >= NOW() - INTERVAL '7 days' 
            THEN 'BILLABLE'::billing_status_computed_enum
            
            -- Règle 2: Pas de pointage + déclaré en congé = non facturable
            WHEN (last_activity_date IS NULL OR last_activity_date < NOW() - INTERVAL '7 days')
                 AND declared_long_leave = TRUE 
            THEN 'NON_BILLABLE'::billing_status_computed_enum
            
            -- Règle 3: Pas de pointage + pas déclaré + licence active = période de grâce
            WHEN (last_activity_date IS NULL OR last_activity_date < NOW() - INTERVAL '7 days')
                 AND declared_long_leave = FALSE
                 AND contractual_status = 'ACTIVE'
                 AND (deactivation_date IS NULL OR deactivation_date >= NOW() - INTERVAL '7 days')
            THEN 'GRACE_PERIOD'::billing_status_computed_enum
            
            -- Règle 4: Licence terminée = statut terminé
            WHEN contractual_status = 'TERMINATED'
            THEN 'TERMINATED'::billing_status_computed_enum
            
            -- Règle 5: Autres cas = non facturable
            ELSE 'NON_BILLABLE'::billing_status_computed_enum
          END AS computed_billing_status
        FROM xa_employee_license;
      `,
        { transaction },
      );

      console.log('✅ Vue xa_employee_license_with_billing_status créée');

      // 5. Ajouter les contraintes anti-fraude
      // await queryInterface.sequelize.query(`
      //   ALTER TABLE xa_employee_license
      //   ADD CONSTRAINT no_long_leave_with_recent_activity CHECK (
      //     NOT (declared_long_leave = TRUE AND last_activity_date >= NOW() - INTERVAL '7 days')
      //   );
      // `, { transaction });
      // Vérifier si la contrainte existe déjà
      const [constraintExists] = await queryInterface.sequelize.query(
        `
  SELECT constraint_name 
  FROM information_schema.table_constraints 
  WHERE table_name = 'xa_employee_license' 
  AND constraint_name = 'no_long_leave_with_recent_activity';
`,
        { transaction },
      );

      if (constraintExists.length === 0) {
        await queryInterface.sequelize.query(
          `
    ALTER TABLE xa_employee_license 
    ADD CONSTRAINT no_long_leave_with_recent_activity CHECK (
      NOT (declared_long_leave = TRUE AND last_activity_date >= NOW() - INTERVAL '7 days')
    );
  `,
          { transaction },
        );
      }

      const [validLongLeaveConstraint] = await queryInterface.sequelize.query(
        `
  SELECT constraint_name 
  FROM information_schema.table_constraints 
  WHERE table_name = 'xa_employee_license' 
  AND constraint_name = 'valid_long_leave_data';
`,
        { transaction },
      );

      if (validLongLeaveConstraint.length === 0) {
        await queryInterface.sequelize.query(
          `
          ALTER TABLE xa_employee_license
            ADD CONSTRAINT valid_long_leave_data CHECK (
              (declared_long_leave = FALSE) OR
              (declared_long_leave = TRUE AND long_leave_declared_by IS NOT NULL AND long_leave_declared_at IS NOT NULL)
              );
        `,
          { transaction },
        );
      }

      // await queryInterface.sequelize.query(`
      //   ALTER TABLE xa_employee_license
      //   ADD CONSTRAINT valid_long_leave_data CHECK (
      //     (declared_long_leave = FALSE) OR
      //     (declared_long_leave = TRUE AND long_leave_declared_by IS NOT NULL AND long_leave_declared_at IS NOT NULL)
      //   );
      // `, { transaction });

      const [validDeactivationDateConstraint] = await queryInterface.sequelize.query(
        `
  SELECT constraint_name 
  FROM information_schema.table_constraints 
  WHERE table_name = 'xa_employee_license' 
  AND constraint_name = 'valid_deactivation_date';
`,
        { transaction },
      );

      if (validDeactivationDateConstraint.length === 0) {
        await queryInterface.sequelize.query(
          `
          ALTER TABLE xa_employee_license
            ADD CONSTRAINT valid_deactivation_date CHECK (
              deactivation_date IS NULL OR deactivation_date >= activation_date
              );
        `,
          { transaction },
        );
      }

      // await queryInterface.sequelize.query(`
      //   ALTER TABLE xa_employee_license
      //   ADD CONSTRAINT valid_deactivation_date CHECK (
      //     deactivation_date IS NULL OR deactivation_date >= activation_date
      //   );
      // `, { transaction });

      console.log('✅ Contraintes de validation ajoutées');

      // 6. Créer un index sur les colonnes utilisées dans le calcul
      await queryInterface.addIndex(
        'xa_employee_license',
        ['last_activity_date', 'declared_long_leave', 'contractual_status'],
        {
          name: 'idx_employee_license_billing_status_calc',
          transaction,
        },
      );

      console.log('✅ Index créé pour optimiser le calcul du statut de facturation');

      await transaction.commit();
      console.log('🎉 Migration terminée avec succès');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur dans la migration:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Supprimer les contraintes
      await queryInterface.sequelize.query(
        `
        ALTER TABLE xa_employee_license DROP CONSTRAINT IF EXISTS no_long_leave_with_recent_activity;
        ALTER TABLE xa_employee_license DROP CONSTRAINT IF EXISTS valid_long_leave_data;
        ALTER TABLE xa_employee_license DROP CONSTRAINT IF EXISTS valid_deactivation_date;
      `,
        { transaction },
      );

      // Supprimer l'index
      await queryInterface.removeIndex(
        'xa_employee_license',
        'idx_employee_license_billing_status_calc',
        { transaction },
      );

      // Supprimer la vue
      await queryInterface.sequelize.query(
        `
        DROP VIEW IF EXISTS xa_employee_license_with_billing_status;
      `,
        { transaction },
      );

      // Recréer la colonne normale (pour le rollback)
      await queryInterface.addColumn(
        'xa_employee_license',
        'computed_billing_status',
        {
          type: Sequelize.ENUM('BILLABLE', 'GRACE_PERIOD', 'NON_BILLABLE', 'TERMINATED'),
          allowNull: false,
          defaultValue: 'BILLABLE',
        },
        { transaction },
      );

      await transaction.commit();
      console.log('🔄 Rollback terminé avec succès');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur dans le rollback:', error);
      throw error;
    }
  },
};
