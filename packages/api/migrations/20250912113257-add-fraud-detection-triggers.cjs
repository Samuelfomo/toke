'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔧 Correction du trigger de détection de fraude...');

      // 1. Supprimer l'ancien trigger
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS trigger_employee_license_fraud_detection ON xa_employee_license;
      `, { transaction });

      // 2. Remplacer par la fonction corrigée avec logique intégrée
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION employee_license_fraud_detection_trigger()
        RETURNS TRIGGER AS $$
        DECLARE
          tenant_id INTEGER;
          total_employees INTEGER;
          long_leave_employees INTEGER;
          technical_leave_employees INTEGER;
          percentage_long_leave DECIMAL;
          percentage_technical DECIMAL;
          risk_level risk_level_enum;
          criteria JSONB;
          affected_employees TEXT[];
          
          -- Variables pour détection masse déactivation
          deactivations_24h INTEGER;
          percentage_deactivated DECIMAL;
          
          -- Variables pour pré-renouvellement
          next_renewal_date DATE;
          days_until_renewal INTEGER;
          recent_leave_declarations INTEGER;
        BEGIN
          -- Récupérer le tenant depuis la global_license
          SELECT gl.tenant INTO tenant_id
          FROM xa_global_license gl
          WHERE gl.id = NEW.global_license;

          -- Si pas de tenant trouvé, pas de détection
          IF tenant_id IS NULL THEN
            RETURN NEW;
          END IF;

          -- DÉTECTION 1: Patterns de congés suspects
          IF (TG_OP = 'INSERT' AND NEW.declared_long_leave = true) OR
             (TG_OP = 'UPDATE' AND OLD.declared_long_leave = false AND NEW.declared_long_leave = true) THEN
            
            -- Compter tous les employés actifs du tenant
            SELECT COUNT(*) INTO total_employees
            FROM xa_employee_license el
            JOIN xa_global_license gl ON el.global_license = gl.id
            WHERE gl.tenant = tenant_id
            AND el.contractual_status = 'ACTIVE';

            -- Éviter division par zéro
            IF total_employees > 0 THEN
              -- Compter employés en congé long
              SELECT COUNT(*), array_agg(el.employee) INTO long_leave_employees, affected_employees
              FROM xa_employee_license el
              JOIN xa_global_license gl ON el.global_license = gl.id
              WHERE gl.tenant = tenant_id
              AND el.contractual_status = 'ACTIVE'
              AND el.declared_long_leave = true;

              -- Compter congés techniques
              SELECT COUNT(*) INTO technical_leave_employees
              FROM xa_employee_license el
              JOIN xa_global_license gl ON el.global_license = gl.id
              WHERE gl.tenant = tenant_id
              AND el.contractual_status = 'ACTIVE'
              AND el.declared_long_leave = true
              AND el.long_leave_type = 'TECHNICAL';

              -- Calculer pourcentages
              percentage_long_leave := (long_leave_employees::DECIMAL / total_employees::DECIMAL) * 100;
              percentage_technical := (technical_leave_employees::DECIMAL / total_employees::DECIMAL) * 100;

              -- Déterminer niveau de risque
              IF percentage_long_leave > 50 OR percentage_technical > 30 THEN
                risk_level := 'CRITICAL';
              ELSIF percentage_long_leave > 30 OR percentage_technical > 20 THEN
                risk_level := 'HIGH';
              ELSIF percentage_long_leave > 15 OR percentage_technical > 10 THEN
                risk_level := 'MEDIUM';
              ELSE
                risk_level := NULL; -- Pas d'alerte
              END IF;

              -- Créer alerte si seuil dépassé
              IF risk_level IS NOT NULL THEN
                criteria := jsonb_build_object(
                  'total_employees', total_employees,
                  'long_leave_employees', long_leave_employees,
                  'technical_leave_employees', technical_leave_employees,
                  'percentage_long_leave', percentage_long_leave,
                  'percentage_technical', percentage_technical,
                  'detection_trigger', 'employee_license_update',
                  'triggered_by_employee', NEW.employee,
                  'timestamp', NOW()
                );

                INSERT INTO xa_fraud_detection_log (
                  tenant,
                  detection_type,
                  employee_licenses_affected,
                  detection_criteria,
                  risk_level,
                  created_at,
                  updated_at
                ) VALUES (
                  tenant_id,
                  CASE 
                    WHEN percentage_technical > 10 THEN 'EXCESSIVE_TECHNICAL_LEAVE'::fraud_detection_enum
                    ELSE 'SUSPICIOUS_LEAVE_PATTERN'::fraud_detection_enum
                  END,
                  COALESCE(affected_employees, ARRAY[NEW.employee]),
                  criteria,
                  risk_level,
                  NOW(),
                  NOW()
                );

                RAISE NOTICE 'ALERTE FRAUDE: % employés en congé (%.1f%%) détecté pour tenant %', 
                            long_leave_employees, percentage_long_leave, tenant_id;
              END IF;
            END IF;

            -- DÉTECTION 2: Manipulation pré-renouvellement
            SELECT gl.next_renewal_date INTO next_renewal_date
            FROM xa_global_license gl
            WHERE gl.id = NEW.global_license;

            IF next_renewal_date IS NOT NULL THEN
              days_until_renewal := next_renewal_date - CURRENT_DATE;

              IF days_until_renewal BETWEEN 0 AND 30 THEN
                SELECT COUNT(*), array_agg(el.employee) INTO recent_leave_declarations, affected_employees
                FROM xa_employee_license el
                JOIN xa_global_license gl ON el.global_license = gl.id
                WHERE gl.tenant = tenant_id
                AND el.declared_long_leave = true
                AND el.long_leave_declared_at >= NOW() - INTERVAL '7 days';

                IF recent_leave_declarations > 5 THEN
                  criteria := jsonb_build_object(
                    'days_until_renewal', days_until_renewal,
                    'recent_leave_declarations', recent_leave_declarations,
                    'detection_window', '7 days',
                    'renewal_date', next_renewal_date,
                    'detection_trigger', 'pre_renewal_pattern',
                    'timestamp', NOW()
                  );

                  INSERT INTO xa_fraud_detection_log (
                    tenant,
                    detection_type,
                    employee_licenses_affected,
                    detection_criteria,
                    risk_level
                  ) VALUES (
                    tenant_id,
                    'PRE_RENEWAL_MANIPULATION'::fraud_detection_enum,
                    COALESCE(affected_employees, ARRAY[NEW.employee]),
                    criteria,
                    'HIGH'::risk_level_enum
                  );

                  RAISE NOTICE 'ALERTE FRAUDE: % congés déclarés à % jours du renouvellement pour tenant %',
                              recent_leave_declarations, days_until_renewal, tenant_id;
                END IF;
              END IF;
            END IF;
          END IF;

          -- DÉTECTION 3: Désactivations massives
          IF (TG_OP = 'INSERT' AND NEW.deactivation_date IS NOT NULL) OR
             (TG_OP = 'UPDATE' AND OLD.deactivation_date IS NULL AND NEW.deactivation_date IS NOT NULL) THEN
            
            SELECT COUNT(*), array_agg(el.employee) INTO deactivations_24h, affected_employees
            FROM xa_employee_license el
            JOIN xa_global_license gl ON el.global_license = gl.id
            WHERE gl.tenant = tenant_id
            AND el.deactivation_date >= NOW() - INTERVAL '24 hours';

            SELECT COUNT(*) INTO total_employees
            FROM xa_employee_license el
            JOIN xa_global_license gl ON el.global_license = gl.id
            WHERE gl.tenant = tenant_id
            AND (el.contractual_status = 'ACTIVE' OR
                 el.deactivation_date >= NOW() - INTERVAL '7 days');

            IF total_employees > 0 THEN
              percentage_deactivated := (deactivations_24h::DECIMAL / total_employees::DECIMAL) * 100;

              IF deactivations_24h > 100 OR percentage_deactivated > 50 THEN
                risk_level := 'CRITICAL';
              ELSIF deactivations_24h > 50 OR percentage_deactivated > 25 THEN
                risk_level := 'HIGH';
              ELSIF deactivations_24h > 20 OR percentage_deactivated > 10 THEN
                risk_level := 'MEDIUM';
              ELSE
                risk_level := NULL;
              END IF;

              IF risk_level IS NOT NULL THEN
                criteria := jsonb_build_object(
                  'deactivations_24h', deactivations_24h,
                  'total_employees', total_employees,
                  'percentage_deactivated', percentage_deactivated,
                  'detection_trigger', 'mass_deactivation',
                  'time_window', '24 hours',
                  'timestamp', NOW()
                );

                INSERT INTO xa_fraud_detection_log (
                  tenant,
                  detection_type,
                  employee_licenses_affected,
                  detection_criteria,
                  risk_level
                ) VALUES (
                  tenant_id,
                  'MASS_DEACTIVATION'::fraud_detection_enum,
                  COALESCE(affected_employees, ARRAY[NEW.employee]),
                  criteria,
                  risk_level
                );

                RAISE NOTICE 'ALERTE FRAUDE: % désactivations en 24h (%.1f%%) pour tenant %',
                            deactivations_24h, percentage_deactivated, tenant_id;
              END IF;
            END IF;
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      // 3. Recréer le trigger
      await queryInterface.sequelize.query(`
        CREATE TRIGGER trigger_employee_license_fraud_detection
        AFTER INSERT OR UPDATE ON xa_employee_license
        FOR EACH ROW
        EXECUTE FUNCTION employee_license_fraud_detection_trigger();
      `, { transaction });

      // 4. Supprimer les anciennes fonctions séparées (plus utilisées)
      await queryInterface.sequelize.query(`
        DROP FUNCTION IF EXISTS detect_suspicious_leave_pattern();
        DROP FUNCTION IF EXISTS detect_mass_deactivation();  
        DROP FUNCTION IF EXISTS detect_pre_renewal_manipulation();
      `, { transaction });

      await transaction.commit();
      console.log('✅ Trigger de détection de fraude corrigé avec succès');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur dans la correction du trigger:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Restaurer l'ancienne version (si nécessaire)
      console.log('🔄 Rollback de la correction...');

      await transaction.commit();

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};


// 'use strict';
//
// module.exports = {
//   async up(queryInterface, Sequelize) {
//     const transaction = await queryInterface.sequelize.transaction();
//
//     try {
//       console.log('🚨 Implémentation des triggers de détection automatique...');
//
//       // 1. Fonction pour détecter les patterns de congés suspects
//       await queryInterface.sequelize.query(`
//         CREATE OR REPLACE FUNCTION detect_suspicious_leave_pattern()
//         RETURNS TRIGGER AS $$
//         DECLARE
//           tenant_id INTEGER;
//           total_employees INTEGER;
//           long_leave_employees INTEGER;
//           technical_leave_employees INTEGER;
//           percentage_long_leave DECIMAL;
//           percentage_technical DECIMAL;
//           risk_level risk_level_enum;
//           criteria JSONB;
//           affected_employees TEXT[];  -- ✅ TEXT[] pour correspondre au schéma
//         BEGIN
//           -- Récupérer le tenant depuis la global_license
//           SELECT gl.tenant INTO tenant_id
//           FROM xa_global_license gl
//           WHERE gl.id = NEW.global_license;
//
//           -- Si pas de tenant trouvé, pas de détection
//           IF tenant_id IS NULL THEN
//             RETURN NEW;
//           END IF;
//
//           -- Compter tous les employés actifs du tenant
//           SELECT COUNT(*) INTO total_employees
//           FROM xa_employee_license el
//           JOIN xa_global_license gl ON el.global_license = gl.id
//           WHERE gl.tenant = tenant_id
//           AND el.contractual_status = 'ACTIVE';
//
//           -- Éviter division par zéro
//           IF total_employees = 0 THEN
//             RETURN NEW;
//           END IF;
//
//           -- Compter employés en congé long et récupérer leurs employee IDs (TEXT)
//           SELECT COUNT(*), array_agg(el.employee) INTO long_leave_employees, affected_employees
//           FROM xa_employee_license el
//           JOIN xa_global_license gl ON el.global_license = gl.id
//           WHERE gl.tenant = tenant_id
//           AND el.contractual_status = 'ACTIVE'
//           AND el.declared_long_leave = true;
//
//           -- Compter spécifiquement les congés techniques
//           SELECT COUNT(*) INTO technical_leave_employees
//           FROM xa_employee_license el
//           JOIN xa_global_license gl ON el.global_license = gl.id
//           WHERE gl.tenant = tenant_id
//           AND el.contractual_status = 'ACTIVE'
//           AND el.declared_long_leave = true
//           AND el.long_leave_type = 'TECHNICAL';
//
//           -- Calculer pourcentages
//           percentage_long_leave := (long_leave_employees::DECIMAL / total_employees::DECIMAL) * 100;
//           percentage_technical := (technical_leave_employees::DECIMAL / total_employees::DECIMAL) * 100;
//
//           -- Déterminer niveau de risque et déclencher alerte si nécessaire
//           IF percentage_long_leave > 50 OR percentage_technical > 30 THEN
//             risk_level := 'CRITICAL';
//           ELSIF percentage_long_leave > 30 OR percentage_technical > 20 THEN
//             risk_level := 'HIGH';
//           ELSIF percentage_long_leave > 15 OR percentage_technical > 10 THEN
//             risk_level := 'MEDIUM';
//           ELSE
//             -- Pas d'alerte si sous les seuils
//             RETURN NEW;
//           END IF;
//
//           -- Construire les critères de détection
//           criteria := jsonb_build_object(
//             'total_employees', total_employees,
//             'long_leave_employees', long_leave_employees,
//             'technical_leave_employees', technical_leave_employees,
//             'percentage_long_leave', percentage_long_leave,
//             'percentage_technical', percentage_technical,
//             'detection_trigger', 'employee_license_update',
//             'triggered_by_employee', NEW.employee,
//             'timestamp', NOW()
//           );
//
//           -- Insérer l'alerte automatiquement
//           INSERT INTO xa_fraud_detection_log (
//             tenant,
//             detection_type,
//             employee_licenses_affected,
//             detection_criteria,
//             risk_level
//           ) VALUES (
//             tenant_id,
//             CASE
//               WHEN percentage_technical > 10 THEN 'EXCESSIVE_TECHNICAL_LEAVE'::fraud_detection_enum
//               ELSE 'SUSPICIOUS_LEAVE_PATTERN'::fraud_detection_enum
//             END,
//             COALESCE(affected_employees, ARRAY[NEW.employee]),  -- ✅ NEW.employee (TEXT)
//             criteria,
//             risk_level
//           );
//
//           RAISE NOTICE 'ALERTE FRAUDE: % employés en congé (%.1f%%) détecté pour tenant %',
//                       long_leave_employees, percentage_long_leave, tenant_id;
//
//           RETURN NEW;
//         END;
//         $$ LANGUAGE plpgsql;
//       `, { transaction });
//
//       console.log('✅ Fonction detect_suspicious_leave_pattern créée');
//
//       // 2. Fonction pour détecter les désactivations massives
//       await queryInterface.sequelize.query(`
//         CREATE OR REPLACE FUNCTION detect_mass_deactivation()
//         RETURNS TRIGGER AS $$
//         DECLARE
//           tenant_id INTEGER;
//           deactivations_24h INTEGER;
//           total_employees INTEGER;
//           percentage_deactivated DECIMAL;
//           risk_level risk_level_enum;
//           criteria JSONB;
//           affected_employees TEXT[];  -- ✅ TEXT[] pour correspondre au schéma
//         BEGIN
//           -- Récupérer le tenant depuis la global_license
//           SELECT gl.tenant INTO tenant_id
//           FROM xa_global_license gl
//           WHERE gl.id = NEW.global_license;
//
//           IF tenant_id IS NULL THEN
//             RETURN NEW;
//           END IF;
//
//           -- Compter désactivations dans les dernières 24h et récupérer employee IDs (TEXT)
//           SELECT COUNT(*), array_agg(el.employee) INTO deactivations_24h, affected_employees
//           FROM xa_employee_license el
//           JOIN xa_global_license gl ON el.global_license = gl.id
//           WHERE gl.tenant = tenant_id
//           AND el.deactivation_date >= NOW() - INTERVAL '24 hours';
//
//           -- Compter total employés (actifs + récemment désactivés)
//           SELECT COUNT(*) INTO total_employees
//           FROM xa_employee_license el
//           JOIN xa_global_license gl ON el.global_license = gl.id
//           WHERE gl.tenant = tenant_id
//           AND (el.contractual_status = 'ACTIVE' OR
//                el.deactivation_date >= NOW() - INTERVAL '7 days');
//
//           IF total_employees = 0 THEN
//             RETURN NEW;
//           END IF;
//
//           percentage_deactivated := (deactivations_24h::DECIMAL / total_employees::DECIMAL) * 100;
//
//           -- Seuils d'alerte pour désactivations massives
//           IF deactivations_24h > 100 OR percentage_deactivated > 50 THEN
//             risk_level := 'CRITICAL';
//           ELSIF deactivations_24h > 50 OR percentage_deactivated > 25 THEN
//             risk_level := 'HIGH';
//           ELSIF deactivations_24h > 20 OR percentage_deactivated > 10 THEN
//             risk_level := 'MEDIUM';
//           ELSE
//             RETURN NEW;
//           END IF;
//
//           criteria := jsonb_build_object(
//             'deactivations_24h', deactivations_24h,
//             'total_employees', total_employees,
//             'percentage_deactivated', percentage_deactivated,
//             'detection_trigger', 'mass_deactivation',
//             'time_window', '24 hours',
//             'timestamp', NOW()
//           );
//
//           INSERT INTO xa_fraud_detection_log (
//             tenant,
//             detection_type,
//             employee_licenses_affected,
//             detection_criteria,
//             risk_level
//           ) VALUES (
//             tenant_id,
//             'MASS_DEACTIVATION'::fraud_detection_enum,
//             COALESCE(affected_employees, ARRAY[NEW.employee]),  -- ✅ NEW.employee (TEXT)
//             criteria,
//             risk_level
//           );
//
//           RAISE NOTICE 'ALERTE FRAUDE: % désactivations en 24h (%.1f%%) pour tenant %',
//                       deactivations_24h, percentage_deactivated, tenant_id;
//
//           RETURN NEW;
//         END;
//         $$ LANGUAGE plpgsql;
//       `, { transaction });
//
//       console.log('✅ Fonction detect_mass_deactivation créée');
//
//       // 3. Fonction pour détecter les manipulations pré-renouvellement
//       await queryInterface.sequelize.query(`
//         CREATE OR REPLACE FUNCTION detect_pre_renewal_manipulation()
//         RETURNS TRIGGER AS $$
//         DECLARE
//           tenant_id INTEGER;
//           next_renewal_date DATE;
//           days_until_renewal INTEGER;
//           recent_leave_declarations INTEGER;
//           criteria JSONB;
//           affected_employees TEXT[];  -- ✅ TEXT[] pour correspondre au schéma
//         BEGIN
//           -- Récupérer tenant et date de renouvellement
//           SELECT gl.tenant, gl.next_renewal_date INTO tenant_id, next_renewal_date
//           FROM xa_global_license gl
//           WHERE gl.id = NEW.global_license;
//
//           IF tenant_id IS NULL OR next_renewal_date IS NULL THEN
//             RETURN NEW;
//           END IF;
//
//           days_until_renewal := next_renewal_date - CURRENT_DATE;
//
//           -- Détecter si dans les 30 jours précédant renouvellement
//           IF days_until_renewal BETWEEN 0 AND 30 THEN
//
//             -- Compter déclarations de congé récentes (7 derniers jours) et récupérer employee IDs
//             SELECT COUNT(*), array_agg(el.employee) INTO recent_leave_declarations, affected_employees
//             FROM xa_employee_license el
//             JOIN xa_global_license gl ON el.global_license = gl.id
//             WHERE gl.tenant = tenant_id
//             AND el.declared_long_leave = true
//             AND el.long_leave_declared_at >= NOW() - INTERVAL '7 days';
//
//             -- Seuil d'alerte: > 5 déclarations en 7 jours à < 30 jours du renouvellement
//             IF recent_leave_declarations > 5 THEN
//
//               criteria := jsonb_build_object(
//                 'days_until_renewal', days_until_renewal,
//                 'recent_leave_declarations', recent_leave_declarations,
//                 'detection_window', '7 days',
//                 'renewal_date', next_renewal_date,
//                 'detection_trigger', 'pre_renewal_pattern',
//                 'timestamp', NOW()
//               );
//
//               INSERT INTO xa_fraud_detection_log (
//                 tenant,
//                 detection_type,
//                 employee_licenses_affected,
//                 detection_criteria,
//                 risk_level
//               ) VALUES (
//                 tenant_id,
//                 'PRE_RENEWAL_MANIPULATION'::fraud_detection_enum,
//                 COALESCE(affected_employees, ARRAY[NEW.employee]),  -- ✅ NEW.employee (TEXT)
//                 criteria,
//                 'HIGH'::risk_level_enum
//               );
//
//               RAISE NOTICE 'ALERTE FRAUDE: % congés déclarés à % jours du renouvellement pour tenant %',
//                           recent_leave_declarations, days_until_renewal, tenant_id;
//             END IF;
//           END IF;
//
//           RETURN NEW;
//         END;
//         $$ LANGUAGE plpgsql;
//       `, { transaction });
//
//       console.log('✅ Fonction detect_pre_renewal_manipulation créée');
//
//       // 4. Trigger principal sur employee_license
//       await queryInterface.sequelize.query(`
//         CREATE OR REPLACE FUNCTION employee_license_fraud_detection_trigger()
//         RETURNS TRIGGER AS $$
//         BEGIN
//           -- Vérifier patterns de congés suspects (INSERT ou UPDATE de declared_long_leave)
//           IF (TG_OP = 'INSERT' AND NEW.declared_long_leave = true) OR
//              (TG_OP = 'UPDATE' AND OLD.declared_long_leave = false AND NEW.declared_long_leave = true) THEN
//             PERFORM detect_suspicious_leave_pattern();
//             PERFORM detect_pre_renewal_manipulation();
//           END IF;
//
//           -- Vérifier désactivations massives (INSERT ou UPDATE de deactivation_date)
//           IF (TG_OP = 'INSERT' AND NEW.deactivation_date IS NOT NULL) OR
//              (TG_OP = 'UPDATE' AND OLD.deactivation_date IS NULL AND NEW.deactivation_date IS NOT NULL) THEN
//             PERFORM detect_mass_deactivation();
//           END IF;
//
//           RETURN NEW;
//         END;
//         $$ LANGUAGE plpgsql;
//       `, { transaction });
//
//       await queryInterface.sequelize.query(`
//         CREATE TRIGGER trigger_employee_license_fraud_detection
//         AFTER INSERT OR UPDATE ON xa_employee_license
//         FOR EACH ROW
//         EXECUTE FUNCTION employee_license_fraud_detection_trigger();
//       `, { transaction });
//
//       console.log('✅ Trigger principal employee_license_fraud_detection créé');
//
//       // 5. Fonction de validation anti-fraude (BEFORE trigger)
//       await queryInterface.sequelize.query(`
//         CREATE OR REPLACE FUNCTION validate_anti_fraud_rules()
//         RETURNS TRIGGER AS $$
//         BEGIN
//           -- Règle 1: Pas de congé long avec pointage récent (< 7 jours)
//           IF NEW.declared_long_leave = true AND
//              NEW.last_activity_date IS NOT NULL AND
//              NEW.last_activity_date >= NOW() - INTERVAL '7 days' THEN
//             RAISE EXCEPTION 'FRAUDE DÉTECTÉE: Impossible de déclarer un congé long avec un pointage récent (< 7 jours). Dernière activité: %', NEW.last_activity_date;
//           END IF;
//
//           -- Règle 2: Cohérence données de congé
//           IF NEW.declared_long_leave = true AND
//              (NEW.long_leave_declared_by IS NULL OR NEW.long_leave_declared_at IS NULL) THEN
//             RAISE EXCEPTION 'DONNÉES INCOHÉRENTES: Congé long déclaré sans informations obligatoires (declared_by, declared_at)';
//           END IF;
//
//           -- Règle 3: Date de désactivation cohérente
//           IF NEW.deactivation_date IS NOT NULL AND
//              NEW.deactivation_date < NEW.activation_date THEN
//             RAISE EXCEPTION 'DONNÉES INCOHÉRENTES: Date de désactivation antérieure à l activation';
//           END IF;
//
//           RETURN NEW;
//         END;
//         $$ LANGUAGE plpgsql;
//       `, { transaction });
//
//       await queryInterface.sequelize.query(`
//         CREATE TRIGGER trigger_validate_anti_fraud_rules
//         BEFORE INSERT OR UPDATE ON xa_employee_license
//         FOR EACH ROW
//         EXECUTE FUNCTION validate_anti_fraud_rules();
//       `, { transaction });
//
//       console.log('✅ Trigger de validation anti-fraude créé');
//
//       // 6. Trigger updated_at pour xa_fraud_detection_log
//       await queryInterface.sequelize.query(`
//         CREATE OR REPLACE FUNCTION update_updated_at_column()
//         RETURNS TRIGGER AS $$
//         BEGIN
//           NEW.updated_at = NOW();
//           RETURN NEW;
//         END;
//         $$ LANGUAGE plpgsql;
//       `, { transaction });
//
//       await queryInterface.sequelize.query(`
//         CREATE TRIGGER trigger_fraud_detection_log_updated_at
//         BEFORE UPDATE ON xa_fraud_detection_log
//         FOR EACH ROW
//         EXECUTE FUNCTION update_updated_at_column();
//       `, { transaction });
//
//       console.log('✅ Trigger updated_at configuré');
//
//       await transaction.commit();
//       console.log('🎉 Système de détection automatique de fraude opérationnel!');
//       console.log('📊 Seuils configurés:');
//       console.log('   - Congés longs: 15%=MEDIUM, 30%=HIGH, 50%=CRITICAL');
//       console.log('   - Congés techniques: 10%=MEDIUM, 20%=HIGH, 30%=CRITICAL');
//       console.log('   - Désactivations 24h: 20=MEDIUM, 50=HIGH, 100=CRITICAL');
//       console.log('   - Pré-renouvellement: >5 congés en 7j à <30j du renouvellement');
//
//     } catch (error) {
//       await transaction.rollback();
//       console.error('❌ Erreur dans la migration des triggers:', error);
//       throw error;
//     }
//   },
//
//   async down(queryInterface, Sequelize) {
//     const transaction = await queryInterface.sequelize.transaction();
//
//     try {
//       // Supprimer tous les triggers
//       await queryInterface.sequelize.query(`
//         DROP TRIGGER IF EXISTS trigger_employee_license_fraud_detection ON xa_employee_license;
//         DROP TRIGGER IF EXISTS trigger_validate_anti_fraud_rules ON xa_employee_license;
//         DROP TRIGGER IF EXISTS trigger_fraud_detection_log_updated_at ON xa_fraud_detection_log;
//       `, { transaction });
//
//       // Supprimer toutes les fonctions
//       await queryInterface.sequelize.query(`
//         DROP FUNCTION IF EXISTS employee_license_fraud_detection_trigger();
//         DROP FUNCTION IF EXISTS detect_suspicious_leave_pattern();
//         DROP FUNCTION IF EXISTS detect_mass_deactivation();
//         DROP FUNCTION IF EXISTS detect_pre_renewal_manipulation();
//         DROP FUNCTION IF EXISTS validate_anti_fraud_rules();
//         DROP FUNCTION IF EXISTS update_updated_at_column();
//       `, { transaction });
//
//       await transaction.commit();
//       console.log('🔄 Rollback des triggers de détection terminé');
//
//     } catch (error) {
//       await transaction.rollback();
//       console.error('❌ Erreur dans le rollback des triggers:', error);
//       throw error;
//     }
//   }
// };