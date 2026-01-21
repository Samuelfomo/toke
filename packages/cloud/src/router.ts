import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'


// Views
import Home from './views/home.vue'
import Country from './views/country.vue'
import Auth from './views/auth.vue'
import Otp from './views/otp.vue'
import DashboardMain from './views/dashboard/dashboardMain.vue'
import MemoNew from './views/memo/memoNew.vue'
import Module from './views/module.vue'
import AssiduteDuJour from './views/AssiduteDuJour.vue'
import Equipe from './views/equipe.vue'
import MemoList from './views/memo/memoList.vue'
import EmployeeDetails from './views/EmployeeDetails.vue'
import Planning from './views/planning.vue'
import Profile from './views/profile.vue'
import EmployeeForm from './views/employeeForm.vue'
import Setting from './views/setting.vue'
import MemoDetails from './views/memo/memoDetails.vue';
import Site from './views/site/site.vue';
import Edit from './views/site/siteForm.vue';
import MapVue from './views/site/siteMap.vue';

import { useUserStore } from '@/composables/userStore'


const routes: RouteRecordRaw[] = [
  // ✅ PUBLIC
  {
    path: '/',
    name: 'auth',
    component: Auth,
  },
  {
    path: '/otp',
    name: 'otp',
    component: Otp,
  },
  {
    path: '/country',
    name: 'country',
    component: Country,
  },

  // ✅ PROTÉGÉES
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardMain,
    meta: { requiresAuth: true },
  },
  {
    path: '/home',
    name: 'home',
    component: Home,
    meta: { requiresAuth: true },
  },
  {
    path: '/memoNew/:employeeId',
    name: 'memoNew',
    component: MemoNew,
    meta: { requiresAuth: true },
  },
  {
    path: '/module',
    name: 'module',
    component: Module,
    meta: { requiresAuth: true },
  },
  {
    path: '/employee/:employeeId/details',
    name: 'employeeD',
    component: AssiduteDuJour,
    meta: { requiresAuth: true },
  },
  {
    path: '/equipe',
    name: 'equipe',
    component: Equipe,
    meta: { requiresAuth: true },
  },{
    path: '/sites',
    name: 'sites',
    component: Site,
    meta: { requiresAuth: true },
  },{
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
    path: '/memoList',
    name: 'memoList',
    component: MemoList,
    meta: { requiresAuth: true },
  },
  {
    path: '/memoDetails/:id',
    name: 'memoDetails',
    component: MemoDetails,
    meta: { requiresAuth: true },
  },
  {
    path: '/planning',
    name: 'planning',
    component: Planning,
    meta: { requiresAuth: true },
  },
  {
    path: '/employeeForm',
    name: 'employeeForm',
    component: EmployeeForm,
    meta: { requiresAuth: true },
  },
  {
    path: '/equipe/:employeeId',
    name: 'employee-details',
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

// /* ✅✅✅ GARDE L’ACCÈS COMME AVANT (VERSION TS PROPRE) ✅✅✅ */
// router.beforeEach((to, from, next) => {
//   const userStore = useUserStore()
//
//   if (to.meta.requiresAuth && !userStore.checkSession()) {
//     console.warn('⛔ Accès refusé, redirection login')
//     next('/')
//   } else {
//     next()
//   }
// })

export default router


// import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
//
// import Home from './views/home.vue';
// import Country from './views/country.vue';
// import Auth from './views/auth.vue';
// import Otp from './views/otp.vue';
// import DashboardMain from './views/dashboard/dashboardMain.vue';
// import MemoNew from './views/memo/memoNew.vue';
// import Module from './views/module.vue';
// import AssiduteDuJour from './views/AssiduteDuJour.vue';
// import Equipe from './views/equipe.vue';
// import MemoList from './views/memo/memoList.vue';
// import MemoDetail from './views/memo/memoDetail.vue';
// import EmployeeDetails from './views/EmployeeDetails.vue';
// import Planning from './views/planning.vue';
// import employeeForm from './views/employeeForm.vue';
//
// // Typage explicite des routes
// const routes: RouteRecordRaw[] = [
//   {
//     path: '/home',
//     name: 'home',
//     component: Home,
//   },
//   {
//     path: '/country',
//     name: 'country',
//     component: Country,
//   },{
//     path: '/',
//     name: 'auth',
//     component: Auth,
//   },
//   {
//     path: '/otp',
//     name: 'otp',
//     component: Otp,
//   },
//   {
//     path: '/dashboard',
//     name: 'dashboard',
//     component: DashboardMain,
//   },
//   {
//     path: '/memo',
//     name: 'memo',
//     component: MemoNew,
//     props: route => ({
//       employee: {
//         id: parseInt(Array.isArray(route.params.employeeId) ? route.params.employeeId[0] : (route.params.employeeId as string)),
//         name: Array.isArray(route.query.employeeName) ? route.query.employeeName[0] : (route.query.employeeName as string),
//         initials: Array.isArray(route.query.employeeInitials) ? route.query.employeeInitials[0] : (route.query.employeeInitials as string),
//         status: Array.isArray(route.query.employeeStatus) ? route.query.employeeStatus[0] : (route.query.employeeStatus as string),
//         statusText: Array.isArray(route.query.employeeStatusText) ? route.query.employeeStatusText[0] : (route.query.employeeStatusText as string),
//         location: Array.isArray(route.query.employeeLocation) ? route.query.employeeLocation[0] : (route.query.employeeLocation as string),
//       }
//     })
//
//   },
//   {
//     path: '/module',
//     name: 'module',
//     component: Module,
//   },
//   {
//     path: '/employee/:employeeId/details',
//     name: 'employeeD',
//     component: AssiduteDuJour
//   },
//   {
//     path: '/equipe',
//     name: 'equipe',
//     component: Equipe
//   },
//   {
//     path: '/memoList',
//     name: 'memoList',
//     component: MemoList
//   },
//   {
//     path: '/memoDetail',
//     name: 'memoDetail',
//     component: MemoDetail
//   },
//   {
//     path: '/planning',
//     name: 'planning',
//     component: Planning
//   },
//   {
//     path: '/employeeForm',
//     name: 'employeeForm',
//     component: employeeForm
//   },
//   {
//     path: '/equipe/:employeeId',  // ← IMPORTANT: :employeeId (avec deux points)
//     name: 'employee-details',
//     component: EmployeeDetails
//   }
// ];
//
// export const router = createRouter({
//   history: createWebHistory(),
//   routes,
// });
//
// export default router;
