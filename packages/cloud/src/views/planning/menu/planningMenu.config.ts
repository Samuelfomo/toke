import {
  IconArrowsLeftRight,
  IconCalendarCheck,
  IconCalendarEvent,
  IconClockHour4,
  IconHistory,
  IconRefresh,
  IconSparkles,
} from '@tabler/icons-vue'

import type { PlanningMenuGroup } from './planningMenu.type'

export const PLANNING_MENU_GROUPS: PlanningMenuGroup[] = [
  {
    id: 'planning-build',
    title: 'Construire les plannings',
    description:
      'Préparez et publiez les affectations de votre équipe à partir de règles contrôlées.',
    items: [
      {
        id: 'planning-suggestion',
        title: 'Planification assistée',
        description:
          'Configurez les collaborateurs, les besoins de couverture et les règles avant de générer une proposition.',
        routeName: 'planning-suggestion-dashboard',
        icon: IconSparkles,
        featured: true,
        badge: 'Parcours recommandé',
      },
      {
        id: 'rotation-assignment',
        title: 'Affectations de rotation',
        description:
          'Associez les collaborateurs aux groupes et aux cycles de rotation disponibles.',
        routeName: 'rotation-assignment',
        icon: IconArrowsLeftRight,
      },
      {
        id: 'schedule-assignment',
        title: 'Plannings publiés',
        description:
          'Consultez les affectations officiellement validées et utilisées par les équipes.',
        routeName: 'schedule-assignment',
        icon: IconCalendarCheck,
      },
    ],
  },
  {
    id: 'planning-settings',
    title: 'Préparer les règles',
    description:
      'Définissez les modèles horaires et les structures utilisées pour construire les plannings.',
    items: [
      {
        id: 'session-model',
        title: 'Modèles de journées',
        description:
          'Définissez les normes horaires générales applicables aux journées de travail.',
        routeName: 'session-model',
        icon: IconClockHour4,
      },
      {
        id: 'session-template',
        title: 'Horaires types',
        description:
          'Créez les horaires standards pouvant être affectés aux collaborateurs.',
        routeName: 'session-template',
        icon: IconCalendarEvent,
      },
      {
        id: 'rotation-group',
        title: 'Groupes de rotation',
        description:
          'Organisez les cycles, les équipes tournantes et leur ordre de passage.',
        routeName: 'rotation-group',
        icon: IconRefresh,
      },
    ],
  },
  {
    id: 'planning-monitoring',
    title: 'Contrôler et suivre',
    description:
      'Retrouvez les opérations déjà réalisées et contrôlez leur historique.',
    items: [
      {
        id: 'assignment-history',
        title: 'Historique des affectations',
        description:
          'Accédez à la page dédiée au suivi des anciennes affectations et publications.',
        routeName: 'assignment-history',
        icon: IconHistory,
      },
    ],
  },
]
