import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  paginationSchema,
  PointageType,
  SessionStatus,
  SITES_ERRORS,
  TIME_ENTRIES_CODES,
  TIME_ENTRIES_ERRORS,
  TIME_ENTRIES_MESSAGES,
  TimeEntriesValidationUtils,
  USERS_CODES,
  USERS_ERRORS,
  UsersValidationUtils,
  validateTimeEntriesCreation,
  validateTimeEntriesFilters,
  WORK_SESSIONS_CODES,
  WORK_SESSIONS_ERRORS,
  WorkSessionsValidationUtils,
} from '@toke/shared';
import { Op } from 'sequelize';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import User from '../class/User.js';
import Site from '../class/Site.js';
import WorkSessions from '../class/WorkSessions.js';
import TimeEntries from '../class/TimeEntries.js';
import Revision from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';
import { UserAuth } from '../../middle/user-auth.js';
import UserRole from '../class/UserRole.js';
import { ValidationUtils } from '../../utils/view.validator.js';
import AnomalyDetectionService from '../../tools/anomaly.detection.service.js';

const router = Router();

// === ROUTES DE LISTAGE GÉNÉRAL ===

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const exportableEntries = await TimeEntries.exportable({}, paginationData);

    return R.handleSuccess(res, {
      exportableEntries,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.PAGINATION_INVALID,
        message: TIME_ENTRIES_ERRORS.PAGINATION_INVALID,
        // details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TIME_ENTRIES_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.TIME_ENTRIES);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    // 1️⃣ Valider la pagination d'abord
    const paginationOptions = paginationSchema.parse(req.query);

    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    //2️⃣ ✅ On supprime les clés offset & limit sans créer de variables inutilisées
    const filtersQuery = { ...req.query };
    delete filtersQuery.offset;
    delete filtersQuery.limit;
    delete filtersQuery.view;

    // 3️⃣ Valider les filtres
    const filters = validateTimeEntriesFilters(filtersQuery);
    const conditions: Record<string, any> = {};

    if (filters.user) {
      const userObj = await User._load(filters.user, true);
      if (userObj) conditions.user = userObj.getId();
    }

    if (filters.site) {
      const siteObj = await Site._load(filters.site, true);
      if (siteObj) conditions.site = siteObj.getId();
    }

    if (filters.session) {
      const sessionObj = await WorkSessions._load(filters.session, true);
      if (sessionObj) conditions.session = sessionObj.getId();
    }

    if (filters.pointage_type) {
      conditions.pointage_type = filters.pointage_type;
    }

    if (filters.pointage_status) {
      conditions.pointage_status = filters.pointage_status;
    }

    if (filters.created_offline !== undefined) {
      conditions.created_offline = filters.created_offline;
    }

    if (filters.clocked_at_from) {
      conditions.clocked_at_from = { [Op.gte]: new Date(filters.clocked_at_from) };
    }

    if (filters.clocked_at_to) {
      conditions.clocked_at_to = {
        ...conditions.clocked_at_to,
        [Op.lte]: new Date(filters.clocked_at_to),
      };
    }

    const entryList = await TimeEntries._list(conditions, paginationOptions);
    const entries = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || entryList?.length || 0,
        count: entryList?.length || 0,
      },
      items: entryList
        ? await Promise.all(entryList.map(async (entry) => await entry.toJSON(views)))
        : [],
    };

    return R.handleSuccess(res, { entries });
  } catch (error: any) {
    // Erreur de validation (a un code custom)
    if (error.code) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: error.code,
        message: error.message,
      });
    }

    // Erreur système/inattendue
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
  // catch (error: any) {
  //   if (error.issues) {
  //     return R.handleError(res, HttpStatus.BAD_REQUEST, {
  //       code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
  //       message: TIME_ENTRIES_ERRORS.VALIDATION_FAILED,
  //       details: error.issues,
  //     });
  //   } else {
  //     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
  //       code: TIME_ENTRIES_CODES.LISTING_FAILED,
  //       message: error.message,
  //     });
  //   }
  // }
});

// === CRÉATION POINTAGE ===

// router.post(
//   '/',
//   Ensure.post(),
//   UserAuth.timeEntriesAuthenticate,
//   async (req: Request, res: Response) => {
//     try {
//       // Récupération des informations depuis les headers
//       // const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
//       // IP réelle du client
//       const ip =
//         (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || // derrière proxy
//         req.socket.remoteAddress || // fallback socket
//         req.ip; // Express shortcut
//       const userAgent = req.headers['user-agent'] || '';
//
//       // Fusion avec le body avant validation
//       const bodyWithMetadata = {
//         ...req.body,
//         ip_address: ip,
//         user_agent: userAgent,
//       };
//
//       const validatedData = validateTimeEntriesCreation(bodyWithMetadata);
//
//       // // Vérifier utilisateur
//       // const userObj = await User._load(validatedData.user, true);
//       // if (!userObj) {
//       //   return R.handleError(res, HttpStatus.NOT_FOUND, {
//       //     code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
//       //     message: USERS_ERRORS.NOT_FOUND,
//       //   });
//       // }
//
//       // Vérifier site
//       const siteObj = await Site._load(validatedData.site, true);
//       if (!siteObj) {
//         return R.handleError(res, HttpStatus.NOT_FOUND, {
//           code: TIME_ENTRIES_CODES.SITE_NOT_FOUND,
//           message: SITES_ERRORS.NOT_FOUND,
//         });
//       }
//
//       const userId = (req as any).userId;
//
//       // === LOGIQUE SELON TYPE DE POINTAGE ===
//
//       switch (validatedData.pointage_type) {
//         case PointageType.CLOCK_IN: {
//           // Vérifier pas de session active
//           const activeSession = await WorkSessions._findActiveSessionByUser(userId);
//           if (activeSession) {
//             return R.handleError(res, HttpStatus.CONFLICT, {
//               code: WORK_SESSIONS_CODES.ACTIVE_SESSION_EXISTS,
//               message: WORK_SESSIONS_ERRORS.ACTIVE_SESSION_EXISTS,
//             });
//           }
//
//           // Validation géofencing
//           const geofenceCheck = await WorkSessions.validateGeofencing(
//             siteObj.getId()!,
//             validatedData.latitude,
//             validatedData.longitude,
//           );
//
//           if (!geofenceCheck.access_granted) {
//             return R.handleError(res, HttpStatus.FORBIDDEN, {
//               code: WORK_SESSIONS_CODES.GEOFENCE_VIOLATION,
//               message: WORK_SESSIONS_ERRORS.GEOFENCE_VIOLATION,
//             });
//           }
//
//           // 1. Créer SESSION automatiquement
//           const sessionObj = new WorkSessions()
//             .setUser(userId)
//             .setSite(siteObj.getId()!)
//             .setSessionStartAt(new Date(validatedData.clocked_at))
//             .setStartCoordinates(validatedData.latitude, validatedData.longitude);
//
//           await sessionObj.save();
//
//           // 2. Créer TIME_ENTRY
//           const entryObj = new TimeEntries()
//             .setSession(sessionObj.getId()!)
//             .setUser(userId)
//             .setSite(siteObj.getId()!)
//             .setPointageType(PointageType.CLOCK_IN)
//             .setClockedAt(new Date(validatedData.clocked_at))
//             .setCoordinates(validatedData.latitude, validatedData.longitude);
//           if (validatedData.device_info) {
//             entryObj.setDeviceInfo(validatedData.device_info);
//           }
//
//           await entryObj.save();
//           await entryObj.accept(); // Auto-accept si pas d'anomalies
//
//           return R.handleCreated(res, {
//             message: TIME_ENTRIES_MESSAGES.CLOCK_IN_SUCCESS,
//             session: await sessionObj.toJSON(responseValue.MINIMAL),
//             entry: await entryObj.toJSON(responseValue.MINIMAL),
//           });
//         }
//         // === CLOCK-IN : Ouverture Session ===
//
//         // === PAUSE-START ===
//         case PointageType.PAUSE_START: {
//           const activeSession = await WorkSessions._findActiveSessionByUser(userId);
//           if (!activeSession) {
//             return R.handleError(res, HttpStatus.BAD_REQUEST, {
//               code: WORK_SESSIONS_CODES.NO_ACTIVE_SESSION,
//               message: WORK_SESSIONS_ERRORS.NO_ACTIVE_SESSION,
//             });
//           }
//
//           // Vérifier qu'il n'y a pas une pause active (car on ne peut aller en pause et aller en pause juste apres)
//           const hasActivePause = await activeSession.isOnPause();
//           if (hasActivePause) {
//             return R.handleError(res, HttpStatus.BAD_REQUEST, {
//               code: WORK_SESSIONS_CODES.NO_ACTIVE_PAUSE,
//               message: WORK_SESSIONS_ERRORS.NO_ACTIVE_PAUSE_END,
//             });
//           }
//
//           const entryObj = new TimeEntries()
//             .setSession(activeSession.getId()!)
//             .setUser(userId)
//             .setSite(siteObj.getId()!)
//             .setPointageType(PointageType.PAUSE_START)
//             .setClockedAt(new Date(validatedData.clocked_at))
//             .setCoordinates(validatedData.latitude, validatedData.longitude);
//
//           await entryObj.save();
//           await entryObj.accept();
//
//           return R.handleCreated(res, {
//             message: 'Pause started',
//             entry: await entryObj.toJSON(responseValue.MINIMAL),
//           });
//         }
//
//         // === PAUSE-END ===
//         case PointageType.PAUSE_END: {
//           const activeSession = await WorkSessions._findActiveSessionByUser(userId);
//           if (!activeSession) {
//             return R.handleError(res, HttpStatus.BAD_REQUEST, {
//               code: WORK_SESSIONS_CODES.NO_ACTIVE_SESSION,
//               message: WORK_SESSIONS_ERRORS.NO_ACTIVE_SESSION,
//             });
//           }
//
//           // Vérifier qu'il y a bien une pause active
//           const hasActivePause = await activeSession.isOnPause();
//           if (!hasActivePause) {
//             return R.handleError(res, HttpStatus.BAD_REQUEST, {
//               code: WORK_SESSIONS_CODES.NO_ACTIVE_PAUSE,
//               message: WORK_SESSIONS_ERRORS.NO_ACTIVE_PAUSE_END,
//             });
//           }
//
//           const entryObj = new TimeEntries()
//             .setSession(activeSession.getId()!)
//             .setUser(userId)
//             .setSite(siteObj.getId()!)
//             .setPointageType(PointageType.PAUSE_END)
//             .setClockedAt(new Date(validatedData.clocked_at))
//             .setCoordinates(validatedData.latitude, validatedData.longitude);
//
//           await entryObj.save();
//           await entryObj.accept();
//
//           return R.handleCreated(res, {
//             message: 'Pause ended',
//             entry: await entryObj.toJSON(responseValue.MINIMAL),
//           });
//         }
//
//         // === EXTERNAL-MISSION ===
//         case PointageType.EXTERNAL_MISSION: {
//           const activeSession = await WorkSessions._findActiveSessionByUser(userId);
//           if (!activeSession) {
//             return R.handleError(res, HttpStatus.NOT_FOUND, {
//               code: WORK_SESSIONS_CODES.NO_ACTIVE_SESSION,
//               message: WORK_SESSIONS_ERRORS.NO_ACTIVE_SESSION,
//             });
//           }
//
//           // 🚫 Vérifier si une mission est déjà en cours
//           const hasActiveMission = await activeSession.activeMission(); // 👈 Méthode à créer
//           if (hasActiveMission) {
//             return R.handleError(res, HttpStatus.CONFLICT, {
//               code: TIME_ENTRIES_CODES.MISSION_ALREADY_ACTIVE,
//               message:
//                 'An external mission is already in progress. Complete it before starting a new one.',
//             });
//           }
//
//           const entryObj = new TimeEntries()
//             .setSession(activeSession.getId()!)
//             .setUser(userId)
//             .setSite(siteObj.getId()!)
//             .setPointageType(PointageType.EXTERNAL_MISSION)
//             .setClockedAt(new Date(validatedData.clocked_at))
//             .setCoordinates(validatedData.latitude, validatedData.longitude)
//             .setDeviceInfo({
//               // Device info classique
//               device_id: validatedData.device_info?.device_id,
//               os: validatedData.device_info?.os,
//
//               // // Contexte mission (stocké dans le même JSONB)
//               // mission_context: {
//               //   destination: validatedData.validatedDataSchema.mission_data?.destination,
//               //   purpose: validatedData.validatedDataSchema.mission_data?.purpose,
//               //   expected_return: validatedData.validatedDataSchema.mission_data?.expected_return,
//               //   transport: validatedData.validatedDataSchema.mission_data?.transport,
//               //   authorization: validatedData.validatedDataSchema.mission_data?.authorization,
//               // },
//             });
//
//           await entryObj.save();
//
//           return R.handleCreated(res, {
//             message: 'External mission started',
//             entry: await entryObj.toJSON(),
//           });
//         }
//
//         // === EXTERNAL-MISSION-END ===
//         case PointageType.EXTERNAL_MISSION_END: {
//           const activeSession = await WorkSessions._findActiveSessionByUser(userId);
//           if (!activeSession) {
//             return R.handleError(res, HttpStatus.NOT_FOUND, {
//               code: WORK_SESSIONS_CODES.NO_ACTIVE_SESSION,
//               message: WORK_SESSIONS_ERRORS.NO_ACTIVE_SESSION,
//             });
//           }
//
//           // Vérifier qu'une mission est active
//           const hasActiveMission = await activeSession.activeMission();
//           if (!hasActiveMission) {
//             return R.handleError(res, HttpStatus.CONFLICT, {
//               code: 'no_active_mission',
//               message: 'No active external mission to end.',
//             });
//           }
//
//           const entryObj = new TimeEntries()
//             .setSession(activeSession.getId()!)
//             .setUser(userId)
//             .setSite(siteObj.getId()!)
//             .setPointageType(PointageType.EXTERNAL_MISSION_END)
//             .setClockedAt(new Date(validatedData.clocked_at))
//             .setCoordinates(validatedData.latitude, validatedData.longitude);
//
//           if (validatedData.device_info) {
//             entryObj.setDeviceInfo(validatedData.device_info);
//           }
//
//           await entryObj.save();
//           await entryObj.accept();
//
//           return R.handleCreated(res, {
//             message: 'External mission ended',
//             entry: await entryObj.toJSON(responseValue.MINIMAL),
//           });
//         }
//
//         // === CLOCK-OUT : Fermeture Session ===
//         case PointageType.CLOCK_OUT: {
//           const activeSession = await WorkSessions._findActiveSessionByUser(userId);
//           if (!activeSession) {
//             return R.handleError(res, HttpStatus.BAD_REQUEST, {
//               code: WORK_SESSIONS_CODES.NO_ACTIVE_SESSION,
//               message: WORK_SESSIONS_ERRORS.NO_ACTIVE_CLOSE_SESSION,
//             });
//           }
//
//           if (
//             validatedData.clocked_at &&
//             !WorkSessionsValidationUtils.validateSessionDateLogic(
//               activeSession.getSessionStartAt()!,
//               new Date(validatedData.clocked_at),
//             )
//           ) {
//             return R.handleError(res, HttpStatus.BAD_REQUEST, {
//               code: WORK_SESSIONS_CODES.SESSION_DATES_LOGIC_INVALID,
//               message: WORK_SESSIONS_ERRORS.SESSION_DATES_LOGIC_INVALID,
//             });
//           }
//
//           // 🚫 Vérifier si la session n'est pas déjà fermée
//           if (activeSession.getSessionStatus() === SessionStatus.CLOSED) {
//             return R.handleError(res, HttpStatus.CONFLICT, {
//               code: WORK_SESSIONS_CODES.SESSION_ALREADY_CLOSED,
//               message: `Session already closed, cannot clock-out again. ${activeSession.getSessionStatus()} ${SessionStatus.CLOSED}`,
//             });
//           }
//
//           // 🚫 Vérifier si le dernier pointage n'est pas déjà un CLOCK_OUT
//           const lastEntry = await activeSession.LastEntry(); // 👈 Méthode à créer
//           if (lastEntry?.pointage_type === PointageType.CLOCK_OUT) {
//             return R.handleError(res, HttpStatus.CONFLICT, {
//               code: TIME_ENTRIES_CODES.ALREADY_CLOCKED_OUT,
//               message: `Already clocked-out, cannot clock-out again. ${lastEntry.pointage_type} ${PointageType.CLOCK_OUT}`,
//             });
//           }
//
//           // Vérifier pas de pause active
//           const canClose = await activeSession.canClockOut();
//           if (!canClose) {
//             return R.handleError(res, HttpStatus.BAD_REQUEST, {
//               code: TIME_ENTRIES_CODES.CANNOT_CLOCK_OUT,
//               message: 'Cannot clock-out: active pause or mission',
//             });
//           }
//
//           // 1. Créer TIME_ENTRY
//           const entryObj = new TimeEntries()
//             .setSession(activeSession.getId()!)
//             .setUser(userId)
//             .setSite(siteObj.getId()!)
//             .setPointageType(PointageType.CLOCK_OUT)
//             .setClockedAt(new Date(validatedData.clocked_at))
//             .setCoordinates(validatedData.latitude, validatedData.longitude);
//
//           await entryObj.save();
//           await entryObj.accept();
//
//           // 2. Fermer SESSION
//           activeSession
//             .setSessionEndAt(new Date(validatedData.clocked_at))
//             .setEndCoordinates(validatedData.latitude, validatedData.longitude)
//             .setSessionStatus(SessionStatus.CLOSED);
//
//           // 3. Calculer durées
//           const durations = await activeSession.calculateDurations();
//           // Note: calculateDurations met à jour total_work_duration et total_pause_duration
//
//           await activeSession.save();
//
//           return R.handleCreated(res, {
//             message: 'Clock-out successful',
//             session: await activeSession.toJSON(),
//             entry: await entryObj.toJSON(responseValue.MINIMAL),
//             durations,
//           });
//         }
//
//         default:
//           return R.handleError(res, HttpStatus.BAD_REQUEST, {
//             code: TIME_ENTRIES_CODES.INVALID_POINTAGE_TYPE,
//           });
//       }
//     } catch (error: any) {
//       // Erreur de validation (a un code custom)
//       if (error.code) {
//         return R.handleError(res, HttpStatus.BAD_REQUEST, {
//           code: error.code,
//           message: error.message,
//         });
//       }
//
//       // Erreur système/inattendue
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: TIME_ENTRIES_CODES.CREATION_FAILED,
//         message: error.message,
//       });
//     }
//
//     // catch (error: any) {
//     //   if (error.issues) {
//     //     return R.handleError(res, HttpStatus.BAD_REQUEST, {
//     //       code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
//     //       message: TIME_ENTRIES_ERRORS.VALIDATION_FAILED,
//     //       details: error.issues,
//     //     });
//     //   } else if (error.message.includes('required')) {
//     //     return R.handleError(res, HttpStatus.BAD_REQUEST, {
//     //       code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
//     //       message: error.message,
//     //     });
//     //   } else {
//     //     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//     //       code: TIME_ENTRIES_CODES.CREATION_FAILED,
//     //       message: error.message,
//     //     });
//     //   }
//     // }
//   },
// );

router.post(
  '/',
  Ensure.post(),
  UserAuth.timeEntriesAuthenticate,
  async (req: Request, res: Response) => {
    try {
      // Récupération métadonnées headers
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress ||
        req.ip;
      const userAgent = req.headers['user-agent'] || '';

      const bodyWithMetadata = {
        ...req.body,
        ip_address: ip,
        user_agent: userAgent,
      };

      const validatedData = validateTimeEntriesCreation(bodyWithMetadata);
      const userId = (req as any).userId;

      // Vérifier site
      const siteObj = await Site._load(validatedData.site, true);
      if (!siteObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: TIME_ENTRIES_CODES.SITE_NOT_FOUND,
          message: SITES_ERRORS.NOT_FOUND,
        });
      }

      // === ⚠️ GÉOFENCING : SEULE VÉRIFICATION BLOQUANTE ===
      const geofenceCheck = await WorkSessions.validateGeofencing(
        siteObj.getId()!,
        validatedData.latitude,
        validatedData.longitude,
      );

      if (!geofenceCheck.access_granted) {
        // ❌ REFUS POINTAGE
        // // ✅ MAIS génération mémo automatique
        // const autoMemo = await AnomalyDetectionService.generateGeofencingMemo(
        //   userId,
        //   siteObj,
        //   validatedData,
        //   geofenceCheck,
        // );

        return R.handleError(res, HttpStatus.FORBIDDEN, {
          code: WORK_SESSIONS_CODES.GEOFENCE_VIOLATION,
          message: WORK_SESSIONS_ERRORS.GEOFENCE_VIOLATION,
          details: {
            distance_from_center: geofenceCheck.distance_from_center,
            max_allowed: siteObj.getGeofenceRadius(),
            // auto_memo_created: true,
            // memo_guid: autoMemo.getGuid(),
          },
        });
      }

      // === LOGIQUE SELON TYPE DE POINTAGE (NON-BLOQUANTE) ===

      switch (validatedData.pointage_type) {
        case PointageType.CLOCK_IN: {
          // 🔍 DÉTECTION ANOMALIES
          const { anomalies, corrections } = await AnomalyDetectionService.detectClockInAnomalies(
            userId,
            validatedData,
          );

          // ✅ CRÉER SESSION QUOI QU'IL ARRIVE
          const sessionObj = new WorkSessions()
            .setUser(userId)
            .setSite(siteObj.getId()!)
            .setSessionStartAt(new Date(validatedData.clocked_at))
            .setStartCoordinates(validatedData.latitude, validatedData.longitude);
          console.log('🔴🔴');
          await sessionObj.save();

          // ✅ CRÉER TIME_ENTRY
          const entryObj = new TimeEntries()
            .setSession(sessionObj.getId()!)
            .setUser(userId)
            .setSite(siteObj.getId()!)
            .setPointageType(PointageType.CLOCK_IN)
            .setClockedAt(new Date(validatedData.clocked_at))
            .setCoordinates(validatedData.latitude, validatedData.longitude);

          if (validatedData.device_info) {
            entryObj.setDeviceInfo(validatedData.device_info);
          }
          console.log('🔴🔴🔴');
          await entryObj.save();
          await entryObj.accept(); // ✅ Toujours accepté

          // ✅ GÉNÉRER MÉMO AUTO SI ANOMALIES
          let autoMemo = null;
          if (anomalies.length > 0) {
            console.log('🔴🔴🔴🔴');
            autoMemo = await AnomalyDetectionService.generateAutoMemo(
              anomalies,
              entryObj,
              userId,
              corrections,
            );

            // Lier mémo à l'entry
            if (autoMemo) {
              console.log('🔴🔴🔴🔴🔴');
              entryObj.setMemo(autoMemo.getId()!);
              await entryObj.save();
            }

            // ✅ CRÉER FRAUD ALERTS
            await AnomalyDetectionService.createFraudAlertsForAnomalies(
              anomalies,
              entryObj,
              userId,
            );
          }

          return R.handleCreated(res, {
            message:
              anomalies.length > 0
                ? 'Clock-in accepté avec anomalies détectées'
                : TIME_ENTRIES_MESSAGES.CLOCK_IN_SUCCESS,
            session: await sessionObj.toJSON(),
            entry: await entryObj.toJSON(),
            anomalies_detected: anomalies.length,
            auto_memo_created: autoMemo !== null,
            auto_memo_guid: autoMemo?.getGuid(),
            corrections_applied: corrections.length,
          });
        }

        case PointageType.PAUSE_START: {
          // 🔍 DÉTECTION ANOMALIES
          const { anomalies, corrections, activeSession } =
            await AnomalyDetectionService.detectPauseStartAnomalies(userId, validatedData);

          // ✅ CRÉER SESSION RÉTROACTIVE SI NÉCESSAIRE
          let sessionToUse = activeSession;

          const tempEntry = new TimeEntries()
            .setUser(userId)
            .setSite(siteObj.getId()!)
            .setPointageType(PointageType.PAUSE_START)
            .setClockedAt(new Date(validatedData.clocked_at))
            .setCoordinates(validatedData.latitude, validatedData.longitude);

          if (!activeSession && anomalies.some((a) => a.auto_correctable)) {
            sessionToUse = await AnomalyDetectionService.createRetroactiveSession(
              userId,
              siteObj.getId()!,
              tempEntry,
            );
          }

          // ✅ CRÉER TIME_ENTRY
          tempEntry.setSession(sessionToUse?.getId()!);
          await tempEntry.save();
          await tempEntry.accept();

          // ✅ GÉNÉRER MÉMO AUTO SI ANOMALIES
          let autoMemo = null;
          if (anomalies.length > 0) {
            autoMemo = await AnomalyDetectionService.generateAutoMemo(
              anomalies,
              tempEntry,
              userId,
              corrections,
            );

            if (autoMemo) {
              tempEntry.setMemo(autoMemo.getId()!);
              await tempEntry.save();
            }

            await AnomalyDetectionService.createFraudAlertsForAnomalies(
              anomalies,
              tempEntry,
              userId,
            );
          }

          return R.handleCreated(res, {
            message:
              anomalies.length > 0 ? 'Pause acceptée avec anomalies détectées' : 'Pause started',
            entry: await tempEntry.toJSON(),
            session: sessionToUse ? await sessionToUse.toJSON() : null,
            anomalies_detected: anomalies.length,
            auto_memo_created: autoMemo !== null,
            corrections_applied: corrections.length,
          });
        }

        case PointageType.PAUSE_END: {
          // 🔍 DÉTECTION ANOMALIES
          const { anomalies, corrections, activeSession } =
            await AnomalyDetectionService.detectPauseEndAnomalies(userId, validatedData);

          const tempEntry = new TimeEntries()
            .setUser(userId)
            .setSite(siteObj.getId()!)
            .setPointageType(PointageType.PAUSE_START)
            .setClockedAt(new Date(validatedData.clocked_at))
            .setCoordinates(validatedData.latitude, validatedData.longitude);

          // ✅ CRÉER SESSION RÉTROACTIVE SI NÉCESSAIRE
          let sessionToUse = activeSession;
          if (!activeSession && anomalies.some((a) => a.auto_correctable)) {
            sessionToUse = await AnomalyDetectionService.createRetroactiveSession(
              userId,
              siteObj.getId()!,
              tempEntry,
            );
          }

          // const entryObj = new TimeEntries()
          tempEntry.setSession(sessionToUse?.getId()!);

          await tempEntry.save();
          await tempEntry.accept();

          // ✅ MÉMO AUTO
          let autoMemo = null;
          if (anomalies.length > 0) {
            autoMemo = await AnomalyDetectionService.generateAutoMemo(
              anomalies,
              tempEntry,
              userId,
              corrections,
            );

            if (autoMemo) {
              tempEntry.setMemo(autoMemo.getId()!);
              await tempEntry.save();
            }

            await AnomalyDetectionService.createFraudAlertsForAnomalies(
              anomalies,
              tempEntry,
              userId,
            );
          }

          return R.handleCreated(res, {
            message: anomalies.length > 0 ? 'Pause terminée avec anomalies' : 'Pause ended',
            entry: await tempEntry.toJSON(),
            anomalies_detected: anomalies.length,
            auto_memo_created: autoMemo !== null,
          });
        }

        case PointageType.CLOCK_OUT: {
          // 🔍 DÉTECTION ANOMALIES
          const { anomalies, corrections, activeSession, autoCreatedSession } =
            await AnomalyDetectionService.detectAndCorrectClockOutWithoutSession(
              userId,
              validatedData,
              siteObj,
            );

          // ✅ CRÉER ENTRY (même sans session)
          const entryObj = new TimeEntries()
            .setSession(activeSession?.getId()!)
            .setUser(userId)
            .setSite(siteObj.getId()!)
            .setPointageType(PointageType.CLOCK_OUT)
            .setClockedAt(new Date(validatedData.clocked_at))
            .setCoordinates(validatedData.latitude, validatedData.longitude);

          await entryObj.save();
          await entryObj.accept();

          // ✅ FERMER SESSION SI EXISTE
          let durations = null;
          if (activeSession) {
            activeSession
              .setSessionEndAt(new Date(validatedData.clocked_at))
              .setEndCoordinates(validatedData.latitude, validatedData.longitude)
              .setSessionStatus(
                anomalies.length > 0 ? SessionStatus.CORRECTED : SessionStatus.CLOSED,
              );

            durations = await activeSession.calculateDurations();
            await activeSession.save();
          }

          // ✅ MÉMO AUTO
          let autoMemo = null;
          if (anomalies.length > 0) {
            autoMemo = await AnomalyDetectionService.generateAutoMemo(
              anomalies,
              entryObj,
              userId,
              corrections,
            );

            if (autoMemo) {
              entryObj.setMemo(autoMemo.getId()!);
              await entryObj.save();
            }

            // ✅ FRAUD ALERTS
            await AnomalyDetectionService.createFraudAlertsForAnomalies(
              anomalies,
              entryObj,
              userId,
            );
          }

          return R.handleCreated(res, {
            message: autoCreatedSession
              ? `⚠️ Clock-out accepté - Session d'entrée créée automatiquement`
              : anomalies.length > 0
                ? 'Clock-out accepté avec anomalies'
                : 'Clock-out successful',
            session: activeSession ? await activeSession.toJSON() : null,
            entry: await entryObj.toJSON(),
            durations,
            anomalies_detected: anomalies.length,
            auto_memo_created: autoMemo !== null,
            auto_memo_guid: autoMemo?.getGuid(),
            corrections_applied: corrections.length,
            auto_created_session: autoCreatedSession, // ✅ Flag important
          });
        }

        case PointageType.EXTERNAL_MISSION: {
          // 🔍 DÉTECTION ANOMALIES
          const { anomalies, corrections, activeSession, autoCreatedSession } =
            await AnomalyDetectionService.detectMissionStartAnomalies(
              userId,
              validatedData,
              siteObj,
            );

          const entryObj = new TimeEntries()
            .setSession(activeSession?.getId()!)
            .setUser(userId)
            .setSite(siteObj.getId()!)
            .setPointageType(PointageType.EXTERNAL_MISSION)
            .setClockedAt(new Date(validatedData.clocked_at))
            .setCoordinates(validatedData.latitude, validatedData.longitude);

          if (validatedData.device_info) {
            entryObj.setDeviceInfo(validatedData.device_info);
          }

          await entryObj.save();
          await entryObj.accept();

          let autoMemo = null;
          if (anomalies.length > 0) {
            autoMemo = await AnomalyDetectionService.generateAutoMemo(
              anomalies,
              entryObj,
              userId,
              corrections,
            );

            if (autoMemo) {
              entryObj.setMemo(autoMemo.getId()!);
              await entryObj.save();
            }

            await AnomalyDetectionService.createFraudAlertsForAnomalies(
              anomalies,
              entryObj,
              userId,
            );
          }

          return R.handleCreated(res, {
            message: autoCreatedSession
              ? '⚠️ Mission démarrée - Session créée automatiquement'
              : anomalies.length > 0
                ? 'Mission acceptée avec anomalies'
                : 'External mission started',
            entry: await entryObj.toJSON(),
            session: activeSession ? await activeSession.toJSON() : null,
            anomalies_detected: anomalies.length,
            auto_created_session: autoCreatedSession,
            auto_memo_created: autoMemo !== null,
            corrections_applied: corrections.length,
          });
        }

        case PointageType.EXTERNAL_MISSION_END: {
          // 🔍 DÉTECTION ANOMALIES
          const {
            anomalies,
            corrections,
            activeSession,
            autoCreatedSession,
            autoCreatedMissionStart,
          } = await AnomalyDetectionService.detectMissionEndAnomalies(
            userId,
            validatedData,
            siteObj,
          );

          const entryObj = new TimeEntries()
            .setSession(activeSession?.getId()!)
            .setUser(userId)
            .setSite(siteObj.getId()!)
            .setPointageType(PointageType.EXTERNAL_MISSION_END)
            .setClockedAt(new Date(validatedData.clocked_at))
            .setCoordinates(validatedData.latitude, validatedData.longitude);

          if (validatedData.device_info) {
            entryObj.setDeviceInfo(validatedData.device_info);
          }

          await entryObj.save();
          await entryObj.accept();

          let autoMemo = null;
          if (anomalies.length > 0) {
            autoMemo = await AnomalyDetectionService.generateAutoMemo(
              anomalies,
              entryObj,
              userId,
              corrections,
            );

            if (autoMemo) {
              entryObj.setMemo(autoMemo.getId()!);
              await entryObj.save();
            }

            await AnomalyDetectionService.createFraudAlertsForAnomalies(
              anomalies,
              entryObj,
              userId,
            );
          }

          return R.handleCreated(res, {
            message:
              autoCreatedSession || autoCreatedMissionStart
                ? '⚠️ Mission terminée - Corrections automatiques appliquées'
                : anomalies.length > 0
                  ? 'Mission terminée avec anomalies'
                  : 'External mission ended',
            entry: await entryObj.toJSON(),
            session: activeSession ? await activeSession.toJSON() : null,
            anomalies_detected: anomalies.length,
            auto_memo_created: autoMemo !== null,
            auto_created_session: autoCreatedSession,
            auto_created_mission_start: autoCreatedMissionStart,
            corrections_applied: corrections.length,
          });
        }

        default:
          return R.handleError(res, HttpStatus.BAD_REQUEST, {
            code: TIME_ENTRIES_CODES.INVALID_POINTAGE_TYPE,
            message: TIME_ENTRIES_ERRORS.POINTAGE_TYPE_INVALID,
          });
      }
    } catch (error: any) {
      if (error.code) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: error.code,
          message: error.message,
        });
      }

      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: TIME_ENTRIES_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  },
);

// === SYNCHRONISATION BATCH OFFLINE ===

// router.post('/sync/batch', Ensure.post(), async (req: Request, res: Response) => {
//   try {
//     const validatedData = validateBatchSync(req.body);
//
//     const userObj = await User._load(validatedData.user_guid, true);
//     if (!userObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
//         message: 'User not found',
//       });
//     }
//
//     const syncResult = await TimeEntries.processBatchSynchronization(
//       userObj.getId()!,
//       validatedData.entries,
//     );
//
//     return R.handleSuccess(res, {
//       message: 'Batch synchronization completed',
//       sync_result: syncResult,
//       processed_at: new Date().toISOString(),
//     });
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
//         message: TIME_ENTRIES_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: TIME_ENTRIES_CODES.SYNC_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });

// === RÉCUPÉRATION PAR GUID ===

router.get('/requirement', Ensure.get(), async (req: Request, res: Response) => {
  try {
    return R.handleSuccess(res, {
      count: Object.entries(PointageType).length,
      items: Object.entries(PointageType).map(([key, value]) => ({
        key,
        value,
      })),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const entryObj = await TimeEntries._load(req.params.guid, true);
    if (!entryObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      entry: await entryObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// === POINTAGES PAR SESSION ===

router.get('/session/:sessionGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.sessionGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const sessionObj = await WorkSessions._load(req.params.sessionGuid, true);
    if (!sessionObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.SESSION_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.SESSION_NOT_FOUND,
      });
    }

    const entryList = await TimeEntries._listBySession(sessionObj.getId()!);
    const entries = {
      session: await sessionObj.toJSON(responseValue.MINIMAL),
      entries: entryList
        ? await Promise.all(
            entryList.map(async (entry) => await entry.toJSON(responseValue.MINIMAL)),
          )
        : [],
      count: entryList?.length || 0,
    };

    return R.handleSuccess(res, { entries });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === POINTAGES PAR UTILISATEUR ===

router.get('/user/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    // const paginationOptions = paginationSchema.parse(req.query);

    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const entryList = await TimeEntries._listByUser(userObj.getId()!);
    const entries = {
      // user: userObj.toPublicJSON(),
      items: entryList
        ? await Promise.all(entryList.map(async (entry) => await entry.toJSON(views)))
        : [],
      count: entryList?.length || 0,
    };

    return R.handleSuccess(res, { entries });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === POINTAGES OFFLINE EN ATTENTE ===

router.get('/user/:userGuid/offline', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const offlineEntries = await TimeEntries._findOfflineEntries(
      userObj.getId()!,
      paginationOptions,
    );
    const entries = {
      // user: userObj.toPublicJSON(),
      offline_entries: offlineEntries
        ? await Promise.all(offlineEntries.map(async (entry) => await entry.toJSON(views)))
        : [],
      count: offlineEntries?.length || 0,
    };

    return R.handleSuccess(res, { entries });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === POINTAGES EN ATTENTE VALIDATION ===

router.get('/pending/validation', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

    const pendingEntries = await TimeEntries._findPendingValidation(paginationOptions);
    const entries = {
      pending_entries: pendingEntries
        ? await Promise.all(pendingEntries.map(async (entry) => await entry.toJSON(views)))
        : [],
      count: pendingEntries?.length || 0,
    };

    return R.handleSuccess(res, { entries });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === VALIDATION MANAGER ===

router.patch('/:guid/approve', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const entryObj = await TimeEntries._load(req.params.guid, true);
    if (!entryObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.NOT_FOUND,
      });
    }

    const { manager_guid } = req.body;

    if (!manager_guid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
        message: 'Manager guid is required',
      });
    }

    const managerObj = await User._load(manager_guid, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
        message: 'Manager not found',
      });
    }

    await entryObj.approve(managerObj.getId()!);

    return R.handleSuccess(res, {
      message: 'Entry approved successfully',
      entry: await entryObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.APPROVAL_FAILED,
      message: error.message,
    });
  }
});

router.patch('/:guid/reject', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const entryObj = await TimeEntries._load(req.params.guid, true);
    if (!entryObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.NOT_FOUND,
      });
    }

    const { reason } = req.body;

    if (!reason) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
        message: 'Rejection reason is required',
      });
    }

    await entryObj.reject(reason);

    return R.handleSuccess(res, {
      message: 'Entry rejected successfully',
      entry: await entryObj.toJSON(),
      rejection_reason: reason,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.REJECTION_FAILED,
      message: error.message,
    });
  }
});

// === CORRECTIONS ===

router.patch('/:guid/correct', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const entryObj = await TimeEntries._load(req.params.guid, true);
    if (!entryObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.NOT_FOUND,
      });
    }

    const { corrections, manager_guid } = req.body;

    if (!corrections || !manager_guid) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
        message: 'corrections and manager_guid are required',
      });
    }

    const managerObj = await User._load(manager_guid, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
        message: 'Manager not found',
      });
    }

    await entryObj.applyManagerCorrection(corrections, managerObj.getId()!);

    return R.handleSuccess(res, {
      message: 'Corrections applied successfully',
      entry: await entryObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.CORRECTION_FAILED,
      message: error.message,
    });
  }
});

// === DÉTECTION ANOMALIES ===

router.get('/:guid/anomalies', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const entryObj = await TimeEntries._load(req.params.guid, true);
    if (!entryObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.NOT_FOUND,
      });
    }

    const anomalies = await entryObj.detectAnomalies();
    const fraudScore = await entryObj.getFraudScore();

    return R.handleSuccess(res, {
      entry_guid: entryObj.getGuid(),
      has_anomalies: anomalies.length > 0,
      fraud_score: fraudScore,
      anomalies,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.ANOMALY_DETECTION_FAILED,
      message: error.message,
    });
  }
});

router.get('/user/:userGuid/anomalies', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!UsersValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const { days = 7 } = req.query;
    const anomalies = await TimeEntries.detectUserAnomalies(
      userObj.getId()!,
      parseInt(days as string, 10),
    );

    return R.handleSuccess(res, {
      user: userObj.toPublicJSON(),
      days_analyzed: days,
      anomalies,
      anomaly_count: anomalies.length,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.ANOMALY_DETECTION_FAILED,
      message: error.message,
    });
  }
});

// === STATISTIQUES ===

router.get('/statistics/overview', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters: Record<string, any> = {};

    if (req.query.user_guid) {
      const userObj = await User._load(req.query.user_guid as string, true);
      if (userObj) filters.user = userObj.getId();
    }

    if (req.query.site_guid) {
      const siteObj = await Site._load(req.query.site_guid as string, true);
      if (siteObj) filters.site = siteObj.getId();
    }

    const statistics = await TimeEntries.getEntriesStatistics(filters);

    return R.handleSuccess(res, { statistics });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.STATISTICS_FAILED,
      message: error.message,
    });
  }
});

// === LAST POINTAGE ===
router.get('/:guid/last', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const guid = req.params.guid;
    if (!UsersValidationUtils.validateGuid(String(guid))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: USERS_CODES.INVALID_GUID,
        message: USERS_ERRORS.GUID_INVALID,
      });
    }

    const userObj = await User._load(String(guid), true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const views = ValidationUtils.validateView(req.query.view, responseValue.MINIMAL);

    // ✅ Liste de tous les pointages de l'utilisateur
    const entries = await TimeEntries._listByUser(userObj.getId()!);
    if (!entries || entries.length === 0) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
        message: 'No time entries found',
      });
    }

    // ✅ Tri par date décroissante selon server_received_at
    const sortedEntries = entries.sort((a, b) => {
      const dateA = a.getServerReceivedAt() ? new Date(a.getServerReceivedAt()!).getTime() : 0;
      const dateB = b.getServerReceivedAt() ? new Date(b.getServerReceivedAt()!).getTime() : 0;
      return dateB - dateA; // du plus récent au plus ancien
    });

    const lastEntry = sortedEntries[0]; // ✅ le plus récent

    // const lastEntries = await TimeEntries._listByUser(userObj.getId()!);
    // if (!lastEntries || lastEntries.length === 0) {
    //   return R.handleError(res, HttpStatus.NOT_FOUND, {
    //     code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
    //     message: 'No time entries found',
    //   });
    // }
    //
    // const lastEntry = lastEntries.at(-1);

    return R.handleSuccess(res, {
      entry: await lastEntry?.toJSON(views),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.SEARCH_FAILED,
      message: error.message,
    });
  }
});

// === MISE À JOUR ===

// router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
//   try {
//     if (!TimeEntriesValidationUtils.validateGuid(req.params.guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: TIME_ENTRIES_CODES.INVALID_GUID,
//         message: TIME_ENTRIES_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const entryObj = await TimeEntries._load(req.params.guid, true);
//     if (!entryObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
//         message: TIME_ENTRIES_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const validatedData = validateTimeEntriesUpdate(req.body);
//
//     if (validatedData.pointage_status) {
//       entryObj.setPointageStatus(validatedData.pointage_status);
//     }
//
//     if (validatedData.memo) {
//       entryObj.setMemo(validatedData.memo);
//     }
//
//     if (validatedData.correction_reason) {
//       entryObj.setCorrectionReason(validatedData.correction_reason);
//     }
//
//     await entryObj.save();
//     return R.handleSuccess(res, await entryObj.toJSON());
//   } catch (error: any) {
//     if (error.issues) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: TIME_ENTRIES_CODES.VALIDATION_FAILED,
//         message: TIME_ENTRIES_ERRORS.VALIDATION_FAILED,
//         details: error.issues,
//       });
//     } else {
//       return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//         code: TIME_ENTRIES_CODES.UPDATE_FAILED,
//         message: error.message,
//       });
//     }
//   }
// });

// === SUPPRESSION ===

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!TimeEntriesValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: TIME_ENTRIES_CODES.INVALID_GUID,
        message: TIME_ENTRIES_ERRORS.GUID_INVALID,
      });
    }

    const entryObj = await TimeEntries._load(req.params.guid, true);
    if (!entryObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: TIME_ENTRIES_CODES.TIME_ENTRY_NOT_FOUND,
        message: TIME_ENTRIES_ERRORS.NOT_FOUND,
      });
    }

    await entryObj.delete();
    return R.handleSuccess(res, {
      message: TIME_ENTRIES_MESSAGES.DELETED_SUCCESSFULLY,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: TIME_ENTRIES_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

// === HISTORIQUE D'ASSIDUITÉ (TEAM) ===

// 🕒 Retrieve historical attendance data for team with filtering by date range and employee
router.get('/attendance/history', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager, site, start_date, end_date, employee } = req.query;

    // Validation et parsing des dates
    const startDate = start_date
      ? new Date(start_date as string)
      : (() => {
          const date = new Date();
          date.setDate(date.getDate() - 30); // 30 derniers jours par défaut
          return date;
        })();

    const endDate = end_date ? new Date(end_date as string) : new Date();

    // Construire les conditions
    const conditions: Record<string, any> = {
      session_start_at: {
        [Op.between]: [startDate, endDate],
      },
    };

    let managerObj: User | null = null;
    let siteObj: Site | null = null;
    let employeeObj: User | null = null;
    let subordinateIds: number[] | null = null;

    // Filtre par manager
    if (manager) {
      if (!UsersValidationUtils.validateGuid(String(manager))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.VALIDATION_FAILED,
          message: USERS_ERRORS.GUID_INVALID,
        });
      }

      managerObj = await User._load(String(manager), true);
      if (!managerObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.SUPERVISOR_NOT_FOUND,
          message: USERS_ERRORS.SUPERVISOR_NOT_FOUND,
        });
      }

      const userRolesSub = await UserRole._listByAssignedBy(managerObj.getId()!);
      if (userRolesSub && userRolesSub.length > 0) {
        subordinateIds = [];
        userRolesSub.forEach((userRole) => {
          const userId = userRole.getUser();
          if (userId) subordinateIds!.push(userId);
        });
        conditions.user = { [Op.in]: subordinateIds };
      }
    }

    // Filtre par employé spécifique
    if (employee) {
      if (!UsersValidationUtils.validateGuid(String(employee))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.VALIDATION_FAILED,
          message: USERS_ERRORS.GUID_INVALID,
        });
      }

      employeeObj = await User._load(String(employee), true);
      if (!employeeObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: USERS_ERRORS.NOT_FOUND,
        });
      }

      conditions.user = employeeObj.getId();
    }

    // Filtre par site
    if (site) {
      if (!WorkSessionsValidationUtils.validateGuid(String(site))) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: WORK_SESSIONS_CODES.INVALID_GUID,
          message: WORK_SESSIONS_ERRORS.GUID_INVALID,
        });
      }

      siteObj = await Site._load(String(site), true);
      if (!siteObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: WORK_SESSIONS_CODES.SITE_NOT_FOUND,
          message: SITES_ERRORS.NOT_FOUND,
        });
      }

      conditions.site = siteObj.getId();
    }

    // Récupérer les sessions
    const sessions = await WorkSessions._list(conditions);

    // Enrichir et organiser les données
    const history: any[] = [];
    const employeeStats: Record<number, any> = {};

    if (sessions) {
      await Promise.all(
        sessions.map(async (session) => {
          const empId = session.getUser()!;
          const emp = await User._load(empId);
          const sessionSite = await Site._load(session.getSite()!);
          const sessionData = await session.toJSON(responseValue.MINIMAL);

          history.push({
            ...sessionData,
            employee: emp ? emp.toJSON() : null,
            site: sessionSite ? await sessionSite.toJSON(responseValue.MINIMAL) : null,
          });

          // Accumuler stats par employé
          if (!employeeStats[empId]) {
            employeeStats[empId] = {
              employee: emp ? emp.toJSON() : null,
              total_sessions: 0,
              total_hours: 0,
              on_time_count: 0,
              late_count: 0,
            };
          }

          employeeStats[empId].total_sessions++;

          // Calculer heures
          if (session.getTotalWorkDuration()) {
            const matches = session
              .getTotalWorkDuration()!
              .match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
            if (matches) {
              const hours = parseInt(matches[1]) || 0;
              const minutes = parseInt(matches[2]) || 0;
              employeeStats[empId].total_hours += hours + minutes / 60;
            }
          }
        }),
      );
    }

    // Trier par date (plus récent en premier)
    history.sort((a, b) => {
      return new Date(b.session_start_at).getTime() - new Date(a.session_start_at).getTime();
    });

    return R.handleSuccess(res, {
      message: 'Attendance history retrieved successfully',
      data: {
        filters: {
          manager: managerObj ? managerObj.toJSON() : null,
          site: siteObj ? await siteObj.toJSON(responseValue.MINIMAL) : null,
          employee: employeeObj ? employeeObj.toJSON() : null,
          date_range: {
            start: startDate,
            end: endDate,
          },
        },
        summary: {
          total_sessions: history.length,
          unique_employees: Object.keys(employeeStats).length,
          total_work_hours: Object.values(employeeStats)
            .reduce((sum: number, stat: any) => sum + stat.total_hours, 0)
            .toFixed(2),
        },
        employee_statistics: Object.values(employeeStats),
        history,
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'attendance_history_retrieval_failed',
      message: error.message || 'Failed to retrieve attendance history',
    });
  }
});

// === HISTORIQUE D'ASSIDUITÉ PAR EMPLOYÉ ===

// 📊 Detailed attendance history for specific employee with patterns and statistics
router.get(
  '/attendance/employee/:guid/history',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      const { guid } = req.params;
      const { start_date, end_date, include_time_entries } = req.query;

      const paginationOptions = paginationSchema.parse(req.query);

      const views = ValidationUtils.validateView(req.query.view, responseValue.FULL);

      // Validation
      if (!UsersValidationUtils.validateGuid(guid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: USERS_CODES.VALIDATION_FAILED,
          message: USERS_ERRORS.GUID_INVALID,
        });
      }

      const employee = await User._load(guid, true);
      if (!employee) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: USERS_ERRORS.NOT_FOUND,
        });
      }

      // Dates par défaut: 3 derniers mois
      const startDate = start_date
        ? new Date(start_date as string)
        : (() => {
            const date = new Date();
            date.setMonth(date.getMonth() - 3);
            return date;
          })();

      const endDate = end_date ? new Date(end_date as string) : new Date();

      // Récupérer toutes les sessions de l'employé dans la période
      const conditions: Record<string, any> = {
        user: employee.getId(),
        session_start_at: {
          [Op.between]: [startDate, endDate],
        },
      };

      const sessions = await WorkSessions._list(conditions);

      // Analyser les patterns et statistiques
      let totalSessions = 0;
      let totalWorkHours = 0;
      let totalPauseHours = 0;
      let onTimeCount = 0;
      let lateCount = 0;
      let earlyDepartureCount = 0;
      const sessionsByDay: Record<string, any[]> = {};
      const sessionsBySite: Record<number, number> = {};
      const weekdayDistribution = [0, 0, 0, 0, 0, 0, 0]; // Dim-Sam

      const enrichedSessions: any[] = [];

      if (sessions) {
        await Promise.all(
          sessions.map(async (session) => {
            totalSessions++;

            const sessionSite = await Site._load(session.getSite()!);
            const sessionData = await session.toJSON(responseValue.MINIMAL);

            // Stats par site
            const siteId = session.getSite()!;
            sessionsBySite[siteId] = (sessionsBySite[siteId] || 0) + 1;

            // Distribution par jour de la semaine
            if (session.getSessionStartAt()) {
              const dayOfWeek = session.getSessionStartAt()!.getDay();
              weekdayDistribution[dayOfWeek]++;

              // Grouper par jour
              const dateKey = session.getSessionStartAt()!.toISOString().split('T')[0];
              if (!sessionsByDay[dateKey]) {
                sessionsByDay[dateKey] = [];
              }
              sessionsByDay[dateKey].push(sessionData);
            }

            // Calculer heures
            if (session.getTotalWorkDuration()) {
              const matches = session
                .getTotalWorkDuration()!
                .match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
              if (matches) {
                const hours = parseInt(matches[1]) || 0;
                const minutes = parseInt(matches[2]) || 0;
                totalWorkHours += hours + minutes / 60;
              }
            }

            if (session.getTotalPauseDuration()) {
              const matches = session
                .getTotalPauseDuration()!
                .match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
              if (matches) {
                const hours = parseInt(matches[1]) || 0;
                const minutes = parseInt(matches[2]) || 0;
                totalPauseHours += hours + minutes / 60;
              }
            }

            // Inclure time entries si demandé
            let timeEntries = null;
            if (include_time_entries === 'true') {
              const entries = await TimeEntries._listBySession(session.getId()!, paginationOptions);
              timeEntries = entries
                ? await Promise.all(entries.map(async (e) => await e.toJSON(views)))
                : [];
            }

            enrichedSessions.push({
              ...sessionData,
              site: sessionSite ? await sessionSite.toJSON(responseValue.MINIMAL) : null,
              time_entries: timeEntries,
            });
          }),
        );
      }

      // Calcul patterns
      const averageWorkHours =
        totalSessions > 0 ? (totalWorkHours / totalSessions).toFixed(2) : '0.00';
      const averagePauseHours =
        totalSessions > 0 ? (totalPauseHours / totalSessions).toFixed(2) : '0.00';
      const attendanceRate =
        totalSessions > 0 ? ((onTimeCount / totalSessions) * 100).toFixed(1) : '0.0';

      // Sites les plus fréquentés
      const topSites = await Promise.all(
        Object.entries(sessionsBySite)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(async ([siteId, count]) => {
            const site = await Site._load(Number(siteId));
            return {
              site: site ? await site.toJSON(responseValue.MINIMAL) : null,
              sessions_count: count,
            };
          }),
      );

      return R.handleSuccess(res, {
        message: 'Employee attendance history retrieved successfully',
        data: {
          employee: employee.toJSON(),
          period: {
            start: startDate,
            end: endDate,
            days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
          },
          statistics: {
            total_sessions: totalSessions,
            total_work_hours: totalWorkHours.toFixed(2),
            total_pause_hours: totalPauseHours.toFixed(2),
            average_work_hours_per_session: averageWorkHours,
            average_pause_hours_per_session: averagePauseHours,
            on_time_count: onTimeCount,
            late_count: lateCount,
            early_departure_count: earlyDepartureCount,
            attendance_rate: `${attendanceRate}%`,
          },
          patterns: {
            weekday_distribution: {
              sunday: weekdayDistribution[0],
              monday: weekdayDistribution[1],
              tuesday: weekdayDistribution[2],
              wednesday: weekdayDistribution[3],
              thursday: weekdayDistribution[4],
              friday: weekdayDistribution[5],
              saturday: weekdayDistribution[6],
            },
            top_sites: topSites,
            sessions_by_day: sessionsByDay,
          },
          sessions: enrichedSessions,
        },
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'employee_history_retrieval_failed',
        message: error.message || 'Failed to retrieve employee history',
      });
    }
  },
);

// === TIME ENTRIES DÉTAILLÉS ===
// 📝 Granular view of individual time entries including breaks, missions, and corrections
router.get('/attendance', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager, site, employee, start_date, end_date, pointage_type, status } = req.query;
    const paginationOptions = paginationSchema.parse(req.query);

    const conditions: Record<string, any> = {};

    // Filtres temporels
    if (start_date || end_date) {
      conditions.clocked_at = {};
      if (start_date) conditions.clocked_at[Op.gte] = new Date(start_date as string);
      if (end_date) conditions.clocked_at[Op.lte] = new Date(end_date as string);
    }

    // Filtre par type de pointage
    if (pointage_type) {
      conditions.pointage_type = pointage_type;
    }

    // Filtre par statut
    if (status) {
      conditions.pointage_status = status;
    }

    // Filtre par employé
    if (employee) {
      const employeeObj = await User._load(String(employee), true);
      if (employeeObj) conditions.user = employeeObj.getId();
    }

    // Filtre par site
    if (site) {
      const siteObj = await Site._load(String(site), true);
      if (siteObj) conditions.site = siteObj.getId();
    }

    // Filtre par manager (subordonnés)
    if (manager) {
      const managerObj = await User._load(String(manager), true);
      if (managerObj) {
        const userRolesSub = await UserRole._listByAssignedBy(managerObj.getId()!);
        if (userRolesSub && userRolesSub.length > 0) {
          const subordinateIds = userRolesSub
            .map((ur) => ur.getUser())
            .filter((id): id is number => id !== undefined);
          conditions.user = { [Op.in]: subordinateIds };
        }
      }
    }

    // Récupérer les entries
    const entries = await TimeEntries._list(conditions, paginationOptions);

    // Enrichir
    const enrichedEntries: any[] = [];
    const statistics = {
      total: 0,
      by_type: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
      with_corrections: 0,
      with_anomalies: 0,
    };

    if (entries) {
      await Promise.all(
        entries.map(async (entry) => {
          statistics.total++;

          const type = entry.getPointageType()!;
          const status = entry.getPointageStatus()!;

          statistics.by_type[type] = (statistics.by_type[type] || 0) + 1;
          statistics.by_status[status] = (statistics.by_status[status] || 0) + 1;

          if (entry.getCorrectionReason()) statistics.with_corrections++;
          if (await entry.hasAnomalies()) statistics.with_anomalies++;

          enrichedEntries.push(await entry.toJSON(responseValue.FULL));
        }),
      );
    }

    return R.handleSuccess(res, {
      message: 'Time entries retrieved successfully',
      data: {
        pagination: {
          offset: paginationOptions.offset || 0,
          limit: paginationOptions.limit || enrichedEntries.length,
          count: enrichedEntries.length,
        },
        statistics,
        entries: enrichedEntries,
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'time_entries_retrieval_failed',
      message: error.message || 'Failed to retrieve time entries',
    });
  }
});

// === STATISTIQUES D'ÉQUIPE ===
// 📊 Comprehensive team statistics including hours worked, delays, and attendance rates
router.get('/attendance/statistics', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager, site, start_date, end_date } = req.query;

    // Dates par défaut: mois en cours
    const startDate = start_date
      ? new Date(start_date as string)
      : (() => {
          const date = new Date();
          date.setDate(1); // Premier jour du mois
          date.setHours(0, 0, 0, 0);
          return date;
        })();

    const endDate = end_date ? new Date(end_date as string) : new Date();

    const conditions: Record<string, any> = {
      session_start_at: {
        [Op.between]: [startDate, endDate],
      },
    };

    let managerObj: User | null = null;
    let siteObj: Site | null = null;

    // Filtre par manager
    if (manager) {
      managerObj = await User._load(String(manager), true);
      if (managerObj) {
        const userRolesSub = await UserRole._listByAssignedBy(managerObj.getId()!);
        if (userRolesSub && userRolesSub.length > 0) {
          const subordinateIds = userRolesSub
            .map((ur) => ur.getUser())
            .filter((id): id is number => id !== undefined);
          conditions.user = { [Op.in]: subordinateIds };
        }
      }
    }

    // Filtre par site
    if (site) {
      siteObj = await Site._load(String(site), true);
      if (siteObj) conditions.site = siteObj.getId();
    }

    // Récupérer sessions et entries
    const sessions = await WorkSessions._list(conditions);
    const timeEntriesConditions = { ...conditions };
    delete timeEntriesConditions.session_start_at;
    timeEntriesConditions.clocked_at = conditions.session_start_at;
    const timeEntries = await TimeEntries._list(timeEntriesConditions);

    // Calculer statistiques
    let totalHours = 0;
    let totalPauseHours = 0;
    let lateArrivals = 0;
    let earlyDepartures = 0;
    const employeeStats: Record<number, any> = {};

    if (sessions) {
      sessions.forEach((session) => {
        const userId = session.getUser()!;

        if (!employeeStats[userId]) {
          employeeStats[userId] = {
            sessions_count: 0,
            total_hours: 0,
            late_count: 0,
          };
        }

        employeeStats[userId].sessions_count++;

        // Heures travaillées
        if (session.getTotalWorkDuration()) {
          const matches = session
            .getTotalWorkDuration()!
            .match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
          if (matches) {
            const hours = parseInt(matches[1]) || 0;
            const minutes = parseInt(matches[2]) || 0;
            const sessionHours = hours + minutes / 60;
            totalHours += sessionHours;
            employeeStats[userId].total_hours += sessionHours;
          }
        }

        // Pauses
        if (session.getTotalPauseDuration()) {
          const matches = session
            .getTotalPauseDuration()!
            .match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
          if (matches) {
            const hours = parseInt(matches[1]) || 0;
            const minutes = parseInt(matches[2]) || 0;
            totalPauseHours += hours + minutes / 60;
          }
        }
      });
    }

    const totalEmployees = Object.keys(employeeStats).length;
    const averageHoursPerEmployee =
      totalEmployees > 0 ? (totalHours / totalEmployees).toFixed(2) : '0.00';
    const attendanceRate = sessions
      ? ((sessions.length / (totalEmployees * 22)) * 100).toFixed(1)
      : '0.0'; // 22 jours ouvrés

    return R.handleSuccess(res, {
      message: 'Team statistics retrieved successfully',
      data: {
        period: {
          start: startDate,
          end: endDate,
          days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        },
        filters: {
          manager: managerObj ? managerObj.toJSON() : null,
          site: siteObj ? await siteObj.toJSON(responseValue.MINIMAL) : null,
        },
        overview: {
          total_employees: totalEmployees,
          total_sessions: sessions?.length || 0,
          total_hours_worked: totalHours.toFixed(2),
          total_pause_hours: totalPauseHours.toFixed(2),
          average_hours_per_employee: averageHoursPerEmployee,
          attendance_rate: `${attendanceRate}%`,
        },
        attendance: {
          late_arrivals: lateArrivals,
          early_departures: earlyDepartures,
          on_time_rate: '0.0%', // À calculer
        },
        time_entries_stats: {
          total_entries: timeEntries?.length || 0,
          pending_validation: 0, // À calculer
          with_anomalies: 0, // À calculer
        },
        employee_breakdown: Object.entries(employeeStats).map(([userId, stats]) => ({
          user_id: Number(userId),
          ...stats,
        })),
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'statistics_retrieval_failed',
      message: error.message || 'Failed to retrieve statistics',
    });
  }
});

export default router;
