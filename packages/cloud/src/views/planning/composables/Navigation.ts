import type { NavGroup } from './navigation.type'

export const NAV_GROUPS: NavGroup[] = [
    {
        id: 'planning',
        label: 'PLANNING & ROTATIONS',
        items: [
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
                sublabel: 'Affectation des emplois du temps',
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
        ],
    },
]

// ── Constants ──────────────────────────────────────────────────────────────
export const SIDEBAR_WIDTH = '220px'