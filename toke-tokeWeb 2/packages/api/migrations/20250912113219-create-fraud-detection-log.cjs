'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔍 Création du système de détection de fraude...');

      // 1. Créer les types ENUM pour la détection de fraude
      await queryInterface.sequelize.query(
        `
        DO $$ 
        BEGIN
          -- Type pour les types de fraude détectée
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fraud_detection_enum') THEN
            CREATE TYPE fraud_detection_enum AS ENUM (
              'SUSPICIOUS_LEAVE_PATTERN',
              'MASS_DEACTIVATION', 
              'UNUSUAL_ACTIVITY',
              'PRE_RENEWAL_MANIPULATION',
              'EXCESSIVE_TECHNICAL_LEAVE'
            );
          END IF;
          
          -- Type pour les niveaux de risque
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level_enum') THEN
            CREATE TYPE risk_level_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
          END IF;
        END $$;
      `,
        { transaction },
      );

      console.log('✅ Types ENUM créés');

      // 2. Créer la table fraud_detection_log (SANS le champ guid)
      await queryInterface.createTable(
        'xa_fraud_detection_log',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
            comment: 'Fraud Detection Log ID',
          },
          guid: {
            type: Sequelize.UUID,
            allowNull: false,
            defaultValue: Sequelize.UUIDV4,
            unique: {
              name: 'unique_fraud_detection_log_guid',
              msg: 'Fraud detection log GUID must be unique',
            },
            comment: 'GUID unique généré automatiquement',
          },
          tenant: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'xa_tenant',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            comment: 'Tenant référence',
          },
          detection_type: {
            type: 'fraud_detection_enum',
            allowNull: false,
            comment: 'Type de fraude détectée',
          },
          // employee_licenses_affected: {
          //   type: 'TEXT[]',
          //   allowNull: false,
          //   comment: 'Array des IDs employés concernés (références vers employee field)'
          // },
          employee_licenses_affected: {
            type: Sequelize.JSONB,
            allowNull: false,
            comment: 'Array des IDs employés concernés (références vers employee field)',
          },
          detection_criteria: {
            type: Sequelize.JSONB,
            allowNull: false,
            comment: "Détails sur ce qui a déclenché l'alerte",
          },
          risk_level: {
            type: 'risk_level_enum',
            allowNull: false,
            comment: 'Niveau de risque',
          },
          action_taken: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Action prise par admin',
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Notes administratives',
          },
          resolved_at: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Date de résolution',
          },
          resolved_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'Admin qui a résolu',
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
            comment: 'Date de création automatique',
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
            comment: 'Date de dernière mise à jour',
          },
        },
        {
          transaction,
          comment: 'Table de détection automatique de fraude',
        },
      );

      console.log('✅ Table xa_fraud_detection_log créée');

      // 3. Ajouter les contraintes de validation (SANS contrainte guid)
      await queryInterface.sequelize.query(
        `
        ALTER TABLE xa_fraud_detection_log
          ADD CONSTRAINT valid_employee_licenses_not_empty
            CHECK (array_length(employee_licenses_affected, 1) > 0);
      `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE xa_fraud_detection_log
          ADD CONSTRAINT valid_detection_criteria_not_empty
            CHECK (jsonb_typeof(detection_criteria) = 'object' AND detection_criteria != '{}'::jsonb);
      `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE xa_fraud_detection_log
          ADD CONSTRAINT valid_resolution_consistency
            CHECK (
              (resolved_at IS NULL AND resolved_by IS NULL) OR
              (resolved_at IS NOT NULL AND resolved_by IS NOT NULL)
              );
      `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE xa_fraud_detection_log
          ADD CONSTRAINT valid_resolved_after_created
            CHECK (resolved_at IS NULL OR resolved_at >= created_at);
      `,
        { transaction },
      );

      console.log('✅ Contraintes de validation ajoutées');

      // 4. Créer les index pour les performances
      await queryInterface.addIndex('xa_fraud_detection_log', ['guid'], {
        name: 'idx_fraud_detection_log_guid',
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('xa_fraud_detection_log', ['tenant'], {
        name: 'idx_fraud_detection_log_tenant',
        transaction,
      });

      await queryInterface.addIndex('xa_fraud_detection_log', ['detection_type'], {
        name: 'idx_fraud_detection_log_detection_type',
        transaction,
      });

      await queryInterface.addIndex('xa_fraud_detection_log', ['risk_level'], {
        name: 'idx_fraud_detection_log_risk_level',
        transaction,
      });

      await queryInterface.addIndex('xa_fraud_detection_log', ['resolved_at'], {
        name: 'idx_fraud_detection_log_resolved_at',
        transaction,
      });

      await queryInterface.addIndex('xa_fraud_detection_log', ['created_at'], {
        name: 'idx_fraud_detection_log_created_at',
        transaction,
      });

      // Index composé pour recherches fréquentes tenant + type + niveau
      await queryInterface.addIndex(
        'xa_fraud_detection_log',
        ['tenant', 'detection_type', 'risk_level'],
        {
          name: 'idx_fraud_detection_log_tenant_type_risk',
          transaction,
        },
      );

      // ✅ CORRECTION: Créer l'index partiel avec une requête SQL directe
      await queryInterface.sequelize.query(
        `
        CREATE INDEX idx_fraud_detection_log_tenant_resolved
        ON xa_fraud_detection_log (tenant, resolved_at)
        WHERE resolved_at IS NULL;
      `,
        { transaction },
      );

      console.log('✅ Index de performance créés');

      // Note: Suppression de toutes les fonctions et triggers liés au GUID
      // car ils ne sont plus nécessaires sans le champ guid

      await transaction.commit();
      console.log('🎉 Migration fraud_detection_log terminée avec succès');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur dans la migration fraud_detection_log:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Supprimer les index (y compris l'index partiel créé manuellement)
      await queryInterface.removeIndex('xa_fraud_detection_log', 'idx_fraud_detection_log_guid', {
        transaction,
      });
      await queryInterface.removeIndex('xa_fraud_detection_log', 'idx_fraud_detection_log_tenant', {
        transaction,
      });
      await queryInterface.removeIndex(
        'xa_fraud_detection_log',
        'idx_fraud_detection_log_detection_type',
        { transaction },
      );
      await queryInterface.removeIndex(
        'xa_fraud_detection_log',
        'idx_fraud_detection_log_risk_level',
        { transaction },
      );
      await queryInterface.removeIndex(
        'xa_fraud_detection_log',
        'idx_fraud_detection_log_resolved_at',
        { transaction },
      );
      await queryInterface.removeIndex(
        'xa_fraud_detection_log',
        'idx_fraud_detection_log_created_at',
        { transaction },
      );
      await queryInterface.removeIndex(
        'xa_fraud_detection_log',
        'idx_fraud_detection_log_tenant_type_risk',
        { transaction },
      );

      // Supprimer l'index partiel manuellement
      await queryInterface.sequelize.query(
        `
        DROP INDEX IF EXISTS idx_fraud_detection_log_tenant_resolved;
      `,
        { transaction },
      );

      // Supprimer la table
      await queryInterface.dropTable('xa_fraud_detection_log', { transaction });

      // Supprimer les types ENUM
      await queryInterface.sequelize.query(
        `
        DROP TYPE IF EXISTS fraud_detection_enum;
        DROP TYPE IF EXISTS risk_level_enum;
      `,
        { transaction },
      );

      await transaction.commit();
      console.log('🔄 Rollback fraud_detection_log terminé avec succès');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur dans le rollback fraud_detection_log:', error);
      throw error;
    }
  },
};
