// import { Request, Response, Router } from 'express';
// import {
//   HttpStatus,
//   MEMOS_CODES,
//   MEMOS_ERRORS,
//   MEMOS_MESSAGES,
//   MemoStatus,
//   MemosValidationUtils,
//   MemoType,
//   paginationSchema,
//   USERS_CODES,
//   USERS_ERRORS,
//   validateMemosCreation,
//   validateMemosFilters,
//   validateMemosUpdate,
//   validateMemoValidation,
// } from '@toke/shared';
//
// import Ensure from '../../middle/ensured-routes.js';
// import R from '../../tools/response.js';
// import User from '../class/User.js';
// import Memos from '../class/Memos.js';
// import WorkSessions from '../class/WorkSessions.js';
// import Revision from '../../tools/revision.js';
// import { responseValue, tableName } from '../../utils/response.model.js';
//
// const router = Router();
//
// // === ROUTES DE LISTAGE GÉNÉRAL ===
//
// router.get('/', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const paginationData = paginationSchema.parse(req.query);
//     const exportableMemos = await Memos.exportable({}, paginationData);
//
//     return R.handleSuccess(res, {
//       exportableMemos,
//     });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.PAGINATION_INVALID,
//         message: MEMOS_ERRORS.PAGINATION_INVALID,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: MEMOS_CODES.LISTING_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });
//
// router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
//   try {
//     const revision = await Revision.getRevision(tableName.MEMOS);
//
//     R.handleSuccess(res, {
//       revision,
//       checked_at: new Date().toISOString(),
//     });
//   } catch (error: any) {
//     R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: MEMOS_CODES.REVISION_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const filters = validateMemosFilters(req.query);
//     const paginationOptions = paginationSchema.parse(req.query);
//     const conditions: Record<string, any> = {};
//
//     if (filters.memo_type) {
//       conditions.memo_type = filters.memo_type;
//     }
//     if (filters.memo_status) {
//       conditions.memo_status = filters.memo_status;
//     }
//     if (filters.author_user) {
//       conditions.author_user = filters.author_user;
//     }
//     if (filters.target_user) {
//       conditions.target_user = filters.target_user;
//     }
//     if (filters.validator_user) {
//       conditions.validator_user = filters.validator_user;
//     }
//     if (filters.auto_generated !== undefined) {
//       conditions.auto_generated = filters.auto_generated;
//     }
//     if (filters.has_attachments) {
//       conditions.has_attachments = filters.has_attachments;
//     }
//     if (filters.incident_date_from) {
//       conditions.incident_date_from = filters.incident_date_from;
//     }
//     if (filters.incident_date_to) {
//       conditions.incident_date_to = filters.incident_date_to;
//     }
//     if (filters.processed_date_from) {
//       conditions.processed_date_from = filters.processed_date_from;
//     }
//     if (filters.pending_validation) {
//       conditions.pending_validation = filters.pending_validation;
//     }
//     if (filters.my_memos_only) {
//       conditions.my_memos_only = filters.my_memos_only;
//     }
//
//     const memoEntries = await Memos._list(conditions, paginationOptions);
//     const memos = {
//       pagination: {
//         offset: paginationOptions.offset || 0,
//         limit: paginationOptions.limit || memoEntries?.length || 0,
//         count: memoEntries?.length || 0,
//       },
//       items: memoEntries
//         ? await Promise.all(
//             memoEntries.map(async (memo) => await memo.toJSON(responseValue.MINIMAL)),
//           )
//         : [],
//     };
//
//     return R.handleSuccess(res, { memos });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.VALIDATION_FAILED,
//         message: MEMOS_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: MEMOS_CODES.LISTING_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });
//
// // === ROUTES PAR TYPE DE MÉMO ===
//
// router.get('/type/:memoType/list', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const { memoType } = req.params;
//
//     if (!Object.values(MemoType).includes(memoType as MemoType)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.MEMO_TYPE_INVALID,
//         message: MEMOS_ERRORS.MEMO_TYPE_INVALID,
//       });
//     }
//
//     const memoEntries = await Memos._findByType(memoType as MemoType);
//     const memos = {
//       memo_type: memoType,
//       items: memoEntries
//         ? await Promise.all(
//             memoEntries.map(async (memo) => await memo.toJSON(responseValue.MINIMAL)),
//           )
//         : [],
//       count: memoEntries?.length || 0,
//     };
//
//     return R.handleSuccess(res, { memos });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: MEMOS_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === ROUTES PAR STATUT ===
//
// router.get('/status/:memoStatus/list', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const { memoStatus } = req.params;
//
//     if (!Object.values(MemoStatus).includes(memoStatus as MemoStatus)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.MEMO_STATUS_INVALID,
//         message: MEMOS_ERRORS.MEMO_STATUS_INVALID,
//       });
//     }
//
//     const memoEntries = await Memos._findByStatus(memoStatus as MemoStatus);
//     const memos = {
//       memo_status: memoStatus,
//       items: memoEntries
//         ? await Promise.all(
//             memoEntries.map(async (memo) => await memo.toJSON(responseValue.MINIMAL)),
//           )
//         : [],
//       count: memoEntries?.length || 0,
//     };
//
//     return R.handleSuccess(res, { memos });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: MEMOS_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === MÉMOS EN ATTENTE DE VALIDATION ===
//
// router.get('/pending', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const paginationOptions = paginationSchema.parse(req.query);
//     const memoEntries = await Memos._findPendingValidation();
//
//     const offset = paginationOptions.offset || 0;
//     const limit = paginationOptions.limit;
//     const paginatedItems = limit
//       ? memoEntries?.slice(offset, offset + limit)
//       : memoEntries?.slice(offset);
//
//     const memos = {
//       pagination: {
//         offset,
//         limit: limit || paginatedItems?.length || 0,
//         count: paginatedItems?.length || 0,
//         total: memoEntries?.length || 0,
//       },
//       items: paginatedItems
//         ? await Promise.all(
//             paginatedItems.map(async (memo) => await memo.toJSON(responseValue.MINIMAL)),
//           )
//         : [],
//     };
//
//     return R.handleSuccess(res, { pendingMemos: memos });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: MEMOS_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === MÉMOS AUTO-GÉNÉRÉS ===
//
// router.get('/auto-generated', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const memoEntries = await Memos._findAutoGenerated();
//     const memos = {
//       items: memoEntries
//         ? await Promise.all(
//             memoEntries.map(async (memo) => await memo.toJSON(responseValue.MINIMAL)),
//           )
//         : [],
//       count: memoEntries?.length || 0,
//     };
//
//     return R.handleSuccess(res, { autoGeneratedMemos: memos });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: MEMOS_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === MÉMOS URGENTS ===
//
// router.get('/urgent', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const memoEntries = await Memos._findUrgentMemos();
//     const memos = {
//       items: memoEntries
//         ? await Promise.all(
//             memoEntries.map(async (memo) => ({
//               ...(await memo.toJSON(responseValue.MINIMAL)),
//               is_urgent: memo.isUrgent(),
//               incident_datetime: memo.getIncidentDatetime(),
//             })),
//           )
//         : [],
//       count: memoEntries?.length || 0,
//     };
//
//     return R.handleSuccess(res, { urgentMemos: memos });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: MEMOS_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === CRÉATION DE MÉMO ===
//
// router.post('/', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     const validatedData = validateMemosCreation(req.body);
//
//     // Vérification de l'existence de l'auteur
//     const authorObj = await User._load(validatedData.author_user, true);
//     if (!authorObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: USERS_CODES.USER_NOT_FOUND,
//         message: 'Author user not found',
//       });
//     }
//
//     const memoObj = new Memos()
//       .setAuthorUser(authorObj.getId()!)
//       .setMemoType(validatedData.memo_type)
//       .setTitle(validatedData.title)
//       .setDescription(validatedData.description);
//
//     // Champs optionnels
//     if (validatedData.target_user) {
//       const targetObj = await User._load(validatedData.target_user, true);
//       if (targetObj) {
//         memoObj.setTargetUser(targetObj.getId()!);
//       }
//     }
//
//     if (validatedData.validator_user) {
//       const validatorObj = await User._load(validatedData.validator_user, true);
//       if (validatorObj) {
//         memoObj.setValidatorUser(validatorObj.getId()!);
//       }
//     }
//
//     if (validatedData.memo_status) {
//       memoObj.setMemoStatus(validatedData.memo_status);
//     }
//
//     if (validatedData.incident_datetime) {
//       memoObj.setIncidentDatetime(new Date(validatedData.incident_datetime));
//     }
//
//     if (validatedData.affected_session) {
//       const sessionObj = await WorkSessions._load(validatedData.affected_session, true);
//       if (sessionObj) {
//         memoObj.setAffectedSession(sessionObj.getId()!);
//       }
//     }
//
//     if (validatedData.affected_entries) {
//       memoObj.setAffectedEntriesIds(validatedData.affected_entries);
//     }
//
//     if (validatedData.attachments) {
//       memoObj.setAttachments(validatedData.attachments);
//     }
//
//     if (validatedData.auto_generated) {
//       memoObj.setAutoGenerated(validatedData.auto_generated, validatedData.auto_reason);
//     }
//
//     await memoObj.save();
//
//     return R.handleCreated(res, await memoObj.toJSON());
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.VALIDATION_FAILED,
//         message: MEMOS_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else if (error.message.includes('required')) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.VALIDATION_FAILED,
//         message: error.message,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: MEMOS_CODES.CREATION_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });
//
// // === RÉCUPÉRATION PAR GUID ===
//
// router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     if (!MemosValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.INVALID_GUID,
//         message: MEMOS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const memoObj = await Memos._load(req.params.guid, true);
//     if (!memoObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: MEMOS_CODES.MEMO_NOT_FOUND,
//         message: MEMOS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     return R.handleSuccess(res, {
//       memo: await memoObj.toJSON(),
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: MEMOS_CODES.RETRIEVAL_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === MISE À JOUR DE MÉMO ===
//
// router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
//   try {
//     if (!MemosValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.INVALID_GUID,
//         message: MEMOS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const memoObj = await Memos._load(req.params.guid, true);
//     if (!memoObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: MEMOS_CODES.MEMO_NOT_FOUND,
//         message: MEMOS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const validatedData = validateMemosUpdate(req.body);
//
//     if (validatedData.memo_status) {
//       memoObj.setMemoStatus(validatedData.memo_status);
//     }
//     if (validatedData.title) {
//       memoObj.setTitle(validatedData.title);
//     }
//     if (validatedData.description) {
//       memoObj.setDescription(validatedData.description);
//     }
//     if (validatedData.incident_datetime) {
//       memoObj.setIncidentDatetime(new Date(validatedData.incident_datetime));
//     }
//     if (validatedData.validator_comments) {
//       memoObj.setValidatorComments(validatedData.validator_comments);
//     }
//     if (validatedData.attachments) {
//       memoObj.setAttachments(validatedData.attachments);
//     }
//
//     await memoObj.save();
//     return R.handleSuccess(res, await memoObj.toJSON());
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.VALIDATION_FAILED,
//         message: MEMOS_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: MEMOS_CODES.UPDATE_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });
//
// // === SUPPRESSION DE MÉMO ===
//
// router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
//   try {
//     if (!MemosValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.INVALID_GUID,
//         message: MEMOS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const memoObj = await Memos._load(req.params.guid, true);
//     if (!memoObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: MEMOS_CODES.MEMO_NOT_FOUND,
//         message: MEMOS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     await memoObj.delete();
//     return R.handleSuccess(res, {
//       message: MEMOS_MESSAGES.DELETED_SUCCESSFULLY,
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: MEMOS_CODES.DELETE_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === GESTION DU CYCLE DE VIE ===
//
// router.post('/:guid/submit', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     if (!MemosValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.INVALID_GUID,
//         message: MEMOS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const memoObj = await Memos._load(req.params.guid, true);
//     if (!memoObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: MEMOS_CODES.MEMO_NOT_FOUND,
//         message: MEMOS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     await memoObj.submitMemosForValidation();
//
//     return R.handleSuccess(res, {
//       message: 'Memo submitted for validation successfully',
//       memo: await memoObj.toJSON(responseValue.MINIMAL),
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: MEMOS_CODES.SUBMISSION_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// router.post('/:guid/approve', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     if (!MemosValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.INVALID_GUID,
//         message: MEMOS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const memoObj = await Memos._load(req.params.guid, true);
//     if (!memoObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: MEMOS_CODES.MEMO_NOT_FOUND,
//         message: MEMOS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const validatedData = validateMemoValidation(req.body);
//
//     const validatorObj = await User._load(validatedData.validator_user, true);
//     if (!validatorObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: USERS_CODES.USER_NOT_FOUND,
//         message: 'Validator user not found',
//       });
//     }
//
//     await memoObj.approve(validatorObj.getId()!, validatedData.comments);
//
//     return R.handleSuccess(res, {
//       message: MEMOS_MESSAGES.APPROVED_SUCCESSFULLY,
//       memo: await memoObj.toJSON(),
//     });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.VALIDATION_FAILED,
//         message: MEMOS_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: MEMOS_CODES.APPROVAL_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });
//
// router.post('/:guid/reject', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     if (!MemosValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.INVALID_GUID,
//         message: MEMOS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const memoObj = await Memos._load(req.params.guid, true);
//     if (!memoObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: MEMOS_CODES.MEMO_NOT_FOUND,
//         message: MEMOS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const validatedData = validateMemoValidation(req.body);
//
//     const validatorObj = await User._load(validatedData.validator_user, true);
//     if (!validatorObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: USERS_CODES.USER_NOT_FOUND,
//         message: 'Validator user not found',
//       });
//     }
//
//     await memoObj.reject(validatorObj.getId()!, validatedData.comments);
//
//     return R.handleSuccess(res, {
//       message: MEMOS_MESSAGES.REJECTED_SUCCESSFULLY,
//       memo: await memoObj.toJSON(),
//     });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.VALIDATION_FAILED,
//         message: MEMOS_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: MEMOS_CODES.REJECTION_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });
//
// router.post('/:guid/escalate', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     if (!MemosValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.INVALID_GUID,
//         message: MEMOS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const memoObj = await Memos._load(req.params.guid, true);
//     if (!memoObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: MEMOS_CODES.MEMO_NOT_FOUND,
//         message: MEMOS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const { new_validator, reason } = req.body;
//
//     if (!new_validator || !reason) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.VALIDATION_FAILED,
//         message: 'new_validator and reason are required',
//       });
//     }
//
//     const newValidatorObj = await User._load(new_validator, true);
//     if (!newValidatorObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: USERS_CODES.USER_NOT_FOUND,
//         message: 'New validator user not found',
//       });
//     }
//
//     await memoObj.escalate(newValidatorObj.getId()!, reason);
//
//     return R.handleSuccess(res, {
//       message: 'Memo escalated successfully',
//       memo: await memoObj.toJSON(),
//       new_validator: newValidatorObj.toPublicJSON(),
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: MEMOS_CODES.ESCALATION_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === ROUTES PAR AUTEUR ===
//
// router.get('/author/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     if (!MemosValidationUtils.validateGuid(req.params.userGuid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.INVALID_GUID,
//         message: MEMOS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const userObj = await User._load(req.params.userGuid, true);
//     if (!userObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: USERS_CODES.USER_NOT_FOUND,
//         message: USERS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const memoEntries = await Memos._listByAuthor(userObj.getId()!);
//     const memos = {
//       author: userObj.toPublicJSON(),
//       memos: memoEntries
//         ? await Promise.all(
//             memoEntries.map(async (memo) => await memo.toJSON(responseValue.MINIMAL)),
//           )
//         : [],
//       count: memoEntries?.length || 0,
//     };
//
//     return R.handleSuccess(res, { memos });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: MEMOS_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === ROUTES PAR CIBLE ===
//
// router.get('/target/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     if (!MemosValidationUtils.validateGuid(req.params.userGuid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.INVALID_GUID,
//         message: MEMOS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const userObj = await User._load(req.params.userGuid, true);
//     if (!userObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: USERS_CODES.USER_NOT_FOUND,
//         message: USERS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const memoEntries = await Memos._listByTarget(userObj.getId()!);
//     const memos = {
//       target: userObj.toPublicJSON(),
//       memos: memoEntries
//         ? await Promise.all(
//             memoEntries.map(async (memo) => await memo.toJSON(responseValue.MINIMAL)),
//           )
//         : [],
//       count: memoEntries?.length || 0,
//     };
//
//     return R.handleSuccess(res, { memos });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: MEMOS_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === ROUTES PAR VALIDATEUR ===
//
// router.get('/validator/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     if (!MemosValidationUtils.validateGuid(req.params.userGuid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: MEMOS_CODES.INVALID_GUID,
//         message: MEMOS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const userObj = await User._load(req.params.userGuid, true);
//     if (!userObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: USERS_CODES.USER_NOT_FOUND,
//         message: USERS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const memoEntries = await Memos._listByValidator(userObj.getId()!);
//     const memos = {
//       validator: userObj.toPublicJSON(),
//       memos: memoEntries
//         ? await Promise.all(
//             memoEntries.map(async (memo) => await memo.toJSON(responseValue.MINIMAL)),
//           )
//         : [],
//       count: memoEntries?.length || 0,
//     };
//
//     return R.handleSuccess(res, { memos });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: MEMOS_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === ROUTES PAR SESSION ===
//
// // router.get('/session/:sessionGuid/list', Ensure.get(), async (req: Request, res: Response) => {
// //   try {
// //     if (!MemosValidationUtils.validateGuid(req.params.sessionGuid)) {
// //       return R.handleError(res, HttpStatus.BAD_REQUEST, {
// //         code: MEMOS_CODES.INVALID_GUID,
// //         message: MEMOS_ERRORS.GUID_INVALID,
// //       });
// //     }
// //
// //     const sessionObj = await WorkSessions._load(req.params.sessionGuid, true);
// //     if (!sessionObj) {
// //       return R.handleError(res, HttpStatus.NOT_FOUND, {
// //         code: MEMOS_CODES.SESSION_NOT_FOUND,
// //         message