import type { Component } from 'vue'
import {
  IconAdjustments,
  IconBeach,
  IconCalendarPause,
  IconChecklist,
  IconCpu2,
  IconMoonStars,
} from '@tabler/icons-vue'

export type PlanningConfigStepId =
  | 'general'
  | 'leave'
  | 'workload'
  | 'guard'
  | 'solver'
  | 'review'

export interface PlanningConfigStep {
  id: PlanningConfigStepId
  number: number
  label: string
  shortLabel: string
  description: string
  icon: Component
  errorKeys: string[]
}

export const PLANNING_CONFIG_STEPS: PlanningConfigStep[] = [
  {
    id: 'general',
    number: 1,
    label: 'Informations générales',
    shortLabel: 'Général',
    description: 'Nom, statut et rôle de la configuration.',
    icon: IconAdjustments,
    errorKeys: ['name'],
  },
  {
    id: 'leave',
    number: 2,
    label: 'Repos hebdomadaires',
    shortLabel: 'Repos',
    description: 'Population, quota, jours autorisés et périmètre.',
    icon: IconCalendarPause,
    errorKeys: [
      'weekly_leave_employees_per_week',
      'weekly_leave_rotation_anchor_date',
      'weekly_leave_allowed_days',
      'weekly_leave_selector_planning_modes',
      'weekly_leave_days_per_employee',
      'weekly_leave_service_scope',
    ],
  },
  {
    id: 'workload',
    number: 3,
    label: 'Charge de travail',
    shortLabel: 'Charge',
    description: 'Repos entre services, limites et équité.',
    icon: IconBeach,
    errorKeys: ['max_consecutive_work_days'],
  },
  {
    id: 'guard',
    number: 4,
    label: 'Gardes et récupération',
    shortLabel: 'Gardes',
    description: 'Pools, participation et repos après garde.',
    icon: IconMoonStars,
    errorKeys: [
      'guard_team_employees_per_week',
      'guard_team_rotation_anchor_date',
      'guard_team_eligible_planning_modes',
      'guard_team_max_membership_spread',
    ],
  },
  {
    id: 'solver',
    number: 5,
    label: 'Calcul et exigences',
    shortLabel: 'Calcul',
    description: 'Méthode de génération et contraintes strictes.',
    icon: IconCpu2,
    errorKeys: [],
  },
  {
    id: 'review',
    number: 6,
    label: 'Vérification finale',
    shortLabel: 'Vérifier',
    description: 'Relire les choix avant enregistrement.',
    icon: IconChecklist,
    errorKeys: [],
  },
]
