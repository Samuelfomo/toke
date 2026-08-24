<template>
  <div class="min-h-full">
    <div class="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 bg-slate-50/30">
      <RouterLink
          :to="{ name: 'planning-menu' }"
          class="mb-4 inline-flex min-h-11 items-center gap-2 bg-white/70 rounded-xl px-2 text-sm font-semibold text-slate-600 no-underline transition hover:bg-white hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <IconArrowLeft :size="18"/>
        Retour aux outils de planification
      </RouterLink>

      <section
          class="relative overflow-hidden rounded-3xl bg-blue-700 px-5 py-6 text-white shadow-xl shadow-slate-950/10 sm:px-8 sm:py-7">
        <div class="pointer-events-none absolute inset-0" aria-hidden="true">
          <div class="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"/>
          <div class="absolute bottom-0 left-1/3 h-40 w-72 rounded-full bg-blue-400/20 blur-3xl"/>
        </div>

        <div class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="max-w-3xl">
            <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-100">
              <IconSparkles :size="17"/>
              <span>Planification intelligente sous contraintes</span>
            </div>
            <h1 class="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Planification assistée
            </h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
              Configurez les collaborateurs, les besoins et les règles, puis générez un brouillon contrôlable avant
              publication.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:flex">
            <div class="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p class="text-xs font-bold uppercase tracking-wide text-blue-100">
                Moteur
              </p>
              <p class="mt-1 flex items-center gap-2 text-sm font-semibold">
                <span class="h-2 w-2 rounded-full bg-emerald-400"/>
                OR-Tools
              </p>
            </div>
            <div class="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p class="text-xs font-bold uppercase tracking-wide text-blue-100">
                Parcours
              </p>
              <p class="mt-1 text-sm font-semibold">Configurer → Vérifier</p>
            </div>
          </div>
        </div>
      </section>

      <nav
          class="tf-scroll-area mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
          aria-label="Étapes de la planification assistée"
      >
        <div class="flex min-w-max items-center gap-1">
          <RouterLink
              v-for="item in navigation"
              :key="item.routeName"
              :to="{ name: item.routeName }"
              class="flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold no-underline transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              :class="isActive(item.routeName)
              ? 'bg-blue-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
              :aria-current="isActive(item.routeName) ? 'page' : undefined"
          >
            <component :is="item.icon" :size="18" stroke-width="1.8"/>
            {{ item.label }}
          </RouterLink>
        </div>
      </nav>

      <div class="py-6">
        <RouterView/>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {useRoute} from 'vue-router'
import {
  IconArrowLeft,
  IconChartDots3,
  IconSettings,
  IconSparkles,
  IconTargetArrow,
  IconUsersGroup,
  IconWand,
} from '@tabler/icons-vue'

const route = useRoute()

const navigation = [
  {label: 'Vue d’ensemble', routeName: 'planning-suggestion-dashboard', icon: IconChartDots3},
  {label: 'Profils employés', routeName: 'planning-suggestion-profiles', icon: IconUsersGroup},
  {label: 'Besoins & couverture', routeName: 'planning-suggestion-requirements', icon: IconTargetArrow},
  {label: 'Règles de planification', routeName: 'planning-suggestion-configuration', icon: IconSettings},
  {label: 'Suggestions', routeName: 'planning-suggestion-list', icon: IconWand},
]

function isActive(name: string): boolean {
  if (name === 'planning-suggestion-list') {
    return ['planning-suggestion-list', 'planning-suggestion-preview'].includes(String(route.name))
  }

  if (name === 'planning-suggestion-configuration') {
    return [
      'planning-suggestion-configuration',
      'planning-suggestion-configuration-new',
      'planning-suggestion-configuration-edit',
    ].includes(String(route.name))
  }

  return route.name === name
}
</script>
