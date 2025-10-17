import { PointageStatus, PointageType } from '@toke/shared';

import TimeEntriesModel from '../model/TimeEntriesModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import { responseStructure as RS, responseValue, ViewMode } from '../../utils/response.model.js';

import User from './User.js';
import Site from './Site.js';
import WorkSessions from './WorkSessions.js';
import Memos from './Memos.js';

export default class TimeEntries extends TimeEntriesModel {
  private userObj?: User;
  private siteObj?: Site;
  private sessionObj?: WorkSessions;
  private memoObj?: Memos;

  constructor() {
    super();
  }

  // === MÉTHODES STATIQUES DE CHARGEMENT ===

  static _load(identifier: any, byGuid: boolean = false): Promise<TimeEntries | null> {
    return new TimeEntries().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<TimeEntries[] | null> {
    return new TimeEntries().list(conditions, paginationOptions);
  }

  static _listBySession(
    session: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<TimeEntries[] | null> {
    return new TimeEntries().listBySession(session, paginationOptions);
  }

  static _listByUser(
    user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<TimeEntries[] | null> {
    return new TimeEntries().listByUser(user, paginationOptions);
  }

  static _listBySite(
    site: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<TimeEntries[] | null> {
    return new TimeEntries().listBySite(site, paginationOptions);
  }

  static _findPendingValidation(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<TimeEntries[] | null> {
    return new TimeEntries().findAllPendingValidation(paginationOptions);
  }

  static _findOfflineEntries(
    user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<TimeEntries[] | null> {
    return new TimeEntries().findOffline(user, paginationOptions);
  }

  static async exportable(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    items: any[];
  }> {
    let items: any[] = [];
    const entries = await this._list(conditions, paginationOptions);
    if (entries) {
      items = await Promise.all(entries.map(async (entry) => await entry.toJSON()));
    }
    return {
      revision: '',
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
  }

  static async getEntriesStatistics(filters: Record<string, any> = {}): Promise<any> {
    return new TimeEntries().getStatistics(filters);
  }

  static async processBatchSynchronization(
    user_id: number,
    entries_data: any[],
  ): Promise<{
    processed: number;
    success: number;
    errors: number;
    conflicts: number;
    results: any[];
  }> {
    return new TimeEntries().batchSync(user_id, entries_data);
  }

  static async detectUserAnomalies(user: number, days: number = 7): Promise<any[]> {
    return new TimeEntries().detectAnomalies();
  }

  // === GETTERS FLUENT ===

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getSession(): number | undefined {
    return this.session;
  }

  async getSessionObj(): Promise<WorkSessions | null> {
    if (!this.session) return null;
    if (!this.sessionObj) {
      this.sessionObj = (await WorkSessions._load(this.session)) || undefined;
    }
    return this.sessionObj || null;
  }

  getUser(): number | undefined {
    return this.user;
  }

  async getUserObj(): Promise<User | null> {
    if (!this.user) return null;
    if (!this.userObj) {
      this.userObj = (await User._load(this.user)) || undefined;
    }
    return this.userObj || null;
  }

  getSite(): number | undefined {
    return this.site;
  }

  async getSiteObj(): Promise<Site | null> {
    if (!this.site) return null;
    if (!this.siteObj) {
      this.siteObj = (await Site._load(this.site)) || undefined;
    }
    return this.siteObj || null;
  }

  getPointageType(): PointageType | undefined {
    return this.pointage_type;
  }

  getPointageStatus(): PointageStatus | undefined {
    return this.pointage_status;
  }

  getClockedAt(): Date | undefined {
    return this.clocked_at;
  }

  getRealClockedAt(): Date | undefined {
    return this.real_clocked_at;
  }

  getServerReceivedAt(): Date | undefined {
    return this.server_received_at;
  }

  getLatitude(): number | undefined {
    return this.latitude;
  }

  getLongitude(): number | undefined {
    return this.longitude;
  }

  getGpsAccuracy(): number | undefined {
    return this.gps_accuracy;
  }

  getDeviceInfo(): Record<string, any> | undefined {
    return this.device_info;
  }

  getIpAddress(): string | undefined {
    return this.ip_address;
  }

  getUserAgent(): string | undefined {
    return this.user_agent;
  }

  isOffline(): boolean {
    return this.created_offline || false;
  }

  getLocalId(): string | undefined {
    return this.local_id;
  }

  getSyncAttempts(): number {
    return this.sync_attempts || 0;
  }

  getLastSyncAttempt(): Date | undefined {
    return this.last_sync_attempt;
  }

  getMemo(): number | undefined {
    return this.memo;
  }

  async getMemoObj(): Promise<Memos | null> {
    if (!this.memo) return null;
    if (!this.memoObj) {
      this.memoObj = (await Memos._load(this.memo)) || undefined;
    }
    return this.memoObj || null;
  }

  getCorrectionReason(): string | undefined {
    return this.correction_reason;
  }

  getUpdatedAt(): Date | undefined {
    return this.updated_at;
  }

  // === SETTERS FLUENT ===

  setSession(session: number): TimeEntries {
    this.session = session;
    return this;
  }

  setUser(user: number): TimeEntries {
    this.user = user;
    return this;
  }

  setSite(site: number): TimeEntries {
    this.site = site;
    return this;
  }

  setPointageType(type: PointageType): TimeEntries {
    this.pointage_type = type;
    return this;
  }

  setPointageStatus(status: PointageStatus): TimeEntries {
    this.pointage_status = status;
    return this;
  }

  setClockedAt(datetime: Date): TimeEntries {
    this.clocked_at = datetime;
    return this;
  }

  setRealClockedAt(datetime: Date): TimeEntries {
    this.real_clocked_at = datetime;
    return this;
  }

  setCoordinates(latitude: number, longitude: number): TimeEntries {
    this.latitude = latitude;
    this.longitude = longitude;
    return this;
  }

  setGpsAccuracy(accuracy: number): TimeEntries {
    this.gps_accuracy = accuracy;
    return this;
  }

  setDeviceInfo(info: Record<string, any>): TimeEntries {
    this.device_info = info;
    return this;
  }

  setIpAddress(ip: string): TimeEntries {
    this.ip_address = ip;
    return this;
  }

  setUserAgent(agent: string): TimeEntries {
    this.user_agent = agent;
    return this;
  }

  setOfflineData(local_id: string): TimeEntries {
    this.created_offline = true;
    this.local_id = local_id;
    return this;
  }

  setMemo(memo: number): TimeEntries {
    this.memo = memo;
    return this;
  }

  setCorrectionReason(reason: string): TimeEntries {
    this.correction_reason = reason;
    return this;
  }

  // === VALIDATION MÉTIER ===

  async isValid(): Promise<boolean> {
    try {
      // Vérifier séquence
      if (this.session && this.pointage_type) {
        const sequenceValid = await this.validateSequence(this.session, this.pointage_type);
        if (!sequenceValid) return false;
      }

      // Vérifier géofencing
      const geofenceCheck = await this.isWithinGeofence();
      if (!geofenceCheck) return false;

      // Vérifier doublons
      const hasDuplicate = await this.hasDuplicate();
      if (hasDuplicate) return false;

      return true;
    } catch {
      return false;
    }
  }

  async canBeAccepted(): Promise<boolean> {
    const isValid = await this.isValid();
    if (!isValid) return false;

    // Vérifier anomalies
    const hasAnomalies = await this.hasAnomalies();
    if (hasAnomalies) return false;

    return true;
  }

  async requiresManagerValidation(): Promise<boolean> {
    // Pointages offline nécessitent validation
    if (this.isOffline()) return true;

    // Corrections nécessitent validation
    if (this.pointage_status === PointageStatus.CORRECTED) return true;

    // Anomalies détectées
    const hasAnomalies = await this.hasAnomalies();
    if (hasAnomalies) return true;

    return false;
  }

  async isWithinGeofence(): Promise<boolean> {
    if (!this.id) return true; // Pas encore créé

    const result = await this.detectGeofencingViolations(this.id);
    return !result.violation;
  }

  async isSequenceValid(): Promise<boolean> {
    if (!this.session || !this.pointage_type) return false;
    return await this.validateSequence(this.session, this.pointage_type);
  }

  // === GESTION STATUTS ===

  async accept(): Promise<void> {
    this.pointage_status = PointageStatus.ACCEPTED;
    await this.save();
  }

  async reject(reason: string): Promise<void> {
    if (!this.id) {
      throw new Error('Cannot reject unsaved entry');
    }

    const success = await this.rejectEntry(this.id, reason);
    if (!success) {
      throw new Error('Failed to reject entry');
    }

    // Recharger pour refléter changements
    await this.load(this.id);
  }

  async markForCorrection(reason: string): Promise<void> {
    this.pointage_status = PointageStatus.CORRECTED;
    this.correction_reason = reason;
    await this.save();
  }

  async approve(manager_id: number): Promise<void> {
    if (!this.id) {
      throw new Error('Cannot approve unsaved entry');
    }

    await this.applyCorrection(this.id, { pointage_status: PointageStatus.ACCEPTED }, manager_id);
    await this.load(this.id);
  }

  async markAsAccounted(): Promise<void> {
    this.pointage_status = PointageStatus.ACCOUNTED;
    await this.save();
  }

  // === OFFLINE/SYNC ===

  markAsOffline(local_id: string): TimeEntries {
    this.created_offline = true;
    this.local_id = local_id;
    this.pointage_status = PointageStatus.DRAFT;
    return this;
  }

  async incrementSyncAttempts(): Promise<void> {
    if (!this.id) return;

    const attempts = this.getSyncAttempts() + 1;
    await this.updateSyncStatus(this.id, attempts);
    this.sync_attempts = attempts;
    this.last_sync_attempt = new Date();
  }

  async markAsSynced(): Promise<void> {
    if (!this.id) {
      throw new Error('Cannot mark unsaved entry as synced');
    }

    const success = await this.markEntryAsSynced(this.id);
    if (success) {
      this.created_offline = false;
      this.pointage_status = PointageStatus.PENDING;
      this.sync_attempts = 0;
    }
  }

  getConflictResolution(): 'server_wins' | 'client_wins' | 'manual_review' {
    // Stratégie: serveur prime toujours sauf si offline récent
    if (this.created_offline && this.getSyncAttempts() === 0) {
      return 'client_wins';
    }

    if (this.pointage_status === PointageStatus.CORRECTED) {
      return 'server_wins';
    }

    return 'manual_review';
  }

  // === ANTI-FRAUDE ===

  async detectAnomalies(): Promise<any[]> {
    const anomalies: any[] = [];

    if (!this.id) return anomalies;

    // Vérifier vitesse
    const speedCheck = await this.detectSpeedAnomalies(this.id);
    if (speedCheck.has_anomaly) {
      anomalies.push({
        type: 'impossible_speed',
        severity: 'high',
        details: speedCheck,
      });
    }

    // Vérifier géofencing
    const geofenceCheck = await this.detectGeofencingViolations(this.id);
    if (geofenceCheck.violation) {
      anomalies.push({
        type: 'geofencing_violation',
        severity: 'medium',
        details: geofenceCheck,
      });
    }

    // Vérifier doublons
    const hasDup = await this.hasDuplicate();
    if (hasDup) {
      anomalies.push({
        type: 'duplicate_entry',
        severity: 'medium',
      });
    }

    return anomalies;
  }

  async hasDuplicate(): Promise<boolean> {
    if (!this.user || !this.clocked_at) return false;

    const duplicates = await this.detectDuplicateEntries(this.user, this.clocked_at, 15);
    return duplicates.length > 1; // Plus que l'entry courante
  }

  async isSpeedAnomaly(): Promise<boolean> {
    if (!this.id) return false;

    const check = await this.detectSpeedAnomalies(this.id);
    return check.has_anomaly;
  }

  isMockLocation(): boolean {
    if (!this.device_info) return false;
    return this.device_info.mock_location_detected === true;
  }

  async getFraudScore(): Promise<number> {
    let score = 0;

    // Mock location
    if (this.isMockLocation()) score += 40;

    // Vitesse impossible
    const speedAnomaly = await this.isSpeedAnomaly();
    if (speedAnomaly) score += 30;

    // Doublon
    const duplicate = await this.hasDuplicate();
    if (duplicate) score += 20;

    // Géofencing
    const withinGeofence = await this.isWithinGeofence();
    if (!withinGeofence) score += 10;

    return Math.min(score, 100);
  }

  async hasAnomalies(): Promise<boolean> {
    const anomalies = await this.detectAnomalies();
    return anomalies.length > 0;
  }

  // === CORRECTIONS & AUDIT ===

  async applyManagerCorrection(
    corrections: Record<string, any>,
    manager_id: number,
  ): Promise<void> {
    if (!this.id) {
      throw new Error('Cannot correct unsaved entry');
    }

    const success = await this.applyCorrection(this.id, corrections, manager_id);
    if (!success) {
      throw new Error('Failed to apply corrections');
    }

    // Recharger
    await this.load(this.id);
  }

  getOriginalValues(): any {
    return {
      clocked_at: this.clocked_at,
      real_clocked_at: this.real_clocked_at,
      pointage_type: this.pointage_type,
      pointage_status: this.pointage_status,
    };
  }

  async getCorrectionHistory(): Promise<any[]> {
    if (!this.id) return [];
    return await this.getAuditTrail(this.id);
  }

  async notifyUserCorrection(): Promise<void> {
    // TODO: Implémenter notification push/email
    console.log(`Notification correction envoyée à user ${this.user}`);
  }

  // === REPORTING ===

  toExportFormat(): any {
    return {
      entry_guid: this.guid,
      session_id: this.session,
      user_id: this.user,
      site_id: this.site,
      pointage_type: this.pointage_type,
      pointage_status: this.pointage_status,
      clocked_at: this.clocked_at?.toISOString(),
      real_clocked_at: this.real_clocked_at?.toISOString(),
      latitude: this.latitude,
      longitude: this.longitude,
      gps_accuracy: this.gps_accuracy,
      created_offline: this.created_offline,
      sync_attempts: this.sync_attempts,
      correction_reason: this.correction_reason,
      server_received_at: this.server_received_at?.toISOString(),
    };
  }

  getEntryDetails(): any {
    return {
      guid: this.guid,
      type: this.pointage_type,
      status: this.pointage_status,
      clocked_at: this.clocked_at,
      coordinates: `${this.latitude},${this.longitude}`,
      gps_accuracy: this.gps_accuracy,
      is_offline: this.isOffline(),
      device_info: this.device_info,
      sync_attempts: this.getSyncAttempts(),
    };
  }

  toAuditLog(): any {
    return {
      entry_id: this.id,
      entry_guid: this.guid,
      user_id: this.user,
      action_type: this.pointage_type,
      timestamp: this.clocked_at,
      location: {
        latitude: this.latitude,
        longitude: this.longitude,
        accuracy: this.gps_accuracy,
      },
      device: this.device_info,
      ip_address: this.ip_address,
      status: this.pointage_status,
      corrections: this.correction_reason,
    };
  }

  // === HELPERS MÉTIER ===

  async calculateTimeSincePrevious(): Promise<number | null> {
    if (!this.user || !this.clocked_at) return null;

    const userEntries = await this.listAllByUser(this.user);
    const sortedEntries = userEntries
      .filter((e) => new Date(e.clocked_at) < this.clocked_at!)
      .sort((a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime());

    if (sortedEntries.length === 0) return null;

    const previousEntry = sortedEntries[0];
    const timeDiff = this.clocked_at!.getTime() - new Date(previousEntry.clocked_at).getTime();
    return Math.floor(timeDiff / (1000 * 60)); // Minutes
  }

  async getDistanceFromSite(): Promise<number | null> {
    const site = await this.getSiteObj();
    if (!site || !this.latitude || !this.longitude) return null;

    // TODO: Calculer distance via coordonnées centre site
    return 0;
  }

  isWithinWorkingHours(): boolean {
    if (!this.clocked_at) return false;

    const hour = this.clocked_at.getHours();
    return hour >= 6 && hour <= 22; // 6h-22h
  }

  async needsMemoJustification(): Promise<boolean> {
    // Retard > 15min
    const sessionObj = await this.getSessionObj();
    if (sessionObj && this.pointage_type === PointageType.CLOCK_IN) {
      const sessionStart = sessionObj.getSessionStartAt();
      if (sessionStart && this.clocked_at) {
        const delay = (this.clocked_at.getTime() - sessionStart.getTime()) / (1000 * 60);
        if (delay > 15) return true;
      }
    }

    // Anomalies détectées
    const hasAnomalies = await this.hasAnomalies();
    if (hasAnomalies) return true;

    return false;
  }

  // === GESTION CYCLE DE VIE ===

  isNew(): boolean {
    return this.id === undefined;
  }

  isDirty(): boolean {
    // TODO: Implémenter tracking changements
    return false;
  }

  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      throw new Error(error.message || error);
    }
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: TimeEntry Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  // === MÉTHODES DE BASE ===

  async load(identifier: any, byGuid: boolean = false): Promise<TimeEntries | null> {
    let data = null;

    if (byGuid) {
      data = await this.findByGuid(identifier);
    } else {
      data = await this.find(Number(identifier));
    }

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<TimeEntries[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new TimeEntries().hydrate(data));
  }

  async listBySession(
    session: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<TimeEntries[] | null> {
    const dataset = await this.listAllBySession(session, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new TimeEntries().hydrate(data));
  }

  async listByUser(
    user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<TimeEntries[] | null> {
    const dataset = await this.listAllByUser(user, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new TimeEntries().hydrate(data));
  }

  async listBySite(
    site: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<TimeEntries[] | null> {
    const dataset = await this.listAllBySite(site, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new TimeEntries().hydrate(data));
  }

  async findAllPendingValidation(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<TimeEntries[] | null> {
    const dataset = await this.findPendingValidation(paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new TimeEntries().hydrate(data));
  }

  async findOffline(
    user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<TimeEntries[] | null> {
    const dataset = await this.findOfflineEntries(user, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new TimeEntries().hydrate(data));
  }

  async batchSync(user: number, entries_data: any[]): Promise<any> {
    return await this.processBatchSync(user, entries_data);
  }

  // async detectAnomalies(user_id: number, days: number): Promise<any[]> {
  //   return await this.findSuspiciousPatterns(user_id, days);
  // }

  async getStatistics(filters: Record<string, any> = {}): Promise<any> {
    return await this.getEntriesStatistics(filters);
  }
  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const user = await this.getUserObj();
    const site = await this.getSiteObj();
    const session = await this.getSessionObj();

    const memo = await this.getMemoObj();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.POINTAGE_TYPE]: this.pointage_type,
      [RS.POINTAGE_STATUS]: this.pointage_status,
      [RS.CLOCKED_AT]: this.clocked_at,
      [RS.SERVER_RECEIVED_AT]: this.server_received_at,
      [RS.REAL_CLOCKED_AT]: this.real_clocked_at,
      [RS.CREATED_OFFLINE]: this.created_offline,
      [RS.COORDINATES]:
        this.latitude && this.longitude ? `${this.latitude},${this.longitude}` : null,
      [RS.GPS_ACCURACY]: this.gps_accuracy,

      // [RS.MEMO]: this.memo,
      [RS.CORRECTION_REASON]: this.correction_reason,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.USER]: user?.getGuid(),
        [RS.SITE]: site?.getGuid(),
        [RS.SESSION]: session?.getGuid(),
        [RS.MEMO]: memo?.getGuid(),
      };
    }

    return {
      ...baseData,
      [RS.USER]: user ? user.toJSON() : null,
      [RS.SITE]: site ? await site.toJSON(responseValue.MINIMAL) : null,
      [RS.SESSION]: session ? await session.toJSON(responseValue.MINIMAL) : null,
      [RS.MEMO]: memo ? await memo.toJSON(responseValue.MINIMAL) : null,
      [RS.DEVICE_INFO]: this.device_info,
      [RS.IP_ADDRESS]: this.ip_address,
      [RS.USER_AGENT]: this.user_agent,
      [RS.LOCAL_ID]: this.local_id,
      [RS.SYNC_ATTEMPTS]: this.sync_attempts,
      [RS.LAST_SYNC_ATTEMPT]: this.last_sync_attempt,
      [RS.UPDATED_AT]: this.updated_at,

      // [RS.REAL_CLOCKED_AT]: this.real_clocked_at,
      // [RS.LATITUDE]: this.latitude,
      // [RS.LONGITUDE]: this.longitude,
      // [RS.GPS_ACCURACY]: this.gps_accuracy,
      // [RS.MEMO]: this.memo,
      // [RS.CORRECTION_REASON]: this.correction_reason,
      // Informations calculées
      [RS.IS_VALID]: await this.isValid(),
      [RS.REQUIRES_VALIDATION]: await this.requiresManagerValidation(),
      [RS.WITHIN_GEOFENCE]: await this.isWithinGeofence(),
      [RS.HAS_ANOMALIES]: await this.hasAnomalies(),
      [RS.FRAUD_SCORE]: await this.getFraudScore(),
    };
  }

  // async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
  //   const user = await this.getUserObj();
  //   const site = await this.getSiteObj();
  //   const session = await this.getSessionObj();
  //
  //   const baseData = {
  //     [RS.GUID]: this.guid,
  //     [RS.USER]: user?.getGuid(),
  //     [RS.SITE]: site?.getGuid(),
  //     [RS.SESSION]: session?.getGuid(),
  //     [RS.POINTAGE_TYPE]: this.pointage_type,
  //     [RS.POINTAGE_STATUS]: this.pointage_status,
  //     [RS.CLOCKED_AT]: this.clocked_at,
  //     [RS.SERVER_RECEIVED_AT]: this.server_received_at,
  //     [RS.CREATED_OFFLINE]: this.created_offline,
  //   };
  //
  //   if (view === responseValue.MINIMAL) {
  //     return {
  //       ...baseData,
  //       [RS.COORDINATES]:
  //         this.latitude && this.longitude ? `${this.latitude},${this.longitude}` : null,
  //     };
  //   }
  //
  //   return {
  //     ...baseData,
  //     [RS.USER]: user ? user.toJSON() : null,
  //     [RS.SITE]: site ? await site.toJSON(responseValue.MINIMAL) : null,
  //     [RS.SESSION]: session ? await session.toJSON(responseValue.MINIMAL) : null,
  //     [RS.REAL_CLOCKED_AT]: this.real_clocked_at,
  //     [RS.LATITUDE]: this.latitude,
  //     [RS.LONGITUDE]: this.longitude,
  //     [RS.GPS_ACCURACY]: this.gps_accuracy,
  //     [RS.DEVICE_INFO]: this.device_info,
  //     [RS.IP_ADDRESS]: this.ip_address,
  //     [RS.USER_AGENT]: this.user_agent,
  //     [RS.LOCAL_ID]: this.local_id,
  //     [RS.SYNC_ATTEMPTS]: this.sync_attempts,
  //     [RS.LAST_SYNC_ATTEMPT]: this.last_sync_attempt,
  //     [RS.MEMO]: this.memo,
  //     [RS.CORRECTION_REASON]: this.correction_reason,
  //     [RS.UPDATED_AT]: this.updated_at,
  //     // Informations calculées
  //     [RS.IS_VALID]: await this.isValid(),
  //     [RS.REQUIRES_VALIDATION]: await this.requiresManagerValidation(),
  //     [RS.WITHIN_GEOFENCE]: await this.isWithinGeofence(),
  //     [RS.HAS_ANOMALIES]: await this.hasAnomalies(),
  //     [RS.FRAUD_SCORE]: await this.getFraudScore(),
  //   };
  // }

  // === MÉTHODE PRIVÉE ===

  private hydrate(data: any): TimeEntries {
    this.id = data.id;
    this.guid = data.guid;
    this.session = data.session;
    this.user = data.user;
    this.site = data.site;
    this.pointage_type = data.pointage_type;
    this.pointage_status = data.pointage_status;
    this.clocked_at = data.clocked_at;
    this.real_clocked_at = data.real_clocked_at;
    this.server_received_at = data.server_received_at;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.gps_accuracy = data.gps_accuracy;
    this.device_info = data.device_info;
    this.ip_address = data.ip_address;
    this.user_agent = data.user_agent;
    this.created_offline = data.created_offline;
    this.local_id = data.local_id;
    this.sync_attempts = data.sync_attempts;
    this.last_sync_attempt = data.last_sync_attempt;
    this.memo = data.memo;
    this.correction_reason = data.correction_reason;
    this.updated_at = data.updated_at;
    return this;
  }
}
