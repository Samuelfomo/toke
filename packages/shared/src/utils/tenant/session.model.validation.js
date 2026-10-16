"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionModelValidationUtils = void 0;
// utils/session.model.validation.ts
const session_model_js_1 = require("../../constants/tenant/session.model.js");
class SessionModelValidationUtils {
    /**
     * Validates name format
     */
    static validateName(name) {
        if (!name || typeof name !== 'string')
            return false;
        const trimmed = name.trim();
        return (trimmed.length >= session_model_js_1.SESSION_MODEL_VALIDATION.NAME.MIN_LENGTH &&
            trimmed.length <= session_model_js_1.SESSION_MODEL_VALIDATION.NAME.MAX_LENGTH);
    }
    /**
     * Validates GUID format
     */
    static validateGuid(guid) {
        if (!guid || typeof guid !== 'string')
            return false;
        return (guid.length >= session_model_js_1.SESSION_MODEL_VALIDATION.GUID.MIN_LENGTH &&
            guid.length <= session_model_js_1.SESSION_MODEL_VALIDATION.GUID.MAX_LENGTH);
    }
    /**
     * Validates working time value
     */
    static validateWorkingTime(minutes) {
        if (typeof minutes !== 'number')
            return false;
        if (!Number.isInteger(minutes))
            return false;
        return (minutes >= session_model_js_1.SESSION_MODEL_VALIDATION.WORKING_TIME.MIN &&
            minutes <= session_model_js_1.SESSION_MODEL_VALIDATION.WORKING_TIME.MAX);
    }
    /**
     * Validates tolerance value
     */
    static validateTolerance(minutes) {
        if (typeof minutes !== 'number')
            return false;
        if (!Number.isInteger(minutes))
            return false;
        return (minutes >= session_model_js_1.SESSION_MODEL_VALIDATION.TOLERANCE.MIN &&
            minutes <= session_model_js_1.SESSION_MODEL_VALIDATION.TOLERANCE.MAX);
    }
    /**
     * Validates pause duration
     */
    static validatePauseDuration(minutes) {
        if (typeof minutes !== 'number')
            return false;
        if (!Number.isInteger(minutes))
            return false;
        return (minutes >= session_model_js_1.SESSION_MODEL_VALIDATION.PAUSE_DURATION.MIN &&
            minutes <= session_model_js_1.SESSION_MODEL_VALIDATION.PAUSE_DURATION.MAX);
    }
    /**
     * Validates pause count
     */
    static validatePauseCount(count) {
        if (typeof count !== 'number')
            return false;
        if (!Number.isInteger(count))
            return false;
        return (count >= session_model_js_1.SESSION_MODEL_VALIDATION.PAUSE_COUNT.MIN &&
            count <= session_model_js_1.SESSION_MODEL_VALIDATION.PAUSE_COUNT.MAX);
    }
    /**
     * Validates extra max time
     */
    static validateExtraMax(minutes) {
        if (typeof minutes !== 'number')
            return false;
        if (!Number.isInteger(minutes))
            return false;
        return (minutes >= session_model_js_1.SESSION_MODEL_VALIDATION.EXTRA_MAX.MIN &&
            minutes <= session_model_js_1.SESSION_MODEL_VALIDATION.EXTRA_MAX.MAX);
    }
    /**
     * Validates leave eligibility time
     */
    static validateLeaveEligibility(minutes) {
        if (typeof minutes !== 'number')
            return false;
        if (!Number.isInteger(minutes))
            return false;
        return (minutes >= session_model_js_1.SESSION_MODEL_VALIDATION.LEAVE_ELIGIBILITY.MIN &&
            minutes <= session_model_js_1.SESSION_MODEL_VALIDATION.LEAVE_ELIGIBILITY.MAX);
    }
    /**
     * Validates working time consistency (min ≤ normal ≤ max)
     */
    static validateWorkingTimeConsistency(minTime, normalTime, maxTime) {
        return minTime <= normalTime && normalTime <= maxTime;
    }
    /**
     * Validates pause configuration completeness
     */
    static validatePauseConfig(data) {
        if (!data.pause_allowed)
            return true;
        return (data.pause_duration !== undefined &&
            data.pause_duration !== null &&
            data.pause_count !== undefined &&
            data.pause_count !== null &&
            this.validatePauseDuration(data.pause_duration) &&
            this.validatePauseCount(data.pause_count));
    }
    /**
     * Validates extra hours configuration completeness
     */
    static validateExtraConfig(data) {
        if (!data.extra_allowed)
            return true;
        return (data.extra_max !== undefined &&
            data.extra_max !== null &&
            this.validateExtraMax(data.extra_max));
    }
    /**
     * Cleans and normalizes session model data
     */
    static cleanSessionModelData(data) {
        const cleaned = Object.assign({}, data);
        // Clean name
        if (cleaned.name !== undefined && cleaned.name !== null) {
            cleaned.name = cleaned.name.toString().trim();
        }
        // Ensure integers for numeric fields
        const numericFields = [
            'max_working_time',
            'min_working_time',
            'normal_session_time',
            'allowed_tolerance',
            'pause_duration',
            'pause_count',
            'extra_max',
            'leave_eligibility_after_session',
        ];
        for (const field of numericFields) {
            if (cleaned[field] !== undefined && cleaned[field] !== null) {
                cleaned[field] = parseInt(cleaned[field], 10);
            }
        }
        // Ensure booleans
        const booleanFields = [
            'pause_allowed',
            'rotation_allowed',
            'extra_allowed',
            'early_leave_allowed',
            'leave_is_optional',
            'active',
        ];
        for (const field of booleanFields) {
            if (cleaned[field] !== undefined && cleaned[field] !== null) {
                cleaned[field] = Boolean(cleaned[field]);
            }
        }
        // Clean pause config if pause not allowed
        if (!cleaned.pause_allowed) {
            cleaned.pause_duration = null;
            cleaned.pause_count = null;
        }
        // Clean extra config if extra not allowed
        if (!cleaned.extra_allowed) {
            cleaned.extra_max = null;
        }
        return cleaned;
    }
    /**
     * Converts minutes to hours (with 2 decimals)
     */
    static minutesToHours(minutes) {
        return Math.round((minutes / 60) * 100) / 100;
    }
    /**
     * Converts hours to minutes
     */
    static hoursToMinutes(hours) {
        return Math.round(hours * 60);
    }
    /**
     * Formats minutes to HH:MM
     */
    static minutesToTimeString(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
    /**
     * Calculates total pause time
     */
    static calculateTotalPauseTime(pauseDuration, pauseCount) {
        return pauseDuration * pauseCount;
    }
    /**
     * Calculates net working time (total - pauses)
     */
    static calculateNetWorkingTime(totalMinutes, totalPauseMinutes) {
        return Math.max(0, totalMinutes - totalPauseMinutes);
    }
    /**
     * Calculates absolute maximum working time (max + extra)
     */
    static calculateAbsoluteMaxWorkingTime(maxTime, extraMax) {
        return maxTime + (extraMax || 0);
    }
    /**
     * Checks if working time is within allowed range
     */
    static isWorkingTimeInRange(actualMinutes, minTime, maxTime, extraMax) {
        if (actualMinutes < minTime) {
            return { valid: false, status: 'below_min' };
        }
        if (actualMinutes <= maxTime) {
            return { valid: true, status: 'normal' };
        }
        const absoluteMax = this.calculateAbsoluteMaxWorkingTime(maxTime, extraMax);
        if (actualMinutes <= absoluteMax) {
            return { valid: true, status: 'in_extra' };
        }
        return { valid: false, status: 'above_max' };
    }
    /**
     * Checks if time difference is within tolerance
     */
    static isWithinTolerance(actualMinutes, expectedMinutes, tolerance) {
        const difference = actualMinutes - expectedMinutes;
        const absDifference = Math.abs(difference);
        return {
            within_tolerance: absDifference <= tolerance,
            difference,
            status: difference < -tolerance ? 'early' : difference > tolerance ? 'late' : 'on_time',
        };
    }
    /**
     * Validates if a pause fits within work time
     */
    static validatePauseFitsInWorkTime(workMinutes, pauseDuration, pauseCount) {
        const totalPauseTime = this.calculateTotalPauseTime(pauseDuration, pauseCount);
        return totalPauseTime < workMinutes;
    }
    /**
     * Generates a summary of time constraints
     */
    static generateTimeConstraintsSummary(data) {
        const totalPauseTime = data.pause_allowed
            ? this.calculateTotalPauseTime(data.pause_duration || 0, data.pause_count || 0)
            : 0;
        const netMin = this.calculateNetWorkingTime(data.min_working_time, totalPauseTime);
        const netMax = this.calculateNetWorkingTime(data.max_working_time, totalPauseTime);
        const absoluteMax = this.calculateAbsoluteMaxWorkingTime(data.max_working_time, data.extra_max);
        const summary = {
            working_time_range: `${this.minutesToTimeString(data.min_working_time)} - ${this.minutesToTimeString(data.max_working_time)}`,
            normal_session: this.minutesToTimeString(data.normal_session_time),
            tolerance: `±${data.allowed_tolerance} min`,
            net_time_range: `${this.minutesToTimeString(netMin)} - ${this.minutesToTimeString(netMax)}`,
            absolute_max: this.minutesToTimeString(absoluteMax),
        };
        if (data.pause_allowed && data.pause_duration && data.pause_count) {
            summary.pause_config = `${data.pause_count} × ${data.pause_duration} min = ${totalPauseTime} min total`;
        }
        if (data.extra_allowed && data.extra_max) {
            summary.extra_config = `Up to ${this.minutesToTimeString(data.extra_max)} extra`;
        }
        return summary;
    }
    /**
     * Validates if model can accommodate a specific work schedule
     */
    static canAccommodateSchedule(modelData, scheduleMinutes) {
        const absoluteMax = this.calculateAbsoluteMaxWorkingTime(modelData.max_working_time, modelData.extra_max);
        if (scheduleMinutes < modelData.min_working_time) {
            return {
                can_accommodate: false,
                requires_extra: false,
                message: `Schedule is below minimum (${modelData.min_working_time} min required)`,
            };
        }
        if (scheduleMinutes <= modelData.max_working_time) {
            return {
                can_accommodate: true,
                requires_extra: false,
                message: 'Schedule fits within normal working time',
            };
        }
        if (modelData.extra_allowed && scheduleMinutes <= absoluteMax) {
            const extraNeeded = scheduleMinutes - modelData.max_working_time;
            return {
                can_accommodate: true,
                requires_extra: true,
                available_extra: extraNeeded,
                message: `Schedule requires ${extraNeeded} minutes of extra time`,
            };
        }
        return {
            can_accommodate: false,
            requires_extra: false,
            message: `Schedule exceeds maximum allowed time (${absoluteMax} min max)`,
        };
    }
}
exports.SessionModelValidationUtils = SessionModelValidationUtils;
