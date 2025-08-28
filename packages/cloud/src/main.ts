import { createApp } from 'vue';
import App from './App.vue';
import './assets/main.css'; // <-- Tailwind CSS
import router from './router'; // si tu utilises Vue Router
import { createPinia } from 'pinia';

const app = createApp(App);
app.use(createPinia());
console.log('[MAIN.TS] router:', router);
app.use(router);
app.mount('#app');
