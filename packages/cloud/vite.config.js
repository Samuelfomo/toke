"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_url_1 = require("node:url");
const path_1 = require("path"); // https://vitejs.dev/config/
const vite_1 = require("vite");
const plugin_vue_1 = __importDefault(require("@vitejs/plugin-vue"));
// https://vitejs.dev/config/
module.exports = (0, vite_1.defineConfig)({
    plugins: [(0, plugin_vue_1.default)()],
    resolve: {
        alias: {
            '@': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./src', import.meta.url)),
            // '@': resolve(__dirname, 'src'),
            '@toke/shared': (0, path_1.resolve)(__dirname, '../shared/dist'),
        },
    },
    server: {
        fs: {
            // Permet à Vite d'accéder à ces dossiers depuis le serveur
            allow: [
                (0, path_1.resolve)(__dirname, 'src'),
                (0, path_1.resolve)(__dirname, 'public'),
                (0, path_1.resolve)(__dirname, 'node_modules'),
                // resolve(__dirname, '../../shared/src'), // <-- autoriser l'accès à shared
            ],
        },
        open: true, // Ouvre automatiquement le navigateur
        host: true, // Permet l'accès depuis le réseau local
        // port: 5173, // Port du serveur dev
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // Séparer les dépendances externes dans un chunk "vendor"
                    if (id.includes('node_modules')) {
                        return 'vendor';
                    }
                },
            },
        },
    },
});
