import type {
  AttendanceDataQuality,
  AttendanceDataQualityLevel,
  AttendanceIssue,
  AttendanceStatus,
} from '@/views/modules/attendance-statistics';

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
    description: 'Aucune activité sur une journée travaillée valide et terminée.',
    rateCategory: 'eligible',
    tone: 'danger',
    order: 3,
  },
  PENDING: {
    label: 'En attente',
    description: 'Journée travaillée encore en cours, non finalisée.',
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
    label: 'Présence un jour de repos',
    actionLabel: 'Examiner',
    family: 'planning',
  },
  PRESENCE_WITHOUT_SCHEDULE: {
    label: 'Présence sans planning',
    actionLabel: 'Corriger le planning',
    family: 'planning',
  },
  MISSING_SCHEDULE: {
    label: 'Planning manquant',
    actionLabel: 'Configurer',
    family: 'planning',
  },
  INVALID_SCHEDULE: {
    label: 'Planning invalide',
    actionLabel: 'Corriger',
    family: 'planning',
  },
  OPEN_SESSION: {
    label: 'Session ouverte',
    actionLabel: 'Vérifier la session',
    family: 'session',
  },
  INCOMPLETE_SESSION: {
    label: 'Session incomplète',
    actionLabel: 'Corriger la session',
    family: 'session',
  },
  MISSING_DURATION: {
    label: 'Durée inexploitable',
    actionLabel: 'Vérifier la durée',
    family: 'duration',
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
