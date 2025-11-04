// utils/memos.validation.ts
import {
  MEMOS_DEFAULTS,
  MEMOS_VALIDATION,
  MemoStatus,
  MemoType,
} from '../../constants/tenant/memos.js';

export class MemosValidationUtils {
  /**
   * Validates GUID
   */
  static validateGuid(guid: string): boolean {
    if (!guid || typeof guid !== 'string') return false;
    const trimmed = guid.trim();

    // Check length
    if (
      trimmed.length < MEMOS_VALIDATION.GUID.MIN_LENGTH ||
      trimmed.length > MEMOS_VALIDATION.GUID.MAX_LENGTH
    ) {
      return false;
    }

    const uuidRegex = /^[0-9]+$/;
    // UUID v4 regex
    // const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(trimmed);
  }

  /**
   * Validates author user
   */
  static validateAuthorUserId(authorUserId: string): boolean {
    if (!authorUserId || typeof authorUserId !== 'string') return false;

    const trimmed = authorUserId.trim();
    if (
      trimmed.length >= MEMOS_VALIDATION.AUTHOR_USER.MIN_LENGTH ||
      trimmed.length <= MEMOS_VALIDATION.AUTHOR_USER.MAX_LENGTH
    ) {
      return false;
    }

    const uuidRegex = /^[0-9]+$/;
    return uuidRegex.test(trimmed);
  }

  /**
   * Validates target user
   */
  static validateTargetUserId(targetUserId: string | null): boolean {
    if (targetUserId === null || targetUserId === undefined) return true;
    if (typeof targetUserId !== 'string') return false;

    const trimmed = targetUserId.trim();
    if (
      trimmed.length >= MEMOS_VALIDATION.TARGET_USER.MIN_LENGTH ||
      trimmed.length <= MEMOS_VALIDATION.TARGET_USER.MAX_LENGTH
    ) {
      return false;
    }
    const uuidRegex = /^[0-9]+$/;
    return uuidRegex.test(trimmed);
  }

  /**
   * Validates validator user
   */
  static validateValidatorUserId(validatorUserId: string | null): boolean {
    if (validatorUserId === null || validatorUserId === undefined) return true;
    if (typeof validatorUserId !== 'string') return false;
    const trimmed = validatorUserId.trim();
    if (
      trimmed.length >= MEMOS_VALIDATION.VALIDATOR_USER.MIN_LENGTH ||
      trimmed.length <= MEMOS_VALIDATION.VALIDATOR_USER.MAX_LENGTH
    ) {
      return false;
    }
    const uuidRegex = /^[0-9]+$/;
    return uuidRegex.test(trimmed);
  }

  /**
   * Validates memo type
   */
  static validateMemoType(memoType: string): boolean {
    if (!memoType || typeof memoType !== 'string') return false;
    return Object.values(MemoType).includes(memoType as MemoType);
  }

  /**
   * Validates memo status
   */
  static validateMemoStatus(status: string): boolean {
    if (!status || typeof status !== 'string') return false;
    return Object.values(MemoStatus).includes(status as MemoStatus);
  }

  /**
   * Validates memo title
   */
  static validateTitle(title: string): boolean {
    if (!title || typeof title !== 'string') return false;
    const trimmed = title.trim();
    return (
      trimmed.length >= MEMOS_VALIDATION.TITLE.MIN_LENGTH &&
      trimmed.length <= MEMOS_VALIDATION.TITLE.MAX_LENGTH
    );
  }

  /**
   * Validates memo description
   */
  static validateDescription(description: string): boolean {
    if (!description || typeof description !== 'string') return false;
    const trimmed = description.trim();
    return (
      trimmed.length >= MEMOS_VALIDATION.DESCRIPTION.MIN_LENGTH &&
      (MEMOS_VALIDATION.DESCRIPTION.MAX_LENGTH === Infinity ||
        trimmed.length <= MEMOS_VALIDATION.DESCRIPTION.MAX_LENGTH)
    );
  }

  /**
   * Validates incident datetime
   */
  static validateIncidentDatetime(incidentDatetime: Date | string | null): boolean {
    if (incidentDatetime === null || incidentDatetime === undefined) return true;
    const date = new Date(incidentDatetime);
    if (isNaN(date.getTime())) return false;

    // Incident cannot be in the future (allowing current time with 1 minute tolerance)
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Douala' }));
    // const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return date <= now;
  }

  /**
   * Validates affected session ID
   */
  static validateAffectedSessionId(sessionId: string | null): boolean {
    if (sessionId === null || sessionId === undefined) return true;
    if (typeof sessionId !== 'string') return false;
    const trimmed = sessionId.trim();
    if (
      trimmed.length >= MEMOS_VALIDATION.AFFECTED_SESSION.MIN_LENGTH ||
      trimmed.length <= MEMOS_VALIDATION.AFFECTED_SESSION.MAX_LENGTH
    ) {
      return false;
    }

    const uuidRegex = /^[0-9]+$/;
    return uuidRegex.test(trimmed);
  }

  /**
   * Validates affected entries array
   */
  static validateAffectedEntries(entries: any): boolean {
    if (entries === null || entries === undefined) return true;
    if (!Array.isArray(entries)) return false;

    return entries.every((entryId) => {
      if (typeof entryId !== 'string') return false;

      const trimmed = entryId.trim();
      if (
        trimmed.length >= MEMOS_VALIDATION.AFFECTED_ENTRIES.MIN_LENGTH &&
        trimmed.length <= MEMOS_VALIDATION.AFFECTED_ENTRIES.MAX_LENGTH
      ) {
        return false;
      }

      const uuidRegex = /^[0-9]+$/;
      return uuidRegex.test(trimmed);
    });
  }

  /**
   * Validates attachments array
   */
  static validateAttachments(attachments: any): boolean {
    if (attachments === null || attachments === undefined) return true;
    if (!Array.isArray(attachments)) return false;

    return attachments.every((attachment) => {
      if (typeof attachment !== 'string') return false;

      try {
        const url = new URL(attachment);
        return url.protocol === 'https:'; // Only allow HTTPS URLs
      } catch {
        return false;
      }
    });
  }

  /**
   * Validates validator comments
   */
  static validateValidatorComments(comments: string | null, status?: string): boolean {
    // Required for approved/rejected status
    if (status === MemoStatus.APPROVED || status === MemoStatus.REJECTED) {
      if (!comments || typeof comments !== 'string') return false;
      const trimmed = comments.trim();
      return (
        trimmed.length >= MEMOS_VALIDATION.VALIDATOR_COMMENTS.MIN_LENGTH &&
        trimmed.length <= MEMOS_VALIDATION.VALIDATOR_COMMENTS.MAX_LENGTH
      );
    }

    // Optional for other statuses
    if (comments === null || comments === undefined) return true;
    if (typeof comments !== 'string') return false;

    const trimmed = comments.trim();
    return (
      trimmed.length >= MEMOS_VALIDATION.VALIDATOR_COMMENTS.MIN_LENGTH &&
      trimmed.length <= MEMOS_VALIDATION.VALIDATOR_COMMENTS.MAX_LENGTH
    );
  }

  /**
   * Validates processed at date
   */
  static validateProcessedAt(processedAt: Date | string | null): boolean {
    if (processedAt === null || processedAt === undefined) return true;
    const date = new Date(processedAt);
    return !isNaN(date.getTime());
  }

  /**
   * Validates auto generated flag
   */
  static validateAutoGenerated(autoGenerated: boolean): boolean {
    return typeof autoGenerated === 'boolean';
  }

  /**
   * Validates pagination parameters
   */
  static validatePaginationParams(offset: number, limit: number): boolean {
    return (
      Number.isInteger(offset) &&
      Number.isInteger(limit) &&
      offset >= 0 &&
      limit > 0 &&
      limit <= MEMOS_DEFAULTS.PAGINATION?.MAX_LIMIT
    );
  }

  /**
   * Validates that self-validation is not allowed
   */
  static validateNotSelfValidation(authorUserId: number, validatorUserId: number): boolean {
    return authorUserId !== validatorUserId;
  }

  /**
   * Validates status transition
   */
  static validateStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      [MemoStatus.DRAFT]: [MemoStatus.SUBMITTED, MemoStatus.PENDING],
      [MemoStatus.SUBMITTED]: [MemoStatus.PENDING, MemoStatus.DRAFT],
      [MemoStatus.PENDING]: [MemoStatus.APPROVED, MemoStatus.REJECTED, MemoStatus.SUBMITTED],
      [MemoStatus.APPROVED]: [], // Final status - cannot be changed
      [MemoStatus.REJECTED]: [MemoStatus.SUBMITTED, MemoStatus.PENDING], // Allow resubmission
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Checks if memo can be modified
   */
  static canModifyMemo(status: string): boolean {
    // Cannot modify processed (approved/rejected) memos
    return status !== MemoStatus.APPROVED && status !== MemoStatus.REJECTED;
  }

  /**
   * Validates that validator is required for approval/rejection
   */
  static isValidatorRequired(status: string): boolean {
    return status === MemoStatus.APPROVED || status === MemoStatus.REJECTED;
  }

  /**
   * Cleans and normalizes memo data
   */
  static cleanMemoData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Convert numeric fields
    ['author_user', 'target_user', 'validator_user', 'affected_session'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = Number(cleaned[field]);
      }
    });

    // Clean string fields
    [
      'memo_type',
      'memo_status',
      'title',
      'description',
      'validator_comments',
      'auto_reason',
    ].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = cleaned[field].toString().trim();
      }
    });

    // Clean GUID
    if (cleaned.guid !== undefined && cleaned.guid !== null) {
      cleaned.guid = cleaned.guid.toString().trim();
    }

    // Convert boolean fields
    if (cleaned.auto_generated !== undefined) {
      cleaned.auto_generated = Boolean(cleaned.auto_generated);
    }

    // Convert dates
    ['incident_datetime', 'processed_at'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        const date = new Date(cleaned[field]);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid ${field}: must be a valid date`);
        }
        cleaned[field] = date;
      }
    });

    // Parse JSON arrays if they come as strings
    ['affected_entries', 'attachments'].forEach((field) => {
      if (
        cleaned[field] !== undefined &&
        cleaned[field] !== null &&
        typeof cleaned[field] === 'string'
      ) {
        try {
          cleaned[field] = JSON.parse(cleaned[field]);
        } catch {
          throw new Error(`Invalid ${field}: must be valid JSON array`);
        }
      }
    });

    return cleaned;
  }

  /**
   * Validates that a memo is complete for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = ['author_user', 'memo_type', 'title', 'description'];

    // Check required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    return (
      this.validateAuthorUserId(data.author_user) &&
      this.validateTargetUserId(data.target_user) &&
      this.validateValidatorUserId(data.validator_user) &&
      this.validateMemoType(data.memo_type) &&
      (data.memo_status === undefined || this.validateMemoStatus(data.memo_status)) &&
      this.validateTitle(data.title) &&
      this.validateDescription(data.description) &&
      this.validateIncidentDatetime(data.incident_datetime) &&
      this.validateAffectedSessionId(data.affected_session) &&
      this.validateAffectedEntries(data.affected_entries) &&
      this.validateAttachments(data.attachments) &&
      this.validateValidatorComments(data.validator_comments, data.memo_status) &&
      this.validateProcessedAt(data.processed_at) &&
      (data.auto_generated === undefined || this.validateAutoGenerated(data.auto_generated)) &&
      (data.guid === undefined || this.validateGuid(data.guid))
    );
  }

  /**
   * Validates that a memo is valid for update
   */
  static isValidForUpdate(data: any): boolean {
    // For updates, validate only fields that are present
    const validations = [
      data.author_user === undefined || this.validateAuthorUserId(data.author_user),
      data.target_user === undefined || this.validateTargetUserId(data.target_user),
      data.validator_user === undefined || this.validateValidatorUserId(data.validator_user),
      data.memo_type === undefined || this.validateMemoType(data.memo_type),
      data.memo_status === undefined || this.validateMemoStatus(data.memo_status),
      data.title === undefined || this.validateTitle(data.title),
      data.description === undefined || this.validateDescription(data.description),
      data.incident_datetime === undefined || this.validateIncidentDatetime(data.incident_datetime),
      data.affected_session === undefined || this.validateAffectedSessionId(data.affected_session),
      data.affected_entries === undefined || this.validateAffectedEntries(data.affected_entries),
      data.attachments === undefined || this.validateAttachments(data.attachments),
      data.validator_comments === undefined ||
        this.validateValidatorComments(data.validator_comments, data.memo_status),
      data.processed_at === undefined || this.validateProcessedAt(data.processed_at),
      data.auto_generated === undefined || this.validateAutoGenerated(data.auto_generated),
      // data.auto_reason === undefined || this.validateAutoReason(data.auto_reason, data.auto_generated),
      data.guid === undefined || this.validateGuid(data.guid),
    ];

    return validations.every((validation) => validation === true);
  }

  /**
   * Extracts validation errors for a memo
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (
      data.author_user === undefined ||
      data.author_user === null ||
      !this.validateAuthorUserId(data.author_user)
    ) {
      errors.push(
        `Invalid author_user: must be between ${MEMOS_VALIDATION.AUTHOR_USER.MIN_LENGTH} and ${MEMOS_VALIDATION.AUTHOR_USER.MAX_LENGTH}`,
      );
    }

    if (data.target_user !== undefined && !this.validateTargetUserId(data.target_user)) {
      errors.push(
        `Invalid target_user: must be between ${MEMOS_VALIDATION.TARGET_USER.MIN_LENGTH} and ${MEMOS_VALIDATION.TARGET_USER.MAX_LENGTH}`,
      );
    }

    if (data.validator_user !== undefined && !this.validateValidatorUserId(data.validator_user)) {
      errors.push(
        `Invalid validator_user: must be between ${MEMOS_VALIDATION.VALIDATOR_USER.MIN_LENGTH} and ${MEMOS_VALIDATION.VALIDATOR_USER.MAX_LENGTH}`,
      );
    }

    if (
      data.memo_type === undefined ||
      data.memo_type === null ||
      !this.validateMemoType(data.memo_type)
    ) {
      errors.push(`Invalid memo_type: must be one of ${Object.values(MemoType).join(', ')}`);
    }

    if (data.memo_status !== undefined && !this.validateMemoStatus(data.memo_status)) {
      errors.push(`Invalid memo_status: must be one of ${Object.values(MemoStatus).join(', ')}`);
    }

    if (!data.title || !this.validateTitle(data.title)) {
      errors.push(`Invalid title: must be 1-${MEMOS_VALIDATION.TITLE.MAX_LENGTH} characters`);
    }

    if (!data.description || !this.validateDescription(data.description)) {
      errors.push(
        `Invalid description: must be at least ${MEMOS_VALIDATION.DESCRIPTION.MIN_LENGTH} characters`,
      );
    }

    if (
      data.incident_datetime !== undefined &&
      !this.validateIncidentDatetime(data.incident_datetime)
    ) {
      errors.push('Invalid incident_datetime: must be a valid date not in the future');
    }

    if (
      data.affected_session !== undefined &&
      !this.validateAffectedSessionId(data.affected_session)
    ) {
      errors.push(
        `Invalid affected_session: must be between ${MEMOS_VALIDATION.AFFECTED_SESSION.MIN_LENGTH} and ${MEMOS_VALIDATION.AFFECTED_SESSION.MAX_LENGTH}`,
      );
    }

    if (
      data.affected_entries !== undefined &&
      !this.validateAffectedEntries(data.affected_entries)
    ) {
      errors.push(
        `Invalid affected_entries: must be an array of valid IDs between ${MEMOS_VALIDATION.AFFECTED_ENTRIES.MIN_LENGTH} and ${MEMOS_VALIDATION.AFFECTED_ENTRIES.MAX_LENGTH}`,
      );
    }

    if (data.attachments !== undefined && !this.validateAttachments(data.attachments)) {
      errors.push('Invalid attachments: must be an array of valid HTTPS URLs');
    }

    if (!this.validateValidatorComments(data.validator_comments, data.memo_status)) {
      if (data.memo_status === MemoStatus.APPROVED || data.memo_status === MemoStatus.REJECTED) {
        errors.push('Validator comments are required when approving or rejecting');
      } else {
        errors.push(
          `Invalid validator_comments: must be ${MEMOS_VALIDATION.VALIDATOR_COMMENTS.MIN_LENGTH}-${MEMOS_VALIDATION.VALIDATOR_COMMENTS.MAX_LENGTH} characters`,
        );
      }
    }

    if (data.processed_at !== undefined && !this.validateProcessedAt(data.processed_at)) {
      errors.push('Invalid processed_at: must be a valid date');
    }

    if (data.auto_generated !== undefined && !this.validateAutoGenerated(data.auto_generated)) {
      errors.push('Invalid auto_generated: must be a boolean value');
    }

    // if (!this.validateAutoReason(data.auto_reason, data.auto_generated)) {
    //   if (data.auto_generated === true) {
    //     errors.push('Auto reason is required for auto-generated memos');
    //   } else {
    //     errors.push(
    //       `Invalid auto_reason: must be 1-${MEMOS_VALIDATION.AUTO_REASON.MAX_LENGTH} characters`,
    //     );
    //   }
    // }

    if (data.guid !== undefined && !this.validateGuid(data.guid)) {
      errors.push(
        `Invalid GUID: must be 1-${MEMOS_VALIDATION.GUID.MAX_LENGTH} characters and valid UUID v4 format`,
      );
    }

    return errors;
  }

  /**
   * Validates filter data for searches
   */
  static validateFilterData(data: any): boolean {
    return (
      (data.author_user && this.validateAuthorUserId(data.author_user)) ||
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
      (data.guid && this.validateGuid(data.guid))
    );
  }

  /**
   * Gets memo summary statistics
   */
  static getMemoSummary(
    memos: any[],
    userId?: number,
  ): {
    totalMemos: number;
    authoredMemos: number;
    targetedMemos: number;
    validatedMemos: number;
    statusCounts: Record<string, number>;
    typeCounts: Record<string, number>;
    autoGeneratedCount: number;
    avgProcessingTimeHours: number;
  } {
    const filteredMemos = userId
      ? memos.filter(
          (memo) =>
            memo.author_user === userId ||
            memo.target_user === userId ||
            memo.validator_user === userId,
        )
      : memos;

    const summary = {
      totalMemos: filteredMemos.length,
      authoredMemos: 0,
      targetedMemos: 0,
      validatedMemos: 0,
      statusCounts: {} as Record<string, number>,
      typeCounts: {} as Record<string, number>,
      autoGeneratedCount: 0,
      avgProcessingTimeHours: 0,
    };

    let totalProcessingTime = 0;
    let processedCount = 0;

    filteredMemos.forEach((memo) => {
      if (userId) {
        if (memo.author_user === userId) summary.authoredMemos++;
        if (memo.target_user === userId) summary.targetedMemos++;
        if (memo.validator_user === userId) summary.validatedMemos++;
      }

      const status = memo.memo_status || MemoStatus.DRAFT;
      summary.statusCounts[status] = (summary.statusCounts[status] || 0) + 1;

      const type = memo.memo_type;
      summary.typeCounts[type] = (summary.typeCounts[type] || 0) + 1;

      if (memo.auto_generated) {
        summary.autoGeneratedCount++;
      }

      // Calculate processing time for processed memos
      if (memo.processed_at && memo.created_at) {
        const processingTime =
          new Date(memo.processed_at).getTime() - new Date(memo.created_at).getTime();
        totalProcessingTime += processingTime;
        processedCount++;
      }
    });

    summary.avgProcessingTimeHours =
      processedCount > 0 ? totalProcessingTime / processedCount / (1000 * 60 * 60) : 0;

    return summary;
  }

  /**
   * Validates business rules for memo creation/update
   */
  static validateBusinessRules(
    data: any,
    currentMemo?: any,
    options: {
      allowSelfValidation?: boolean;
      maxProcessingDays?: number;
    } = {},
  ): string[] {
    const errors: string[] = [];
    const { allowSelfValidation = false, maxProcessingDays = 30 } = options;

    // Check self-validation
    if (
      !allowSelfValidation &&
      data.author_user &&
      data.validator_user &&
      !this.validateNotSelfValidation(data.author_user, data.validator_user)
    ) {
      errors.push('Users cannot validate their own memos');
    }

    // Check status transition
    if (
      currentMemo &&
      data.memo_status &&
      !this.validateStatusTransition(currentMemo.memo_status, data.memo_status)
    ) {
      errors.push('Invalid status transition');
    }

    // Check if memo can be modified
    if (currentMemo && !this.canModifyMemo(currentMemo.memo_status)) {
      errors.push('Cannot modify processed (approved/rejected) memos');
    }

    // Check validator requirement for approval/rejection
    if (data.memo_status && this.isValidatorRequired(data.memo_status) && !data.validator_user) {
      errors.push('Validator user is required for approval or rejection');
    }

    // Check processing time limit
    if (data.processed_at && data.incident_datetime) {
      const processingDays =
        (new Date(data.processed_at).getTime() - new Date(data.incident_datetime).getTime()) /
        (1000 * 60 * 60 * 24);
      if (processingDays > maxProcessingDays) {
        errors.push(`Memo processing time exceeds maximum allowed (${maxProcessingDays} days)`);
      }
    }

    // Validate memo type specific rules
    switch (data.memo_type) {
      case MemoType.DELAY_JUSTIFICATION:
      case MemoType.ABSENCE_JUSTIFICATION:
        if (!data.incident_datetime) {
          errors.push('Incident datetime is required for justification memos');
        }
        break;

      case MemoType.CORRECTION_REQUEST:
        if (
          !data.affected_entries ||
          !Array.isArray(data.affected_entries) ||
          data.affected_entries.length === 0
        ) {
          errors.push('Affected entries are required for correction requests');
        }
        break;

      case MemoType.SESSION_CLOSURE:
        if (!data.affected_session) {
          errors.push('Affected session is required for session closure memos');
        }
        break;

      case MemoType.AUTO_GENERATED:
        if (!data.auto_generated || !data.auto_reason) {
          errors.push('Auto-generated memos must have auto_generated=true and auto_reason');
        }
        break;
    }

    return errors;
  }

  /**
   * Generates memo workflow report
   */
  static generateMemoWorkflowReport(memos: any[], period: { start: Date; end: Date }) {
    const periodMemos = memos.filter((memo) => {
      const createdAt = new Date(memo.created_at);
      return createdAt >= period.start && createdAt <= period.end;
    });

    const summary = this.getMemoSummary(periodMemos);

    // Calculate metrics
    const approvalRate =
      (summary.statusCounts[MemoStatus.APPROVED]! /
        (summary.statusCounts[MemoStatus.APPROVED]! + summary.statusCounts[MemoStatus.REJECTED]! ||
          1)) *
      100;

    const pendingRate = (summary.statusCounts[MemoStatus.PENDING]! / summary.totalMemos) * 100;

    // Identify bottlenecks
    const bottlenecks: string[] = [];
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

  /**
   * Generates recommendations based on memo analysis
   */
  private static generateRecommendations(summary: any, bottlenecks: string[]): string[] {
    const recommendations: string[] = [];

    if (bottlenecks.includes('High percentage of pending memos')) {
      recommendations.push('Consider assigning more validators or streamlining approval process');
    }

    if (bottlenecks.includes('Long average processing time')) {
      recommendations.push('Review validation workflow and set processing time targets');
    }

    if (bottlenecks.includes('High volume of auto-generated memos')) {
      recommendations.push('Investigate underlying issues causing automatic memo generation');
    }

    if (summary.statusCounts[MemoStatus.REJECTED] > summary.statusCounts[MemoStatus.APPROVED]) {
      recommendations.push('Review memo submission guidelines and provide better training');
    }

    return recommendations;
  }
}
