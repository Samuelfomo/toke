'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Créer les types ENUM pour GlobalLicense s'ils n'existent pas
      await queryInterface.sequelize.query(
        `
        DO $$ 
        BEGIN
          -- Type pour le type de licence
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_type_enum') THEN
            CREATE TYPE license_type_enum AS ENUM ('CLOUD_FLEX', 'CLOUD_PRO', 'ON_PREMISE');
          END IF;
          
          -- Type pour le statut de licence
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_status_enum') THEN
            CREATE TYPE license_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED');
          END IF;
        END $$;
      `,
        { transaction },
      );

      // 2. Vérifier si la colonne total_seats_purchased existe déjà (créée par Sequelize)
      const [results] = await queryInterface.sequelize.query(
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'xa_global_license' 
        AND column_name = 'total_seats_purchased';
      `,
        { transaction },
      );

      // 3. Supprimer la colonne normale si elle existe
      if (results.length > 0) {
        await queryInterface.removeColumn('xa_global_license', 'total_seats_purchased', {
          transaction,
        });
        console.log('🔄 Colonne total_seats_purchased normale supprimée');
      }

      // 4. Créer une vue au lieu d'une colonne générée pour éviter les problèmes de référence circulaire
      await queryInterface.sequelize.query(
        `
        CREATE OR REPLACE VIEW xa_global_license_with_seat_count AS
        SELECT 
          gl.*,
          COALESCE((
            SELECT COUNT(*) 
            FROM xa_employee_license el
            WHERE el.global_license = gl.id
          ), 0) AS total_seats_purchased
        FROM xa_global_license gl;
      `,
        { transaction },
      );

      console.log('✅ Vue xa_global_license_with_seat_count créée');

      // 5. Ajouter les contraintes de validation
      await queryInterface.sequelize.query(
        `
        ALTER TABLE xa_global_license 
        ADD CONSTRAINT valid_period_dates CHECK (current_period_end > current_period_start);
      `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE xa_global_license 
        ADD CONSTRAINT valid_renewal_date CHECK (next_renewal_date >= current_period_end);
      `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE xa_global_license 
        ADD CONSTRAINT valid_billing_cycle CHECK (billing_cycle_months IN (1,3,6,12));
      `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE xa_global_license 
        ADD CONSTRAINT valid_minimum_seats CHECK (minimum_seats >= 1);
      `,
        { transaction },
      );

      console.log('✅ Contraintes de validation ajoutées');

      // 6. Créer des index pour optimiser les requêtes
      await queryInterface.addIndex(
        'xa_global_license',
        ['current_period_start', 'current_period_end'],
        {
          name: 'idx_global_license_period',
          transaction,
        },
      );

      await queryInterface.addIndex('xa_global_license', ['next_renewal_date'], {
        name: 'idx_global_license_renewal_date',
        transaction,
      });

      // Index sur la clé étrangère pour optimiser le calcul du nombre de sièges
      await queryInterface.addIndex('xa_employee_license', ['global_license'], {
        name: 'idx_employee_license_global_license_fk',
        transaction,
      });

      console.log('✅ Index créés pour optimiser les performances');

      await transaction.commit();
      console.log('🎉 Migration GlobalLicense terminée avec succès');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur dans la migration GlobalLicense:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Supprimer les contraintes
      await queryInterface.sequelize.query(
        `
        ALTER TABLE xa_global_license DROP CONSTRAINT IF EXISTS valid_period_dates;
        ALTER TABLE xa_global_license DROP CONSTRAINT IF EXISTS valid_renewal_date;
        ALTER TABLE xa_global_license DROP CONSTRAINT IF EXISTS valid_billing_cycle;
        ALTER TABLE xa_global_license DROP CONSTRAINT IF EXISTS valid_minimum_seats;
      `,
        { transaction },
      );

      // Supprimer les index
      await queryInterface.removeIndex('xa_global_license', 'idx_global_license_period', {
        transaction,
      });
      await queryInterface.removeIndex('xa_global_license', 'idx_global_license_renewal_date', {
        transaction,
      });
      await queryInterface.removeIndex(
        'xa_employee_license',
        'idx_employee_license_global_license_fk',
        { transaction },
      );

      // Supprimer la vue
      await queryInterface.sequelize.query(
        `
        DROP VIEW IF EXISTS xa_global_license_with_seat_count;
      `,
        { transaction },
      );

      // Recréer la colonne normale (pour le rollback)
      await queryInterface.addColumn(
        'xa_global_license',
        'total_seats_purchased',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        { transaction },
      );

      await transaction.commit();
      console.log('🔄 Rollback GlobalLicense terminé avec succès');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur dans le rollback GlobalLicense:', error);
      throw error;
    }
  },
};
