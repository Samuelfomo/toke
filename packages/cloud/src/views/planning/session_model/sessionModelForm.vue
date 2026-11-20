<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true"/>

      <!-- Modal — large, no scroll -->
      <div role="dialog" aria-modal="true" aria-labelledby="session-model-form-title"
           class="relative bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden max-h-[95vh]">

        <!-- ── Header ── -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <IconShieldCheck :size="17" class="text-blue-500"/>
            </div>
            <div>
              <h2 id="session-model-form-title" class="font-medium text-lg">
                {{ isEdit ? 'Modifier le modèle de session' : 'Créer un modèle de session' }}
              </h2>
              <p class="text-slate-500 text-xs">
                Définissez les règles de durée, de pause et de congé applicables aux sessions.
              </p>
            </div>
          </div>
          <button type="button" @click="requestClose" :disabled="saving" aria-label="Fermer"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconX :size="17"/>
          </button>
        </div>

        <!-- ── Body — 2 colonnes ── -->
        <div class="grid divide-x divide-slate-100 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x
         overflow-y-auto">

          <!-- COL GAUCHE -->
          <div class="px-6 py-5 flex flex-col gap-4">

            <!-- Nom -->
            <div class="field-group">
              <label class="field-label">Nom de la norme <span class="text-red-500">*</span></label>
              <input v-model="form.name" type="text" placeholder="Ex : Temps plein standard"
                     class="field" :class="{ 'field-error': errors.name }"/>
              <p v-if="errors.name" class="err">{{ errors.name }}</p>
            </div>

            <!-- Jours ouvrés -->
            <div class="field-group">
              <label class="field-label">Jours ouvrés <span class="text-red-500">*</span></label>
              <div class="flex gap-1.5 flex-wrap">
                <button
                    v-for="day in DAYS" :key="day.value" type="button"
                    @click="toggleDay(day.value)"
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition"
                    :class="form.workday.includes(day.value)
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-500'"
                >{{ day.label }}
                </button>
              </div>
              <p v-if="errors.workday" class="err">{{ errors.workday }}</p>
            </div>

            <!-- Durées — 3 colonnes -->
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div class="field-group">
                <label class="field-label">Min (min) <span class="text-red-500">*</span></label>
                <input v-model.number="form.min_working_time" type="number" min="0" placeholder="360"
                       class="field" :class="{ 'field-error': errors.min_working_time }"/>
                <p v-if="errors.min_working_time" class="err">{{ errors.min_working_time }}</p>
              </div>
              <div class="field-group">
                <label class="field-label">Normal (min) <span class="text-red-500">*</span></label>
                <input v-model.number="form.normal_session_time" type="number" min="0" placeholder="480"
                       class="field" :class="{ 'field-error': errors.normal_session_time }"/>
                <p v-if="errors.normal_session_time" class="err">{{ errors.normal_session_time }}</p>
              </div>
              <div class="field-group">
                <label class="field-label">Max (min) <span class="text-red-500">*</span></label>
                <input v-model.number="form.max_working_time" type="number" min="0" placeholder="540"
                       class="field" :class="{ 'field-error': errors.max_working_time }"/>
                <p v-if="errors.max_working_time" class="err">{{ errors.max_working_time }}</p>
              </div>
            </div>

            <!-- Tolérance -->
            <div class="field-group max-w-[180px]">
              <label class="field-label">Tolérance retard (min)</label>
              <input v-model.number="form.allowed_tolerance" type="number" min="0" placeholder="15" class="field"/>
            </div>

            <!-- Pause toggle + champs conditionnels -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-slate-700">Pauses autorisées</p>
                  <p class="text-xs text-slate-400">Configurer les pauses de session</p>
                </div>
                <Toggle v-model="form.pause_allowed" color="blue"/>
              </div>
              <div v-if="form.pause_allowed" class="grid grid-cols-2 gap-3">
                <div class="field-group">
                  <label class="field-label">Durée pause (min) <span class="text-red-500">*</span></label>
                  <input v-model.number="form.pause_duration" type="number" min="1" placeholder="60"
                         class="field bg-white" :class="{ 'field-error': errors.pause_duration }"/>
                  <p v-if="errors.pause_duration" class="err">{{ errors.pause_duration }}</p>
                </div>
                <div class="field-group">
                  <label class="field-label">Nombre de pauses <span class="text-red-500">*</span></label>
                  <input v-model.number="form.pause_count" type="number" min="1" placeholder="1"
                         class="field bg-white" :class="{ 'field-error': errors.pause_count }"/>
                  <p v-if="errors.pause_count" class="err">{{ errors.pause_count }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- COL DROITE -->
          <div class="px-6 py-5 flex flex-col gap-4">

            <!-- Rotation -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-slate-700">Rotation autorisée</p>
                <p class="text-xs text-slate-400">Utiliser cette norme dans des rotations</p>
              </div>
              <Toggle v-model="form.rotation_allowed" color="violet"/>
            </div>

            <!-- Heures supplémentaires -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-slate-700">Heures supplémentaires</p>
                  <p class="text-xs text-slate-400">Autoriser les dépassements horaires</p>
                </div>
                <Toggle v-model="form.extra_allowed" color="amber"/>
              </div>
              <div v-if="form.extra_allowed" class="field-group max-w-[180px]">
                <label class="field-label">Plafond (min) <span class="text-red-500">*</span></label>
                <input v-model.number="form.extra_max" type="number" min="1" placeholder="120"
                       class="field bg-white" :class="{ 'field-error': errors.extra_max }"/>
                <p v-if="errors.extra_max" class="err">{{ errors.extra_max }}</p>
              </div>
            </div>

            <!-- Congés -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-slate-700">
                    Congés autorisés
                  </p>

                  <p class="text-xs text-slate-400">
                    Définir après combien de sessions un employé devient éligible à un congé
                  </p>
                </div>

                <Toggle v-model="form.leave_allowed" color="emerald"/>
              </div>

              <div v-if="form.leave_allowed" class="flex items-end gap-4">
                <div class="field-group flex-1">
                  <label class="field-label">
                    Nombre de sessions avant éligibilité
                    <span class="text-red-500">*</span>
                  </label>

                  <input
                      v-model.number="form.leave_eligibility_after_session"
                      type="number"
                      min="1"
                      placeholder="5"
                      class="field bg-white"
                      :class="{
          'field-error': errors.leave_eligibility_after_session
        }"
                  />

                  <p
                      v-if="errors.leave_eligibility_after_session"
                      class="err"
                  >
                    {{ errors.leave_eligibility_after_session }}
                  </p>
                </div>

                <div class="field-group flex-shrink-0">
                  <label class="field-label">
                    Congé facultatif
                  </label>

                  <div class="flex items-center h-[38px]">
                    <Toggle
                        v-model="form.leave_is_optional"
                        color="emerald"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Spacer push error + footer to bottom -->
            <div class="flex-1"/>

            <!-- Global error -->
            <div v-if="globalError"
                 class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs"
            >
              <IconAlertTriangle :size="14" class="flex-shrink-0"/>
              {{ globalError }}
            </div>
          </div>
        </div>

        <!-- ── Footer ── -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button type="button" @click="requestClose" :disabled="saving"
                  class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Annuler
          </button>
          <button @click="submit" :disabled="saving"
                  class="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
          >
            <IconLoader2 v-if="saving" :size="14" class="animate-spin"/>
            <IconDeviceFloppy v-else :size="14"/>
            <template v-if="saving">
              <span class="sm:hidden">Patientez...</span>
              <span class="hidden sm:inline">Enregistrement...</span>
            </template>

            <template v-else>
              <span class="sm:hidden">{{ isEdit ? 'Enregistrer' : 'Créer' }}</span>
              <span class="hidden sm:inline">{{ isEdit ? 'Enregistrer' : 'Créer le modèle' }}</span>
            </template>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {ref, reactive, computed, h} from 'vue'

import {
  IconShieldCheck, IconX, IconLoader2, IconDeviceFloppy, IconAlertTriangle,
} from '@tabler/icons-vue'
import SessionModelService from '@/service/SessionModelService'
import type {ISessionModel} from './type'
import {useUserStore} from "@/stores/userStore";
import {useBodyScrollLock} from "@/views/planning/composables/useBodyScrollLock";

const userStore = useUserStore()

// ── Props / emits ──────────────────────────────────────────────────────────
const props = defineProps<{ model?: ISessionModel | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const isEdit = !!props.model?.guid

// ── Toggle inline component ────────────────────────────────────────────────

const Toggle = {
  props: {modelValue: Boolean, color: String},
  emits: ['update:modelValue'],
  setup(props: { modelValue: boolean; color: string }, {emit}: any) {
    const activeClass = computed(() => {
      const map: Record<string, string> = {
        blue: 'bg-blue-500',
        violet: 'bg-violet-500',
        amber: 'bg-amber-500',
        emerald: 'bg-emerald-500',
      }
      return map[props.color] ?? 'bg-blue-500'
    })

    return () =>
        h(
            'button',
            {
              type: 'button',
              onClick: () => emit('update:modelValue', !props.modelValue),
              class: [
                'relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0',
                props.modelValue ? activeClass.value : 'bg-slate-200',
              ],
            },
            [
              h('span', {
                class: [
                  'absolute top-[2px] left-[2px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200',
                  props.modelValue ? 'translate-x-[18px]' : 'translate-x-0',
                ],
              }),
            ]
        )
  },
}

// ── Constants ──────────────────────────────────────────────────────────────
const DAYS = [
  {value: 'Mon', label: 'Lun'}, {value: 'Tue', label: 'Mar'},
  {value: 'Wed', label: 'Mer'}, {value: 'Thu', label: 'Jeu'},
  {value: 'Fri', label: 'Ven'}, {value: 'Sat', label: 'Sam'},
  {value: 'Sun', label: 'Dim'},
]

// ── Form ───────────────────────────────────────────────────────────────────
const form = reactive({
  name: props.model?.name ?? '',
  workday: props.model?.workday ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  min_working_time: props.model?.min_working_time ?? null as number | null,
  normal_session_time: props.model?.normal_session_time ?? null as number | null,
  max_working_time: props.model?.max_working_time ?? null as number | null,
  allowed_tolerance: props.model?.allowed_tolerance ?? null as number | null,
  pause_allowed: props.model?.pause_allowed ?? false,
  pause_duration: props.model?.pause_duration ?? null as number | null,
  pause_count: props.model?.pause_count ?? null as number | null,
  rotation_allowed: props.model?.rotation_allowed ?? false,
  extra_allowed: props.model?.extra_allowed ?? false,
  extra_max: props.model?.extra_max ?? null as number | null,
  leave_allowed: props.model?.leave_allowed ?? false,
  leave_eligibility_after_session: props.model?.leave_eligibility_after_session ?? null as number | null,
  leave_is_optional: props.model?.leave_is_optional ?? true,
})

const errors = reactive<Record<string, string>>({})
const globalError = ref('')
const saving = ref(false)

useBodyScrollLock(true)

// ── Helpers ────────────────────────────────────────────────────────────────
function toggleDay(day: string) {
  const idx = form.workday.indexOf(day)
  idx >= 0 ? form.workday.splice(idx, 1) : form.workday.push(day)
}

function clearErrors() {
  Object.keys(errors).forEach((k) => delete errors[k])
  globalError.value = ''
}

// ── Validation ─────────────────────────────────────────────────────────────
function validate(): boolean {
  clearErrors()
  let ok = true

  const req = (field: keyof typeof form, msg = 'Champ requis') => {
    if (!form[field]) {
      errors[field] = msg;
      ok = false
    }
  }

  req('name')
  if (!form.workday.length) {
    errors.workday = 'Sélectionnez au moins un jour';
    ok = false
  }
  req('min_working_time')
  req('normal_session_time')
  req('max_working_time')

  if (form.min_working_time && form.normal_session_time && form.max_working_time) {
    if (form.min_working_time > form.normal_session_time) {
      errors.min_working_time = '≤ durée normale';
      ok = false
    }
    if (form.normal_session_time > form.max_working_time) {
      errors.normal_session_time = '≤ durée max';
      ok = false
    }
  }

  if (form.pause_allowed) {
    if (!form.pause_duration) {
      errors.pause_duration = 'Requis';
      ok = false
    }
    if (!form.pause_count) {
      errors.pause_count = 'Requis';
      ok = false
    }
  }

  if (form.extra_allowed && !form.extra_max) {
    errors.extra_max = 'Requis';
    ok = false
  }

  if (form.leave_allowed && !form.leave_eligibility_after_session) {
    errors.leave_eligibility_after_session = 'Indiquez le nombre de sessions requis';
    ok = false
  }

  return ok
}

// ── Fermeture explicite ────────────────────────────────────────────────────
function requestClose(): void {
  if (saving.value) return
  emit('close')
}

// ── Submit ─────────────────────────────────────────────────────────────────
async function submit() {
  if (saving.value || !validate()) return

  saving.value = true

  const payload: Parameters<typeof SessionModelService.create>[0] = {
    name: form.name.trim(),
    workday: form.workday,
    min_working_time: form.min_working_time!,
    normal_session_time: form.normal_session_time!,
    max_working_time: form.max_working_time!,
    pause_allowed: form.pause_allowed,
    rotation_allowed: form.rotation_allowed,
    extra_allowed: form.extra_allowed,
    early_leave_allowed: form.leave_allowed,
    leave_is_optional: form.leave_is_optional,
    created_by: userStore.user?.guid!
  }

  if (form.allowed_tolerance) payload.allowed_tolerance = form.allowed_tolerance
  if (form.pause_allowed) {
    payload.pause_duration = form.pause_duration || undefined;
    payload.pause_count = form.pause_count || undefined
  }
  if (form.extra_allowed) payload.extra_max = form.extra_max || undefined
  if (form.leave_allowed) payload.leave_eligibility_after_session = form.leave_eligibility_after_session || undefined

  const res = isEdit
      ? await SessionModelService.update(props.model!.guid, payload)
      : await SessionModelService.create(payload)

  saving.value = false

  if (res?.success === false || res?.error) {
    globalError.value = res?.error?.message ?? 'Une erreur est survenue'
    return
  }

  emit('saved')
}
</script>

<style scoped>
.field-group {
  @apply flex flex-col gap-1;
}

.field-label {
  @apply text-xs font-semibold text-slate-500 uppercase tracking-wide;
}

.field {
  @apply w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800
  placeholder-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition;
}

.field-error {
  @apply border-red-400 focus:border-red-400 focus:ring-red-100;
}

.err {
  @apply text-xs text-red-500;
}
</style>