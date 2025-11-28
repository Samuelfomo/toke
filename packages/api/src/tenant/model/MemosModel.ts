import {
  MemoContent,
  MEMOS_DEFAULTS,
  MEMOS_ERRORS,
  MemoStatus,
  MemosValidationUtils,
  MemoType,
  Message,
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
        [this.db.memo_status]: MemoStatus.PENDING,
      },
      paginationOptions,
    );
  }

  // Memos en attente de validation (pour le manager)
  protected async findSubmitForValidation(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.memo_status]: MemoStatus.SUBMITTED,
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

  /**
   * Soumettre une réponse utilisateur
   */
  protected async submitUserResponse(
    memo: number,
    user_guid: string,
    status: MemoStatus.SUBMITTED | MemoStatus.PENDING,
    response: Message | Message[],
  ): Promise<boolean> {
    // Ajouter le message à la timeline
    const contentAdded = await this.addMessageToContent(memo, user_guid, response, 'response');

    if (!contentAdded) return false;

    // Mettre à jour le statut
    const statusUpdated = await this.updateOne(
      this.db.tableName,
      { [this.db.memo_status]: status },
      { [this.db.id]: memo },
    );

    return statusUpdated > 0;
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

  protected async processValidation(
    memo: number,
    validator: number,
    validator_guid: string,
    decision: MemoStatus.APPROVED | MemoStatus.REJECTED,
    message?: Message | Message[],
  ): Promise<boolean> {
    if (message) {
      const contentAdded = await this.addMessageToContent(
        memo,
        validator_guid,
        message,
        'escalation',
      );
      if (!contentAdded) return false;
    }

    const updates: Record<string, any> = {
      [this.db.memo_status]:
        decision === MemoStatus.APPROVED ? MemoStatus.APPROVED : MemoStatus.REJECTED,
      [this.db.validator_user]: validator,
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: memo,
    });
    return affectedRows > 0;
  }

  /**
   * Valider un memo avec commentaires (remplace validateMemo)
   */
  protected async validateMemoWithComments(
    memo: number,
    validator_guid: string,
    validator: number,
    decision: MemoStatus.APPROVED | MemoStatus.REJECTED,
    message?: Message,
  ): Promise<boolean> {
    const memoData = await this.find(memo);
    if (!memoData) return false;
    if (message) {
      const contentAdded = await this.addMessageToContent(
        memo,
        validator_guid,
        message,
        'validation',
      );

      if (!contentAdded) return false;
    }

    // Mettre à jour le statut et le validateur
    const updates = {
      [this.db.memo_status]: decision,
      [this.db.validator_user]: validator,
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

  /**
   * Escalader un memo avec raison
   */
  protected async escalateMemoWithReason(
    memo: number,
    escalator_guid: string,
    new_validator: number,
    message?: Message | Message[],
  ): Promise<boolean> {
    const memoData = await this.find(memo);
    if (!memoData) return false;
    if (message) {
      const contentAdded = await this.addMessageToContent(
        memo,
        escalator_guid,
        message,
        'escalation',
      );
      if (!contentAdded) return false;
    }

    // Mettre à jour le validateur et le statut
    const updates = {
      [this.db.validator_user]: new_validator,
      // [this.db.memo_status]: MemoStatus.PENDING,
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: memo,
    });

    return affectedRows > 0;
  }

  // ============================================================================
  // 6. GESTION DES ATTACHMENTS
  // ============================================================================

  /**
   * Ajoute un message à la timeline du memo
   */
  protected async addMessageToContent(
    memo: number,
    user_guid: string,
    message: Message | Message[],
    message_type?: 'initial' | 'response' | 'validation' | 'escalation',
  ): Promise<boolean> {
    const memoData = await this.find(memo);
    if (!memoData) return false;

    const currentContent: MemoContent[] = memoData.memo_content || [];

    const newContent: MemoContent = {
      created_at: new Date().toISOString(),
      user: user_guid,
      message,
      type: message_type || 'response',
    };

    const updatedContent = [...currentContent, newContent];

    const affectedRows = await this.updateOne(
      this.db.tableName,
      { [this.db.memo_content]: updatedContent },
      { [this.db.id]: memo },
    );

    return affectedRows > 0;
  }

  protected async removeAttachment(memo: number, attachment_index: number): Promise<boolean> {
    const memoData = await this.find(memo);
    if (!memoData || !Array.isArray(memoData.attachments)) return false;

    const currentAttachments = MemosValidationUtils.normalizeMessages(memoData.memo_content);
    if (attachment_index < 0 || attachment_index >= currentAttachments.length) return false;

    currentAttachments.splice(attachment_index, 1);

    const updates = {
      [this.db.memo_content]: currentAttachments,
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: memo,
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

    // // Créer le message initial si fourni dans details
    // const initialContent: MemoContent[] = [];
    //
    // if (this.details) {
    //   initialContent.push({
    //     created_at: new Date().toISOString(),
    //     user: 'system', // ou this.author_user converti en GUID
    //     message: {
    //       type: MessageType.TEXT,
    //       content: this.details,
    //     },
    //     type: 'initial',
    //   });
    // }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.author_user]: this.author_user,
      [this.db.target_user]: this.target_user,
      [this.db.validator_user]: this.validator_user,
      [this.db.memo_type]: this.memo_type,
      [this.db.memo_status]: this.memo_status,
      [this.db.title]: this.title,
      [this.db.auto_generated]: this.auto_generated || MEMOS_DEFAULTS.AUTO_GENERATED,
      [this.db.details]: this.details,
      [this.db.incident_datetime]: this.incident_datetime,
      [this.db.affected_session]: this.affected_session,
      [this.db.affected_entries]: this.affected_entries,
      [this.db.memo_content]: this.memo_content, // ✅ NOUVEAU
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

  /**
   * Récupère toute la timeline du memo
   */
  protected async getMemoTimeline(memo: number): Promise<MemoContent[]> {
    const memoData = await this.find(memo);
    return memoData?.memo_content || [];
  }

  /**
   * Récupère le dernier message du memo
   */
  protected async getLatestMessage(memo: number): Promise<MemoContent | null> {
    const timeline = await this.getMemoTimeline(memo);
    return timeline.length > 0 ? timeline[timeline.length - 1] : null;
  }

  /**
   * Récupère tous les messages d'un utilisateur spécifique
   */
  protected async getMessagesByUser(memo: number, user_guid: string): Promise<MemoContent[]> {
    const timeline = await this.getMemoTimeline(memo);
    return timeline.filter((content) => content.user === user_guid);
  }

  /**
   * Compte le nombre total de messages dans le memo
   */
  protected async countMessages(memo: number): Promise<number> {
    const timeline = await this.getMemoTimeline(memo);
    return timeline.length;
  }

  /**
   * Récupère tous les messages de type spécifique
   */
  protected async getMessagesByType(
    memo: number,
    type: 'initial' | 'response' | 'validation' | 'escalation',
  ): Promise<MemoContent[]> {
    const timeline = await this.getMemoTimeline(memo);
    return timeline.filter((content) => content.type === type);
  }

  /**
   * Vérifie si un utilisateur a déjà répondu
   */
  protected async hasUserResponded(memo: number, user_guid: string): Promise<boolean> {
    const userMessages = await this.getMessagesByUser(memo, user_guid);
    return userMessages.length > 0;
  }

  /**
   * Remplace toute la timeline (utile pour migrations)
   */
  protected async replaceMemoContent(memo: number, newContent: MemoContent[]): Promise<boolean> {
    const affectedRows = await this.updateOne(
      this.db.tableName,
      { [this.db.memo_content]: newContent },
      { [this.db.id]: memo },
    );
    return affectedRows > 0;
  }

  // ============================================================================
  // MÉTHODES UTILITAIRES POUR ANALYTICS
  // ============================================================================

  /**
   * Calcule le temps moyen de réponse (en heures)
   */
  protected async getAverageResponseTime(memo: number): Promise<number> {
    const timeline = await this.getMemoTimeline(memo);

    if (timeline.length < 2) return 0;

    let totalTime = 0;
    let intervals = 0;

    for (let i = 1; i < timeline.length; i++) {
      const prevTime = new Date(timeline[i - 1].created_at).getTime();
      const currTime = new Date(timeline[i].created_at).getTime();
      totalTime += currTime - prevTime;
      intervals++;
    }

    return intervals > 0 ? totalTime / intervals / (1000 * 60 * 60) : 0;
  }

  /**
   * Compte les échanges entre deux utilisateurs
   */
  protected async countExchangesBetweenUsers(
    memo: number,
    user1_guid: string,
    user2_guid: string,
  ): Promise<number> {
    const timeline = await this.getMemoTimeline(memo);

    let exchanges = 0;
    let lastUser = '';

    for (const content of timeline) {
      if (
        (content.user === user1_guid || content.user === user2_guid) &&
        content.user !== lastUser
      ) {
        exchanges++;
        lastUser = content.user;
      }
    }

    return Math.floor(exchanges / 2);
  }
}
