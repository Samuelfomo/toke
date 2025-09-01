/// <reference types="vite/client" />

// Déclare le module pour TypeScript
declare module '@vitejs/plugin-vue' {
    import type { Plugin } from 'vite'
    const vuePlugin: () => Plugin
    export default vuePlugin
}

// Déclare tous les fichiers .vue pour TypeScript
declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

declare module '*.css?url' {
  const content: string
  export default content
}

