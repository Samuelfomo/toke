import type { RouteRecordRaw } from 'vue-router'

export const planningSuggestionRoutes: RouteRecordRaw = {
    path: 'planning-suggestion',
    component: () =>
        import('@/views/planning/suggestion/PlanningSuggestionLayout.vue'),
    meta: {
        sidebarRouteName: 'planning-menu',
    },
    children: [
        {
            path: '',
            name: 'planning-suggestion-dashboard',
            component: () =>
                import(
                    '@/views/planning/suggestion/dashboard/SuggestionDashboard.vue'
                    ),
            meta: {
                title: 'Planification assistée',
            },
        },
        {
            path: 'profiles',
            name: 'planning-suggestion-profiles',
            component: () =>
                import(
                    '@/views/planning/suggestion/profiles/EmployeePlanningProfileList.vue'
                    ),
            meta: {
                title: 'Profils de planification',
            },
        },
        {
            path: 'requirements',
            name: 'planning-suggestion-requirements',
            component: () =>
                import(
                    '@/views/planning/suggestion/requirements/PlanningRequirementList.vue'
                    ),
            meta: {
                title: 'Besoins de couverture',
            },
        },
        {
            path: 'configuration',
            name: 'planning-suggestion-configuration',
            component: () =>
                import(
                    '@/views/planning/suggestion/configuration/PlanningConfigView.vue'
                    ),
            meta: {
                title: 'Règles de planification',
            },
        },
        {
            path: 'configuration/new',
            name: 'planning-suggestion-configuration-new',
            component: () =>
                import(
                    '@/views/planning/suggestion/configuration/PlanningConfigEditorView.vue'
                    ),
            meta: {
                title: 'Créer une configuration',
            },
        },
        {
            path: 'configuration/edit',
            name: 'planning-suggestion-configuration-edit',
            component: () =>
                import(
                    '@/views/planning/suggestion/configuration/PlanningConfigEditorView.vue'
                    ),
            meta: {
                title: 'Modifier la configuration',
            },
        },
        {
            path: 'suggestions',
            name: 'planning-suggestion-list',
            component: () =>
                import(
                    '@/views/planning/suggestion/suggestions/ScheduleSuggestionList.vue'
                    ),
            meta: {
                title: 'Suggestions de planning',
            },
        },
        {
            path: 'suggestions/:guid',
            name: 'planning-suggestion-preview',
            component: () =>
                import(
                    '@/views/planning/suggestion/suggestions/ScheduleSuggestionPreview.vue'
                    ),
            props: true,
            meta: {
                title: 'Aperçu de la suggestion',
            },
        },
    ],
}
