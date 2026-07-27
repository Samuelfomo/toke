import { Request, Response, Router } from 'express';
import { HttpStatus, paginationSchema, UsersValidationUtils } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import ScheduleSuggestion from '../class/ScheduleSuggestion.js';
import ScheduleSuggestionItem from '../class/ScheduleSuggestionItem.js';
import SessionTemplate from '../class/SessionTemplates.js';
import User from '../class/User.js';
import {
  generateConfiguredSuggestion,
  SuggestionGenerationError,
} from '../../utils/schedule.suggestion.generation.service.js';
import { responseValue } from '../../utils/response.model.js';
import {
  approveScheduleSuggestion,
  SuggestionApprovalError,
} from '../../tools/schedule.suggestion.approval.service.js';

const router = Router();

// ── Codes et messages d'erreur locaux ────────────────────────────────────────

const CODES = {
  INVALID_GUID: 'SUGGESTION_INVALID_GUID',
  INVALID_PAYLOAD: 'SUGGESTION_INVALID_PAYLOAD',
  NOT_FOUND: 'SUGGESTION_NOT_FOUND',
  ITEM_NOT_FOUND: 'SUGGESTION_ITEM_NOT_FOUND',
  TEMPLATE_NOT_FOUND: 'SUGGESTION_TEMPLATE_NOT_FOUND',
  TEMPLATE_DAY_INVALID: 'SUGGESTION_TEMPLATE_DAY_INVALID',
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
    const { manager } = req.params;
    const { period_from, period_to } = req.body ?? {};

    if (!isValidDate(period_from) || !isValidDate(period_to) || period_from > period_to) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: CODES.INVALID_PAYLOAD,
        message:
          'period_from and period_to are required (YYYY-MM-DD) and period_from must be <= period_to.',
      });
    }

    const result = await generateConfiguredSuggestion(manager as string, period_from, period_to);

    return R.handleCreated(res, {
      suggestion: await result.suggestion.toJSON(responseValue.FULL, true),
      conformity_score: result.engineResult.conformityScore,
      planning_quality_score: result.engineResult.conformityScore,
      employee_count: result.employeeCount,
      configuration: {
        guid: result.configGuid,
        version: result.configVersion,
      },
      diagnostics: result.engineResult.diagnostics,
    });
  } catch (error: any) {
    if (error instanceof SuggestionGenerationError) {
      return R.handleError(res, error.status as any, {
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }

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

    // Vér R.handleError(res, HttpStatus.BAD_REQUEST, {
    // code: CODESifier que la suggestion existe
    const suggestion = await ScheduleSuggestion._load(guid as string);

    if (!suggestion) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.NOT_FOUND,
        message: ERRORS.NOT_FOUND,
      });
    }

    // Une suggestion résolue ne peut plus être modifiée
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

    // L'item doit obligatoirement appartenir à la suggestion demandée
    if (item.getSuggestion() !== suggestion.getId()) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: CODES.ITEM_NOT_FOUND,
        message: ERRORS.ITEM_NOT_FOUND,
      });
    }

    // La date modifiée doit appartenir à la période de la suggestion
    if (iso < suggestion.getPeriodFrom()! || iso > suggestion.getPeriodTo()!) {
      return R.handleError(res, HttpStatus.UNPROCESSABLE_ENTITY, {
        code: CODES.INVALID_PAYLOAD,
        message: 'The modified date is outside the suggestion period.',
      });
    }

    let reason: Record<string, any>;

    if (template_guid !== null) {
      const tpl = await SessionTemplate._load(template_guid, true);

      // Le template doit exister et être encore courant
      if (!tpl || !tpl.isCurrent()) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: CODES.TEMPLATE_NOT_FOUND,
          message: 'Session template not found or no longer current.',
        });
      }

      // Vérifier que le template contient des blocs pour le jour modifié
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const day = days[new Date(`${iso}T00:00:00.000Z`).getUTCDay()]!;

      const blocks = tpl.getDefinition()?.[day];

      if (!Array.isArray(blocks) || blocks.length === 0) {
        return R.handleError(res, HttpStatus.UNPROCESSABLE_ENTITY, {
          code: CODES.TEMPLATE_DAY_INVALID,
          message: `The selected template contains no work block for ${day}.`,
        });
      }

      reason = {
        source: 'MANUAL',
        templateGuid: template_guid,
        templateName: tpl.getName() ?? '—',
        confidence: 100,
        factors: ['Modifié manuellement par le manager'],
      };
    } else {
      reason = {
        source: 'MANUAL',
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

    const result = await approveScheduleSuggestion(guid as string);

    return R.handleSuccess(res, {
      message: 'Schedule suggestion approved successfully.',
      suggestion_guid: result.suggestionGuid,
      created_count: result.createdCount,
      deactivated_count: result.deactivatedCount,
      preserved_fragment_count: result.preservedFragmentCount,
      employee_count: result.employeeCount,
    });
  } catch (error: any) {
    if (error instanceof SuggestionApprovalError) {
      return R.handleError(res, error.status as any, {
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }

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
