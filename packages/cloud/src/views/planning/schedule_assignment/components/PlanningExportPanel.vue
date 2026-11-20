<template>
  <Teleport to="body">
    <Transition name="export-panel">
      <div
        v-if="open"
        class="fixed inset-0 z-[80] flex items-end justify-center sm:items-stretch sm:justify-end"
      >
        <!--
          Overlay volontairement non interactif pour la fermeture :
          le panneau ne doit jamais se fermer suite à un clic extérieur accidentel.
        -->
        <div class="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" aria-hidden="true" />

        <section
          class="relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:h-full sm:max-h-none sm:w-[460px] sm:rounded-none sm:border-l sm:border-slate-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="planning-export-title"
        >
          <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <div class="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-blue-500">
                <IconUpload :size="14" />
                Export du planning
              </div>
              <h2 id="planning-export-title" class="text-lg font-bold text-slate-900">Préparer l’export</h2>
              <p class="mt-1 text-sm leading-5 text-slate-500">
                Choisissez la présentation puis le format du document.
              </p>
            </div>
            <button
              type="button"
              @click="closePanel"
              class="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fermer"
            >
              <IconX :size="18" />
            </button>
          </div>

          <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
            <div>
              <div class="mb-3 flex items-center justify-between gap-3">
                <h3 class="text-sm font-bold text-slate-800">Présentation</h3>
                <span class="text-xs text-slate-400">{{ periodFrom }} → {{ periodTo }}</span>
              </div>

              <div class="space-y-2">
                <button
                  v-for="option in presentationOptions"
                  :key="option.value"
                  type="button"
                  @click="selectPresentation(option.value)"
                  class="w-full rounded-2xl border p-4 text-left transition"
                  :class="presentation === option.value
                    ? 'border-blue-400 bg-blue-50/70 ring-2 ring-blue-100'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'"
                >
                  <div class="flex items-start gap-3">
                    <div
                      class="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl"
                      :class="presentation === option.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'"
                    >
                      <IconTable v-if="option.value === 'standard'" :size="17" />
                      <IconFileText v-else-if="option.value === 'wall'" :size="17" />
                      <IconCalendarStats v-else :size="17" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-sm font-bold text-slate-800">{{ option.label }}</span>
                        <span
                          v-if="option.recommended"
                          class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700"
                        >
                          Recommandé
                        </span>
                      </div>
                      <p class="mt-1 text-xs leading-5 text-slate-500">{{ option.description }}</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <h3 class="mb-3 text-sm font-bold text-slate-800">Format</h3>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="item in formatOptions"
                  :key="item.value"
                  type="button"
                  :disabled="!item.enabled"
                  @click="item.enabled && updateFormat(item.value)"
                  class="flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition"
                  :class="[
                    format === item.value && item.enabled
                      ? 'border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-100'
                      : 'border-slate-200 bg-white text-slate-600',
                    item.enabled ? 'hover:border-slate-300' : 'cursor-not-allowed opacity-35'
                  ]"
                >
                  <IconFile v-if="item.value === 'pdf'" :size="18" />
                  <IconTable v-else-if="item.value === 'excel'" :size="18" />
                  <IconFileText v-else :size="18" />
                  {{ item.label }}
                </button>
              </div>
              <p v-if="presentation === 'optimized'" class="mt-2 text-xs leading-5 text-slate-400">
                Le calendrier longue période est actuellement disponible en PDF.
              </p>
            </div>

            <div v-if="presentation === 'optimized'" class="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
              <h3 class="text-sm font-bold text-slate-800">Options du calendrier longue période</h3>

              <label class="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500" for="export-optimized-style">Style</label>
              <select
                id="export-optimized-style"
                :value="optimizedPdfMode"
                @change="onOptimizedModeChange"
                class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="personalized">Lisible · couleur + initiales</option>
                <option value="personalized-color">Couleurs · sans initiales</option>
                <option value="generalized">Généralisé · couleurs des services</option>
              </select>

              <label class="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500" for="export-optimized-density">Densité</label>
              <select
                id="export-optimized-density"
                :value="optimizedMonthsPerPage"
                @change="onMonthsPerPageChange"
                class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option :value="1">1 mois par page</option>
                <option :value="2">2 mois par page</option>
                <option :value="3">3 mois par page</option>
                <option :value="4">4 mois par page</option>
                <option :value="6">6 mois par page</option>
              </select>

              <div class="mt-3 rounded-xl bg-white/80 px-3 py-2.5 text-xs leading-5 text-slate-500">
                <template v-if="optimizedPdfMode === 'personalized'">
                  Initiales agrandies et couleur employé. Convient aussi à l’impression noir et blanc.
                </template>
                <template v-else-if="optimizedPdfMode === 'personalized-color'">
                  Carrés colorés sans initiales. Recommandé pour écran et impression couleur.
                </template>
                <template v-else>
                  Les couleurs représentent les services plutôt que les employés.
                </template>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
            <div class="flex items-center justify-between gap-3">
              <button
                type="button"
                @click="closePanel"
                class="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                :disabled="loading || !canExport"
                @click="$emit('submit')"
                class="inline-flex min-w-[175px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconLoader2 v-if="loading" :size="15" class="animate-spin" />
                <IconUpload v-else :size="15" />
                {{ primaryLabel }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {
  IconCalendarStats,
  IconFile,
  IconFileText,
  IconLoader2,
  IconTable,
  IconUpload,
  IconX,
} from '@tabler/icons-vue'
import type {
  OptimizedMonthsPerPage,
  OptimizedPdfMode,
} from '@/utils/exports/scheduleAssignment.optimized.export'

export type ExportPresentation = 'standard' | 'wall' | 'optimized'
export type ExportFormat = 'pdf' | 'excel' | 'csv'

const props = defineProps<{
  open: boolean
  presentation: ExportPresentation
  format: ExportFormat
  optimizedPdfMode: OptimizedPdfMode
  optimizedMonthsPerPage: OptimizedMonthsPerPage
  periodFrom: string
  periodTo: string
  loading: boolean
  canExport: boolean
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:presentation', value: ExportPresentation): void
  (event: 'update:format', value: ExportFormat): void
  (event: 'update:optimizedPdfMode', value: OptimizedPdfMode): void
  (event: 'update:optimizedMonthsPerPage', value: OptimizedMonthsPerPage): void
  (event: 'submit'): void
}>()

const presentationOptions = [
  {
    value: 'optimized' as ExportPresentation,
    label: 'Calendrier longue période',
    description: 'Vue condensée pour consulter plusieurs mois dans un document compact.',
    recommended: true,
  },
  {
    value: 'standard' as ExportPresentation,
    label: 'Standard',
    description: 'Export classique du planning avec les informations détaillées.',
    recommended: false,
  },
  {
    value: 'wall' as ExportPresentation,
    label: 'Affichage mural',
    description: 'Présentation simplifiée pensée pour être affichée ou imprimée pour l’équipe.',
    recommended: false,
  },
]

const formatOptions = computed(() => [
  {value: 'pdf' as ExportFormat, label: 'PDF', enabled: true},
  {value: 'excel' as ExportFormat, label: 'Excel', enabled: props.presentation !== 'optimized'},
  {value: 'csv' as ExportFormat, label: 'CSV', enabled: props.presentation !== 'optimized'},
])

const primaryLabel = computed(() => {
  if (props.format === 'pdf' && props.presentation === 'standard') return 'Aperçu PDF'
  return `Exporter ${props.format.toUpperCase()}`
})

function closePanel(): void {
  emit('update:open', false)
}

function selectPresentation(value: ExportPresentation): void {
  emit('update:presentation', value)
  if (value === 'optimized') emit('update:format', 'pdf')
}

function updateFormat(value: ExportFormat): void {
  emit('update:format', value)
}

function onOptimizedModeChange(event: Event): void {
  emit('update:optimizedPdfMode', (event.target as HTMLSelectElement).value as OptimizedPdfMode)
}

function onMonthsPerPageChange(event: Event): void {
  emit('update:optimizedMonthsPerPage', Number((event.target as HTMLSelectElement).value) as OptimizedMonthsPerPage)
}
</script>

<style scoped>
.export-panel-enter-active,
.export-panel-leave-active {
  transition: opacity 0.2s ease;
}

.export-panel-enter-active section,
.export-panel-leave-active section {
  transition: transform 0.24s ease;
}

.export-panel-enter-from,
.export-panel-leave-to {
  opacity: 0;
}

.export-panel-enter-from section,
.export-panel-leave-to section {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .export-panel-enter-from section,
  .export-panel-leave-to section {
    transform: translateX(100%);
  }
}
</style>
