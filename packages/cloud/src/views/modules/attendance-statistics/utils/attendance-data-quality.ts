import { getAttendanceDataQualityLevel } from './attendance-status.js';

import type {
  AttendanceDataQuality,
  AttendanceDataQualityLevel,
} from '@/views/modules/attendance-statistics';

export type AttendanceDataQualityMetricId =
  | 'unresolved_schedule'
  | 'presence_without_schedule'
  | 'open_session'
  | 'incomplete_session'
  | 'missing_duration';

export interface AttendanceDataQualityMetric {
  id: AttendanceDataQualityMetricId;
  label: string;
  value: number;
  description: string;
}

export interface AttendanceDataQualityPresentation {
  level: AttendanceDataQualityLevel;
  eyebrow: string;
  title: string;
  message: string;
  metrics: AttendanceDataQualityMetric[];
  notes: string[];
}

/**
 * Produit un modèle purement visuel à partir du verdict backend.
 * reliableForAttendanceRate reste la source de vérité métier.
 */
export function buildAttendanceDataQualityPresentation(
  quality: AttendanceDataQuality,
): AttendanceDataQualityPresentation {
  const level = getAttendanceDataQualityLevel(quality);

  const copy = {
    reliable: {
      eyebrow: 'Qualité des données',
      title: 'Données fiables pour le taux de présence',
      message:
        'Aucun signal bloquant n’empêche l’interprétation du taux de présence sur cette période.',
    },
    warning: {
      eyebrow: 'Qualité des données · À surveiller',
      title: 'Données exploitables avec corrections à prévoir',
      message:
        'Le taux de présence reste interprétable, mais certaines sessions ou durées nécessitent une vérification.',
    },
    unreliable: {
      eyebrow: 'Qualité des données · Non fiable',
      title: 'Le taux de présence ne doit pas être interprété seul',
      message:
        'Le backend signale que les données de planning ne permettent pas une lecture suffisamment fiable du taux de présence.',
    },
  } satisfies Record<
    AttendanceDataQualityLevel,
    { eyebrow: string; title: string; message: string }
  >;

  return {
    level,
    ...copy[level],
    metrics: [
      {
        id: 'unresolved_schedule',
        label: 'Plannings non résolus',
        value: quality.unresolvedScheduleDays,
        description: 'Journées dont le planning applicable reste indéterminé.',
      },
      {
        id: 'presence_without_schedule',
        label: 'Présences sans planning',
        value: quality.presenceWithoutScheduleDays,
        description: 'Activités enregistrées sans planning exploitable.',
      },
      {
        id: 'open_session',
        label: 'Sessions ouvertes',
        value: quality.openSessionDays,
        description: 'Sessions encore ouvertes dans la période analysée.',
      },
      {
        id: 'incomplete_session',
        label: 'Sessions incomplètes',
        value: quality.incompleteSessionDays,
        description: 'Sessions dont les événements ne permettent pas un calcul complet.',
      },
      {
        id: 'missing_duration',
        label: 'Durées manquantes',
        value: quality.missingDurationDays,
        description: 'Journées pour lesquelles la durée ne peut pas être exploitée.',
      },
    ],
    notes: [...quality.notes],
  };
}
