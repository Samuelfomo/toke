<template>
  <div class="min-h-full">
    <div class="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header class="relative overflow-hidden rounded-3xl bg-blue-700 px-6 py-7 text-white shadow-xl shadow-slate-950/10 sm:px-8 sm:py-8 lg:px-10">
        <div class="pointer-events-none absolute inset-0" aria-hidden="true">
          <div class="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div class="absolute -bottom-28 left-1/3 h-64 w-96 rounded-full bg-blue-400/20 blur-3xl" />
        </div>

        <div class="relative max-w-3xl">
          <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-100">
            <IconLayoutGrid :size="18" />
            <span>Centre de gestion</span>
          </div>
          <h1 class="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Gestion des plannings
          </h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
            Choisissez l’outil adapté pour préparer les règles, construire les plannings et suivre les affectations de votre équipe.
          </p>
        </div>
      </header>

      <div class="mt-9 space-y-11">
        <section
          v-for="group in PLANNING_MENU_GROUPS"
          :key="group.id"
          :aria-labelledby="`${group.id}-title`"
        >
          <div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div>
              <h2
                :id="`${group.id}-title`"
                class="text-xl font-bold text-slate-900"
              >
                {{ group.title }}
              </h2>
              <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                {{ group.description }}
              </p>
            </div>
            <span class="text-xs font-semibold text-slate-500">
              {{ group.items.length }} {{ group.items.length > 1 ? 'outils' : 'outil' }}
            </span>
          </div>

          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <PlanningMenuCard
              v-for="item in group.items"
              :key="item.id"
              :item="item"
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconLayoutGrid } from '@tabler/icons-vue'

import PlanningMenuCard from './PlanningMenuCard.vue'
import { PLANNING_MENU_GROUPS } from './planningMenu.config'
</script>
