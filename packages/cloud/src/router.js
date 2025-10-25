"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const vue_router_1 = require("vue-router");
const home_vue_1 = __importDefault(require("./views/home.vue"));
const country_vue_1 = __importDefault(require("./views/country.vue")); // Typage explicite des routes
// Typage explicite des routes
const routes = [
    {
        path: '/home',
        name: 'home',
        component: home_vue_1.default,
    },
    {
        path: '/',
        name: 'country',
        component: country_vue_1.default,
    },
];
exports.router = (0, vue_router_1.createRouter)({
    history: (0, vue_router_1.createWebHistory)(),
    routes,
});
// export router;
