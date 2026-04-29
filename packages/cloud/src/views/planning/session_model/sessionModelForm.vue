<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div class="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        <!-- Modal header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <IconShieldCheck :size="18" class="text-blue-400" />
            </div>
            <div>
              <h2 class="text-white font-semibold text-sm">
                {{ isEdit ? 'Modifier la norme' : 'Nouvelle norme' }}
              </h2>
              <p class="text-slate-500 text-xs mt-0.5">Session Model</p>
            </div>
          </div>
          <button
              @click="$emit('close')"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <IconX :size="18" />
          </button>
        </div>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          <!-- Nom -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Nom de la norme <span class="text-red-400">*</span>
            </label>
            <input
                v-model="form.name"
                type="text"
                placeholder="Ex : Temps plein standard"
                class="field"
                :class="{ 'border-red-500/50': errors.name }"
            />
            <p v-if="errors.name" class="text-xs text-red-400">{{ errors.name }}</p>
          </div>

          <!-- Jours ouvrés -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Jours ouvrés <span class="text-red-400">*</span>
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                  v-for="day in DAYS"
                  :key="day.value"
                  type="button"
                  @click="toggleDay(day.value)"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition"
                  :class="form.workday.includes(day.value)
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:border-blue-500/40 hover:text-slate-200'"
              >
                {{ day.label }}
              </button>
            </div>
            <p v-if="errors.workday" class="text-xs text-red-400">{{ errors.workday }}</p>
          </div>

          <!-- Durées -->
          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Durée min (min) <span class="text-red-400">*</span>
              </label>
              <input v-model.number="form.min_working_time" type="number" min="0" placeholder="Ex: 360" class="field" />
              <p v-if="errors.min_working_time" class="text-xs text-red-400">{{ errors.min_working_time }}</p>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Durée normale (min) <span class="text-red-400">*</span>
              </label>
              <input v-model.number="form.normal_session_time" type="number" min="0" placeholder="Ex: 480" class="field" />
              <p v-if="errors.normal_session_time" class="text-xs text-red-400">{{ errors.normal_session_time }}</p>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Durée max (min) <span class="text-red-400">*</span>
              </label>
              <input v-model.number="form.max_working_time" type="number" min="0" placeholder="Ex: 540" class="field" />
              <p v-if="errors.max_working_time" class="text-xs text-red-400">{{ errors.max_working_time }}</p>
            </div>
          </div>

          <!-- Tolérance -->
          <div class="space-y-1.5 max-w-xs">
            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tolérance retard (min)
            </label>
            <input v-model.number="form.allowed_tolerance" type="number" min="0" placeholder="Ex: 15" class="field" />
          </div>

          <!-- Divider -->
          <div class="border-t border-white/8" />

          <!-- Pause -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-slate-200">Pauses autorisées</p>
                <p class="text-xs text-slate-500">Activer pour configurer les pauses</p>
              </div>
              <button
                  type="button"
                  @click="form.pause_allowed = !form.pause_allowed"
                  class="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
                  :class="form.pause_allowed ? 'bg-blue-500' : 'bg-white/10'"
              >
                <span
                    class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                    :class="form.pause_allowed ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>
            <div v-if="form.pause_allowed" class="grid grid-cols-2 gap-4 pl-0">
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Durée pause (min) <span class="text-red-400">*</span>
                </label>
                <input v-model.number="form.pause_duration" type="number" min="1" placeholder="Ex: 60" class="field" />
                <p v-if="errors.pause_duration" class="text-xs text-red-400">{{ errors.pause_duration }}</p>
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Nombre de pauses <span class="text-red-400">*</span>
                </label>
                <input v-model.number="form.pause_count" type="number" min="1" placeholder="Ex: 1" class="field" />
                <p v-if="errors.pause_count" class="text-xs text-red-400">{{ errors.pause_count }}</p>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="border-t border-white/8" />

          <!-- Flags row -->
          <div class="grid grid-cols-1 gap-3">

            <!-- Rotation -->
            <div class="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/8">
              <div>
                <p class="text-sm font-semibold text-slate-200">Rotation autorisée</p>
                <p class="text-xs text-slate-500">Cette norme peut être utilisée dans des rotations</p>
              </div>
              <button type="button" @click="form.rotation_allowed = !form.rotation_allowed"
                      class="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
                      :class="form.rotation_allowed ? 'bg-violet-500' : 'bg-white/10'"
              >
                <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                      :class="form.rotation_allowed ? 'translate-x-5' : 'translate-x-0'" />
              </button>
            </div>

            <!-- Heures sup -->
            <div class="p-3 bg-white/5 rounded-xl border border-white/8 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-slate-200">Heures supplémentaires</p>
                  <p class="text-xs text-slate-500">Autoriser les dépassements horaires</p>
                </div>
                <button type="button" @click="form.extra_allowed = !form.extra_allowed"
                        class="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
                        :class="form.extra_allowed ? 'bg-amber-500' : 'bg-white/10'"
                >
                  <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                        :class="form.extra_allowed ? 'translate-x-5' : 'translate-x-0'" />
                </button>
              </div>
              <div v-if="form.extra_allowed" class="max-w-xs space-y-1.5">
                <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Plafond heures sup (min) <span class="text-red-400">*</span>
                </label>
                <input v-model.number="form.extra_max" type="number" min="1" placeholder="Ex: 120" class="field" />
                <p v-if="errors.extra_max" class="text-xs text-red-400">{{ errors.extra_max }}</p>
              </div>
            </div>

            <!-- Sortie anticipée -->
            <div class="p-3 bg-white/5 rounded-xl border border-white/8 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-slate-200">Sortie anticipée</p>
                  <p class="text-xs text-slate-500">Permettre aux employés de partir avant la fin</p>
                </div>
                <button type="button" @click="form.early_leave_allowed = !form.early_leave_allowed"
                        class="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
                        :class="form.early_leave_allowed ? 'bg-emerald-500' : 'bg-white/10'"
                >
                  <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                        :class="form.early_leave_allowed ? 'translate-x-5' : 'translate-x-0'" />
                </button>
              </div>
              <div v-if="form.early_leave_allowed" class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Sessions avant éligibilité <span class="text-red-400">*</span>
                  </label>
                  <input v-model.number="form.leave_eligibility_after_session" type="number" min="1" placeholder="Ex: 5" class="field" />
                  <p v-if="errors.leave_eligibility_after_session" class="text-xs text-red-400">{{ errors.leave_eligibility_after_session }}</p>
                </div>
                <div class="flex items-center gap-3 pt-5">
                  <button type="button" @click="form.leave_is_optional = !form.leave_is_optional"
                          class="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
                          :class="form.leave_is_optional ? 'bg-emerald-500' : 'bg-white/10'"
                  >
                    <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                          :class="form.leave_is_optional ? 'translate-x-5' : 'translate-x-0'" />
                  </button>
                  <span class="text-xs text-slate-400">Congé optionnel</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Global error -->
          <div v-if="globalError" class="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <IconAlertTriangle :size="16" />
            {{ globalError }}
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 flex-shrink-0">
          <button
              @click="$emit('close')"
              class="px-4 py-2 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5 transition"
          >
            Annuler
          </button>
          <button
              @click="submit"
              :disabled="saving"
              class="flex items-center gap-2 px-5 py-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition disabled:opacity-60"
          >
            <IconLoader2 v-if="saving" :size="15" class="animate-spin" />
            <IconDeviceFloppy v-else :size="15" />
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import {
  IconShieldCheck, IconX, IconLoader2, IconDeviceFloppy, IconAlertTriangle,
} from '@tabler/icons-vue'
import SessionModelService from '@/service/SessionModelService'

// ── Props / emits ──────────────────────────────────────────────────────────
const props = defineProps<{ model?: any | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const isEdit = !!props.model?.guid

// ── Constants ──────────────────────────────────────────────────────────────
const DAYS = [
  { value: 'Mon', label: 'Lun' },
  { value: 'Tue', label: 'Mar' },
  { value: 'Wed', label: 'Mer' },
  { value: 'Thu', label: 'Jeu' },
  { value: 'Fri', label: 'Ven' },
  { value: 'Sat', label: 'Sam' },
  { value: 'Sun', label: 'Dim' },
]

// ── Form state ─────────────────────────────────────────────────────────────
const defaultForm = () => ({
  name: '',
  workday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as string[],
  min_working_time: null as number | null,
  normal_session_time: null as number | null,
  max_working_time: null as number | null,
  allowed_tolerance: null as number | null,
  pause_allowed: false,
  pause_duration: null as number | null,
  pause_count: null as number | null,
  rotation_allowed: false,
  extra_allowed: false,
  extra_max: null as number | null,
  early_leave_allowed: false,
  leave_eligibility_after_session: null as number | null,
  leave_is_optional: true,
})

const form = reactive(defaultForm())
const errors = reactive<Record<string, string>>({})
const globalError = ref('')
const saving = ref(false)

// ── Populate form if editing ───────────────────────────────────────────────
if (isEdit) {
  Object.assign(form, {
    name: props.model.name,
    workday: props.model.workday ?? [],
    min_working_time: props.model.min_working_time,
    normal_session_time: props.model.normal_session_time,
    max_working_time: props.model.max_working_time,
    allowed_tolerance: props.model.allowed_tolerance ?? null,
    pause_allowed: props.model.pause_allowed ?? false,
    pause_duration: props.model.pause_duration ?? null,
    pause_count: props.model.pause_count ?? null,
    rotation_allowed: props.model.rotation_allowed ?? false,
    extra_allowed: props.model.extra_allowed ?? false,
    extra_max: props.model.extra_max ?? null,
    early_leave_allowed: props.model.early_leave_allowed ?? false,
    leave_eligibility_after_session: props.model.leave_eligibility_after_session ?? null,
    leave_is_optional: props.model.leave_is_optional ?? true,
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────
function toggleDay(day: string) {
  const idx = form.workday.indexOf(day)
  if (idx >= 0) form.workday.splice(idx, 1)
  else form.workday.push(day)
}

function clearErrors() {
  Object.keys(errors).forEach((k) => delete errors[k])
  globalError.value = ''
}

function validate(): boolean {
  clearErrors()
  let valid = true

  if (!form.name.trim()) { errors.name = 'Champ requis'; valid = false }
  if (!form.workday.length) { errors.workday = 'Sélectionnez au moins un jour'; valid = false }
  if (!form.min_working_time) { errors.min_working_time = 'Champ requis'; valid = false }
  if (!form.normal_session_time) { errors.normal_session_time = 'Champ requis'; valid = false }
  if (!form.max_working_time) { errors.max_working_time = 'Champ requis'; valid = false }

  if (form.min_working_time && form.normal_session_time && form.max_working_time) {
    if (form.min_working_time > form.normal_session_time) {
      errors.min_working_time = 'Doit être ≤ durée normale'
      valid = false
    }
    if (form.normal_session_time > form.max_working_time) {
      errors.normal_session_time = 'Doit être ≤ durée max'
      valid = false
    }
  }

  if (form.pause_allowed) {
    if (!form.pause_duration) { errors.pause_duration = 'Requis si pause activée'; valid = false }
    if (!form.pause_count) { errors.pause_count = 'Requis si pause activée'; valid = false }
  }

  if (form.extra_allowed && !form.extra_max) {
    errors.extra_max = 'Requis si heures sup activées'
    valid = false
  }

  if (form.early_leave_allowed && !form.leave_eligibility_after_session) {
    errors.leave_eligibility_after_session = 'Requis si sortie anticipée activée'
    valid = false
  }

  return valid
}

// ── Submit ─────────────────────────────────────────────────────────────────
async function submit() {
  if (!validate()) return

  saving.value = true
  const payload: any = {
    name: form.name.trim(),
    workday: form.workday,
    min_working_time: form.min_working_time,
    normal_session_time: form.normal_session_time,
    max_working_time: form.max_working_time,
    pause_allowed: form.pause_allowed,
    rotation_allowed: form.rotation_allowed,
    extra_allowed: form.extra_allowed,
    early_leave_allowed: form.early_leave_allowed,
    leave_is_optional: form.leave_is_optional,
  }

  if (form.allowed_tolerance) payload.allowed_tolerance = form.allowed_tolerance
  if (form.pause_allowed) {
    payload.pause_duration = form.pause_duration
    payload.pause_count = form.pause_count
  }
  if (form.extra_allowed) payload.extra_max = form.extra_max
  if (form.early_leave_allowed) payload.leave_eligibility_after_session = form.leave_eligibility_after_session

  let res: any
  if (isEdit) {
    res = await SessionModelService.update(props.model.guid, payload)
  } else {
    res = await SessionModelService.create(payload)
  }

  saving.value = false

  if (res?.success === false || res?.error) {
    globalError.value = res?.message ?? 'Une erreur est survenue'
    return
  }

  emit('saved')
}
</script>

<style scoped>
.field {
  @apply w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200
  placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition;
}
</style>