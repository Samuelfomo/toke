<template>
  <Teleport to="body">
    <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
    >
      <div
          v-if="modelValue"
          class="fixed inset-0 z-[500] flex items-center justify-center p-4"
          @click.self="$emit('update:modelValue', false)"
      >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('update:modelValue', false)" />

        <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
        >
          <div
              v-if="modelValue"
              class="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
              @click.stop
          >
            <!-- ── En-tête ── -->
            <div class="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-[#004aad]/10 flex items-center justify-center flex-shrink-0">
                  <IconCalendarEvent :size="16" class="text-[#004aad]" />
                </div>
                <div>
                  <p class="text-sm font-bold text-gray-900">Modifier l'horaire suggéré</p>
                  <p class="text-xs text-gray-400 mt-0.5">
                    <span class="font-semibold text-gray-600">{{ employeeName }}</span>
                    <span class="mx-1.5 text-gray-300">·</span>
                    {{ dayLabel }}
                  </p>
                </div>
              </div>

              <!-- Raison moteur — résumé compact -->
              <div v-if="reason" class="hidden sm:flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2 mr-8">
                <div class="w-2 h-2 rounded-full flex-shrink-0" :class="confidenceColor" />
                <span class="text-xs text-[#004aad] font-semibold">{{ reason.confidence }}% confiance</span>
                <span class="text-[10px] text-blue-400">· {{ reason.templateName }}</span>
              </div>

              <button
                  @click="$emit('update:modelValue', false)"
                  class="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-400"
              >
                <IconX :size="15" />
              </button>
            </div>

            <!-- ── Corps horizontal ── -->
            <div class="flex-1 min-h-0 flex overflow-hidden">

              <!-- ─ Colonne gauche : sélecteur template ─ -->
              <div class="w-64 flex-shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
                <div class="flex-shrink-0 px-4 pt-4 pb-2">
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Template horaire</p>
                </div>
                <div class="flex-1 overflow-y-auto px-3 pb-4 space-y-1">

                  <!-- Repos -->
                  <button
                      @click="selectTemplate(null)"
                      class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition text-left"
                      :class="!selectedGuid
                        ? 'border-[#004aad] bg-blue-50 text-[#004aad] font-semibold'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
                  >
                    <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0"
                         :class="!selectedGuid ? 'border-[#004aad] bg-[#004aad]' : 'border-gray-300'">
                      <IconCheck v-if="!selectedGuid" :size="11" class="text-white" />
                    </div>
                    <div class="min-w-0">
                      <p class="truncate">Repos</p>
                      <p class="text-[10px] font-normal opacity-60">Aucun horaire</p>
                    </div>
                  </button>

                  <!-- Templates -->
                  <button
                      v-for="tpl in templates"
                      :key="tpl.guid"
                      @click="selectTemplate(tpl.guid)"
                      class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition text-left"
                      :class="selectedGuid === tpl.guid
                        ? 'border-[#004aad] bg-blue-50 text-[#004aad] font-semibold'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
                  >
                    <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0"
                         :class="selectedGuid === tpl.guid ? 'border-[#004aad] bg-[#004aad]' : 'border-gray-300'">
                      <IconCheck v-if="selectedGuid === tpl.guid" :size="11" class="text-white" />
                    </div>
                    <span class="truncate">{{ tpl.name }}</span>
                  </button>

                </div>
              </div>

              <!-- ─ Colonne droite : détails définition ─ -->
              <div class="flex-1 min-w-0 flex flex-col overflow-hidden">

                <!-- Pas de template sélectionné -->
                <div v-if="!selectedGuid" class="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300 p-8">
                  <IconMoonOff :size="36" />
                  <p class="text-sm font-medium text-gray-400">Repos — aucun horaire ce jour</p>
                  <p class="text-xs text-gray-300 text-center">L'employé n'aura pas d'assignation horaire pour ce jour dans la suggestion.</p>
                </div>

                <!-- Définition du template par jour -->
                <template v-else>
                  <div class="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
                    <div>
                      <p class="text-sm font-bold text-gray-800">{{ selectedTemplateName }}</p>
                      <p class="text-[11px] text-gray-400 mt-0.5">
                        Horaires par jour — modifiables avant validation
                      </p>
                    </div>
                    <div class="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <span class="w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-200 inline-block" />Travail
                      <span class="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-200 inline-block ml-2" />Pause
                      <span class="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-200 inline-block ml-2" />Repos/Férié
                    </div>
                  </div>

                  <div class="flex-1 overflow-y-auto p-5">
                    <div class="grid grid-cols-1 gap-3">

                      <div
                          v-for="day in DAY_KEYS"
                          :key="day.key"
                          class="rounded-xl border overflow-hidden"
                          :class="getDayBorderClass(day.key)"
                      >
                        <!-- En-tête du jour -->
                        <div class="flex items-center justify-between px-4 py-2.5"
                             :class="getDayHeaderClass(day.key)">
                          <div class="flex items-center gap-2">
                            <span class="text-xs font-bold" :class="getDayLabelClass(day.key)">{{ day.label }}</span>
                            <span
                                class="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                :class="getDayBadgeClass(day.key)"
                            >
                              {{ getDayStatus(day.key) }}
                            </span>
                          </div>

                          <!-- Toggle repos/travail -->
                          <button
                              v-if="getDayRawStatus(day.key) !== 'holiday'"
                              @click="toggleDayWork(day.key)"
                              class="text-[10px] font-semibold px-2 py-1 rounded-lg transition"
                              :class="getDayRawStatus(day.key) === 'work'
                                ? 'text-gray-500 hover:bg-gray-100'
                                : 'text-green-600 hover:bg-green-50'"
                          >
                            {{ getDayRawStatus(day.key) === 'work' ? 'Mettre en repos' : 'Ajouter horaire' }}
                          </button>
                        </div>

                        <!-- Champs horaires si travail -->
                        <div v-if="getDayRawStatus(day.key) === 'work'" class="px-4 py-3 bg-white">
                          <div class="grid grid-cols-3 gap-3">

                            <!-- Travail -->
                            <div class="col-span-3 sm:col-span-1">
                              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                                <IconClock2 :size="10" class="inline mr-1" />Plage de travail
                              </p>
                              <div class="flex items-center gap-2">
                                <input type="time"
                                       :value="editDays[day.key]?.work[0] ?? ''"
                                       @change="(e) => updateWork(day.key, 0, (e.target as HTMLInputElement).value)"
                                       class="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20 transition bg-green-50/50"
                                />
                                <span class="text-gray-300 text-xs flex-shrink-0">→</span>
                                <input type="time"
                                       :value="editDays[day.key]?.work[1] ?? ''"
                                       @change="(e) => updateWork(day.key, 1, (e.target as HTMLInputElement).value)"
                                       class="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20 transition bg-green-50/50"
                                />
                              </div>
                            </div>

                            <!-- Pause -->
                            <div class="col-span-3 sm:col-span-1">
                              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                                <IconCoffee :size="10" class="inline mr-1" />Pause
                              </p>
                              <div class="flex items-center gap-2">
                                <input type="time"
                                       :value="editDays[day.key]?.pause?.[0] ?? ''"
                                       @change="(e) => updatePause(day.key, 0, (e.target as HTMLInputElement).value)"
                                       placeholder="—"
                                       class="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition bg-amber-50/40"
                                />
                                <span class="text-gray-300 text-xs flex-shrink-0">→</span>
                                <input type="time"
                                       :value="editDays[day.key]?.pause?.[1] ?? ''"
                                       @change="(e) => updatePause(day.key, 1, (e.target as HTMLInputElement).value)"
                                       placeholder="—"
                                       class="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition bg-amber-50/40"
                                />
                              </div>
                            </div>

                            <!-- Tolérance -->
                            <div class="col-span-3 sm:col-span-1">
                              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                                <IconAlertTriangle :size="10" class="inline mr-1" />Tolérance (min)
                              </p>
                              <input type="number" min="0" max="120"
                                     :value="editDays[day.key]?.tolerance ?? 0"
                                     @change="(e) => updateTolerance(day.key, Number((e.target as HTMLInputElement).value))"
                                     class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/20 transition"
                              />
                            </div>

                          </div>

                          <!-- Résumé ligne -->
                          <div class="mt-2.5 flex items-center gap-1.5 text-[10px] text-gray-400">
                            <IconClock :size="11" class="flex-shrink-0" />
                            <span>
                              {{ editDays[day.key]?.work[0] || '—' }} → {{ editDays[day.key]?.work[1] || '—' }}
                              <template v-if="editDays[day.key]?.pause?.[0] && editDays[day.key]?.pause?.[1]">
                                · Pause {{ editDays[day.key]?.pause?.[0] }} → {{ editDays[day.key]?.pause?.[1] }}
                              </template>
                              <template v-if="editDays[day.key]?.tolerance">
                                · Tolérance {{ editDays[day.key]?.tolerance }} min
                              </template>
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </template>

              </div>
            </div>

            <!-- ── Pied de page ── -->
            <div class="flex-shrink-0 border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-3 bg-gray-50/50">
              <button
                  @click="$emit('update:modelValue', false)"
                  class="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-white transition"
              >
                Annuler
              </button>

              <div class="flex items-center gap-3">
                <!-- Résumé sélection -->
                <span v-if="selectedGuid" class="text-xs text-gray-400 hidden sm:block">
                  Template : <span class="font-semibold text-gray-600">{{ selectedTemplateName }}</span>
                </span>
                <span v-else class="text-xs text-gray-400 hidden sm:block">Repos sélectionné</span>

                <button
                    @click="handleConfirm"
                    :disabled="saving"
                    class="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#004aad] hover:bg-[#003a8c] text-white text-sm font-bold transition disabled:opacity-50 shadow-sm shadow-blue-200"
                >
                  <IconLoader2 v-if="saving" :size="13" class="animate-spin" />
                  <IconCheck v-else :size="13" />
                  Confirmer la modification
                </button>
              </div>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  IconX, IconCheck, IconLoader2, IconCalendarEvent,
  IconClock, IconClock2, IconCoffee, IconAlertTriangle, IconMoonOff,
} from '@tabler/icons-vue'
import type { ISuggestionDayReason } from '@/service/ScheduleSuggestionService'
import type { ISessionTemplateDefinition, ISessionTemplateDefinitionBlock } from './type'

// ── Types ──────────────────────────────────────────────────────────────────

export interface AvailableTemplate {
  guid:        string
  name:        string
  definition?: ISessionTemplateDefinition | null
}

export interface CellModalPayload {
  templateGuid: string | null
  definition:   ISessionTemplateDefinition | null
}

type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

interface EditBlock {
  work:      [string, string]
  pause:     [string, string] | null
  tolerance: number
}

// ── Constants ──────────────────────────────────────────────────────────────

const DAY_KEYS: { key: DayKey; label: string }[] = [
  { key: 'Mon', label: 'Lundi' },
  { key: 'Tue', label: 'Mardi' },
  { key: 'Wed', label: 'Mercredi' },
  { key: 'Thu', label: 'Jeudi' },
  { key: 'Fri', label: 'Vendredi' },
  { key: 'Sat', label: 'Samedi' },
  { key: 'Sun', label: 'Dimanche' },
]

// ── Props & Emits ──────────────────────────────────────────────────────────

const props = defineProps<{
  modelValue:   boolean
  employeeName: string
  dayLabel:     string
  templateGuid: string | null
  reason:       ISuggestionDayReason | null
  templates:    AvailableTemplate[]
  saving?:      boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm', payload: CellModalPayload): void
}>()

// ── State ──────────────────────────────────────────────────────────────────

const selectedGuid = ref<string | null>(props.templateGuid)

// Copie éditable de la définition par jour
// null = férié (non éditable), undefined = repos (pas de block), EditBlock = travail
const editDays = ref<Record<DayKey, EditBlock | null | undefined>>({
  Mon: undefined, Tue: undefined, Wed: undefined, Thu: undefined,
  Fri: undefined, Sat: undefined, Sun: undefined,
})

// ── Computed ───────────────────────────────────────────────────────────────

const selectedTemplate = computed(() =>
    props.templates.find((t) => t.guid === selectedGuid.value) ?? null
)

const selectedTemplateName = computed(() =>
    selectedTemplate.value?.name ?? '—'
)

const confidenceColor = computed(() => {
  const c = props.reason?.confidence ?? 0
  if (c >= 80) return 'bg-green-400'
  if (c >= 60) return 'bg-amber-400'
  return 'bg-red-400'
})

// ── Watchers ───────────────────────────────────────────────────────────────

watch(() => props.modelValue, (open) => {
  if (!open) return
  selectedGuid.value = props.templateGuid
  loadDefinition(props.templateGuid)
})

watch(selectedGuid, (guid) => {
  loadDefinition(guid)
})

// ── Chargement de la définition ────────────────────────────────────────────

function loadDefinition(guid: string | null) {
  if (!guid) {
    resetEditDays()
    return
  }
  const tpl = props.templates.find((t) => t.guid === guid)
  if (!tpl?.definition) {
    resetEditDays()
    return
  }
  const def = tpl.definition
  for (const { key } of DAY_KEYS) {
    const raw = def[key]
    if (raw === null) {
      // Férié
      editDays.value[key] = null
    } else if (!Array.isArray(raw) || raw.length === 0) {
      // Repos
      editDays.value[key] = undefined
    } else {
      // Travail — copier le premier block
      const b = raw[0]
      editDays.value[key] = {
        work:      [b.work[0], b.work[1]],
        pause:     b.pause ? [b.pause[0], b.pause[1]] : null,
        tolerance: b.tolerance ?? 0,
      }
    }
  }
}

function resetEditDays() {
  for (const { key } of DAY_KEYS) {
    editDays.value[key] = undefined
  }
}

// ── Statuts de jour ────────────────────────────────────────────────────────

type DayRawStatus = 'work' | 'rest' | 'holiday'

function getDayRawStatus(key: DayKey): DayRawStatus {
  const v = editDays.value[key]
  if (v === null)      return 'holiday'
  if (v === undefined) return 'rest'
  return 'work'
}

function getDayStatus(key: DayKey): string {
  const s = getDayRawStatus(key)
  if (s === 'holiday') return 'Férié'
  if (s === 'rest')    return 'Repos'
  return 'Travail'
}

function getDayBorderClass(key: DayKey): string {
  const s = getDayRawStatus(key)
  if (s === 'work')    return 'border-green-200'
  if (s === 'holiday') return 'border-gray-200'
  return 'border-gray-100'
}

function getDayHeaderClass(key: DayKey): string {
  const s = getDayRawStatus(key)
  if (s === 'work')    return 'bg-green-50'
  if (s === 'holiday') return 'bg-gray-100'
  return 'bg-gray-50'
}

function getDayLabelClass(key: DayKey): string {
  const s = getDayRawStatus(key)
  if (s === 'work') return 'text-green-800'
  return 'text-gray-500'
}

function getDayBadgeClass(key: DayKey): string {
  const s = getDayRawStatus(key)
  if (s === 'work')    return 'bg-green-100 text-green-700'
  if (s === 'holiday') return 'bg-gray-200 text-gray-500'
  return 'bg-gray-100 text-gray-400'
}

// ── Édition ────────────────────────────────────────────────────────────────

function toggleDayWork(key: DayKey) {
  const s = getDayRawStatus(key)
  if (s === 'work') {
    editDays.value[key] = undefined  // → repos
  } else {
    // → travail avec valeurs par défaut
    editDays.value[key] = { work: ['08:00', '17:00'], pause: null, tolerance: 0 }
  }
}

function updateWork(key: DayKey, idx: 0 | 1, val: string) {
  const block = editDays.value[key]
  if (!block) return
  const newWork: [string, string] = [...block.work] as [string, string]
  newWork[idx] = val
  editDays.value[key] = { ...block, work: newWork }
}

function updatePause(key: DayKey, idx: 0 | 1, val: string) {
  const block = editDays.value[key]
  if (!block) return
  const currentPause: [string, string] = block.pause ? [...block.pause] as [string, string] : ['', '']
  currentPause[idx] = val
  editDays.value[key] = {
    ...block,
    pause: currentPause[0] || currentPause[1] ? currentPause : null,
  }
}

function updateTolerance(key: DayKey, val: number) {
  const block = editDays.value[key]
  if (!block) return
  editDays.value[key] = { ...block, tolerance: val }
}

// ── Sélection template ─────────────────────────────────────────────────────

function selectTemplate(guid: string | null) {
  selectedGuid.value = guid
}

// ── Confirmation ───────────────────────────────────────────────────────────

function handleConfirm() {
  if (!selectedGuid.value) {
    emit('confirm', { templateGuid: null, definition: null })
    return
  }

  // Reconstruire la définition depuis editDays
  const definition: ISessionTemplateDefinition = {
    Mon: null, Tue: null, Wed: null, Thu: null,
    Fri: null, Sat: null, Sun: null,
  }

  for (const { key } of DAY_KEYS) {
    const v = editDays.value[key]
    if (v === null) {
      definition[key] = null   // férié
    } else if (v === undefined) {
      definition[key] = []     // repos
    } else {
      definition[key] = [{
        work:      v.work,
        pause:     v.pause && v.pause[0] && v.pause[1] ? v.pause : null,
        tolerance: v.tolerance,
      }]
    }
  }

  emit('confirm', { templateGuid: selectedGuid.value, definition })
}
</script>