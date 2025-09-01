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
  },{
    path: '/otp',
    name: 'otp',
    component: Otp,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

// export router;
