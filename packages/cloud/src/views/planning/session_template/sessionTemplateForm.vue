<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-6" @click.self="$emit('close')">
      <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <!-- Modal — très large, aucun scroll -->
      <div class="relative bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 flex flex-col"
           style="max-height: 92vh;"
      >

        <!-- ── Header ── -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <IconCalendarEvent :size="16" class="text-blue-500" />
            </div>
            <div>
              <h2 class="text-slate-800 font-semibold text-sm">
                {{ isEdit ? 'Modifier le modèle' : 'Nouveau modèle' }}
              </h2>
              <p class="text-slate-400 text-xs">Session Template</p>
            </div>
          </div>
          <button @click="$emit('close')"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <IconX :size="16" />
          </button>
        </div>

        <!-- ── Body — 2 colonnes ── -->
        <div class="flex flex-1 overflow-hidden divide-x divide-slate-100">

          <!-- COL GAUCHE — infos générales -->
          <div class="w-72 flex-shrink-0 px-5 py-4 flex flex-col gap-4 overflow-y-auto">

            <!-- Nom -->
            <div class="field-group">
              <label class="field-label">Nom du modèle <span class="text-red-500">*</span></label>
              <input v-model="form.name" type="text" placeholder="Ex : Horaire standard Lun–Ven"
                     class="field" :class="{ 'field-error': errors.name }" />
              <p v-if="errors.name" class="err">{{ errors.name }}</p>
            </div>

            <!-- Norme associée -->
            <div class="field-group">
              <label class="field-label">Norme associée <span class="text-red-500">*</span></label>
              <select v-model="form.session_model" @change="onModelChange"
                      class="field cursor-pointer" :class="{ 'field-error': errors.session_model }"
              >
                <option value="">Sélectionner une norme...</option>
                <option v-for="sm in sessionModels" :key="sm.guid" :value="sm.guid">
                  {{ sm.name }}
                </option>
              </select>
              <p v-if="errors.session_model" class="err">{{ errors.session_model }}</p>
              <!-- Info jours autorisés -->
              <div v-if="selectedModel" class="flex flex-wrap gap-1 mt-1">
                <span
                    v-for="day in selectedModel.workday"
                    :key="day"
                    class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-500"
                >{{ DAY_FR[day] ?? day }}</span>
              </div>
            </div>

            <!-- Description -->
            <div class="field-group">
              <label class="field-label">Description</label>
              <textarea v-model="form.description" rows="3"
                        placeholder="Description optionnelle..."
                        class="field resize-none text-xs"
              />
            </div>

            <!-- Flags -->
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-semibold text-slate-700">Pour rotation</p>
                  <p class="text-[11px] text-slate-400">Utilisable dans un groupe de rotation</p>
                </div>
                <Toggle v-model="form.for_rotation" :disabled="!selectedModel?.rotation_allowed" color="violet" />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-semibold text-slate-700">Modèle par défaut</p>
                  <p class="text-[11px] text-slate-400">Emploi du temps par défaut de l'entreprise</p>
                </div>
                <Toggle v-model="form.is_default" color="blue" />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-semibold text-slate-700">Version courante</p>
                  <p class="text-[11px] text-slate-400">Activer ce modèle comme version active</p>
                </div>
                <Toggle v-model="form.current" color="emerald" />
              </div>
            </div>

            <div class="flex-1" />

            <!-- Global error -->
            <div v-if="globalError"
                 class="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs"
            >
              <IconAlertTriangle :size="14" class="flex-shrink-0 mt-0.5" />
              {{ globalError }}
            </div>

            <!-- Info norme requise -->
            <div v-if="!form.session_model"
                 class="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs"
            >
              <IconInfoCircle :size="14" class="flex-shrink-0 mt-0.5" />
              Sélectionnez une norme pour activer l'éditeur d'horaires.
            </div>
          </div>

          <!-- COL DROITE — éditeur de définition par jour -->
          <div class="flex-1 flex flex-col overflow-hidden">

            <!-- Header éditeur -->
            <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <p class="text-xs font-bold text-slate-700 uppercase tracking-wider">Définition des horaires par jour</p>
              <p class="text-[11px] text-slate-400">
                {{ activeWorkedDays.length }} jour{{ activeWorkedDays.length > 1 ? 's' : '' }} travaillé{{ activeWorkedDays.length > 1 ? 's' : '' }}
              </p>
            </div>

            <!-- Jours — scroll vertical uniquement ici si nécessaire -->
            <div class="flex-1 overflow-y-auto px-5 py-3 space-y-2">

              <div v-if="!form.session_model" class="flex items-center justify-center h-full text-slate-300 text-sm">
                Sélectionnez d'abord une norme
              </div>

              <template v-else>
                <div
                    v-for="day in ALL_DAYS"
                    :key="day.value"
                    class="rounded-xl border transition-colors"
                    :class="isDayAllowed(day.value)
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-100 bg-slate-50 opacity-50'"
                >
                  <!-- Day header row -->
                  <div class="flex items-center gap-3 px-4 py-2.5">

                    <!-- Nom du jour -->
                    <span class="w-10 text-xs font-bold text-slate-700">{{ day.label }}</span>

                    <!-- État du jour : 3 options -->
                    <div class="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5">
                      <button
                          v-for="opt in DAY_STATES"
                          :key="opt.value"
                          type="button"
                          :disabled="!isDayAllowed(day.value)"
                          @click="setDayState(day.value, opt.value)"
                          class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition"
                          :class="getDayState(day.value) === opt.value
                          ? 'bg-white text-slate-700 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'"
                      >{{ opt.label }}</button>
                    </div>

                    <!-- Résumé horaire (si travaillé) -->
                    <span v-if="getDayState(day.value) === 'work' && definition[day.value]?.length"
                          class="text-[11px] text-slate-500 ml-1"
                    >
                      {{ blocksSummary(day.value) }}
                    </span>

                    <div class="flex-1" />

                    <!-- Ajouter un bloc (si travaillé) -->
                    <button
                        v-if="getDayState(day.value) === 'work'"
                        type="button"
                        @click="addBlock(day.value)"
                        class="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-600 font-medium transition"
                    >
                      <IconPlus :size="12" /> Bloc
                    </button>
                  </div>

                  <!-- Blocs de travail -->
                  <div v-if="getDayState(day.value) === 'work' && definition[day.value]?.length"
                       class="px-4 pb-3 flex flex-col gap-2"
                  >
                    <div
                        v-for="(block, bi) in (definition[day.value] as IDayBlock[])"
                        :key="bi"
                        class="flex items-end gap-2 bg-slate-50 rounded-lg px-3 py-2.5"
                    >
                      <!-- Travail -->
                      <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Travail</label>
                        <div class="flex items-center gap-1.5">
                          <input type="time" v-model="block.work[0]"
                                 class="time-field" />
                          <span class="text-slate-300 text-xs">–</span>
                          <input type="time" v-model="block.work[1]"
                                 class="time-field" />
                        </div>
                      </div>

                      <!-- Pause (si norme l'autorise) -->
                      <template v-if="selectedModel?.pause_allowed">
                        <div class="flex flex-col gap-1">
                          <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Pause</label>
                          <div class="flex items-center gap-1.5">
                            <input type="time" :value="block.pause?.[0] ?? ''"
                                   @input="setPauseStart(day.value, bi, ($event.target as HTMLInputElement).value)"
                                   class="time-field" placeholder="--:--" />
                            <span class="text-slate-300 text-xs">–</span>
                            <input type="time" :value="block.pause?.[1] ?? ''"
                                   @input="setPauseEnd(day.value, bi, ($event.target as HTMLInputElement).value)"
                                   class="time-field" />
                          </div>
                        </div>
                      </template>

                      <!-- Tolérance -->
                      <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Tol. (min)</label>
                        <input type="number" v-model.number="block.tolerance" min="0" max="60"
                               class="time-field w-16 text-center" placeholder="0" />
                      </div>

                      <!-- Supprimer bloc -->
                      <button type="button" @click="removeBlock(day.value, bi)"
                              class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition mb-0.5"
                      >
                        <IconTrash :size="13" />
                      </button>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- ── Footer ── -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button @click="$emit('close')"
                  class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition"
          >Annuler</button>
          <button @click="submit" :disabled="saving"
                  class="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-200 transition disabled:opacity-60"
          >
            <IconLoader2 v-if="saving" :size="14" class="animate-spin" />
            <IconDeviceFloppy v-else :size="14" />
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import {
  IconCalendarEvent, IconX, IconLoader2, IconDeviceFloppy,
  IconAlertTriangle, IconInfoCircle, IconPlus, IconTrash,
} from '@tabler/icons-vue'
import SessionTemplateService from '@/service/SessionTemplate'
import type { ISessionTemplate, IDefinition, IDayBlock } from './type'

// ── Props / emits ──────────────────────────────────────────────────────────
const props = defineProps<{
  template?: ISessionTemplate | null
  sessionModels: { guid: string; name: string; workday: string[]; pause_allowed: boolean; rotation_allowed: boolean }[]
}>()
const emit = defineEmits<{ close: []; saved: [] }>()

const isEdit = !!props.template?.guid

// ── Constants ──────────────────────────────────────────────────────────────
const DAY_FR: Record<string, string> = {
  Mon: 'Lundi', Tue: 'Mardi', Wed: 'Mercredi', Thu: 'Jeudi', Fri: 'Vendredi', Sat: 'Samedi', Sun: 'Dimanche',
}
const ALL_DAYS = [
  { value: 'Mon', label: 'Lun' }, { value: 'Tue', label: 'Mar' },
  { value: 'Wed', label: 'Mer' }, { value: 'Thu', label: 'Jeu' },
  { value: 'Fri', label: 'Ven' }, { value: 'Sat', label: 'Sam' },
  { value: 'Sun', label: 'Dim' },
]
const DAY_STATES = [
  { value: 'work',  label: 'Travaillé' },
  { value: 'rest',  label: 'Repos'     },
  { value: 'off',   label: 'Férié'     },
]

// ── Toggle inline ──────────────────────────────────────────────────────────
const Toggle = {
  props: { modelValue: Boolean, color: { type: String, default: 'blue' }, disabled: { type: Boolean, default: false } },
  emits: ['update:modelValue'],
  template: `
    <button type="button"
      :disabled="disabled"
      @click="!disabled && $emit('update:modelValue', !modelValue)"
      class="relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0"
      :class="[modelValue ? activeClass : 'bg-slate-200', disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer']"
    >
      <span class="absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
        :class="modelValue ? 'translate-x-4' : 'translate-x-0'" />
    </button>`,
  computed: {
    activeClass() {
      const map: Record<string, string> = {
        blue: 'bg-blue-500', violet: 'bg-violet-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
      }
      return map[(this as any).color] ?? 'bg-blue-500'
    },
  },
}

// ── Form state ─────────────────────────────────────────────────────────────
const form = reactive({
  name:          props.template?.name          ?? '',
  session_model: props.template?.session_model ?? '',
  description:   props.template?.description   ?? '',
  for_rotation:  props.template?.for_rotation  ?? false,
  is_default:    props.template?.default       ?? false,
  current:       props.template?.current       ?? true,
})

// definition : copie mutable
const definition = reactive<IDefinition>(
    props.template?.definition
        ? JSON.parse(JSON.stringify(props.template.definition))
        : {}
)

const errors     = reactive<Record<string, string>>({})
const globalError = ref('')
const saving      = ref(false)

// ── Selected model ─────────────────────────────────────────────────────────
const selectedModel = computed(() =>
    props.sessionModels.find((sm) => sm.guid === form.session_model) ?? null
)

const activeWorkedDays = computed(() =>
    ALL_DAYS
        .filter((d) => {
          const v = definition[d.value]
          return Array.isArray(v) && v.length > 0
        })
        .map((d) => d.value)
)

// ── Day state helpers ──────────────────────────────────────────────────────
function isDayAllowed(day: string): boolean {
  return selectedModel.value?.workday.includes(day) ?? false
}

type DayState = 'work' | 'rest' | 'off' | 'absent'

function getDayState(day: string): DayState {
  if (!(day in definition)) return 'absent'
  const val = definition[day]
  if (val === null) return 'off'
  if (Array.isArray(val) && val.length === 0) return 'rest'
  if (Array.isArray(val) && val.length > 0) return 'work'
  return 'absent'
}

function setDayState(day: string, state: string) {
  if (state === 'work') {
    // Si déjà en mode work avec des blocs on garde, sinon on ajoute un bloc par défaut
    if (getDayState(day) !== 'work') {
      definition[day] = [{ work: ['08:00', '17:00'], pause: null, tolerance: 0 }]
    }
  } else if (state === 'rest') {
    definition[day] = []
  } else if (state === 'off') {
    definition[day] = null
  }
}

function onModelChange() {
  // Réinitialise la définition quand la norme change
  Object.keys(definition).forEach((k) => delete definition[k])
  form.for_rotation = false
}

// ── Block helpers ──────────────────────────────────────────────────────────
function addBlock(day: string) {
  if (!Array.isArray(definition[day])) definition[day] = []
  ;(definition[day] as IDayBlock[]).push({ work: ['08:00', '17:00'], pause: null, tolerance: 0 })
}

function removeBlock(day: string, index: number) {
  const blocks = definition[day] as IDayBlock[]
  blocks.splice(index, 1)
  // Si plus de blocs → passe en repos
  if (blocks.length === 0) definition[day] = []
}

function setPauseStart(day: string, bi: number, val: string) {
  const block = (definition[day] as IDayBlock[])[bi]
  if (!block.pause) block.pause = ['', '']
  block.pause[0] = val
}

function setPauseEnd(day: string, bi: number, val: string) {
  const block = (definition[day] as IDayBlock[])[bi]
  if (!block.pause) block.pause = ['', '']
  block.pause[1] = val
}

function blocksSummary(day: string): string {
  const blocks = definition[day] as IDayBlock[]
  return blocks.map((b) => `${b.work[0]}–${b.work[1]}`).join(', ')
}

// ── Validation ─────────────────────────────────────────────────────────────
function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  globalError.value = ''
  let ok = true

  if (!form.name.trim())      { errors.name = 'Champ requis'; ok = false }
  if (!form.session_model)    { errors.session_model = 'Champ requis'; ok = false }

  // Au moins un jour travaillé
  const hasWork = Object.values(definition).some(
      (v) => Array.isArray(v) && v.length > 0
  )
  if (!hasWork) { globalError.value = 'Définissez au moins un jour travaillé.'; ok = false }

  // Vérif blocs : heure début < heure fin
  for (const [day, blocks] of Object.entries(definition)) {
    if (!Array.isArray(blocks)) continue
    for (const b of blocks as IDayBlock[]) {
      if (b.work[0] >= b.work[1]) {
        globalError.value = `${DAY_FR[day] ?? day} : l'heure de début doit être antérieure à l'heure de fin.`
        ok = false; break
      }
    }
    if (!ok) break
  }

  return ok
}

type SessionTemplatePayload = {
  name: string
  session_model: string
  definition: Record<string, any>
  description?: string
  for_rotation?: boolean
  default?: boolean
  current?: boolean
}

// ── Submit ─────────────────────────────────────────────────────────────────
async function submit() {
  if (!validate()) return
  saving.value = true

  const sessionModel = typeof form.session_model === "string" ? form.session_model : form.session_model.guid

  const payload: SessionTemplatePayload = {
    name:          form.name.trim(),
    session_model: sessionModel,
    definition:    JSON.parse(JSON.stringify(definition)),
    for_rotation:  form.for_rotation,
    default:       form.is_default,
    current:       form.current,
  }
  if (form.description) payload.description = form.description

  const res = isEdit
      ? await SessionTemplateService.update(props.template!.guid, payload)
      : await SessionTemplateService.create(payload)

  saving.value = false

  if (res?.success === false || res?.error) {
    globalError.value = res?.error?.message ?? 'Une erreur est survenue'
    return
  }

  emit('saved')
}
</script>

<style scoped>
.field-group { @apply flex flex-col gap-1; }
.field-label { @apply text-[10.5px] font-bold text-slate-500 uppercase tracking-wide; }
.field {
  @apply w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800
  placeholder-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition;
}
.field-error  { @apply border-red-400 focus:border-red-400 focus:ring-red-100; }
.err          { @apply text-[11px] text-red-500; }
.time-field {
  @apply px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700
  focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition;
}
</style>