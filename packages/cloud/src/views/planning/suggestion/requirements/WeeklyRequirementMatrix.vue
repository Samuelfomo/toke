<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 class="text-sm font-bold text-slate-900">Matrice hebdomadaire</h2>
        <p class="mt-1 text-xs leading-4 text-slate-500">
          Chaque ligne représente un service. Chaque cellule contient les règles applicables au jour concerné.
        </p>
      </div>
      <div class="flex items-center gap-3 text-xs font-semibold text-slate-500">
        <span class="flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-full bg-white ring-1 ring-slate-300" /> Actif</span>
        <span class="flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-full bg-slate-200" /> Inactif</span>
        <span class="flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-full bg-red-100 ring-1 ring-red-300" /> Doublon</span>
      </div>
    </header>

    <div v-if="!rows.length" class="px-6 py-14 text-center">
      <IconCalendarPlus :size="34" class="mx-auto text-slate-300" />
      <p class="mt-4 text-sm font-bold text-slate-800">Aucun service dans la matrice</p>
      <p class="mt-1 text-xs text-slate-500">Ajoutez un premier besoin pour créer une ligne de couverture.</p>
      <button
        type="button"
        class="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
        @click="$emit('create', 'Mon', null)"
      >
        <IconPlus :size="15" />
        Ajouter le premier besoin
      </button>
    </div>

    <template v-else>
      <div class="tf-scroll-area hidden overflow-x-auto lg:block">
        <table class="w-full min-w-[1280px] border-separate border-spacing-0">
          <thead>
            <tr class="bg-slate-50/80">
              <th class="sticky left-0 z-10 w-60 border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                Service
              </th>
              <th
                v-for="day in DAY_ORDER"
                :key="day"
                class="min-w-[145px] border-b border-slate-200 px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
              >
                {{ DAY_LABELS[day] }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.key" class="align-top">
              <th class="sticky left-0 z-[5] border-b border-r border-slate-200 bg-white px-4 py-4 text-left">
                <div class="flex items-start gap-3">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    :class="row.serviceType === 'GUARD'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-blue-100 text-blue-700'"
                  >
                    <IconMoonStars v-if="row.serviceType === 'GUARD'" :size="17" />
                    <IconSun v-else :size="17" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-xs font-bold text-slate-900">{{ row.templateName }}</p>
                    <p class="mt-1 text-xs font-semibold text-slate-500">
                      {{ row.serviceType === 'GUARD' ? 'Garde' : 'Service standard' }}
                    </p>
                    <p v-if="row.continuationName" class="mt-1 truncate text-xs text-violet-600">
                      Suite : {{ row.continuationName }}
                    </p>
                  </div>
                </div>
              </th>
              <td
                v-for="day in DAY_ORDER"
                :key="day"
                class="border-b border-slate-200 p-2 align-top"
              >
                <RequirementMatrixCell
                  :day="day"
                  :requirements="row.requirementsByDay[day]"
                  :duplicate-guids="duplicateGuids"
                  @edit="$emit('edit', $event)"
                  @create="$emit('create', day, row.seedRequirement)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="space-y-5 p-4 lg:hidden">
        <section
          v-for="day in DAY_ORDER"
          :key="day"
          class="overflow-hidden rounded-2xl border border-slate-200"
        >
          <header class="flex items-center justify-between bg-slate-50 px-4 py-3">
            <div>
              <h3 class="text-xs font-bold text-slate-900">{{ DAY_LABELS[day] }}</h3>
              <p class="mt-0.5 text-xs text-slate-500">{{ dayRequirementCount(day) }} règle(s)</p>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600"
              @click="$emit('create', day, null)"
            >
              <IconPlus :size="12" /> Nouveau service
            </button>
          </header>

          <div class="divide-y divide-slate-100">
            <article v-for="row in rows" :key="row.key" class="p-3">
              <div class="mb-2 flex items-center gap-2">
                <IconMoonStars v-if="row.serviceType === 'GUARD'" :size="14" class="text-violet-600" />
                <IconSun v-else :size="14" class="text-blue-600" />
                <p class="text-xs font-bold text-slate-800">{{ row.templateName }}</p>
              </div>
              <RequirementMatrixCell
                :day="day"
                :requirements="row.requirementsByDay[day]"
                :duplicate-guids="duplicateGuids"
                @edit="$emit('edit', $event)"
                @create="$emit('create', day, row.seedRequirement)"
              />
            </article>
          </div>
        </section>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { IconCalendarPlus, IconMoonStars, IconPlus, IconSun } from '@tabler/icons-vue'

import { DAY_LABELS, DAY_ORDER } from '../planningSuggestion.helpers'
import type { PlanningDayKey, PlanningRequirement } from '../planningSuggestion.type'
import RequirementMatrixCell from './RequirementMatrixCell.vue'
import type { RequirementMatrixRow } from './requirementMatrix.helpers'

const props = withDefaults(
  defineProps<{
    rows: RequirementMatrixRow[]
    duplicateGuids?: string[]
  }>(),
  {
    duplicateGuids: () => [],
  },
)

defineEmits<{
  edit: [requirement: PlanningRequirement]
  create: [day: PlanningDayKey, seedRequirement: PlanningRequirement | null]
}>()

function dayRequirementCount(day: PlanningDayKey): number {
  return props.rows.reduce(
    (total, row) => total + row.requirementsByDay[day].length,
    0,
  )
}
</script>
