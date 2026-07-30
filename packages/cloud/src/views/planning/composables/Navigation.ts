import type { NavGroup } from './navigation.type'

export const NAV_GROUPS: NavGroup[] = [
    {
        id: 'planning',
        label: 'PLANNING & ROTATIONS',
        items: [
            {
                id: 'planning-suggestion',
                label: 'Planification assistée',
                sublabel: 'Configurer et générer les plannings',
                icon: 'IconSparkles',
                routeName: 'planning-suggestion-dashboard',
                group: 'planning',
            },
            {
                id: 'session-model',
                label: 'Session Model',
                sublabel: 'Normes de l\'entreprise',
                icon: 'IconShieldCheck',
                routeName: 'session-model',
                group: 'planning',
            },
            {
                id: 'session-template',
                label: 'Session Template',
                sublabel: 'Emplois du temps standards',
                icon: 'IconCalendarEvent',
                routeName: 'session-template',
                group: 'planning',
            },
            {
                id: 'rotation-group',
                label: 'Rotation Group',
                sublabel: 'Modèles de rotation',
                icon: 'IconRefresh',
                routeName: 'rotation-group',
                group: 'planning',
            },
            {
                id: 'schedule-assignment',
                label: 'Schedule Assignment',
                sublabel: 'Plannings officiellement publiés',
                icon: 'IconCalendarStats',
                routeName: 'schedule-assignment',
                group: 'planning',
            },
            {
                id: 'rotation-assignment',
                label: 'Rotation Assignment',
                sublabel: 'Affectation des rotations',
                icon: 'IconArrowsLeftRight',
                routeName: 'rotation-assignment',
                group: 'planning',
            },
            {
                id: 'assignment-history',
                label: 'Historique',
                sublabel: 'Historique des assignations',
                icon: 'IconCalendarSmile',
                routeName: 'assignment-history',
                group: 'planning',
            },
        ],
    },
]

export const SIDEBAR_WIDTH = '220px'
