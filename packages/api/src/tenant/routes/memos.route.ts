import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  MemoContent,
  MEMOS_CODES,
  MEMOS_ERRORS,
  MEMOS_MESSAGES,
  MemoStatus,
  MemosValidationUtils,
  MemoType,
  MessageType,
  paginationSchema,
  ROLES_CODES,
  USERS_CODES,
  USERS_ERRORS,
  validateAddMessage,
  validateEscalation,
  validateMemosCreation,
  validateMemosFilters,
  validateMemosUpdate,
  validateMemoValidation,
  WORK_SESSIONS_CODES,
  WorkSessionsValidationUtils,
} from '@toke/shared';
import { Op } from 'sequelize';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import User from '../class/User.js';
import Memos from '../class/Memos.js';
import WorkSessions from '../class/WorkSessions.js';
import { TenantRevision } from '../../tools/revision.js';
import { responseValue, RoleValues, tableName } from '../../utils/response.model.js';
import { ValidationUtils } from '../../utils/view.validator.js';
import TimeEntries from '../class/TimeEntries.js';
import UserRole from '../class/UserRole.js';
import Role from '../class/Role.js';
import { FCMService } from '../../tools/notification.service.js';

const router = Router();

// === ROUTES DE LISTAGE GÉNÉRAL ===

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);

    const views = ValidationUtils.validateView(req.query.view, responseValue.MINIMAL);

    const memos = await Memos.exportable({}, paginationData, views);

    return R.handleSuccess(res, {
      memos,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.PAGINATION_INVALID,
        message: MEMOS_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: MEMOS_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await TenantRevision.getRevision(tableName.MEMOS);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { offset, limit, ...filterQuery } = req.query;
    const filtersValidation = validateMemosFilters(filterQuery);
    if (!filtersValidation.success) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: filtersValidation.errors,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);
    const filters = filtersValidation.data;
    const conditions: Record<string, any> = {};

    if (filters?.memo_type) {
      conditions.memo_type = filters.memo_type;
    }
    if (filters?.memo_status) {
      conditions.memo_status = filters.memo_status;
    }
    if (filters?.author_user) {
      conditions.author_user = filters.author_user;
    }
    if (filters?.target_user) {
      conditions.target_user = filters.target_user;
    }
    if (filters?.validator_user) {
      conditions.validator_user = filters.validator_user;
    }
    if (filters?.auto_generated !== undefined) {
      conditions.auto_generated = filters.auto_generated;
    }
    if (filters?.has_content) {
      conditions.has_content = filters.has_content;
    }
    if (filters?.incident_date_from) {
      conditions.incident_date_from = filters.incident_date_from;
    }
    if (filters?.incident_date_to) {
      conditions.incident_date_to = filters.incident_date_to;
    }
    if (filters?.pending_validation) {
      conditions.pending_validation = filters.pending_validation;
    }
    if (filters?.my_memos_only) {
      conditions.my_memos_only = filters.my_memos_only;
    }

    const views = ValidationUtils.validateView(req.query.view, responseValue.MINIMAL);

    const memoEntries = await Memos._list(conditions, paginationOptions);
    const memos = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || memoEntries?.length || 0,
        count: memoEntries?.length || 0,
      },
      items: memoEntries
        ? await Promise.all(memoEntries.map(async (memo) => await memo.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { memos });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: MEMOS_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

// === ROUTES PAR TYPE DE MÉMO ===

router.get('/type/:memoType/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { memoType } = req.params;

    if (!Object.values(MemoType).includes(memoType as MemoType)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.MEMO_TYPE_INVALID,
        message: MEMOS_ERRORS.MEMO_TYPE_INVALID,
      });
    }

    const views = ValidationUtils.validateView(req.query.view, responseValue.MINIMAL);

    const memoEntries = await Memos._findByType(memoType as MemoType);
    const memos = {
      memo_type: memoType,
      items: memoEntries
        ? await Promise.all(memoEntries.map(async (memo) => await memo.toJSON(views)))
        : [],
      count: memoEntries?.length || 0,
    };

    return R.handleSuccess(res, { memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === ROUTES PAR STATUT ===

router.get('/status/:memoStatus/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { memoStatus } = req.params;

    if (!Object.values(MemoStatus).includes(memoStatus as MemoStatus)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.MEMO_STATUS_INVALID,
        message: MEMOS_ERRORS.MEMO_STATUS_INVALID,
      });
    }
    // const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(req.query.view, responseValue.MINIMAL);

    const memoEntries = await Memos._findByStatus(memoStatus as MemoStatus, {});
    const memos = {
      memo_status: memoStatus,
      items: memoEntries
        ? await Promise.all(memoEntries.map(async (memo) => await memo.toJSON(views)))
        : [],
      count: memoEntries?.length || 0,
    };

    return R.handleSuccess(res, { memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === MÉMOS EN ATTENTE DE VALIDATION ===

router.get('/pending', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const memoEntries = await Memos._findPendingValidation();

    const offset = paginationOptions.offset || 0;
    const limit = paginationOptions.limit;
    const paginatedItems = limit
      ? memoEntries?.slice(offset, offset + limit)
      : memoEntries?.slice(offset);

    const views = ValidationUtils.validateView(req.query.view, responseValue.MINIMAL);

    const memos = {
      pagination: {
        offset,
        limit: limit || paginatedItems?.length || 0,
        count: paginatedItems?.length || 0,
        total: memoEntries?.length || 0,
      },
      items: paginatedItems
        ? await Promise.all(paginatedItems.map(async (memo) => await memo.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { pendingMemos: memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// 📝 Get list of employee memos awaiting manager validation with deadline information
router.get('/pending-validation', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { validator } = req.query; // 🆕 Ajouter ce filtre

    if (!validator) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: 'validator_user is required',
      });
    }

    if (!MemosValidationUtils.validateGuid(validator as string)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATOR_USER_INVALID,
        message: `${MEMOS_ERRORS.VALIDATOR_USER_INVALID}: ${validator}`,
      });
    }

    const validatorObj = await User._load(validator as string, true);
    if (!validatorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    // 🔥 Filtrer par validator_user
    const memoEntries = await Memos._list(
      {
        validator_user: validatorObj.getId(),
        memo_status: { [Op.in]: [MemoStatus.SUBMITTED, MemoStatus.PENDING] },
      },
      paginationOptions,
    );

    const views = ValidationUtils.validateView(req.query.view, responseValue.MINIMAL);

    const memos = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || memoEntries?.length || 0,
        count: memoEntries?.length || 0,
      },
      items: memoEntries
        ? await Promise.all(memoEntries.map(async (memo) => await memo.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { pendingMemos: memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// 🚨 Retrieve memos escalated from subordinate managers requiring senior approval
router.get('/escalated-to-me', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { validator } = req.query; // GUID du manager actuel

    if (!validator) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: 'validator_user is required',
      });
    }

    if (!MemosValidationUtils.validateGuid(String(validator))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATOR_USER_INVALID,
        message: MEMOS_ERRORS.VALIDATOR_USER_INVALID,
      });
    }

    const validatorObj = await User._load(validator as string, true);
    if (!validatorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const memoEntries = await Memos._list({
      validator_user: validatorObj.getId(),
      memo_status: MemoStatus.SUBMITTED,
      // Filtre pour n'avoir que les escaladés (validator_comments contient "Escaladed:")
    });

    const views = ValidationUtils.validateView(req.query.view, responseValue.MINIMAL);

    const memos = {
      items: memoEntries
        ? await Promise.all(
            memoEntries
              // .filter((m) => m.getValidatorComments()?.includes('Escaladed:'))
              .map(async (memo) => await memo.toJSON(views)),
          )
        : [],
      count: memoEntries?.length || 0,
      // memoEntries?.filter((m) => m.getValidatorComments()?.includes('Escaladed:')).length || 0,
    };

    return R.handleSuccess(res, { escalatedMemos: memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === MÉMOS AUTO-GÉNÉRÉS ===

// ⚡ View memos automatically created by system for attendance anomalies detection
router.get('/auto-generated', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const memoEntries = await Memos._findAutoGenerated();
    const views = ValidationUtils.validateView(req.query.view, responseValue.MINIMAL);
    const memos = {
      items: memoEntries
        ? await Promise.all(memoEntries.map(async (memo) => await memo.toJSON(views)))
        : [],
      count: memoEntries?.length || 0,
    };

    return R.handleSuccess(res, { autoGeneratedMemos: memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === MÉMOS URGENTS ===
// 🚨 List memos exceeding 24-hour validation deadline requiring immediate attention
router.get('/urgent', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const memoEntries = await Memos._findUrgentMemos();
    const views = ValidationUtils.validateView(req.query.view, responseValue.MINIMAL);
    const memos = {
      items: memoEntries
        ? await Promise.all(
            memoEntries.map(async (memo) => ({
              ...(await memo.toJSON(views)),
              is_urgent: memo.isUrgent(),
              incident_datetime: memo.getIncidentDatetime(),
            })),
          )
        : [],
      count: memoEntries?.length || 0,
    };

    return R.handleSuccess(res, { urgentMemos: memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === CRÉATION DE MÉMO ===
// 📋 Create memo to request justification from employee for attendance irregularities
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    // const validatedData = validateMemosCreation(req.body);
    const validation = validateMemosCreation(req.body);
    if (!validation.success) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: validation.errors,
      });
    }
    const validatedData = validation.data;
    if (validatedData === undefined) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
      });
    }

    // Vérification de l'existence de l'auteur
    const authorObj = await User._load(validatedData.author_user, true);
    if (!authorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'Author user not found',
      });
    }

    if (!authorObj.isActive()) {
      return R.handleError(res, HttpStatus.UNAUTHORIZED, {
        code: USERS_CODES.ACCOUNT_INACTIVE,
        message: USERS_ERRORS.ACCOUNT_INACTIVE,
      });
    }
    const roleObj = await Role._load(RoleValues.EMPLOYEE, false, true);
    if (!roleObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ROLES_CODES.ROLE_NOT_FOUND,
        message: ROLES_CODES.ROLE_NOT_FOUND,
      });
    }
    const identifier = {
      user: authorObj.getId()!,
      role: roleObj.getId()!,
    };

    const supervisorObj = await UserRole._load(identifier, false, true);
    if (!supervisorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: MEMOS_CODES.TARGET_USER_NOT_FOUND,
        message: MEMOS_ERRORS.TARGET_USER_NOT_FOUND,
      });
    }

    if (!validatedData.memo_content) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.MEMO_CONTENT_REQUIRED,
        message: MEMOS_ERRORS.MEMO_CONTENT_REQUIRED,
      });
    }

    const memoObj = new Memos()
      .setAuthorUser(authorObj.getId()!)
      .setMemoType(validatedData.memo_type)
      .setTitle(validatedData.title)
      .setMemoContent(validatedData.memo_content as MemoContent[])
      .setTargetUser(supervisorObj.getAssignedBy()!)
      .setMemoStatus(MemoStatus.SUBMITTED);

    // // Champs optionnels
    // if (validatedData.target_user) {
    //   const targetObj = await User._load(validatedData.target_user, true);
    //   if (targetObj) {
    //     memoObj.setTargetUser(targetObj.getId()!);
    //   }
    // }
    //
    // if (validatedData.validator_user) {
    //   const validatorObj = await User._load(validatedData.validator_user, true);
    //   if (validatorObj) {
    //     memoObj.setValidatorUser(validatorObj.getId()!);
    //   }
    // }
    //
    // if (validatedData.memo_status) {
    //   memoObj.setMemoStatus(validatedData.memo_status);
    // }

    if (validatedData.incident_datetime) {
      memoObj.setIncidentDatetime(new Date(validatedData.incident_datetime));
    }

    if (validatedData.affected_session) {
      const sessionObj = await WorkSessions._load(validatedData.affected_session, true);
      if (!sessionObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: MEMOS_CODES.AFFECTED_SESSION_NOT_FOUND,
          message: MEMOS_ERRORS.AFFECTED_SESSION_NOT_FOUND,
        });
      }
      memoObj.setAffectedSession(sessionObj.getId()!);
    }

    // if (validatedData.affected_entries) {
    //   const affectedEntries = await Promise.all(
    //     validatedData.affected_entries.map(async (entry) => {
    //       const sessionObj = await TimeEntries._load(entry, true);
    //       return sessionObj?.getId() ?? null;
    //     }),
    //   );
    //
    //   // 🧹 Enlever les null avant de les envoyer
    //   const validEntries = affectedEntries.filter((id): id is number => id !== null);
    //   memoObj.setAffectedEntriesIds(validEntries);
    // }

    if (validatedData.affected_entries) {
      const affectedEntries: number[] = [];

      for (const entryId of validatedData.affected_entries) {
        const entryObj = await TimeEntries._load(entryId, true);

        if (!entryObj) {
          return R.handleError(res, HttpStatus.NOT_FOUND, {
            code: MEMOS_CODES.AFFECTED_ENTRIES_NOT_FOUND,
            message: `${MEMOS_ERRORS.AFFECTED_ENTRIES_NOT_FOUND}: ${entryId}`,
          });
        }

        affectedEntries.push(entryObj.getId()!);
      }

      memoObj.setAffectedEntriesIds(affectedEntries);
    }

    await memoObj.save();

    if (memoObj.getAffectedEntriesIds() !== undefined || memoObj.getAffectedEntriesIds() !== null) {
      const affectedEntriesIds = memoObj.getAffectedEntriesIds();
      affectedEntriesIds?.map(async (entryId) => {
        const affectedEntryObj = await TimeEntries._load(entryId);
        if (affectedEntryObj) {
          affectedEntryObj.setMemo(memoObj.getId()!);
          await affectedEntryObj.save();
        }
      });
    }

    const supervisorData = await User._load(supervisorObj.getAssignedBy());
    let notification: boolean = false;
    if (supervisorData?.getDeviceToken()) {
      try {
        await FCMService.sendToToken(supervisorData?.getDeviceToken()!);
        notification = true;
      } catch (error: any) {
        notification = false;
        console.error(error);
      }
    }

    return R.handleCreated(res, { ...(await memoObj.toJSON()), notification });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('required')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: MEMOS_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

router.post('/manager', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validation = validateMemosCreation(req.body);
    if (!validation.success) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: validation.errors,
      });
    }
    const memoData = validation.data;

    if (memoData === undefined) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
      });
    }
    if (!memoData.target_user) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.TARGET_USER_REQUIRED,
        message: MEMOS_ERRORS.TARGET_USER_REQUIRED,
      });
    }

    if (memoData.target_user === memoData.author_user) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: MEMOS_CODES.ACTION_NOT_ALLOWED,
        message: MEMOS_ERRORS.NOT_ALLOWED,
      });
    }

    // Vérifier que target_user existe
    const targetUser = await User._load(memoData.target_user, true);
    if (!targetUser) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: MEMOS_CODES.TARGET_USER_NOT_FOUND,
        message: MEMOS_ERRORS.TARGET_USER_NOT_FOUND,
      });
    }

    // Vérifier que author_user existe
    const authorUser = await User._load(memoData.author_user, true);
    if (!authorUser) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: MEMOS_CODES.AUTHOR_USER_NOT_FOUND,
        message: MEMOS_ERRORS.AUTHOR_USER_NOT_FOUND,
      });
    }
    if (!authorUser.isActive()) {
      return R.handleError(res, HttpStatus.UNAUTHORIZED, {
        code: USERS_CODES.ACCOUNT_INACTIVE,
        message: USERS_ERRORS.ACCOUNT_INACTIVE,
      });
    }

    // TODO Vérifier que author_user est manager: à gérer avec le middleware après gestion des habilitations

    // TODO Vérifier que author_user est manager du target_user ou que le target_user fait partir de l'organigramme hierachique du author_user (de sa branche) et est en dessous
    // deja implementer a integrer

    const memoObj = new Memos()
      .setAuthorUser(authorUser.getId()!)
      .setMemoType(memoData.memo_type)
      .setTitle(memoData.title)
      .setTargetUser(targetUser.getId()!)
      .setMemoStatus(MemoStatus.PENDING)
      .setMemoContent(memoData.memo_content as MemoContent[]);

    if (memoData.incident_datetime) {
      memoObj.setIncidentDatetime(new Date(memoData.incident_datetime));
    }

    if (memoData.affected_session) {
      const sessionObj = await WorkSessions._load(memoData.affected_session, true);
      if (sessionObj) {
        memoObj.setAffectedSession(sessionObj.getId()!);
      }
    }

    if (memoData.affected_entries) {
      const affectedEntries = await Promise.all(
        memoData.affected_entries.map(async (entry) => {
          const sessionObj = await TimeEntries._load(entry, true);
          return sessionObj?.getId() ?? null;
        }),
      );

      // 🧹 Enlever les null avant de les envoyer
      const validEntries = affectedEntries.filter((id): id is number => id !== null);
      memoObj.setAffectedEntriesIds(validEntries);
    }

    await memoObj.save();

    if (memoObj.getAffectedEntriesIds() !== undefined || memoObj.getAffectedEntriesIds() !== null) {
      const affectedEntriesIds = memoObj.getAffectedEntriesIds();
      affectedEntriesIds?.map(async (entryId) => {
        const affectedEntryObj = await TimeEntries._load(entryId);
        if (affectedEntryObj) {
          affectedEntryObj.setMemo(memoObj.getId()!);
          await affectedEntryObj.save();
        }
      });
    }

    let notification: boolean = false;
    if (targetUser.getDeviceToken()) {
      try {
        await FCMService.sendToToken(targetUser?.getDeviceToken()!);
        notification = true;
      } catch (error: any) {
        notification = false;
        console.error(error);
      }
    }

    return R.handleCreated(res, { ...(await memoObj.toJSON()), notification });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.CREATION_FAILED,
      message: error.message,
    });
  }
});

// === ROUTES PAR AUTEUR ===

// 📝 List all memos created by current manager with response status tracking
router.get('/my-created', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { author, view } = req.query;
    if (!author) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.AUTHOR_USER_REQUIRED,
        message: MEMOS_ERRORS.AUTHOR_USER_REQUIRED,
      });
    }

    if (!MemosValidationUtils.validateGuid(author as string)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.AUTHOR_USER_INVALID,
        message: MEMOS_ERRORS.AUTHOR_USER_INVALID,
      });
    }
    // const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(view, responseValue.MINIMAL);

    // // 🔹 2. Validation du paramètre "view"
    // const { view } = req.query;
    // const viewValue = Array.isArray(view) ? view[0] : view;
    // const views = Object.values(responseValue).includes(viewValue as any)
    //   ? viewValue
    //   : responseValue.FULL; // Valeur par défaut

    const userObj = await User._load(req.query.author as string, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const memoEntries = await Memos._listByAuthor(userObj.getId()!);
    const memos = {
      items: memoEntries
        ? await Promise.all(memoEntries.map(async (memo) => await memo.toJSON(views)))
        : [],
      count: memoEntries?.length || 0,
    };

    return R.handleSuccess(res, { memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});
router.get('/my-memos', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { author, view } = req.query;
    if (!author) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.AUTHOR_USER_REQUIRED,
        message: MEMOS_ERRORS.AUTHOR_USER_REQUIRED,
      });
    }

    if (!MemosValidationUtils.validateGuid(author as string)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.AUTHOR_USER_INVALID,
        message: MEMOS_ERRORS.AUTHOR_USER_INVALID,
      });
    }
    // const paginationOptions = paginationSchema.parse(req.query);
    const views = ValidationUtils.validateView(view, responseValue.FULL);

    // // 🔹 2. Validation du paramètre "view"
    // const { view } = req.query;
    // const viewValue = Array.isArray(view) ? view[0] : view;
    // const views = Object.values(responseValue).includes(viewValue as any)
    //   ? viewValue
    //   : responseValue.FULL; // Valeur par défaut

    const userObj = await User._load(req.query.author as string, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    // const memoEntries = await Memos._listByAuthor(userObj.getId()!);
    // const targetMemoEntries = await Memos._listByTarget(userObj.getId()!);
    const memoEntries = (await Memos._listByAuthor(userObj.getId()!)) ?? [];
    const targetMemoEntries = (await Memos._listByTarget(userObj.getId()!)) ?? [];
    const memos = {
      count: targetMemoEntries?.length + memoEntries?.length,
      items: [
        ...(memoEntries.length
          ? await Promise.all(memoEntries.map(async (memo) => await memo.toJSON(views)))
          : []),
        ...(targetMemoEntries
          ? await Promise.all(targetMemoEntries.map(async (memo) => await memo.toJSON(views)))
          : []),
      ],
      // my_created: {
      //   count: memoEntries?.length || 0,
      //   items: memoEntries
      //     ? await Promise.all(memoEntries.map(async (memo) => await memo.toJSON(views)))
      //     : [],
      // },
      // target_user: {
      //   count: targetMemoEntries?.length || 0,
      //   items: targetMemoEntries
      //     ? await Promise.all(targetMemoEntries.map(async (memo) => await memo.toJSON(views)))
      //     : [],
      // },
    };

    return R.handleSuccess(res, { memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

router.get('/requirement', Ensure.get(), async (req: Request, res: Response) => {
  try {
    return R.handleSuccess(res, {
      meno_types: {
        count: Object.entries(MemoType).length,
        items: Object.entries(MemoType).map(([key, value]) => ({
          key,
          value,
        })),
      },
      memo_statues: {
        count: Object.entries(MemoStatus).length,
        items: Object.entries(MemoStatus).map(([key, value]) => ({
          key,
          value,
        })),
      },
      content_type: {
        count: Object.entries(MessageType).length,
        items: Object.entries(MessageType).map(([key, value]) => ({
          key,
          value,
        })),
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === RÉCUPÉRATION PAR GUID ===

router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!MemosValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_GUID,
        message: MEMOS_ERRORS.GUID_INVALID,
      });
    }

    const memoObj = await Memos._load(req.params.guid, true);
    if (!memoObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: MEMOS_CODES.MEMO_NOT_FOUND,
        message: MEMOS_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      memo: await memoObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// === MISE À JOUR DE MÉMO ===

// 📝 Modify memo content while in draft status before sending to employee
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    if (!MemosValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_GUID,
        message: MEMOS_ERRORS.GUID_INVALID,
      });
    }

    const memoObj = await Memos._load(req.params.guid, true);
    if (!memoObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: MEMOS_CODES.MEMO_NOT_FOUND,
        message: MEMOS_ERRORS.NOT_FOUND,
      });
    }
    // if (
    //   memoObj.getMemoStatus() !== MemoStatus.DRAFT &&
    //   memoObj.getMemoStatus() !== MemoStatus.SUBMITTED
    // ) {
    //   return R.handleError(res, HttpStatus.FORBIDDEN, {
    //     code: MEMOS_CODES.CANNOT_MODIFY_PROCESSED_MEMO,
    //     message:
    //       MEMOS_ERRORS.CANNOT_MODIFY_PROCESSED_MEMO ||
    //       'Prohibited action: the memo must be in DRAFT or SUBMITTED status.',
    //   });
    // }

    // Vérifier qu'on ne modifie pas un memo traité
    const processedStatuses = [MemoStatus.APPROVED, MemoStatus.REJECTED];
    if (processedStatuses.includes(memoObj.getMemoStatus()!)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.CANNOT_MODIFY_PROCESSED_MEMO,
        message: MEMOS_ERRORS.CANNOT_MODIFY_PROCESSED_MEMO,
      });
    }

    const validate = validateMemosUpdate(req.body);

    if (!validate.success) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: validate.errors,
      });
    }
    const validatedData = validate.data;
    if (!validatedData) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
      });
    }

    if (validatedData.memo_status) {
      memoObj.setMemoStatus(validatedData.memo_status);
    }
    if (validatedData.title) {
      memoObj.setTitle(validatedData.title);
    }
    if (validatedData.memo_content) {
      memoObj.setMemoContent(validatedData.memo_content as MemoContent[]);
    }
    if (validatedData.incident_datetime) {
      memoObj.setIncidentDatetime(new Date(validatedData.incident_datetime));
    }
    await memoObj.save();
    return R.handleSuccess(res, await memoObj.toJSON());
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: MEMOS_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

// === SUPPRESSION DE MÉMO ===

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!MemosValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_GUID,
        message: MEMOS_ERRORS.GUID_INVALID,
      });
    }

    const memoObj = await Memos._load(req.params.guid, true);
    if (!memoObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: MEMOS_CODES.MEMO_NOT_FOUND,
        message: MEMOS_ERRORS.NOT_FOUND,
      });
    }

    await memoObj.delete();
    return R.handleSuccess(res, {
      message: MEMOS_MESSAGES.DELETED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

// === GESTION DU CYCLE DE VIE ===

router.patch('/:guid/manager-respond', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    if (!MemosValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_GUID,
        message: MEMOS_ERRORS.GUID_INVALID,
      });
    }

    const memoObj = await Memos._load(req.params.guid, true);
    if (!memoObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: MEMOS_CODES.MEMO_NOT_FOUND,
        message: MEMOS_ERRORS.NOT_FOUND,
      });
    }

    const validContent = validateAddMessage(req.body);

    if (!validContent.success) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: validContent.errors,
      });
    }
    const validatedData = validContent.data;
    if (!validatedData) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
      });
    }

    // const content = {
    //   type: validatedData.message_type,
    //   content: validatedData.message_content,
    // };
    const data = await memoObj.submitMemosForResponse(validatedData.user, validatedData.message);

    let notification: boolean = false;
    const targetUser = await User._load(memoObj.getTargetUser()!);
    if (targetUser?.getDeviceToken()) {
      try {
        await FCMService.sendToToken(targetUser?.getDeviceToken()!);
        notification = true;
      } catch (error: any) {
        notification = false;
        console.error(error);
      }
    }

    return R.handleSuccess(
      res,
      { ...(await data!.toJSON(responseValue.MINIMAL)), notification },
      //   {
      //   message: 'Memo submitted for response successfully',
      //   memo: await memoObj.toJSON(responseValue.MINIMAL),
      // }
    );
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.SUBMISSION_FAILED,
      message: error.message,
    });
  }
});

// ============================================================================
// RÉPONDRE À UN MEMO (EMPLOYÉ RÉPOND AU MANAGER OU SYSTÈME)
// ============================================================================
router.patch('/:guid/respond', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    const memoObj = await Memos._load(guid, true);

    if (!memoObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: MEMOS_CODES.MEMO_NOT_FOUND,
        message: MEMOS_ERRORS.NOT_FOUND,
      });
    }

    // Vérifier que le memo est en attente de réponse
    if (memoObj.getMemoStatus() !== MemoStatus.PENDING) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_STATUS_TRANSITION,
        message: 'Memo is not pending response',
      });
    }

    // const validation = validateMemoResponse(req.body);
    // if (!validation.success || !validation.data) {
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: MEMOS_CODES.VALIDATION_FAILED,
    //     message: MEMOS_ERRORS.VALIDATION_FAILED,
    //     details: validation.errors,
    //   });
    // }

    const validContent = validateAddMessage(req.body);

    if (!validContent.success) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: validContent.errors,
      });
    }
    const validatedData = validContent.data;
    if (!validatedData) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
      });
    }

    // const content = {
    //   type: validatedData.message_type,
    //   content: validatedData.message_content,
    // };

    const data = await memoObj.submitMemosForValidation(validatedData.user, validatedData.message);

    let notification: boolean = false;
    const targetUser = await User._load(memoObj.getTargetUser()!);
    if (targetUser?.getDeviceToken()) {
      try {
        await FCMService.sendToToken(targetUser?.getDeviceToken()!);
        notification = true;
      } catch (error: any) {
        notification = false;
        console.error(error);
      }
    }

    return R.handleSuccess(
      res,
      { ...(await data!.toJSON(responseValue.FULL)), notification },
      //   {
      //   message: MEMOS_MESSAGES.RESPONDED_SUCCESSFULLY,
      //   memo: await memoObj.toJSON(responseValue.FULL),
      // }
    );
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.RESPONSE_FAILED,
      message: error.message,
    });
  }
});

//👍 Approve employee justification memo and trigger automatic attendance correction
router.patch('/:guid/validate', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!MemosValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_GUID,
        message: MEMOS_ERRORS.GUID_INVALID,
      });
    }

    const memoObj = await Memos._load(guid, true);
    if (!memoObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: MEMOS_CODES.MEMO_NOT_FOUND,
        message: MEMOS_ERRORS.NOT_FOUND,
      });
    }

    // // Vérifier que le memo est en soumit de réponse
    // if (memoObj.getMemoStatus() !== MemoStatus.SUBMITTED) {
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: MEMOS_CODES.INVALID_STATUS_TRANSITION,
    //     message: 'Memo is not submitted response',
    //   });
    // }

    const validation = validateMemoValidation(req.body);

    if (!validation.success || !validation.data) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: validation.errors,
      });
    }

    const validatedData = validation.data;

    const validatorObj = await User._load(validatedData.validator_user, true);
    if (!validatorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'Validator user not found',
      });
    }

    // Vérifier qu'on ne valide pas son propre memo
    if (memoObj.getAuthorUser() === validatorObj.getId()) {
      return R.handleError(res, HttpStatus.UNAUTHORIZED, {
        code: MEMOS_CODES.SELF_VALIDATION_NOT_ALLOWED,
        message: MEMOS_ERRORS.SELF_VALIDATION_NOT_ALLOWED,
      });
    }

    const data = await memoObj.approve(
      validatorObj.getId()!,
      validatedData.validator_user,
      validatedData.message,
    );

    let notification: boolean = false;
    const targetUser = await User._load(memoObj.getTargetUser()!);
    if (targetUser?.getDeviceToken()) {
      try {
        await FCMService.sendToToken(targetUser?.getDeviceToken()!);
        notification = true;
      } catch (error: any) {
        notification = false;
        console.error(error);
      }
    }

    return R.handleSuccess(
      res,
      { ...(await data!.toJSON()), notification },
      //   {
      //   message: MEMOS_MESSAGES.APPROVED_SUCCESSFULLY,
      //   memo: await memoObj.toJSON(),
      // }
    );
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: MEMOS_CODES.APPROVAL_FAILED,
        message: error.message,
      });
    }
  }
});

router.patch('/validate-all', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guids } = req.body;

    // Vérification du tableau de GUIDs
    if (!Array.isArray(guids) || guids.length === 0) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_GUID,
        message: 'La liste des GUIDs est invalide ou vide.',
      });
    }

    // Validation de chaque GUID
    for (const guid of guids) {
      if (!MemosValidationUtils.validateGuid(guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: MEMOS_CODES.INVALID_GUID,
          message: `${MEMOS_ERRORS.GUID_INVALID}: ${guid}`,
        });
      }
    }

    const validation = validateMemoValidation(req.body);
    if (!validation.success || !validation.data) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: validation.errors,
      });
    }

    const validatedData = validation.data;

    // Vérifier l'existence du validateur
    const validatorObj = await User._load(validatedData.validator_user, true);
    if (!validatorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'Validator user not found',
      });
    }

    // Traitement de chaque memo
    // for (const guid of guids) {
    //   const memoObj = await Memos._load(guid, true);
    //   if (!memoObj) {
    //     return R.handleError(res, HttpStatus.NOT_FOUND, {
    //       code: MEMOS_CODES.MEMO_NOT_FOUND,
    //       message: `${MEMOS_ERRORS.NOT_FOUND} : ${guid}`,
    //     });
    //   }
    //
    //   // Empêcher la validation de son propre memo
    //   if (memoObj.getAuthorUser() === validatorObj.getId()) {
    //     return R.handleError(res, HttpStatus.UNAUTHORIZED, {
    //       code: MEMOS_CODES.SELF_VALIDATION_NOT_ALLOWED,
    //       message: MEMOS_ERRORS.SELF_VALIDATION_NOT_ALLOWED,
    //     });
    //   }
    //
    //   await memoObj.approve(validatorObj.getId()!, validatedData.validator_user);
    // }

    await Promise.all(
      guids.map(async (guid) => {
        const memoObj = await Memos._load(guid, true);
        if (!memoObj) {
          return R.handleError(res, HttpStatus.NOT_FOUND, {
            code: MEMOS_CODES.MEMO_NOT_FOUND,
            message: `${MEMOS_ERRORS.NOT_FOUND} : ${guid}`,
          });
        }

        // Empêcher la validation de son propre memo
        if (memoObj.getAuthorUser() === validatorObj.getId()) {
          return R.handleError(res, HttpStatus.UNAUTHORIZED, {
            code: MEMOS_CODES.SELF_VALIDATION_NOT_ALLOWED,
            message: MEMOS_ERRORS.SELF_VALIDATION_NOT_ALLOWED,
          });
        }

        await memoObj.approve(validatorObj.getId()!, validatedData.validator_user);
      }),
    );

    return R.handleSuccess(res, {
      message: MEMOS_MESSAGES.APPROVED_SUCCESSFULLY,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: MEMOS_CODES.APPROVAL_FAILED,
        message: error.message,
      });
    }
  }
});

//👎 Reject memo with mandatory comment and notify employee of decision
router.patch('/:guid/reject', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!MemosValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_GUID,
        message: MEMOS_ERRORS.GUID_INVALID,
      });
    }

    const memoObj = await Memos._load(guid, true);
    if (!memoObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: MEMOS_CODES.MEMO_NOT_FOUND,
        message: MEMOS_ERRORS.NOT_FOUND,
      });
    }

    // // Vérifier que le statut est SUBMITTED or PENDING
    // if (
    //   memoObj.getMemoStatus() !== MemoStatus.SUBMITTED ||
    //   memoObj.getMemoStatus() !== MemoStatus.PENDING
    // ) {
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: MEMOS_CODES.INVALID_STATUS_TRANSITION,
    //     message: 'Memo is not in pending or submitted status',
    //   });
    // }

    const validation = validateMemoValidation(req.body);
    if (!validation.success || !validation.data) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: validation.errors,
      });
    }
    const validatedData = validation.data;

    const validatorObj = await User._load(validatedData.validator_user, true);
    if (!validatorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'Validator user not found',
      });
    }

    const data = await memoObj.reject(
      validatorObj.getId()!,
      validatedData.validator_user,
      validatedData.message,
    );

    let notification: boolean = false;
    const targetUser = await User._load(memoObj.getTargetUser()!);
    if (targetUser?.getDeviceToken()) {
      try {
        await FCMService.sendToToken(targetUser?.getDeviceToken()!);
        notification = true;
      } catch (error: any) {
        notification = false;
        console.error(error);
      }
    }

    return R.handleSuccess(
      res,
      { ...(await data!.toJSON()), notification },
      //   {
      //   message: MEMOS_MESSAGES.REJECTED_SUCCESSFULLY,
      //   memo: await memoObj.toJSON(),
      // }
    );
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: MEMOS_CODES.REJECTION_FAILED,
        message: error.message,
      });
    }
  }
});

// 🔝🚨 Forward memo to higher manager level when unable to decide or needs approval
router.patch('/:guid/escalate', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    if (!MemosValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_GUID,
        message: MEMOS_ERRORS.GUID_INVALID,
      });
    }

    const memoObj = await Memos._load(req.params.guid, true);
    if (!memoObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: MEMOS_CODES.MEMO_NOT_FOUND,
        message: MEMOS_ERRORS.NOT_FOUND,
      });
    }

    const validation = validateEscalation(req.body);

    if (!validation.success || !validation.data) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: validation.errors,
      });
    }
    const validatedData = validation.data;

    const validatorObj = await User._load(validatedData.escalator, true);
    if (!validatorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'Validator user not found',
      });
    }

    const newValidatorObj = await User._load(validatedData.new_validator, true);
    if (!newValidatorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'New validator user not found',
      });
    }

    const data = await memoObj.escalate(
      validatorObj.getGuid()!,
      newValidatorObj.getId()!,
      validatedData.message,
    );

    let notification: boolean = false;
    if (newValidatorObj.getDeviceToken()) {
      try {
        await FCMService.sendToToken(newValidatorObj.getDeviceToken()!);
        notification = true;
      } catch (error: any) {
        notification = false;
        console.error(error);
      }
    }

    return R.handleSuccess(res, {
      message: 'Memo escalated successfully',
      memo: await data?.toJSON(),
      new_validator: newValidatorObj.toPublicJSON(),
      notification: notification,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.ESCALATION_FAILED,
      message: error.message,
    });
  }
});

// === ROUTES PAR CIBLE ===

router.get('/target/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!MemosValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_GUID,
        message: MEMOS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const views = ValidationUtils.validateView(req.query.view, responseValue.MINIMAL);

    const memoEntries = await Memos._listByTarget(userObj.getId()!);
    const memos = {
      memos: memoEntries
        ? await Promise.all(memoEntries.map(async (memo) => await memo.toJSON(views)))
        : [],
      count: memoEntries?.length || 0,
    };

    return R.handleSuccess(res, { memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === ROUTES PAR VALIDATEUR ===

router.get('/validator/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!MemosValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_GUID,
        message: MEMOS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const views = ValidationUtils.validateView(req.query.view, responseValue.MINIMAL);

    const memoEntries = await Memos._listByValidator(userObj.getId()!);
    const memos = {
      memos: memoEntries
        ? await Promise.all(memoEntries.map(async (memo) => await memo.toJSON(views)))
        : [],
      count: memoEntries?.length || 0,
    };

    return R.handleSuccess(res, { memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === ROUTES PAR SESSION ===

router.get('/session/:sessionGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!WorkSessionsValidationUtils.validateGuid(req.params.sessionGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_GUID,
        message: MEMOS_ERRORS.GUID_INVALID,
      });
    }

    const sessionObj = await WorkSessions._load(req.params.sessionGuid, true);
    if (!sessionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: WORK_SESSIONS_CODES.WORK_SESSION_NOT_FOUND,
        message: 'Work session not found',
      });
    }

    const memoEntries = await Memos._findBySession(sessionObj.getId()!);
    const memos = {
      session: await sessionObj.toJSON(responseValue.MINIMAL),
      memos: memoEntries
        ? await Promise.all(
            memoEntries.map(async (memo) => await memo.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: memoEntries?.length || 0,
    };

    return R.handleSuccess(res, { memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === MÉMOS PAR PLAGE DE DATES ===

router.get('/date-range', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: 'start_date and end_date are required',
      });
    }

    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INCIDENT_DATETIME_INVALID,
        message: 'Invalid date format',
      });
    }

    const memoEntries = await Memos._findByDateRange(startDate, endDate);
    const memos = {
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      items: memoEntries
        ? await Promise.all(
            memoEntries.map(async (memo) => await memo.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: memoEntries?.length || 0,
    };

    return R.handleSuccess(res, { memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === MÉMOS PRÉVENTIFS ===

router.get('/preventive/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: 'start_date and end_date are required',
      });
    }

    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);

    const memoEntries = await Memos._findPreventiveMemos(startDate, endDate);
    const memos = {
      type: 'preventive',
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      items: memoEntries
        ? await Promise.all(
            memoEntries.map(async (memo) => ({
              ...(await memo.toJSON(responseValue.MINIMAL)),
              is_preventive: memo.isPreventive(),
            })),
          )
        : [],
      count: memoEntries?.length || 0,
    };

    return R.handleSuccess(res, { preventiveMemos: memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === MÉMOS CORRECTIFS ===

router.get('/corrective/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: 'start_date and end_date are required',
      });
    }

    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);

    const memoEntries = await Memos._findCorrectiveMemos(startDate, endDate);
    const memos = {
      type: 'corrective',
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      items: memoEntries
        ? await Promise.all(
            memoEntries.map(async (memo) => ({
              ...(await memo.toJSON(responseValue.MINIMAL)),
              is_corrective: memo.isCorrective(),
            })),
          )
        : [],
      count: memoEntries?.length || 0,
    };

    return R.handleSuccess(res, { correctiveMemos: memos });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === GESTION DES PIÈCES JOINTES ===

router.patch('/:guid/content', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    if (!MemosValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_GUID,
        message: MEMOS_ERRORS.GUID_INVALID,
      });
    }

    const memoObj = await Memos._load(req.params.guid, true);
    if (!memoObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: MEMOS_CODES.MEMO_NOT_FOUND,
        message: MEMOS_ERRORS.NOT_FOUND,
      });
    }
    const statusAvailable = [MemoStatus.APPROVED, MemoStatus.REJECTED];

    if (statusAvailable.includes(memoObj.getMemoStatus()!)) {
      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: MEMOS_CODES.ACTION_NOT_ALLOWED,
        message: MEMOS_ERRORS.ACTION_NOT_ALLOWED,
      });
    }

    const validation = validateAddMessage(req.body);

    if (!validation.success || !validation.data) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: MEMOS_ERRORS.VALIDATION_FAILED,
        details: validation.errors,
      });
    }
    const validatedData = validation.data;

    const validatorObj = await User._load(validatedData.user, true);
    if (!validatorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'Validator user not found',
      });
    }

    // const content = {
    //   type: validatedData.message_type,
    //   content: validatedData.message_content,
    // };

    const data = await memoObj.addMessage(validatedData.user, validatedData.message);

    return R.handleSuccess(res, {
      message: 'Attachment added successfully',
      memo: await data?.toJSON(responseValue.MINIMAL),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.ADD_CONTENT_FAILED,
      message: error.message,
    });
  }
});

router.delete('/:guid/attachments/:index', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!MemosValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_GUID,
        message: MEMOS_ERRORS.GUID_INVALID,
      });
    }

    const memoObj = await Memos._load(req.params.guid, true);
    if (!memoObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: MEMOS_CODES.MEMO_NOT_FOUND,
        message: MEMOS_ERRORS.NOT_FOUND,
      });
    }

    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.VALIDATION_FAILED,
        message: 'Invalid attachment index',
      });
    }

    await memoObj.removeFileAttachment(index);

    return R.handleSuccess(res, {
      message: 'Attachment removed successfully',
      memo: await memoObj.toJSON(responseValue.MINIMAL),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.ADD_CONTENT_FAILED,
      message: error.message,
    });
  }
});

// 🗂️ Retrieve all attachments (photos, audio, docs) associated with memo
router.get('/:guid/attachments', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;
    if (!guid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'guid_is_required',
        message: 'Memo guid is required',
      });
    }
    if (!MemosValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: MEMOS_CODES.INVALID_GUID,
        message: MEMOS_ERRORS.GUID_INVALID,
      });
    }

    const memoObj = await Memos._load(guid, true);
    if (!memoObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: MEMOS_CODES.MEMO_NOT_FOUND,
        message: MEMOS_ERRORS.NOT_FOUND,
      });
    }
    return R.handleSuccess(res, {
      attachments: memoObj.getMemoContent(),
    });
  } catch (err: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.SEARCH_FAILED,
      message: err.message,
    });
  }
});

// === DÉTECTION DE PATTERNS SUSPECTS ===

router.get(
  '/user/:userGuid/suspicious-patterns',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      if (!MemosValidationUtils.validateGuid(req.params.userGuid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: MEMOS_CODES.INVALID_GUID,
          message: MEMOS_ERRORS.GUID_INVALID,
        });
      }

      const userObj = await User._load(req.params.userGuid, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: USERS_ERRORS.NOT_FOUND,
        });
      }

      const { days = 30 } = req.query;
      const analysisDays = parseInt(days as string, 10);

      const patterns = await Memos.detectUserSuspiciousPatterns(userObj.getId()!, analysisDays);

      return R.handleSuccess(res, {
        user: userObj.toPublicJSON(),
        analysis_period_days: analysisDays,
        patterns,
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: MEMOS_CODES.ANALYSIS_FAILED,
        message: error.message,
      });
    }
  },
);

// === ESCALADE AUTOMATIQUE ===

router.patch('/maintenance/auto-escalate', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { hours_threshold = 24 } = req.body;
    const threshold = parseInt(hours_threshold, 10);

    const escalatedCount = await Memos.autoEscalatePendingMemos(threshold);

    return R.handleSuccess(res, {
      message: 'Auto-escalation process completed',
      escalated_memos: escalatedCount,
      hours_threshold: threshold,
      processed_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.ESCALATION_FAILED,
      message: error.message,
    });
  }
});

// === STATISTIQUES ===

// 📈 Analytics on memo volume, response times, and validation rates by employee and period
router.get('/statistics/overview', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters: Record<string, any> = {};

    if (req.query.memo_type) {
      filters.memo_type = req.query.memo_type;
    }
    if (req.query.memo_status) {
      filters.memo_status = req.query.memo_status;
    }
    if (req.query.author_user) {
      filters.author_user = req.query.author_user;
    }
    if (req.query.target_user) {
      filters.target_user = req.query.target_user;
    }

    const statistics = await Memos.getMemosStatistics(filters);

    return R.handleSuccess(res, { statistics });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: MEMOS_CODES.STATISTICS_FAILED,
      message: error.message,
    });
  }
});

export default router;
