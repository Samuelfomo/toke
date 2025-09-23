import { SessionStatus, WORK_SESSIONS_ERRORS, WorkSessionsValidationUtils } from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class WorkSessionsModel extends BaseModel {
  public readonly db = {
    tableName: tableName.WORK_SESSIONS,
    id: 'id',
    guid: 'guid',
    user: 'user',
    site: 'site',
    session_status: 'session_status',
    session_start_at: 'session_start_at',
    session_end_at: 'session_end_at',
    total_work_duration: 'total_work_duration',
    total_pause_duration: 'total_pause_duration',
    start_latitude: 'start_latitude',
    start_longitude: 'start_longitude',
    end_latitude: 'end_latitude',
    end_longitude: 'end_longitude',
    memo: 'memo',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected guid?: string;
  protected user?: number;
  protected site?: number;
  protected session_status?: SessionStatus;
  protected session_start_at?: Date;
  protected session_end_at?: Date;
  protected total_work_duration?: string | null;
  protected total_pause_duration?: string | null;
  protected start_latitude?: number;
  protected start_longitude?: number;
  protected end_latitude?: number;
  protected end_longitude?: number;
  protected memo?: number;
  protected created_at?: Date;
  protected updated_at?: Date;

  protected constructor() {
    super();
  }

  // === RECHERCHES DE BASE ===

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async findByGuid(guid: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }

  protected async listAllByUser(user: number): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.user]: user });
  }

  protected async listAllBySite(site: number): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.site]: site });
  }

  // === GESTION SESSIONS ACTIVES ===

  protected async findActiveSessionByUser(user: number): Promise<any> {
    return await this.findOne(this.db.tableName, {
      [this.db.user]: user,
      [this.db.session_status]: SessionStatus.OPEN,
    });
  }

  protected async listAllActiveSessions(): Promise<any[]> {
    return await this.findAll(this.db.tableName, {
      [this.db.session_status]: SessionStatus.OPEN,
    });
  }

  // === DÉTECTION SESSIONS ABANDONNÉES ===

  protected async listAllAbandonedSessions(hoursThreshold: number = 24): Promise<any[]> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);

    return await this.findAll(this.db.tableName, {
      [this.db.session_status]: SessionStatus.OPEN,
      [this.db.session_start_at]: {
        [Op.lt]: thresholdDate,
      },
      [this.db.session_end_at]: {
        [Op.is]: null,
      },
    });
  }

  protected async autoCloseAbandonedSession(
    session: number,
    estimated_end_time: Date,
  ): Promise<boolean> {
    const updates = {
      [this.db.session_status]: SessionStatus.ABANDONED,
      [this.db.session_end_at]: estimated_end_time,
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: session,
    });
    return affectedRows > 0;
  }

  // === VALIDATION GÉOFENCING ===

  protected async validateUserSiteAccess(user: number, site: number): Promise<boolean> {
    // Cette validation sera implémentée via les relations avec Site et User
    // Pour l'instant, on assume que l'accès est validé en amont
    return true;
  }

  // === SESSIONS PAR PÉRIODE ===

  protected async findSessionsByDateRange(
    user: number | null,
    site: number | null,
    start_date: Date,
    end_date: Date,
  ): Promise<any[]> {
    const conditions: Record<string, any> = {
      [this.db.session_start_at]: {
        [Op.between]: [start_date, end_date],
      },
    };

    if (user) {
      conditions[this.db.user] = user;
    }

    if (site) {
      conditions[this.db.site] = site;
    }

    return await this.findAll(this.db.tableName, conditions);
  }

  // === SESSIONS CROSS-DAY ===

  protected async findCrossDaySessions(): Promise<any[]> {
    return await this.findAll(this.db.tableName, {
      [this.db.session_start_at]: {
        [Op.not]: null,
      },
      [this.db.session_end_at]: {
        [Op.not]: null,
      },
      // Conditions pour détecter les sessions qui traversent minuit
      [Op.and]: this.sequelize!.where(
        this.sequelize!.fn('DATE', this.sequelize!.col(this.db.session_start_at)),
        Op.ne,
        this.sequelize!.fn('DATE', this.sequelize!.col(this.db.session_end_at)),
      ),
    });
  }

  // === CALCULS DURÉES ===

  protected async calculateSessionDuration(session: number): Promise<{
    total_work_duration: string | null;
    total_pause_duration: string | null;
    net_work_time: string | null;
  }> {
    const sessionData = await this.find(session);

    if (!sessionData || !sessionData.session_start_at) {
      return {
        total_work_duration: null,
        total_pause_duration: null,
        net_work_time: null,
      };
    }

    const startTime = new Date(sessionData.session_start_at);
    const endTime = sessionData.session_end_at ? new Date(sessionData.session_end_at) : new Date();

    // Calcul simple de la durée totale (sera affiné avec les pauses)
    const totalMs = endTime.getTime() - startTime.getTime();
    const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
    const totalMinutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));

    const total_work_duration = `${totalHours} hours ${totalMinutes} minutes`;

    // Pour l'instant, on n'a pas encore implémenté les pauses
    const total_pause_duration = sessionData.total_pause_duration || '0 minutes';
    const net_work_time = total_work_duration; // Sera modifié avec les pauses

    return {
      total_work_duration,
      total_pause_duration,
      net_work_time,
    };
  }

  // === STATISTIQUES ===

  protected async getSessionsStatistics(filters: Record<string, any> = {}): Promise<any> {
    const [totalSessions, activeSessions, sessionsByStatus, sessionsBySite] = await Promise.all([
      this.count(this.db.tableName, filters),
      this.count(this.db.tableName, { ...filters, [this.db.session_status]: SessionStatus.OPEN }),
      this.countByGroup(this.db.tableName, this.db.session_status, filters),
      this.countByGroup(this.db.tableName, this.db.site, filters),
    ]);

    return {
      total_sessions: totalSessions,
      active_sessions: activeSessions,
      sessions_by_status: sessionsByStatus,
      sessions_by_site: sessionsBySite,
    };
  }

  // === EXPORT & REPORTING ===

  protected async getUserSessionsReport(
    user: number,
    start_date: Date,
    end_date: Date,
  ): Promise<any[]> {
    return await this.findSessionsByDateRange(user, null, start_date, end_date);
  }

  protected async getSiteSessionsReport(
    site: number,
    start_date: Date,
    end_date: Date,
  ): Promise<any[]> {
    return await this.findSessionsByDateRange(null, site, start_date, end_date);
  }

  // === GESTION DES CORRECTIONS ===

  protected async applyCorrections(
    session: number,
    corrections: Record<string, any>,
    corrected_by: number,
  ): Promise<boolean> {
    const updates: Record<string, any> = {
      [this.db.session_status]: SessionStatus.CORRECTED,
      ...corrections,
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: session,
    });

    return affectedRows > 0;
  }

  // === VALIDATION ANOMALIES ===

  protected async detectSpeedAnomalies(session: number): Promise<any[]> {
    // Cette méthode nécessiterait l'historique des pointages (table séparée)
    // Pour l'instant, on retourne une structure vide
    return [];
  }

  protected async detectDurationAnomalies(max_duration_hours: number = 12): Promise<any[]> {
    const sessions = await this.findAll(this.db.tableName, {
      [this.db.session_status]: SessionStatus.OPEN,
      [this.db.session_start_at]: {
        [Op.lt]: new Date(Date.now() - max_duration_hours * 60 * 60 * 1000),
      },
    });

    return sessions.filter((session) => {
      const startTime = new Date(session.session_start_at);
      const currentTime = new Date();
      const durationHours = (currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      return durationHours > max_duration_hours;
    });
  }

  // === CRUD OPERATIONS ===

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.uuidTokenGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(WORK_SESSIONS_ERRORS?.GUID_GENERATION_FAILED);
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.user]: this.user,
      [this.db.site]: this.site,
      [this.db.session_status]: this.session_status || SessionStatus.OPEN,
      [this.db.session_start_at]: this.session_start_at,
      [this.db.session_end_at]: this.session_end_at,
      [this.db.total_work_duration]: this.total_work_duration,
      [this.db.total_pause_duration]: this.total_pause_duration,
      [this.db.start_latitude]: this.start_latitude,
      [this.db.start_longitude]: this.start_longitude,
      [this.db.end_latitude]: this.end_latitude,
      [this.db.end_longitude]: this.end_longitude,
      [this.db.memo]: this.memo,
    });

    if (!lastID) {
      throw new Error(WORK_SESSIONS_ERRORS?.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    await this.validate();
    if (!this.id) {
      throw new Error(WORK_SESSIONS_ERRORS?.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};

    if (this.session_status !== undefined) updateData[this.db.session_status] = this.session_status;
    if (this.session_end_at !== undefined) updateData[this.db.session_end_at] = this.session_end_at;
    if (this.total_work_duration !== undefined)
      updateData[this.db.total_work_duration] = this.total_work_duration;
    if (this.total_pause_duration !== undefined)
      updateData[this.db.total_pause_duration] = this.total_pause_duration;
    if (this.end_latitude !== undefined) updateData[this.db.end_latitude] = this.end_latitude;
    if (this.end_longitude !== undefined) updateData[this.db.end_longitude] = this.end_longitude;
    if (this.memo !== undefined) updateData[this.db.memo] = this.memo;

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(WORK_SESSIONS_ERRORS?.UPDATE_FAILED || 'Session update failed');
    }
  }

  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  // === VALIDATION ===

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  // === MÉTHODES UTILITAIRES ===

  private async validate(): Promise<void> {
    if (!this.user) {
      throw new Error(WORK_SESSIONS_ERRORS?.USER_REQUIRED);
    }
    if (!WorkSessionsValidationUtils.validateUserId(this.user)) {
      throw new Error(WORK_SESSIONS_ERRORS.USER_INVALID);
    }
    if (!this.site) {
      throw new Error(WORK_SESSIONS_ERRORS?.SITE_REQUIRED);
    }
    if (!WorkSessionsValidationUtils.validateSiteId(this.site)) {
      throw new Error(WORK_SESSIONS_ERRORS.SITE_INVALID);
    }

    if (
      this.session_status &&
      !WorkSessionsValidationUtils.validateSessionStatus(this.session_status)
    ) {
      throw new Error(WORK_SESSIONS_ERRORS.SESSION_STATUS_INVALID);
    }

    if (!this.session_start_at) {
      throw new Error(WORK_SESSIONS_ERRORS.SESSION_START_REQUIRED);
    }
    if (!WorkSessionsValidationUtils.validateSessionStart(this.session_start_at)) {
      throw new Error(WORK_SESSIONS_ERRORS.SESSION_START_INVALID);
    }

    if (
      this.session_end_at &&
      !WorkSessionsValidationUtils.validateSessionEnd(this.session_end_at)
    ) {
      throw new Error(WORK_SESSIONS_ERRORS.SESSION_END_INVALID);
    }
    if (
      this.session_end_at &&
      !WorkSessionsValidationUtils.validateSessionDateLogic(
        this.session_start_at,
        this.session_end_at,
      )
    ) {
      throw new Error(WORK_SESSIONS_ERRORS.SESSION_DATES_LOGIC_INVALID);
    }

    if (
      this.total_work_duration &&
      !WorkSessionsValidationUtils.validatePostgreSQLInterval(this.total_work_duration)
    ) {
      throw new Error(WORK_SESSIONS_ERRORS.TOTAL_WORK_DURATION_INVALID);
    }
    if (
      this.total_pause_duration &&
      !WorkSessionsValidationUtils.validatePostgreSQLInterval(this.total_pause_duration)
    ) {
      throw new Error(WORK_SESSIONS_ERRORS.TOTAL_PAUSE_DURATION_INVALID);
    }

    // Validation des coordonnées GPS si présentes

    if (this.start_latitude && !WorkSessionsValidationUtils.validateLatitude(this.start_latitude)) {
      throw new Error(WORK_SESSIONS_ERRORS.START_LATITUDE_INVALID);
    }

    if (
      this.start_longitude &&
      !WorkSessionsValidationUtils.validateLongitude(this.start_longitude)
    ) {
      throw new Error(WORK_SESSIONS_ERRORS.START_LONGITUDE_INVALID);
    }

    if (this.end_latitude && !WorkSessionsValidationUtils.validateLatitude(this.end_latitude)) {
      throw new Error(WORK_SESSIONS_ERRORS.END_LATITUDE_INVALID);
    }

    if (this.end_longitude && !WorkSessionsValidationUtils.validateLongitude(this.end_longitude)) {
      throw new Error(WORK_SESSIONS_ERRORS.END_LONGITUDE_INVALID);
    }

    if (this.memo && !WorkSessionsValidationUtils.validateMemoId(this.memo)) {
      throw new Error(WORK_SESSIONS_ERRORS.MEMO_INVALID);
    }

    const cleaned = WorkSessionsValidationUtils.cleanWorkSessionData(this);
    Object.assign(this, cleaned);
  }
}
