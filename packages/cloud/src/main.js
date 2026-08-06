"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vue_1 = require("vue");
const pinia_1 = require("pinia");
const App_vue_1 = __importDefault(require("./App.vue"));
require("./assets/main.css");
const router_1 = require("./router"); // <-- en TypeScript, ça va chercher router.ts
const app = (0, vue_1.createApp)(App_vue_1.default);
app.use((0, pinia_1.createPinia)());
app.use(router_1.router);
app.mount('#app');
