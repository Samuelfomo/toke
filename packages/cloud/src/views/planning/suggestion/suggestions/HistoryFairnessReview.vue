<template>
  <div class="space-y-4">
    <div
      v-if="loading"
      class="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50"
    >
      <div class="text-center">
        <IconLoader2 :size="24" class="mx-auto animate-spin text-blue-700" />
        <p class="mt-2 text-xs font-semibold text-slate-600">Analyse de l’historique d’équité…</p>
      </div>
    </div>

    <template v-else>
      <div
        v-if="review?.warning"
        class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800"
      >
        <strong>Historique indisponible.</strong>
        {{ review.warning.message }} La génération reste possible sans historique.
      </div>

      <div v-if="review" class="grid gap-3 sm:grid-cols-4">
        <div class="rounded-xl border border-slate-200 bg-white p-3.5">
          <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Fenêtre</p>
          <p class="mt-1 text-xs font-bold text-slate-800">
            {{ review.historyFrom ? formatDate(review.historyFrom) : '—' }} → {{ review.historyTo ? formatDate(review.historyTo) : '—' }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-3.5">
          <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Alertes</p>
          <p class="mt-1 text-xs font-bold" :class="review.anomalies.length ? 'text-amber-700' : 'text-emerald-700'">
            {{ review.anomalies.length }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-3.5">
          <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Jours de travail retenus</p>
          <p class="mt-1 text-xs font-bold text-slate-800">{{ review.summary.acceptedWorkRecords }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-3.5">
          <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Entrées neutralisées</p>
          <p class="mt-1 text-xs font-bold text-slate-800">{{ review.summary.ignoredAmbiguousRecords }}</p>
        </div>
      </div>

      <div
        v-if="!review?.anomalies.length"
        class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800"
      >
        Aucun historique ambigu détecté. Les charges précédentes serviront uniquement à équilibrer la nouvelle suggestion.
      </div>

      <div
        v-else
        class="max-h-[320px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 pr-2"
      >
        <article
          v-for="anomaly in review.anomalies"
          :key="anomaly.key"
          class="rounded-xl border border-amber-200 bg-white p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-700">
                  Avertissement
                </span>
                <span class="text-[10px] font-semibold text-slate-400">{{ formatDate(anomaly.date) }}</span>
              </div>
              <h4 class="mt-2 text-xs font-bold text-slate-900">{{ anomaly.templateName }}</h4>
              <p class="mt-1 text-xs leading-5 text-slate-600">{{ anomaly.message }}</p>
            </div>
          </div>

          <template v-if="anomaly.affectsFairness && anomaly.templateGuid">
            <div class="mt-3 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
              Tant qu’aucun collaborateur n’est retenu, cette situation est neutralisée dans le calcul d’équité. Elle ne bloque pas la génération.
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                @click="setAll(anomaly, true)"
              >
                Conserver tous
              </button>
              <button
                type="button"
                class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                @click="setAll(anomaly, false)"
              >
                Ignorer pour l’équité
              </button>
            </div>

            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <label
                v-for="employee in anomaly.employees"
                :key="employee.guid"
                class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
              >
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                  :checked="selectedFor(anomaly).includes(employee.guid)"
                  @change="toggle(anomaly, employee.guid)"
                />
                <span class="truncate">{{ employee.name }}</span>
              </label>
            </div>

            <p class="mt-2 text-[10px] font-semibold text-slate-500">
              {{ selectedFor(anomaly).length }} collaborateur(s) retenu(s) dans l’équité historique.
            </p>
          </template>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { IconLoader2 } from '@tabler/icons-vue'
import { formatDate } from '../planningSuggestion.helpers'
import type {
  PlanningHistoryAdjustment,
  PlanningHistoryAnomaly,
  PlanningHistoryReview,
} from '../planningSuggestion.type'

const props = defineProps<{
  review: PlanningHistoryReview | null
  adjustments: PlanningHistoryAdjustment[]
  loading: boolean
}>()

const emit = defineEmits<{
  'update:adjustments': [value: PlanningHistoryAdjustment[]]
}>()

function selectedFor(anomaly: PlanningHistoryAnomaly): string[] {
  if (!anomaly.templateGuid) return []
  return props.adjustments.find(
    (entry) => entry.date === anomaly.date && entry.template_guid === anomaly.templateGuid,
  )?.included_employee_guids ?? anomaly.selectedEmployeeGuids ?? []
}

function replaceAdjustment(
  anomaly: PlanningHistoryAnomaly,
  employeeGuids: string[],
): void {
  if (!anomaly.templateGuid) return
  const next = props.adjustments.filter(
    (entry) => !(entry.date === anomaly.date && entry.template_guid === anomaly.templateGuid),
  )
  next.push({
    date: anomaly.date,
    template_guid: anomaly.templateGuid,
    included_employee_guids: employeeGuids,
  })
  emit('update:adjustments', next)
}

function toggle(anomaly: PlanningHistoryAnomaly, employeeGuid: string): void {
  const current = new Set(selectedFor(anomaly))
  if (current.has(employeeGuid)) current.delete(employeeGuid)
  else current.add(employeeGuid)
  replaceAdjustment(anomaly, [...current])
}

function setAll(anomaly: PlanningHistoryAnomaly, checked: boolean): void {
  replaceAdjustment(
    anomaly,
    checked ? anomaly.employees.map((employee) => employee.guid) : [],
  )
}
</script>
