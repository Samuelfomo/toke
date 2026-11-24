import { UsersValidationUtils } from '@toke/shared';

import type { EngineTemplate, PlanningEmployeeInput } from './suggestion.engine.js';

export interface FixedAlternationPolicy {
  enabled: boolean;
  employee_guids: [string, string];
  template_guids: [string, string];
  anchor_date: string;
  shift_cadence_days: number;
  limited_service_template_guid?: string;
  weekend_rest: 'KEEP_PROFILE' | 'ALTERNATE_SAT_SUN';
}

export interface FixedAlternationSolverPolicy {
  employeeGuids: [string, string];
  templates: [EngineTemplate, EngineTemplate];
  anchorDate: string;
  shiftCadenceDays: number;
  limitedServiceTemplateGuid?: string;
  weekendRest: FixedAlternationPolicy['weekend_rest'];
}

export type FixedAlternationStatus =
  'PENDING_SOLVER_SUPPORT' | 'NOT_APPLICABLE' | 'INCOMPATIBLE_PROFILES';

export class FixedAlternationConfigError extends Error {
  readonly code = 'PLANNING_FIXED_ALTERNATION_INVALID';
}

function parsePair(value: unknown, field: string): [string, string] {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every((guid) => typeof guid === 'string' && UsersValidationUtils.validateGuid(guid)) ||
    value[0] === value[1]
  ) {
    throw new FixedAlternationConfigError(
      `${field} doit contenir deux identifiants valides et distincts.`,
    );
  }
  return [value[0], value[1]];
}

export function parseFixedAlternationPolicy(value: unknown): FixedAlternationPolicy | null {
  if (value === null) return null;
  if (typeof value !== 'object' || !value || Array.isArray(value)) {
    throw new FixedAlternationConfigError(
      'La politique d’alternance fixe doit être un objet ou null.',
    );
  }

  const policy = value as Record<string, unknown>;
  const fields = [
    'enabled',
    'employee_guids',
    'template_guids',
    'anchor_date',
    'shift_cadence_days',
    'weekend_rest',
    'limited_service_template_guid',
  ];
  if (Object.keys(policy).some((field) => !fields.includes(field))) {
    throw new FixedAlternationConfigError(
      'La politique d’alternance fixe contient un champ inconnu.',
    );
  }
  const { enabled, anchor_date, shift_cadence_days, weekend_rest } = policy;
  if (typeof enabled !== 'boolean') {
    throw new FixedAlternationConfigError('enabled doit être un booléen.');
  }
  if (typeof anchor_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(anchor_date)) {
    throw new FixedAlternationConfigError(
      'La date d’ancrage doit être une date au format YYYY-MM-DD.',
    );
  }
  const anchor = new Date(`${anchor_date}T00:00:00Z`);
  if (!Number.isFinite(anchor.getTime()) || anchor.toISOString().slice(0, 10) !== anchor_date) {
    throw new FixedAlternationConfigError('La date d’ancrage est invalide.');
  }
  if (
    typeof shift_cadence_days !== 'number' ||
    !Number.isInteger(shift_cadence_days) ||
    shift_cadence_days < 1 ||
    shift_cadence_days > 366
  ) {
    throw new FixedAlternationConfigError(
      'La fréquence d’alternance doit être comprise entre 1 et 366 jours.',
    );
  }
  if (weekend_rest !== 'KEEP_PROFILE' && weekend_rest !== 'ALTERNATE_SAT_SUN') {
    throw new FixedAlternationConfigError('La règle de repos du week-end est invalide.');
  }

  const templateGuids = parsePair(policy.template_guids, 'template_guids');
  const limitedService = policy.limited_service_template_guid;
  if (
    limitedService !== undefined &&
    limitedService !== null &&
    (typeof limitedService !== 'string' ||
      !templateGuids.includes(limitedService) ||
      weekend_rest !== 'ALTERNATE_SAT_SUN')
  ) {
    throw new FixedAlternationConfigError(
      'Le service limité doit être un des deux modèles et conserver les repos alternés.',
    );
  }
  return {
    enabled,
    ...(typeof limitedService === 'string' && { limited_service_template_guid: limitedService }),
    employee_guids: parsePair(policy.employee_guids, 'employee_guids'),
    template_guids: templateGuids,
    anchor_date,
    shift_cadence_days,
    weekend_rest,
  };
}

export function matchesFixedReferenceTemplates(
  policy: FixedAlternationPolicy,
  references: Array<string | undefined>,
): boolean {
  return policy.template_guids.every((guid) => references.includes(guid));
}

export function validateLimitedServiceTemplates(
  policy: FixedAlternationPolicy,
  templates: Array<Pick<EngineTemplate, 'guid' | 'definition'> | undefined>,
): void {
  if (!policy.limited_service_template_guid) return;
  for (const guid of policy.template_guids) {
    const expected = guid === policy.limited_service_template_guid ? '10:30' : '08:00';
    const definition = templates.find((template) => template?.guid === guid)?.definition;
    const starts = Object.values(definition ?? {}).flatMap((blocks) =>
      Array.isArray(blocks) && blocks.length
        ? [blocks.map((block) => block.work[0]).sort()[0]]
        : [],
    );
    if (!starts.length || starts.some((start) => start !== expected)) {
      throw new FixedAlternationConfigError(
        `Le modèle ${guid} doit commencer à ${expected} les jours où il est utilisé.`,
      );
    }
  }
}

export function prepareFixedAlternation(
  policy: FixedAlternationPolicy | null,
  employees: PlanningEmployeeInput[],
  excludedEmployeeGuids: readonly string[] = [],
):
  | {
      status: FixedAlternationStatus;
      policy?: FixedAlternationSolverPolicy;
      reason?: 'EMPLOYEE_EXCLUDED' | 'PAIR_OUT_OF_SCOPE';
      missingEmployeeGuids?: string[];
    }
  | undefined {
  if (!policy?.enabled) return undefined;

  const [firstGuid, secondGuid] = policy.employee_guids;
  const first = employees.find((employee) => employee.guid === firstGuid);
  const second = employees.find((employee) => employee.guid === secondGuid);
  const excluded = policy.employee_guids.filter((guid) => excludedEmployeeGuids.includes(guid));
  if (excluded.length || !first || !second) {
    return {
      status: 'NOT_APPLICABLE',
      reason: excluded.length ? 'EMPLOYEE_EXCLUDED' : 'PAIR_OUT_OF_SCOPE',
      missingEmployeeGuids: policy.employee_guids.filter(
        (guid) => excluded.includes(guid) || !employees.some((employee) => employee.guid === guid),
      ),
    };
  }

  if (
    first.mode !== 'FIXED' ||
    second.mode !== 'FIXED' ||
    !first.fixedTemplate ||
    !second.fixedTemplate ||
    !matchesFixedReferenceTemplates(policy, [first.fixedTemplate.guid, second.fixedTemplate.guid])
  ) {
    return { status: 'INCOMPATIBLE_PROFILES' };
  }

  const templates: [EngineTemplate, EngineTemplate] =
    first.fixedTemplate.guid === policy.template_guids[0]
      ? [first.fixedTemplate, second.fixedTemplate]
      : [second.fixedTemplate, first.fixedTemplate];
  return {
    status: 'PENDING_SOLVER_SUPPORT',
    policy: {
      employeeGuids: [...policy.employee_guids],
      templates,
      anchorDate: policy.anchor_date,
      shiftCadenceDays: policy.shift_cadence_days,
      ...(policy.limited_service_template_guid && {
        limitedServiceTemplateGuid: policy.limited_service_template_guid,
      }),
      weekendRest: policy.weekend_rest,
    },
  };
}

export interface FixedAlternationEvaluation {
  contractVersion: 1 | 2 | 3;
  employeeGuids: [string, string];
  checks: Array<{
    date: string;
    kind: 'SHIFT' | 'WEEKEND_REST';
    expected: [string | null, string | null];
    actual: [string | null, string | null];
    lockedEmployeeGuids: string[];
    reason?:
      | 'LOCKED_ASSIGNMENT'
      | 'PROFILE_REST'
      | 'TEMPLATE_UNAVAILABLE'
      | 'OTHER_SOLVER_PRIORITIES'
      | null;
  }>;
}

export function summarizeFixedAlternation(evaluation: FixedAlternationEvaluation) {
  const deviations = evaluation.checks.filter((check) =>
    check.expected.some((expected, index) => expected !== check.actual[index]),
  );
  const applied = evaluation.checks.length > deviations.length;
  const status = !evaluation.checks.length
    ? 'NOT_APPLICABLE'
    : !deviations.length
      ? 'APPLIED'
      : applied
        ? 'PARTIALLY_APPLIED'
        : 'NOT_RESPECTED';
  const messages = {
    APPLIED: 'Toutes les préférences évaluées d’alternance fixe ont été respectées.',
    PARTIALLY_APPLIED:
      'Certaines préférences d’alternance fixe n’ont pas été respectées. Consultez les dates et les décisions verrouillées.',
    NOT_RESPECTED: 'Aucune préférence d’alternance évaluée n’a été respectée sur cette période.',
    NOT_APPLICABLE: 'Aucune préférence d’alternance fixe n’était à évaluer sur cette période.',
  };
  return {
    status,
    applied,
    message: messages[status],
    checkedCount: evaluation.checks.length,
    deviations,
  };
}
