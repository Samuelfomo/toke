import { ClockInData, ClockOutData, PauseData, PointageType, SessionStatus } from '@toke/shared';
import { Op } from 'sequelize';

import WorkSessionsModel from '../model/WorkSessionsModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import {
  responseStructure as RS,
  responseValue,
  tableName,
  ViewMode,
} from '../../utils/response.model.js';
import { calculateDistance } from '../../utils/geo.utils.js';
import { TenantRevision } from '../../tools/revision.js';

import User from './User.js';
import Site from './Site.js';
import TimeEntries from './TimeEntries.js';

export default class WorkSessions extends WorkSessionsModel {
  private userObj?: User;
  private siteObj?: Site;

  // private memoObj?: any; // À définir selon votre modèle Memo

  constructor() {
    super();
  }

  // === MÉTHODES STATIQUES DE CHARGEMENT ===

  static _load(identifier: any, byGuid: boolean = false): Promise<WorkSessions | null> {
    return new WorkSessions().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<WorkSessions[] | null> {
    return new WorkSessions().list(conditions, paginationOptions);
  }

  static _listByUser(user_id: number): Promise<WorkSessions[] | null> {
    return new WorkSessions().listByUser(user_id);
  }

  static _listBySite(site_id: number): Promise<WorkSessions[] | null> {
    return new WorkSessions().listBySite(site_id);
  }

  static async _findActiveSessionByUser(user: number): Promise<WorkSessions | null> {
    return new WorkSessions().findActiveUserSession(user);
  }

  static async _detectAbandonedSessions(
    hoursThreshold: number = 24,
  ): Promise<WorkSessions[] | null> {
    return new WorkSessions().detectAbandoned(hoursThreshold);
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
    const sessions = await this._list(conditions, paginationOptions);
    if (sessions) {
      items = await Promise.all(sessions.map(async (session) => await session.toJSON()));
    }
    return {
      revision: await TenantRevision.getRevision(tableName.WORK_SESSIONS),
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || items.length,
        count: items.length,
      },
      items,
    };
  }

  static async getSessionsStatistics(filters: Record<string, any> = {}): Promise<any> {
    return new WorkSessions().getStatistics(filters);
  }

  // === GETTERS FLUENT ===

  static async autoCloseAbandonedSessions(hoursThreshold: number = 24): Promise<number> {
    const model = new WorkSessions();
    const abandonedSessions = await model.listAllAbandonedSessions(hoursThreshold);

    let closedCount = 0;
    for (const sessionData of abandonedSessions) {
      const session = new WorkSessions().hydrate(sessionData);

      // Estimer l'heure de fin (dernière activité + 1 heure)
      const estimatedEndTime = new Date(session.session_start_at!);
      estimatedEndTime.setHours(estimatedEndTime.getHours() + 8); // 8h de travail standard

      const success = await model.autoCloseAbandonedSession(session.id!, estimatedEndTime);
      if (success) {
        closedCount++;
      }
    }

    return closedCount;
  }

  // static async validateGeofencing(
  //   site_id: number,
  //   latitude: number,
  //   longitude: number,
  // ): Promise<{
  //   access_granted: boolean;
  //   distance_from_center?: number;
  //   within_geofence: boolean;
  // }> {
  //   // TODO: Implémenter la validation géofencing via Site
  //   return {
  //     access_granted: true,
  //     within_geofence: true,
  //   };
  // }

  // src/api/class/WorkSessions.ts (ajouter cette méthode)

  /**
   * ✅ Validation géofencing avec calcul distance réel
   * @param site_id - ID du site
   * @param latitude - Latitude GPS utilisateur
   * @param longitude - Longitude GPS utilisateur
   * @param gps_accuracy - Précision GPS en mètres (optionnel)
   * @returns Résultat validation avec détails
   */
  static async validateGeofencing(
    site_id: number,
    latitude: number,
    longitude: number,
    gps_accuracy?: number,
  ): Promise<{
    access_granted: boolean;
    distance_from_center: number;
    within_geofence: boolean;
    tolerance_applied: number;
    site_radius: number;
    gps_accuracy_applied?: number;
  }> {
    try {
      // 1. Récupérer site avec données géospatiales
      const siteObj = await Site._load(site_id);
      if (!siteObj) {
        console.error(`❌ Site ${site_id} introuvable pour validation géofencing`);
        return {
          access_granted: false,
          distance_from_center: -1,
          within_geofence: false,
          tolerance_applied: 0,
          site_radius: 0,
        };
      }

      // 2. Extraire coordonnées centre du site
      const geofencePolygon = siteObj.getGeofencePolygon();
      const geofenceRadius = siteObj.getGeofenceRadius();

      if (!geofencePolygon || !geofenceRadius) {
        console.error(`❌ Site ${site_id} sans données géofencing`);
        return {
          access_granted: false,
          distance_from_center: -1,
          within_geofence: false,
          tolerance_applied: 0,
          site_radius: 0,
        };
      }

      // 3. Calculer centre du polygone (centroid)
      const siteCenter = this.calculatePolygonCentroid(geofencePolygon);

      // 4. Calculer distance utilisateur <-> centre site (Haversine)
      const distanceFromCenter = calculateDistance(
        latitude,
        longitude,
        siteCenter.lat,
        siteCenter.lng,
      );

      // 5. Appliquer tolérance GPS si fournie
      // Si GPS accuracy = 15m, on ajoute 15m de marge
      const gpsToleranceBonus = gps_accuracy && gps_accuracy > 0 ? Math.min(gps_accuracy, 30) : 0; // Max 30m bonus
      const effectiveRadius = geofenceRadius + gpsToleranceBonus;

      // 6. Vérifier si dans le rayon autorisé
      const withinGeofence = distanceFromCenter <= effectiveRadius;

      // 7. Logging pour debug
      console.log(`
🛰️  GÉOFENCING VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Site: ${siteObj.getName()} (ID: ${site_id})
📌 Centre Site: ${siteCenter.lat.toFixed(6)}, ${siteCenter.lng.toFixed(6)}
📱 Position User: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
📏 Distance: ${distanceFromCenter.toFixed(2)}m
🎯 Rayon Base: ${geofenceRadius}m
📡 GPS Accuracy: ${gps_accuracy || 0}m
➕ Bonus Tolérance: ${gpsToleranceBonus}m
✅ Rayon Effectif: ${effectiveRadius}m
${withinGeofence ? '✅ ACCÈS AUTORISÉ' : '❌ ACCÈS REFUSÉ'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

      return {
        access_granted: withinGeofence,
        distance_from_center: Math.round(distanceFromCenter),
        within_geofence: withinGeofence,
        tolerance_applied: Math.round(gpsToleranceBonus),
        site_radius: geofenceRadius,
        gps_accuracy_applied: gps_accuracy,
      };
    } catch (error) {
      console.error('❌ Erreur validation géofencing:', error);
      return {
        access_granted: false,
        distance_from_center: -1,
        within_geofence: false,
        tolerance_applied: 0,
        site_radius: 0,
      };
    }
  }

  static async generateSessionReport(filters: {
    user?: number;
    site?: number;
    start_date?: Date;
    end_date?: Date;
    status?: SessionStatus;
  }): Promise<{
    total_sessions: number;
    total_work_hours: string;
    average_session_duration: string;
    sessions_by_status: Record<string, number>;
    sessions: any[];
  }> {
    const model = new WorkSessions();
    const conditions: Record<string, any> = {};

    if (filters.user) conditions.user = filters.user;
    if (filters.site) conditions.site = filters.site;
    if (filters.status) conditions.session_status = filters.status;

    if (filters.start_date || filters.end_date) {
      conditions.session_start_at = {};
      if (filters.start_date) conditions.session_start_at[Op.gte] = filters.start_date;
      if (filters.end_date) conditions.session_start_at[Op.lte] = filters.end_date;
    }

    const sessions = await model.listAll(conditions);
    const statistics = await model.getSessionsStatistics(conditions);

    return {
      total_sessions: statistics.total_sessions,
      total_work_hours: model.calculateTotalWorkTime(sessions),
      average_session_duration: '0 hours', // TODO: Calculer la moyenne
      sessions_by_status: statistics.sessions_by_status,
      sessions: sessions,
    };
  }

  /**
   * Calculer centroid (centre géométrique) d'un polygone GeoJSON
   * @param geofencePolygon - Polygone GeoJSON PostGIS
   * @returns Coordonnées {lat, lng} du centre
   */
  private static calculatePolygonCentroid(geofencePolygon: any): { lat: number; lng: number } {
    try {
      // Format attendu : GeoJSON Polygon ou Point
      // Ex: {"type":"Point","coordinates":[-73.935242,40.730610]}
      // Ex: {"type":"Polygon","coordinates":[[[-73.9,40.7],[-73.8,40.7],[-73.85,40.75],[-73.9,40.7]]]}

      if (geofencePolygon.type === 'Point') {
        // Si c'est déjà un Point, retourner directement
        const [lng, lat] = geofencePolygon.coordinates;
        return { lat, lng };
      }

      if (geofencePolygon.type === 'Polygon') {
        // Calculer centroid d'un polygone
        const coordinates = geofencePolygon.coordinates[0]; // Premier anneau (exterior ring)

        let sumLat = 0;
        let sumLng = 0;
        let count = coordinates.length - 1; // Exclure dernier point (=premier point)

        for (let i = 0; i < count; i++) {
          sumLng += coordinates[i][0];
          sumLat += coordinates[i][1];
        }

        return {
          lat: sumLat / count,
          lng: sumLng / count,
        };
      }

      console.error('❌ Format geofence_polygon non supporté:', geofencePolygon.type);
      throw new Error('Invalid geofence polygon format');
    } catch (error) {
      console.error('❌ Erreur calcul centroid:', error);
      throw error;
    }
  }

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
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

  getSessionStatus(): SessionStatus | undefined {
    return this.session_status;
  }

  getSessionStartAt(): Date | undefined {
    return this.session_start_at;
  }

  getSessionEndAt(): Date | undefined {
    return this.session_end_at;
  }

  getTotalWorkDuration(): string | null | undefined {
    return this.total_work_duration;
  }

  getTotalPauseDuration(): string | null | undefined {
    return this.total_pause_duration;
  }

  getStartLatitude(): number | undefined {
    return this.start_latitude;
  }

  getStartLongitude(): number | undefined {
    return this.start_longitude;
  }

  getEndLatitude(): number | undefined {
    return this.end_latitude;
  }

  getEndLongitude(): number | undefined {
    return this.end_longitude;
  }

  // === SETTERS FLUENT ===

  // getMemo(): number | undefined {
  //   return this.memo;
  // }

  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  getUpdatedAt(): Date | undefined {
    return this.updated_at;
  }

  setUser(user: number): WorkSessions {
    this.user = user;
    return this;
  }

  setSite(site: number): WorkSessions {
    this.site = site;
    return this;
  }

  setSessionStatus(status: SessionStatus): WorkSessions {
    this.session_status = status;
    return this;
  }

  setSessionStartAt(start_at: Date): WorkSessions {
    this.session_start_at = start_at;
    return this;
  }

  setSessionEndAt(end_at: Date): WorkSessions {
    this.session_end_at = end_at;
    return this;
  }

  // === MÉTHODES MÉTIER - POINTAGE ===

  setStartCoordinates(latitude: number, longitude: number): WorkSessions {
    this.start_latitude = latitude;
    this.start_longitude = longitude;
    return this;
  }

  setEndCoordinates(latitude: number, longitude: number): WorkSessions {
    this.end_latitude = latitude;
    this.end_longitude = longitude;
    return this;
  }

  // === MÉTHODES MÉTIER - PAUSES ===

  // setMemo(memo: number): WorkSessions {
  //   this.memo = memo;
  //   return this;
  // }

  async clockIn(clockInData: ClockInData): Promise<void> {
    // Vérifier qu'il n'y a pas de session active
    const activeSession = await this.findActiveUserSession(clockInData.site);
    if (activeSession) {
      throw new Error('User already has an active session');
    }

    // Valider l'accès au site
    const isAccessValid = await this.validateUserSiteAccess(clockInData.site, clockInData.site);
    if (!isAccessValid) {
      throw new Error('User does not have access to this site');
    }

    // Configurer la session
    this.user = clockInData.site; // TODO: Récupérer user_id du contexte
    this.site = clockInData.site;
    this.session_start_at = new Date();
    this.session_status = SessionStatus.OPEN;
    this.start_latitude = clockInData.latitude;
    this.start_longitude = clockInData.longitude;

    await this.save();
  }

  async clockOut(clockOutData: ClockOutData): Promise<void> {
    if (!this.isActive()) {
      throw new Error('Session is not active');
    }

    if (!(await this.canClockOut())) {
      throw new Error('Session cannot be closed at this time');
    }

    // Calculer les durées
    const durations = await this.calculateDurations();

    this.session_end_at = new Date();
    this.session_status = SessionStatus.CLOSED;
    this.end_latitude = clockOutData.latitude;
    this.end_longitude = clockOutData.longitude;
    this.total_work_duration = durations?.total_work_duration;
    this.total_pause_duration = durations?.total_pause_duration;

    await this.save();
  }

  // === MÉTHODES MÉTIER - MISSIONS EXTERNES ===

  async startPause(pauseData: PauseData): Promise<void> {
    if (!this.isActive()) {
      throw new Error('No active session to pause');
    }

    // TODO: Implémenter la gestion des pauses via une table séparée
    console.log(`Starting pause: ${pauseData.pause_type} at ${pauseData.location}`);
  }

  async endPause(): Promise<void> {
    if (!this.isActive()) {
      throw new Error('No active session to resume');
    }

    // TODO: Implémenter la fin de pause
    console.log('Ending pause and resuming work');
  }

  async getPauseStatus(): Promise<string> {
    // TODO: Implémenter le statut des pauses
    return 'no_pause';
  }

  isActive(): boolean {
    return this.session_status === SessionStatus.OPEN;
  }

  async canClockOut(): Promise<boolean> {
    if (!this.isActive() || !this.id) {
      return false;
    }

    // Vérifier via TimeEntriesModel
    const hasActivePause = await this.hasActivePause(this.id);

    return !hasActivePause;
  }

  // === MÉTHODES MÉTIER - CALCULS ===

  isAbandoned(): boolean {
    return this.session_status === SessionStatus.ABANDONED;
  }

  isCorrected(): boolean {
    return this.session_status === SessionStatus.CORRECTED;
  }

  isClosed(): boolean {
    return this.session_status === SessionStatus.CLOSED;
  }

  // === MÉTHODES MÉTIER - CROSS-DAY ===

  async calculateDurations(): Promise<{
    total_work_duration: string | null;
    total_pause_duration: string | null;
    net_work_time: string | null;
  }> {
    if (!this.id) {
      throw new Error('Session must be saved before calculating durations');
    }

    return await this.calculateSessionDuration(this.id);
  }

  async getOvertimeHours(): Promise<number> {
    const durations = await this.calculateDurations();
    // TODO: Calculer les heures supplémentaires selon les règles métier
    return 0;
  }

  // === MÉTHODES MÉTIER - ANOMALIES ===

  async isCompliantWithRegulations(): Promise<boolean> {
    // TODO: Vérifier la conformité avec les règles de travail
    return true;
  }

  isCrossDaySession(): boolean {
    if (!this.session_start_at || !this.session_end_at) {
      return false;
    }

    const startDate = this.session_start_at.toDateString();
    const endDate = this.session_end_at.toDateString();
    return startDate !== endDate;
  }

  getWorkingDates(): string[] {
    if (!this.session_start_at) {
      return [];
    }

    const dates = [this.session_start_at.toDateString()];

    if (this.session_end_at && this.isCrossDaySession()) {
      dates.push(this.session_end_at.toDateString());
    }

    return dates;
  }

  // === MÉTHODES MÉTIER - REPORTING ===

  async hasAnomalies(): Promise<boolean> {
    const anomalies = await this.getAnomalyReport();
    return anomalies.length > 0;
  }

  async getAnomalyReport(): Promise<any[]> {
    if (!this.id) return [];

    const [speedAnomalies, durationAnomalies] = await Promise.all([
      this.detectSpeedAnomalies(this.id),
      this.detectDurationAnomalies(),
    ]);

    return [...speedAnomalies, ...durationAnomalies];
  }

  async applyManagerCorrection(corrections: Record<string, any>, manager: number): Promise<void> {
    if (!this.id) {
      throw new Error('Session must be saved before applying corrections');
    }

    const success = await this.applyCorrections(this.id, corrections, manager);
    if (!success) {
      throw new Error('Failed to apply corrections');
    }

    // Recharger la session pour refléter les changements
    await this.load(this.id);
  }

  async getSessionSummary(): Promise<any> {
    return {
      guid: this.guid,
      user: (await User._load(this.user))?.getGuid(),
      site: (await Site._load(this.site))?.getGuid(),
      status: this.session_status,
      start_time: this.session_start_at,
      end_time: this.session_end_at,
      total_duration: this.total_work_duration,
      pause_duration: this.total_pause_duration,
      is_cross_day: this.isCrossDaySession(),
    };
  }

  // === MÉTHODES DE BASE ===

  async getPauseDetails(): Promise<any[]> {
    if (!this.id) return [];
    return await this.getPausesHistory(this.id);
  }

  async getTotalPauseTime(): Promise<number> {
    const pauses = await this.getPauseDetails();
    return pauses.reduce((total, pause) => total + pause.duration_minutes, 0);
  }

  async isOnPause(): Promise<boolean> {
    if (!this.id) return false;
    return await this.hasActivePause(this.id);
  }

  async LastEntry(): Promise<any> {
    if (!this.id) return null;
    return await this.getLastEntry(this.id);
  }

  async activeMission(): Promise<boolean> {
    if (!this.id) return false;
    return await this.hasActiveMission(this.id);
  }

  async getPauseStatusDetailed(): Promise<{
    is_on_pause: boolean;
    current_pause_start?: Date;
    current_pause_duration_minutes?: number;
    total_pauses_today: number;
  }> {
    if (!this.id) {
      return { is_on_pause: false, total_pauses_today: 0 };
    }

    const isOnPause = await this.hasActivePause(this.id);
    const pausesHistory = await this.getPausesHistory(this.id);

    if (isOnPause) {
      // Trouver la pause en cours
      const entries = await TimeEntries._listBySession(this.id);
      const lastPause = entries
        ?.reverse()
        .find((e) => e.getPointageType() === PointageType.PAUSE_START);

      return {
        is_on_pause: true,
        current_pause_start: lastPause?.getClockedAt(),
        current_pause_duration_minutes: lastPause?.getClockedAt()
          ? Math.floor((new Date().getTime() - lastPause.getClockedAt()!.getTime()) / (1000 * 60))
          : 0,
        total_pauses_today: pausesHistory.length,
      };
    }

    return {
      is_on_pause: false,
      total_pauses_today: pausesHistory.length,
    };
  }

  async getDailyReport(date: Date): Promise<any> {
    if (!this.user) {
      throw new Error('User must be set for daily report');
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await this.getUserSessionsReport(this.user, startOfDay, endOfDay);

    return {
      date: date.toDateString(),
      user_id: this.user,
      sessions_count: sessions.length,
      sessions: sessions,
      total_work_time: this.calculateTotalWorkTime(sessions),
      total_pause_time: this.calculateTotalPauseTime(sessions),
    };
  }

  async getWeeklyStats(): Promise<any> {
    // TODO: Implémenter les statistiques hebdomadaires
    return {
      week_start: new Date(),
      total_sessions: 0,
      total_hours: '0 hours',
      overtime_hours: '0 hours',
      average_daily_hours: '0 hours',
    };
  }

  toExportFormat(): any {
    return {
      session_guid: this.guid,
      user_id: this.user,
      site_id: this.site,
      status: this.session_status,
      start_time: this.session_start_at?.toISOString(),
      end_time: this.session_end_at?.toISOString(),
      work_duration: this.total_work_duration,
      pause_duration: this.total_pause_duration,
      start_coords: `${this.start_latitude},${this.start_longitude}`,
      end_coords: `${this.end_latitude},${this.end_longitude}`,
      is_cross_day: this.isCrossDaySession(),
      created_at: this.created_at?.toISOString(),
    };
  }

  isNew(): boolean {
    return this.id === undefined;
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

  async load(identifier: any, byGuid: boolean = false): Promise<WorkSessions | null> {
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
  ): Promise<WorkSessions[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new WorkSessions().hydrate(data));
  }

  async listByUser(user_id: number): Promise<WorkSessions[] | null> {
    const dataset = await this.listAllByUser(user_id);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new WorkSessions().hydrate(data));
  }

  async listBySite(site_id: number): Promise<WorkSessions[] | null> {
    const dataset = await this.listAllBySite(site_id);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new WorkSessions().hydrate(data));
  }

  async findActiveUserSession(user: number): Promise<WorkSessions | null> {
    const data = await this.findActiveSessionByUser(user);
    if (!data) return null;
    return new WorkSessions().hydrate(data);
  }

  async detectAbandoned(hoursThreshold: number = 24): Promise<WorkSessions[] | null> {
    const dataset = await this.listAllAbandonedSessions(hoursThreshold);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new WorkSessions().hydrate(data));
  }

  // === MÉTHODES PRIVÉES ===

  async getStatistics(filters: Record<string, any> = {}): Promise<any> {
    return await this.getSessionsStatistics(filters);
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: WorkSession Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const user = await this.getUserObj();
    const site = await this.getSiteObj();

    const baseData = {
      [RS.GUID]: this.guid,
      [RS.USER]: user?.getGuid(),
      [RS.SITE]: site?.getGuid(),
      [RS.SESSION_STATUS]: this.session_status,
      [RS.SESSION_START_AT]: this.session_start_at,
      [RS.SESSION_END_AT]: this.session_end_at,
      [RS.TOTAL_WORK_DURATION]: this.total_work_duration,
      [RS.TOTAL_PAUSE_DURATION]: this.total_pause_duration,
      [RS.CREATED_AT]: this.created_at,
      [RS.UPDATED_AT]: this.updated_at,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.START_COORDINATES]:
          this.start_latitude && this.start_longitude
            ? `${this.start_latitude},${this.start_longitude}`
            : null,
        [RS.END_COORDINATES]:
          this.end_latitude && this.end_longitude
            ? `${this.end_latitude},${this.end_longitude}`
            : null,
      };
    }

    return {
      ...baseData,
      [RS.USER]: user ? user.toJSON() : null,
      [RS.SITE]: site ? await site.toJSON(responseValue.MINIMAL) : null,
      [RS.START_LATITUDE]: this.start_latitude,
      [RS.START_LONGITUDE]: this.start_longitude,
      [RS.END_LATITUDE]: this.end_latitude,
      [RS.END_LONGITUDE]: this.end_longitude,
      // [RS.MEMO]: this.memo,
      // Informations calculées
      [RS.IS_ACTIVE]: this.isActive(),
      [RS.IS_CROSS_DAY]: this.isCrossDaySession(),
      [RS.IS_ABANDONED]: this.isAbandoned(),
      [RS.IS_CORRECTED]: this.isCorrected(),
      [RS.WORKING_DATES]: this.getWorkingDates(),
      [RS.SESSION_SUMMARY]: await this.getSessionSummary(),
    };
  }

  // === MÉTHODES STATIQUES UTILITAIRES ===

  private hydrate(data: any): WorkSessions {
    this.id = data.id;
    this.guid = data.guid;
    this.user = data.user;
    this.site = data.site;
    this.session_status = data.session_status;
    this.session_start_at = data.session_start_at;
    this.session_end_at = data.session_end_at;
    this.total_work_duration = data.total_work_duration;
    this.total_pause_duration = data.total_pause_duration;
    this.start_latitude = data.start_latitude;
    this.start_longitude = data.start_longitude;
    this.end_latitude = data.end_latitude;
    this.end_longitude = data.end_longitude;
    // this.memo = data.memo;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }

  private calculateTotalWorkTime(sessions: any[]): string {
    let totalMinutes = 0;

    sessions.forEach((session) => {
      if (session.total_work_duration) {
        // Parse la durée (format: "8 hours 30 minutes")
        const matches = session.total_work_duration.match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
        if (matches) {
          const hours = parseInt(matches[1]) || 0;
          const minutes = parseInt(matches[2]) || 0;
          totalMinutes += hours * 60 + minutes;
        }
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    return `${totalHours} hours ${remainingMinutes} minutes`;
  }

  private calculateTotalPauseTime(sessions: any[]): string {
    let totalMinutes = 0;

    sessions.forEach((session) => {
      if (session.total_pause_duration) {
        // Parse la durée (format similaire)
        const matches = session.total_pause_duration.match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
        if (matches) {
          const hours = parseInt(matches[1]) || 0;
          const minutes = parseInt(matches[2]) || 0;
          totalMinutes += hours * 60 + minutes;
        }
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    return `${totalHours} hours ${remainingMinutes} minutes`;
  }
}
