import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import './assets/css/main.css';
import { router } from './router'; // <-- en TypeScript, ça va chercher router.ts

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
