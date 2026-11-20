import type { RouteRecordRaw } from 'vue-router'

import AppLayout from '@/views/planning/dashboard/appLayout.vue'
import PlanningMenuView from '@/views/planning/menu/PlanningMenuView.vue'
import SessionModelList from '@/views/planning/session_model/sessionModelList.vue'
import SessionTemplateList from '@/views/planning/session_template/sessionTemplateList.vue'
import RotationGroupList from '@/views/planning/rotation_group/rotationGroupList.vue'
import ScheduleAssignmentList from '@/views/planning/schedule_assignment/scheduleAssignmentList.vue'
import RotationAssignment from '@/views/planning/rotation_assignment/rotationAssignment.vue'
import AssignmentHistoryView from '@/views/planning/assignment_history/AssignmentHistoryView.vue'
import { planningSuggestionRoutes } from '@/router/planning-suggestion'

export const planningRoutes: RouteRecordRaw = {
  path: '/planning',
  component: AppLayout,
  meta: {
    requiresAuth: true,
    sidebarRouteName: 'planning-menu',
  },
  children: [
    {
      path: '',
      name: 'planning-menu',
      component: PlanningMenuView,
      meta: {
        title: 'Gestion des plannings',
      },
    },
    planningSuggestionRoutes,
    {
      path: 'session-model',
      name: 'session-model',
      component: SessionModelList,
      meta: {
        title: 'Modèles de journées',
      },
    },
    {
      path: 'session-template',
      name: 'session-template',
      component: SessionTemplateList,
      meta: {
        title: 'Horaires types',
      },
    },
    {
      path: 'rotation-group',
      name: 'rotation-group',
      component: RotationGroupList,
      meta: {
        title: 'Groupes de rotation',
      },
    },
    {
      path: 'schedule-assignment',
      name: 'schedule-assignment',
      component: ScheduleAssignmentList,
      meta: {
        title: 'Plannings publiés',
      },
    },
    {
      path: 'rotation-assignment',
      name: 'rotation-assignment',
      component: RotationAssignment,
      meta: {
        title: 'Affectations de rotation',
      },
    },
    {
      path: 'assignment-history',
      name: 'assignment-history',
      component: AssignmentHistoryView,
      meta: {
        title: 'Historique des affectations',
      },
    },
  ],
}
