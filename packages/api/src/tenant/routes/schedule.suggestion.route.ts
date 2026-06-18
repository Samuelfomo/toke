import { Request, Response, Router } from 'express';
import { HttpStatus, paginationSchema, SAFamily, UsersValidationUtils } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import ScheduleSuggestion from '../class/ScheduleSuggestion.js';
import ScheduleSuggestionItem from '../class/ScheduleSuggestionItem.js';
import ScheduleAssignments from '../class/ScheduleAssignments.js';
import SessionTemplate from '../class/SessionTemplates.js';
import User from '../class/User.js';
import OrgHierarchy from '../class/OrgHierarchy.js';
import {
  generateSuggestion,
  HistoricalAssignment,
  HISTORY_WEEKS,
  TargetEmployee,
} from '../../utils/suggestion.engine.js';
import { responseValue } from '../../utils/response.model.js';
import Groups from '../class/Groups.js';

const router = Router();

// ── Codes et messages d'erreur locaux ────────────────────────────────────────

const CODES = {
  INVALID_GUID: 'SUGGESTION_INVALID_GUID',
  INVALID_PAYLOAD: 'SUGGESTION_INVALID_PAYLOAD',
  NOT_FOUND: 'SUGGESTION_NOT_FOUND',
  ITEM_NOT_FOUND: 'SUGGESTION_ITEM_NOT_FOUND',
  MANAGER_NOT_FOUND: 'SUGGESTION_MANAGER_NOT_FOUND',
  NOT_A_MANAGER: 'SUGGESTION_NOT_A_MANAGER',
  ALREADY_RESOLVED: 'SUGGESTION_ALREADY_RESOLVED',
  NO_EMPLOYEES: 'SUGGESTION_NO_EMPLOYEES',
  GENERATION_FAILED: 'SUGGESTION_GENERATION_FAILED',
  APPROVAL_FAILED: 'SUGGESTION_APPROVAL_FAILED',
  REJECTION_FAILED: 'SUGGESTION_REJECTION_FAILED',
  PATCH_FAILED: 'SUGGESTION_PATCH_FAILED',
  LISTING_FAILED: 'SUGGESTION_LISTING_FAILED',
  DELETION_FAILED: 'SUGGESTION_DELETION_FAILED',
} as const;

const ERRORS = {
  INVALID_GUID: 'Invalid GUID format.',
  INVALID_PAYLOAD: 'Invalid or missing required fields in the request body.',
  NOT_FOUND: 'Suggestion not found.',
  ITEM_NOT_FOUND: 'Suggestion item not found.',
  MANAGER_NOT_FOUND: 'Manager not found.',
  NOT_A_MANAGER: 'The specified user does not have manager privileges.',
  ALREADY_RESOLVED: 'This suggestion has already been approved or rejected.',
  NO_EMPLOYEES: 'No employees found in scope to generate a suggestion.',
  GENERATION_FAILED: 'Suggestion generation failed.',
  APPROVAL_FAILED: 'Suggestion approval failed.',
  REJECTION_FAILED: 'Suggestion rejection failed.',
  PATCH_FAILED: 'Suggestion item patch failed.',
  LISTING_FAILED: 'Failed to list suggestions.',
  DELETION_FAILED: 'Failed to delete suggestion.',
} as const;

// ── Helper : valide une date YYYY-MM-DD ───────────────────────────────────────

function isValidDate(v: any): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/schedule-suggestions/:manager/generate
//
// Génère une nouvelle suggestion (status: draft) pour un manager.
// Body : { period_from, period_to, employee_guids?: string[] }
//   employee_guids : liste des GUIDs des employés ciblés.
//                   Si absent → tous les employés de l'équipe du manager.
// ─────────────────────────────────────────────────────────────────────────────

router.post('/:manager/generate', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { manager: managerGuid } = req.params;
    const { period_from, period_to, employee_guids } = req.body ?? {};

    // ── Validation ──────────────────────────────────────────────────────────
    if (!UsersValidationUtils.validateGuid(managerGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: CODES.INVALID_GUID,
        message: ERRORS.INVALID_GUID,
      });
    }
    if (!isValidDate(period_from) || !isValidDate(period_to) || period_from > period_to) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: CODES.INVALID_PAYLOAD,
        message:
          'period_from and period_to are required (YYYY-MM-DD) and period_from must be <= period_to.',
      });
    }

    // ── Manager ─────────────────────────────────────────────────────────────
    const managerObj = await User._load(managerGuid, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.MANAGER_NOT_FOUND,
        message: ERRORS.MANAGER_NOT_FOUND,
      });
    }
    const isManager = await OrgHierarchy.hasManagerRole(managerObj.getId()!);
    if (!isManager) {
      return R.handleError(res, HttpStatus.FORBIDDEN, {
        code: CODES.NOT_A_MANAGER,
        message: ERRORS.NOT_A_MANAGER,
      });
    }

    // // ── Employés ciblés ─────────────────────────────────────────────────────
    // // Si employee_guids fourni → valider et charger uniquement ceux-là
    // // Sinon → tous les employés ayant au moins un schedule assignment créé par ce manager
    // let targetEmployees: TargetEmployee[] = [];
    //
    // if (Array.isArray(employee_guids) && employee_guids.length > 0) {
    //   for (const guid of employee_guids) {
    //     if (!UsersValidationUtils.validateGuid(guid)) continue;
    //     const u = await User._load(guid, true);
    //     if (u) {
    //       targetEmployees.push({
    //         guid: u.getGuid()!,
    //         name: u.getFullName(),
    //         code: (u as any).getEmployeeCode?.() ?? '',
    //       });
    //     }
    //   }
    // }
    // else {
    //   // Charger tous les employés ayant un schedule assignment family:'user'
    //   // créé par ce manager (scope équipe)
    //   const allAssignments = await ScheduleAssignments._listByCreatedBy(managerObj.getId()!);
    //   const seenGuids = new Set<string>();
    //   if (allAssignments) {
    //     for (const a of allAssignments) {
    //       if (a.getFamily() === SAFamily.USER) {
    //         const relatedGuid = a.getRelated();
    //         if (relatedGuid && !seenGuids.has(relatedGuid)) {
    //           seenGuids.add(relatedGuid);
    //           const u = await User._load(relatedGuid, true);
    //           if (u) {
    //             targetEmployees.push({
    //               guid: u.getGuid()!,
    //               name: u.getFullName(),
    //               code: (u as any).getEmployeeCode?.() ?? '',
    //             });
    //           }
    //         }
    //       }
    //     }
    //   }
    // }

    // ── Employés ciblés ─────────────────────────────────────────────────────
    // Source 1 : membres actuels de l'équipe (vérité RH)
    // Source 2 : employés ayant un historique créé par ce manager
    // Éligibles : intersection des deux sources
    // Si employee_guids fourni : filtrer dans l'intersection

    // Source 1 — équipe active (directs uniquement, sans sous-équipes)
    const teamResult = await OrgHierarchy.getAllTeamMembers(managerObj.getId()!, false);
    const activeTeamGuids = new Set<string>(
      teamResult.all_employees_flat.map((u) => u.getGuid()).filter((g): g is string => !!g),
    );

    if (activeTeamGuids.size === 0) {
      return R.handleError(res, HttpStatus.UNPROCESSABLE_ENTITY, {
        code: CODES.NO_EMPLOYEES,
        message: "Aucun employé actif dans l'équipe de ce manager.",
      });
    }

    // Source 2 — assignments créés par ce manager (directs ET via groupe)
    // Cas 1 : family:'user'  → l'employé est directement ciblé
    // Cas 2 : family:'group' → les membres ACTIFS du groupe héritent du planning
    const allAssignments = await ScheduleAssignments._listByCreatedBy(managerObj.getId()!);
    const assignedGuids = new Set<string>();

    if (allAssignments) {
      for (const a of allAssignments) {
        if (a.getFamily() === SAFamily.USER) {
          // Cas 1 — direct
          const g = a.getRelated();
          if (g) assignedGuids.add(g);
        } else if (a.getFamily() === SAFamily.GROUP) {
          // Cas 2 — via groupe : charger uniquement les membres actifs
          const groupGuid = a.getRelated();
          if (!groupGuid) continue;
          const group = await Groups._load(groupGuid, true);
          if (!group) continue;
          const activeMembers = await group.getDirectMembers(true); // activeOnly = true
          for (const member of activeMembers) {
            const memberGuid = member.getGuid();
            if (memberGuid) assignedGuids.add(memberGuid);
          }
        }
      }
    }

    // Intersection
    const eligibleGuids = [...activeTeamGuids].filter((g) => assignedGuids.has(g));

    if (eligibleGuids.length === 0) {
      return R.handleError(res, HttpStatus.UNPROCESSABLE_ENTITY, {
        code: CODES.NO_EMPLOYEES,
        message: "Aucun employé de l'équipe n'a encore de planning historique à analyser.",
      });
    }

    // Filtre optionnel par employee_guids
    const requestedGuids =
      Array.isArray(employee_guids) && employee_guids.length > 0
        ? new Set<string>(
            employee_guids.filter((g: string) => UsersValidationUtils.validateGuid(g)),
          )
        : null;

    const finalGuids = requestedGuids
      ? eligibleGuids.filter((g) => requestedGuids.has(g))
      : eligibleGuids;

    if (finalGuids.length === 0) {
      return R.handleError(res, HttpStatus.UNPROCESSABLE_ENTITY, {
        code: CODES.NO_EMPLOYEES,
        message: requestedGuids
          ? "Aucun des employés sélectionnés n'est éligible (pas dans l'équipe active ou sans historique de planning)."
          : ERRORS.NO_EMPLOYEES,
      });
    }

    // Construire les TargetEmployee
    const targetEmployees: TargetEmployee[] = [];
    for (const guid of finalGuids) {
      const u = await User._load(guid, true);
      if (!u) continue;
      targetEmployees.push({
        guid: u.getGuid()!,
        name: u.getFullName(),
        code: (u as any).getEmployeeCode?.() ?? '',
      });
    }

    if (targetEmployees.length === 0) {
      return R.handleError(res, HttpStatus.UNPROCESSABLE_ENTITY, {
        code: CODES.NO_EMPLOYEES,
        message: ERRORS.NO_EMPLOYEES,
      });
    }

    // ── Historique des assignments ───────────────────────────────────────────
    // Charger les N semaines précédant period_from pour tous les employés ciblés
    const historyFrom = new Date(period_from + 'T00:00:00');
    historyFrom.setDate(historyFrom.getDate() - HISTORY_WEEKS * 7);
    const historyFromStr = historyFrom.toISOString().split('T')[0];

    const historicalRaw = await ScheduleAssignments._listByDateRange(historyFromStr, period_from);
    const historical: HistoricalAssignment[] = [];

    const targetGuids = new Set(targetEmployees.map((e) => e.guid));

    if (historicalRaw) {
      for (const a of historicalRaw) {
        const snapshot = a.getSessionTemplate();
        if (!snapshot?.definition) continue;

        if (a.getFamily() === SAFamily.USER) {
          // Cas 1 — assignment direct : ajouter si l'employé est ciblé
          const relatedGuid = a.getRelated();
          if (!relatedGuid || !targetGuids.has(relatedGuid)) continue;

          historical.push({
            userGuid: relatedGuid,
            startDate: a.getStartDate()!,
            endDate: a.getEndDate() ?? '2099-12-31',
            templateGuid: snapshot.guid,
            templateName: snapshot.name,
            definition: snapshot.definition,
          });
        } else if (a.getFamily() === SAFamily.GROUP) {
          // Cas 2 — assignment groupe : propager à chaque membre actif ciblé
          const groupGuid = a.getRelated();
          if (!groupGuid) continue;
          const group = await Groups._load(groupGuid, true);
          if (!group) continue;
          const activeMembers = await group.getDirectMembers(true);

          for (const member of activeMembers) {
            const memberGuid = member.getGuid();
            if (!memberGuid || !targetGuids.has(memberGuid)) continue;

            historical.push({
              userGuid: memberGuid,
              startDate: a.getStartDate()!,
              endDate: a.getEndDate() ?? '2099-12-31',
              templateGuid: snapshot.guid,
              templateName: snapshot.name,
              definition: snapshot.definition,
            });
          }
        }
      }
    }

    // ── Moteur de génération ─────────────────────────────────────────────────
    const engineResult = generateSuggestion(
      targetEmployees,
      historical,
      period_from,
      period_to,
      HISTORY_WEEKS,
    );

    // ── Persistance ──────────────────────────────────────────────────────────
    const suggestion = new ScheduleSuggestion()
      .setTenant(managerObj.getTenant?.() ?? '')
      .setManager(managerObj.getId()!)
      .setPeriodFrom(period_from)
      .setPeriodTo(period_to)
      .setHistoryWeeks(HISTORY_WEEKS)
      .setConformityScore(engineResult.conformityScore);

    await suggestion.save();

    // Persister les items
    for (const empResult of engineResult.items) {
      const userObj = await User._load(empResult.userGuid, true);
      if (!userObj) continue;

      const item = new ScheduleSuggestionItem()
        .setSuggestion(suggestion.getId()!)
        .setUser(userObj.getId()!)
        .setSchedule(empResult.schedule)
        .setReasons(empResult.reasons);

      await item.save();
    }

    return R.handleCreated(res, {
      suggestion: await suggestion.toJSON(responseValue.FULL, true),
      conformity_score: engineResult.conformityScore,
      employee_count: targetEmployees.length,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: CODES.GENERATION_FAILED,
      message: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/schedule-suggestions/:manager/list
//
// Liste les suggestions d'un manager (sans les items pour la performance).
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:manager/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager: managerGuid } = req.params;

    const paginationData = paginationSchema.parse(req.query);

    if (!UsersValidationUtils.validateGuid(managerGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: CODES.INVALID_GUID,
        message: ERRORS.INVALID_GUID,
      });
    }

    const managerObj = await User._load(managerGuid, true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.MANAGER_NOT_FOUND,
        message: ERRORS.MANAGER_NOT_FOUND,
      });
    }

    const suggestions = await ScheduleSuggestion._listByManager(
      managerObj.getId()!,
      paginationData,
    );

    return R.handleSuccess(res, {
      suggestions: {
        count: suggestions?.length ?? 0,
        limit: paginationData.limit,
        offset: paginationData.offset,
        items: suggestions
          ? await Promise.all(suggestions.map((s) => s.toJSON(responseValue.FULL, false)))
          : [],
      },
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/schedule-suggestions/:guid
//
// Charge une suggestion complète avec ses items (pour la prévisualisation).
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!UsersValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: CODES.INVALID_GUID,
        message: ERRORS.INVALID_GUID,
      });
    }

    const suggestion = await ScheduleSuggestion._load(guid as string);
    if (!suggestion) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      suggestion: await suggestion.toJSON(responseValue.FULL, true),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/schedule-suggestions/:guid/item/:itemGuid
//
// Modifie une cellule (un jour) d'un item de suggestion.
// Body : { iso: 'YYYY-MM-DD', template_guid: string|null }
// ─────────────────────────────────────────────────────────────────────────────

router.patch('/:guid/item/:itemGuid', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const { guid, itemGuid } = req.params;
    const { iso, template_guid } = req.body ?? {};

    if (!UsersValidationUtils.validateGuid(guid) || !UsersValidationUtils.validateGuid(itemGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: CODES.INVALID_GUID,
        message: ERRORS.INVALID_GUID,
      });
    }
    if (!isValidDate(iso)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: CODES.INVALID_PAYLOAD,
        message: 'iso must be a valid date (YYYY-MM-DD).',
      });
    }
    if (template_guid !== null && !UsersValidationUtils.validateGuid(template_guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: CODES.INVALID_PAYLOAD,
        message: 'template_guid must be a valid GUID or null.',
      });
    }

    // Vérifier que la suggestion existe et est encore en draft
    const suggestion = await ScheduleSuggestion._load(guid as string);
    if (!suggestion) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: ERRORS.NOT_FOUND,
      });
    }
    if (!suggestion.isDraft()) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: CODES.ALREADY_RESOLVED,
        message: ERRORS.ALREADY_RESOLVED,
      });
    }

    // Charger l'item
    const item = await ScheduleSuggestionItem._load(itemGuid as string);
    if (!item) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.ITEM_NOT_FOUND,
        message: ERRORS.ITEM_NOT_FOUND,
      });
    }

    // Construire la raison manuelle
    let reason: Record<string, any> | null = null;
    if (template_guid) {
      const tpl = await SessionTemplate._load(template_guid, true);
      reason = {
        templateGuid: template_guid,
        templateName: tpl?.getName() ?? '—',
        confidence: 100,
        factors: ['Modifié manuellement par le manager'],
      };
    } else {
      reason = {
        templateGuid: null,
        templateName: 'Repos',
        confidence: 100,
        factors: ['Repos défini manuellement par le manager'],
      };
    }

    await item.patchScheduleDay(iso, template_guid, reason);

    return R.handleSuccess(res, {
      item: await item.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: CODES.PATCH_FAILED,
      message: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/schedule-suggestions/:guid/approve
//
// Valide la suggestion → bulk-create des ScheduleAssignments.
// Un assignment par employé par bloc continu de même template.
// ─────────────────────────────────────────────────────────────────────────────

router.post('/:guid/approve', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!UsersValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: CODES.INVALID_GUID,
        message: ERRORS.INVALID_GUID,
      });
    }

    const suggestion = await ScheduleSuggestion._load(guid as string);
    if (!suggestion) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: ERRORS.NOT_FOUND,
      });
    }
    if (!suggestion.isDraft()) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: CODES.ALREADY_RESOLVED,
        message: ERRORS.ALREADY_RESOLVED,
      });
    }

    const items = await suggestion.getItems();
    const managerId = suggestion.getManagerId()!;
    let createdCount = 0;

    for (const item of items) {
      const schedule = item.getSchedule() ?? {};
      const userObj = await item.getUserObj();
      if (!userObj) continue;

      // Regrouper les jours consécutifs de même template en blocs
      // { templateGuid → [{ from, to }] }
      const sortedDates = Object.keys(schedule).sort();
      const blocks: { templateGuid: string; from: string; to: string }[] = [];

      let currentGuid: string | null = null;
      let blockStart: string | null = null;
      let blockEnd: string | null = null;

      for (const iso of sortedDates) {
        const tGuid = schedule[iso]; // string | null

        if (tGuid === null) {
          // Repos — fermer le bloc en cours si existant
          if (currentGuid && blockStart && blockEnd) {
            blocks.push({ templateGuid: currentGuid, from: blockStart, to: blockEnd });
          }
          currentGuid = null;
          blockStart = null;
          blockEnd = null;
          continue;
        }

        if (tGuid === currentGuid) {
          // Même template → étendre le bloc
          blockEnd = iso;
        } else {
          // Nouveau template → fermer l'ancien bloc
          if (currentGuid && blockStart && blockEnd) {
            blocks.push({ templateGuid: currentGuid, from: blockStart, to: blockEnd });
          }
          currentGuid = tGuid;
          blockStart = iso;
          blockEnd = iso;
        }
      }
      // Fermer le dernier bloc
      if (currentGuid && blockStart && blockEnd) {
        blocks.push({ templateGuid: currentGuid, from: blockStart, to: blockEnd });
      }

      // Créer un ScheduleAssignment par bloc
      for (const block of blocks) {
        const tpl = await SessionTemplate._load(block.templateGuid, true);
        if (!tpl) continue;

        // Vérifier s'il existe déjà un assignment actif pour cet employé
        // chevauchant la période du bloc
        const existing = await ScheduleAssignments._listForRelatedOnPeriod(
          SAFamily.USER,
          userObj.getGuid()!,
          block.from,
          block.to,
        );

        if (existing && existing.length > 0) {
          // Désactiver les assignments existants qui chevauchent avant de créer
          // (le nouveau planning remplace l'ancien sur cette période)
          for (const ex of existing) {
            ex.setActive(false);
          }
        }

        const snapshot = await ScheduleAssignments.createTemplateSnapshot(tpl);

        const assignment = new ScheduleAssignments();
        assignment
          .setFamily(SAFamily.USER)
          .setRelated(userObj.getGuid()!)
          .setSessionTemplate(snapshot)
          .setStartDate(block.from)
          .setEndDate(block.to)
          .setCreatedBy(managerId)
          .setActive(true)
          .setReason(`Généré depuis suggestion ${guid}`);

        await assignment.save();
        createdCount++;
      }
    }

    // Marquer la suggestion comme approuvée
    await suggestion.approve();

    return R.handleSuccess(res, {
      suggestion: await suggestion.toJSON(responseValue.FULL, false),
      created_count: createdCount,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: CODES.APPROVAL_FAILED,
      message: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/schedule-suggestions/:guid/reject
//
// Rejette la suggestion — aucun assignment créé.
// ─────────────────────────────────────────────────────────────────────────────

router.post('/:guid/reject', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!UsersValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: CODES.INVALID_GUID,
        message: ERRORS.INVALID_GUID,
      });
    }

    const suggestion = await ScheduleSuggestion._load(guid as string);
    if (!suggestion) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: ERRORS.NOT_FOUND,
      });
    }
    if (!suggestion.isDraft()) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: CODES.ALREADY_RESOLVED,
        message: ERRORS.ALREADY_RESOLVED,
      });
    }

    await suggestion.reject();

    return R.handleSuccess(res, {
      suggestion: await suggestion.toJSON(responseValue.FULL, false),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: CODES.REJECTION_FAILED,
      message: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/schedule-suggestions/:guid
//
// Suppression douce d'une suggestion (et de ses items).
// ─────────────────────────────────────────────────────────────────────────────

router.delete('/:guid/item/:itemGuid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const { guid, itemGuid } = req.params;

    if (!UsersValidationUtils.validateGuid(guid) || !UsersValidationUtils.validateGuid(itemGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: CODES.INVALID_GUID,
        message: ERRORS.INVALID_GUID,
      });
    }

    // Vérifier que la suggestion existe et est encore en draft
    const suggestion = await ScheduleSuggestion._load(guid as string);
    if (!suggestion) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: ERRORS.NOT_FOUND,
      });
    }
    if (!suggestion.isDraft()) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: CODES.ALREADY_RESOLVED,
        message: ERRORS.ALREADY_RESOLVED,
      });
    }

    // Charger et supprimer l'item
    const item = await ScheduleSuggestionItem._load(itemGuid as string);
    if (!item) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.ITEM_NOT_FOUND,
        message: ERRORS.ITEM_NOT_FOUND,
      });
    }

    const deleted = await item.softDelete();
    if (!deleted) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'SUGGESTION_ITEM_DELETION_FAILED',
        message: 'Failed to delete suggestion item.',
      });
    }

    return R.handleSuccess(res, { deleted: true, item_guid: itemGuid });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'SUGGESTION_ITEM_DELETION_FAILED',
      message: error.message,
    });
  }
});

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!UsersValidationUtils.validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: CODES.INVALID_GUID,
        message: ERRORS.INVALID_GUID,
      });
    }

    const suggestion = await ScheduleSuggestion._load(guid as string);
    if (!suggestion) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: ERRORS.NOT_FOUND,
      });
    }

    // Supprimer les items d'abord
    const items = await suggestion.getItems();
    for (const item of items) {
      await item.softDelete();
    }

    await suggestion.softDelete();

    return R.handleSuccess(res, { deleted: true, guid });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: CODES.DELETION_FAILED,
      message: error.message,
    });
  }
});
export default router;
