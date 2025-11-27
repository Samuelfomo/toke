import {
  Attachment,
  MemoContent,
  MEMOS_DEFAULTS,
  MEMOS_ERRORS,
  MemoStatus,
  MemosValidationUtils,
  MemoType,
} from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class MemosModel extends BaseModel {
  public readonly db = {
    tableName: tableName.MEMOS,
    id: 'id',
    guid: 'guid',
    author_user: 'author_user',
    target_user: 'target_user',
    validator_user: 'validator_user',
    memo_type: 'memo_type',
    memo_status: 'memo_status',
    title: 'title',
    memo_content: 'memo_content',
    auto_generated: 'auto_generated',
    details: 'details',
    incident_datetime: 'incident_datetime',
    affected_session: 'affected_session',
    affected_entries: 'affected_entries',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected guid?: string;
  protected author_user?: number;
  protected target_user?: number;
  protected validator_user?: number;
  protected memo_type?: MemoType;
  protected memo_status?: MemoStatus;
  protected title?: string;
  protected memo_content?: MemoContent[];
  protected auto_generated?: boolean;
  protected details?: string;
  protected incident_datetime?: Date;
  protected affected_session?: number;
  protected affected_entries?: number[];
  protected created_at?: Date;
  protected updated_at?: Date;

  protected constructor() {
    super();
  }

  // ============================================================================
  // 1. RECHERCHES DE BASE
  // ============================================================================

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async findByGuid(guid: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }

  protected async listAllByAuthor(
    author_user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      { [this.db.author_user]: author_user },
      paginationOptions,
    );
  }

  protected async listAllByTarget(
    target_user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.target_user]: target_user,
        [this.db.memo_status]: { [Op.ne]: MemoStatus.DRAFT },
      },
      paginationOptions,
    );
  }

  protected async listAllByValidator(
    validator_user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      { [this.db.validator_user]: validator_user },
      paginationOptions,
    );
  }

  // ============================================================================
  // 2. RECHERCHES PAR TYPE/STATUT
  // ============================================================================

  protected async findByType(
    memo_type: MemoType,
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.memo_type]: memo_type,
        ...conditions,
      },
      paginationOptions,
    );
  }

  protected async findByStatus(
    memo_status: MemoStatus,
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.memo_status]: memo_status,
        ...conditions,
      },
      paginationOptions,
    );
  }

  // Memos en attente de réponse (pour l'employé cible)
  protected async findPendingResponse(
    target_user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.target_user]: target_user,
        [this.db.memo_status]: MemoStatus.SUBMITTED,
        // [this.db.response_user]: null,
      },
      paginationOptions,
    );
  }

  // Memos en attente de validation (pour le manager)
  protected async findPendingValidation(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.memo_status]: MemoStatus.PENDING,
        // [this.db.response_user]: {
        //   [Op.ne]: null,
        // },
        ...conditions,
      },
      paginationOptions,
    );
  }

  // Memos système (anomalies)
  protected async findSystemAnomalies(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.memo_type]: MemoType.AUTO_GENERATED,
        [this.db.memo_status]: {
          [Op.notIn]: [MemoStatus.APPROVED, MemoStatus.REJECTED],
        },
      },
      paginationOptions,
    );
  }

  protected async findAutoGenerated(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.auto_generated]: true,
        [this.db.memo_status]: {
          [Op.ne]: MemoStatus.REJECTED,
        },
      },
      paginationOptions,
    );
  }

  // ============================================================================
  // 3. RECHERCHES PAR SESSION/ENTRIES
  // ============================================================================

  protected async findBySession(
    affected_session: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      { [this.db.affected_session]: affected_session },
      paginationOptions,
    );
  }

  protected async findByEntryId(
    entry_id: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.affected_entries]: {
          [Op.contains]: [entry_id],
        },
      },
      paginationOptions,
    );
  }

  // ============================================================================
  // 4. RECHERCHES SPÉCIFIQUES
  // ============================================================================

  // Memos créés par un manager pour ses employés
  protected async findManagerRequestsByAuthor(
    author_user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.author_user]: author_user,
      },
      paginationOptions,
    );
  }

  // Memos dépassant le délai de 24h
  protected async findOverdueMemos(
    hours: number = 24,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const deadlineDate = new Date();
    deadlineDate.setHours(deadlineDate.getHours() - hours);

    return await this.findAll(
      this.db.tableName,
      {
        [this.db.memo_status]: {
          [Op.in]: [MemoStatus.PENDING, MemoStatus.SUBMITTED],
        },
        [this.db.created_at]: {
          [Op.lte]: deadlineDate,
        },
      },
      paginationOptions,
    );
  }

  // Memos escaladés (provenant de managers subordonnés)
  protected async findEscalatedMemos(
    validator_user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.validator_user]: validator_user,
        [this.db.memo_status]: MemoStatus.SUBMITTED,
        [this.db.author_user]: {
          [Op.ne]: validator_user,
        },
      },
      paginationOptions,
    );
  }

  // ============================================================================
  // 5. OPÉRATIONS DE MODIFICATION
  // ============================================================================

  // Soumettre une réponse utilisateur
  protected async submitResponse(
    memo_id: number,
    response_user: string,
    attachments?: Array<string | Attachment>,
  ): Promise<boolean> {
    const updates: Record<string, any> = {
      [this.db.response_user]: response_user,
      [this.db.memo_status]: MemoStatus.SUBMITTED,
      [this.db.responded_at]: new Date(),
    };

    if (attachments && attachments.length > 0) {
      const memoData = await this.find(memo_id);
      const currentAttachments = MemosValidationUtils.normalizeAttachments(memoData?.attachments);
      const newAttachments = MemosValidationUtils.normalizeAttachments(attachments);
      // const currentAttachments = memoData?.attachments || [];
      updates[this.db.attachments] = [...currentAttachments, ...newAttachments];
    }

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: memo_id,
    });
    return affectedRows > 0;
  }

  protected async submitForResponse(memo: number): Promise<boolean> {
    const updates = {
      [this.db.memo_status]: MemoStatus.PENDING,
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: memo,
    });
    return affectedRows > 0;
  }

  protected async findPreventiveMemos(
    start_date: Date,
    end_date: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.memo_type]: {
          [Op.in]: [MemoType.DELAY_JUSTIFICATION, MemoType.ABSENCE_JUSTIFICATION],
        },
        [this.db.incident_datetime]: {
          [Op.between]: [start_date, end_date],
        },
        [this.db.created_at]: {
          [Op.lt]: this.sequelize!.col(this.db.incident_datetime),
        },
      },
      paginationOptions,
    );
  }

  protected async findCorrectiveMemos(
    start_date: Date,
    end_date: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.memo_type]: MemoType.CORRECTION_REQUEST,
        [this.db.incident_datetime]: {
          [Op.between]: [start_date, end_date],
        },
      },
      paginationOptions,
    );
  }

  protected async findByDateRange(
    start_date: Date,
    end_date: Date,
    filters: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.incident_datetime]: {
          [Op.between]: [start_date, end_date],
        },
        ...filters,
      },
      paginationOptions,
    );
  }

  protected async findUrgentMemos(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    return await this.findAll(
      this.db.tableName,
      {
        [this.db.memo_status]: {
          [Op.in]: [MemoStatus.SUBMITTED, MemoStatus.PENDING],
        },
        [this.db.incident_datetime]: {
          [Op.lte]: twoDaysFromNow,
        },
      },
      paginationOptions,
    );
  }

  protected async findMemosForEscalation(
    hours_threshold: number = 24,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - hours_threshold);

    return await this.findAll(
      this.db.tableName,
      {
        [this.db.memo_status]: {
          [Op.in]: [MemoStatus.SUBMITTED, MemoStatus.PENDING],
        },
        [this.db.created_at]: {
          [Op.lt]: thresholdDate,
        },
      },
      paginationOptions,
    );
  }

  protected async findSuspiciousPatterns(
    target_user: number,
    days: number = 30,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    frequent_delays: number;
    frequent_corrections: number;
    frequent_absences: number;
    rejection_rate: number;
    total_memos: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const allMemos = await this.findAll(
      this.db.tableName,
      {
        [this.db.target_user]: target_user,
        [this.db.created_at]: {
          [Op.gte]: startDate,
        },
      },
      paginationOptions,
    );

    const delays = allMemos.filter((m) => m.memo_type === MemoType.DELAY_JUSTIFICATION).length;
    const corrections = allMemos.filter((m) => m.memo_type === MemoType.CORRECTION_REQUEST).length;
    const absences = allMemos.filter((m) => m.memo_type === MemoType.ABSENCE_JUSTIFICATION).length;
    const rejected = allMemos.filter((m) => m.memo_status === MemoStatus.REJECTED).length;

    return {
      frequent_delays: delays,
      frequent_corrections: corrections,
      frequent_absences: absences,
      rejection_rate: allMemos.length > 0 ? (rejected / allMemos.length) * 100 : 0,
      total_memos: allMemos.length,
    };
  }

  // Valider un memo (manager approuve la réponse)
  protected async validateMemo(
    memo_id: number,
    validator_user: number,
    comments: string,
  ): Promise<boolean> {
    const updates: Record<string, any> = {
      [this.db.memo_status]: MemoStatus.APPROVED,
      [this.db.validator_user]: validator_user,
      [this.db.validator_comments]: comments,
      [this.db.processed_at]: new Date(),
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: memo_id,
    });
    return affectedRows > 0;
  }

  // Rejeter un memo
  protected async rejectMemo(
    memo_id: number,
    validator_user: number,
    comments: string,
  ): Promise<boolean> {
    const updates: Record<string, any> = {
      [this.db.memo_status]: MemoStatus.REJECTED,
      [this.db.validator_user]: validator_user,
      [this.db.validator_comments]: comments,
      [this.db.processed_at]: new Date(),
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: memo_id,
    });
    return affectedRows > 0;
  }

  protected async processValidation(
    memo: number,
    validator: number,
    decision: MemoStatus.APPROVED | MemoStatus.REJECTED,
    comments?: string,
  ): Promise<boolean> {
    const updates: Record<string, any> = {
      [this.db.memo_status]:
        decision === MemoStatus.APPROVED ? MemoStatus.APPROVED : MemoStatus.REJECTED,
      [this.db.validator_user]: validator,
      [this.db.validator_comments]: comments,
      [this.db.processed_at]: new Date(),
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: memo,
    });
    return affectedRows > 0;
  }

  // Escalader les memos en attente
  protected async escalateOverdueMemos(
    hours_threshold: number,
    escalate_to_validator: number,
  ): Promise<number> {
    const deadlineDate = new Date();
    deadlineDate.setHours(deadlineDate.getHours() - hours_threshold);

    const overdueMemos = await this.findAll(this.db.tableName, {
      [this.db.memo_status]: {
        [Op.in]: [MemoStatus.PENDING, MemoStatus.SUBMITTED],
      },
      [this.db.created_at]: {
        [Op.lte]: deadlineDate,
      },
      [this.db.validator_user]: null,
    });

    let escalatedCount = 0;
    for (const memo of overdueMemos) {
      const updated = await this.updateOne(
        this.db.tableName,
        { [this.db.validator_user]: escalate_to_validator },
        { [this.db.id]: memo.id },
      );
      if (updated > 0) escalatedCount++;
    }

    return escalatedCount;
  }

  protected async escalateMemo(
    memo: number,
    new_validator: number,
    reason: string,
  ): Promise<boolean> {
    const updates = {
      [this.db.validator_user]: new_validator,
      [this.db.memo_status]: MemoStatus.PENDING,
      [this.db.validator_comments]: `Escaladed: ${reason}`,
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: memo,
    });
    return affectedRows > 0;
  }

  // ============================================================================
  // 6. GESTION DES ATTACHMENTS
  // ============================================================================

  protected async addAttachment(
    memo: number,
    attachment: Array<string | Attachment>,
  ): Promise<boolean> {
    const memoData = await this.find(memo);
    if (!memoData) return false;

    const currentAttachments = MemosValidationUtils.normalizeAttachments(memoData.attachments);
    const toAdd = MemosValidationUtils.normalizeAttachments(attachment);
    const updated = [...currentAttachments, ...toAdd];

    const updates = {
      [this.db.attachments]: updated,
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: memo,
    });
    return affectedRows > 0;
  }

  protected async removeAttachment(memo_id: number, attachment_index: number): Promise<boolean> {
    const memoData = await this.find(memo_id);
    if (!memoData || !Array.isArray(memoData.attachments)) return false;

    const currentAttachments = MemosValidationUtils.normalizeAttachments(memoData.attachments);
    if (attachment_index < 0 || attachment_index >= currentAttachments.length) return false;

    currentAttachments.splice(attachment_index, 1);

    const updates = {
      [this.db.attachments]: currentAttachments,
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: memo_id,
    });
    return affectedRows > 0;
  }

  // ============================================================================
  // 7. STATISTIQUES
  // ============================================================================

  protected async getMemosStatistics(filters: Record<string, any> = {}): Promise<any> {
    const [
      totalMemos,
      pendingResponse,
      pendingValidation,
      approvedMemos,
      rejectedMemos,
      systemAnomalies,
      memosByType,
      memosByStatus,
    ] = await Promise.all([
      this.count(this.db.tableName, filters),
      this.count(this.db.tableName, {
        ...filters,
        [this.db.memo_status]: MemoStatus.PENDING,
      }),
      this.count(this.db.tableName, {
        ...filters,
        [this.db.memo_status]: MemoStatus.SUBMITTED,
      }),
      this.count(this.db.tableName, {
        ...filters,
        [this.db.memo_status]: MemoStatus.APPROVED,
      }),
      this.count(this.db.tableName, {
        ...filters,
        [this.db.memo_status]: MemoStatus.REJECTED,
      }),
      this.count(this.db.tableName, {
        ...filters,
        [this.db.memo_type]: MemoType.AUTO_GENERATED,
      }),
      this.countByGroup(this.db.tableName, this.db.memo_type, filters),
      this.countByGroup(this.db.tableName, this.db.memo_status, filters),
    ]);

    return {
      total_memos: totalMemos,
      pending_response: pendingResponse,
      pending_validation: pendingValidation,
      approved: approvedMemos,
      rejected: rejectedMemos,
      system_anomalies: systemAnomalies,
      by_type: memosByType,
      by_status: memosByStatus,
      approval_rate: totalMemos > 0 ? ((approvedMemos / totalMemos) * 100).toFixed(2) : 0,
      rejection_rate: totalMemos > 0 ? ((rejectedMemos / totalMemos) * 100).toFixed(2) : 0,
      response_rate:
        totalMemos > 0 ? (((totalMemos - pendingResponse) / totalMemos) * 100).toFixed(2) : 0,
    };
  }

  // ============================================================================
  // 8. CRUD OPERATIONS
  // ============================================================================

  protected async create(): Promise<void> {
    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(MEMOS_ERRORS.GUID_GENERATION_FAILED);
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.author_user]: this.author_user,
      [this.db.target_user]: this.target_user,
      [this.db.validator_user]: this.validator_user,
      [this.db.memo_type]: this.memo_type,
      [this.db.memo_status]: this.memo_status || MEMOS_DEFAULTS.MEMO_STATUS,
      [this.db.title]: this.title,
      [this.db.memo_content]: this.memo_content,
      [this.db.auto_generated]: this.auto_generated || MEMOS_DEFAULTS.AUTO_GENERATED,
      [this.db.details]: this.details,
      [this.db.incident_datetime]: this.incident_datetime,
      [this.db.affected_session]: this.affected_session,
      [this.db.affected_entries]: this.affected_entries,
    });

    if (!lastID) {
      throw new Error(MEMOS_ERRORS?.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    if (!this.id) {
      throw new Error(MEMOS_ERRORS?.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};

    if (this.memo_status !== undefined) updateData[this.db.memo_status] = this.memo_status;
    if (this.title !== undefined) updateData[this.db.title] = this.title;
    if (this.memo_content !== undefined) updateData[this.db.memo_content] = this.memo_content;
    if (this.details !== undefined) updateData[this.db.details] = this.details;
    if (this.validator_user !== undefined) updateData[this.db.validator_user] = this.validator_user;

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(MEMOS_ERRORS?.UPDATE_FAILED || 'Memo update failed');
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
}
