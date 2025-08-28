import { createRouter, createWebHistory} from 'vue-router'
import Home from "./views/home.vue";
import Country from "./views/country.vue"

const routes = [
    {
        path: '/home',
        name: 'home',
        component: Home
    },
    {
        path: '/',
        name: 'country',
        component: Country
    },
]
const router = createRouter({
    history: createWebHistory(),
    routes,
})
export default router