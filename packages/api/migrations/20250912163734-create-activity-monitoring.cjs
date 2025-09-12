'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('📊 Création du système de monitoring d\'activité...');

      // 1. Créer le type ENUM pour le statut d'activité
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN
          -- Type pour les statuts d'activité
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_status_enum') THEN
            CREATE TYPE activity_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPICIOUS');
          END IF;
        END $$;
      `, { transaction });

      console.log('✅ Type ENUM activity_status_enum créé');

      // 2. Créer la table activity_monitoring
      await queryInterface.createTable('xa_activity_monitoring', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          comment: 'Activity Monitoring ID'
        },
        employee_license: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'xa_employee_license',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Employee license référence'
        },
        monitoring_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          comment: 'Date du monitoring (format YYYY-MM-DD)'
        },
        last_punch_date: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Date du dernier pointage'
        },
        punch_count_7_days: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Nombre de pointages sur 7 jours'
        },
        punch_count_30_days: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Nombre de pointages sur 30 jours'
        },
        consecutive_absent_days: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Nombre de jours d\'absence consécutifs'
        },
        status_at_date: {
          type: 'activity_status_enum',
          allowNull: false,
          defaultValue: 'INACTIVE',
          comment: 'Statut calculé à la date'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
          comment: 'Date de création'
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
          comment: 'Date de dernière mise à jour'
        }
      }, {
        transaction,
        comment: 'Table de monitoring automatique de l\'activité des employés'
      });

      console.log('✅ Table xa_activity_monitoring créée');

      // 3. Ajouter les contraintes de validation
      await queryInterface.sequelize.query(`
        ALTER TABLE xa_activity_monitoring 
        ADD CONSTRAINT valid_punch_counts_positive 
        CHECK (punch_count_7_days >= 0 AND punch_count_30_days >= 0);
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE xa_activity_monitoring 
        ADD CONSTRAINT valid_consecutive_absent_days 
        CHECK (consecutive_absent_days >= 0);
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE xa_activity_monitoring 
        ADD CONSTRAINT valid_7_days_less_than_30_days 
        CHECK (punch_count_7_days <= punch_count_30_days);
      `, { transaction });

      console.log('✅ Contraintes de validation ajoutées');

      // 4. Créer les index pour les performances
      await queryInterface.addIndex('xa_activity_monitoring', ['employee_license'], {
        name: 'idx_activity_monitoring_employee_license',
        transaction
      });

      await queryInterface.addIndex('xa_activity_monitoring', ['monitoring_date'], {
        name: 'idx_activity_monitoring_monitoring_date',
        transaction
      });

      await queryInterface.addIndex('xa_activity_monitoring', ['last_punch_date'], {
        name: 'idx_activity_monitoring_last_punch_date',
        transaction
      });

      await queryInterface.addIndex('xa_activity_monitoring', ['status_at_date'], {
        name: 'idx_activity_monitoring_status_at_date',
        transaction
      });

      await queryInterface.addIndex('xa_activity_monitoring', ['punch_count_7_days'], {
        name: 'idx_activity_monitoring_punch_count_7_days',
        transaction
      });

      await queryInterface.addIndex('xa_activity_monitoring', ['consecutive_absent_days'], {
        name: 'idx_activity_monitoring_consecutive_absent_days',
        transaction
      });

      // Index unique composite pour éviter les doublons
      await queryInterface.addIndex('xa_activity_monitoring', ['employee_license', 'monitoring_date'], {
        name: 'idx_activity_monitoring_employee_licence_monitoring_date',
        unique: true,
        transaction
      });

      // Index composé pour requêtes fréquentes
      await queryInterface.addIndex('xa_activity_monitoring', ['employee_license', 'status_at_date'], {
        name: 'idx_activity_monitoring_employee_status',
        transaction
      });

      console.log('✅ Index de performance créés');

      await transaction.commit();
      console.log('🎉 Migration activity_monitoring terminée avec succès');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur dans la migration activity_monitoring:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Supprimer les index
      await queryInterface.removeIndex('xa_activity_monitoring', 'idx_activity_monitoring_employee_license', { transaction });
      await queryInterface.removeIndex('xa_activity_monitoring', 'idx_activity_monitoring_monitoring_date', { transaction });
      await queryInterface.removeIndex('xa_activity_monitoring', 'idx_activity_monitoring_last_punch_date', { transaction });
      await queryInterface.removeIndex('xa_activity_monitoring', 'idx_activity_monitoring_status_at_date', { transaction });
      await queryInterface.removeIndex('xa_activity_monitoring', 'idx_activity_monitoring_punch_count_7_days', { transaction });
      await queryInterface.removeIndex('xa_activity_monitoring', 'idx_activity_monitoring_consecutive_absent_days', { transaction });
      await queryInterface.removeIndex('xa_activity_monitoring', 'idx_activity_monitoring_employee_licence_monitoring_date', { transaction });
      await queryInterface.removeIndex('xa_activity_monitoring', 'idx_activity_monitoring_employee_status', { transaction });

      // Supprimer la table
      await queryInterface.dropTable('xa_activity_monitoring', { transaction });

      // Supprimer le type ENUM
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS activity_status_enum;
      `, { transaction });

      await transaction.commit();
      console.log('🔄 Rollback activity_monitoring terminé avec succès');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur dans le rollback activity_monitoring:', error);
      throw error;
    }
  }
};