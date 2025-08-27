import { createApp } from 'vue';
import App from './App.vue';
import './assets/main.css'; // <-- Tailwind CSS
import router from './router'; // si tu utilises Vue Router
import { createPinia } from 'pinia';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
