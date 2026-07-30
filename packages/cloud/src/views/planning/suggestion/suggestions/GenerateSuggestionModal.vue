<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open"
           class="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
           @mousedown.self="$emit('close')">
        <div class="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
          <header class="relative overflow-hidden bg-[#004aad] px-6 py-6 text-white">
            <div class="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-indigo-500/25 blur-3xl"/>
            <div class="relative flex items-start justify-between gap-4">
              <div>
                <div class="flex items-center gap-2 text-xs font-semibold text-indigo-200">
                  <IconSparkles :size="16"/>
                  Nouvelle proposition
                </div>
                <h2 class="mt-2 text-xl font-bold">Générer un planning</h2>
                <p class="mt-2 max-w-md text-xs leading-5 text-slate-300">
                  Le moteur créera uniquement un brouillon.
                  Aucun planning ne sera publié avant votre validation.
                </p>
              </div>
              <button type="button"
                      class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
                      @click="$emit('close')">
                <IconX :size="18"/>
              </button>
            </div>
          </header>
          <div class="space-y-5 px-6 py-6">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="text-xs font-bold text-slate-700">Date de début</label>
                <input v-model="periodFrom" type="date" class="field-control mt-2" :min="today"/>
              </div>
              <div>
                <label class="text-xs font-bold text-slate-700">Date de fin</label>
                <input v-model="periodTo" type="date" class="field-control mt-2" :min="periodFrom||today"/>
              </div>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700">Période demandée</span>
                <span class="text-sm font-bold text-slate-900">{{ durationDays }} jour(s)</span>
              </div>
              <p class="mt-2 text-[11px] leading-5 text-slate-500">
                Une continuation de garde et son repos post-garde
                peuvent apparaître après la date de fin principale.
              </p>
            </div>
            <div class="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <p class="text-xs font-bold text-indigo-900">Ce qui se passera</p>
              <ul class="mt-2 space-y-1.5 text-[11px] leading-5 text-indigo-800/80">
                <li>• OR-Tools vérifie simultanément les profils, besoins et contraintes.</li>
                <li>• La réponse est enregistrée avec le statut Brouillon.</li>
                <li>• Vous serez redirigé vers la grille de contrôle détaillée.</li>
              </ul>
            </div>
            <div v-if="errorMessage"
                 class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
              {{ errorMessage }}
            </div>
          </div>
          <footer class="flex items-center justify-end gap-2 bg-slate-50 px-6 py-4">
            <button type="button"
                    class="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    :disabled="saving" @click="$emit('close')">Annuler
            </button>
            <button type="button"
                    class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                    :disabled="saving||!validPeriod" @click="generate"
            >
              <IconLoader2 v-if="saving" :size="15" class="animate-spin"/>
              <IconSparkles v-else :size="15"/>
              {{ saving ? 'Résolution en cours…' : 'Générer le brouillon' }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {IconLoader2, IconSparkles, IconX} from '@tabler/icons-vue'
import ScheduleSuggestionService from '@/service/ScheduleSuggestionService'
import {responseError} from '../planningSuggestion.helpers'
import type {ScheduleSuggestion} from '../planningSuggestion.type'

const props = defineProps<{ open: boolean; managerGuid: string }>();
const emit = defineEmits<{ close: []; generated: [suggestion: ScheduleSuggestion] }>();
const saving = ref(false);
const errorMessage = ref('');
const periodFrom = ref('');
const periodTo = ref('');
const today = new Date().toISOString().slice(0, 10)
watch(() => props.open, (open) => {
  if (open) setDefaults()
})

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10)
}

function setDefaults() {
  errorMessage.value = '';
  const base = new Date(`${today}T12:00:00`);
  const offset = (8 - base.getDay()) % 7 || 7;
  base.setDate(base.getDate() + offset);
  periodFrom.value = base.toISOString().slice(0, 10);
  periodTo.value = addDays(periodFrom.value, 13)
}

const validPeriod = computed(() => Boolean(periodFrom.value && periodTo.value && periodFrom.value <= periodTo.value));
const durationDays = computed(() => {
  if (!validPeriod.value) return 0;
  return Math.round((new Date(`${periodTo.value}T12:00:00`).getTime() - new Date(`${periodFrom.value}T12:00:00`).getTime()) / 86400000) + 1
})

async function generate() {
  if (!validPeriod.value || !props.managerGuid) return;
  saving.value = true;
  errorMessage.value = '';
  try {
    const response = await ScheduleSuggestionService.generate(props.managerGuid, {
      period_from: periodFrom.value,
      period_to: periodTo.value
    });
    if (!response?.success) throw response;
    emit('generated', response.data.suggestion)
  } catch (error: any) {
    errorMessage.value = responseError(error, 'La génération du planning a échoué.')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.field-control {
  width: 100%;
  border-radius: .50rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: .72rem .8rem;
  font-size: .75rem;
  color: #334155;
  outline: none
}

.field-control:focus {
  border-color: #a5b4fc;
  box-shadow: 0 0 0 3px #e0e7ff
}

.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity .18s
}

.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0
}
</style>
