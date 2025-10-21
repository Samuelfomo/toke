// src/api/services/AnomalyDetectionService.ts

import { MemoStatus, MemoType, PointageStatus, PointageType } from '@toke/shared';
import { Op } from 'sequelize';

import TimeEntries from '../tenant/class/TimeEntries.js';
import WorkSessions from '../tenant/class/WorkSessions.js';
import Memos from '../tenant/class/Memos.js';
import FraudAlerts from '../tenant/class/FraudAlerts.js';
import Site from '../tenant/class/Site.js';

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
  severity: 'low' | 'medium' | 'high' | 'critical';
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
        severity: 'medium',
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
      estimatedEnd.setMinutes(estimatedEnd.getMinutes() - 1);

      activeSession.setSessionEndAt(estimatedEnd).setSessionStatus('abandoned' as any);

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
        severity: 'low',
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
        severity: 'high',
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
        severity: 'critical',
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
        severity: 'medium',
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
      anomalies.push({
        type: AnomalyType.FREQUENCY_SUSPICIOUS,
        severity: 'low',
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
        severity: 'critical',
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
        severity: 'medium',
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
            severity: 'high',
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
        severity: 'critical',
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
        severity: 'medium',
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
        severity: 'high',
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
   * Détection anomalies EXTERNAL_MISSION (start)
   */
  async detectMissionStartAnomalies(
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
        severity: 'critical',
        description: 'Aucune session active pour démarrer une mission',
        auto_correctable: true,
      });
      return { anomalies, corrections, activeSession: null };
    }

    // Mission déjà active
    const hasActiveMission = await activeSession.activeMission();
    if (hasActiveMission) {
      anomalies.push({
        type: AnomalyType.MISSION_ALREADY_ACTIVE,
        severity: 'high',
        description: 'Une mission externe est déjà en cours',
        auto_correctable: false,
      });
    }

    return { anomalies, corrections, activeSession };
  }

  /**
   * Détection anomalies EXTERNAL_MISSION_END
   */
  async detectMissionEndAnomalies(
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
        severity: 'critical',
        description: 'Aucune session active pour terminer une mission',
        auto_correctable: true,
      });
      return { anomalies, corrections, activeSession: null };
    }

    // Mission non active
    const hasActiveMission = await activeSession.activeMission();
    if (!hasActiveMission) {
      anomalies.push({
        type: AnomalyType.MISSION_NOT_ACTIVE,
        severity: 'medium',
        description: 'Aucune mission active à terminer',
        auto_correctable: false,
      });
    }

    return { anomalies, corrections, activeSession };
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
    const description = this.generateMemoDescription(entryObj, anomalies, corrections);

    // Résolution validateur
    const validatorId = await this.getValidator(userId);

    // Type de mémo selon anomalies
    const memoType = this.mapAnomalyToMemoType(anomalies);

    const memo = new Memos()
      .setAuthorUser(userId)
      .setTargetUser(userId)
      .setValidatorUser(validatorId)
      .setMemoType(memoType)
      .setMemoStatus(severity === 'critical' ? MemoStatus.SUBMITTED : MemoStatus.PENDING)
      .setTitle(title)
      .setDescription(description)
      .setIncidentDatetime(entryObj.getClockedAt()!)
      .setAffectedEntriesIds([entryObj.getId()!])
      .setAutoGenerated(
        true,
        `${anomalies.length} anomalie(s): ${anomalies.map((a) => a.type).join(', ')}`,
      );
    // .setAutoReason(`${anomalies.length} anomalie(s): ${anomalies.map((a) => a.type).join(', ')}`);

    await memo.save();

    // Notification manager si high/critical
    if (['high', 'critical'].includes(severity)) {
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
    if (!['medium', 'high', 'critical'].includes(anomaly.severity)) {
      return null;
    }

    const alert = new FraudAlerts()
      .setUser(userId)
      .setTimeEntry(entryObj.getId()!)
      .setAlertType(anomaly.type)
      .setAlertSeverity(anomaly.severity)
      .setAlertDescription(anomaly.description)
      .setAlertData({
        technical_details: anomaly.technical_details,
        pointage_type: entryObj.getPointageType(),
        clocked_at: entryObj.getClockedAt(),
        site_id: entryObj.getSite(),
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
      .setSessionStatus('corrected' as any);

    await session.save();

    // Mettre à jour l'entry avec la session
    entryObj.setSession(session.getId()!);
    await entryObj.save();

    console.log(`✅ Session rétroactive créée: ${session.getGuid()} pour user ${userId}`);

    return session;
  }

  // ========================================
  // UTILITAIRES
  // ========================================

  private calculateGlobalSeverity(anomalies: Anomaly[]): 'low' | 'medium' | 'high' | 'critical' {
    if (anomalies.some((a) => a.severity === 'critical')) return 'critical';
    if (anomalies.some((a) => a.severity === 'high')) return 'high';
    if (anomalies.some((a) => a.severity === 'medium')) return 'medium';
    return 'low';
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
}

// Export singleton
export default new AnomalyDetectionService();
