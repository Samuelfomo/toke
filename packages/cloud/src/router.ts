import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'


// Views
import Auth from './views/auth.vue'
import Otp from './views/otp.vue'
import DashboardMain from './views/dashboard/dashboardMain.vue'
import PointageMain from './views/pointages/pointagesMain.vue'
import PointagesPrint from './views/pointages/pointagesPrint.vue'
import Equipe from './views/equipe.vue'
import EmployeeForm from './views/employeeForm.vue'
import MemoList from './views/memo/memosView.vue'
import MemoCreated from './views/memo/memoCreateChat.vue'
import EmployeeDetails from './views/EmployeeDetails.vue'
import Schedule from './views/schedule/schedule.vue'
import Profile from './views/profile.vue'
import Setting from './views/setting.vue'
import ProfileCard from './views/profileCard.vue';
import Site from './views/site/site.vue';
import Edit from './views/site/siteForm.vue';
import MapVue from './views/site/map.vue';

import { useUserStore } from '@/stores/userStore'
import EmployeeSchedulesView from "@/views/schedule/employeeSchedulesView.vue";
import EmployeeAttendanceView from "@/views/employeeAttendanceView.vue";
import QrCodeAuth from "@/views/QrCodeAuth.vue";
import { planningRoutes } from '@/router/planning'
import  AttendanceStatisticsOverview from '@/views/dashboard/AttendanceStatisticsRouteView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/auth',
    name: 'auth',
    component: Auth,
  },
  {
    path: '/',
    name: 'linked',
    component: QrCodeAuth,
  },
  {
    path: '/otp',
    name: 'otp',
    component: Otp,
  },

  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardMain,
    meta: { requiresAuth: true },
  },
    {
    path: '/pointages',
    name: 'Pointages',
    component: PointageMain,
    meta: { requiresAuth: true },
  },
    {
        path: '/pointages/print',
        name: 'PointagesPrint',
        component: PointagesPrint,
        meta: { requiresAuth: true },
    },
  {
    path: '/equipe',
    name: 'equipe',
    component: Equipe,
    meta: { requiresAuth: true },
  },
    {
    path: '/employeeCreate',
    name: 'employeeCreate',
    component: EmployeeForm,
    meta: { requiresAuth: true },
  },
    {
        path: '/employeeEdit/:id',
        name: 'employeeEdit',
        component: EmployeeForm,
        meta: { requiresAuth: true },
    },
  {
    path: '/memoList',
    name: 'memoList',
    component: MemoList,
    meta: { requiresAuth: true },
  },
    {
    path: '/MemoCreated',
    name: 'MemoCreated',
    component: MemoCreated,
    meta: { requiresAuth: true },
  },
  {
    path: '/schedule',
    name: 'schedule',
    component: Schedule,
    meta: { requiresAuth: true },
  },
  {
    path: '/employeeDetails/:id',
    name: 'employeeDetails',
    component: EmployeeDetails,
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'profile',
    component: Profile,
    meta: { requiresAuth: true },

  },
  {
    path: '/setting',
    name: 'setting',
    component: Setting,
    meta: { requiresAuth: true },

  },
  {
    path: '/profileCard/:id',
    name: 'profileCard',
    component: ProfileCard,
    meta: { requiresAuth: true },

  },
  {
    path: '/sites',
    name: 'sites',
    component: Site,
    meta: { requiresAuth: true },
  },
  {
    path: '/sites/edit',
    name: 'edit',
    component: Edit,
    meta: { requiresAuth: false },
  },
  {
    path: '/sites/add',
    name: 'add',
    component: Edit,
    meta: { requiresAuth: true },
  },
  {
    path: '/sites/map',
    name: 'map',
    component: MapVue,
    meta: { requiresAuth: true },
  },
  {
    path: '/employeeSchedulesView/:id',
    name: 'employeeSchedulesView',
    component: EmployeeSchedulesView,
    meta: { requiresAuth: true },
  },
  {
    path: '/employeeAttendanceView/:id',
    name: 'employeeAttendanceView',
    component: EmployeeAttendanceView,
    meta: { requiresAuth: true },
  },
    {
    path: '/at',
    name: 'at',
    component: AttendanceStatisticsOverview,
    meta: { requiresAuth: true },
  },
    planningRoutes,
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

/* ✅✅✅ GARDE D'ACCÈS GLOBALE ET LOGIQUE DE REDIRECTION (24h) ✅✅✅ */
router.beforeEach((to, from, next) => {

  const userStore = useUserStore() // À supprimer ou commenter

  const isAuthenticated = userStore.checkSession() // 🟢 Vérification 24h

  // 1. 🛑 GARDE INVERSE : BLOCAGE DES PAGES PUBLIC/LOGIN (Correction pour la flèche retour)
  // Si l'utilisateur est connecté ET essaie d'accéder aux pages publiques
  if (isAuthenticated && (to.path === '/' || to.path === '/otp' || to.path === '/country')) {
    console.warn('⛔ Manager connecté. Redirection vers le tableau de bord.')
    // L'utilisation de 'return next("/dashboard")' FORCE la navigation.
    return next('/dashboard')
  }

  // 2. 🔒 PROTECTION DES PAGES PRIVÉES (requiresAuth)
  // Si la route nécessite une authentification ET l'utilisateur n'est PAS connecté
  if (to.meta.requiresAuth && !isAuthenticated) {
    console.warn('⛔ Accès refusé (Non connecté ou Token expiré). Redirection login')
    return next('/')
  }

  // 3. ✅ LAISSER PASSER
  next()
})


export default router
