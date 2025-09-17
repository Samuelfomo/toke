'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('⚡ Implémentation des triggers de monitoring automatique...');

      // 1. Fonction pour calculer les compteurs de pointages
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION calculate_punch_counts(
          p_employee_license_id INTEGER,
          p_reference_date DATE DEFAULT CURRENT_DATE
        )
        RETURNS TABLE (
          punch_count_7_days INTEGER,
          punch_count_30_days INTEGER,
          last_punch_date TIMESTAMPTZ
        ) AS $$
        DECLARE
          date_7_days_ago DATE := p_reference_date - INTERVAL '7 days';
          date_30_days_ago DATE := p_reference_date - INTERVAL '30 days';
        BEGIN
          RETURN QUERY
          SELECT 
            -- Comptage sur 7 jours
            COALESCE((
              SELECT COUNT(*)::INTEGER 
              FROM xa_employee_license el
              WHERE el.id = p_employee_license_id
              AND el.last_activity_date >= date_7_days_ago
              AND el.last_activity_date < p_reference_date + INTERVAL '1 day'
            ), 0) as punch_count_7_days,
            
            -- Comptage sur 30 jours  
            COALESCE((
              SELECT COUNT(*)::INTEGER
              FROM xa_employee_license el
              WHERE el.id = p_employee_license_id
              AND el.last_activity_date >= date_30_days_ago
              AND el.last_activity_date < p_reference_date + INTERVAL '1 day'
            ), 0) as punch_count_30_days,
            
            -- Dernière date de pointage
            (
              SELECT el.last_activity_date
              FROM xa_employee_license el
              WHERE el.id = p_employee_license_id
            ) as last_punch_date;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      console.log('✅ Fonction calculate_punch_counts créée');

      // 2. Fonction pour calculer les jours d'absence consécutifs
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION calculate_consecutive_absent_days(
          p_employee_license_id INTEGER,
          p_reference_date DATE DEFAULT CURRENT_DATE
        )
        RETURNS INTEGER AS $$
        DECLARE
          last_activity_date DATE;
          consecutive_days INTEGER := 0;
        BEGIN
          -- Récupérer la dernière date d'activité
          SELECT DATE(el.last_activity_date) INTO last_activity_date
          FROM xa_employee_license el
          WHERE el.id = p_employee_license_id;

          -- Si pas d'activité enregistrée, considérer comme absent depuis toujours
          IF last_activity_date IS NULL THEN
            RETURN 999; -- Valeur symbolique pour "pas d'activité"
          END IF;

          -- Calculer les jours d'absence depuis la dernière activité
          consecutive_days := p_reference_date - last_activity_date;

          -- Si l'employé a pointé aujourd'hui ou dans le futur, pas d'absence
          IF consecutive_days <= 0 THEN
            consecutive_days := 0;
          END IF;

          RETURN consecutive_days;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      console.log('✅ Fonction calculate_consecutive_absent_days créée');

      // 3. Fonction pour déterminer le statut d'activité
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION determine_activity_status(
          p_punch_count_7_days INTEGER,
          p_consecutive_absent_days INTEGER,
          p_employee_license_id INTEGER
        )
        RETURNS activity_status_enum AS $$
        DECLARE
          employee_status RECORD;
          calculated_status activity_status_enum;
        BEGIN
          -- Récupérer les informations de l'employé
          SELECT 
            el.declared_long_leave,
            el.contractual_status
           -- el.computed_billing_status
          INTO employee_status
          FROM xa_employee_license el
          WHERE el.id = p_employee_license_id;

          -- Si employé terminé/suspendu, statut INACTIVE
          IF employee_status.contractual_status IN ('TERMINATED', 'SUSPENDED') THEN
            RETURN 'INACTIVE'::activity_status_enum;
          END IF;

          -- Si en congé long déclaré légalement, statut INACTIVE (normal)
          IF employee_status.declared_long_leave = true THEN
            RETURN 'INACTIVE'::activity_status_enum;
          END IF;

          -- Règles de détection d'activité normale
          IF p_punch_count_7_days >= 3 THEN
            -- Activité régulière = ACTIVE
            RETURN 'ACTIVE'::activity_status_enum;
          
          ELSIF p_punch_count_7_days >= 1 THEN
            -- Activité faible mais présente = ACTIVE (mais surveillé)
            RETURN 'ACTIVE'::activity_status_enum;
          
          ELSIF p_consecutive_absent_days <= 7 THEN
            -- Absence courte sans congé déclaré = SUSPICIOUS
            RETURN 'SUSPICIOUS'::activity_status_enum;
          
          ELSIF p_consecutive_absent_days <= 30 THEN
            -- Absence prolongée non justifiée = très SUSPICIOUS
            RETURN 'SUSPICIOUS'::activity_status_enum;
          
          ELSE
            -- Absence très longue = INACTIVE (probablement légitime mais non déclarée)
            RETURN 'INACTIVE'::activity_status_enum;
          END IF;

        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      console.log('✅ Fonction determine_activity_status créée');

      // 4. Fonction principale de mise à jour du monitoring
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION update_activity_monitoring(
          p_employee_license_id INTEGER,
          p_monitoring_date DATE DEFAULT CURRENT_DATE
        )
        RETURNS VOID AS $$
        DECLARE
          punch_stats RECORD;
          consecutive_absent INTEGER;
          calculated_status activity_status_enum;
        BEGIN
          -- Calculer les statistiques de pointage
          SELECT * INTO punch_stats
          FROM calculate_punch_counts(p_employee_license_id, p_monitoring_date);

          -- Calculer les jours d'absence consécutifs
          consecutive_absent := calculate_consecutive_absent_days(p_employee_license_id, p_monitoring_date);

          -- Déterminer le statut
          calculated_status := determine_activity_status(
            punch_stats.punch_count_7_days,
            consecutive_absent,
            p_employee_license_id
          );

          -- Insérer ou mettre à jour l'enregistrement
          INSERT INTO xa_activity_monitoring (
            employee_license,
            monitoring_date,
            last_punch_date,
            punch_count_7_days,
            punch_count_30_days,
            consecutive_absent_days,
            status_at_date,
            created_at,      -- ✅ AJOUTER
            updated_at       -- ✅ AJOUTER
          ) VALUES (
            p_employee_license_id,
            p_monitoring_date,
            punch_stats.last_punch_date,
            punch_stats.punch_count_7_days,
            punch_stats.punch_count_30_days,
            consecutive_absent,
            calculated_status,
            NOW(),           -- ✅ AJOUTER
            NOW()            -- ✅ AJOUTER
          )
          ON CONFLICT (employee_license, monitoring_date)
          DO UPDATE SET
            last_punch_date = EXCLUDED.last_punch_date,
            punch_count_7_days = EXCLUDED.punch_count_7_days,
            punch_count_30_days = EXCLUDED.punch_count_30_days,
            consecutive_absent_days = EXCLUDED.consecutive_absent_days,
            status_at_date = EXCLUDED.status_at_date,
            updated_at = NOW();

          -- Log pour debug (optionnel)
          -- RAISE NOTICE 'Activity monitoring updated for employee_license %: % pointages (7j), statut %', 
          --             p_employee_license_id, punch_stats.punch_count_7_days, calculated_status;

        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      console.log('✅ Fonction update_activity_monitoring créée');

      // 5. Trigger sur employee_license pour mise à jour automatique
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION employee_license_activity_trigger()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Déclencheur sur modification de last_activity_date
          IF (TG_OP = 'UPDATE' AND 
              (OLD.last_activity_date IS NULL OR NEW.last_activity_date > OLD.last_activity_date)) OR
             (TG_OP = 'INSERT' AND NEW.last_activity_date IS NOT NULL) THEN
            
            -- Mettre à jour le monitoring pour aujourd'hui
            PERFORM update_activity_monitoring(NEW.id, CURRENT_DATE);
            
            -- Optionnel: mettre à jour aussi pour hier si le pointage était récent
            IF NEW.last_activity_date >= CURRENT_DATE - INTERVAL '1 day' THEN
              PERFORM update_activity_monitoring(NEW.id, CURRENT_DATE - INTERVAL '1 day');
            END IF;
          END IF;

          -- Déclencheur sur changement de statut contractuel ou congé
          IF (TG_OP = 'UPDATE' AND 
              (OLD.contractual_status != NEW.contractual_status OR 
               OLD.declared_long_leave != NEW.declared_long_leave)) THEN
            
            -- Recalculer le monitoring pour aujourd'hui
            PERFORM update_activity_monitoring(NEW.id, CURRENT_DATE);
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE TRIGGER trigger_employee_license_activity_monitoring
        AFTER INSERT OR UPDATE ON xa_employee_license
        FOR EACH ROW
        EXECUTE FUNCTION employee_license_activity_trigger();
      `, { transaction });

      console.log('✅ Trigger employee_license_activity_monitoring créé');

      // 6. Fonction de batch pour mise à jour quotidienne (optionnel - pour cron job)
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION daily_activity_monitoring_batch(
          p_target_date DATE DEFAULT CURRENT_DATE
        )
        RETURNS INTEGER AS $$
        DECLARE
          employee_record RECORD;
          processed_count INTEGER := 0;
        BEGIN
          -- Parcourir tous les employés actifs
          FOR employee_record IN
            SELECT DISTINCT el.id
            FROM xa_employee_license el
            WHERE el.contractual_status = 'ACTIVE'
          LOOP
            -- Mettre à jour le monitoring pour chaque employé
            PERFORM update_activity_monitoring(employee_record.id, p_target_date);
            processed_count := processed_count + 1;
          END LOOP;

          RAISE NOTICE 'Daily activity monitoring batch completed: % employees processed for date %', 
                      processed_count, p_target_date;

          RETURN processed_count;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      console.log('✅ Fonction daily_activity_monitoring_batch créée');

      await queryInterface.sequelize.query(`
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`, { transaction });

      // 7. Trigger updated_at pour xa_activity_monitoring
      await queryInterface.sequelize.query(`
        CREATE TRIGGER trigger_activity_monitoring_updated_at
        BEFORE UPDATE ON xa_activity_monitoring
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `, { transaction });

      console.log('✅ Trigger updated_at configuré');

      await transaction.commit();
      console.log('🎉 Système de monitoring automatique d\'activité opérationnel!');
      console.log('📊 Fonctionnalités:');
      console.log('   - Calcul automatique des compteurs de pointages (7j/30j)');
      console.log('   - Détection des absences consécutives');
      console.log('   - Classification automatique: ACTIVE, INACTIVE, SUSPICIOUS');
      console.log('   - Mise à jour en temps réel sur modification employee_license');
      console.log('   - Fonction batch quotidienne disponible: SELECT daily_activity_monitoring_batch();');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur dans la migration des triggers activity_monitoring:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Supprimer le trigger
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS trigger_employee_license_activity_monitoring ON xa_employee_license;
        DROP TRIGGER IF EXISTS trigger_activity_monitoring_updated_at ON xa_activity_monitoring;
      `, { transaction });

      // Supprimer toutes les fonctions
      await queryInterface.sequelize.query(`
        DROP FUNCTION IF EXISTS employee_license_activity_trigger();
        DROP FUNCTION IF EXISTS update_activity_monitoring(INTEGER, DATE);
        DROP FUNCTION IF EXISTS determine_activity_status(INTEGER, INTEGER, INTEGER);
        DROP FUNCTION IF EXISTS calculate_consecutive_absent_days(INTEGER, DATE);
        DROP FUNCTION IF EXISTS calculate_punch_counts(INTEGER, DATE);
        DROP FUNCTION IF EXISTS daily_activity_monitoring_batch(DATE);
      `, { transaction });

      await transaction.commit();
      console.log('🔄 Rollback des triggers activity_monitoring terminé');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur dans le rollback des triggers activity_monitoring:', error);
      throw error;
    }
  }
};