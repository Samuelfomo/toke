"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeEntriesValidationUtils = void 0;
// utils/time.entries.validation.ts
const time_entries_js_1 = require("../../constants/tenant/time.entries.js");
const timezone_config_validation_js_1 = require("../timezone.config.validation.js");
class TimeEntriesValidationUtils {
    /**
     * Validates GUID
     */
    static validateGuid(guid) {
        if (!guid || typeof guid !== 'string')
            return false;
        const trimmed = guid.trim();
        // Check length
        if (trimmed.length < time_entries_js_1.TIME_ENTRIES_VALIDATION.GUID.MIN_LENGTH ||
            trimmed.length > time_entries_js_1.TIME_ENTRIES_VALIDATION.GUID.MAX_LENGTH) {
            return false;
        }
        const uuidRegex = /^[0-9]+$/;
        // UUID v4 regex
        // const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(trimmed);
    }
    /**
     * Validates session ID
     */
    static validateSessionId(sessionId) {
        if (typeof sessionId !== 'number' || !Number.isInteger(sessionId))
            return false;
        return (sessionId >= time_entries_js_1.TIME_ENTRIES_VALIDATION.SESSION.MIN &&
            sessionId <= time_entries_js_1.TIME_ENTRIES_VALIDATION.SESSION.MAX);
    }
    /**
     * Validates user ID
     */
    static validateUserId(userId) {
        if (typeof userId !== 'string')
            return false;
        return (userId.length >= time_entries_js_1.TIME_ENTRIES_VALIDATION.USER.MIN_LENGTH &&
            userId.length <= time_entries_js_1.TIME_ENTRIES_VALIDATION.USER.MAX_LENGTH);
    }
    /**
     * Validates site ID
     */
    static validateSiteId(siteId) {
        if (typeof siteId !== 'string')
            return false;
        return (siteId.length >= time_entries_js_1.TIME_ENTRIES_VALIDATION.SITE.MIN_LENGTH &&
            siteId.length <= time_entries_js_1.TIME_ENTRIES_VALIDATION.SITE.MAX_LENGTH);
    }
    /**
     * Validates pointage type
     */
    static validatePointageType(pointageType) {
        if (!pointageType || typeof pointageType !== 'string')
            return false;
        return Object.values(time_entries_js_1.PointageType).includes(pointageType);
    }
    /**
     * Validates pointage status
     */
    static validatePointageStatus(status) {
        if (!status || typeof status !== 'string')
            return false;
        return Object.values(time_entries_js_1.PointageStatus).includes(status);
    }
    /**
     * Validates clocked at date
     */
    // static validateClockedAt(clockedAt: Date | string): boolean {
    //   if (!clockedAt) return false;
    //   const date = new Date(clockedAt);
    //   if (isNaN(date.getTime())) return false;
    //
    //   // Cannot be in the future (allowing current time with 1 minute tolerance)
    //   const now = TimezoneConfigUtils.getCurrentTime();
    //   now.setMinutes(now.getMinutes() + 1);
    //   return date <= now;
    // }
    static validateClockedAt(clockedAt) {
        if (!clockedAt)
            return false;
        const date = new Date(clockedAt);
        if (isNaN(date.getTime()))
            return false;
        //   // Cannot be in the future (allowing current time with 1 minute tolerance)
        //   const now = TimezoneConfigUtils.getCurrentTime();
        //   now.setMinutes(now.getMinutes() + 1);
        //   return date <= now;
        // Obtenir l'heure actuelle au timezone Africa/Douala
        const nowInDouala = new Date(timezone_config_validation_js_1.TimezoneConfigUtils.getCurrentTime().toLocaleString('en-US', { timeZone: 'Africa/Douala' }));
        nowInDouala.setMinutes(nowInDouala.getMinutes() + 1); // Tolérance 1 minute
        return date <= nowInDouala;
    }
    /**
     * Validates real clocked at date
     */
    static validateRealClockedAt(realClockedAt) {
        if (realClockedAt === null || realClockedAt === undefined)
            return true;
        const date = new Date(realClockedAt);
        return !isNaN(date.getTime());
    }
    /**
     * Validates latitude
     */
    static validateLatitude(latitude) {
        if (typeof latitude !== 'number')
            return false;
        return (latitude >= time_entries_js_1.TIME_ENTRIES_VALIDATION.LATITUDE.MIN &&
            latitude <= time_entries_js_1.TIME_ENTRIES_VALIDATION.LATITUDE.MAX &&
            this.validateDecimalPlaces(latitude, time_entries_js_1.TIME_ENTRIES_VALIDATION.LATITUDE.DECIMAL_PLACES));
    }
    /**
     * Validates longitude
     */
    static validateLongitude(longitude) {
        if (typeof longitude !== 'number')
            return false;
        return (longitude >= time_entries_js_1.TIME_ENTRIES_VALIDATION.LONGITUDE.MIN &&
            longitude <= time_entries_js_1.TIME_ENTRIES_VALIDATION.LONGITUDE.MAX &&
            this.validateDecimalPlaces(longitude, time_entries_js_1.TIME_ENTRIES_VALIDATION.LONGITUDE.DECIMAL_PLACES));
    }
    /**
     * Validates decimal places
     */
    static validateDecimalPlaces(value, maxPlaces) {
        const str = value.toString();
        const decimalIndex = str.indexOf('.');
        if (decimalIndex === -1)
            return true; // No decimal places
        return str.length - decimalIndex - 1 <= maxPlaces;
    }
    /**
     * Validates GPS accuracy
     */
    static validateGpsAccuracy(accuracy) {
        if (accuracy === null || accuracy === undefined)
            return true;
        if (typeof accuracy !== 'number' || !Number.isInteger(accuracy))
            return false;
        return (accuracy >= time_entries_js_1.TIME_ENTRIES_VALIDATION.GPS_ACCURACY.MIN &&
            accuracy <= time_entries_js_1.TIME_ENTRIES_VALIDATION.GPS_ACCURACY.MAX);
    }
    /**
     * Validates QrCode
     */
    static validateQrCode(qr_code) {
        if (qr_code === null || qr_code === undefined)
            return true;
        if (typeof qr_code !== 'string')
            return false;
        return (qr_code.length >= time_entries_js_1.TIME_ENTRIES_VALIDATION.QR_CODE.MIN_LENGTH &&
            qr_code.length <= time_entries_js_1.TIME_ENTRIES_VALIDATION.QR_CODE.MAX_LENGTH);
    }
    /**
     * Validates device info
     */
    static validateDeviceInfo(deviceInfo) {
        if (deviceInfo === null || deviceInfo === undefined)
            return true;
        if (typeof deviceInfo !== 'object' || Array.isArray(deviceInfo))
            return false;
        try {
            JSON.stringify(deviceInfo);
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Validates IP address (IPv4 and IPv6)
     */
    static validateIpAddress(ipAddress) {
        if (ipAddress === null || ipAddress === undefined)
            return true;
        if (typeof ipAddress !== 'string')
            return false;
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(ipAddress) || ipv6Regex.test(ipAddress);
    }
    /**
     * Validates created offline flag
     */
    static validateCreatedOffline(createdOffline) {
        return typeof createdOffline === 'boolean';
    }
    /**
     * Validates local ID
     */
    static validateLocalId(localId) {
        if (localId === null || localId === undefined)
            return true;
        if (typeof localId !== 'string')
            return false;
        const trimmed = localId.trim();
        return (trimmed.length >= time_entries_js_1.TIME_ENTRIES_VALIDATION.LOCAL_ID.MIN_LENGTH &&
            trimmed.length <= time_entries_js_1.TIME_ENTRIES_VALIDATION.LOCAL_ID.MAX_LENGTH);
    }
    /**
     * Validates sync attempts
     */
    static validateSyncAttempts(syncAttempts) {
        if (typeof syncAttempts !== 'number' || !Number.isInteger(syncAttempts))
            return false;
        return (syncAttempts >= time_entries_js_1.TIME_ENTRIES_VALIDATION.SYNC_ATTEMPTS.MIN &&
            syncAttempts <= time_entries_js_1.TIME_ENTRIES_VALIDATION.SYNC_ATTEMPTS.MAX);
    }
    /**
     * Validates last sync attempt date
     */
    static validateLastSyncAttempt(lastSyncAttempt) {
        if (lastSyncAttempt === null || lastSyncAttempt === undefined)
            return true;
        const date = new Date(lastSyncAttempt);
        return !isNaN(date.getTime());
    }
    /**
     * Validates memo ID
     */
    static validateMemoId(memoId) {
        if (memoId === null || memoId === undefined)
            return true;
        if (typeof memoId !== 'number' || !Number.isInteger(memoId))
            return false;
        return memoId >= time_entries_js_1.TIME_ENTRIES_VALIDATION.MEMO.MIN && memoId <= time_entries_js_1.TIME_ENTRIES_VALIDATION.MEMO.MAX;
    }
    /**
     * Validates correction reason
     */
    static validateCorrectionReason(reason, status) {
        // Required for corrected entries
        if (status === time_entries_js_1.PointageStatus.CORRECTED) {
            if (!reason || typeof reason !== 'string')
                return false;
            const trimmed = reason.trim();
            return (trimmed.length >= time_entries_js_1.TIME_ENTRIES_VALIDATION.CORRECTION_REASON.MIN_LENGTH &&
                trimmed.length <= time_entries_js_1.TIME_ENTRIES_VALIDATION.CORRECTION_REASON.MAX_LENGTH);
        }
        // Optional for other statuses
        if (reason === null || reason === undefined)
            return true;
        if (typeof reason !== 'string')
            return false;
        const trimmed = reason.trim();
        return (trimmed.length >= time_entries_js_1.TIME_ENTRIES_VALIDATION.CORRECTION_REASON.MIN_LENGTH &&
            trimmed.length <= time_entries_js_1.TIME_ENTRIES_VALIDATION.CORRECTION_REASON.MAX_LENGTH);
    }
    /**
     * Validates pagination parameters
     */
    static validatePaginationParams(offset, limit) {
        var _a;
        return (Number.isInteger(offset) &&
            Number.isInteger(limit) &&
            offset >= 0 &&
            limit > 0 &&
            limit <= ((_a = time_entries_js_1.TIME_ENTRIES_DEFAULTS.PAGINATION) === null || _a === void 0 ? void 0 : _a.MAX_LIMIT));
    }
    /**
     * Checks if pointage is too old
     */
    static isPointageTooOld(clockedAt, maxAgeHours = 48) {
        const pointageDate = new Date(clockedAt);
        const now = timezone_config_validation_js_1.TimezoneConfigUtils.getCurrentTime();
        const ageHours = (now.getTime() - pointageDate.getTime()) / (1000 * 60 * 60);
        return ageHours > maxAgeHours;
    }
    /**
     * Validates GPS accuracy is sufficient
     */
    static isGpsAccuracySufficient(accuracy, minAccuracy = 50) {
        return accuracy <= minAccuracy; // Lower values mean better accuracy
    }
    /**
     * Validates coordinates are within geofence
     */
    static isWithinGeofence(latitude, longitude, siteGeofence) {
        if (!siteGeofence || !siteGeofence.coordinates)
            return false;
        try {
            // Basic point-in-polygon check (simplified)
            const coords = siteGeofence.coordinates[0]; // Outer ring
            const x = longitude, y = latitude;
            let inside = false;
            for (let i = 0, j = coords.length - 2; i < coords.length - 1; j = i++) {
                const xi = coords[i][0], yi = coords[i][1];
                const xj = coords[j][0], yj = coords[j][1];
                if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
                    inside = !inside;
                }
            }
            return inside;
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Validates pointage sequence
     */
    static validatePointageSequence(newEntry, userEntries) {
        const activeEntries = userEntries
            .filter((entry) => entry.pointage_status !== time_entries_js_1.PointageStatus.REJECTED)
            .sort((a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime());
        const lastEntry = activeEntries[activeEntries.length - 1];
        switch (newEntry.pointage_type) {
            case time_entries_js_1.PointageType.CLOCK_IN:
                if (lastEntry && lastEntry.pointage_type === time_entries_js_1.PointageType.CLOCK_IN) {
                    return { valid: false, error: 'Previous clock in must be closed before new clock in' };
                }
                break;
            case time_entries_js_1.PointageType.CLOCK_OUT:
                if (!lastEntry || lastEntry.pointage_type !== time_entries_js_1.PointageType.CLOCK_IN) {
                    return { valid: false, error: 'Clock out requires an active clock in' };
                }
                break;
            case time_entries_js_1.PointageType.PAUSE_START:
            case time_entries_js_1.PointageType.PAUSE_END:
                const hasActiveClock = activeEntries.some((entry) => entry.pointage_type === time_entries_js_1.PointageType.CLOCK_IN &&
                    !activeEntries.some((outEntry) => outEntry.pointage_type === time_entries_js_1.PointageType.CLOCK_OUT &&
                        new Date(outEntry.clocked_at) > new Date(entry.clocked_at)));
                if (!hasActiveClock) {
                    return { valid: false, error: 'Pause requires an active work session' };
                }
                break;
            case time_entries_js_1.PointageType.EXTERNAL_MISSION:
                // External mission can be standalone
                break;
        }
        return { valid: true };
    }
    /**
     * Validates status transition
     */
    static validateStatusTransition(currentStatus, newStatus) {
        var _a;
        const validTransitions = {
            [time_entries_js_1.PointageStatus.DRAFT]: [time_entries_js_1.PointageStatus.PENDING, time_entries_js_1.PointageStatus.REJECTED],
            [time_entries_js_1.PointageStatus.PENDING]: [
                time_entries_js_1.PointageStatus.ACCEPTED,
                time_entries_js_1.PointageStatus.CORRECTED,
                time_entries_js_1.PointageStatus.REJECTED,
            ],
            [time_entries_js_1.PointageStatus.ACCEPTED]: [time_entries_js_1.PointageStatus.CORRECTED, time_entries_js_1.PointageStatus.ACCOUNTED],
            [time_entries_js_1.PointageStatus.CORRECTED]: [time_entries_js_1.PointageStatus.ACCEPTED, time_entries_js_1.PointageStatus.REJECTED],
            [time_entries_js_1.PointageStatus.ACCOUNTED]: [], // Final status
            [time_entries_js_1.PointageStatus.REJECTED]: [time_entries_js_1.PointageStatus.PENDING], // Allow resubmission
        };
        return ((_a = validTransitions[currentStatus]) === null || _a === void 0 ? void 0 : _a.includes(newStatus)) || false;
    }
    /**
     * Detects duplicate pointage
     */
    static hasDuplicatePointage(newEntry, existingEntries, toleranceMinutes = 5) {
        const newDate = new Date(newEntry.clocked_at);
        const tolerance = toleranceMinutes * 60 * 1000; // Convert to milliseconds
        return existingEntries.some((entry) => {
            if (entry.guid === newEntry.guid)
                return false; // Skip self
            if (entry.user !== newEntry.user)
                return false;
            if (entry.pointage_type !== newEntry.pointage_type)
                return false;
            const entryDate = new Date(entry.clocked_at);
            const timeDiff = Math.abs(newDate.getTime() - entryDate.getTime());
            return timeDiff <= tolerance;
        });
    }
    /**
     * Cleans and normalizes time entry data
     */
    static cleanTimeEntryData(data) {
        const cleaned = Object.assign({}, data);
        // Convert numeric fields
        ['session', 'user', 'site', 'gps_accuracy', 'sync_attempts', 'memo', 'qr_code'].forEach((field) => {
            if (cleaned[field] !== undefined && cleaned[field] !== null) {
                cleaned[field] = Number(cleaned[field]);
            }
        });
        // Convert coordinate fields to precise numbers
        if (cleaned.latitude !== undefined && cleaned.latitude !== null) {
            cleaned.latitude = parseFloat(Number(cleaned.latitude).toFixed(time_entries_js_1.TIME_ENTRIES_VALIDATION.LATITUDE.DECIMAL_PLACES));
        }
        if (cleaned.longitude !== undefined && cleaned.longitude !== null) {
            cleaned.longitude = parseFloat(Number(cleaned.longitude).toFixed(time_entries_js_1.TIME_ENTRIES_VALIDATION.LONGITUDE.DECIMAL_PLACES));
        }
        // Clean string fields
        ['pointage_type', 'pointage_status', 'ip_address', 'local_id', 'correction_reason'].forEach((field) => {
            if (cleaned[field] !== undefined && cleaned[field] !== null) {
                cleaned[field] = cleaned[field].toString().trim();
            }
        });
        // Clean GUID
        if (cleaned.guid !== undefined && cleaned.guid !== null) {
            cleaned.guid = cleaned.guid.toString().trim();
        }
        // Convert boolean fields
        if (cleaned.created_offline !== undefined) {
            cleaned.created_offline = Boolean(cleaned.created_offline);
        }
        // Convert dates
        ['clocked_at', 'real_clocked_at', 'last_sync_attempt'].forEach((field) => {
            if (cleaned[field] !== undefined && cleaned[field] !== null) {
                const date = new Date(cleaned[field]);
                if (isNaN(date.getTime())) {
                    throw new Error(`Invalid ${field}: must be a valid date`);
                }
                cleaned[field] = date;
            }
        });
        // Parse JSON fields if they come as strings
        if (cleaned.device_info !== undefined &&
            cleaned.device_info !== null &&
            typeof cleaned.device_info === 'string') {
            try {
                cleaned.device_info = JSON.parse(cleaned.device_info);
            }
            catch (_a) {
                throw new Error('Invalid device_info: must be valid JSON');
            }
        }
        return cleaned;
    }
    /**
     * Validates that a time entry is complete for creation
     */
    static isValidForCreation(data) {
        const requiredFields = [
            'session',
            'user',
            'site',
            'pointage_type',
            'clocked_at',
            'latitude',
            'longitude',
        ];
        // Check required fields
        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null) {
                return false;
            }
        }
        return (this.validateSessionId(data.session) &&
            this.validateUserId(data.user) &&
            this.validateSiteId(data.site) &&
            this.validatePointageType(data.pointage_type) &&
            (data.pointage_status === undefined || this.validatePointageStatus(data.pointage_status)) &&
            this.validateClockedAt(data.clocked_at) &&
            this.validateRealClockedAt(data.real_clocked_at) &&
            this.validateLatitude(data.latitude) &&
            this.validateLongitude(data.longitude) &&
            this.validateGpsAccuracy(data.gps_accuracy) &&
            this.validateQrCode(data.qr_code) &&
            this.validateDeviceInfo(data.device_info) &&
            this.validateIpAddress(data.ip_address) &&
            (data.created_offline === undefined || this.validateCreatedOffline(data.created_offline)) &&
            this.validateLocalId(data.local_id) &&
            (data.sync_attempts === undefined || this.validateSyncAttempts(data.sync_attempts)) &&
            this.validateLastSyncAttempt(data.last_sync_attempt) &&
            this.validateMemoId(data.memo) &&
            this.validateCorrectionReason(data.correction_reason, data.pointage_status) &&
            (data.guid === undefined || this.validateGuid(data.guid)));
    }
    /**
     * Validates that a time entry is valid for update
     */
    static isValidForUpdate(data) {
        // For updates, validate only fields that are present
        const validations = [
            data.session === undefined || this.validateSessionId(data.session),
            data.user === undefined || this.validateUserId(data.user),
            data.site === undefined || this.validateSiteId(data.site),
            data.pointage_type === undefined || this.validatePointageType(data.pointage_type),
            data.pointage_status === undefined || this.validatePointageStatus(data.pointage_status),
            data.clocked_at === undefined || this.validateClockedAt(data.clocked_at),
            data.real_clocked_at === undefined || this.validateRealClockedAt(data.real_clocked_at),
            data.latitude === undefined || this.validateLatitude(data.latitude),
            data.longitude === undefined || this.validateLongitude(data.longitude),
            data.gps_accuracy === undefined || this.validateGpsAccuracy(data.gps_accuracy),
            data.qr_code === undefined || this.validateQrCode(data.qr_code),
            data.device_info === undefined || this.validateDeviceInfo(data.device_info),
            data.ip_address === undefined || this.validateIpAddress(data.ip_address),
            data.created_offline === undefined || this.validateCreatedOffline(data.created_offline),
            data.local_id === undefined || this.validateLocalId(data.local_id),
            data.sync_attempts === undefined || this.validateSyncAttempts(data.sync_attempts),
            data.last_sync_attempt === undefined || this.validateLastSyncAttempt(data.last_sync_attempt),
            data.memo === undefined || this.validateMemoId(data.memo),
            data.correction_reason === undefined ||
                this.validateCorrectionReason(data.correction_reason, data.pointage_status),
            data.guid === undefined || this.validateGuid(data.guid),
        ];
        return validations.every((validation) => validation);
    }
    /**
     * Extracts validation errors for a time entry
     */
    static getValidationErrors(data) {
        const errors = [];
        if (data.session === undefined ||
            data.session === null ||
            !this.validateSessionId(data.session)) {
            errors.push(`Invalid session: must be between ${time_entries_js_1.TIME_ENTRIES_VALIDATION.SESSION.MIN} and ${time_entries_js_1.TIME_ENTRIES_VALIDATION.SESSION.MAX}`);
        }
        if (data.user === undefined || data.user === null || !this.validateUserId(data.user)) {
            errors.push(`Invalid user: must be between ${time_entries_js_1.TIME_ENTRIES_VALIDATION.USER.MIN_LENGTH} and ${time_entries_js_1.TIME_ENTRIES_VALIDATION.USER.MAX_LENGTH}`);
        }
        if (data.site === undefined || data.site === null || !this.validateSiteId(data.site)) {
            errors.push(`Invalid site: must be between ${time_entries_js_1.TIME_ENTRIES_VALIDATION.SITE.MIN_LENGTH} and ${time_entries_js_1.TIME_ENTRIES_VALIDATION.SITE.MAX_LENGTH}`);
        }
        if (data.pointage_type === undefined ||
            data.pointage_type === null ||
            !this.validatePointageType(data.pointage_type)) {
            errors.push(`Invalid pointage_type: must be one of ${Object.values(time_entries_js_1.PointageType).join(', ')}`);
        }
        if (data.pointage_status !== undefined && !this.validatePointageStatus(data.pointage_status)) {
            errors.push(`Invalid pointage_status: must be one of ${Object.values(time_entries_js_1.PointageStatus).join(', ')}`);
        }
        if (data.clocked_at === undefined ||
            data.clocked_at === null ||
            !this.validateClockedAt(data.clocked_at)) {
            errors.push('Invalid clocked_at: must be a valid date not in the future');
        }
        if (data.real_clocked_at !== undefined && !this.validateRealClockedAt(data.real_clocked_at)) {
            errors.push('Invalid real_clocked_at: must be a valid date');
        }
        if (data.latitude === undefined ||
            data.latitude === null ||
            !this.validateLatitude(data.latitude)) {
            errors.push(`Invalid latitude: must be between ${time_entries_js_1.TIME_ENTRIES_VALIDATION.LATITUDE.MIN} and ${time_entries_js_1.TIME_ENTRIES_VALIDATION.LATITUDE.MAX} with max ${time_entries_js_1.TIME_ENTRIES_VALIDATION.LATITUDE.DECIMAL_PLACES} decimal places`);
        }
        if (data.longitude === undefined ||
            data.longitude === null ||
            !this.validateLongitude(data.longitude)) {
            errors.push(`Invalid longitude: must be between ${time_entries_js_1.TIME_ENTRIES_VALIDATION.LONGITUDE.MIN} and ${time_entries_js_1.TIME_ENTRIES_VALIDATION.LONGITUDE.MAX} with max ${time_entries_js_1.TIME_ENTRIES_VALIDATION.LONGITUDE.DECIMAL_PLACES} decimal places`);
        }
        if (data.gps_accuracy !== undefined && !this.validateGpsAccuracy(data.gps_accuracy)) {
            errors.push(`Invalid gps_accuracy: must be between ${time_entries_js_1.TIME_ENTRIES_VALIDATION.GPS_ACCURACY.MIN} and ${time_entries_js_1.TIME_ENTRIES_VALIDATION.GPS_ACCURACY.MAX}`);
        }
        if (data.device_info !== undefined && !this.validateDeviceInfo(data.device_info)) {
            errors.push('Invalid device_info: must be a valid JSON object');
        }
        if (data.ip_address !== undefined && !this.validateIpAddress(data.ip_address)) {
            errors.push('Invalid ip_address: must be a valid IPv4 or IPv6 address');
        }
        if (data.created_offline !== undefined && !this.validateCreatedOffline(data.created_offline)) {
            errors.push('Invalid created_offline: must be a boolean value');
        }
        if (data.local_id !== undefined && !this.validateLocalId(data.local_id)) {
            errors.push(`Invalid local_id: must be 1-${time_entries_js_1.TIME_ENTRIES_VALIDATION.LOCAL_ID.MAX_LENGTH} characters`);
        }
        if (data.sync_attempts !== undefined && !this.validateSyncAttempts(data.sync_attempts)) {
            errors.push(`Invalid sync_attempts: must be between ${time_entries_js_1.TIME_ENTRIES_VALIDATION.SYNC_ATTEMPTS.MIN} and ${time_entries_js_1.TIME_ENTRIES_VALIDATION.SYNC_ATTEMPTS.MAX}`);
        }
        if (data.last_sync_attempt !== undefined &&
            !this.validateLastSyncAttempt(data.last_sync_attempt)) {
            errors.push('Invalid last_sync_attempt: must be a valid date');
        }
        if (data.memo !== undefined && !this.validateMemoId(data.memo)) {
            errors.push(`Invalid memo: must be between ${time_entries_js_1.TIME_ENTRIES_VALIDATION.MEMO.MIN} and ${time_entries_js_1.TIME_ENTRIES_VALIDATION.MEMO.MAX}`);
        }
        if (data.qr_code !== undefined && !this.validateQrCode(data.qr_code)) {
            errors.push(`Invalid qr_code: must be between ${time_entries_js_1.TIME_ENTRIES_VALIDATION.QR_CODE.MIN_LENGTH} and ${time_entries_js_1.TIME_ENTRIES_VALIDATION.QR_CODE.MAX_LENGTH}`);
        }
        if (!this.validateCorrectionReason(data.correction_reason, data.pointage_status)) {
            if (data.pointage_status === time_entries_js_1.PointageStatus.CORRECTED) {
                errors.push('Correction reason is required for corrected entries');
            }
            else {
                errors.push(`Invalid correction_reason: must be ${time_entries_js_1.TIME_ENTRIES_VALIDATION.CORRECTION_REASON.MIN_LENGTH}-${time_entries_js_1.TIME_ENTRIES_VALIDATION.CORRECTION_REASON.MAX_LENGTH} characters`);
            }
        }
        if (data.guid !== undefined && !this.validateGuid(data.guid)) {
            errors.push(`Invalid GUID: must be 1-${time_entries_js_1.TIME_ENTRIES_VALIDATION.GUID.MAX_LENGTH} characters and valid UUID v4 format`);
        }
        return errors;
    }
    /**
     * Validates filter data for searches
     */
    static validateFilterData(data) {
        return ((data.session && this.validateSessionId(data.session)) ||
            (data.user && this.validateUserId(data.user)) ||
            (data.site && this.validateSiteId(data.site)) ||
            (data.pointage_type && this.validatePointageType(data.pointage_type)) ||
            (data.pointage_status && this.validatePointageStatus(data.pointage_status)) ||
            (data.created_offline !== undefined && this.validateCreatedOffline(data.created_offline)) ||
            (data.clocked_at_from && !isNaN(new Date(data.clocked_at_from).getTime())) ||
            (data.clocked_at_to && !isNaN(new Date(data.clocked_at_to).getTime())) ||
            (data.guid && this.validateGuid(data.guid)));
    }
    /**
     * Calculates work duration between clock in/out
     */
    static calculateWorkDuration(clockIn, clockOut) {
        const inTime = new Date(clockIn);
        const outTime = new Date(clockOut);
        return Math.max(0, outTime.getTime() - inTime.getTime());
    }
    /**
     * Gets time entry summary for a user
     */
    static getTimeEntrySummary(entries, userId) {
        const userEntries = entries.filter((entry) => entry.user === userId);
        const summary = {
            totalEntries: userEntries.length,
            clockIns: 0,
            clockOuts: 0,
            pauses: 0,
            statusCounts: {},
            offlineEntries: 0,
            averageGpsAccuracy: 0,
        };
        let totalAccuracy = 0;
        let accuracyCount = 0;
        userEntries.forEach((entry) => {
            switch (entry.pointage_type) {
                case time_entries_js_1.PointageType.CLOCK_IN:
                    summary.clockIns++;
                    break;
                case time_entries_js_1.PointageType.CLOCK_OUT:
                    summary.clockOuts++;
                    break;
                case time_entries_js_1.PointageType.PAUSE_START:
                case time_entries_js_1.PointageType.PAUSE_END:
                    summary.pauses++;
                    break;
            }
            const status = entry.pointage_status || time_entries_js_1.PointageStatus.PENDING;
            summary.statusCounts[status] = (summary.statusCounts[status] || 0) + 1;
            if (entry.created_offline) {
                summary.offlineEntries++;
            }
            if (entry.gps_accuracy) {
                totalAccuracy += entry.gps_accuracy;
                accuracyCount++;
            }
        });
        summary.averageGpsAccuracy = accuracyCount > 0 ? totalAccuracy / accuracyCount : 0;
        return summary;
    }
    /**
     * Validates business rules for time entry creation
     */
    static validateBusinessRules(data, existingEntries, siteGeofence, options = {}) {
        const errors = [];
        const { maxAgeHours = 48, minGpsAccuracy = 50, toleranceMinutes = 5 } = options;
        // Check if pointage is too old
        if (data.clocked_at && this.isPointageTooOld(data.clocked_at, maxAgeHours)) {
            errors.push('Pointage is too old to be accepted');
        }
        // Check GPS accuracy
        if (data.gps_accuracy && !this.isGpsAccuracySufficient(data.gps_accuracy, minGpsAccuracy)) {
            errors.push('GPS accuracy is too low for reliable time tracking');
        }
        // Check geofence violation
        if (siteGeofence &&
            data.latitude &&
            data.longitude &&
            !this.isWithinGeofence(data.latitude, data.longitude, siteGeofence)) {
            errors.push('Pointage coordinates are outside the allowed site geofence');
        }
        // Check for duplicate pointage
        if (this.hasDuplicatePointage(data, existingEntries, toleranceMinutes)) {
            errors.push('Duplicate pointage detected for the same time period');
        }
        // Check pointage sequence
        const sequenceValidation = this.validatePointageSequence(data, existingEntries);
        if (!sequenceValidation.valid && sequenceValidation.error) {
            errors.push(sequenceValidation.error);
        }
        // Check status transition if updating
        if (data.current_status &&
            data.pointage_status &&
            !this.validateStatusTransition(data.current_status, data.pointage_status)) {
            errors.push('Invalid status transition');
        }
        return errors;
    }
    /**
     * Detects offline sync conflicts
     */
    static detectOfflineSyncConflicts(offlineEntries, serverEntries) {
        const conflicts = [];
        const resolutions = [];
        offlineEntries.forEach((offlineEntry) => {
            const serverEntry = serverEntries.find((entry) => entry.local_id === offlineEntry.local_id ||
                (entry.user === offlineEntry.user &&
                    entry.pointage_type === offlineEntry.pointage_type &&
                    Math.abs(new Date(entry.clocked_at).getTime() - new Date(offlineEntry.clocked_at).getTime()) < 300000));
            if (serverEntry) {
                conflicts.push({
                    offline: offlineEntry,
                    server: serverEntry,
                    type: 'duplicate_entry',
                });
            }
            else {
                resolutions.push(offlineEntry);
            }
        });
        return { conflicts, resolutions };
    }
    /**
     * Calculates total work hours for a period
     */
    static calculateWorkHours(entries, startDate, endDate) {
        let filteredEntries = entries;
        if (startDate || endDate) {
            filteredEntries = entries.filter((entry) => {
                const entryDate = new Date(entry.clocked_at);
                if (startDate && entryDate < startDate)
                    return false;
                return !(endDate && entryDate > endDate);
            });
        }
        const workSessions = [];
        let currentSession = null;
        // Group entries by work sessions
        filteredEntries
            .sort((a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime())
            .forEach((entry) => {
            const entryTime = new Date(entry.clocked_at);
            switch (entry.pointage_type) {
                case time_entries_js_1.PointageType.CLOCK_IN:
                    currentSession = { start: entryTime, end: null, pauses: 0 };
                    break;
                case time_entries_js_1.PointageType.CLOCK_OUT:
                    if (currentSession) {
                        currentSession.end = entryTime;
                        workSessions.push(currentSession);
                        currentSession = null;
                    }
                    break;
                case time_entries_js_1.PointageType.PAUSE_START:
                case time_entries_js_1.PointageType.PAUSE_END:
                    if (currentSession) {
                        currentSession.pauses += 0.5; // Each pause event counts as 0.5 (start + end = 1 pause)
                    }
                    break;
            }
        });
        // Add incomplete session if exists
        if (currentSession) {
            workSessions.push(currentSession);
        }
        let totalMinutes = 0;
        let pauseMinutes = 0;
        const workDaysSet = new Set();
        workSessions.forEach((session) => {
            const endTime = session.end || timezone_config_validation_js_1.TimezoneConfigUtils.getCurrentTime();
            const sessionMinutes = (endTime.getTime() - session.start.getTime()) / (1000 * 60);
            totalMinutes += sessionMinutes;
            pauseMinutes += session.pauses * 15; // Assume 15 minutes per pause
            // Count work days
            const dayKey = session.start.toDateString();
            workDaysSet.add(dayKey);
        });
        const totalHours = totalMinutes / 60;
        const pauseHours = pauseMinutes / 60;
        const netHours = totalHours - pauseHours;
        const regularHours = Math.min(netHours, 8); // Assume 8 hours is regular
        const overtimeHours = Math.max(0, netHours - 8);
        return {
            totalHours: totalHours,
            regularHours,
            overtimeHours,
            pauseHours,
            workDays: workDaysSet.size,
        };
    }
    /**
     * Generates time tracking report
     */
    static generateTimeTrackingReport(entries, userId, period) {
        const userEntries = entries.filter((entry) => entry.user === userId &&
            new Date(entry.clocked_at) >= period.start &&
            new Date(entry.clocked_at) <= period.end);
        const summary = this.getTimeEntrySummary(entries, userId);
        const workHours = this.calculateWorkHours(userEntries, period.start, period.end);
        // Group by status
        const statusBreakdown = {};
        Object.values(time_entries_js_1.PointageStatus).forEach((status) => {
            statusBreakdown[status] = userEntries.filter((entry) => entry.pointage_status === status).length;
        });
        // Group by site
        const siteBreakdown = {};
        userEntries.forEach((entry) => {
            siteBreakdown[entry.site] = (siteBreakdown[entry.site] || 0) + 1;
        });
        // Identify issues
        const issues = [];
        if (summary.clockIns !== summary.clockOuts) {
            issues.push('Mismatched clock in/out entries');
        }
        if (summary.offlineEntries > 0) {
            issues.push(`${summary.offlineEntries} entries created offline`);
        }
        if (summary.averageGpsAccuracy > 100) {
            issues.push('Poor GPS accuracy detected');
        }
        return {
            period: {
                start: period.start.toISOString(),
                end: period.end.toISOString(),
            },
            summary: Object.assign(Object.assign({}, summary), workHours),
            statusBreakdown,
            siteBreakdown,
            issues,
            completeness: {
                percentage: (summary.clockOuts / Math.max(summary.clockIns, 1)) * 100,
                missingSessions: Math.max(0, summary.clockIns - summary.clockOuts),
            },
        };
    }
}
exports.TimeEntriesValidationUtils = TimeEntriesValidationUtils;
