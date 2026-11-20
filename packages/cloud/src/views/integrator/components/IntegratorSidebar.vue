<template>
  <aside class="flex w-full flex-col bg-[#12243d] text-slate-200 lg:min-h-screen lg:w-[252px] lg:shrink-0">
    <div class="flex items-center gap-3 border-b border-white/10 px-6 py-6">
      <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2663ca] text-white shadow-lg shadow-blue-950/30"><Squares2X2Icon class="h-6 w-6" /></div>
      <div><div class="text-xl font-extrabold tracking-tight text-white">TOKÉ</div><div class="text-[11px] font-semibold tracking-[.18em] text-slate-400">INTEGRATOR CONSOLE</div></div>
    </div>
    <nav class="flex gap-1 overflow-x-auto p-3 lg:mt-5 lg:flex-col lg:gap-2 lg:px-4" aria-label="Navigation intégrateur">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-white/10 hover:text-white" :class="active(link.to) ? 'bg-[#2663ca] text-white shadow-lg shadow-blue-900/20' : 'text-slate-300'">
        <component :is="link.icon" class="h-5 w-5" /><span>{{ link.label }}</span>
      </RouterLink>
    </nav>
    <div class="mt-auto hidden border-t border-white/10 p-5 lg:block"><div class="flex items-center gap-3 rounded-xl bg-white/[.06] p-3"><div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#334c70] text-xs font-bold text-white">IT</div><div class="min-w-0"><p class="text-xs font-semibold text-white">Session intégrateur</p><p class="truncate text-xs text-slate-400">{{ store.email }}</p></div></div></div>
  </aside>
</template>
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { HomeIcon, BuildingOffice2Icon, Squares2X2Icon } from '@heroicons/vue/24/outline'
import { useIntegratorStore } from '@/stores/integratorStore'
const route = useRoute(); const store = useIntegratorStore()
const links = [{ to:'/integrateur',label:'Vue d’ensemble',icon:HomeIcon },{to:'/integrateur/tenants',label:'Entreprises',icon:BuildingOffice2Icon}]
const active = (path:string) => path === '/integrateur' ? route.path === path : route.path.startsWith(path)
</script>
