"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemosValidationUtils = void 0;
// utils/memos.validation.ts
const memos_js_1 = require("../../constants/tenant/memos.js");
const timezone_config_validation_js_1 = require("../timezone.config.validation.js");
class MemosValidationUtils {
    /**
     * Validates GUID
     */
    static validateGuid(guid) {
        if (!guid || typeof guid !== 'string')
            return false;
        const trimmed = guid.trim();
        // Check length
        if (trimmed.length < memos_js_1.MEMOS_VALIDATION.GUID.MIN_LENGTH ||
            trimmed.length > memos_js_1.MEMOS_VALIDATION.GUID.MAX_LENGTH) {
            return false;
        }
        const uuidRegex = /^[0-9]+$/;
        // UUID v4 regex
        // const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(trimmed);
    }
    /**
     * Vérifie si le target user a déjà répondu au memo
     * Un memo a une réponse si memo_content contient au moins 2 entrées
     * (la première du manager, la deuxième du target user)
     */
    static hasUserResponse(memoContent, targetUser) {
        if (!Array.isArray(memoContent) || memoContent.length < 2) {
            return false;
        }
        // Vérifier si au moins une entrée provient du target user
        return memoContent.some((entry) => entry.user === targetUser);
    }
    /**
     * Validates author user
     */
    static validateAuthorUserId(authorUserId) {
        if (!authorUserId || typeof authorUserId !== 'string')
            return false;
        const trimmed = authorUserId.trim();
        if (trimmed.length >= memos_js_1.MEMOS_VALIDATION.AUTHOR_USER.MIN_LENGTH ||
            trimmed.length <= memos_js_1.MEMOS_VALIDATION.AUTHOR_USER.MAX_LENGTH) {
            return false;
        }
        const uuidRegex = /^[0-9]+$/;
        return uuidRegex.test(trimmed);
    }
    /**
     * Validates target user
     */
    static validateTargetUserId(targetUserId) {
        if (targetUserId === null || targetUserId === undefined)
            return true;
        if (typeof targetUserId !== 'string')
            return false;
        const trimmed = targetUserId.trim();
        if (trimmed.length >= memos_js_1.MEMOS_VALIDATION.TARGET_USER.MIN_LENGTH ||
            trimmed.length <= memos_js_1.MEMOS_VALIDATION.TARGET_USER.MAX_LENGTH) {
            return false;
        }
        const uuidRegex = /^[0-9]+$/;
        return uuidRegex.test(trimmed);
    }
    /**
     * Validates validator user
     */
    static validateValidatorUserId(validatorUserId) {
        if (validatorUserId === null || validatorUserId === undefined)
            return true;
        if (typeof validatorUserId !== 'string')
            return false;
        const trimmed = validatorUserId.trim();
        if (trimmed.length >= memos_js_1.MEMOS_VALIDATION.VALIDATOR_USER.MIN_LENGTH ||
            trimmed.length <= memos_js_1.MEMOS_VALIDATION.VALIDATOR_USER.MAX_LENGTH) {
            return false;
        }
        const uuidRegex = /^[0-9]+$/;
        return uuidRegex.test(trimmed);
    }
    /**
     * Validates memo type
     */
    static validateMemoType(memoType) {
        if (!memoType || typeof memoType !== 'string')
            return false;
        return Object.values(memos_js_1.MemoType).includes(memoType);
    }
    /**
     * Validates memo status
     */
    static validateMemoStatus(status) {
        if (!status || typeof status !== 'string')
            return false;
        return Object.values(memos_js_1.MemoStatus).includes(status);
    }
    /**
     * Validates memo title
     */
    static validateTitle(title) {
        if (!title || typeof title !== 'string')
            return false;
        const trimmed = title.trim();
        return (trimmed.length >= memos_js_1.MEMOS_VALIDATION.TITLE.MIN_LENGTH &&
            trimmed.length <= memos_js_1.MEMOS_VALIDATION.TITLE.MAX_LENGTH);
    }
    /**
     * Validates incident datetime
     */
    static validateIncidentDatetime(incidentDatetime) {
        if (incidentDatetime === null || incidentDatetime === undefined)
            return true;
        const date = new Date(incidentDatetime);
        if (isNaN(date.getTime()))
            return false;
        // Incident cannot be in the future (allowing current time with 1 minute tolerance)
        const now = new Date(timezone_config_validation_js_1.TimezoneConfigUtils.getCurrentTime().toLocaleString('en-US', { timeZone: 'Africa/Douala' }));
        // const now = TimezoneConfigUtils.getCurrentTime();
        now.setMinutes(now.getMinutes() + 1);
        return date <= now;
    }
    /**
     * Validates affected session ID
     */
    static validateAffectedSessionId(sessionId) {
        if (sessionId === null || sessionId === undefined)
            return true;
        if (typeof sessionId !== 'string')
            return false;
        const trimmed = sessionId.trim();
        if (trimmed.length >= memos_js_1.MEMOS_VALIDATION.AFFECTED_SESSION.MIN_LENGTH ||
            trimmed.length <= memos_js_1.MEMOS_VALIDATION.AFFECTED_SESSION.MAX_LENGTH) {
            return false;
        }
        const uuidRegex = /^[0-9]+$/;
        return uuidRegex.test(trimmed);
    }
    /**
     * Validates affected entries array
     */
    static validateAffectedEntries(entries) {
        if (entries === null || entries === undefined)
            return true;
        if (!Array.isArray(entries))
            return false;
        return entries.every((entryId) => {
            if (typeof entryId !== 'string')
                return false;
            const trimmed = entryId.trim();
            if (trimmed.length >= memos_js_1.MEMOS_VALIDATION.AFFECTED_ENTRIES.MIN_LENGTH &&
                trimmed.length <= memos_js_1.MEMOS_VALIDATION.AFFECTED_ENTRIES.MAX_LENGTH) {
                return false;
            }
            const uuidRegex = /^[0-9]+$/;
            return uuidRegex.test(trimmed);
        });
    }
    /**
     * Validates auto generated flag
     */
    static validateAutoGenerated(autoGenerated) {
        return typeof autoGenerated === 'boolean';
    }
    /**
     * Vérifie si un memo peut être révoqué
     * Conditions:
     * - Le memo doit avoir été créé par un manager (manager = true)
     * - Le target user ne doit pas encore avoir répondu
     * - Le statut doit être SUBMITTED ou PENDING
     */
    static canRevokeMemo(memo) {
        // Seul un memo créé par le manager peut être révoqué
        if (!memo.manager)
            return false;
        // Ne peut pas révoquer si déjà traité
        if (memo.memo_status === memos_js_1.MemoStatus.APPROVED ||
            memo.memo_status === memos_js_1.MemoStatus.REJECTED ||
            memo.memo_status === memos_js_1.MemoStatus.REVOKED) {
            return false;
        }
        // Ne peut pas révoquer si le target user a déjà répondu
        return !this.hasUserResponse(memo.memo_content, memo.target_user);
    }
    /**
     * Vérifie si un memo peut être validé ou rejeté
     * Condition: Le target user doit avoir répondu (si le memo vient d'un manager)
     */
    static canValidateOrReject(memo) {
        // Si ce n'est pas un memo manager, pas de restriction
        if (!memo.manager)
            return true;
        // Ne peut pas valider/rejeter si déjà traité
        if (memo.memo_status === memos_js_1.MemoStatus.APPROVED ||
            memo.memo_status === memos_js_1.MemoStatus.REJECTED ||
            memo.memo_status === memos_js_1.MemoStatus.REVOKED) {
            return false;
        }
        // Pour un memo manager, le target user doit avoir répondu
        return this.hasUserResponse(memo.memo_content, memo.target_user);
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
            limit <= ((_a = memos_js_1.MEMOS_DEFAULTS.PAGINATION) === null || _a === void 0 ? void 0 : _a.MAX_LIMIT));
    }
    /**
     * Validates that self-validation is not allowed
     */
    static validateNotSelfValidation(authorUserId, validatorUserId) {
        return authorUserId !== validatorUserId;
    }
    /**
     * Checks if memo can be modified
     */
    static canModifyMemo(status) {
        return (status !== memos_js_1.MemoStatus.APPROVED &&
            status !== memos_js_1.MemoStatus.REJECTED &&
            status !== memos_js_1.MemoStatus.REVOKED);
    }
    /**
     * Validates that validator is required for approval/rejection
     */
    static isValidatorRequired(status) {
        return status === memos_js_1.MemoStatus.APPROVED || status === memos_js_1.MemoStatus.REJECTED;
    }
    /**
     * Validates filter data for searches
     */
    static validateFilterData(data) {
        return ((data.author_user && this.validateAuthorUserId(data.author_user)) ||
            (data.target_user && this.validateTargetUserId(data.target_user)) ||
            (data.validator_user && this.validateValidatorUserId(data.validator_user)) ||
            (data.memo_type && this.validateMemoType(data.memo_type)) ||
            (data.memo_status && this.validateMemoStatus(data.memo_status)) ||
            (data.auto_generated !== undefined && this.validateAutoGenerated(data.auto_generated)) ||
            (data.affected_session && this.validateAffectedSessionId(data.affected_session)) ||
            (data.incident_datetime_from && !isNaN(new Date(data.incident_datetime_from).getTime())) ||
            (data.incident_datetime_to && !isNaN(new Date(data.incident_datetime_to).getTime())) ||
            (data.processed_at_from && !isNaN(new Date(data.processed_at_from).getTime())) ||
            (data.processed_at_to && !isNaN(new Date(data.processed_at_to).getTime())) ||
            (data.guid && this.validateGuid(data.guid)));
    }
    /**
     * Gets memo summary statistics
     */
    static getMemoSummary(memos, userId) {
        const filteredMemos = userId
            ? memos.filter((memo) => memo.author_user === userId ||
                memo.target_user === userId ||
                memo.validator_user === userId)
            : memos;
        const summary = {
            totalMemos: filteredMemos.length,
            authoredMemos: 0,
            targetedMemos: 0,
            validatedMemos: 0,
            statusCounts: {},
            typeCounts: {},
            autoGeneratedCount: 0,
            avgProcessingTimeHours: 0,
        };
        let totalProcessingTime = 0;
        let processedCount = 0;
        filteredMemos.forEach((memo) => {
            if (userId) {
                if (memo.author_user === userId)
                    summary.authoredMemos++;
                if (memo.target_user === userId)
                    summary.targetedMemos++;
                if (memo.validator_user === userId)
                    summary.validatedMemos++;
            }
            const status = memo.memo_status;
            summary.statusCounts[status] = (summary.statusCounts[status] || 0) + 1;
            const type = memo.memo_type;
            summary.typeCounts[type] = (summary.typeCounts[type] || 0) + 1;
            if (memo.auto_generated) {
                summary.autoGeneratedCount++;
            }
            // Calculate processing time for processed memos
            if (memo.processed_at && memo.created_at) {
                const processingTime = new Date(memo.processed_at).getTime() - new Date(memo.created_at).getTime();
                totalProcessingTime += processingTime;
                processedCount++;
            }
        });
        summary.avgProcessingTimeHours =
            processedCount > 0 ? totalProcessingTime / processedCount / (1000 * 60 * 60) : 0;
        return summary;
    }
    /**
     * Generates memo workflow report
     */
    static generateMemoWorkflowReport(memos, period) {
        const periodMemos = memos.filter((memo) => {
            const createdAt = new Date(memo.created_at);
            return createdAt >= period.start && createdAt <= period.end;
        });
        const summary = this.getMemoSummary(periodMemos);
        // Calculate metrics
        const approvalRate = (summary.statusCounts[memos_js_1.MemoStatus.APPROVED] /
            (summary.statusCounts[memos_js_1.MemoStatus.APPROVED] + summary.statusCounts[memos_js_1.MemoStatus.REJECTED] ||
                1)) *
            100;
        const pendingRate = (summary.statusCounts[memos_js_1.MemoStatus.PENDING] / summary.totalMemos) * 100;
        // Identify bottlenecks
        const bottlenecks = [];
        if (pendingRate > 30) {
            bottlenecks.push('High percentage of pending memos');
        }
        if (summary.avgProcessingTimeHours > 72) {
            bottlenecks.push('Long average processing time');
        }
        if (summary.autoGeneratedCount / summary.totalMemos > 0.5) {
            bottlenecks.push('High volume of auto-generated memos');
        }
        return {
            period: {
                start: period.start.toISOString(),
                end: period.end.toISOString(),
            },
            summary,
            metrics: {
                approvalRate: Number(approvalRate.toFixed(2)),
                pendingRate: Number(pendingRate.toFixed(2)),
                avgProcessingHours: Number(summary.avgProcessingTimeHours.toFixed(2)),
            },
            bottlenecks,
            recommendations: this.generateRecommendations(summary, bottlenecks),
        };
    }
    static normalizeMessages(content) {
        return content.flatMap((entry) => Array.isArray(entry.message) ? entry.message : [entry.message]);
    }
    /**
     * Generates recommendations based on memo analysis
     */
    static generateRecommendations(summary, bottlenecks) {
        const recommendations = [];
        if (bottlenecks.includes('High percentage of pending memos')) {
            recommendations.push('Consider assigning more validators or streamlining approval process');
        }
        if (bottlenecks.includes('Long average processing time')) {
            recommendations.push('Review validation workflow and set processing time targets');
        }
        if (bottlenecks.includes('High volume of auto-generated memos')) {
            recommendations.push('Investigate underlying issues causing automatic memo generation');
        }
        if (summary.statusCounts[memos_js_1.MemoStatus.REJECTED] > summary.statusCounts[memos_js_1.MemoStatus.APPROVED]) {
            recommendations.push('Review memo submission guidelines and provide better training');
        }
        return recommendations;
    }
}
exports.MemosValidationUtils = MemosValidationUtils;
