import { SAFamily } from '@toke/shared';

import ScheduleAssignments from '../tenant/class/ScheduleAssignments.js';

export type HistoryServiceType = 'STANDARD' | 'GUARD' | 'GUARD_CONTINUATION';

export interface HistoryEmployeeDescriptor {
  guid: string;
  name: string;
}

export interface HistoryRequirementDescriptor {
  guid: string;
  dayOfWeek: string;
  serviceType: 'STANDARD' | 'GUARD';
  templateGuid: string;
  templateName: string;
  minEmployees: number;
  targetEmployees: number;
  maxEmployees: number | null;
  continuationTemplateGuid?: string | null;
  continuationDayOffset?: number;
}

export interface HistoryAdjustment {
  date: string;
  template_guid: string;
  included_employee_guids: string[];
}

export interface HistoricalFairnessBaseline {
  employeeGuid: string;
  workedDays: number;
  guardDays: number;
  weekendWorkedDays: number;
  workedMinutes: number;
  restDays: number;
  templateCounts: Record<string, number>;
}

export interface HistoryAnomalyEmployee {
  guid: string;
  name: string;
}

export interface HistoryAnomaly {
  key: string;
  code:
    | 'HISTORY_DUPLICATE_EMPLOYEE_DAY'
    | 'HISTORY_COVERAGE_ABOVE_EXPECTATION'
    | 'HISTORY_COVERAGE_BELOW_EXPECTATION';
  severity: 'WARNING';
  date: string;
  templateGuid: string | null;
  templateName: string;
  serviceType: HistoryServiceType | 'REST' | 'UNKNOWN';
  message: string;
  observedCount: number;
  expectedMin: number | null;
  expectedTarget: number | null;
  expectedMax: number | null;
  employees: HistoryAnomalyEmployee[];
  affectsFairness: boolean;
  selectedEmployeeGuids: string[];
  resolution: 'AUTO_ACCEPTED' | 'IGNORED_UNTIL_REVIEW' | 'MANAGER_ADJUSTED';
  suggestedActions: string[];
}

export interface BoundaryGuardFact {
  employeeGuid: string;
  guardDate: string;
  templateGuid: string;
}

export interface PlanningHistoryAnalysis {
  available: boolean;
  historyFrom: string;
  historyTo: string;
  fairness: HistoricalFairnessBaseline[];
  anomalies: HistoryAnomaly[];
  boundaryGuardFacts: BoundaryGuardFact[];
  summary: {
    employeeCount: number;
    acceptedWorkRecords: number;
    acceptedRestRecords: number;
    ignoredAmbiguousRecords: number;
    warningCount: number;
    adjustedAnomalyCount: number;
  };
  warning?: {
    code: string;
    message: string;
  };
}

interface DailyHistoryRecord {
  employeeGuid: string;
  employeeName: string;
  date: string;
  templateGuid: string | null;
  templateName: string;
  serviceType: HistoryServiceType | 'REST' | 'UNKNOWN';
  minutes: number;
  isRest: boolean;
}

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function addDays(iso: string, amount: number): string {
  const value = new Date(`${iso}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function dayKey(iso: string): string {
  return DAY_KEYS[new Date(`${iso}T00:00:00.000Z`).getUTCDay()]!;
}

function isWeekend(iso: string): boolean {
  const day = new Date(`${iso}T00:00:00.000Z`).getUTCDay();
  return day === 0 || day === 6;
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function templateMinutes(definition: Record<string, any>, iso: string): number {
  const blocks = definition?.[dayKey(iso)] ?? [];
  if (!Array.isArray(blocks)) return 0;

  return blocks.reduce((total: number, block: any) => {
    if (!Array.isArray(block?.work) || block.work.length !== 2) return total;

    const start = toMinutes(block.work[0]);
    let end = toMinutes(block.work[1]);
    if (end <= start) end += 24 * 60;

    let duration = end - start;
    if (Array.isArray(block.pause) && block.pause.length === 2) {
      const pauseStart = toMinutes(block.pause[0]);
      let pauseEnd = toMinutes(block.pause[1]);
      if (pauseEnd <= pauseStart) pauseEnd += 24 * 60;
      duration -= pauseEnd - pauseStart;
    }

    return total + Math.max(0, duration);
  }, 0);
}

function periodDates(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

function adjustmentKey(date: string, templateGuid: string): string {
  return `${date}::${templateGuid}`;
}

function aggregateRequirementLimits(requirements: HistoryRequirementDescriptor[]): Map<string, {
  min: number;
  target: number;
  max: number | null;
  serviceType: 'STANDARD' | 'GUARD';
  templateName: string;
}> {
  const result = new Map<string, {
    min: number;
    target: number;
    max: number | null;
    serviceType: 'STANDARD' | 'GUARD';
    templateName: string;
  }>();

  for (const requirement of requirements) {
    const key = `${requirement.dayOfWeek}::${requirement.templateGuid}`;
    const current = result.get(key);

    if (!current) {
      result.set(key, {
        min: requirement.minEmployees,
        target: requirement.targetEmployees,
        max: requirement.maxEmployees,
        serviceType: requirement.serviceType,
        templateName: requirement.templateName,
      });
      continue;
    }

    current.min += requirement.minEmployees;
    current.target += requirement.targetEmployees;
    current.max = current.max === null || requirement.maxEmployees === null
      ? null
      : current.max + requirement.maxEmployees;
  }

  return result;
}

export async function analyzePlanningHistory(input: {
  employees: HistoryEmployeeDescriptor[];
  requirements: HistoryRequirementDescriptor[];
  historyFrom: string;
  historyTo: string;
  solveFrom: string;
  postGuardRestDays: number;
  adjustments?: HistoryAdjustment[];
}): Promise<PlanningHistoryAnalysis> {
  const employeeByGuid = new Map(input.employees.map((employee) => [employee.guid, employee]));
  const requirementLimits = aggregateRequirementLimits(input.requirements);
  const serviceTypeByTemplateGuid = new Map<string, HistoryServiceType>();
  const continuationByGuardTemplate = new Map<string, { templateGuid: string; dayOffset: number }>();

  for (const requirement of input.requirements) {
    serviceTypeByTemplateGuid.set(requirement.templateGuid, requirement.serviceType);
    if (requirement.continuationTemplateGuid) {
      serviceTypeByTemplateGuid.set(requirement.continuationTemplateGuid, 'GUARD_CONTINUATION');
      continuationByGuardTemplate.set(requirement.templateGuid, {
        templateGuid: requirement.continuationTemplateGuid,
        dayOffset: requirement.continuationDayOffset ?? 1,
      });
    }
  }

  const adjustments = new Map<string, Set<string>>();
  for (const adjustment of input.adjustments ?? []) {
    if (!adjustment?.date || !adjustment?.template_guid || !Array.isArray(adjustment.included_employee_guids)) {
      continue;
    }
    adjustments.set(
      adjustmentKey(adjustment.date, adjustment.template_guid),
      new Set(
        adjustment.included_employee_guids.filter((guid) => employeeByGuid.has(guid)),
      ),
    );
  }

  const records: DailyHistoryRecord[] = [];

  for (const employee of input.employees) {
    const assignments = await ScheduleAssignments._listForRelatedOnPeriod(
      SAFamily.USER,
      employee.guid,
      input.historyFrom,
      input.historyTo,
    );

    for (const assignment of assignments ?? []) {
      if (assignment.isActive() !== true || assignment.getDeletedAt()) continue;

      const snapshot = assignment.getSessionTemplate();
      const startDate = assignment.getStartDate();
      if (!snapshot || !startDate) continue;

      const from = startDate < input.historyFrom ? input.historyFrom : startDate;
      const rawEnd = assignment.getEndDate() ?? input.historyTo;
      const to = rawEnd > input.historyTo ? input.historyTo : rawEnd;
      if (from > to) continue;

      for (const iso of periodDates(from, to)) {
        const isPlannedRest = snapshot.guid === 'planned-rest';
        const minutes = isPlannedRest ? 0 : templateMinutes(snapshot.definition ?? {}, iso);

        if (!isPlannedRest && minutes <= 0) continue;

        records.push({
          employeeGuid: employee.guid,
          employeeName: employee.name,
          date: iso,
          templateGuid: isPlannedRest ? null : snapshot.guid ?? null,
          templateName: isPlannedRest ? 'Repos planifié' : snapshot.name ?? '—',
          serviceType: isPlannedRest
            ? 'REST'
            : serviceTypeByTemplateGuid.get(snapshot.guid) ?? 'UNKNOWN',
          minutes,
          isRest: isPlannedRest,
        });
      }
    }
  }

  const anomalies: HistoryAnomaly[] = [];
  const suppressedKeys = new Set<string>();
  const dailyByEmployee = new Map<string, DailyHistoryRecord[]>();

  for (const record of records) {
    const key = `${record.employeeGuid}::${record.date}`;
    const current = dailyByEmployee.get(key) ?? [];
    current.push(record);
    dailyByEmployee.set(key, current);
  }

  for (const [key, employeeRecords] of dailyByEmployee) {
    if (employeeRecords.length <= 1) continue;

    const first = employeeRecords[0]!;
    suppressedKeys.add(key);
    anomalies.push({
      key: `duplicate::${key}`,
      code: 'HISTORY_DUPLICATE_EMPLOYEE_DAY',
      severity: 'WARNING',
      date: first.date,
      templateGuid: null,
      templateName: 'Plusieurs affectations',
      serviceType: 'UNKNOWN',
      message: `${first.employeeName} possède plusieurs affectations actives le ${first.date}. Cette journée est ignorée dans l’équité historique.`,
      observedCount: employeeRecords.length,
      expectedMin: null,
      expectedTarget: null,
      expectedMax: 1,
      employees: [{ guid: first.employeeGuid, name: first.employeeName }],
      affectsFairness: true,
      selectedEmployeeGuids: [],
      resolution: 'IGNORED_UNTIL_REVIEW',
      suggestedActions: [
        'Vérifier les affectations publiées de ce collaborateur pour cette journée.',
        'La génération reste autorisée : Toké neutralise simplement cette journée dans le calcul d’équité.',
      ],
    });
  }

  const workRecords = records.filter(
    (record) => !record.isRest && !suppressedKeys.has(`${record.employeeGuid}::${record.date}`),
  );
  const recordsByRequirementSlot = new Map<string, DailyHistoryRecord[]>();

  for (const record of workRecords) {
    if (!record.templateGuid) continue;
    const key = `${record.date}::${record.templateGuid}`;
    const current = recordsByRequirementSlot.get(key) ?? [];
    current.push(record);
    recordsByRequirementSlot.set(key, current);
  }

  for (const [key, slotRecords] of recordsByRequirementSlot) {
    const first = slotRecords[0]!;
    const limits = requirementLimits.get(`${dayKey(first.date)}::${first.templateGuid}`);
    if (!limits) continue;

    const observed = slotRecords.length;
    const employees = slotRecords.map((record) => ({
      guid: record.employeeGuid,
      name: record.employeeName,
    }));

    if (limits.max !== null && observed > limits.max) {
      const selected = adjustments.get(key);
      const selectedEmployeeGuids = selected
        ? slotRecords
            .filter((record) => selected.has(record.employeeGuid))
            .map((record) => record.employeeGuid)
        : [];
      const selectedSet = new Set(selectedEmployeeGuids);

      // An unresolved over-capacity historical day is deliberately neutralised
      // for fairness. A manager can explicitly select the employees who really
      // carried that service; this never blocks generation.
      for (const record of slotRecords) {
        if (!selectedSet.has(record.employeeGuid)) {
          suppressedKeys.add(`${record.employeeGuid}::${record.date}`);

          if (record.serviceType === 'GUARD' && record.templateGuid) {
            const continuation = continuationByGuardTemplate.get(record.templateGuid);
            if (continuation) {
              const continuationDate = addDays(record.date, continuation.dayOffset);
              const continuationRecord = records.find(
                (candidate) =>
                  candidate.employeeGuid === record.employeeGuid &&
                  candidate.date === continuationDate &&
                  candidate.templateGuid === continuation.templateGuid,
              );
              if (continuationRecord) {
                suppressedKeys.add(`${continuationRecord.employeeGuid}::${continuationRecord.date}`);
              }

              for (let offset = 1; offset <= Math.max(0, input.postGuardRestDays); offset++) {
                const restDate = addDays(continuationDate, offset);
                const restRecord = records.find(
                  (candidate) =>
                    candidate.employeeGuid === record.employeeGuid &&
                    candidate.date === restDate &&
                    candidate.isRest,
                );
                if (restRecord) {
                  suppressedKeys.add(`${restRecord.employeeGuid}::${restRecord.date}`);
                }
              }
            }
          }
        }
      }

      anomalies.push({
        key: `coverage-over::${key}`,
        code: 'HISTORY_COVERAGE_ABOVE_EXPECTATION',
        severity: 'WARNING',
        date: first.date,
        templateGuid: first.templateGuid,
        templateName: first.templateName,
        serviceType: first.serviceType,
        message: `${observed} collaborateur(s) sont enregistrés sur ${first.templateName} le ${first.date}, alors que la configuration actuelle en prévoit au maximum ${limits.max}.`,
        observedCount: observed,
        expectedMin: limits.min,
        expectedTarget: limits.target,
        expectedMax: limits.max,
        employees,
        affectsFairness: true,
        selectedEmployeeGuids,
        resolution: selected
          ? 'MANAGER_ADJUSTED'
          : 'IGNORED_UNTIL_REVIEW',
        suggestedActions: [
          'Sélectionner les collaborateurs qui doivent réellement compter dans l’historique de ce service.',
          'Conserver tous les collaborateurs si cette surcharge correspondait réellement à une situation exceptionnelle.',
          'Ne rien sélectionner pour neutraliser cette anomalie dans l’équité sans bloquer la génération.',
        ],
      });
      continue;
    }

    if (observed < limits.min) {
      anomalies.push({
        key: `coverage-under::${key}`,
        code: 'HISTORY_COVERAGE_BELOW_EXPECTATION',
        severity: 'WARNING',
        date: first.date,
        templateGuid: first.templateGuid,
        templateName: first.templateName,
        serviceType: first.serviceType,
        message: `${observed} collaborateur(s) sont enregistrés sur ${first.templateName} le ${first.date}, contre un minimum actuel de ${limits.min}. Cette situation reste comptabilisée dans l’équité.`,
        observedCount: observed,
        expectedMin: limits.min,
        expectedTarget: limits.target,
        expectedMax: limits.max,
        employees,
        affectsFairness: false,
        selectedEmployeeGuids: employees.map((employee) => employee.guid),
        resolution: 'AUTO_ACCEPTED',
        suggestedActions: [
          'Aucune correction n’est obligatoire : un sous-effectif historique peut correspondre à une situation réellement vécue.',
        ],
      });
    }
  }

  const fairnessByEmployee = new Map<string, HistoricalFairnessBaseline>();
  for (const employee of input.employees) {
    fairnessByEmployee.set(employee.guid, {
      employeeGuid: employee.guid,
      workedDays: 0,
      guardDays: 0,
      weekendWorkedDays: 0,
      workedMinutes: 0,
      restDays: 0,
      templateCounts: {},
    });
  }

  let acceptedWorkRecords = 0;
  let acceptedRestRecords = 0;
  let ignoredAmbiguousRecords = 0;

  for (const record of records) {
    if (suppressedKeys.has(`${record.employeeGuid}::${record.date}`)) {
      ignoredAmbiguousRecords++;
      continue;
    }

    const fairness = fairnessByEmployee.get(record.employeeGuid);
    if (!fairness) continue;

    if (record.isRest) {
      fairness.restDays++;
      acceptedRestRecords++;
      continue;
    }

    fairness.workedDays++;
    fairness.workedMinutes += record.minutes;
    if (record.serviceType === 'GUARD') fairness.guardDays++;
    if (isWeekend(record.date)) fairness.weekendWorkedDays++;
    if (record.templateGuid) {
      fairness.templateCounts[record.templateGuid] =
        (fairness.templateCounts[record.templateGuid] ?? 0) + 1;
    }
    acceptedWorkRecords++;
  }

  const boundaryGuardDate = addDays(input.solveFrom, -1);
  const boundaryGuardFacts: BoundaryGuardFact[] = records
    .filter(
      (record) =>
        record.date === boundaryGuardDate &&
        record.serviceType === 'GUARD' &&
        record.templateGuid !== null &&
        !suppressedKeys.has(`${record.employeeGuid}::${record.date}`),
    )
    .map((record) => ({
      employeeGuid: record.employeeGuid,
      guardDate: record.date,
      templateGuid: record.templateGuid!,
    }));

  return {
    available: true,
    historyFrom: input.historyFrom,
    historyTo: input.historyTo,
    fairness: [...fairnessByEmployee.values()],
    anomalies,
    boundaryGuardFacts,
    summary: {
      employeeCount: input.employees.length,
      acceptedWorkRecords,
      acceptedRestRecords,
      ignoredAmbiguousRecords,
      warningCount: anomalies.length,
      adjustedAnomalyCount: anomalies.filter((anomaly) => anomaly.resolution === 'MANAGER_ADJUSTED').length,
    },
  };
}

export function emptyPlanningHistoryAnalysis(input: {
  employees: HistoryEmployeeDescriptor[];
  historyFrom: string;
  historyTo: string;
  message: string;
}): PlanningHistoryAnalysis {
  return {
    available: false,
    historyFrom: input.historyFrom,
    historyTo: input.historyTo,
    fairness: input.employees.map((employee) => ({
      employeeGuid: employee.guid,
      workedDays: 0,
      guardDays: 0,
      weekendWorkedDays: 0,
      workedMinutes: 0,
      restDays: 0,
      templateCounts: {},
    })),
    anomalies: [],
    boundaryGuardFacts: [],
    summary: {
      employeeCount: input.employees.length,
      acceptedWorkRecords: 0,
      acceptedRestRecords: 0,
      ignoredAmbiguousRecords: 0,
      warningCount: 1,
      adjustedAnomalyCount: 0,
    },
    warning: {
      code: 'PLANNING_HISTORY_ANALYSIS_UNAVAILABLE',
      message: input.message,
    },
  };
}
