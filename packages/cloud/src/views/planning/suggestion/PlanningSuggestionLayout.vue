<template>
    <div class="min-h-full bg-slate-50/70">
        <div class="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
            <section class="relative overflow-hidden rounded-lg bg-[#004aad] px-6 py-6 text-white shadow-xl shadow-slate-950/10 sm:px-8">
                <div class="absolute inset-0 opacity-70">
                    <div class="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
                    <div class="absolute bottom-0 left-1/3 h-40 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
                </div>
                <div class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div class="max-w-3xl">
                        <div class="flex items-center gap-2 text-xs font-semibold text-indigo-200">
                            <IconSparkles :size="16" />
                            <span>Planification intelligente sous contraintes</span>
                        </div>
                        <h1 class="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Planification assistée</h1>
                        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                            Configurez les collaborateurs, les besoins et les règles, puis générez un brouillon contrôlable avant publication.
                        </p>
                    </div>
                    <div class="grid grid-cols-2 gap-3 sm:flex">
                        <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                            <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Moteur</p>
                            <p class="mt-1 flex items-center gap-2 text-sm font-semibold"><span class="h-2 w-2 rounded-full bg-emerald-400" />OR-Tools</p>
                        </div>
                        <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                            <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Méthode</p>
                            <p class="mt-1 text-sm font-semibold">Configurer → Vérifier</p>
                        </div>
                    </div>
                </div>
            </section>

            <nav class="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
                <div class="flex min-w-max items-center gap-1">
                    <RouterLink v-for="item in navigation" :key="item.routeName" :to="{ name: item.routeName }"
                        class="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition"
                        :class="isActive(item.routeName) ? 'bg-[#004aad] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200 bg-slate-100 hover:text-slate-900'">
                        <component :is="item.icon" :size="17" stroke-width="1.8" />
                        {{ item.label }}
                    </RouterLink>
                </div>
            </nav>

            <main class="py-6"><RouterView /></main>
        </div>
    </div>
</template>
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { IconChartDots3, IconSettings, IconSparkles, IconTargetArrow, IconUsersGroup, IconWand } from '@tabler/icons-vue'
const route = useRoute()
const navigation = [
    { label:'Vue d’ensemble', routeName:'planning-suggestion-dashboard', icon:IconChartDots3 },
    { label:'Profils employés', routeName:'planning-suggestion-profiles', icon:IconUsersGroup },
    { label:'Besoins & couverture', routeName:'planning-suggestion-requirements', icon:IconTargetArrow },
    { label:'Règles du moteur', routeName:'planning-suggestion-configuration', icon:IconSettings },
    { label:'Suggestions', routeName:'planning-suggestion-list', icon:IconWand },
]
function isActive(name:string):boolean {
    if (name === 'planning-suggestion-list') return ['planning-suggestion-list','planning-suggestion-preview'].includes(String(route.name))
    return route.name === name
}
</script>
