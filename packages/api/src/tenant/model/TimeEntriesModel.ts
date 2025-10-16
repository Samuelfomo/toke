import {
  PointageStatus,
  PointageType,
  TIME_ENTRIES_ERRORS,
  TimeEntriesValidationUtils,
} from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class TimeEntriesModel extends BaseModel {
  public readonly db = {
    tableName: tableName.TIME_ENTRIES,
    id: 'id',
    guid: 'guid',
    session: 'session',
    user: 'user',
    site: 'site',
    pointage_type: 'pointage_type',
    pointage_status: 'pointage_status',
    clocked_at: 'clocked_at',
    real_clocked_at: 'real_clocked_at',
    server_received_at: 'server_received_at',
    latitude: 'latitude',
    longitude: 'longitude',
    gps_accuracy: 'gps_accuracy',
    device_info: 'device_info',
    ip_address: 'ip_address',
    user_agent: 'user_agent',
    created_offline: 'created_offline',
    local_id: 'local_id',
    sync_attempts: 'sync_attempts',
    last_sync_attempt: 'last_sync_attempt',
    memo: 'memo',
    correction_reason: 'correction_reason',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected guid?: string;
  protected session?: number;
  protected user?: number;
  protected site?: number;
  protected pointage_type?: PointageType;
  protected pointage_status?: PointageStatus;
  protected clocked_at?: Date;
  protected real_clocked_at?: Date;
  protected server_received_at?: Date;
  protected latitude?: number;
  protected longitude?: number;
  protected gps_accuracy?: number;
  protected device_info?: Record<string, any>;
  protected ip_address?: string;
  protected user_agent?: string;
  protected created_offline?: boolean;
  protected local_id?: string;
  protected sync_attempts?: number;
  protected last_sync_attempt?: Date;
  protected memo?: number;
  protected correction_reason?: string;
  protected updated_at?: Date;

  protected constructor() {
    super();
  }

  // === 1. RECHERCHES DE BASE ===

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async findByGuid(guid: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }

  protected async listAllBySession(
    session: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.session]: session }, paginationOptions);
  }

  protected async listAllByUser(
    user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.user]: user }, paginationOptions);
  }

  protected async listAllBySite(
    site: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.site]: site }, paginationOptions);
  }

  // === 2. GESTION OFFLINE/SYNC ===

  protected async findOfflineEntries(
    user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.user]: user,
        [this.db.created_offline]: true,
        [this.db.pointage_status]: PointageStatus.DRAFT,
      },
      paginationOptions,
    );
  }

  protected async findByLocalId(user: number, local_id: string): Promise<any> {
    return await this.findOne(this.db.tableName, {
      [this.db.user]: user,
      [this.db.local_id]: local_id,
    });
  }

  protected async updateSyncStatus(entry: number, attempts: number): Promise<boolean> {
    const updates = {
      [this.db.sync_attempts]: attempts,
      [this.db.last_sync_attempt]: new Date(),
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: entry,
    });
    return affectedRows > 0;
  }

  protected async markEntryAsSynced(entry: number): Promise<boolean> {
    const updates = {
      [this.db.created_offline]: false,
      [this.db.pointage_status]: PointageStatus.PENDING,
      [this.db.sync_attempts]: 0,
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: entry,
    });
    return affectedRows > 0;
  }

  // === 3. RECHERCHES PAR TYPE/STATUT ===

  protected async findByType(
    pointage_type: PointageType,
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.pointage_type]: pointage_type,
        ...conditions,
      },
      paginationOptions,
    );
  }

  protected async findByStatus(
    pointage_status: PointageStatus,
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.pointage_status]: pointage_status,
        ...conditions,
      },
      paginationOptions,
    );
  }

  protected async findPendingValidation(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.pointage_status]: PointageStatus.PENDING,
      },
      paginationOptions,
    );
  }

  // === 4. DÉTECTION ANOMALIES ===

  protected async detectDuplicateEntries(
    user: number,
    clocked_at: Date,
    tolerance_minutes: number = 15,
  ): Promise<any[]> {
    const startTime = new Date(clocked_at);
    startTime.setMinutes(startTime.getMinutes() - tolerance_minutes);

    const endTime = new Date(clocked_at);
    endTime.setMinutes(endTime.getMinutes() + tolerance_minutes);

    return await this.findAll(this.db.tableName, {
      [this.db.user]: user,
      [this.db.clocked_at]: {
        [Op.between]: [startTime, endTime],
      },
      [this.db.pointage_status]: {
        [Op.ne]: PointageStatus.REJECTED,
      },
    });
  }

  protected async detectSpeedAnomalies(
    entry: number,
    max_speed_kmh: number = 80,
  ): Promise<{
    has_anomaly: boolean;
    previous_entry?: any;
    current_entry?: any;
    calculated_speed?: number;
    distance_km?: number;
    time_diff_minutes?: number;
  }> {
    const currentEntry = await this.find(entry);
    if (!currentEntry) {
      return { has_anomaly: false };
    }

    // Trouver le pointage précédent du même utilisateur
    const previousEntries = await this.findAll(
      this.db.tableName,
      {
        [this.db.user]: currentEntry.user,
        [this.db.clocked_at]: {
          [Op.lt]: currentEntry.clocked_at,
        },
        [this.db.pointage_status]: {
          [Op.ne]: PointageStatus.REJECTED,
        },
      },
      { limit: 1 },
    );

    if (!previousEntries || previousEntries.length === 0) {
      return { has_anomaly: false };
    }

    const previousEntry = previousEntries[0];

    // Calculer distance (formule Haversine simplifiée)
    const distance_km = this.calculateDistance(
      previousEntry.latitude,
      previousEntry.longitude,
      currentEntry.latitude,
      currentEntry.longitude,
    );

    // Calculer temps écoulé
    const time_diff_ms =
      new Date(currentEntry.clocked_at).getTime() - new Date(previousEntry.clocked_at).getTime();
    const time_diff_minutes = time_diff_ms / (1000 * 60);
    const time_diff_hours = time_diff_minutes / 60;

    // Calculer vitesse
    const calculated_speed = time_diff_hours > 0 ? distance_km / time_diff_hours : 0;

    return {
      has_anomaly: calculated_speed > max_speed_kmh,
      previous_entry: previousEntry,
      current_entry: currentEntry,
      calculated_speed,
      distance_km,
      time_diff_minutes,
    };
  }

  protected async detectGeofencingViolations(entry: number): Promise<{
    violation: boolean;
    distance_from_center?: number;
    site_radius?: number;
  }> {
    const entryData = await this.find(entry);
    if (!entryData || !entryData.site) {
      return { violation: false };
    }

    // TODO: Récupérer les données du site via relation
    // Pour l'instant, retour structure basique
    return {
      violation: false,
      distance_from_center: 0,
      site_radius: 0,
    };
  }

  protected async findSuspiciousPatterns(user: number, days: number = 7): Promise<any[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    const entries = await this.findAll(this.db.tableName, {
      [this.db.user]: user,
      [this.db.server_received_at]: {
        [Op.gte]: thresholdDate,
      },
    });

    const suspiciousEntries: any[] = [];

    for (let i = 0; i < entries.length; i++) {
      const speedCheck = await this.detectSpeedAnomalies(entries[i].id);
      if (speedCheck.has_anomaly) {
        suspiciousEntries.push({
          entry: entries[i],
          anomaly_type: 'impossible_speed',
          details: speedCheck,
        });
      }
    }

    return suspiciousEntries;
  }

  // === 5. VALIDATION MÉTIER ===

  protected async validateSequence(session: number, pointage_type: PointageType): Promise<boolean> {
    const sessionEntries = await this.listAllBySession(session);

    // Règles de séquence
    const rules = {
      [PointageType.CLOCK_IN]: () => sessionEntries.length === 0, // Premier pointage
      [PointageType.PAUSE_START]: () => {
        const lastEntry = sessionEntries[sessionEntries.length - 1];
        return (
          lastEntry &&
          (lastEntry.pointage_type === PointageType.CLOCK_IN ||
            lastEntry.pointage_type === PointageType.PAUSE_END)
        );
      },
      [PointageType.PAUSE_END]: () => {
        const lastEntry = sessionEntries[sessionEntries.length - 1];
        return lastEntry && lastEntry.pointage_type === PointageType.PAUSE_START;
      },
      [PointageType.CLOCK_OUT]: () => {
        const lastEntry = sessionEntries[sessionEntries.length - 1];
        return (
          lastEntry &&
          (lastEntry.pointage_type === PointageType.CLOCK_IN ||
            lastEntry.pointage_type === PointageType.PAUSE_END ||
            lastEntry.pointage_type === PointageType.EXTERNAL_MISSION)
        );
      },
      [PointageType.EXTERNAL_MISSION]: () => {
        const lastEntry = sessionEntries[sessionEntries.length - 1];
        return (
          lastEntry &&
          (lastEntry.pointage_type === PointageType.CLOCK_IN ||
            lastEntry.pointage_type === PointageType.PAUSE_END)
        );
      },
    };

    return rules[pointage_type] ? rules[pointage_type]() : false;
  }

  protected async canClockOut(session: number): Promise<boolean> {
    const sessionEntries = await this.listAllBySession(session);
    if (!sessionEntries || sessionEntries.length === 0) {
      return false;
    }

    const lastEntry = sessionEntries[sessionEntries.length - 1];

    // Impossible de clock-out si la dernière action est un début de pause
    if (lastEntry.pointage_type === PointageType.PAUSE_START) {
      return false;
    }

    return true;
  }

  protected async validateTimeLogic(clocked_at: Date, session_start: Date): Promise<boolean> {
    return clocked_at >= session_start && clocked_at <= new Date();
  }

  // === 6. CORRECTIONS & AUDIT ===

  protected async applyCorrection(
    entry: number,
    corrections: Record<string, any>,
    corrected_by: number,
  ): Promise<boolean> {
    const updates: Record<string, any> = {
      [this.db.pointage_status]: PointageStatus.CORRECTED,
      ...corrections,
    };

    if (corrections.clocked_at) {
      updates[this.db.real_clocked_at] = corrections.clocked_at;
    }

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: entry,
    });

    // TODO: Créer audit log via fonction dédiée
    return affectedRows > 0;
  }

  protected async rejectEntry(entry: number, reason: string): Promise<boolean> {
    const updates = {
      [this.db.pointage_status]: PointageStatus.REJECTED,
      [this.db.correction_reason]: reason,
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: entry,
    });
    return affectedRows > 0;
  }

  protected async getAuditTrail(entry: number): Promise<any[]> {
    // TODO: Implémenter via table audit_logs
    return [];
  }

  // === 7. STATISTIQUES & RAPPORTS ===

  protected async countByType(
    conditions: Record<string, any> = {},
  ): Promise<Record<string, number>> {
    return await this.countByGroup(this.db.tableName, this.db.pointage_type, conditions);
  }

  protected async countByStatus(
    conditions: Record<string, any> = {},
  ): Promise<Record<string, number>> {
    return await this.countByGroup(this.db.tableName, this.db.pointage_status, conditions);
  }

  protected async getEntriesStatistics(filters: Record<string, any> = {}): Promise<any> {
    const [totalEntries, offlineEntries, pendingEntries, typeCount, statusCount] =
      await Promise.all([
        this.count(this.db.tableName, filters),
        this.count(this.db.tableName, { ...filters, [this.db.created_offline]: true }),
        this.count(this.db.tableName, {
          ...filters,
          [this.db.pointage_status]: PointageStatus.PENDING,
        }),
        this.countByType(filters),
        this.countByStatus(filters),
      ]);

    return {
      total_entries: totalEntries,
      offline_entries: offlineEntries,
      pending_validation: pendingEntries,
      by_type: typeCount,
      by_status: statusCount,
    };
  }

  protected async getUserDailyEntries(user: number, date: Date): Promise<any[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.findAll(this.db.tableName, {
      [this.db.user]: user,
      [this.db.clocked_at]: {
        [Op.between]: [startOfDay, endOfDay],
      },
    });
  }

  // === 8. BATCH PROCESSING ===

  protected async processBatchSync(
    user: number,
    entries_array: any[],
  ): Promise<{
    processed: number;
    success: number;
    errors: number;
    conflicts: number;
    results: any[];
  }> {
    const results: any[] = [];
    let success = 0;
    let errors = 0;
    let conflicts = 0;

    for (const entryData of entries_array) {
      try {
        // Vérifier si existe déjà (conflit)
        const existing = await this.findByLocalId(user, entryData.local_id);

        if (existing) {
          conflicts++;
          results.push({
            local_id: entryData.local_id,
            status: 'conflict',
            message: 'Entry already exists',
            existing_id: existing.id,
          });
          continue;
        }

        // Créer l'entrée
        const newEntry = await this.insertOne(this.db.tableName, {
          ...entryData,
          [this.db.user]: user,
          [this.db.created_offline]: true,
        });

        success++;
        results.push({
          local_id: entryData.local_id,
          status: 'success',
          entry_id: newEntry.id,
        });
      } catch (error: any) {
        errors++;
        results.push({
          local_id: entryData.local_id,
          status: 'error',
          message: error.message,
        });
      }
    }

    return {
      processed: entries_array.length,
      success,
      errors,
      conflicts,
      results,
    };
  }

  protected async bulkUpdateStatus(
    entry_ids: number[],
    new_status: PointageStatus,
  ): Promise<number> {
    const updates = {
      [this.db.pointage_status]: new_status,
    };

    let totalUpdated = 0;

    for (const id of entry_ids) {
      const affectedRows = await this.updateOne(this.db.tableName, updates, {
        [this.db.id]: id,
      });
      totalUpdated += affectedRows;
    }

    return totalUpdated;
  }

  // === 9. CRUD OPERATIONS ===

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(TIME_ENTRIES_ERRORS?.GUID_GENERATION_FAILED);
    }

    const now = new Date();
    const nowInDouala = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Douala' }));

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.session]: this.session,
      [this.db.user]: this.user,
      [this.db.site]: this.site,
      [this.db.pointage_type]: this.pointage_type,
      [this.db.pointage_status]: this.pointage_status || PointageStatus.PENDING,
      [this.db.clocked_at]: this.clocked_at,
      [this.db.real_clocked_at]: this.real_clocked_at,
      [this.db.server_received_at]: nowInDouala,
      [this.db.latitude]: this.latitude,
      [this.db.longitude]: this.longitude,
      [this.db.gps_accuracy]: this.gps_accuracy,
      [this.db.device_info]: this.device_info,
      [this.db.ip_address]: this.ip_address,
      [this.db.user_agent]: this.user_agent,
      [this.db.created_offline]: this.created_offline || false,
      [this.db.local_id]: this.local_id,
      [this.db.sync_attempts]: this.sync_attempts || 0,
      [this.db.last_sync_attempt]: this.last_sync_attempt,
      [this.db.memo]: this.memo,
      [this.db.correction_reason]: this.correction_reason,
    });

    if (!lastID) {
      throw new Error(TIME_ENTRIES_ERRORS?.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    await this.validate();
    if (!this.id) {
      throw new Error(TIME_ENTRIES_ERRORS?.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};

    if (this.pointage_status !== undefined)
      updateData[this.db.pointage_status] = this.pointage_status;
    if (this.real_clocked_at !== undefined)
      updateData[this.db.real_clocked_at] = this.real_clocked_at;
    if (this.sync_attempts !== undefined) updateData[this.db.sync_attempts] = this.sync_attempts;
    if (this.last_sync_attempt !== undefined)
      updateData[this.db.last_sync_attempt] = this.last_sync_attempt;
    if (this.memo !== undefined) updateData[this.db.memo] = this.memo;
    if (this.correction_reason !== undefined)
      updateData[this.db.correction_reason] = this.correction_reason;

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(TIME_ENTRIES_ERRORS?.UPDATE_FAILED || 'Time entry update failed');
    }
  }

  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  // === VALIDATION ===

  private async validate(): Promise<void> {
    // Validation champs obligatoires
    if (!this.session) {
      throw new Error(TIME_ENTRIES_ERRORS.SESSION_REQUIRED);
    }
    if (!TimeEntriesValidationUtils.validateSessionId(this.session)) {
      throw new Error(TIME_ENTRIES_ERRORS.SESSION_INVALID);
    }

    if (!this.user) {
      throw new Error(TIME_ENTRIES_ERRORS.USER_REQUIRED);
    }
    // if (!TimeEntriesValidationUtils.validateUserId(this.user)) {
    //   throw new Error(TIME_ENTRIES_ERRORS.USER_INVALID);
    // }

    if (!this.site) {
      throw new Error(TIME_ENTRIES_ERRORS?.SITE_REQUIRED);
    }
    // if (!TimeEntriesValidationUtils.validateSiteId(this.site)) {
    //   throw new Error(TIME_ENTRIES_ERRORS.SITE_INVALID);
    // }

    if (!this.pointage_type) {
      throw new Error(TIME_ENTRIES_ERRORS?.POINTAGE_TYPE_REQUIRED);
    }
    if (!TimeEntriesValidationUtils.validatePointageType(this.pointage_type)) {
      throw new Error(TIME_ENTRIES_ERRORS.POINTAGE_TYPE_INVALID);
    }

    if (
      this.pointage_status &&
      !TimeEntriesValidationUtils.validatePointageStatus(this.pointage_status)
    ) {
      throw new Error(TIME_ENTRIES_ERRORS.POINTAGE_STATUS_INVALID);
    }

    if (!this.clocked_at) {
      throw new Error(TIME_ENTRIES_ERRORS.CLOCKED_AT_REQUIRED);
    }
    if (!TimeEntriesValidationUtils.validateClockedAt(this.clocked_at)) {
      throw new Error(TIME_ENTRIES_ERRORS.CLOCKED_AT_INVALID);
    }

    if (
      this.real_clocked_at &&
      !TimeEntriesValidationUtils.validateRealClockedAt(this.real_clocked_at)
    ) {
      throw new Error(TIME_ENTRIES_ERRORS.REAL_CLOCKED_AT_INVALID);
    }

    // Validation GPS
    if (!this.latitude) {
      throw new Error(TIME_ENTRIES_ERRORS.LATITUDE_REQUIRED);
    }
    if (!TimeEntriesValidationUtils.validateLatitude(this.latitude)) {
      throw new Error(TIME_ENTRIES_ERRORS.LATITUDE_INVALID);
    }

    if (!this.longitude) {
      throw new Error(TIME_ENTRIES_ERRORS.LONGITUDE_REQUIRED);
    }
    if (!TimeEntriesValidationUtils.validateLongitude(this.longitude)) {
      throw new Error(TIME_ENTRIES_ERRORS.LONGITUDE_INVALID);
    }

    if (this.gps_accuracy && !TimeEntriesValidationUtils.validateGpsAccuracy(this.gps_accuracy)) {
      throw new Error(TIME_ENTRIES_ERRORS.GPS_ACCURACY_INVALID);
    }

    // Validation device info
    if (this.device_info && !TimeEntriesValidationUtils.validateDeviceInfo(this.device_info)) {
      throw new Error(TIME_ENTRIES_ERRORS.DEVICE_INFO_INVALID);
    }

    // Validation IP
    if (this.ip_address && !TimeEntriesValidationUtils.validateIpAddress(this.ip_address)) {
      throw new Error(TIME_ENTRIES_ERRORS.IP_ADDRESS_INVALID);
    }

    // Validation offline fields
    if (this.local_id && !TimeEntriesValidationUtils.validateLocalId(this.local_id)) {
      throw new Error(TIME_ENTRIES_ERRORS.LOCAL_ID_INVALID);
    }

    if (
      this.sync_attempts !== undefined &&
      !TimeEntriesValidationUtils.validateSyncAttempts(this.sync_attempts)
    ) {
      throw new Error(TIME_ENTRIES_ERRORS.SYNC_ATTEMPTS_INVALID);
    }

    if (this.memo && !TimeEntriesValidationUtils.validateMemoId(this.memo)) {
      throw new Error(TIME_ENTRIES_ERRORS.MEMO_INVALID);
    }

    if (
      this.correction_reason &&
      !TimeEntriesValidationUtils.validateCorrectionReason(this.correction_reason)
    ) {
      throw new Error(TIME_ENTRIES_ERRORS.CORRECTION_REASON_INVALID);
    }

    // Nettoyage données
    const cleaned = TimeEntriesValidationUtils.cleanTimeEntryData(this);
    Object.assign(this, cleaned);
  }

  // === UTILITAIRES ===

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
