<template>
  <div class="space-y-6">
    <PlanningPageHeader eyebrow="Étape 2" title="Besoins de couverture par jour"
                        description="Les besoins indiquent combien de collaborateurs doivent être affectés à chaque service. Une journée sans besoin actif ne peut pas être garantie par le moteur.">
      <template #actions>
        <button class="secondary-button" :disabled="loading" @click="loadRequirements">
          <IconRefresh :size="16" :class="{'animate-spin':loading}"/>
          Actualiser
        </button>
        <button class="primary-button" :disabled="!activeConfig" @click="openCreate(null)">
          <IconPlus :size="16"/>
          Ajouter un besoin
        </button>
      </template>
    </PlanningPageHeader>
    <PlanningInfoPanel title="Comprendre les modes d’allocation"
                       description="Le mode indique comment le moteur interprète l’effectif demandé."
                       :examples="['Effectif exact : le nombre demandé doit être respecté exactement.','Fourchette : le moteur respecte un minimum et un maximum, puis vise la cible.','Affecter les disponibles : les collaborateurs restants sont placés sur ce service.']"
                       important="Une garde exige un template de continuation avec du travail le lendemain."/>
    <PlanningInfoPanel v-if="!activeConfig&&!loading" tone="warning" title="Aucune configuration active"
                       description="Les besoins doivent être rattachés à une configuration moteur active."
                       important="Créez ou activez une configuration avant d’ajouter des besoins."/>
    <PlanningInfoPanel v-if="errorMessage" tone="warning" title="Chargement impossible" :description="errorMessage"/>
    <div class="flex flex-wrap gap-2"><span class="status-pill"
                                            :class="coveredDays.size===7?'ready':'warning'">{{
        coveredDays.size === 7 ? '✓' : '!'
      }} Couverture : {{ coveredDays.size }} jour(s) sur 7</span><span
        class="status-pill">{{ requirements.length }} besoin(s) actif(s)</span><span v-if="activeConfig"
                                                                                     class="status-pill">Configuration : {{
        activeConfig.name
      }}</span>
    </div>
    <div v-if="loading" class="grid gap-4 lg:grid-cols-2">
      <div v-for="i in 6" :key="i" class="h-52 animate-pulse rounded-2xl bg-slate-100"/>
    </div>
    <div v-else class="grid gap-4 xl:grid-cols-2">
      <section v-for="day in DAY_ORDER" :key="day" class="overflow-hidden rounded-2xl border bg-white shadow-sm"
               :class="requirementsByDay[day].length?'border-slate-200':'border-dashed border-amber-300'">
        <header class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold"
                 :class="requirementsByDay[day].length?'bg-slate-900 text-white':'bg-amber-50 text-amber-700'">
              {{ DAY_LABELS[day].slice(0, 3) }}
            </div>
            <div><h2 class="text-sm font-bold text-slate-900">{{ DAY_LABELS[day] }}</h2>
              <p class="mt-.5 text-[11px] text-slate-400">{{ requirementsByDay[day].length }} besoin(s)</p></div>
          </div>
          <button class="edit-button" @click="openCreate(day)">
            <IconPlus :size="14"/>
            Ajouter
          </button>
        </header>
        <div v-if="requirementsByDay[day].length" class="divide-y divide-slate-100">
          <article v-for="r in requirementsByDay[day]" :key="r.guid" class="group px-5 py-4 hover:bg-slate-50/70">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="flex gap-2"><span class="badge"
                                              :class="r.service_type==='GUARD'?'guard':'standard'">{{
                    r.service_type === 'GUARD' ? 'Garde' : 'Standard'
                  }}</span><span
                    class="badge allocation">{{ ALLOCATION_LABELS[r.allocation_mode] }}</span></div>
                <p class="mt-2 text-sm font-bold text-slate-800">
                  {{ r.session_template?.name ?? 'Template indisponible' }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ timeSummary(r) }}</p></div>
              <button class="icon-button" @click="openEdit(r)">
                <IconPencil :size="16"/>
              </button>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-2">
              <Mini label="Minimum" :value="r.min_employees"/>
              <Mini label="Cible" :value="r.target_employees" active/>
              <Mini label="Maximum" :value="r.max_employees??'Libre'"/>
            </div>
            <div v-if="r.service_type==='GUARD'"
                 class="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5 text-[11px] text-violet-800">
              Continuation : <strong>{{ r.continuation_template?.name ?? 'template manquant' }}</strong> le lendemain.
            </div>
          </article>
        </div>
        <div v-else class="px-5 py-10 text-center">
          <IconCalendarOff :size="26" class="mx-auto text-amber-400"/>
          <p class="mt-3 text-sm font-bold text-slate-800">Aucun besoin défini</p>
          <p class="mt-1 text-xs leading-5 text-slate-500">La couverture de ce jour ne sera pas garantie.</p></div>
      </section>
    </div>
    <PlanningRequirementForm :open="showForm" :config-guid="activeConfig?.guid??''" :requirement="editTarget"
                             :initial-day="initialDay" @close="showForm=false" @saved="onSaved"/>
  </div>
</template>
<script setup lang="ts">
import {computed, defineComponent, h, onMounted, ref} from 'vue';
import {IconCalendarOff, IconPencil, IconPlus, IconRefresh} from '@tabler/icons-vue';
import PlanningSuggestionConfigService from '@/service/PlanningSuggestionConfigService';
import PlanningSuggestionRequirementService from '@/service/PlanningSuggestionRequirementService';
import PlanningInfoPanel from '../components/PlanningInfoPanel.vue';
import PlanningPageHeader from '../components/PlanningPageHeader.vue';
import PlanningRequirementForm from './PlanningRequirementForm.vue';
import {ALLOCATION_LABELS, DAY_LABELS, DAY_ORDER, responseData, responseError} from '../planningSuggestion.helpers';
import type {PlanningDayKey, PlanningRequirement, PlanningSuggestionConfig} from '../planningSuggestion.type';

const loading = ref(false),
    errorMessage = ref(''),
    activeConfig = ref<PlanningSuggestionConfig | null>(null),
    requirements = ref<PlanningRequirement[]>([]),
    showForm = ref(false),
    editTarget = ref<PlanningRequirement | null>(null),
    initialDay = ref<PlanningDayKey | null>(null);

const requirementsByDay = computed<Record<PlanningDayKey, PlanningRequirement[]>>(() => {
  const result = DAY_ORDER.reduce(
      (acc, day) => {
        acc[day] = [];
        return acc;
      },
      {} as Record<PlanningDayKey, PlanningRequirement[]>,
  );

  requirements.value.forEach(requirement => {
    result[requirement.day_of_week].push(requirement);
  });

  DAY_ORDER.forEach(day => {
    result[day].sort((a, b) => a.priority - b.priority);
  });

  return result;
});

const coveredDays = computed(() => new Set(requirements.value.map(r => r.day_of_week)));

async function loadRequirements() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const c = await PlanningSuggestionConfigService.active();
    activeConfig.value = responseData(c).planning_suggestion_config ?? null;
    if (!activeConfig.value) {
      requirements.value = [];
      return
    }
    const r = await PlanningSuggestionRequirementService.listByConfig(activeConfig.value.guid);
    requirements.value = responseData(r).planning_suggestion_requirements?.items ?? []
  } catch (e: any) {
    errorMessage.value = responseError(e, 'Impossible de charger les besoins.')
  } finally {
    loading.value = false
  }
}

function openCreate(day: PlanningDayKey | null) {
  editTarget.value = null;
  initialDay.value = day;
  showForm.value = true
}

function openEdit(r: PlanningRequirement) {
  editTarget.value = r;
  initialDay.value = r.day_of_week;
  showForm.value = true
}

function onSaved() {
  showForm.value = false;
  loadRequirements()
}

function timeSummary(r: PlanningRequirement) {
  const b = r.session_template?.definition?.[r.day_of_week];
  return Array.isArray(b) && b.length ? `${b[0].work[0]}–${b[0].work[1]}` : 'Horaire indisponible'
}

const Mini = defineComponent({
  props: {label: String, value: [String, Number], active: Boolean}, setup(p) {
    return () => h('div', {class: `rounded-lg px-3 py-2 ${p.active ? 'bg-indigo-50' : 'bg-slate-50'}`}, [h('p', {class: 'text-[9px] font-bold uppercase text-slate-400'}, p.label), h('p', {class: 'mt-.5 text-sm font-bold text-slate-800'}, String(p.value))])
  }
});
onMounted(loadRequirements)
</script>
<style scoped>.primary-button, .secondary-button, .edit-button {
  display: inline-flex;
  align-items: center;
  gap: .45rem;
  border-radius: .75rem;
  font-size: .75rem;
  font-weight: 700;
  transition: .16s
}

.primary-button {
  background: #4f46e5;
  color: #fff;
  padding: .65rem 1rem
}

.primary-button:disabled {
  background: #cbd5e1
}

.secondary-button, .edit-button {
  border: 1px solid #e2e8f0;
  background: white;
  color: #475569;
  padding: .65rem .9rem
}

.edit-button {
  padding: .5rem .65rem;
  font-size: .68rem
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 999px;
  padding: .4rem .75rem;
  font-size: .7rem;
  font-weight: 600;
  color: #475569
}

.status-pill.ready {
  border-color: #a7f3d0;
  background: #ecfdf5;
  color: #047857
}

.status-pill.warning {
  border-color: #fde68a;
  background: #fffbeb;
  color: #b45309
}

.badge {
  border-radius: 999px;
  padding: .18rem .5rem;
  font-size: .55rem;
  font-weight: 800;
  text-transform: uppercase
}

.badge.guard {
  background: #f5f3ff;
  color: #6d28d9
}

.badge.standard {
  background: #eff6ff;
  color: #1d4ed8
}

.badge.allocation {
  background: #f1f5f9;
  color: #475569
}

.icon-button {
  border-radius: .6rem;
  padding: .45rem;
  color: #94a3b8
}

.icon-button:hover {
  background: white;
  color: #334155
}</style>
