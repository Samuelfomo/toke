// import { createRouter, createWebHistory} from 'vue-router'
// import Home from "./views/home.vue";
// import Country from "./views/country.vue"
//
// const routes = [
//     {
//         path: '/home',
//         name: 'home',
//         component: Home
//     },
//     {
//         path: '/',
//         name: 'country',
//         component: Country
//     },
// ]
// const router = createRouter({
//     history: createWebHistory(),
//     routes,
// })
// export default router

import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

import Home from './views/home.vue';
import Country from './views/country.vue';
import Auth from './views/auth.vue';
import Otp from './views/otp.vue';
import Welcome from './views/welcome.vue';
import DashboardMain from './views/dashboard/dashboardMain.vue';
import Memo from './views/memo.vue';
import Module from './views/module.vue';
import EmployeeDetails from './views/EmployeeDetails.vue';
// Typage explicite des routes

// Typage explicite des routes
const routes: RouteRecordRaw[] = [
  {
    path: '/home',
    name: 'home',
    component: Home,
  },
  {
    path: '/country',
    name: 'country',
    component: Country,
  },{
    path: '/',
    name: 'auth',
    component: Auth,
  },
  {
    path: '/welcome',
    name: 'welcome',
    component: Welcome,
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
  },
  {
    path: '/memo',
    name: 'memo',
    component: Memo,
    props: route => ({
      employee: {
        id: parseInt(Array.isArray(route.params.employeeId) ? route.params.employeeId[0] : (route.params.employeeId as string)),
        name: Array.isArray(route.query.employeeName) ? route.query.employeeName[0] : (route.query.employeeName as string),
        initials: Array.isArray(route.query.employeeInitials) ? route.query.employeeInitials[0] : (route.query.employeeInitials as string),
        status: Array.isArray(route.query.employeeStatus) ? route.query.employeeStatus[0] : (route.query.employeeStatus as string),
        statusText: Array.isArray(route.query.employeeStatusText) ? route.query.employeeStatusText[0] : (route.query.employeeStatusText as string),
        location: Array.isArray(route.query.employeeLocation) ? route.query.employeeLocation[0] : (route.query.employeeLocation as string),
      }
    })

  },
  {
    path: '/module',
    name: 'module',
    component: Module,
  },
  {
    path: '/employee/:employeeId/details',
    name: 'employeeD',
    component: EmployeeDetails
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
