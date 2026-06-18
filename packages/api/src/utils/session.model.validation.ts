import { SESSION_TEMPLATE_CODES, SESSION_TEMPLATE_ERRORS } from '@toke/shared';

import SessionModel from '../tenant/class/SessionModel.js';

// ─── Helper : validation croisée SessionModel ↔ SessionTemplate definition ──

export function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h! * 60 + m!;
}

export function validateAgainstSessionModel(
  definition: Record<string, any>,
  forRotation: boolean,
  sessionModelObj: InstanceType<typeof SessionModel>,
): { valid: true } | { valid: false; code: string; message: string } {
  const workdays = sessionModelObj.getWorkday() ?? [];

  // 1. Les jours actifs du template doivent être dans les workdays du SessionModel
  const activeDays = Object.entries(definition)
    .filter(([, value]) => value !== null && Array.isArray(value) && value.length > 0)
    .map(([day]) => day);

  const forbiddenDays = activeDays.filter((day) => !workdays.includes(day));
  if (forbiddenDays.length > 0) {
    return {
      valid: false,
      code: SESSION_TEMPLATE_CODES.DEFINITION_INVALID,
      message: `The following days are not allowed by the session model workday policy: ${forbiddenDays.join(', ')}`,
    };
  }

  // 2. Si for_rotation=true, le SessionModel doit avoir rotation_allowed=true
  if (forRotation && !sessionModelObj.isRotationAllowed()) {
    return {
      valid: false,
      code: SESSION_TEMPLATE_CODES.SESSION_MODEL_CONFLICT,
      message: SESSION_TEMPLATE_ERRORS.SESSION_MODEL_ROTATION_NOT_ALLOWED,
    };
  }

  // 3. Valider les contraintes de temps du SessionModel sur chaque bloc de chaque jour actif
  const minWorkingTime = sessionModelObj.getMinWorkingTime() ?? 0;
  const maxWorkingTime = sessionModelObj.getMaxWorkingTime() ?? 1440;
  const normalSessionTime = sessionModelObj.getNormalSessionTime();
  const allowedTolerance = sessionModelObj.getAllowedTolerance() ?? 0;
  const pauseAllowed = sessionModelObj.isPauseAllowed() ?? false;
  const pauseDuration = sessionModelObj.getPauseDuration();
  const pauseCount = sessionModelObj.getPauseCount();
  const extraAllowed = sessionModelObj.isExtraAllowed() ?? false;
  const extraMax = sessionModelObj.getExtraMax() ?? 0;
  const absoluteMax = maxWorkingTime + (extraAllowed ? extraMax : 0);

  for (const [day, blocks] of Object.entries(definition)) {
    // Jours fériés (null) ou repos ([]) → pas de contrainte de temps à vérifier
    if (blocks === null || !Array.isArray(blocks) || blocks.length === 0) continue;

    for (const block of blocks) {
      const workStart = timeToMin(block.work[0]);
      const workEnd = timeToMin(block.work[1]);
      const blockWorkMinutes = workEnd - workStart;

      // 3a. Le bloc comporte une pause : vérifier que le SessionModel l'autorise
      if (block.pause !== null && block.pause !== undefined) {
        if (!pauseAllowed) {
          return {
            valid: false,
            code: SESSION_TEMPLATE_CODES.SESSION_MODEL_CONFLICT,
            message: `Day ${day}: block defines a pause but the session model does not allow pauses`,
          };
        }

        const pauseStart = timeToMin(block.pause[0]);
        const pauseEnd = timeToMin(block.pause[1]);
        const blockPauseMinutes = pauseEnd - pauseStart;

        // 3b. La durée de la pause du bloc ne doit pas dépasser la pause_duration autorisée
        if (pauseDuration !== undefined && blockPauseMinutes > pauseDuration) {
          return {
            valid: false,
            code: SESSION_TEMPLATE_CODES.SESSION_MODEL_CONFLICT,
            message: `Day ${day}: block pause duration (${blockPauseMinutes} min) exceeds session model allowed pause duration (${pauseDuration} min)`,
          };
        }
      }

      // 3c. Vérifier que le nombre de blocs par jour ne dépasse pas pause_count
      // (chaque bloc supplémentaire implique une pause supplémentaire)
      if (pauseAllowed && pauseCount !== undefined && blocks.length > pauseCount) {
        return {
          valid: false,
          code: SESSION_TEMPLATE_CODES.SESSION_MODEL_CONFLICT,
          message: `Day ${day}: number of work blocks (${blocks.length}) exceeds session model allowed pause count (${pauseCount})`,
        };
      }

      // 3d. La durée brute du bloc ne doit pas dépasser le maximum absolu autorisé
      if (blockWorkMinutes > absoluteMax) {
        return {
          valid: false,
          code: SESSION_TEMPLATE_CODES.SESSION_MODEL_CONFLICT,
          message: `Day ${day}: block work duration (${blockWorkMinutes} min) exceeds session model absolute maximum (${absoluteMax} min)`,
        };
      }

      // 3e. La durée nette du bloc (travail - pause) doit respecter min_working_time (avec tolérance)
      const pauseMinutes =
        block.pause !== null && block.pause !== undefined
          ? timeToMin(block.pause[1]) - timeToMin(block.pause[0])
          : 0;
      const blockNetMinutes = blockWorkMinutes - pauseMinutes;

      if (blockNetMinutes < minWorkingTime - allowedTolerance) {
        return {
          valid: false,
          code: SESSION_TEMPLATE_CODES.SESSION_MODEL_CONFLICT,
          message: `Day ${day}: block net work time (${blockNetMinutes} min) is below session model minimum (${minWorkingTime} min) even with tolerance (${allowedTolerance} min)`,
        };
      }

      // 3f. La durée nette ne doit pas dépasser le maximum absolu
      if (blockNetMinutes > absoluteMax) {
        return {
          valid: false,
          code: SESSION_TEMPLATE_CODES.SESSION_MODEL_CONFLICT,
          message: `Day ${day}: block net work time (${blockNetMinutes} min) exceeds session model absolute maximum (${absoluteMax} min)`,
        };
      }

      // 3g. Si normal_session_time défini, avertir si le bloc dépasse max (hors extra)
      if (normalSessionTime !== undefined && blockNetMinutes > maxWorkingTime && !extraAllowed) {
        return {
          valid: false,
          code: SESSION_TEMPLATE_CODES.SESSION_MODEL_CONFLICT,
          message: `Day ${day}: block net work time (${blockNetMinutes} min) exceeds session model maximum (${maxWorkingTime} min) and extra hours are not allowed`,
        };
      }
    }
  }

  return { valid: true };
}
