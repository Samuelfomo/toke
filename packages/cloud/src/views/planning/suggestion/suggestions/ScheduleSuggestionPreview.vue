<template>
  <div class="space-y-6">
    <PlanningPageHeader eyebrow="Contrôle avant publication"
                        :title="suggestion?`Suggestion du ${formatDate(suggestion.period_from)} au ${formatDate(suggestion.period_to)}`:'Aperçu de la suggestion'"
                        description="Contrôlez les scores, les gardes, les repos et chaque affectation avant de publier le planning officiel.">
      <template #actions>
        <button class="secondary-button" @click="router.push({name:'planning-suggestion-list'})">
          <IconArrowLeft :size="16"/>
          Retour
        </button>
        <template v-if="suggestion?.status==='draft'">
          <button class="danger-button" @click="confirmAction='reject'">
            <IconX :size="16"/>
            Rejeter
          </button>
          <button class="primary-button" @click="confirmAction='approve'">
            <IconCircleCheck :size="16"/>
            Valider et publier
          </button>
        </template>
      </template>
    </PlanningPageHeader>
    <PlanningInfoPanel v-if="errorMessage" tone="warning" title="Chargement impossible" :description="errorMessage"/>
    <div v-if="loading" class="space-y-4">
      <div class="h-28 animate-pulse rounded-2xl bg-slate-100"/>
      <div class="h-96 animate-pulse rounded-2xl bg-slate-100"/>
    </div>
    <template v-else-if="suggestion">
      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-5">
          <Score label="Conformité globale" :value="suggestion.conformity_score"/>
          <Score label="Couverture" :value="suggestion.diagnostics.coverageScore"/>
          <Score label="Équité" :value="suggestion.diagnostics.fairnessScore"/>
          <Info label="Collaborateurs" :value="String(suggestion.items.length)"/>
          <Info label="Solveur" :value="solverLabel"/>
        </div>
      </section>
      <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap gap-2">
            <Legend label="Horaire fixe" tone="indigo"/>
            <Legend label="Service généré" tone="blue"/>
            <Legend label="Garde / continuation" tone="violet"/>
            <Legend label="Repos post-garde" tone="amber"/>
            <Legend label="Repos" tone="slate"/>
          </div>
          <div class="inline-flex rounded-xl border border-slate-200 p-1">
            <button class="tab-button" :class="activeTab==='planning'?'active':''" @click="activeTab='planning'">
              Planning
            </button>
            <button class="tab-button" :class="activeTab==='coverage'?'active':''" @click="activeTab='coverage'">
              Couverture
            </button>
            <button class="tab-button" :class="activeTab==='issues'?'active':''" @click="activeTab='issues'">Alertes
              {{ suggestion.diagnostics.violations.length }}
            </button>
          </div>
        </div>
      </section>
      <section v-if="activeTab==='planning'"
               class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="overflow-auto">
          <table class="border-collapse" style="min-width:max-content;width:100%">
            <thead class="sticky top-0 z-20">
            <tr class="border-b border-slate-200 bg-slate-50">
              <th class="sticky left-0 z-30 min-w-[220px] border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">
                Collaborateur
              </th>
              <th v-for="day in calendarDays" :key="day.iso" class="min-w-[108px] px-2 py-3 text-center"
                  :class="day.outsidePeriod?'bg-amber-50/60':day.weekend?'bg-slate-100/70':''"><p
                  class="text-[10px] font-bold uppercase" :class="day.outsidePeriod?'text-amber-700':'text-slate-500'">
                {{ day.shortLabel }}</p>
                <p class="mt-.5 text-[10px] text-slate-400">{{ day.dayMonth }}</p>
                <p v-if="day.outsidePeriod" class="mt-1 text-[8px] font-bold uppercase text-amber-600">suite</p></th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="item in suggestion.items" :key="item.guid" class="border-b border-slate-100 last:border-0">
              <td class="sticky left-0 z-10 border-r border-slate-100 bg-white px-4 py-3">
                <div class="flex items-center gap-3">
                  <div
                      class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                    {{ initials(item.user.name) }}
                  </div>
                  <div><p class="max-w-[150px] truncate text-xs font-bold text-slate-800">{{ item.user.name }}</p>
                    <p class="mt-.5 text-[10px] text-slate-400">{{ item.user.employee_code ?? 'Sans code' }}</p></div>
                </div>
              </td>
              <td v-for="day in calendarDays" :key="day.iso" class="p-1.5 align-middle"
                  :class="day.weekend?'bg-slate-50/70':''">
                <button type="button" class="cell-card" :class="cellClasses(item,day.iso)"
                        :disabled="suggestion.status!=='draft'||!(day.iso in item.schedule)"
                        @click="openCell(item,day.iso)"><span
                    class="block truncate text-[10px] font-bold">{{ cellLabel(item, day.iso) }}</span><span
                    class="mt-1 block truncate text-[9px] opacity-70">{{ cellTime(item, day.iso) }}</span><span
                    v-if="isManual(item,day.iso)"
                    class="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-orange-500"/></button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section v-else-if="activeTab==='coverage'"
               class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[850px]">
            <thead class="bg-slate-50">
            <tr class="text-left text-[10px] font-bold uppercase text-slate-400">
              <th class="px-5 py-3">Date</th>
              <th class="px-4 py-3">Service</th>
              <th class="px-4 py-3">Mode</th>
              <th class="px-4 py-3">Minimum</th>
              <th class="px-4 py-3">Cible</th>
              <th class="px-4 py-3">Affectés</th>
              <th class="px-5 py-3">État</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
            <tr v-for="c in suggestion.diagnostics.coverage" :key="`${c.date}-${c.requirementGuid}`">
              <td class="px-5 py-3 text-xs font-semibold text-slate-700">{{ formatDate(c.date) }}</td>
              <td class="px-4 py-3 text-xs text-slate-600">{{ c.templateName }}</td>
              <td class="px-4 py-3 text-xs text-slate-500">{{ ALLOCATION_LABELS[c.allocationMode] }}</td>
              <td class="px-4 py-3 text-xs text-slate-600">{{ c.minimum }}</td>
              <td class="px-4 py-3 text-xs text-slate-600">{{ c.target }}</td>
              <td class="px-4 py-3 text-xs font-bold text-slate-800">{{ c.assigned }}</td>
              <td class="px-5 py-3"><span class="rounded-full px-2 py-1 text-[9px] font-bold"
                                          :class="c.status==='COVERED'?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-700'">{{
                  coverageLabel(c.status)
                }}</span>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section v-else class="space-y-3">
        <PlanningInfoPanel v-if="!suggestion.diagnostics.violations.length" tone="success"
                           title="Aucune violation détectée"
                           description="Le moteur n’a retourné aucune contrainte dure ou alerte sur cette suggestion."/>
        <article v-for="v in suggestion.diagnostics.violations" :key="`${v.code}-${v.date}-${v.employeeGuid}`"
                 class="rounded-2xl border p-4"
                 :class="v.severity==='HARD'?'border-red-200 bg-red-50':'border-amber-200 bg-amber-50'">
          <div class="flex items-start gap-3">
            <IconAlertTriangle :size="18" :class="v.severity==='HARD'?'text-red-600':'text-amber-600'"/>
            <div>
              <div class="flex gap-2"><p class="text-xs font-bold text-slate-900">{{ v.code }}</p><span
                  class="text-[9px] font-bold uppercase"
                  :class="v.severity==='HARD'?'text-red-700':'text-amber-700'">{{ v.severity }}</span></div>
              <p class="mt-1 text-xs leading-5 text-slate-600">{{ v.message }}</p>
              <p v-if="v.date" class="mt-1 text-[10px] text-slate-400">{{ formatDate(v.date) }}</p></div>
          </div>
        </article>
      </section>
    </template>
    <SuggestionCellEditor
        :open="cellEditorOpen" :suggestion-guid="suggestion?.guid??''" :item="selectedItem"
        :iso="selectedIso" :templates="templates" @close="cellEditorOpen=false"
        @saved="onCellSaved"
    />
    <PlanningConfirmDialog
        :open="confirmAction!==null" :danger="confirmAction==='reject'" :loading="actionLoading"
        :title="confirmAction==='approve'?'Valider et publier ce planning ?':'Rejeter cette suggestion ?'"
        :description="confirmAction==='approve'?'Les affectations officielles seront créées pour les collaborateurs et remplaceront les affectations qui chevauchent la période.':'Cette proposition ne sera pas publiée et quittera la liste principale.'"
        :important="confirmAction==='approve'?'Vérifiez les gardes, les repos post-garde et les cellules modifiées manuellement avant de continuer.':'Le rejet ne modifie aucun planning déjà publié.'"
        :confirm-label="confirmAction==='approve'?'Publier le planning':'Rejeter la suggestion'"
        @cancel="confirmAction=null" @confirm="resolveAction"
    />
  </div>
</template>
<script setup lang="ts">import {computed, defineComponent, h, onMounted, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {IconAlertTriangle, IconArrowLeft, IconCircleCheck, IconX} from '@tabler/icons-vue';
import SessionTemplateService from '@/service/SessionTemplate';
import ScheduleSuggestionService from '@/service/ScheduleSuggestionService';
import PlanningConfirmDialog from '../components/PlanningConfirmDialog.vue';
import PlanningInfoPanel from '../components/PlanningInfoPanel.vue';
import PlanningPageHeader from '../components/PlanningPageHeader.vue';
import SuggestionCellEditor from './SuggestionCellEditor.vue';
import {ALLOCATION_LABELS, formatDate, responseData, responseError} from '../planningSuggestion.helpers';
import type {
  PlanningDayKey,
  PlanningTemplateMini,
  ScheduleSuggestion,
  ScheduleSuggestionItem,
  SuggestionReasonSource
} from '../planningSuggestion.type';

const route = useRoute(), router = useRouter();
const loading = ref(false), errorMessage = ref(''), suggestion = ref<ScheduleSuggestion | null>(null),
    templates = ref<PlanningTemplateMini[]>([]), activeTab = ref<'planning' | 'coverage' | 'issues'>('planning'),
    cellEditorOpen = ref(false), selectedItem = ref<ScheduleSuggestionItem | null>(null), selectedIso = ref(''),
    confirmAction = ref<'approve' | 'reject' | null>(null), actionLoading = ref(false);
const dayKeys: PlanningDayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const templateMap = computed(() => new Map(templates.value.map(t => [t.guid, t])));
const solverLabel = computed(() => {
  const s = suggestion.value?.diagnostics.solver;
  return s ? `${s.usedSolver}${s.fallbackUsed ? ' · fallback' : ''}` : '—'
});
const calendarDays = computed(() => {
  if (!suggestion.value) return [];
  const keys = suggestion.value.items.flatMap(i => Object.keys(i.schedule));
  const max = keys.sort().at(-1) ?? suggestion.value.period_to;
  const result = [];
  let d = new Date(`${suggestion.value.period_from}T12:00:00`), end = new Date(`${max}T12:00:00`);
  while (d <= end) {
    const iso = d.toISOString().slice(0, 10);
    result.push({
      iso,
      shortLabel: new Intl.DateTimeFormat('fr-FR', {weekday: 'short'}).format(d).replace('.', ''),
      dayMonth: new Intl.DateTimeFormat('fr-FR', {day: '2-digit', month: '2-digit'}).format(d),
      weekend: [0, 6].includes(d.getDay()),
      outsidePeriod: iso > suggestion.value.period_to
    });
    d.setDate(d.getDate() + 1)
  }
  return result
});

async function load() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const [r, t] = await Promise.all([ScheduleSuggestionService.getByGuid(String(route.params.guid)), SessionTemplateService.list({
      current: true,
      active: true,
      limit: 250
    })]);
    suggestion.value = responseData(r).suggestion ?? null;
    templates.value = t?.data?.templates?.items ?? t?.data?.session_templates?.items ?? []
  } catch (e: any) {
    errorMessage.value = responseError(e, 'Impossible de charger cette suggestion.')
  } finally {
    loading.value = false
  }
}

function initials(n: string) {
  return n.split(/\s+/).slice(0, 2).map(v => v[0]).join('').toUpperCase()
}

function reason(i: ScheduleSuggestionItem, iso: string) {
  return i.reasons?.[iso] ?? null
}

function isManual(i: ScheduleSuggestionItem, iso: string) {
  return reason(i, iso)?.factors?.some(f => f.toLowerCase().includes('manuel')) ?? false
}

function source(i: ScheduleSuggestionItem, iso: string): SuggestionReasonSource | 'MANUAL' {
  if (isManual(i, iso)) return 'MANUAL';
  return reason(i, iso)?.source ?? (i.schedule[iso] === null ? 'REST' : 'GENERATED')
}

function cellClasses(i: ScheduleSuggestionItem, iso: string) {
  if (!(iso in i.schedule)) return 'bg-white text-slate-300 border-slate-100';
  const s = source(i, iso);
  return {
    FIXED: 'bg-indigo-50 text-indigo-800 border-indigo-100',
    GENERATED: isGuard(i, iso) ? 'bg-violet-50 text-violet-800 border-violet-100' : 'bg-blue-50 text-blue-800 border-blue-100',
    FILL_REMAINING: 'bg-cyan-50 text-cyan-800 border-cyan-100',
    GUARD_CONTINUATION: 'bg-violet-100 text-violet-900 border-violet-200',
    POST_GUARD_REST: 'bg-amber-50 text-amber-800 border-amber-100',
    REST: 'bg-slate-100 text-slate-500 border-slate-200',
    MANUAL: 'bg-orange-50 text-orange-800 border-orange-200'
  }[s]
}

function isGuard(i: ScheduleSuggestionItem, iso: string) {
  return (reason(i, iso)?.templateName ?? '').toLowerCase().includes('guard') || (reason(i, iso)?.templateName ?? '').toLowerCase().includes('garde')
}

function cellLabel(i: ScheduleSuggestionItem, iso: string) {
  if (!(iso in i.schedule)) return '—';
  const r = reason(i, iso);
  if (source(i, iso) === 'POST_GUARD_REST') return 'Repos après garde';
  if (i.schedule[iso] === null || i.schedule[iso] === undefined) return 'Repos';
  return r?.templateName ?? templateMap.value.get(i.schedule[iso]!)?.name ?? 'Service'
}

function cellTime(i: ScheduleSuggestionItem, iso: string) {
  if (!(iso in i.schedule)) return '';
  const guid = i.schedule[iso];
  if (!guid) return '—';
  const t = templateMap.value.get(guid);
  const day = dayKeys[new Date(`${iso}T12:00:00`).getDay()];
  const b = t?.definition?.[day];
  return Array.isArray(b) && b.length ? `${b[0].work[0]}–${b[0].work[1]}` : 'Horaire'
}

function openCell(i: ScheduleSuggestionItem, iso: string) {
  if (!(iso in i.schedule)) return;
  selectedItem.value = i;
  selectedIso.value = iso;
  cellEditorOpen.value = true
}

function onCellSaved(item: ScheduleSuggestionItem) {
  if (!suggestion.value) return;
  const index = suggestion.value.items.findIndex(v => v.guid === item.guid);
  if (index >= 0) suggestion.value.items[index] = item;
  cellEditorOpen.value = false
}

async function resolveAction() {
  if (!suggestion.value || !confirmAction.value) return;
  const action = confirmAction.value;
  actionLoading.value = true;
  try {
    const r = action === 'approve' ? await ScheduleSuggestionService.approve(suggestion.value.guid) : await ScheduleSuggestionService.reject(suggestion.value.guid);
    if (!r?.success) throw r;
    suggestion.value.status = action === 'approve' ? 'approved' : 'rejected';
    confirmAction.value = null;
    await router.push({name: action === 'approve' ? 'schedule-assignment' : 'planning-suggestion-list'})
  } catch (e: any) {
    errorMessage.value = responseError(e, 'Cette action n’a pas pu être exécutée.');
    confirmAction.value = null
  } finally {
    actionLoading.value = false
  }
}

function coverageLabel(s: string) {
  return {
    COVERED: 'Couvert',
    BELOW_TARGET: 'Sous la cible',
    BELOW_MINIMUM: 'Minimum non atteint',
    ABOVE_MAXIMUM: 'Maximum dépassé'
  }[s] ?? s
}

const Score = defineComponent({
  props: {label: String, value: Number}, setup(p) {
    return () => h('div', {class: 'bg-white p-5'}, [h('p', {class: 'text-[9px] font-bold uppercase tracking-[.12em] text-slate-400'}, p.label), h('p', {class: 'mt-1 text-2xl font-bold text-slate-900'}, `${p.value ?? 0}%`)])
  }
});
const Info = defineComponent({
  props: {label: String, value: String}, setup(p) {
    return () => h('div', {class: 'bg-white p-5'}, [h('p', {class: 'text-[9px] font-bold uppercase tracking-[.12em] text-slate-400'}, p.label), h('p', {class: 'mt-1 text-lg font-bold text-slate-900'}, p.value)])
  }
});
const Legend = defineComponent({
  props: {label: String, tone: String}, setup(p) {
    const c: any = {
      indigo: 'bg-indigo-500',
      blue: 'bg-blue-500',
      violet: 'bg-violet-500',
      amber: 'bg-amber-500',
      slate: 'bg-slate-400'
    };
    return () => h('span', {class: 'inline-flex items-center gap-2 text-[10px] font-semibold text-slate-500'}, [h('span', {class: `h-2 w-2 rounded-full ${c[p.tone ?? 'slate']}`}), p.label])
  }
});
onMounted(load)
</script>
<style scoped>.primary-button, .secondary-button, .danger-button {
  display: inline-flex;
  align-items: center;
  gap: .45rem;
  border-radius: .75rem;
  padding: .65rem .9rem;
  font-size: .72rem;
  font-weight: 700
}

.primary-button {
  background: #4f46e5;
  color: #fff
}

.secondary-button {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569
}

.danger-button {
  border: 1px solid #fecaca;
  background: #fff;
  color: #dc2626
}

.tab-button {
  border-radius: .55rem;
  padding: .5rem .75rem;
  font-size: .68rem;
  font-weight: 700;
  color: #64748b
}

.tab-button.active {
  background: #0f172a;
  color: #fff
}

.cell-card {
  position: relative;
  width: 100%;
  min-height: 48px;
  border: 1px solid;
  border-radius: .7rem;
  padding: .45rem .4rem;
  text-align: center;
  transition: .14s
}

.cell-card:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgb(15 23 42/.08)
}

.cell-card:disabled {
  cursor: default
}</style>
