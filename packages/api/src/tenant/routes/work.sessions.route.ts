// import { Request, Response, Router } from 'express';
// import {
//   HttpStatus,
//   paginationSchema,
//   validateClockInData,
//   validateClockOutData,
//   validateMissionData,
//   validatePauseData,
//   validateWorkSessionsFilters,
//   WORK_SESSIONS_CODES,
//   WORK_SESSIONS_ERRORS,
//   WORK_SESSIONS_MESSAGES,
//   WorkSessionsValidationUtils,
// } from '@toke/shared';
// import { Op } from 'sequelize';
//
// import Ensure from '../../middle/ensured-routes.js';
// import R from '../../tools/response.js';
// import User from '../class/User.js';
// import Site from '../class/Site.js';
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
//     const exportableSessions = await WorkSessions.exportable({}, paginationData);
//
//     return R.handleSuccess(res, {
//       exportableSessions,
//     });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.PAGINATION_INVALID,
//         message: WORK_SESSIONS_ERRORS.PAGINATION_INVALID,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: WORK_SESSIONS_CODES.LISTING_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });
//
// router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
//   try {
//     const revision = await Revision.getRevision(tableName.WORK_SESSIONS);
//
//     R.handleSuccess(res, {
//       revision,
//       checked_at: new Date().toISOString(),
//     });
//   } catch (error: any) {
//     R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: WORK_SESSIONS_CODES.REVISION_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const filters = validateWorkSessionsFilters(req.query);
//     const paginationOptions = paginationSchema.parse(req.query);
//     const conditions: Record<string, any> = {};
//
//     if (filters.user) {
//       const userObj = await User._load(filters.user, true);
//       if (userObj) conditions.user = userObj.getId();
//     }
//
//     if (filters.site) {
//       const siteObj = await Site._load(filters.site, true);
//       if (siteObj) conditions.site = siteObj.getId();
//     }
//
//     if (filters.session_status) {
//       conditions.session_status = filters.session_status;
//     }
//
//     if (filters.session_start_from) {
//       conditions.session_start_at = { [Op.gte]: new Date(filters.session_start_from) };
//     }
//
//     if (filters.session_end_to) {
//       conditions.session_end_at = { [Op.lte]: new Date(filters.session_end_to) };
//     }
//
//     const sessionEntries = await WorkSessions._list(conditions, paginationOptions);
//     const sessions = {
//       pagination: {
//         offset: paginationOptions.offset || 0,
//         limit: paginationOptions.limit || sessionEntries?.length || 0,
//         count: sessionEntries?.length || 0,
//       },
//       items: sessionEntries
//         ? await Promise.all(
//             sessionEntries.map(async (session) => await session.toJSON(responseValue.MINIMAL)),
//           )
//         : [],
//     };
//
//     return R.handleSuccess(res, { sessions });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.VALIDATION_FAILED,
//         message: WORK_SESSIONS_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: WORK_SESSIONS_CODES.LISTING_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });
//
// // === CLOCK-IN : OUVERTURE SESSION ===
//
// router.post('/clock-in', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     const validatedData = validateClockInData(req.body);
//
//     // Vérifier utilisateur
//     const userObj = await User._load(validatedData.user_guid, true);
//     if (!userObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: WORK_SESSIONS_CODES.USER_NOT_FOUND,
//         message: 'User not found',
//       });
//     }
//
//     // Vérifier site
//     const siteObj = await Site._load(validatedData.site_guid, true);
//     if (!siteObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: WORK_SESSIONS_CODES.SITE_NOT_FOUND,
//         message: 'Site not found',
//       });
//     }
//
//     // Vérifier session active existante
//     const activeSession = await WorkSessions._findActiveSessionByUser(userObj.getId()!);
//     if (activeSession) {
//       return R.handleError(res, HttpStatus.CONFLICT, {
//         code: WORK_SESSIONS_CODES.ACTIVE_SESSION_EXISTS,
//         message: WORK_SESSIONS_ERRORS.ACTIVE_SESSION_EXISTS,
//         active_session: await activeSession.toJSON(responseValue.MINIMAL),
//       });
//     }
//
//     // Validation géofencing
//     const geofenceValidation = await WorkSessions.validateGeofencing(
//       siteObj.getId()!,
//       validatedData.latitude,
//       validatedData.longitude,
//     );
//
//     if (!geofenceValidation.access_granted) {
//       return R.handleError(res, HttpStatus.FORBIDDEN, {
//         code: WORK_SESSIONS_CODES.GEOFENCING_VIOLATION,
//         message: 'Location outside authorized site area',
//         details: geofenceValidation,
//       });
//     }
//
//     // Créer session
//     const sessionObj = new WorkSessions()
//       .setUser(userObj.getId()!)
//       .setSite(siteObj.getId()!)
//       .setSessionStartAt(new Date())
//       .setStartCoordinates(validatedData.latitude, validatedData.longitude);
//
//     await sessionObj.clockIn({
//       site_id: siteObj.getId()!,
//       latitude: validatedData.latitude,
//       longitude: validatedData.longitude,
//       context: validatedData.context,
//     });
//
//     return R.handleCreated(res, {
//       message: WORK_SESSIONS_MESSAGES.CLOCK_IN_SUCCESS,
//       session: await sessionObj.toJSON(),
//       clocked_at: sessionObj.getSessionStartAt(),
//     });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.VALIDATION_FAILED,
//         message: WORK_SESSIONS_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: WORK_SESSIONS_CODES.CLOCK_IN_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });
//
// // === CLOCK-OUT : FERMETURE SESSION ===
//
// router.post('/clock-out', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     const validatedData = validateClockOutData(req.body);
//
//     const sessionObj = await WorkSessions._load(validatedData.session_guid, true);
//     if (!sessionObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: WORK_SESSIONS_CODES.SESSION_NOT_FOUND,
//         message: WORK_SESSIONS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     if (!sessionObj.isActive()) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.SESSION_NOT_ACTIVE,
//         message: 'Session is not active',
//       });
//     }
//
//     if (!sessionObj.canClockOut()) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.CANNOT_CLOCK_OUT,
//         message: 'Cannot clock out: active pause or mission in progress',
//       });
//     }
//
//     await sessionObj.clockOut({
//       latitude: validatedData.latitude,
//       longitude: validatedData.longitude,
//       work_summary: validatedData.work_summary,
//     });
//
//     const durations = await sessionObj.calculateDurations();
//
//     return R.handleSuccess(res, {
//       message: WORK_SESSIONS_MESSAGES.CLOCK_OUT_SUCCESS,
//       session: await sessionObj.toJSON(),
//       durations,
//       clocked_out_at: sessionObj.getSessionEndAt(),
//     });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.VALIDATION_FAILED,
//         message: WORK_SESSIONS_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: WORK_SESSIONS_CODES.CLOCK_OUT_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });
//
// // === GESTION PAUSES ===
//
// router.post('/:guid/pause/start', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     if (!WorkSessionsValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.INVALID_GUID,
//         message: WORK_SESSIONS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const sessionObj = await WorkSessions._load(req.params.guid, true);
//     if (!sessionObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: WORK_SESSIONS_CODES.SESSION_NOT_FOUND,
//         message: WORK_SESSIONS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     if (!sessionObj.isActive()) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.SESSION_NOT_ACTIVE,
//         message: 'Cannot start pause on inactive session',
//       });
//     }
//
//     const validatedData = validatePauseData(req.body);
//
//     await sessionObj.startPause({
//       pause_type: validatedData.pause_type,
//       location: validatedData.location,
//       expected_duration: validatedData.expected_duration,
//     });
//
//     return R.handleSuccess(res, {
//       message: 'Pause started successfully',
//       session: await sessionObj.toJSON(responseValue.MINIMAL),
//       pause_status: await sessionObj.getPauseStatusDetailed(),
//     });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.VALIDATION_FAILED,
//         message: WORK_SESSIONS_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: WORK_SESSIONS_CODES.PAUSE_START_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });
//
// router.post('/:guid/pause/end', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     if (!WorkSessionsValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.INVALID_GUID,
//         message: WORK_SESSIONS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const sessionObj = await WorkSessions._load(req.params.guid, true);
//     if (!sessionObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: WORK_SESSIONS_CODES.SESSION_NOT_FOUND,
//         message: WORK_SESSIONS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     await sessionObj.endPause();
//
//     return R.handleSuccess(res, {
//       message: 'Pause ended successfully',
//       session: await sessionObj.toJSON(responseValue.MINIMAL),
//       pause_history: await sessionObj.getPauseDetails(),
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: WORK_SESSIONS_CODES.PAUSE_END_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === MISSIONS EXTERNES ===
//
// router.post('/:guid/mission/start', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     if (!WorkSessionsValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.INVALID_GUID,
//         message: WORK_SESSIONS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const sessionObj = await WorkSessions._load(req.params.guid, true);
//     if (!sessionObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: WORK_SESSIONS_CODES.SESSION_NOT_FOUND,
//         message: WORK_SESSIONS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const validatedData = validateMissionData(req.body);
//
//     await sessionObj.startExternalMission({
//       destination: validatedData.destination,
//       purpose: validatedData.purpose,
//       expected_return: validatedData.expected_return,
//       transport: validatedData.transport,
//       authorization: validatedData.authorization,
//     });
//
//     return R.handleSuccess(res, {
//       message: 'External mission started',
//       session: await sessionObj.toJSON(responseValue.MINIMAL),
//       mission_data: await sessionObj.getMissionData(),
//     });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.VALIDATION_FAILED,
//         message: WORK_SESSIONS_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: WORK_SESSIONS_CODES.MISSION_START_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });
//
// router.post(
//   '/:guid/mission/update-location',
//   Ensure.post(),
//   async (req: Request, res: Response) => {
//     try {
//       if (!WorkSessionsValidationUtils.validateGuid(req.params.guid)) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: WORK_SESSIONS_CODES.INVALID_GUID,
//           message: WORK_SESSIONS_ERRORS.GUID_INVALID,
//         });
//       }
//
//       const sessionObj = await WorkSessions._load(req.params.guid, true);
//       if (!sessionObj) {
//         return R.handleError(res, HttpStatus.NOT_FOUND, {
//           code: WORK_SESSIONS_CODES.SESSION_NOT_FOUND,
//           message: WORK_SESSIONS_ERRORS.NOT_FOUND,
//         });
//       }
//
//       const { latitude, longitude } = req.body;
//
//       if (!latitude || !longitude) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: WORK_SESSIONS_CODES.VALIDATION_FAILED,
//           message: 'Latitude and longitude are required',
//         });
//       }
//
//       await sessionObj.updateMissionLocation(latitude, longitude);
//
//       return R.handleSuccess(res, {
//         message: 'Mission location updated',
//         mission_data: await sessionObj.getMissionData(),
//       });
//     } catch (error: any) {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: WORK_SESSIONS_CODES.MISSION_UPDATE_FAILED,
//         message: error.message,
//       });
//     }
//   },
// );
//
// router.post('/:guid/mission/complete', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     if (!WorkSessionsValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.INVALID_GUID,
//         message: WORK_SESSIONS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const sessionObj = await WorkSessions._load(req.params.guid, true);
//     if (!sessionObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: WORK_SESSIONS_CODES.SESSION_NOT_FOUND,
//         message: WORK_SESSIONS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const { summary } = req.body;
//
//     await sessionObj.completeMission(summary);
//
//     return R.handleSuccess(res, {
//       message: 'Mission completed successfully',
//       session: await sessionObj.toJSON(responseValue.MINIMAL),
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: WORK_SESSIONS_CODES.MISSION_COMPLETE_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === RÉCUPÉRATION PAR GUID ===
//
// router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     if (!WorkSessionsValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.INVALID_GUID,
//         message: WORK_SESSIONS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const sessionObj = await WorkSessions._load(req.params.guid, true);
//     if (!sessionObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: WORK_SESSIONS_CODES.SESSION_NOT_FOUND,
//         message: WORK_SESSIONS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     return R.handleSuccess(res, {
//       session: await sessionObj.toJSON(),
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: WORK_SESSIONS_CODES.RETRIEVAL_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === SESSIONS PAR UTILISATEUR ===
//
// router.get('/user/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     if (!WorkSessionsValidationUtils.validateGuid(req.params.userGuid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.INVALID_GUID,
//         message: WORK_SESSIONS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const userObj = await User._load(req.params.userGuid, true);
//     if (!userObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: WORK_SESSIONS_CODES.USER_NOT_FOUND,
//         message: 'User not found',
//       });
//     }
//
//     const sessionEntries = await WorkSessions._listByUser(userObj.getId()!);
//     const sessions = {
//       user: userObj.toPublicJSON(),
//       sessions: sessionEntries
//         ? await Promise.all(
//             sessionEntries.map(async (session) => await session.toJSON(responseValue.MINIMAL)),
//           )
//         : [],
//       count: sessionEntries?.length || 0,
//     };
//
//     return R.handleSuccess(res, { sessions });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: WORK_SESSIONS_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// router.get('/user/:userGuid/active', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     if (!WorkSessionsValidationUtils.validateGuid(req.params.userGuid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.INVALID_GUID,
//         message: WORK_SESSIONS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const userObj = await User._load(req.params.userGuid, true);
//     if (!userObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: WORK_SESSIONS_CODES.USER_NOT_FOUND,
//         message: 'User not found',
//       });
//     }
//
//     const activeSession = await WorkSessions._findActiveSessionByUser(userObj.getId()!);
//
//     if (!activeSession) {
//       return R.handleSuccess(res, {
//         has_active_session: false,
//         message: 'No active session found',
//       });
//     }
//
//     return R.handleSuccess(res, {
//       has_active_session: true,
//       session: await activeSession.toJSON(),
//       pause_status: await activeSession.getPauseStatusDetailed(),
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: WORK_SESSIONS_CODES.RETRIEVAL_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === SESSIONS PAR SITE ===
//
// router.get('/site/:siteGuid/list', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     if (!WorkSessionsValidationUtils.validateGuid(req.params.siteGuid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.INVALID_GUID,
//         message: WORK_SESSIONS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const siteObj = await Site._load(req.params.siteGuid, true);
//     if (!siteObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: WORK_SESSIONS_CODES.SITE_NOT_FOUND,
//         message: 'Site not found',
//       });
//     }
//
//     const sessionEntries = await WorkSessions._listBySite(siteObj.getId()!);
//     const sessions = {
//       site: await siteObj.toJSON(responseValue.MINIMAL),
//       sessions: sessionEntries
//         ? await Promise.all(
//             sessionEntries.map(async (session) => await session.toJSON(responseValue.MINIMAL)),
//           )
//         : [],
//       count: sessionEntries?.length || 0,
//     };
//
//     return R.handleSuccess(res, { sessions });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: WORK_SESSIONS_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === SESSIONS ABANDONNÉES ===
//
// router.get('/abandoned/list', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const { hours = 24 } = req.query;
//     const hoursThreshold = parseInt(hours as string, 10);
//
//     const abandonedSessions = await WorkSessions._detectAbandonedSessions(hoursThreshold);
//
//     const sessions = {
//       hours_threshold: hoursThreshold,
//       abandoned_sessions: abandonedSessions
//         ? await Promise.all(
//             abandonedSessions.map(async (session) => ({
//               ...(await session.toJSON(responseValue.MINIMAL)),
//               hours_abandoned: Math.floor(
//                 (new Date().getTime() - session.getSessionStartAt()!.getTime()) / (1000 * 60 * 60),
//               ),
//             })),
//           )
//         : [],
//       count: abandonedSessions?.length || 0,
//     };
//
//     return R.handleSuccess(res, { sessions });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: WORK_SESSIONS_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === CORRECTIONS MANAGER ===
//
// router.post('/:guid/correct', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     if (!WorkSessionsValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.INVALID_GUID,
//         message: WORK_SESSIONS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const sessionObj = await WorkSessions._load(req.params.guid, true);
//     if (!sessionObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: WORK_SESSIONS_CODES.SESSION_NOT_FOUND,
//         message: WORK_SESSIONS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const { corrections, manager_guid } = req.body;
//
//     if (!corrections || !manager_guid) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: WORK_SESSIONS_CODES.VALIDATION_FAILED,
//         message: 'corrections and manager_guid are required',
//       });
//     }
//
//     const managerObj = await User._load(manager_guid, true);
//     if (!managerObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: WORK_SESSIONS_CODES.USER_NOT_FOUND,
//         message: 'Manager not found',
//       });
//     }
//
//     await sessionObj.applyManagerCorrection(corrections, managerObj.getId()!);
//
//     return R.handleSuccess(res, {
//       message: 'Corrections applied successfully',
//       session: await sessionObj.toJSON(),
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: WORK_SESSIONS_CODES.CORRECTION_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === RAPPORTS ===
//
// router.post('/report/generate', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     const { user_guid, site_guid, start_date, end_date, status } = req.body;
//
//     const filters: any = {};
//
//     if (user_guid) {
//       const userObj = await User._load(user_guid, true);
//       if (userObj) filters.user_id = userObj.getId();
//     }
//
//     if (site_guid) {
//       const siteObj = await Site._load(site_guid, true);
//       if (siteObj) filters.site_id = siteObj.getId();
//     }
//
//     if (start_date) filters.start_date = new Date(start_date);
//     if (end_date) filters.end_date = new Date(end_date);
//     if (status) filters.status = status;
//
//     const report = await WorkSessions.generateSessionReport(filters);
//
//     return R.handleSuccess(res, { report });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: WORK_SESSIONS_CODES.REPORT_GENERATION_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === STATISTIQUES ===
//
// router.get('/statistics/overview', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const filters: Record<string, any> = {};
//
//     if (req.query.user_guid) {
//       const userObj = await User._load(req.query.user_guid as string, true);
//       if (userObj) filters.user = userObj.getId();
//     }
//
//     if (req.query.site_guid) {
//       const siteObj = await Site._load(req.query.site_guid as string, true);
//       if (siteObj) filters.site = siteObj.getId();
//     }
//
//     const statistics = await WorkSessions.getSessionsStatistics(filters);
//
//     return R.handleSuccess(res, { statistics });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: WORK_SESSIONS_CODES.STATISTICS_FAILED,
//       message: error.message,
//     });
//   }
// });
//
// // === MAINTENANCE AUTOMATIQUE ===
//
// router.post(
//   '/maintenance/auto-close-abandoned',
//   Ensure.post(),
//   async (req: Request, res: Response) => {
//     try {
//       const { hours = 24 } = req.body;
//       const closedCount = await WorkSessions.autoCloseAbandonedSessions(hours);
//
//       return R.handleSuccess(res, {
//         message: 'Abandoned sessions maintenance completed',
//         closed_sessions: closedCount,
//         processed_at: new Date().toISOString(),
//       });
//     } catch (error: any) {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: WORK_SESSIONS_CODES.MAINTENANCE_FAILED,
//         message: error.message,
//       });
//     }
//   },
// );
//
// export default router;
