<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-5"
      >
        <div
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <header class="relative overflow-hidden bg-blue-700 px-5 py-5 text-white sm:px-6 sm:py-6">
            <div class="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-blue-500/25 blur-3xl" />
            <div class="relative flex items-start justify-between gap-4">
              <div>
                <div class="flex items-center gap-2 text-xs font-semibold text-blue-100">
                  <IconSparkles :size="16" />
                  Nouvelle proposition
                </div>
                <h2 :id="titleId" class="mt-2 text-xl font-bold">Générer une proposition de planning</h2>
                <p class="mt-2 max-w-xl text-xs leading-5 text-blue-100/80">
                  Vérifiez les prérequis, choisissez une période, puis lancez le calcul. Le résultat restera un brouillon jusqu’à votre publication explicite.
                </p>
              </div>
              <button
                type="button"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="saving"
                aria-label="Fermer"
                @click="requestClose"
              >
                <IconX :size="18" />
              </button>
            </div>
          </header>

          <div class="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div
              v-if="readiness.errorMessage.value"
              class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800"
            >
              {{ readiness.errorMessage.value }}
              <button type="button" class="ml-2 font-bold underline" @click="readiness.load">Réessayer</button>
            </div>

            <GenerationReadinessPanel
              :items="readiness.readinessItems.value"
              :loading="readiness.loading.value"
              :percent="readiness.readinessPercent.value"
              @open="openCorrection"
            />

            <section class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 class="text-sm font-bold text-slate-900">Période à planifier</h3>
                  <p class="mt-1 text-xs leading-5 text-slate-500">
                    Les raccourcis calculent automatiquement la date de fin à partir du prochain lundi.
                  </p>
                </div>
                <span class="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {{ durationDays }} jour(s)
                </span>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  v-for="preset in presets"
                  :key="preset.id"
                  type="button"
                  class="rounded-xl border px-3 py-2 text-xs font-semibold transition"
                  :class="activePreset === preset.id
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                  @click="applyPreset(preset.id)"
                >
                  {{ preset.label }}
                </button>
              </div>

              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label for="suggestion-period-from" class="text-xs font-bold text-slate-700">Date de début</label>
                  <input
                    id="suggestion-period-from"
                    v-model="periodFrom"
                    type="date"
                    class="field-control mt-2"
                    :min="today"
                    @input="activePreset = 'custom'"
                  />
                </div>
                <div>
                  <label for="suggestion-period-to" class="text-xs font-bold text-slate-700">Date de fin</label>
                  <input
                    id="suggestion-period-to"
                    v-model="periodTo"
                    type="date"
                    class="field-control mt-2"
                    :min="periodFrom || today"
                    @input="activePreset = 'custom'"
                  />
                </div>
              </div>

              <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs font-bold text-slate-700">Période demandée</span>
                  <span class="text-sm font-bold text-slate-900">{{ periodLabel }}</span>
                </div>
                <p class="mt-2 text-xs leading-5 text-slate-500">
                  Une continuation de garde ou un repos post-garde peut apparaître après la date de fin principale afin de conserver un planning cohérent.
                </p>
              </div>
            </section>

            <div
              v-if="errorMessage"
              class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
            >
              {{ errorMessage }}
            </div>
          </div>

          <footer class="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p class="text-xs leading-5 text-slate-500">
              <template v-if="readiness.loading.value">Vérification des prérequis en cours…</template>
              <template v-else-if="readiness.ready.value">Tous les prérequis sont validés.</template>
              <template v-else>{{ readiness.blockerCount.value }} blocage(s) à corriger avant le calcul.</template>
            </p>
            <div class="flex items-center justify-end gap-2">
              <button
                type="button"
                class="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="saving"
                @click="requestClose"
              >
                Annuler
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                :disabled="saving || !validPeriod || !readiness.ready.value || readiness.loading.value"
                :title="generateBlocker"
                @click="generate"
              >
                <IconLoader2 v-if="saving" :size="15" class="animate-spin" />
                <IconSparkles v-else :size="15" />
                {{ saving ? 'Calcul en cours…' : 'Générer la proposition' }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { IconLoader2, IconSparkles, IconX } from '@tabler/icons-vue'
import ScheduleSuggestionService from '@/service/ScheduleSuggestionService'
import { useBodyScrollLock } from '@/views/planning/composables/useBodyScrollLock'
import { formatDate, responseError } from '../planningSuggestion.helpers'
import { useGenerationReadiness } from '../composables/useGenerationReadiness'
import type { ScheduleSuggestion } from '../planningSuggestion.type'
import GenerationReadinessPanel from './GenerationReadinessPanel.vue'

const props = defineProps<{ open: boolean; managerGuid: string }>()
const emit = defineEmits<{ close: []; generated: [suggestion: ScheduleSuggestion] }>()
const router = useRouter()
const titleId = `generate-suggestion-title-${Math.random().toString(36).slice(2, 9)}`
const saving = ref(false)
const errorMessage = ref('')
const periodFrom = ref('')
const periodTo = ref('')
const activePreset = ref('14-days')
const today = new Date().toISOString().slice(0, 10)
const managerGuidRef = computed(() => props.managerGuid)
const readiness = useGenerationReadiness(managerGuidRef)

const presets = [
  { id: '7-days', label: '7 jours' },
  { id: '14-days', label: '14 jours' },
  { id: '28-days', label: '28 jours' },
  { id: 'next-month', label: 'Mois prochain' },
]

useBodyScrollLock(computed(() => props.open))

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    errorMessage.value = ''
    applyPreset('14-days')
    await readiness.load()
  },
)

function requestClose(): void {
  if (saving.value) return
  emit('close')
}

function dateToIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return dateToIso(date)
}

function nextMonday(): string {
  const base = new Date(`${today}T12:00:00`)
  const offset = (8 - base.getDay()) % 7 || 7
  base.setDate(base.getDate() + offset)
  return dateToIso(base)
}

function applyPreset(id: string): void {
  activePreset.value = id

  if (id === 'next-month') {
    const current = new Date(`${today}T12:00:00`)
    const first = new Date(current.getFullYear(), current.getMonth() + 1, 1, 12)
    const last = new Date(current.getFullYear(), current.getMonth() + 2, 0, 12)
    periodFrom.value = dateToIso(first)
    periodTo.value = dateToIso(last)
    return
  }

  const duration = id === '7-days' ? 7 : id === '28-days' ? 28 : 14
  periodFrom.value = nextMonday()
  periodTo.value = addDays(periodFrom.value, duration - 1)
}

const validPeriod = computed(() =>
  Boolean(periodFrom.value && periodTo.value && periodFrom.value <= periodTo.value),
)

const durationDays = computed(() => {
  if (!validPeriod.value) return 0
  return (
    Math.round(
      (new Date(`${periodTo.value}T12:00:00`).getTime() -
        new Date(`${periodFrom.value}T12:00:00`).getTime()) /
        86400000,
    ) + 1
  )
})

const periodLabel = computed(() =>
  validPeriod.value
    ? `${formatDate(periodFrom.value)} → ${formatDate(periodTo.value)}`
    : 'Période invalide',
)

const generateBlocker = computed(() => {
  if (saving.value) return 'Calcul en cours.'
  if (readiness.loading.value) return 'Vérification des prérequis en cours.'
  if (!readiness.ready.value) return 'Corrigez les prérequis signalés avant de générer.'
  if (!validPeriod.value) return 'Choisissez une période valide.'
  return 'Générer une proposition de planning.'
})

async function openCorrection(routeName: string): Promise<void> {
  if (saving.value) return
  emit('close')
  await router.push({ name: routeName })
}

async function generate(): Promise<void> {
  if (
    !validPeriod.value ||
    !props.managerGuid ||
    saving.value ||
    !readiness.ready.value
  ) {
    return
  }

  saving.value = true
  errorMessage.value = ''

  try {
    const response = await ScheduleSuggestionService.generate(props.managerGuid, {
      period_from: periodFrom.value,
      period_to: periodTo.value,
    })

    if (!response?.success) throw response
    emit('generated', response.data.suggestion)
  } catch (error: any) {
    errorMessage.value = responseError(
      error,
      'La génération du planning a échoué. Vérifiez les contraintes signalées par le moteur.',
    )
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.field-control {
  width: 100%;
  min-height: 42px;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.7rem 0.8rem;
  font-size: 0.875rem;
  color: #334155;
  outline: none;
}

.field-control:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px #dbeafe;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
