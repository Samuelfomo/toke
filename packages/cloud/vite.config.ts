import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'path'; // https://vitejs.dev/config/

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // '@': resolve(__dirname, 'src'),
      '@toke/shared': resolve(__dirname, '../shared/dist'),
    },
  },
  server: {
    fs: {
      // Permet à Vite d'accéder à ces dossiers depuis le serveur
      allow: [
        resolve(__dirname, 'src'),
        resolve(__dirname, 'public'),
        resolve(__dirname, 'node_modules'),
        // resolve(__dirname, '../../shared/src'), // <-- autoriser l'accès à shared
        // 🧩 ajoute la racine du projet cloud
        __dirname,
        // 🧩 et la racine du monorepo si nécessaire
        resolve(__dirname, '../..'),
      ],
    },
    open: true, // Ouvre automatiquement le navigateur
    host: true, // Permet l'accès depuis le réseau local
    // port: 5173, // Port du serveur dev
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Séparer les dépendances externes dans un chunk "vendor"
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});
