<template>
  <PlanningDrawer :open="open" eyebrow="Modification ponctuelle" title="Modifier une journée"
                  :description="`${employeeName} · ${formattedDate}`" @close="$emit('close')">
    <div class="space-y-5">
      <div class="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
        <div class="flex gap-3">
          <IconAlertTriangle :size="18" class="mt-0.5 shrink-0 text-amber-600"/>
          <div><p class="text-xs font-bold text-amber-950">Modification manuelle</p>
            <p class="mt-1 text-[11px] leading-5 text-amber-800/80">Cette action change uniquement cette date. Elle ne
              modifie ni le Session Template ni les autres collaborateurs.</p></div>
        </div>
      </div>
      <button type="button" class="flex w-full items-start gap-3 rounded-2xl border p-4 text-left"
              :class="selectedGuid===null?'border-slate-400 bg-slate-100 ring-2 ring-slate-100':'border-slate-200 bg-white'"
              @click="selectedGuid=null">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500">
          <IconBed :size="19"/>
        </div>
        <div><p class="text-xs font-bold text-slate-800">Mettre en repos</p>
          <p class="mt-1 text-[10px] leading-4 text-slate-500">Aucun Session Template ne sera affecté à cette date.</p>
        </div>
      </button>
      <div><label class="text-xs font-bold text-slate-700">Ou choisir un Session Template</label>
        <div class="mt-3 space-y-2">
          <button v-for="template in compatibleTemplates" :key="template.guid" type="button"
                  class="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition"
                  :class="selectedGuid===template.guid?'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100':'border-slate-200 bg-white hover:border-slate-300'"
                  @click="selectedGuid=template.guid">
            <div><p class="text-xs font-bold text-slate-800">{{ template.name }}</p>
              <p class="mt-1 text-[10px] text-slate-500">{{ templateTime(template) }}</p></div>
            <IconCheck v-if="selectedGuid===template.guid" :size="17" class="text-indigo-600"/>
          </button>
        </div>
      </div>
      <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
        {{ errorMessage }}
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-between gap-3">
        <button type="button"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600"
                :disabled="saving" @click="$emit('close')">Annuler
        </button>
        <button type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                :disabled="saving" @click="save">
          <IconLoader2 v-if="saving" :size="15" class="animate-spin"/>
          <IconCheck v-else :size="15"/>
          Confirmer
        </button>
      </div>
    </template>
  </PlanningDrawer>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {IconAlertTriangle, IconBed, IconCheck, IconLoader2} from '@tabler/icons-vue'
import ScheduleSuggestionService from '@/service/ScheduleSuggestionService'
import PlanningDrawer from '../components/PlanningDrawer.vue'
import {responseError} from '../planningSuggestion.helpers'
import type {PlanningDayKey, PlanningTemplateMini, ScheduleSuggestionItem} from '../planningSuggestion.type'

const props = withDefaults(defineProps<{
  open: boolean;
  suggestionGuid: string;
  item: ScheduleSuggestionItem | null;
  iso: string;
  templates: PlanningTemplateMini[]
}>(), {item: null});
const emit = defineEmits<{ close: []; saved: [item: ScheduleSuggestionItem] }>();
const selectedGuid = ref<string | null>(null);
const saving = ref(false);
const errorMessage = ref('');
const dayMap: PlanningDayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayKey = computed(() => dayMap[new Date(`${props.iso}T12:00:00`).getDay()]);
const compatibleTemplates = computed(() => props.templates.filter(t => {
  const b = t.definition?.[dayKey.value];
  return Array.isArray(b) && b.length > 0
}));
const employeeName = computed(() => props.item?.user.name ?? 'Collaborateur');
const formattedDate = computed(() => props.iso ? new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric'
}).format(new Date(`${props.iso}T12:00:00`)) : '')
watch(() => props.open, (open) => {
  if (open) {
    selectedGuid.value = props.item?.schedule[props.iso] ?? null;
    errorMessage.value = ''
  }
})

function templateTime(template: PlanningTemplateMini) {
  const b = template.definition?.[dayKey.value];
  return Array.isArray(b) && b.length ? `${b[0].work[0]}–${b[0].work[1]}` : 'Horaire indisponible'
}

async function save() {
  if (!props.item) return;
  saving.value = true;
  errorMessage.value = '';
  try {
    const response = await ScheduleSuggestionService.patchCell(props.suggestionGuid, props.item.guid, {
      iso: props.iso,
      template_guid: selectedGuid.value
    });
    if (!response?.success) throw response;
    emit('saved', response.data.item)
  } catch (error: any) {
    errorMessage.value = responseError(error, 'Impossible de modifier cette cellule.')
  } finally {
    saving.value = false
  }
}
</script>
