<template>
  <Teleport to="body">
    <!-- Overlay -->
    <div class="fixed inset-0 z-50" @click.self="$emit('close')">
      <div class="absolute inset-0 bg-black/20 backdrop-blur-[2px]" @click="$emit('close')" />

      <!-- Drawer latéral droit -->
      <div class="absolute right-0 top-0 bottom-0 w-[480px] bg-white border-l border-slate-200 shadow-2xl flex flex-col">

        <!-- ── Header ── -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <IconRefresh :size="16" class="text-indigo-600" />
            </div>
            <div>
              <h2 class="text-slate-800 font-bold text-sm">
                {{ isEdit ? 'Modifier le groupe' : 'Nouveau groupe de rotation' }}
              </h2>
              <p class="text-slate-400 text-xs">Rotation Group</p>
            </div>
          </div>
          <button @click="$emit('close')"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          ><IconX :size="16" /></button>
        </div>

        <!-- ── Body scrollable ── -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          <!-- Nom -->
          <div class="field-group">
            <label class="field-label">Nom du groupe <span class="text-red-500">*</span></label>
            <input v-model="form.name" type="text"
                   placeholder="Ex : Rotation équipe nuit 2 semaines"
                   class="field" :class="{ 'field-error': errors.name }" />
            <p v-if="errors.name" class="err">{{ errors.name }}</p>
          </div>

          <!-- Description -->
          <div class="field-group">
            <label class="field-label">Description</label>
            <textarea v-model="form.description" rows="2"
                      placeholder="Description optionnelle..."
                      class="field resize-none text-sm"
            />
          </div>

          <div class="border-t border-slate-100" />

          <!-- Config cycle — 2 colonnes -->
          <div>
            <p class="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Configuration du cycle</p>
            <div class="grid grid-cols-2 gap-3">

              <!-- Unité de cycle -->
              <div class="field-group">
                <label class="field-label">Unité <span class="text-red-500">*</span></label>
                <select v-model="form.cycle_unit" class="field cursor-pointer">
                  <option value="day">Jours</option>
                  <option value="week">Semaines</option>
                </select>
              </div>

              <!-- Longueur -->
              <div class="field-group">
                <label class="field-label">Durée du cycle <span class="text-red-500">*</span></label>
                <input v-model.number="form.cycle_length" type="number" min="1"
                       :placeholder="form.cycle_unit === 'week' ? '2' : '14'"
                       class="field" :class="{ 'field-error': errors.cycle_length }" />
                <p v-if="errors.cycle_length" class="err">{{ errors.cycle_length }}</p>
              </div>

              <!-- Sens -->
              <div class="field-group">
                <label class="field-label">Sens de rotation</label>
                <div class="flex gap-2">
                  <button
                      v-for="opt in DIRECTION_OPTS" :key="opt.value" type="button"
                      @click="form.direction = opt.value as any"
                      class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition"
                      :class="form.direction === opt.value
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'"
                  >
                    <component :is="opt.icon" :size="13" />
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <!-- Pas de rotation -->
              <div class="field-group">
                <label class="field-label">Pas de rotation</label>
                <input v-model.number="form.rotation_step" type="number" min="1"
                       placeholder="1" class="field" />
                <p class="text-[10px] text-slate-400 mt-0.5">Étapes avancées à chaque rotation</p>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-100" />

          <!-- Date de début + auto-advance -->
          <div class="grid grid-cols-2 gap-3">
            <div class="field-group">
              <label class="field-label">Date de début <span class="text-red-500">*</span></label>
              <input v-model="form.start_date" type="date"
                     class="field" :class="{ 'field-error': errors.start_date }" />
              <p v-if="errors.start_date" class="err">{{ errors.start_date }}</p>
            </div>

            <div class="field-group">
              <label class="field-label">Auto-rotation</label>
              <div
                  class="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 transition"
                  @click="form.auto_advance = !form.auto_advance"
              >
                <span class="text-sm font-medium" :class="form.auto_advance ? 'text-indigo-600' : 'text-slate-500'">
                  {{ form.auto_advance ? 'Activée' : 'Désactivée' }}
                </span>
                <!-- Toggle inline -->
                <div
                    class="relative w-9 h-5 rounded-full transition-colors duration-200"
                    :class="form.auto_advance ? 'bg-indigo-500' : 'bg-slate-300'"
                >
                  <span
                      class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                      :class="form.auto_advance ? 'translate-x-4' : 'translate-x-0'"
                  />
                </div>
              </div>
              <p class="text-[10px] text-slate-400 mt-0.5">Avancement automatique par cron</p>
            </div>
          </div>

          <!-- Preview cycle résumé -->
          <div v-if="form.cycle_length && form.cycle_unit"
               class="flex items-center gap-2.5 p-3 bg-indigo-50 border border-indigo-100 rounded-xl"
          >
            <IconInfoCircle :size="15" class="text-indigo-400 flex-shrink-0" />
            <p class="text-xs text-indigo-700">
              Cycle de <strong>{{ form.cycle_length }} {{ form.cycle_unit === 'week' ? 'semaine(s)' : 'jour(s)' }}</strong>,
              avance de <strong>{{ form.rotation_step ?? 1 }} étape(s)</strong>
              en direction <strong>{{ form.direction === 'forward' ? 'avant' : 'arrière' }}</strong>.
              Auto-avance : <strong>{{ form.auto_advance ? 'oui' : 'non' }}</strong>.
            </p>
          </div>

          <!-- Statut -->
          <div
              class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition"
              @click="form.active = !form.active"
          >
            <div>
              <p class="text-sm font-semibold text-slate-700">Statut du groupe</p>
              <p class="text-xs text-slate-400">{{ form.active ? 'Ce groupe est actif' : 'Ce groupe est inactif' }}</p>
            </div>
            <span
                class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition"
                :class="form.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="form.active ? 'bg-emerald-500' : 'bg-slate-400'" />
              {{ form.active ? 'Actif' : 'Inactif' }}
            </span>
          </div>

          <!-- Global error -->
          <div v-if="globalError"
               class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs"
          >
            <IconAlertTriangle :size="14" class="flex-shrink-0" />
            {{ globalError }}
          </div>
        </div>

        <!-- ── Footer ── -->
        <div class="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50">
          <p class="text-xs tracking-wide text-slate-500 p-1">
            Les positions (templates) se configurent<br/>après la création du groupe.
          </p>
          <div class="flex items-center gap-2 ">
            <button @click="$emit('close')"
                    class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-white transition"
            >Annuler</button>
            <button @click="submit" :disabled="saving"
                    class="flex items-center gap-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-indigo-200 transition disabled:opacity-60"
            >
              <IconLoader2 v-if="saving" :size="28" class="animate-spin" />
              <IconDeviceFloppy v-else :size="28" />
              {{ saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le groupe' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import {
  IconRefresh, IconX, IconLoader2, IconDeviceFloppy,
  IconAlertTriangle, IconInfoCircle,
  IconArrowRight, IconArrowLeft,
} from '@tabler/icons-vue'
import RotationGroupService from '@/service/RotationGroup'
import type { IRotationGroup } from './type'

// ── Props / emits ──────────────────────────────────────────────────────────
const props = defineProps<{ group?: IRotationGroup | null }>()
const emit  = defineEmits<{ close: []; saved: [] }>()

const isEdit = !!props.group?.guid

// ── Constants ──────────────────────────────────────────────────────────────
const DIRECTION_OPTS = [
  { value: 'forward',  label: 'Avant',   icon: IconArrowRight },
  { value: 'backward', label: 'Arrière', icon: IconArrowLeft  },
]

// ── Form ───────────────────────────────────────────────────────────────────
const form = reactive({
  name:          props.group?.name          ?? '',
  description:   props.group?.description   ?? '',
  cycle_length:  props.group?.cycle_length  ?? null as number | null,
  cycle_unit:    props.group?.cycle_unit    ?? 'week' as 'day' | 'week',
  direction:     props.group?.direction     ?? 'forward' as 'forward' | 'backward',
  auto_advance:  props.group?.auto_advance  ?? false,
  rotation_step: props.group?.rotation_step ?? 1,
  start_date:    props.group?.start_date    ?? new Date().toISOString().split('T')[0],
  active:        props.group?.active        ?? true,
})

const errors      = reactive<Record<string, string>>({})
const globalError = ref('')
const saving      = ref(false)

// ── Validation ─────────────────────────────────────────────────────────────
function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  globalError.value = ''
  let ok = true

  if (!form.name.trim())    { errors.name = 'Champ requis'; ok = false }
  if (!form.cycle_length)   { errors.cycle_length = 'Champ requis'; ok = false }
  if (!form.start_date)     { errors.start_date = 'Champ requis'; ok = false }

  return ok
}

// ── Submit ─────────────────────────────────────────────────────────────────
async function submit() {
  if (!validate()) return
  saving.value = true

  const payload: Record<string, any> = {
    name:          form.name.trim(),
    cycle_length:  form.cycle_length,
    cycle_unit:    form.cycle_unit,
    direction:     form.direction,
    auto_advance:  form.auto_advance,
    rotation_step: form.rotation_step ?? 1,
    start_date:    form.start_date,
    active:        form.active,
  }
  if (form.description) payload.description = form.description

  const res = isEdit
      ? await RotationGroupService.update(props.group!.guid, payload)
      : await RotationGroupService.create(payload as any)

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
  placeholder-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition;
}
.field-error { @apply border-red-400 focus:border-red-400 focus:ring-red-100; }
.err         { @apply text-[11px] text-red-500; }
</style>