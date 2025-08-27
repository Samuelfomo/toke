import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
       },
        },
    server: {
        fs: {
            // Permet à Vite d'accéder à ces dossiers depuis le serveur
            allow: [
                resolve(__dirname, 'src'),
                resolve(__dirname, 'public'),
                resolve(__dirname, 'node_modules'),
            ],
        },
        open: true, // Ouvre automatiquement le navigateur
        host: true, // Permet l'accès depuis le réseau local
        port: 5173, // Port du serveur dev
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id: string) {
                    // Séparer les dépendances externes dans un chunk "vendor"
                    if (id.includes('node_modules')) {
                        return 'vendor'
                    }
                },
            },
        },
    },
})
