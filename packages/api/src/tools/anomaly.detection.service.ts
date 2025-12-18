import {
  AlertSeverity,
  AlertType,
  MEMOS_DEFAULTS,
  MemoStatus,
  MemoType,
  MessageType,
  PointageStatus,
  PointageType,
  SessionStatus,
  TimezoneConfigUtils,
} from '@toke/shared';
import { Op } from 'sequelize';

import TimeEntries from '../tenant/class/TimeEntries.js';
import WorkSessions from '../tenant/class/WorkSessions.js';
import Memos from '../tenant/class/Memos.js';
import FraudAlerts from '../tenant/class/FraudAlerts.js';
import Site from '../tenant/class/Site.js';
import UserRole from '../tenant/class/UserRole.js';
import Role from '../tenant/class/Role.js';
import { RoleValues } from '../utils/response.model.js';
import QrCodeGeneration from '../tenant/class/QrCodeGeneration.js';
import OrgHierarchy from '../tenant/class/OrgHierarchy.js';
import User from '../tenant/class/User.js';

import { FCMService } from './notification.service.js';
import ScheduleResolutionService, { ApplicableSchedule } from './schedule.resolution.service.js';

// === TYPES & ENUMS ===

export enum AnomalyType {
  // États sessions
  SESSION_ALREADY_OPEN = 'session_already_open',
  SESSION_NOT_FOUND = 'session_not_found',
  SESSION_TOO_LONG = 'session_too_long',

  // Séquences pointages
  PAUSE_ALREADY_ACTIVE = 'pause_already_active',
  PAUSE_NOT_ACTIVE = 'pause_not_active',
  MISSION_ALREADY_ACTIVE = 'mission_already_active',
  MISSION_NOT_ACTIVE = 'mission_not_active',

  // Timing
  TIMING_ABNORMAL = 'timing_abnormal',
  DURATION_ABNORMAL = 'duration_abnormal',
  FREQUENCY_SUSPICIOUS = 'frequency_suspicious',

  // GPS/Fraude
  GPS_SPOOFING_SUSPECTED = 'gps_spoofing_suspected',
  DISTANCE_IMPOSSIBLE = 'distance_impossible',

  // Géofencing (cas spécial - blocage)
  GEOFENCE_VIOLATION = 'geofence_violation',

  // Accès non autorisé
  UNAUTHORIZED_QR_CODE = 'unauthorized_qr_code',
  EXPIRED_QR_CODE = 'expired_qr_code',

  // 🆕 SCHEDULE-RELATED ANOMALIES
  LATE_ARRIVAL = 'late_arrival', // Retard arrivée
  EARLY_DEPARTURE = 'early_departure', // Départ anticipé
  ABSENT_NO_SHOW = 'absent_no_show', // Absence non justifiée
  PAUSE_TOO_LONG = 'pause_too_long', // Pause dépassée
  PAUSE_NO_RETURN = 'pause_no_return', // Pas de retour de pause
  MISSED_WORK_BLOCK = 'missed_work_block', // Bloc de travail manqué
  OFF_SCHEDULE_CLOCKING = 'off_schedule_clocking', // Pointage hors horaire
  WORK_ON_REST_DAY = 'work_on_rest_day', // Travail jour de repos
  EARLY_ARRIVAL = 'early_arrival', // Arrivée très en avance (>1h)
  PAUSE_OUTSIDE_BLOCK = 'pause_outside_block', // Pause hors plage autorisée
}

export interface Anomaly {
  type: AnomalyType;
  severity: AlertSeverity;
  description: string;
  technical_details?: Record<string, any>;
  auto_correctable: boolean;
  auto_correction_applied?: boolean;
  suggested_correction?: any;
}

// === SERVICE PRINCIPAL ===

class AnomalyDetectionService {
  // ========================================
  // DÉTECTION PAR TYPE DE POINTAGE
  // ========================================

  async detectAccessAnomalies(
    userId: number,
    qrCodeObj: QrCodeGeneration,
  ): Promise<{
    anomalies: Anomaly[];
    corrections: any[];
  }> {
    const anomalies: Anomaly[] = [];
    const corrections: any[] = [];

    // 1. ⚠️ Vérifier si le QR code est expiré
    if (qrCodeObj.isExpired()) {
      anomalies.push({
        type: AnomalyType.EXPIRED_QR_CODE,
        severity: AlertSeverity.MEDIUM,
        description: 'Expired QR code used for checking in',
        technical_details: {
          qr_code_guid: qrCodeObj.getGuid(),
          valid_to: qrCodeObj.getValidTo(),
          expired_since_days:
            qrCodeObj.getRemainingDays() !== null ? Math.abs(qrCodeObj.getRemainingDays()!) : null,
        },
        auto_correctable: false,
      });
    }

    // 2. Si le QR code est partagé, pas besoin de vérifier les habilitations
    if (qrCodeObj.isShared()) {
      return { anomalies, corrections };
    }
    const qrCodeManager = qrCodeObj.getManager();
    if (!qrCodeManager) {
      // QR code sans manager = anomalie critique
      anomalies.push({
        type: AnomalyType.UNAUTHORIZED_QR_CODE,
        severity: AlertSeverity.CRITICAL,
        description: 'QR code without assigned manager - corrupted data',
        technical_details: {
          qr_code_guid: qrCodeObj.getGuid(),
        },
        auto_correctable: false,
      });
      return { anomalies, corrections };
    }

    // 3. Récupérer le manager de l'utilisateur
    const roleObj = await Role._load(RoleValues.EMPLOYEE, false, true);
    const identifier = {
      user: userId,
      role: roleObj?.getId()!,
    };
    const userRole = await UserRole._load(identifier, false, true);
    const userManager = userRole?.getAssignedBy();

    // 4. Vérifier si c'est le manager direct
    if (userManager === qrCodeManager) {
      return { anomalies, corrections }; // ✅ Autorisé - manager direct
    }

    // 5. ⭐ Vérifier l'héritage hiérarchique
    const isInHierarchy = await OrgHierarchy.isUserInHierarchy(userId, qrCodeManager);

    if (isInHierarchy) {
      return { anomalies, corrections }; // ✅ Autorisé - héritage hiérarchique
    }

    // 6. ❌ Si aucune autorisation, c'est une anomalie
    anomalies.push({
      type: AnomalyType.UNAUTHORIZED_QR_CODE,
      severity: AlertSeverity.HIGH,
      description: `Use of an unauthorized QR code - The employee clocked in using another manager's QR code.`,
      technical_details: {
        user_manager: (await userRole?.getAssignedByObject())!.getGuid(),
        qr_code_manager: (await qrCodeObj.getManagerObj())?.getGuid(),
        qr_code_guid: qrCodeObj.getGuid(),
      },
      auto_correctable: false, // Nécessite validation manager
    });

    return { anomalies, corrections };
  }

  /**
   * Détection anomalies CLOCK_IN
   */
  async detectClockInAnomalies(
    userId: number,
    validatedData: any,
  ): Promise<{
    anomalies: Anomaly[];
    corrections: any[];
    scheduleContext?: any;
  }> {
    const anomalies: Anomaly[] = [];
    const corrections: any[] = [];

    // 1️⃣ Session déjà ouverte
    const activeSession = await WorkSessions._findActiveSessionByUser(userId);
    if (activeSession) {
      anomalies.push({
        type: AnomalyType.SESSION_ALREADY_OPEN,
        severity: AlertSeverity.MEDIUM, // 'medium',
        description: `Session already open since ${activeSession.getSessionStartAt()?.toLocaleString('en-US')}`,
        // description: `Session déjà ouverte depuis ${activeSession.getSessionStartAt()?.toLocaleString('fr-FR')}`,
        technical_details: {
          existing_session_guid: activeSession.getGuid(),
          session_start: activeSession.getSessionStartAt(),
          duration_hours: this.calculateDurationHours(
            activeSession.getSessionStartAt()!,
            TimezoneConfigUtils.getCurrentTime(),
          ),
        },
        auto_correctable: true,
      });

      // ✅ CORRECTION AUTO : Fermer session précédente
      const estimatedEnd = new Date(validatedData.clocked_at);
      const sessionStart = activeSession.getSessionStartAt();

      // Vérifier que end_at > start_at
      if (estimatedEnd <= sessionStart!) {
        // Force une fin quelques secondes après le start, pour éviter l’erreur logique
        estimatedEnd.setTime(sessionStart!.getTime() + 1000 * 60); // +1 minute
      }
      // estimatedEnd.setMinutes(estimatedEnd.getMinutes() - 1);

      activeSession.setSessionEndAt(estimatedEnd).setSessionStatus(SessionStatus.ABANDONED);
      await activeSession.save();

      corrections.push({
        action: 'auto_close_previous_session',
        session_guid: activeSession.getGuid(),
        estimated_end: estimatedEnd,
      });

      anomalies[anomalies.length - 1].auto_correction_applied = true;
    }

    // // 2️⃣ Horaire anormal (avant 5h ou après 23h)
    // const hour = new Date(validatedData.clocked_at).getHours();
    // if (hour < 5 || hour > 23) {
    //   anomalies.push({
    //     type: AnomalyType.TIMING_ABNORMAL,
    //     severity: AlertSeverity.LOW, //'low',
    //     description: `Pointage à horaire inhabituel (${hour}h)`,
    //     technical_details: {
    //       hour,
    //       expected_range: '05h-23h',
    //     },
    //     auto_correctable: false,
    //   });
    // }

    // 3️⃣ GPS spoofing (mock location)
    if (validatedData.device_info?.mock_location_detected) {
      anomalies.push({
        type: AnomalyType.GPS_SPOOFING_SUSPECTED,
        severity: AlertSeverity.HIGH, // 'high',
        description: 'Simulated GPS position detected',
        technical_details: {
          mock_location: true,
          device_info: validatedData.device_info,
        },
        auto_correctable: false,
      });
    }

    // 4️⃣ 🆕 VÉRIFICATION HORAIRE DE TRAVAIL
    const { anomalies: scheduleAnomalies, scheduleContext } = await this.detectScheduleViolations(
      userId,
      PointageType.CLOCK_IN,
      new Date(validatedData.clocked_at),
    );

    // Fusionner les anomalies d'horaire
    anomalies.push(...scheduleAnomalies);

    return { anomalies, corrections, scheduleContext };
  }

  /**
   * Détection anomalies PAUSE_START
   */
  async detectPauseStartAnomalies(
    userId: number,
    validatedData: any,
  ): Promise<{
    anomalies: Anomaly[];
    corrections: any[];
    activeSession: WorkSessions | null;
  }> {
    const anomalies: Anomaly[] = [];
    const corrections: any[] = [];

    // 1. Vérifier session active
    const activeSession = await WorkSessions._findActiveSessionByUser(userId);
    if (!activeSession) {
      anomalies.push({
        type: AnomalyType.SESSION_NOT_FOUND,
        severity: AlertSeverity.HIGH, //'critical',
        description: 'Aucune session active pour démarrer une pause',
        auto_correctable: true,
        suggested_correction: {
          action: 'create_retroactive_session',
          estimated_start: new Date(validatedData.clocked_at).setHours(8, 0, 0, 0),
        },
      });

      return { anomalies, corrections, activeSession: null };
    }

    // 2. Pause déjà active
    const hasActivePause = await activeSession.isOnPause();
    if (hasActivePause) {
      anomalies.push({
        type: AnomalyType.PAUSE_ALREADY_ACTIVE,
        severity: AlertSeverity.MEDIUM, // 'medium',
        description: 'Une pause est déjà en cours',
        auto_correctable: true,
      });

      // ✅ CORRECTION AUTO : Fermer pause précédente
      const entries = await TimeEntries._listBySession(activeSession.getId()!);
      const lastPause = entries
        ?.reverse()
        .find((e) => e.getPointageType() === PointageType.PAUSE_START);

      if (lastPause) {
        const autoPauseEnd = new TimeEntries()
          .setSession(activeSession.getId()!)
          .setUser(userId)
          .setSite(lastPause.getSite()!)
          .setPointageType(PointageType.PAUSE_END)
          .setClockedAt(new Date(validatedData.clocked_at - 60000))
          .setCoordinates(validatedData.latitude, validatedData.longitude)
          .setPointageStatus(PointageStatus.CORRECTED);

        await autoPauseEnd.save();
        await autoPauseEnd.accept();

        corrections.push({
          action: 'auto_close_previous_pause',
          pause_start_guid: lastPause.getGuid(),
        });

        anomalies[anomalies.length - 1].auto_correction_applied = true;
      }
    }

    // 3. Fréquence suspecte (>3 pauses/jour)
    const todayPauses = await this.getTodayPausesCount(userId);
    if (todayPauses >= 3) {
      console.log('je suis ici 🔴');
      anomalies.push({
        type: AnomalyType.FREQUENCY_SUSPICIOUS,
        severity: AlertSeverity.LOW, // 'low',
        description: `Nombre de pauses inhabituel (${todayPauses + 1} aujourd'hui)`,
        technical_details: {
          today_pauses_count: todayPauses + 1,
          expected_max: 3,
        },
        auto_correctable: false,
      });
    }

    return { anomalies, corrections, activeSession };
  }

  /**
   * Détection anomalies PAUSE_END
   */
  async detectPauseEndAnomalies(
    userId: number,
    validatedData: any,
  ): Promise<{
    anomalies: Anomaly[];
    corrections: any[];
    activeSession: WorkSessions | null;
  }> {
    const anomalies: Anomaly[] = [];
    const corrections: any[] = [];

    const activeSession = await WorkSessions._findActiveSessionByUser(userId);
    if (!activeSession) {
      anomalies.push({
        type: AnomalyType.SESSION_NOT_FOUND,
        severity: AlertSeverity.CRITICAL, // 'critical',
        description: 'Aucune session active pour terminer une pause',
        auto_correctable: true,
      });
      return { anomalies, corrections, activeSession: null };
    }

    // Pause non active
    const hasActivePause = await activeSession.isOnPause();
    if (!hasActivePause) {
      anomalies.push({
        type: AnomalyType.PAUSE_NOT_ACTIVE,
        severity: AlertSeverity.MEDIUM, // 'medium',
        description: 'Aucune pause active à terminer',
        auto_correctable: false,
      });
    }

    // Durée pause anormale (>2h)
    if (hasActivePause) {
      const entries = await TimeEntries._listBySession(activeSession.getId()!);
      const lastPause = entries
        ?.reverse()
        .find((e) => e.getPointageType() === PointageType.PAUSE_START);

      if (lastPause) {
        const pauseDuration = this.calculateDurationMinutes(
          lastPause.getClockedAt()!,
          new Date(validatedData.clocked_at),
        );

        if (pauseDuration > 120) {
          anomalies.push({
            type: AnomalyType.DURATION_ABNORMAL,
            severity: AlertSeverity.HIGH, // 'high',
            description: `Pause anormalement longue (${Math.floor(pauseDuration / 60)}h${pauseDuration % 60}min)`,
            technical_details: {
              duration_minutes: pauseDuration,
              expected_max: 120,
              pause_start: lastPause.getClockedAt(),
            },
            auto_correctable: false,
          });
        }
      }
    }

    return { anomalies, corrections, activeSession };
  }

  /**
   * Détection et correction automatique pour CLOCK_OUT sans session active
   */
  async detectAndCorrectClockOutWithoutSession(
    userId: number,
    validatedData: any,
    siteObj: Site,
  ): Promise<{
    anomalies: Anomaly[];
    corrections: any[];
    activeSession: WorkSessions | null;
    autoCreatedSession: boolean;
  }> {
    const anomalies: Anomaly[] = [];
    const corrections: any[] = [];
    let autoCreatedSession = false;

    let activeSession = await WorkSessions._findActiveSessionByUser(userId);

    // ✅ CAS SPÉCIAL : CLOCK_OUT sans session active
    if (!activeSession) {
      anomalies.push({
        type: AnomalyType.SESSION_NOT_FOUND,
        severity: AlertSeverity.CRITICAL,
        description: 'Tentative de sortie sans entrée préalable - Session créée automatiquement',
        technical_details: {
          clock_out_time: validatedData.clocked_at,
          estimated_entry_time: null,
        },
        auto_correctable: true,
        auto_correction_applied: true,
      });

      // 🔧 CORRECTION AUTO : Créer session artificielle
      const estimatedEntry = new Date(validatedData.clocked_at);
      estimatedEntry.setHours(8, 0, 0, 0); // Entrée estimée à 8h00

      // Si le clock_out est avant 8h, ajuster l'entrée à minuit
      if (new Date(validatedData.clocked_at).getHours() < 8) {
        estimatedEntry.setHours(0, 0, 0, 0);
      }

      // Créer session de correction
      activeSession = new WorkSessions()
        .setUser(userId)
        .setSite(siteObj.getId()!)
        .setSessionStartAt(estimatedEntry)
        .setStartCoordinates(validatedData.latitude, validatedData.longitude)
        .setSessionStatus(SessionStatus.CORRECTED);

      await activeSession.save();

      // Créer entry d'entrée artificielle
      const artificialEntry = new TimeEntries()
        .setSession(activeSession.getId()!)
        .setUser(userId)
        .setSite(siteObj.getId()!)
        .setPointageType(PointageType.CLOCK_IN)
        .setClockedAt(estimatedEntry)
        .setCoordinates(validatedData.latitude, validatedData.longitude)
        .setPointageStatus(PointageStatus.CORRECTED)
        .setDeviceInfo({
          ...validatedData.device_info,
          auto_generated: true,
          reason: 'missing_clock_in',
        });

      await artificialEntry.save();
      await artificialEntry.accept();

      corrections.push({
        action: 'auto_create_missing_session',
        session_guid: activeSession.getGuid(),
        estimated_entry_time: estimatedEntry,
        artificial_entry_guid: artificialEntry.getGuid(),
      });

      autoCreatedSession = true;

      // Mettre à jour les détails techniques de l'anomalie
      anomalies[0].technical_details!.estimated_entry_time = estimatedEntry;
      anomalies[0].technical_details!.artificial_session_guid = activeSession.getGuid();
      anomalies[0].technical_details!.artificial_entry_guid = artificialEntry.getGuid();
    }

    // Vérifier pause non fermée (logique existante)
    const hasActivePause = await activeSession.isOnPause();
    if (hasActivePause) {
      anomalies.push({
        type: AnomalyType.PAUSE_NOT_ACTIVE,
        severity: AlertSeverity.MEDIUM,
        description: 'Pause non fermée - fermeture automatique',
        auto_correctable: true,
      });

      const autoPauseEnd = new TimeEntries()
        .setSession(activeSession.getId()!)
        .setUser(userId)
        .setSite(activeSession.getSite()!)
        .setPointageType(PointageType.PAUSE_END)
        .setClockedAt(new Date(validatedData.clocked_at - 60000))
        .setCoordinates(validatedData.latitude, validatedData.longitude)
        .setPointageStatus(PointageStatus.CORRECTED);

      await autoPauseEnd.save();
      await autoPauseEnd.accept();

      corrections.push({
        action: 'auto_close_active_pause',
      });

      anomalies[anomalies.length - 1].auto_correction_applied = true;
    }

    // Session trop longue (logique existante)
    const sessionDuration = this.calculateDurationHours(
      activeSession.getSessionStartAt()!,
      new Date(validatedData.clocked_at),
    );

    if (sessionDuration > 12) {
      anomalies.push({
        type: AnomalyType.SESSION_TOO_LONG,
        severity: AlertSeverity.HIGH,
        description: `Session anormalement longue (${sessionDuration.toFixed(1)}h)`,
        technical_details: {
          duration_hours: sessionDuration,
          expected_max: 12,
          session_start: activeSession.getSessionStartAt(),
        },
        auto_correctable: false,
      });
    }

    return { anomalies, corrections, activeSession, autoCreatedSession };
  }

  /**
   * Détection et correction automatique EXTERNAL_MISSION
   */
  async detectMissionStartAnomalies(
    userId: number,
    validatedData: any,
    siteObj: Site,
  ): Promise<{
    anomalies: Anomaly[];
    corrections: any[];
    activeSession: WorkSessions | null;
    autoCreatedSession: boolean;
  }> {
    const anomalies: Anomaly[] = [];
    const corrections: any[] = [];
    let autoCreatedSession = false;

    let activeSession = await WorkSessions._findActiveSessionByUser(userId);

    // ✅ CAS 1 : Pas de session active → Créer session auto
    if (!activeSession) {
      anomalies.push({
        type: AnomalyType.SESSION_NOT_FOUND,
        severity: AlertSeverity.CRITICAL,
        description: 'Démarrage mission sans session active - Session créée automatiquement',
        technical_details: {
          mission_start_time: validatedData.clocked_at,
          estimated_entry_time: null,
        },
        auto_correctable: true,
        auto_correction_applied: true,
      });

      // 🔧 CORRECTION AUTO : Créer session artificielle
      const estimatedEntry = new Date(validatedData.clocked_at);
      estimatedEntry.setHours(8, 0, 0, 0); // Entrée estimée à 8h00

      // Si mission start avant 8h, ajuster à minuit
      if (new Date(validatedData.clocked_at).getHours() < 8) {
        estimatedEntry.setHours(0, 0, 0, 0);
      }

      activeSession = new WorkSessions()
        .setUser(userId)
        .setSite(siteObj.getId()!)
        .setSessionStartAt(estimatedEntry)
        .setStartCoordinates(validatedData.latitude, validatedData.longitude)
        .setSessionStatus(SessionStatus.CORRECTED);

      await activeSession.save();

      // Créer entry CLOCK_IN artificielle
      const artificialEntry = new TimeEntries()
        .setSession(activeSession.getId()!)
        .setUser(userId)
        .setSite(siteObj.getId()!)
        .setPointageType(PointageType.CLOCK_IN)
        .setClockedAt(estimatedEntry)
        .setCoordinates(validatedData.latitude, validatedData.longitude)
        .setPointageStatus(PointageStatus.CORRECTED)
        .setDeviceInfo({
          ...validatedData.device_info,
          auto_generated: true,
          reason: 'missing_clock_in_before_mission',
        });

      await artificialEntry.save();
      await artificialEntry.accept();

      corrections.push({
        action: 'auto_create_session_for_mission',
        session_guid: activeSession.getGuid(),
        estimated_entry_time: estimatedEntry,
        artificial_entry_guid: artificialEntry.getGuid(),
      });

      autoCreatedSession = true;

      anomalies[0].technical_details!.estimated_entry_time = estimatedEntry;
      anomalies[0].technical_details!.artificial_session_guid = activeSession.getGuid();
    }

    // ✅ CAS 2 : Mission déjà active
    const hasActiveMission = await activeSession.activeMission();
    if (hasActiveMission) {
      anomalies.push({
        type: AnomalyType.MISSION_ALREADY_ACTIVE,
        severity: AlertSeverity.HIGH,
        description: 'Une mission externe est déjà en cours',
        technical_details: {
          current_mission_start: activeSession.getSessionStartAt(), // hasActiveMission.getClockedAt()
        },
        auto_correctable: false,
      });
    }

    return { anomalies, corrections, activeSession, autoCreatedSession };
  }

  /**
   * Détection et correction automatique EXTERNAL_MISSION_END
   */
  async detectMissionEndAnomalies(
    userId: number,
    validatedData: any,
    siteObj: Site,
  ): Promise<{
    anomalies: Anomaly[];
    corrections: any[];
    activeSession: WorkSessions | null;
    autoCreatedSession: boolean;
    autoCreatedMissionStart: boolean;
  }> {
    const anomalies: Anomaly[] = [];
    const corrections: any[] = [];
    let autoCreatedSession = false;
    let autoCreatedMissionStart = false;

    let activeSession = await WorkSessions._findActiveSessionByUser(userId);

    // ✅ CAS 1 : Pas de session active → Créer session + mission start auto
    if (!activeSession) {
      anomalies.push({
        type: AnomalyType.SESSION_NOT_FOUND,
        severity: AlertSeverity.CRITICAL,
        description: 'Fin mission sans session active - Session et mission créées automatiquement',
        technical_details: {
          mission_end_time: validatedData.clocked_at,
        },
        auto_correctable: true,
        auto_correction_applied: true,
      });

      // Estimer début mission = 2h avant fin (ou 8h si avant 10h)
      const estimatedMissionStart = new Date(validatedData.clocked_at);
      estimatedMissionStart.setHours(estimatedMissionStart.getHours() - 2);

      const estimatedEntry = new Date(estimatedMissionStart);
      estimatedEntry.setHours(8, 0, 0, 0);

      // Créer session artificielle
      activeSession = new WorkSessions()
        .setUser(userId)
        .setSite(siteObj.getId()!)
        .setSessionStartAt(estimatedEntry)
        .setStartCoordinates(validatedData.latitude, validatedData.longitude)
        .setSessionStatus(SessionStatus.CORRECTED);

      await activeSession.save();

      // Créer CLOCK_IN artificiel
      const artificialClockIn = new TimeEntries()
        .setSession(activeSession.getId()!)
        .setUser(userId)
        .setSite(siteObj.getId()!)
        .setPointageType(PointageType.CLOCK_IN)
        .setClockedAt(estimatedEntry)
        .setCoordinates(validatedData.latitude, validatedData.longitude)
        .setPointageStatus(PointageStatus.CORRECTED)
        .setDeviceInfo({
          ...validatedData.device_info,
          auto_generated: true,
          reason: 'missing_clock_in_before_mission_end',
        });

      await artificialClockIn.save();
      await artificialClockIn.accept();

      // Créer MISSION_START artificiel
      const artificialMissionStart = new TimeEntries()
        .setSession(activeSession.getId()!)
        .setUser(userId)
        .setSite(siteObj.getId()!)
        .setPointageType(PointageType.EXTERNAL_MISSION)
        .setClockedAt(estimatedMissionStart)
        .setCoordinates(validatedData.latitude, validatedData.longitude)
        .setPointageStatus(PointageStatus.CORRECTED)
        .setDeviceInfo({
          ...validatedData.device_info,
          auto_generated: true,
          reason: 'missing_mission_start',
        });

      await artificialMissionStart.save();
      await artificialMissionStart.accept();

      corrections.push({
        action: 'auto_create_session_and_mission_for_mission_end',
        session_guid: activeSession.getGuid(),
        artificial_clock_in_guid: artificialClockIn.getGuid(),
        artificial_mission_start_guid: artificialMissionStart.getGuid(),
        estimated_mission_start: estimatedMissionStart,
      });

      autoCreatedSession = true;
      autoCreatedMissionStart = true;

      anomalies[0].technical_details!.estimated_mission_start = estimatedMissionStart;
      anomalies[0].technical_details!.artificial_session_guid = activeSession.getGuid();
    }
    // ✅ CAS 2 : Session active mais pas de mission active
    else {
      const hasActiveMission = await activeSession.activeMission();

      if (!hasActiveMission) {
        anomalies.push({
          type: AnomalyType.MISSION_NOT_ACTIVE,
          severity: AlertSeverity.MEDIUM,
          description: 'Aucune mission active à terminer - Mission start créée automatiquement',
          technical_details: {
            session_guid: activeSession.getGuid(),
          },
          auto_correctable: true,
          auto_correction_applied: true,
        });

        // Créer MISSION_START automatique (1h avant)
        const estimatedMissionStart = new Date(validatedData.clocked_at);
        estimatedMissionStart.setHours(estimatedMissionStart.getHours() - 1);

        const artificialMissionStart = new TimeEntries()
          .setSession(activeSession.getId()!)
          .setUser(userId)
          .setSite(siteObj.getId()!)
          .setPointageType(PointageType.EXTERNAL_MISSION)
          .setClockedAt(estimatedMissionStart)
          .setCoordinates(validatedData.latitude, validatedData.longitude)
          .setPointageStatus(PointageStatus.CORRECTED)
          .setDeviceInfo({
            ...validatedData.device_info,
            auto_generated: true,
            reason: 'missing_mission_start_before_end',
          });

        await artificialMissionStart.save();
        await artificialMissionStart.accept();

        corrections.push({
          action: 'auto_create_mission_start',
          artificial_mission_start_guid: artificialMissionStart.getGuid(),
          estimated_mission_start: estimatedMissionStart,
        });

        autoCreatedMissionStart = true;

        anomalies[anomalies.length - 1].technical_details!.estimated_mission_start =
          estimatedMissionStart;
      }
    }

    return {
      anomalies,
      corrections,
      activeSession,
      autoCreatedSession,
      autoCreatedMissionStart,
    };
  }

  // ========================================
  // GÉNÉRATION MÉMOS AUTOMATIQUES
  // ========================================

  /**
   * Génération mémo automatique standard
   */
  async generateAutoMemo(
    anomalies: Anomaly[],
    entryObj: TimeEntries,
    userId: number,
    corrections: any[] = [],
    scheduleContext?: any,
  ): Promise<Memos | null> {
    if (anomalies.length === 0) return null;

    const severity = this.calculateGlobalSeverity(anomalies);
    const title = this.generateMemoTitle(entryObj.getPointageType()!, anomalies, scheduleContext);
    const details = this.generateMemoDescription(entryObj, anomalies, corrections, scheduleContext);

    // Résolution validateur
    const validatorId = await this.getValidator(userId);

    // Type de mémo selon anomalies
    const memoType = this.mapAnomalyToMemoType(anomalies);

    const roleObj = await Role._load(RoleValues.EMPLOYEE, false, true);

    const identifier = {
      user: userId,
      role: roleObj?.getId()!,
    };

    const userAuthor = await UserRole._load(identifier, false, true);

    const memo = new Memos()
      .setAuthorUser(userAuthor?.getAssignedBy()!)
      .setTargetUser(userId)
      // .setValidatorUser(validatorId)
      .setMemoType(memoType)
      .setMemoStatus(
        MemoStatus.PENDING,
        // severity === AlertSeverity.CRITICAL ? MemoStatus.SUBMITTED : MemoStatus.PENDING,
      )
      .setTitle(title)
      .setDetails(details)
      .setIncidentDatetime(entryObj.getClockedAt()!)
      .setAffectedEntriesIds([entryObj.getId()!])
      .setMemoContent(
        [
          {
            created_at: TimezoneConfigUtils.getCurrentTime().toISOString(),
            user: userAuthor?.getGuid()!,
            message: anomalies.map((a) => ({
              type: MessageType.TEXT,
              content: a.type,
            })),
            // message: [
            // {
            //   type: MessageType.TEXT,
            //   content: `${anomalies.map((a) => a.type).join(', ')}`,
            // },
            // ],
          },
        ],
        // if (description) this.description = description;
      )
      .setAutoGenerated(!MEMOS_DEFAULTS.AUTO_GENERATED); // true
    // .setAutoReason(`${anomalies.length} anomalie(s): ${anomalies.map((a) => a.type).join(', ')}`);

    await memo.save();

    // Notification manager si high/critical
    if ([AlertSeverity.HIGH, AlertSeverity.CRITICAL].includes(severity)) {
      console.log(`🔔 Notification manager ${validatorId} - Mémo ${memo.getGuid()}`);
    }

    const supervisorData = await User._load(userAuthor?.getAssignedBy());
    if (supervisorData?.getDeviceToken()) {
      try {
        await FCMService.sendToToken(supervisorData?.getDeviceToken()!);
      } catch (error: any) {
        console.error('FCM notification error:', error);
      }
    }

    return memo;
  }

  // ========================================
  // CRÉATION FRAUD ALERTS
  // ========================================

  /**
   * Créer alerte fraude pour anomalies critiques
   */
  async createFraudAlert(
    anomaly: Anomaly,
    entryObj: TimeEntries,
    userId: number,
  ): Promise<FraudAlerts | null> {
    // Seulement créer alert si sévérité >= medium
    if (
      ![AlertSeverity.MEDIUM, AlertSeverity.HIGH, AlertSeverity.CRITICAL].includes(anomaly.severity)
    ) {
      return null;
    }

    const alert = new FraudAlerts()
      .setUser(userId)
      .setTimeEntry(entryObj.getId()!)
      .setAlertType(this.mapAnomalyTypeToAlertType(anomaly.type)) // ✅ MAPPER ICI
      // .setAlertType(anomaly.type)
      .setAlertSeverity(anomaly.severity)
      .setAlertDescription(anomaly.description)
      .setAlertData({
        original_anomaly_type: anomaly.type, // ✅ Garder trace du type original
        technical_details: anomaly.technical_details,
        pointage_type: entryObj.getPointageType(),
        clocked_at: entryObj.getClockedAt(),
        site: (await entryObj.getSiteObj())?.getGuid(),
        auto_correctable: anomaly.auto_correctable,
        auto_correction_applied: anomaly.auto_correction_applied,
      });

    await alert.save();

    console.log(`🚨 FraudAlert créée: ${alert.getGuid()} - ${anomaly.severity} - ${anomaly.type}`);

    return alert;
  }

  /**
   * Créer alertes pour toutes les anomalies d'un pointage
   */
  async createFraudAlertsForAnomalies(
    anomalies: Anomaly[],
    entryObj: TimeEntries,
    userId: number,
  ): Promise<FraudAlerts[]> {
    const alerts: FraudAlerts[] = [];

    for (const anomaly of anomalies) {
      const alert = await this.createFraudAlert(anomaly, entryObj, userId);
      if (alert) {
        alerts.push(alert);
      }
    }

    return alerts;
  }

  // ========================================
  // CRÉATION SESSION RÉTROACTIVE
  // ========================================

  /**
   * Créer session rétroactive si aucune session active
   */
  async createRetroactiveSession(
    userId: number,
    siteId: number,
    entryObj: TimeEntries,
  ): Promise<WorkSessions> {
    // Estimer heure de début (8h du matin)
    const estimatedStart = new Date(entryObj.getClockedAt()!);
    estimatedStart.setHours(8, 0, 0, 0);

    const session = new WorkSessions()
      .setUser(userId)
      .setSite(siteId)
      .setSessionStartAt(estimatedStart)
      .setStartCoordinates(entryObj.getLatitude()!, entryObj.getLongitude()!)
      .setSessionStatus(SessionStatus.CORRECTED as any);

    await session.save();

    // set la session crée
    entryObj.setSession(session.getId()!);
    // await entryObj.save();

    // console.log(`✅ Session rétroactive créée: ${session.getGuid()} pour user ${userId}`);

    return session;
  }

  // ========================================
  // UTILITAIRES
  // ========================================

  /**
   * Détection anomalie géofencing (non-bloquante)
   */
  async detectGeofenceAnomaly(geofenceCheck: any, _siteObj: Site): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    if (!geofenceCheck.access_granted) {
      anomalies.push({
        type: AnomalyType.GEOFENCE_VIOLATION,
        severity: AlertSeverity.HIGH,
        description: `Pointage hors zone autorisée - Distance: ${geofenceCheck.distance_from_center}m (max: ${geofenceCheck.site_radius}m)`,
        technical_details: {
          distance_from_center: geofenceCheck.distance_from_center,
          site_radius: geofenceCheck.site_radius,
          tolerance_applied: geofenceCheck.tolerance_applied,
          gps_accuracy: geofenceCheck.gps_accuracy_applied,
          overshoot: geofenceCheck.distance_from_center - geofenceCheck.site_radius,
        },
        auto_correctable: false, // Nécessite validation manager
      });
    }

    return anomalies;
  }

  /**
   * 🆕 MÉTHODE PRINCIPALE : Détection des violations d'horaire
   */
  async detectScheduleViolations(
    userId: number,
    pointageType: PointageType,
    clockedAt: Date,
    sessionObj?: WorkSessions,
  ): Promise<{
    anomalies: Anomaly[];
    scheduleContext: {
      expectedSchedule: ApplicableSchedule | null;
      isWorkDay: boolean;
      expectedBlocks: any[];
      resolutionPath: string[];
    };
  }> {
    const anomalies: Anomaly[] = [];

    // Résoudre l'horaire applicable
    const scheduleResult = await ScheduleResolutionService.getApplicableSchedule(userId, clockedAt);

    if (!scheduleResult.success || !scheduleResult.applicable_schedule) {
      return {
        anomalies: [],
        scheduleContext: {
          expectedSchedule: null,
          isWorkDay: false,
          expectedBlocks: [],
          resolutionPath: scheduleResult.resolution_path || [],
        },
      };
    }

    const schedule = scheduleResult.applicable_schedule;
    const isWorkDay = schedule.is_work_day;
    const expectedBlocks = schedule.expected_blocks;

    // 🔍 ANALYSE SELON TYPE DE POINTAGE
    switch (pointageType) {
      case PointageType.CLOCK_IN:
        anomalies.push(...this.analyzeClockInSchedule(clockedAt, schedule));
        break;

      case PointageType.CLOCK_OUT:
        anomalies.push(...this.analyzeClockOutSchedule(clockedAt, schedule, sessionObj));
        break;

      case PointageType.PAUSE_START:
        anomalies.push(...this.analyzePauseStartSchedule(clockedAt, schedule));
        break;

      case PointageType.PAUSE_END:
        anomalies.push(...(await this.analyzePauseEndSchedule(clockedAt, schedule, sessionObj)));
        break;
    }

    return {
      anomalies,
      scheduleContext: {
        expectedSchedule: schedule,
        isWorkDay,
        expectedBlocks,
        resolutionPath: scheduleResult.resolution_path,
      },
    };
  }

  /**
   * 🆕 Formater Date en "HH:MM"
   */
  public formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }

  private calculateGlobalSeverity(anomalies: Anomaly[]): AlertSeverity {
    if (anomalies.some((a) => a.severity === AlertSeverity.CRITICAL)) return AlertSeverity.CRITICAL;
    if (anomalies.some((a) => a.severity === AlertSeverity.HIGH)) return AlertSeverity.HIGH;
    if (anomalies.some((a) => a.severity === AlertSeverity.MEDIUM)) return AlertSeverity.MEDIUM;
    return AlertSeverity.LOW;
  }

  //   private generateMemoDescription(
  //     entryObj: TimeEntries,
  //     anomalies: Anomaly[],
  //     corrections: any[],
  //   ): string {
  //     const correctionsList =
  //       corrections.length > 0
  //         ? corrections.map((c) => `• ${c.action}`).join('\n')
  //         : 'Aucune correction automatique appliquée';
  //
  //     return `
  // ⚠️ MÉMO AUTO-GÉNÉRÉ - Anomalies Détectées
  //
  // 📍 POINTAGE:
  // - Type: ${entryObj.getPointageType()}
  // - Date/Heure: ${entryObj.getClockedAt()?.toLocaleString('fr-FR')}
  // - GPS: ${entryObj.getLatitude()}, ${entryObj.getLongitude()}
  // - Précision: ${entryObj.getGpsAccuracy()}m
  //
  // 🔍 ANOMALIES DÉTECTÉES (${anomalies.length}):
  // ${anomalies
  //   .map(
  //     (a, i) => `
  // ${i + 1}. [${a.severity.toUpperCase()}] ${a.type}
  //    ${a.description}
  //    ${a.technical_details ? JSON.stringify(a.technical_details, null, 2) : ''}
  //    ${a.auto_correction_applied ? '✅ Correction automatique appliquée' : ''}
  // `,
  //   )
  //   .join('\n')}
  //
  // ✅ CORRECTIONS AUTOMATIQUES:
  // ${correctionsList}
  //
  // ⏳ VALIDATION REQUISE:
  // ${
  //   anomalies.some((a) => !a.auto_correctable)
  //     ? 'Ce mémo nécessite validation manager sous 24h.'
  //     : 'Corrections automatiques appliquées. Validation recommandée.'
  // }
  //     `.trim();
  //   }

  private generateMemoTitle(
    pointageType: PointageType,
    anomalies: Anomaly[],
    scheduleContext?: any,
  ): string {
    const severity = this.calculateGlobalSeverity(anomalies);
    const icon = {
      critical: '🚨',
      high: '⚠️',
      medium: '📝',
      low: 'ℹ️',
    }[severity];

    const typeLabel = {
      [PointageType.CLOCK_IN]: 'Arrivée',
      [PointageType.CLOCK_OUT]: 'Départ',
      [PointageType.PAUSE_START]: 'Début pause',
      [PointageType.PAUSE_END]: 'Fin pause',
      [PointageType.EXTERNAL_MISSION]: 'Mission externe',
      [PointageType.EXTERNAL_MISSION_END]: 'Fin mission',
    }[pointageType];

    // 🆕 Titre spécifique selon type d'anomalie principale
    const hasLateArrival = anomalies.some((a) => a.type === AnomalyType.LATE_ARRIVAL);
    const hasEarlyDeparture = anomalies.some((a) => a.type === AnomalyType.EARLY_DEPARTURE);
    const hasWorkOnRestDay = anomalies.some((a) => a.type === AnomalyType.WORK_ON_REST_DAY);

    if (hasLateArrival) {
      const lateAnomaly = anomalies.find((a) => a.type === AnomalyType.LATE_ARRIVAL);
      return `${icon} Delay ${typeLabel} - ${lateAnomaly?.technical_details?.minutes_late} minutes`;
    }

    if (hasEarlyDeparture) {
      const earlyAnomaly = anomalies.find((a) => a.type === AnomalyType.EARLY_DEPARTURE);
      return `${icon} Early Departure - ${earlyAnomaly?.technical_details?.minutes_early} minutes`;
    }

    if (hasWorkOnRestDay) {
      return `${icon} Rest Day Score`;
    }

    return `${icon} ${typeLabel} anomaly - ${anomalies.length} incident(s)`;
  }

  // private mapAnomalyToMemoType(anomalies: Anomaly[]): MemoType {
  //   if (anomalies.some((a) => a.type === AnomalyType.SESSION_NOT_FOUND)) {
  //     return MemoType.SESSION_CLOSURE;
  //   }
  //   if (
  //     anomalies.some((a) =>
  //       [AnomalyType.TIMING_ABNORMAL, AnomalyType.SESSION_TOO_LONG].includes(a.type),
  //     )
  //   ) {
  //     return MemoType.DELAY_JUSTIFICATION;
  //   }
  //   return MemoType.CORRECTION_REQUEST;
  // }

  /**
   * 🆕 DESCRIPTION MÉMO ENRICHIE avec contexte horaire
   */
  private generateMemoDescription(
    entryObj: TimeEntries,
    anomalies: Anomaly[],
    corrections: any[],
    scheduleContext?: any,
  ): string {
    const correctionsList =
      corrections.length > 0
        ? corrections.map((c) => `• ${c.action}`).join('\n')
        : 'Aucune correction automatique appliquée';

    let scheduleInfo = '';

    // 🆕 AJOUT CONTEXTE HORAIRE si disponible
    if (scheduleContext?.expectedSchedule) {
      const schedule = scheduleContext.expectedSchedule;

      scheduleInfo = `
📅 HORAIRE ATTENDU:
- Template: ${schedule.template_name} (${schedule.template_guid})
- Source: ${schedule.source === 'exception' ? '🔴 Exception' : schedule.source === 'rotation' ? '🔄 Rotation' : schedule.source === 'direct' ? '👤 Direct' : '🏢 Défaut'}
- Date: ${schedule.schedule_date}
- Jour de travail: ${schedule.is_work_day ? '✅ Oui' : '❌ Non (repos)'}
${
  schedule.is_work_day
    ? `- Plages horaires: ${schedule.expected_blocks.map((b: any) => `${b.work[0]}-${b.work[1]}${b.pause ? ` (pause ${b.pause[0]}-${b.pause[1]})` : ''}`).join(', ')}
- Tolérance: ${schedule.tolerance_minutes} minutes`
    : ''
}

🔍 RÉSOLUTION D'HORAIRE:
${scheduleContext.resolutionPath?.map((step: string) => `  ${step}`).join('\n')}
`;
    }

    return `
⚠️ MÉMO AUTO-GÉNÉRÉ - Anomalies Détectées

📍 POINTAGE:
- Type: ${entryObj.getPointageType()}
- Date/Heure: ${entryObj.getClockedAt()?.toLocaleString('fr-FR')}
- GPS: ${entryObj.getLatitude()}, ${entryObj.getLongitude()}
- Précision: ${entryObj.getGpsAccuracy()}m
${scheduleInfo}
🔍 ANOMALIES DÉTECTÉES (${anomalies.length}):
${anomalies
  .map(
    (a, i) => `
${i + 1}. [${a.severity.toUpperCase()}] ${a.type}
   ${a.description}
   ${a.technical_details ? `Détails: ${JSON.stringify(a.technical_details, null, 2)}` : ''}
   ${a.auto_correction_applied ? '✅ Correction automatique appliquée' : ''}
`,
  )
  .join('\n')}

✅ CORRECTIONS AUTOMATIQUES:
${correctionsList}

⏳ VALIDATION REQUISE:
${
  anomalies.some((a) => !a.auto_correctable)
    ? 'Ce mémo nécessite validation manager sous 24h.'
    : 'Corrections automatiques appliquées. Validation recommandée.'
}
  `.trim();
  }

  private mapAnomalyToMemoType(anomalies: Anomaly[]): MemoType {
    // Retard = DELAY_JUSTIFICATION
    if (
      anomalies.some(
        (a) =>
          a.type === AnomalyType.LATE_ARRIVAL ||
          a.type === AnomalyType.EARLY_ARRIVAL ||
          a.type === AnomalyType.TIMING_ABNORMAL,
      )
    ) {
      return MemoType.DELAY_JUSTIFICATION;
    }

    // Absence = ABSENCE_JUSTIFICATION
    if (
      anomalies.some(
        (a) =>
          a.type === AnomalyType.ABSENT_NO_SHOW ||
          a.type === AnomalyType.WORK_ON_REST_DAY ||
          a.type === AnomalyType.MISSED_WORK_BLOCK,
      )
    ) {
      return MemoType.ABSENCE_JUSTIFICATION;
    }

    // Départ anticipé ou pause trop longue = CORRECTION_REQUEST
    if (
      anomalies.some(
        (a) =>
          a.type === AnomalyType.EARLY_DEPARTURE ||
          a.type === AnomalyType.PAUSE_TOO_LONG ||
          a.type === AnomalyType.PAUSE_NO_RETURN ||
          a.type === AnomalyType.DURATION_ABNORMAL,
      )
    ) {
      return MemoType.CORRECTION_REQUEST;
    }

    // Session manquante = SESSION_CLOSURE
    if (anomalies.some((a) => a.type === AnomalyType.SESSION_NOT_FOUND)) {
      return MemoType.SESSION_CLOSURE;
    }

    // Par défaut = AUTO_GENERATED
    return MemoType.AUTO_GENERATED;
  }

  private async getValidator(userId: number): Promise<number> {
    // TODO: Récupérer N+1 hiérarchique via org_hierarchy
    // Pour l'instant, retourner userId comme placeholder
    return userId;
  }

  private async getTodayPausesCount(userId: number): Promise<number> {
    const today = TimezoneConfigUtils.getCurrentTime();
    today.setHours(0, 0, 0, 0);

    const pauses = await TimeEntries._list({
      user: userId,
      pointage_type: PointageType.PAUSE_START,
      clocked_at: { [Op.gte]: today },
    });

    return pauses?.length || 0;
  }

  private calculateDurationHours(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  private calculateDurationMinutes(start: Date, end: Date): number {
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  }

  /**
   * Mapper AnomalyType vers AlertType pour FraudAlerts
   */
  private mapAnomalyTypeToAlertType(anomalyType: AnomalyType): string {
    const mapping: Record<AnomalyType, AlertType> = {
      // États sessions
      [AnomalyType.SESSION_ALREADY_OPEN]: AlertType.SUSPICIOUS_PATTERN,
      [AnomalyType.SESSION_NOT_FOUND]: AlertType.SUSPICIOUS_PATTERN,
      [AnomalyType.SESSION_TOO_LONG]: AlertType.SCHEDULE_VIOLATION,

      // Séquences pointages
      [AnomalyType.PAUSE_ALREADY_ACTIVE]: AlertType.DUPLICATE_ENTRY,
      [AnomalyType.PAUSE_NOT_ACTIVE]: AlertType.SUSPICIOUS_PATTERN,
      [AnomalyType.MISSION_ALREADY_ACTIVE]: AlertType.DUPLICATE_ENTRY,
      [AnomalyType.MISSION_NOT_ACTIVE]: AlertType.SUSPICIOUS_PATTERN,

      // Timing
      [AnomalyType.TIMING_ABNORMAL]: AlertType.TIME_MANIPULATION,
      [AnomalyType.DURATION_ABNORMAL]: AlertType.TIME_MANIPULATION,
      [AnomalyType.FREQUENCY_SUSPICIOUS]: AlertType.SUSPICIOUS_PATTERN,

      // GPS/Fraude
      [AnomalyType.GPS_SPOOFING_SUSPECTED]: AlertType.DEVICE_ANOMALY,
      [AnomalyType.DISTANCE_IMPOSSIBLE]: AlertType.VELOCITY_CHECK,

      // Géofencing
      [AnomalyType.GEOFENCE_VIOLATION]: AlertType.GEOFENCE_VIOLATION,

      [AnomalyType.UNAUTHORIZED_QR_CODE]: AlertType.UNAUTHORIZED_ACCESS,
      [AnomalyType.EXPIRED_QR_CODE]: AlertType.UNAUTHORIZED_ACCESS,

      [AnomalyType.LATE_ARRIVAL]: AlertType.SCHEDULE_VIOLATION,
      [AnomalyType.EARLY_DEPARTURE]: AlertType.SCHEDULE_VIOLATION,
      [AnomalyType.ABSENT_NO_SHOW]: AlertType.SCHEDULE_VIOLATION,
      [AnomalyType.PAUSE_TOO_LONG]: AlertType.SCHEDULE_VIOLATION,
      [AnomalyType.PAUSE_NO_RETURN]: AlertType.SCHEDULE_VIOLATION,
      [AnomalyType.MISSED_WORK_BLOCK]: AlertType.SCHEDULE_VIOLATION,
      [AnomalyType.OFF_SCHEDULE_CLOCKING]: AlertType.SCHEDULE_VIOLATION,
      [AnomalyType.WORK_ON_REST_DAY]: AlertType.SCHEDULE_VIOLATION,
      [AnomalyType.EARLY_ARRIVAL]: AlertType.SUSPICIOUS_PATTERN,
      [AnomalyType.PAUSE_OUTSIDE_BLOCK]: AlertType.SCHEDULE_VIOLATION,
    };

    return mapping[anomalyType] || AlertType.SUSPICIOUS_PATTERN;
  }

  /**
   * 🆕 Analyse CLOCK_IN par rapport à l'horaire
   */
  private analyzeClockInSchedule(clockedAt: Date, schedule: ApplicableSchedule): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Cas 1 : Pointage un jour de repos
    if (!schedule.is_work_day) {
      anomalies.push({
        type: AnomalyType.WORK_ON_REST_DAY,
        severity: AlertSeverity.MEDIUM,
        description: `Time recorded on a day off according to the schedule "${schedule.template_name}"`,
        technical_details: {
          schedule_date: schedule.schedule_date,
          template_name: schedule.template_name,
          source: schedule.source,
        },
        auto_correctable: false,
      });
      return anomalies; // Pas besoin d'analyser plus
    }

    // Cas 2 : Vérifier retard ou arrivée anticipée
    const firstBlock = schedule.expected_blocks[0];
    if (!firstBlock) return anomalies;

    const expectedStartTime = firstBlock.work[0];
    const tolerance = firstBlock.tolerance || 0;

    const clockedTime = this.formatTime(clockedAt);
    const clockedMinutes = ScheduleResolutionService.parseTimeToMinutes(clockedTime);
    const expectedMinutes = ScheduleResolutionService.parseTimeToMinutes(expectedStartTime);

    const diffMinutes = clockedMinutes - expectedMinutes;

    // Retard détecté
    if (diffMinutes > tolerance) {
      const severity = this.calculateLateSeverity(diffMinutes, tolerance);
      anomalies.push({
        type: AnomalyType.LATE_ARRIVAL,
        severity,
        description: `Delay of ${diffMinutes} minutes (tolerance: ${tolerance} min, overrun: ${diffMinutes - tolerance} min)`,
        technical_details: {
          expected_start: expectedStartTime,
          actual_start: clockedTime,
          minutes_late: diffMinutes,
          tolerance,
          overshoot: diffMinutes - tolerance,
          template_name: schedule.template_name,
        },
        auto_correctable: false,
      });
    }
    // Arrivée très en avance (>60 min)
    else if (diffMinutes < -60) {
      anomalies.push({
        type: AnomalyType.EARLY_ARRIVAL,
        severity: AlertSeverity.LOW,
        description: `Arrivée en avance de ${Math.abs(diffMinutes)} minutes`,
        technical_details: {
          expected_start: expectedStartTime,
          actual_start: clockedTime,
          minutes_early: Math.abs(diffMinutes),
        },
        auto_correctable: false,
      });
    }

    return anomalies;
  }

  /**
   * 🆕 Analyse CLOCK_OUT par rapport à l'horaire
   */
  private analyzeClockOutSchedule(
    clockedAt: Date,
    schedule: ApplicableSchedule,
    sessionObj?: WorkSessions,
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (!schedule.is_work_day || schedule.expected_blocks.length === 0) {
      return anomalies;
    }

    // Prendre le dernier bloc de travail de la journée
    const lastBlock = schedule.expected_blocks[schedule.expected_blocks.length - 1];
    const expectedEndTime = lastBlock.work[1];

    const clockedTime = this.formatTime(clockedAt);
    const clockedMinutes = ScheduleResolutionService.parseTimeToMinutes(clockedTime);
    const expectedMinutes = ScheduleResolutionService.parseTimeToMinutes(expectedEndTime);

    const diffMinutes = expectedMinutes - clockedMinutes;

    // Départ anticipé
    if (diffMinutes > 0) {
      const severity = diffMinutes > 60 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM;
      anomalies.push({
        type: AnomalyType.EARLY_DEPARTURE,
        severity,
        description: `Early departure of ${diffMinutes} minutes`,
        technical_details: {
          expected_end: expectedEndTime,
          actual_end: clockedTime,
          minutes_early: diffMinutes,
          template_name: schedule.template_name,
        },
        auto_correctable: false,
      });
    }

    // Vérifier durée totale travaillée vs attendue
    if (sessionObj) {
      const sessionStart = sessionObj.getSessionStartAt()!;
      const totalWorkedMinutes = this.calculateDurationMinutes(sessionStart, clockedAt);
      const expectedTotalMinutes = this.calculateExpectedWorkMinutes(schedule);

      const durationDiff = expectedTotalMinutes - totalWorkedMinutes;

      if (Math.abs(durationDiff) > 60) {
        anomalies.push({
          type: AnomalyType.DURATION_ABNORMAL,
          severity: AlertSeverity.MEDIUM,
          description: `Abnormal working time: ${Math.floor(totalWorkedMinutes / 60)}h${totalWorkedMinutes % 60}min vs ${Math.floor(expectedTotalMinutes / 60)}h${expectedTotalMinutes % 60}min expected`,
          technical_details: {
            worked_minutes: totalWorkedMinutes,
            expected_minutes: expectedTotalMinutes,
            difference_minutes: durationDiff,
          },
          auto_correctable: false,
        });
      }
    }

    return anomalies;
  }

  /**
   * 🆕 Analyse PAUSE_START par rapport à l'horaire
   */
  private analyzePauseStartSchedule(clockedAt: Date, schedule: ApplicableSchedule): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (!schedule.is_work_day) return anomalies;

    // Vérifier si pause est dans une plage autorisée
    const clockedTime = this.formatTime(clockedAt);
    const clockedMinutes = ScheduleResolutionService.parseTimeToMinutes(clockedTime);

    let isInPauseWindow = false;
    for (const block of schedule.expected_blocks) {
      if (block.pause) {
        const pauseStart = ScheduleResolutionService.parseTimeToMinutes(block.pause[0]);
        const pauseEnd = ScheduleResolutionService.parseTimeToMinutes(block.pause[1]);

        if (clockedMinutes >= pauseStart && clockedMinutes <= pauseEnd) {
          isInPauseWindow = true;
          break;
        }
      }
    }

    if (!isInPauseWindow && schedule.expected_blocks.some((b) => b.pause)) {
      anomalies.push({
        type: AnomalyType.PAUSE_OUTSIDE_BLOCK,
        severity: AlertSeverity.LOW,
        description: `Break started outside authorized time slots`,
        technical_details: {
          pause_start_time: clockedTime,
          expected_pause_blocks: schedule.expected_blocks
            .filter((b) => b.pause)
            .map((b) => b.pause),
        },
        auto_correctable: false,
      });
    }

    return anomalies;
  }

  /**
   * 🆕 Analyse PAUSE_END par rapport à l'horaire
   */
  private async analyzePauseEndSchedule(
    clockedAt: Date,
    schedule: ApplicableSchedule,
    sessionObj?: WorkSessions,
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    if (!sessionObj) return anomalies;

    // Récupérer le dernier PAUSE_START
    const entries = await TimeEntries._listBySession(sessionObj.getId()!);
    const lastPauseStart = entries
      ?.reverse()
      .find((e) => e.getPointageType() === PointageType.PAUSE_START);

    if (!lastPauseStart) return anomalies;

    const pauseDuration = this.calculateDurationMinutes(lastPauseStart.getClockedAt()!, clockedAt);

    // Trouver la durée de pause autorisée
    const clockedTime = this.formatTime(lastPauseStart.getClockedAt()!);
    const clockedMinutes = ScheduleResolutionService.parseTimeToMinutes(clockedTime);

    let maxPauseDuration = 120; // Défaut 2h
    for (const block of schedule.expected_blocks) {
      if (block.pause) {
        const pauseStart = ScheduleResolutionService.parseTimeToMinutes(block.pause[0]);
        const pauseEnd = ScheduleResolutionService.parseTimeToMinutes(block.pause[1]);

        if (clockedMinutes >= pauseStart && clockedMinutes <= pauseEnd) {
          maxPauseDuration = pauseEnd - pauseStart;
          break;
        }
      }
    }

    if (pauseDuration > maxPauseDuration + 15) {
      // +15 min de tolérance
      anomalies.push({
        type: AnomalyType.PAUSE_TOO_LONG,
        severity: AlertSeverity.HIGH,
        description: `Pause too long: ${Math.floor(pauseDuration / 60)}h${pauseDuration % 60}min (max: ${Math.floor(maxPauseDuration / 60)}h${maxPauseDuration % 60}min)`,
        technical_details: {
          pause_duration_minutes: pauseDuration,
          max_allowed_minutes: maxPauseDuration,
          overshoot_minutes: pauseDuration - maxPauseDuration,
          pause_start: this.formatTime(lastPauseStart.getClockedAt()!),
          pause_end: this.formatTime(clockedAt),
        },
        auto_correctable: false,
      });
    }

    return anomalies;
  }

  /**
   * 🆕 Calculer sévérité du retard
   */
  private calculateLateSeverity(minutesLate: number, tolerance: number): AlertSeverity {
    const overshoot = minutesLate - tolerance;

    if (overshoot <= 0) return AlertSeverity.LOW; // Dans tolérance
    if (overshoot <= 15) return AlertSeverity.MEDIUM; // Retard léger
    if (overshoot <= 60) return AlertSeverity.HIGH; // Retard significatif
    return AlertSeverity.CRITICAL; // Retard grave (>1h)
  }

  /**
   * 🆕 Calculer durée totale de travail attendue
   */
  private calculateExpectedWorkMinutes(schedule: ApplicableSchedule): number {
    let totalMinutes = 0;

    for (const block of schedule.expected_blocks) {
      const startMinutes = ScheduleResolutionService.parseTimeToMinutes(block.work[0]);
      const endMinutes = ScheduleResolutionService.parseTimeToMinutes(block.work[1]);
      totalMinutes += endMinutes - startMinutes;
    }

    return totalMinutes;
  }
}

// Export singleton
export default new AnomalyDetectionService();
