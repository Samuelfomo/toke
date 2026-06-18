// /**
//  * GET /api/schedule-assignments/:guid/pdf
//  * Génère et retourne le PDF d'une assignation horaire.
//  */
// import { Request, Response, Router } from 'express';
// import {
//   HttpStatus,
//   SCHEDULE_ASSIGNMENTS_CODES,
//   SCHEDULE_ASSIGNMENTS_ERRORS,
//   ScheduleAssignmentsValidationUtils,
// } from '@toke/shared';
//
// import SessionTemplate from '../class/SessionTemplates';
// import R from '../../tools/response';
// import ScheduleAssignments from '../class/ScheduleAssignments.js';
// import Ensure from '../../middle/ensured-routes.js';
// import User from '../class/User.js';
// import Groups from '../class/Groups.js';
// import { generateScheduleAssignmentPdf } from '../../tools/pdf/service.js';
//
// const router = Router();
//
// router.get('/:guid/pdf', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const { guid } = req.params;
//
//     if (!ScheduleAssignmentsValidationUtils.validateGuid(guid)) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: SCHEDULE_ASSIGNMENTS_CODES.INVALID_GUID,
//         message: SCHEDULE_ASSIGNMENTS_ERRORS.GUID_INVALID,
//       });
//     }
//
//     const assignment = await ScheduleAssignments._load(guid, true);
//     if (!assignment) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: SCHEDULE_ASSIGNMENTS_CODES.SCHEDULE_ASSIGNMENTS_NOT_FOUND,
//         message: SCHEDULE_ASSIGNMENTS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     const relatedObj = await assignment.getRelatedObj();
//     const createdByObj = await assignment.getCreatedByObj();
//     const template = SessionTemplate.toObject(assignment.getSessionTemplate());
//
//     // Construire la cible selon la famille
//     let related: any = null;
//     if (relatedObj) {
//       if (assignment.isForUser()) {
//         const u = relatedObj as User;
//         related = {
//           name: u.getFullName(),
//           guid: u.getGuid(),
//           employee_code: (u as any).getEmployeeCode?.() ?? undefined,
//           department: (u as any).getDepartment?.() ?? undefined,
//           job_title: (u as any).getJobTitle?.() ?? undefined,
//         };
//       } else {
//         const g = relatedObj as Groups;
//         related = {
//           name: (g as any).getName?.() ?? 'Groupe',
//           guid: (g as any).getGuid?.() ?? undefined,
//         };
//       }
//     }
//
//     const pdfData = {
//       guid: assignment.getGuid()!,
//       family: assignment.getFamily()!,
//       start_date: assignment.getStartDate()!,
//       end_date: assignment.getEndDate() ?? null,
//       active: assignment.isActive()!,
//       reason: assignment.getReason() ?? null,
//       created_at: assignment.getCreatedAt(),
//       tenant: assignment.getTenant(),
//       related,
//       session_template: template
//         ? {
//             name: template.getName() ?? '—',
//             guid: template.getGuid() ?? undefined,
//             version: template.getVersion() ?? undefined,
//             definition: template.getDefinition() ?? undefined,
//             session_model: template.getSessionModel()
//               ? { name: (template.getSessionModel() as any)?.name ?? undefined }
//               : null,
//           }
//         : null,
//       created_by: createdByObj
//         ? { name: createdByObj.getFullName(), guid: createdByObj.getGuid() }
//         : null,
//     };
//
//     generateScheduleAssignmentPdf(pdfData, res);
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: SCHEDULE_ASSIGNMENTS_CODES.RETRIEVAL_FAILED,
//       message: error.message,
//     });
//   }
// });
