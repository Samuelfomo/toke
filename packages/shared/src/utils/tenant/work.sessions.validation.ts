// utils/work.sessions.validation.ts
import {
  SessionStatus,
  WORK_SESSIONS_DEFAULTS,
  WORK_SESSIONS_VALIDATION,
} from '../../constants/tenant/work.sessions.js';

export class WorkSessionsValidationUtils {
  /**
   * Validates GUID
   */
  static validateGuid(guid: string): boolean {
    if (!guid || typeof guid !== 'string') return false;
    const trimmed = guid.trim();

    // Check length
    if (
      trimmed.length < WORK_SESSIONS_VALIDATION.GUID.MIN_LENGTH ||
      trimmed.length > WORK_SESSIONS_VALIDATION.GUID.MAX_LENGTH
    ) {
      return false;
    }

    const uuidRegex = /^[0-9]+$/;
    // UUID v4 regex
    // const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(trimmed);
  }

  /**
   * Validates user ID
   */
  static validateUserId(userId: number): boolean {
    if (typeof userId !== 'number' || !Number.isInteger(userId)) return false;
    return (
      userId >= WORK_SESSIONS_VALIDATION.USER.MIN && userId <= WORK_SESSIONS_VALIDATION.USER.MAX
    );
  }

  /**
   * Validates site ID
   */
  static validateSiteId(siteId: number): boolean {
    if (typeof siteId !== 'number' || !Number.isInteger(siteId)) return false;
    return (
      siteId >= WORK_SESSIONS_VALIDATION.SITE.MIN && siteId <= WORK_SESSIONS_VALIDATION.SITE.MAX
    );
  }

  /**
   * Validates session status
   */
  static validateSessionStatus(status: string): boolean {
    if (!status || typeof status !== 'string') return false;
    return Object.values(SessionStatus).includes(status as SessionStatus);
  }

  /**
   * Validates session start date
   */
  static validateSessionStart(sessionStart: Date | string): boolean {
    if (!sessionStart) return false;
    const date = new Date(sessionStart);
    if (isNaN(date.getTime())) return false;

    // // Session start cannot be in the future (allowing current time with 1 minute tolerance)
    // const now = new Date();
    // now.setMinutes(now.getMinutes() + 1);
    // return date <= now;

    // Obtenir l'heure actuelle au timezone Africa/Douala
    const nowInDouala = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Douala' }));
    nowInDouala.setMinutes(nowInDouala.getMinutes() + 1); // Tolérance 1 minute

    return date <= nowInDouala;
  }

  /**
   * Validates session end date
   */
  static validateSessionEnd(sessionEnd: Date | string | null): boolean {
    if (sessionEnd === null || sessionEnd === undefined) return true;
    const date = new Date(sessionEnd);
    return !isNaN(date.getTime());
  }

  /**
   * Validates session date logic (end > start)
   */
  static validateSessionDateLogic(
    sessionStart: Date | string,
    sessionEnd: Date | string | null,
  ): boolean {
    if (!sessionEnd) return true;

    const startDate = new Date(sessionStart);
    const endDate = new Date(sessionEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;

    return endDate > startDate;
  }

  /**
   * Validates latitude
   */
  static validateLatitude(latitude: number | null): boolean {
    if (latitude === null || latitude === undefined) return true;
    if (typeof latitude !== 'number') return false;
    return (
      latitude >= WORK_SESSIONS_VALIDATION.LATITUDE.MIN &&
      latitude <= WORK_SESSIONS_VALIDATION.LATITUDE.MAX &&
      this.validateDecimalPlaces(latitude, WORK_SESSIONS_VALIDATION.LATITUDE.DECIMAL_PLACES)
    );
  }

  /**
   * Validates longitude
   */
  static validateLongitude(longitude: number | null): boolean {
    if (longitude === null || longitude === undefined) return true;
    if (typeof longitude !== 'number') return false;
    return (
      longitude >= WORK_SESSIONS_VALIDATION.LONGITUDE.MIN &&
      longitude <= WORK_SESSIONS_VALIDATION.LONGITUDE.MAX &&
      this.validateDecimalPlaces(longitude, WORK_SESSIONS_VALIDATION.LONGITUDE.DECIMAL_PLACES)
    );
  }

  /**
   * Validates decimal places
   */
  static validateDecimalPlaces(value: number, maxPlaces: number): boolean {
    const str = value.toString();
    const decimalIndex = str.indexOf('.');
    if (decimalIndex === -1) return true; // No decimal places
    return str.length - decimalIndex - 1 <= maxPlaces;
  }

  /**
   * Validates coordinate pair completeness
   */
  static validateCoordinatePair(latitude: number | null, longitude: number | null): boolean {
    // Both must be provided together or both null
    if (
      (latitude === null || latitude === undefined) &&
      (longitude === null || longitude === undefined)
    ) {
      return true;
    }
    return (
      latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined
    );
  }

  /**
   * Validates PostgreSQL interval string
   */
  static validatePostgreSQLInterval(interval: string | null): boolean {
    if (interval === null || interval === undefined) return true;
    if (typeof interval !== 'string') return false;

    // Basic PostgreSQL interval format validation
    // Patterns like: '1 day', '2:30:00', '1 day 2:30:00', etc.
    const intervalRegex = /^(\d+\s+(day|hour|minute|second)s?\s*)*(\d{1,2}:\d{2}:\d{2})?$/i;
    return intervalRegex.test(interval.trim());
  }

  // /**
  //  * Validates memo ID
  //  */
  // static validateMemoId(memoId: number | null): boolean {
  //   if (memoId === null || memoId === undefined) return true;
  //   if (typeof memoId !== 'number' || !Number.isInteger(memoId)) return false;
  //   return (
  //     memoId >= WORK_SESSIONS_VALIDATION.MEMO.MIN && memoId <= WORK_SESSIONS_VALIDATION.MEMO.MAX
  //   );
  // }

  /**
   * Validates pagination parameters
   */
  static validatePaginationParams(offset: number, limit: number): boolean {
    return (
      Number.isInteger(offset) &&
      Number.isInteger(limit) &&
      offset >= 0 &&
      limit > 0 &&
      limit <= WORK_SESSIONS_DEFAULTS.PAGINATION.MAX_LIMIT
    );
  }

  /**
   * Validates coordinates are within geofence
   */
  static isWithinGeofence(
    latitude: number | null,
    longitude: number | null,
    siteGeofence: any,
  ): boolean {
    if (!latitude || !longitude || !siteGeofence || !siteGeofence.coordinates) return true;

    try {
      // Basic point-in-polygon check
      const coords = siteGeofence.coordinates[0]; // Outer ring
      const x = longitude,
        y = latitude;
      let inside = false;

      for (let i = 0, j = coords.length - 2; i < coords.length - 1; j = i++) {
        const xi = coords[i][0],
          yi = coords[i][1];
        const xj = coords[j][0],
          yj = coords[j][1];

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }

      return inside;
    } catch {
      return true; // If geofence validation fails, don't block the session
    }
  }

  /**
   * Validates status transition
   */
  static validateStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      [SessionStatus.OPEN]: [
        SessionStatus.CLOSED,
        SessionStatus.ABANDONED,
        SessionStatus.CORRECTED,
      ],
      [SessionStatus.CLOSED]: [SessionStatus.CORRECTED],
      [SessionStatus.ABANDONED]: [SessionStatus.CORRECTED],
      [SessionStatus.CORRECTED]: [SessionStatus.CLOSED],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Checks if user has an open session
   */
  static hasOpenSession(sessions: any[], userId: number, excludeSessionId?: string): boolean {
    return sessions.some(
      (session) =>
        session.user === userId &&
        session.session_status === SessionStatus.OPEN &&
        session.guid !== excludeSessionId,
    );
  }

  /**
   * Checks for overlapping sessions
   */
  static hasOverlappingSession(
    sessions: any[],
    userId: number,
    sessionStart: Date | string,
    sessionEnd: Date | string | null,
    excludeSessionId?: string,
  ): boolean {
    const newStart = new Date(sessionStart);
    const newEnd = sessionEnd ? new Date(sessionEnd) : null;

    return sessions.some((session) => {
      if (session.user !== userId) return false;
      if (session.guid === excludeSessionId) return false;

      const existingStart = new Date(session.session_start);
      const existingEnd = session.session_end ? new Date(session.session_end) : null;

      // Check for overlap
      if (!newEnd && !existingEnd) {
        // Both are open sessions - overlap
        return true;
      } else if (!newEnd) {
        // New is open, existing has end date
        return newStart <= existingEnd!;
      } else if (!existingEnd) {
        // Existing is open, new has end date
        return existingStart <= newEnd;
      } else {
        // Both have end dates
        return newStart < existingEnd && existingStart < newEnd;
      }
    });
  }

  /**
   * Calculates session duration in minutes
   */
  static calculateSessionDuration(
    sessionStart: Date | string,
    sessionEnd: Date | string | null,
  ): number {
    const start = new Date(sessionStart);
    const end = sessionEnd ? new Date(sessionEnd) : new Date();
    return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
  }

  /**
   * Converts duration to PostgreSQL interval format
   */
  static formatDurationAsInterval(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes % 1) * 60);

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Parses PostgreSQL interval to minutes
   */
  static parseIntervalToMinutes(interval: string | null): number {
    if (!interval) return 0;

    let totalMinutes = 0;

    // Parse days
    const dayMatch = interval.match(/(\d+)\s*days?/i);
    if (dayMatch) totalMinutes += parseInt(dayMatch[1]!) * 24 * 60;

    // Parse time format (HH:MM:SS)
    const timeMatch = interval.match(/(\d{1,2}):(\d{2}):(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]!);
      const minutes = parseInt(timeMatch[2]!);
      const seconds = parseInt(timeMatch[3]!);
      totalMinutes += hours * 60 + minutes + seconds / 60;
    }

    return totalMinutes;
  }

  /**
   * Cleans and normalizes work session data
   */
  static cleanWorkSessionData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Convert numeric fields
    // ['user', 'site', 'memo'].forEach((field) => {
    ['user', 'site'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = Number(cleaned[field]);
      }
    });

    // Convert coordinate fields to precise numbers
    ['start_latitude', 'start_longitude', 'end_latitude', 'end_longitude'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = parseFloat(
          Number(cleaned[field]).toFixed(WORK_SESSIONS_VALIDATION.LATITUDE.DECIMAL_PLACES),
        );
      }
    });

    // Clean string fields
    ['session_status'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = cleaned[field].toString().trim();
      }
    });

    // Clean GUID
    if (cleaned.guid !== undefined && cleaned.guid !== null) {
      cleaned.guid = cleaned.guid.toString().trim();
    }

    // Convert dates
    ['session_start', 'session_end'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        const date = new Date(cleaned[field]);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid ${field}: must be a valid date`);
        }
        cleaned[field] = date;
      }
    });

    return cleaned;
  }

  /**
   * Validates that a work session is complete for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = ['user', 'site', 'session_start'];

    // Check required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    return (
      this.validateUserId(data.user) &&
      this.validateSiteId(data.site) &&
      (data.session_status === undefined || this.validateSessionStatus(data.session_status)) &&
      this.validateSessionStart(data.session_start) &&
      this.validateSessionEnd(data.session_end) &&
      this.validateSessionDateLogic(data.session_start, data.session_end) &&
      this.validatePostgreSQLInterval(data.total_work_duration) &&
      this.validatePostgreSQLInterval(data.total_pause_duration) &&
      this.validateLatitude(data.start_latitude) &&
      this.validateLongitude(data.start_longitude) &&
      this.validateCoordinatePair(data.start_latitude, data.start_longitude) &&
      this.validateLatitude(data.end_latitude) &&
      this.validateLongitude(data.end_longitude) &&
      this.validateCoordinatePair(data.end_latitude, data.end_longitude) &&
      // this.validateMemoId(data.memo) &&
      (data.guid === undefined || this.validateGuid(data.guid))
    );
  }

  /**
   * Validates that a work session is valid for update
   */
  static isValidForUpdate(data: any): boolean {
    // For updates, validate only fields that are present
    const validations = [
      data.user === undefined || this.validateUserId(data.user),
      data.site === undefined || this.validateSiteId(data.site),
      data.session_status === undefined || this.validateSessionStatus(data.session_status),
      data.session_start === undefined || this.validateSessionStart(data.session_start),
      data.session_end === undefined || this.validateSessionEnd(data.session_end),
      data.total_work_duration === undefined ||
        this.validatePostgreSQLInterval(data.total_work_duration),
      data.total_pause_duration === undefined ||
        this.validatePostgreSQLInterval(data.total_pause_duration),
      data.start_latitude === undefined || this.validateLatitude(data.start_latitude),
      data.start_longitude === undefined || this.validateLongitude(data.start_longitude),
      data.end_latitude === undefined || this.validateLatitude(data.end_latitude),
      data.end_longitude === undefined || this.validateLongitude(data.end_longitude),
      // data.memo === undefined || this.validateMemoId(data.memo),
      data.guid === undefined || this.validateGuid(data.guid),
    ];

    // Additional validation for coordinate pairs and date logic
    if (data.start_latitude !== undefined || data.start_longitude !== undefined) {
      const startLat = data.start_latitude !== undefined ? data.start_latitude : null;
      const startLng = data.start_longitude !== undefined ? data.start_longitude : null;
      validations.push(this.validateCoordinatePair(startLat, startLng));
    }

    if (data.end_latitude !== undefined || data.end_longitude !== undefined) {
      const endLat = data.end_latitude !== undefined ? data.end_latitude : null;
      const endLng = data.end_longitude !== undefined ? data.end_longitude : null;
      validations.push(this.validateCoordinatePair(endLat, endLng));
    }

    if (data.session_start !== undefined || data.session_end !== undefined) {
      const start = data.session_start || new Date();
      const end = data.session_end;
      validations.push(this.validateSessionDateLogic(start, end));
    }

    return validations.every((validation) => validation === true);
  }

  /**
   * Extracts validation errors for a work session
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (data.user === undefined || data.user === null || !this.validateUserId(data.user)) {
      errors.push(
        `Invalid user: must be between ${WORK_SESSIONS_VALIDATION.USER.MIN} and ${WORK_SESSIONS_VALIDATION.USER.MAX}`,
      );
    }

    if (data.site === undefined || data.site === null || !this.validateSiteId(data.site)) {
      errors.push(
        `Invalid site: must be between ${WORK_SESSIONS_VALIDATION.SITE.MIN} and ${WORK_SESSIONS_VALIDATION.SITE.MAX}`,
      );
    }

    if (data.session_status !== undefined && !this.validateSessionStatus(data.session_status)) {
      errors.push(
        `Invalid session_status: must be one of ${Object.values(SessionStatus).join(', ')}`,
      );
    }

    if (
      data.session_start === undefined ||
      data.session_start === null ||
      !this.validateSessionStart(data.session_start)
    ) {
      errors.push('Invalid session_start: must be a valid date not in the future');
    }

    if (data.session_end !== undefined && !this.validateSessionEnd(data.session_end)) {
      errors.push('Invalid session_end: must be a valid date');
    }

    if (
      data.session_start &&
      data.session_end &&
      !this.validateSessionDateLogic(data.session_start, data.session_end)
    ) {
      errors.push('Invalid date range: session_end must be after session_start');
    }

    if (
      data.total_work_duration !== undefined &&
      !this.validatePostgreSQLInterval(data.total_work_duration)
    ) {
      errors.push('Invalid total_work_duration: must be a valid PostgreSQL interval string');
    }

    if (
      data.total_pause_duration !== undefined &&
      !this.validatePostgreSQLInterval(data.total_pause_duration)
    ) {
      errors.push('Invalid total_pause_duration: must be a valid PostgreSQL interval string');
    }

    if (data.start_latitude !== undefined && !this.validateLatitude(data.start_latitude)) {
      errors.push(
        `Invalid start_latitude: must be between ${WORK_SESSIONS_VALIDATION.LATITUDE.MIN} and ${WORK_SESSIONS_VALIDATION.LATITUDE.MAX} with max ${WORK_SESSIONS_VALIDATION.LATITUDE.DECIMAL_PLACES} decimal places`,
      );
    }

    if (data.start_longitude !== undefined && !this.validateLongitude(data.start_longitude)) {
      errors.push(
        `Invalid start_longitude: must be between ${WORK_SESSIONS_VALIDATION.LONGITUDE.MIN} and ${WORK_SESSIONS_VALIDATION.LONGITUDE.MAX} with max ${WORK_SESSIONS_VALIDATION.LONGITUDE.DECIMAL_PLACES} decimal places`,
      );
    }

    if (!this.validateCoordinatePair(data.start_latitude, data.start_longitude)) {
      errors.push('Both start_latitude and start_longitude must be provided together');
    }

    if (data.end_latitude !== undefined && !this.validateLatitude(data.end_latitude)) {
      errors.push(
        `Invalid end_latitude: must be between ${WORK_SESSIONS_VALIDATION.LATITUDE.MIN} and ${WORK_SESSIONS_VALIDATION.LATITUDE.MAX} with max ${WORK_SESSIONS_VALIDATION.LATITUDE.DECIMAL_PLACES} decimal places`,
      );
    }

    if (data.end_longitude !== undefined && !this.validateLongitude(data.end_longitude)) {
      errors.push(
        `Invalid end_longitude: must be between ${WORK_SESSIONS_VALIDATION.LONGITUDE.MIN} and ${WORK_SESSIONS_VALIDATION.LONGITUDE.MAX} with max ${WORK_SESSIONS_VALIDATION.LONGITUDE.DECIMAL_PLACES} decimal places`,
      );
    }

    if (!this.validateCoordinatePair(data.end_latitude, data.end_longitude)) {
      errors.push('Both end_latitude and end_longitude must be provided together');
    }

    // if (data.memo !== undefined && !this.validateMemoId(data.memo)) {
    //   errors.push(
    //     `Invalid memo: must be between ${WORK_SESSIONS_VALIDATION.MEMO.MIN} and ${WORK_SESSIONS_VALIDATION.MEMO.MAX}`,
    //   );
    // }

    if (data.guid !== undefined && !this.validateGuid(data.guid)) {
      errors.push(
        `Invalid GUID: must be 1-${WORK_SESSIONS_VALIDATION.GUID.MAX_LENGTH} characters and valid UUID v4 format`,
      );
    }

    return errors;
  }

  /**
   * Validates filter data for searches
   */
  static validateFilterData(data: any): boolean {
    return (
      (data.user && this.validateUserId(data.user)) ||
      (data.site && this.validateSiteId(data.site)) ||
      (data.session_status && this.validateSessionStatus(data.session_status)) ||
      // (data.memo && this.validateMemoId(data.memo)) ||
      (data.session_start_from && !isNaN(new Date(data.session_start_from).getTime())) ||
      (data.session_start_to && !isNaN(new Date(data.session_start_to).getTime())) ||
      (data.session_end_from && !isNaN(new Date(data.session_end_from).getTime())) ||
      (data.session_end_to && !isNaN(new Date(data.session_end_to).getTime())) ||
      (data.guid && this.validateGuid(data.guid))
    );
  }

  /**
   * Gets work session summary statistics
   */
  static getWorkSessionSummary(
    sessions: any[],
    userId?: number,
  ): {
    totalSessions: number;
    openSessions: number;
    closedSessions: number;
    abandonedSessions: number;
    correctedSessions: number;
    averageDurationMinutes: number;
    totalWorkMinutes: number;
    totalPauseMinutes: number;
    siteCounts: Record<number, number>;
  } {
    const filteredSessions = userId
      ? sessions.filter((session) => session.user === userId)
      : sessions;

    const summary = {
      totalSessions: filteredSessions.length,
      openSessions: 0,
      closedSessions: 0,
      abandonedSessions: 0,
      correctedSessions: 0,
      averageDurationMinutes: 0,
      totalWorkMinutes: 0,
      totalPauseMinutes: 0,
      siteCounts: {} as Record<number, number>,
    };

    let totalDuration = 0;
    let completedSessions = 0;

    filteredSessions.forEach((session) => {
      switch (session.session_status) {
        case SessionStatus.OPEN:
          summary.openSessions++;
          break;
        case SessionStatus.CLOSED:
          summary.closedSessions++;
          break;
        case SessionStatus.ABANDONED:
          summary.abandonedSessions++;
          break;
        case SessionStatus.CORRECTED:
          summary.correctedSessions++;
          break;
      }

      // Count sessions by site
      summary.siteCounts[session.site] = (summary.siteCounts[session.site] || 0) + 1;

      // Calculate durations
      if (session.session_end) {
        const duration = this.calculateSessionDuration(session.session_start, session.session_end);
        totalDuration += duration;
        completedSessions++;
      }

      if (session.total_work_duration) {
        summary.totalWorkMinutes += this.parseIntervalToMinutes(session.total_work_duration);
      }

      if (session.total_pause_duration) {
        summary.totalPauseMinutes += this.parseIntervalToMinutes(session.total_pause_duration);
      }
    });

    summary.averageDurationMinutes = completedSessions > 0 ? totalDuration / completedSessions : 0;

    return summary;
  }

  /**
   * Validates business rules for work session operations
   */
  static validateBusinessRules(
    data: any,
    existingSessions: any[],
    siteGeofence?: any,
    options: {
      allowOverlappingSessions?: boolean;
      maxSessionHours?: number;
    } = {},
  ): string[] {
    const errors: string[] = [];
    const { allowOverlappingSessions = false, maxSessionHours = 24 } = options;

    // Check for existing open session
    if (
      data.session_status === SessionStatus.OPEN &&
      this.hasOpenSession(existingSessions, data.user, data.guid)
    ) {
      errors.push('User already has an open session');
    }

    // Check for overlapping sessions
    if (
      !allowOverlappingSessions &&
      this.hasOverlappingSession(
        existingSessions,
        data.user,
        data.session_start,
        data.session_end,
        data.guid,
      )
    ) {
      errors.push('Session overlaps with existing session for this user');
    }

    // Check session duration limits
    if (data.session_end) {
      const durationMinutes = this.calculateSessionDuration(data.session_start, data.session_end);
      if (durationMinutes > maxSessionHours * 60) {
        errors.push(`Session duration exceeds maximum allowed (${maxSessionHours} hours)`);
      }
    }

    // Check geofence violation for start coordinates
    if (
      siteGeofence &&
      data.start_latitude &&
      data.start_longitude &&
      !this.isWithinGeofence(data.start_latitude, data.start_longitude, siteGeofence)
    ) {
      errors.push('Session start coordinates are outside the allowed site geofence');
    }

    // Check geofence violation for end coordinates
    if (
      siteGeofence &&
      data.end_latitude &&
      data.end_longitude &&
      !this.isWithinGeofence(data.end_latitude, data.end_longitude, siteGeofence)
    ) {
      errors.push('Session end coordinates are outside the allowed site geofence');
    }

    return errors;
  }

  /**
   * Generates work session productivity report
   */
  static generateProductivityReport(
    sessions: any[],
    period: { start: Date; end: Date },
    userId?: number,
  ) {
    const periodSessions = sessions.filter((session) => {
      const sessionStart = new Date(session.session_start);
      const matchesUser = !userId || session.user === userId;
      const inPeriod = sessionStart >= period.start && sessionStart <= period.end;
      return matchesUser && inPeriod;
    });

    const summary = this.getWorkSessionSummary(periodSessions, userId);

    // Calculate productivity metrics
    const completionRate = (summary.closedSessions / Math.max(summary.totalSessions, 1)) * 100;
    const abandonmentRate = (summary.abandonedSessions / Math.max(summary.totalSessions, 1)) * 100;
    const correctionRate = (summary.correctedSessions / Math.max(summary.totalSessions, 1)) * 100;

    const workDays = this.calculateWorkDays(periodSessions);
    const avgSessionsPerDay = workDays > 0 ? summary.totalSessions / workDays : 0;
    const avgWorkHoursPerDay = workDays > 0 ? summary.totalWorkMinutes / (workDays * 60) : 0;

    // Identify issues
    const issues: string[] = [];
    if (abandonmentRate > 10) {
      issues.push('High session abandonment rate');
    }
    if (correctionRate > 5) {
      issues.push('High session correction rate');
    }
    if (summary.openSessions > 0) {
      issues.push(`${summary.openSessions} sessions remain unclosed`);
    }
    if (avgWorkHoursPerDay < 4) {
      issues.push('Low average daily work hours');
    }

    return {
      period: {
        start: period.start.toISOString(),
        end: period.end.toISOString(),
      },
      summary,
      metrics: {
        completionRate: Number(completionRate.toFixed(2)),
        abandonmentRate: Number(abandonmentRate.toFixed(2)),
        correctionRate: Number(correctionRate.toFixed(2)),
        avgSessionsPerDay: Number(avgSessionsPerDay.toFixed(2)),
        avgWorkHoursPerDay: Number(avgWorkHoursPerDay.toFixed(2)),
        workDays,
      },
      issues,
      recommendations: this.generateProductivityRecommendations(summary, issues),
    };
  }

  /**
   * Auto-calculates session durations based on time entries
   */
  static calculateSessionDurationsFromEntries(
    session: any,
    timeEntries: any[],
  ): {
    totalWorkDuration: string;
    totalPauseDuration: string;
  } {
    const sessionEntries = timeEntries
      .filter((entry) => entry.session_id === session.id)
      .sort((a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime());

    let totalWorkMinutes = 0;
    let totalPauseMinutes = 0;
    let currentClockIn: Date | null = null;
    let currentPauseStart: Date | null = null;

    sessionEntries.forEach((entry) => {
      const entryTime = new Date(entry.clocked_at);

      switch (entry.pointage_type) {
        case 'clock_in':
          currentClockIn = entryTime;
          break;

        case 'clock_out':
          if (currentClockIn) {
            const workMinutes = (entryTime.getTime() - currentClockIn.getTime()) / (1000 * 60);
            totalWorkMinutes += workMinutes;
            currentClockIn = null;
          }
          break;

        case 'pause_start':
          currentPauseStart = entryTime;
          break;

        case 'pause_end':
          if (currentPauseStart) {
            const pauseMinutes = (entryTime.getTime() - currentPauseStart.getTime()) / (1000 * 60);
            totalPauseMinutes += pauseMinutes;
            currentPauseStart = null;
          }
          break;
      }
    });

    // Handle unclosed sessions
    const sessionEnd = session.session_end ? new Date(session.session_end) : new Date();

    if (currentClockIn) {
      const workMinutes = (sessionEnd.getTime() - (currentClockIn as Date).getTime()) / (1000 * 60);
      totalWorkMinutes += workMinutes;
    }

    if (currentPauseStart) {
      const pauseMinutes =
        (sessionEnd.getTime() - (currentPauseStart as Date).getTime()) / (1000 * 60);
      totalPauseMinutes += pauseMinutes;
    }

    return {
      totalWorkDuration: this.formatDurationAsInterval(totalWorkMinutes),
      totalPauseDuration: this.formatDurationAsInterval(totalPauseMinutes),
    };
  }

  /**
   * Validates session closure requirements
   */
  static validateSessionClosure(
    session: any,
    timeEntries: any[],
  ): { canClose: boolean; errors: string[] } {
    const errors: string[] = [];

    if (session.session_status !== SessionStatus.OPEN) {
      errors.push('Only open sessions can be closed');
      return { canClose: false, errors };
    }

    const sessionEntries = timeEntries
      .filter((entry) => entry.session_id === session.id)
      .sort((a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime());

    if (sessionEntries.length === 0) {
      errors.push('Session has no time entries');
      return { canClose: false, errors };
    }

    // Check for incomplete clock sequences
    let clockInCount = 0;
    let clockOutCount = 0;
    let pauseStartCount = 0;
    let pauseEndCount = 0;

    sessionEntries.forEach((entry) => {
      switch (entry.pointage_type) {
        case 'clock_in':
          clockInCount++;
          break;
        case 'clock_out':
          clockOutCount++;
          break;
        case 'pause_start':
          pauseStartCount++;
          break;
        case 'pause_end':
          pauseEndCount++;
          break;
      }
    });

    if (clockInCount === 0) {
      errors.push('Session must have at least one clock-in');
    }

    if (clockInCount > clockOutCount) {
      errors.push('Session has unclosed clock-in entries');
    }

    if (pauseStartCount > pauseEndCount) {
      errors.push('Session has unclosed pause entries');
    }

    return { canClose: errors.length === 0, errors };
  }

  /**
   * Suggests optimal session end coordinates
   */
  static suggestEndCoordinates(
    session: any,
    timeEntries: any[],
  ): { latitude: number; longitude: number } | null {
    if (session.start_latitude && session.start_longitude) {
      return {
        latitude: session.start_latitude,
        longitude: session.start_longitude,
      };
    }

    // Find last clock-out entry with coordinates
    const sessionEntries = timeEntries
      .filter((entry) => entry.session_id === session.id && entry.latitude && entry.longitude)
      .sort((a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime());

    const lastEntry = sessionEntries[0];
    if (lastEntry) {
      return {
        latitude: lastEntry.latitude,
        longitude: lastEntry.longitude,
      };
    }

    return null;
  }

  /**
   * Detects anomalous session patterns
   */
  static detectSessionAnomalies(sessions: any[]): {
    anomalies: Array<{
      sessionId: string;
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  } {
    const anomalies: Array<{
      sessionId: string;
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    sessions.forEach((session) => {
      // Detect very short sessions
      if (session.session_end) {
        const duration = this.calculateSessionDuration(session.session_start, session.session_end);
        if (duration < 5) {
          anomalies.push({
            sessionId: session.guid,
            type: 'short_session',
            description: 'Session duration is less than 5 minutes',
            severity: 'medium',
          });
        }
      }

      // Detect very long sessions
      if (session.session_end) {
        const duration = this.calculateSessionDuration(session.session_start, session.session_end);
        if (duration > 16 * 60) {
          // More than 16 hours
          anomalies.push({
            sessionId: session.guid,
            type: 'long_session',
            description: 'Session duration exceeds 16 hours',
            severity: 'high',
          });
        }
      }

      // Detect sessions without coordinates
      if (!session.start_latitude || !session.start_longitude) {
        anomalies.push({
          sessionId: session.guid,
          type: 'missing_coordinates',
          description: 'Session missing start coordinates',
          severity: 'low',
        });
      }

      // Detect future session starts
      const sessionStart = new Date(session.session_start);
      if (sessionStart > new Date()) {
        anomalies.push({
          sessionId: session.guid,
          type: 'future_start',
          description: 'Session start time is in the future',
          severity: 'high',
        });
      }

      // Detect sessions with inconsistent durations
      if (session.total_work_duration && session.session_end) {
        const calculatedDuration = this.calculateSessionDuration(
          session.session_start,
          session.session_end,
        );
        const recordedDuration = this.parseIntervalToMinutes(session.total_work_duration);

        if (Math.abs(calculatedDuration - recordedDuration) > 30) {
          // More than 30 minutes difference
          anomalies.push({
            sessionId: session.guid,
            type: 'duration_mismatch',
            description: 'Recorded duration does not match calculated duration',
            severity: 'medium',
          });
        }
      }
    });

    return { anomalies };
  }

  /**
   * Calculates unique work days from sessions
   */
  private static calculateWorkDays(sessions: any[]): number {
    const workDays = new Set<string>();
    sessions.forEach((session) => {
      const date = new Date(session.session_start);
      const dayKey = date.toDateString();
      workDays.add(dayKey);
    });
    return workDays.size;
  }

  /**
   * Generates productivity recommendations
   */
  private static generateProductivityRecommendations(summary: any, issues: string[]): string[] {
    const recommendations: string[] = [];

    if (issues.includes('High session abandonment rate')) {
      recommendations.push('Review reasons for session abandonment and provide better guidance');
    }

    if (issues.includes('High session correction rate')) {
      recommendations.push('Improve time tracking accuracy and user training');
    }

    if (issues.includes('sessions remain unclosed')) {
      recommendations.push('Implement automated session closure or regular reminders');
    }

    if (issues.includes('Low average daily work hours')) {
      recommendations.push('Review work schedules and identify potential productivity barriers');
    }

    if (summary.totalSessions > 0 && summary.averageDurationMinutes < 60) {
      recommendations.push('Consider if frequent short sessions indicate workflow interruptions');
    }

    if (summary.totalPauseMinutes > summary.totalWorkMinutes * 0.3) {
      recommendations.push('High pause time detected - review break patterns and policies');
    }

    return recommendations;
  }
}
