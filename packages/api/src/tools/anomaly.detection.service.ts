// src/api/services/AnomalyDetectionService.ts

import {
  AlertSeverity,
  AlertType,
  MemoStatus,
  MemoType,
  PointageStatus,
  PointageType,
  SessionStatus,
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

  /**
   * Détection anomalies CLOCK_IN
   */
  async detectClockInAnomalies(
    userId: number,
    validatedData: any,
  ): Promise<{
    anomalies: Anomaly[];
    corrections: any[];
  }> {
    const anomalies: Anomaly[] = [];
    const corrections: any[] = [];

    // 1. Session déjà ouverte
    const activeSession = await WorkSessions._findActiveSessionByUser(userId);
    if (activeSession) {
      anomalies.push({
        type: AnomalyType.SESSION_ALREADY_OPEN,
        severity: AlertSeverity.MEDIUM, // 'medium',
        description: `Session déjà ouverte depuis ${activeSession.getSessionStartAt()?.toLocaleString('fr-FR')}`,
        technical_details: {
          existing_session_guid: activeSession.getGuid(),
          session_start: activeSession.getSessionStartAt(),
          duration_hours: this.calculateDurationHours(
            activeSession.getSessionStartAt()!,
            new Date(),
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
      console.log('je suis ici 1');
      await activeSession.save();

      corrections.push({
        action: 'auto_close_previous_session',
        session_guid: activeSession.getGuid(),
        estimated_end: estimatedEnd,
      });

      anomalies[anomalies.length - 1].auto_correction_applied = true;
    }

    // 2. Horaire anormal (avant 5h ou après 23h)
    const hour = new Date(validatedData.clocked_at).getHours();
    if (hour < 5 || hour > 23) {
      anomalies.push({
        type: AnomalyType.TIMING_ABNORMAL,
        severity: AlertSeverity.LOW, //'low',
        description: `Pointage à horaire inhabituel (${hour}h)`,
        technical_details: {
          hour,
          expected_range: '05h-23h',
        },
        auto_correctable: false,
      });
    }

    // 3. GPS spoofing (mock location)
    if (validatedData.device_info?.mock_location_detected) {
      anomalies.push({
        type: AnomalyType.GPS_SPOOFING_SUSPECTED,
        severity: AlertSeverity.HIGH, // 'high',
        description: 'Position GPS simulée détectée',
        technical_details: {
          mock_location: true,
          device_info: validatedData.device_info,
        },
        auto_correctable: false,
      });
    }

    return { anomalies, corrections };
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
   * Détection anomalies CLOCK_OUT
   */
  async detectClockOutAnomalies(
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
        description: 'Aucune session active à fermer',
        auto_correctable: true,
      });
      return { anomalies, corrections, activeSession: null };
    }

    // Pause non fermée
    const hasActivePause = await activeSession.isOnPause();
    if (hasActivePause) {
      anomalies.push({
        type: AnomalyType.PAUSE_NOT_ACTIVE,
        severity: AlertSeverity.MEDIUM, // 'medium',
        description: 'Pause non fermée - fermeture automatique',
        auto_correctable: true,
      });

      // ✅ CORRECTION AUTO
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

    // Session trop longue
    const sessionDuration = this.calculateDurationHours(
      activeSession.getSessionStartAt()!,
      new Date(validatedData.clocked_at),
    );

    if (sessionDuration > 12) {
      anomalies.push({
        type: AnomalyType.SESSION_TOO_LONG,
        severity: AlertSeverity.HIGH, // 'high',
        description: `Session anormalement longue (${sessionDuration.toFixed(1)}h)`,
        technical_details: {
          duration_hours: sessionDuration,
          expected_max: 12,
          session_start: activeSession.getSessionStartAt(),
        },
        auto_correctable: false,
      });
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

  // /**
  //  * Détection anomalies EXTERNAL_MISSION (start)
  //  */
  // async detectMissionStartAnomalies(
  //   userId: number,
  //   validatedData: any,
  // ): Promise<{
  //   anomalies: Anomaly[];
  //   corrections: any[];
  //   activeSession: WorkSessions | null;
  // }> {
  //   const anomalies: Anomaly[] = [];
  //   const corrections: any[] = [];
  //
  //   const activeSession = await WorkSessions._findActiveSessionByUser(userId);
  //   if (!activeSession) {
  //     anomalies.push({
  //       type: AnomalyType.SESSION_NOT_FOUND,
  //       severity: AlertSeverity.CRITICAL, // 'critical',
  //       description: 'Aucune session active pour démarrer une mission',
  //       auto_correctable: true,
  //     });
  //     return { anomalies, corrections, activeSession: null };
  //   }
  //
  //   // Mission déjà active
  //   const hasActiveMission = await activeSession.activeMission();
  //   if (hasActiveMission) {
  //     anomalies.push({
  //       type: AnomalyType.MISSION_ALREADY_ACTIVE,
  //       severity: AlertSeverity.HIGH, // 'high',
  //       description: 'Une mission externe est déjà en cours',
  //       auto_correctable: false,
  //     });
  //   }
  //
  //   return { anomalies, corrections, activeSession };
  // }

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

  // /**
  //  * Détection anomalies EXTERNAL_MISSION_END
  //  */
  // async detectMissionEndAnomalies(
  //   userId: number,
  //   validatedData: any,
  // ): Promise<{
  //   anomalies: Anomaly[];
  //   corrections: any[];
  //   activeSession: WorkSessions | null;
  // }> {
  //   const anomalies: Anomaly[] = [];
  //   const corrections: any[] = [];
  //
  //   const activeSession = await WorkSessions._findActiveSessionByUser(userId);
  //   if (!activeSession) {
  //     anomalies.push({
  //       type: AnomalyType.SESSION_NOT_FOUND,
  //       severity: AlertSeverity.CRITICAL, // 'critical',
  //       description: 'Aucune session active pour terminer une mission',
  //       auto_correctable: true,
  //     });
  //     return { anomalies, corrections, activeSession: null };
  //   }
  //
  //   // Mission non active
  //   const hasActiveMission = await activeSession.activeMission();
  //   if (!hasActiveMission) {
  //     anomalies.push({
  //       type: AnomalyType.MISSION_NOT_ACTIVE,
  //       severity: AlertSeverity.MEDIUM, //'medium',
  //       description: 'Aucune mission active à terminer',
  //       auto_correctable: false,
  //     });
  //   }
  //
  //   return { anomalies, corrections, activeSession };
  // }

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
  ): Promise<Memos | null> {
    if (anomalies.length === 0) return null;

    const severity = this.calculateGlobalSeverity(anomalies);
    const title = this.generateMemoTitle(entryObj.getPointageType()!, anomalies);
    const details = this.generateMemoDescription(entryObj, anomalies, corrections);

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
        MemoStatus.SUBMITTED,
        // severity === AlertSeverity.CRITICAL ? MemoStatus.SUBMITTED : MemoStatus.PENDING,
      )
      .setTitle(title)
      .setDetails(details)
      .setIncidentDatetime(entryObj.getClockedAt()!)
      .setAffectedEntriesIds([entryObj.getId()!])
      .setAutoGenerated(
        true,
        `${anomalies.length} anomalie(s): ${anomalies.map((a) => a.type).join(', ')}`,
      );
    // .setAutoReason(`${anomalies.length} anomalie(s): ${anomalies.map((a) => a.type).join(', ')}`);

    console.log('🔴🔴🔴🔴 meno');
    await memo.save();

    // Notification manager si high/critical
    if ([AlertSeverity.HIGH, AlertSeverity.CRITICAL].includes(severity)) {
      console.log(`🔔 Notification manager ${validatorId} - Mémo ${memo.getGuid()}`);
    }

    return memo;
  }

  /**
   * Génération mémo GÉOFENCING spécifique (même si pointage refusé)
   */
  async generateGeofencingMemo(
    userId: number,
    siteObj: Site,
    validatedData: any,
    geofenceCheck: any,
  ): Promise<Memos> {
    const validatorId = await this.getValidator(userId);

    const title = `🚨 Pointage hors zone - ${validatedData.pointage_type}`;
    const description = `
⚠️ MÉMO AUTO-GÉNÉRÉ - Géofencing Violation

📍 Site: ${siteObj.getName()}
🕐 Tentative: ${new Date(validatedData.clocked_at).toLocaleString('fr-FR')}
📱 Type: ${validatedData.pointage_type}

🔍 DÉTAILS GÉOFENCING:
- Distance du centre: ${geofenceCheck.distance_from_center}m
- Rayon autorisé: ${siteObj.getGeofenceRadius()}m
- Dépassement: ${geofenceCheck.distance_from_center - siteObj.getGeofenceRadius()!}m

📱 DEVICE INFO:
- GPS Accuracy: ${validatedData.gps_accuracy}m
- Coordonnées: ${validatedData.latitude}, ${validatedData.longitude}

⏳ ACTION REQUISE:
Le pointage a été REFUSÉ automatiquement.
Validation manager requise pour accepter manuellement si raison légitime.
    `.trim();

    const memo = new Memos()
      .setAuthorUser(userId)
      .setTargetUser(userId)
      .setValidatorUser(validatorId)
      .setMemoType(MemoType.CORRECTION_REQUEST)
      .setMemoStatus(MemoStatus.SUBMITTED) // Urgent
      .setTitle(title)
      .setDescription(description)
      .setIncidentDatetime(new Date(validatedData.clocked_at))
      .setAutoGenerated(true, 'geofence_violation');
    // .setAutoReason('geofence_violation');

    await memo.save();

    // Notification immédiate
    console.log(`🚨 Notification URGENTE manager ${validatorId} - Géofencing violation`);

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

  private calculateGlobalSeverity(anomalies: Anomaly[]): AlertSeverity {
    if (anomalies.some((a) => a.severity === AlertSeverity.CRITICAL)) return AlertSeverity.CRITICAL;
    if (anomalies.some((a) => a.severity === AlertSeverity.HIGH)) return AlertSeverity.HIGH;
    if (anomalies.some((a) => a.severity === AlertSeverity.MEDIUM)) return AlertSeverity.MEDIUM;
    return AlertSeverity.LOW;
  }

  private generateMemoTitle(pointageType: PointageType, anomalies: Anomaly[]): string {
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

    return `${icon} Anomalie ${typeLabel} - ${anomalies.length} incident(s)`;
  }

  private generateMemoDescription(
    entryObj: TimeEntries,
    anomalies: Anomaly[],
    corrections: any[],
  ): string {
    const correctionsList =
      corrections.length > 0
        ? corrections.map((c) => `• ${c.action}`).join('\n')
        : 'Aucune correction automatique appliquée';

    return `
⚠️ MÉMO AUTO-GÉNÉRÉ - Anomalies Détectées

📍 POINTAGE:
- Type: ${entryObj.getPointageType()}
- Date/Heure: ${entryObj.getClockedAt()?.toLocaleString('fr-FR')}
- GPS: ${entryObj.getLatitude()}, ${entryObj.getLongitude()}
- Précision: ${entryObj.getGpsAccuracy()}m

🔍 ANOMALIES DÉTECTÉES (${anomalies.length}):
${anomalies
  .map(
    (a, i) => `
${i + 1}. [${a.severity.toUpperCase()}] ${a.type}
   ${a.description}
   ${a.technical_details ? JSON.stringify(a.technical_details, null, 2) : ''}
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
    if (anomalies.some((a) => a.type === AnomalyType.SESSION_NOT_FOUND)) {
      return MemoType.SESSION_CLOSURE;
    }
    if (
      anomalies.some((a) =>
        [AnomalyType.TIMING_ABNORMAL, AnomalyType.SESSION_TOO_LONG].includes(a.type),
      )
    ) {
      return MemoType.DELAY_JUSTIFICATION;
    }
    return MemoType.CORRECTION_REQUEST;
  }

  private async getValidator(userId: number): Promise<number> {
    // TODO: Récupérer N+1 hiérarchique via org_hierarchy
    // Pour l'instant, retourner userId comme placeholder
    return userId;
  }

  private async getTodayPausesCount(userId: number): Promise<number> {
    const today = new Date();
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
    };

    return mapping[anomalyType] || AlertType.SUSPICIOUS_PATTERN;
  }
}

// Export singleton
export default new AnomalyDetectionService();
