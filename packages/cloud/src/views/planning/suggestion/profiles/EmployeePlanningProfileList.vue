<template>
  <div class="space-y-6">
    <PlanningPageHeader eyebrow="Étape 1" title="Profils de planification des collaborateurs"
                        description="Chaque collaborateur doit disposer d’un profil actif. Ce profil indique s’il conserve un horaire fixe, participe aux rotations ou reste exclu des générations.">
      <template #actions>
        <button type="button" class="secondary-button" :disabled="loading" @click="loadProfiles">
          <IconRefresh :size="16" :class="{'animate-spin':loading}"/>
          Actualiser
        </button>
        <button type="button" class="primary-button" @click="openCreate">
          <IconUserPlus :size="16"/>
          Configurer un collaborateur
        </button>
      </template>
    </PlanningPageHeader>
    <PlanningInfoPanel title="Comment choisir le bon mode ?"
                       description="Le mode décrit la participation du collaborateur au moteur. Il ne modifie pas son compte utilisateur."
                       :examples="['Horaire fixe : même modèle horaire, avec un repos défini ou choisi par le moteur.','Rotation automatique : services répartis selon les besoins et l’équité.','Exclu : collaborateur non inclus dans les prochaines générations.']"
                       important="Un collaborateur FIXED doit obligatoirement posséder un Session Template fixe."/>
    <div class="grid gap-4 sm:grid-cols-3">
      <Metric label="Horaires fixes" :value="stats.fixed" help="Modèle stable, repos fixe ou rotatif." tone="indigo"/>
      <Metric label="En rotation" :value="stats.rotating" help="Répartis automatiquement entre les services."
              tone="emerald"/>
      <Metric label="Exclus" :value="stats.excluded" help="Non inclus dans les futures suggestions." tone="slate"/>
    </div>
    <PlanningInfoPanel v-if="errorMessage" tone="warning" title="Chargement impossible" :description="errorMessage"/>
    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div
          class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 class="text-sm font-bold text-slate-900">Profils actifs</h2>
          <p class="mt-1 text-xs text-slate-500">{{ profiles.length }} profil(s) disponibles pour le moteur.</p></div>
        <div class="relative w-full sm:w-72">
          <IconSearch :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input v-model="search" type="search" placeholder="Rechercher un collaborateur…" class="search-control"/>
        </div>
      </div>
      <div v-if="loading" class="space-y-3 p-5">
        <div v-for="i in 5" :key="i" class="h-16 animate-pulse rounded-xl bg-slate-100"/>
      </div>
      <div v-else-if="filteredProfiles.length===0" class="px-6 py-14 text-center">
        <IconUsersGroup :size="30" class="mx-auto text-slate-300"/>
        <p class="mt-3 text-sm font-bold text-slate-800">Aucun profil trouvé</p>
        <p class="mt-1 text-xs text-slate-500">Configurez la participation des collaborateurs avant de générer.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[980px]">
          <thead class="bg-slate-50/80">
          <tr class="text-left text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">
            <th class="px-5 py-3.5">Collaborateur</th>
            <th class="px-4 py-3.5">Mode</th>
            <th class="px-4 py-3.5">Horaire fixe</th>
            <th class="px-4 py-3.5">Gestion du repos</th>
            <th class="px-4 py-3.5">Limite hebdo.</th>
            <th class="px-4 py-3.5">État</th>
            <th class="px-5 py-3.5 text-right">Action</th>
          </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
          <tr v-for="profile in filteredProfiles" :key="profile.guid" class="hover:bg-slate-50/70">
            <td class="px-5 py-4">
              <div class="flex items-center gap-3">
                <div
                    class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                  {{ initials(profile.user?.name) }}
                </div>
                <div><p class="text-sm font-semibold text-slate-800">
                  {{ profile.user?.name ?? 'Collaborateur introuvable' }}</p>
                  <p class="mt-.5 text-[11px] text-slate-400">
                    {{ profile.user?.employee_code || 'Code non renseigné' }}</p></div>
              </div>
            </td>
            <td class="px-4 py-4"><span class="rounded-full px-2.5 py-1 text-[10px] font-bold"
                                        :class="modeClass(profile.planning_mode)">{{ MODE_LABELS[profile.planning_mode] }}</span>
            </td>
            <td class="px-4 py-4 text-xs text-slate-600">
              {{ profile.fixed_session_template?.name ?? 'Non applicable' }}
            </td>
            <td class="px-4 py-4 text-xs text-slate-600">
              {{ profile.planning_mode === 'FIXED' ? (profile.fixed_rest_day_mode === 'ROTATING' ? 'Choisi par le moteur' : 'Défini dans le template') : 'Selon les règles globales' }}
            </td>
            <td class="px-4 py-4 text-xs text-slate-600">{{ formatMinutes(profile.max_weekly_minutes) }}</td>
            <td class="px-4 py-4"><span class="inline-flex items-center gap-1.5 text-xs font-semibold"
                                        :class="profileComplete(profile)?'text-emerald-700':'text-amber-700'"><span
                class="h-1.5 w-1.5 rounded-full"
                :class="profileComplete(profile)?'bg-emerald-500':'bg-amber-500'"/>{{ profileComplete(profile) ? 'Profil complet' : 'À compléter' }}</span>
            </td>
            <td class="px-5 py-4 text-right">
              <button type="button" class="edit-button" @click="openEdit(profile)">
                <IconPencil :size="14"/>
                Modifier
              </button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </section>
    <EmployeePlanningProfileForm :open="showForm" :profile="editTarget" :existing-user-guids="existingUserGuids"
                                 @close="showForm=false" @saved="onSaved"/>
  </div>
</template>
<script setup lang="ts">
import {computed, defineComponent, h, onMounted, ref} from 'vue';
import {IconPencil, IconRefresh, IconSearch, IconUserPlus, IconUsersGroup} from '@tabler/icons-vue';
import EmployeePlanningProfileService from '@/service/EmployeePlanningProfileService';
import PlanningInfoPanel from '../components/PlanningInfoPanel.vue';
import PlanningPageHeader from '../components/PlanningPageHeader.vue';
import EmployeePlanningProfileForm from './EmployeePlanningProfileForm.vue';
import {formatMinutes, MODE_LABELS, responseData, responseError} from '../planningSuggestion.helpers';
import type {EmployeePlanningProfile, PlanningMode} from '../planningSuggestion.type';

const loading = ref(false), errorMessage = ref(''), search = ref(''), profiles = ref<EmployeePlanningProfile[]>([]),
    showForm = ref(false), editTarget = ref<EmployeePlanningProfile | null>(null);
const stats = computed(() => ({
  fixed: profiles.value.filter(p => p.planning_mode === 'FIXED').length,
  rotating: profiles.value.filter(p => p.planning_mode === 'ROTATING').length,
  excluded: profiles.value.filter(p => p.planning_mode === 'EXCLUDED').length
}));
const existingUserGuids = computed(() => profiles.value.map(p => p.user?.guid).filter(Boolean) as string[]);
const filteredProfiles = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? profiles.value.filter(p => [p.user?.name, p.user?.employee_code, MODE_LABELS[p.planning_mode], p.fixed_session_template?.name].filter(Boolean).some(v => String(v).toLowerCase().includes(q))) : profiles.value
});

async function loadProfiles() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const r = await EmployeePlanningProfileService.list();
    profiles.value = responseData(r).employee_planning_profiles?.items ?? []
  } catch (e: any) {
    errorMessage.value = responseError(e, 'Impossible de charger les profils.')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editTarget.value = null;
  showForm.value = true
}

function openEdit(p: EmployeePlanningProfile) {
  editTarget.value = p;
  showForm.value = true
}

function onSaved() {
  showForm.value = false;
  loadProfiles()
}

function initials(n?: string) {
  return n ? n.split(/\s+/).slice(0, 2).map(v => v[0]).join('').toUpperCase() : '?'
}

function profileComplete(p: EmployeePlanningProfile) {
  return p.active && (p.planning_mode !== 'FIXED' || Boolean(p.fixed_session_template))
}

function modeClass(m: PlanningMode) {
  return {
    FIXED: 'bg-indigo-50 text-indigo-700',
    ROTATING: 'bg-emerald-50 text-emerald-700',
    EXCLUDED: 'bg-slate-100 text-slate-600'
  }[m]
}

const Metric = defineComponent({
  props: {label: String, value: Number, help: String, tone: String}, setup(p) {
    return () => h('div', {class: `rounded-2xl border p-4 ${p.tone === 'indigo' ? 'border-indigo-100 bg-indigo-50/60' : p.tone === 'emerald' ? 'border-emerald-100 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'}`}, [h('p', {class: 'text-[10px] font-bold uppercase tracking-[.12em] text-slate-500'}, p.label), h('p', {class: 'mt-1 text-2xl font-bold text-slate-900'}, String(p.value)), h('p', {class: 'mt-1 text-xs text-slate-500'}, p.help)])
  }
});
onMounted(loadProfiles)
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
  color: white;
  padding: .65rem 1rem
}

.secondary-button {
  border: 1px solid #e2e8f0;
  background: white;
  color: #475569;
  padding: .65rem .9rem
}

.edit-button {
  border: 1px solid #e2e8f0;
  color: #475569;
  padding: .5rem .65rem
}

.search-control {
  width: 100%;
  border-radius: .75rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: .65rem .75rem .65rem 2.25rem;
  font-size: .75rem;
  outline: none
}

.search-control:focus {
  border-color: #a5b4fc;
  background: white;
  box-shadow: 0 0 0 3px #e0e7ff
}</style>
