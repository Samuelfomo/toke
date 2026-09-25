import type {
  AttendanceDataQuality,
  AttendanceDataQualityLevel,
  AttendanceIssue,
  AttendanceStatus,
} from '../types/attendance-statistics.types.js';

export interface AttendanceStatusPresentation {
  label: string;
  description: string;
  rateCategory: 'eligible' | 'excluded';
  tone: 'positive' | 'warning' | 'danger' | 'neutral' | 'info';
  order: number;
}

export const ATTENDANCE_STATUS_PRESENTATION: Record<
  AttendanceStatus,
  AttendanceStatusPresentation
> = {
  PRESENT: {
    label: 'Présent à l’heure',
    description: 'Présence sur une journée travaillée, dans la tolérance prévue.',
    rateCategory: 'eligible',
    tone: 'positive',
    order: 1,
  },
  LATE: {
    label: 'En retard',
    description: 'Présence sur une journée travaillée, au-delà de la tolérance.',
    rateCategory: 'eligible',
    tone: 'warning',
    order: 2,
  },
  ABSENT: {
    label: 'Absent',
    description: 'Le ou les blocs de travail attendus n’ont pas été couverts sur une journée finalisée. Une activité peut néanmoins exister en dehors des plages prévues.',
    rateCategory: 'eligible',
    tone: 'danger',
    order: 3,
  },
  PENDING: {
    label: 'En attente',
    description: 'Journée de travail encore en cours ou non finalisée pour les taux.',
    rateCategory: 'excluded',
    tone: 'info',
    order: 4,
  },
  REST_DAY: {
    label: 'Jour de repos',
    description: 'Aucun travail attendu selon le planning applicable.',
    rateCategory: 'excluded',
    tone: 'neutral',
    order: 5,
  },
  UNDETERMINED: {
    label: 'Indéterminé',
    description: 'Le planning est absent ou invalide ; aucune absence ne peut être conclue.',
    rateCategory: 'excluded',
    tone: 'warning',
    order: 6,
  },
};

export interface AttendanceIssuePresentation {
  label: string;
  actionLabel: string;
  family: 'planning' | 'session' | 'duration';
}

export const ATTENDANCE_ISSUE_PRESENTATION: Record<
  AttendanceIssue,
  AttendanceIssuePresentation
> = {
  PRESENCE_ON_REST_DAY: {
    label: 'Activité enregistrée un jour de repos',
    actionLabel: 'Comparer planning et pointage',
    family: 'planning',
  },
  PRESENCE_WITHOUT_SCHEDULE: {
    label: 'Activité avec planning non exploitable',
    actionLabel: 'Examiner le planning et l’activité',
    family: 'planning',
  },
  MISSING_SCHEDULE: {
    label: 'Planning manquant',
    actionLabel: 'Examiner le planning',
    family: 'planning',
  },
  INVALID_SCHEDULE: {
    label: 'Planning invalide',
    actionLabel: 'Examiner le planning',
    family: 'planning',
  },
  OPEN_SESSION: {
    label: 'Session ouverte',
    actionLabel: 'Examiner la session',
    family: 'session',
  },
  INCOMPLETE_SESSION: {
    label: 'Session incomplète',
    actionLabel: 'Examiner la session',
    family: 'session',
  },
  MISSING_DURATION: {
    label: 'Durée non calculable',
    actionLabel: 'Examiner les données de durée',
    family: 'duration',
  },
  ACTIVITY_OUTSIDE_EXPECTED_BLOCK: {
    label: 'Écart activité / plage prévue',
    actionLabel: 'Comparer planning et pointage',
    family: 'planning',
  },
  CORRECTED_PRESENCE: {
    label: 'Présence corrigée ou reconstruite',
    actionLabel: 'Consulter la traçabilité',
    family: 'session',
  },
};

/**
 * Niveau purement visuel. La source métier reste reliableForAttendanceRate.
 */
export function getAttendanceDataQualityLevel(
  quality: AttendanceDataQuality,
): AttendanceDataQualityLevel {
  if (!quality.reliableForAttendanceRate) return 'unreliable';

  const operationalIssueCount =
    quality.unresolvedScheduleDays +
    quality.openSessionDays +
    quality.incompleteSessionDays +
    quality.missingDurationDays +
    quality.presenceWithoutScheduleDays;

  return operationalIssueCount > 0 ? 'warning' : 'reliable';
}
