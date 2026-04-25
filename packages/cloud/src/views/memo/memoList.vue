<template>
<!--  <div class="min-h-screen flex flex-col bg-[linear-gradient(90deg_rgba(240,228,245,1)_0%,_rgba(208,232,247,1)_71%,_rgba(240,228,245,1)_100%)]">-->
  <div class="min-h-screen flex flex-col bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7]">
  <div class="top-header">
      <Header />
    </div>

    <main class="flex-1 container mx-auto px-4 py-6 max-w-7xl">

      <!-- Page Header -->
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Mémos</h1>
          <p class="text-sm text-gray-500 mt-0.5">Consultez et gérez tous les mémos du système</p>
        </div>
        <button
            @click="naviguerCreerMemo"
            class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
        >
          <span class="text-lg leading-none">+</span>
          <span>Nouveau mémo</span>
        </button>
      </div>

      <!-- Filters Card -->
      <div class="bg-white border border-gray-100 shadow-sm mb-4 py-4 space-y-6">

        <!-- Row 1 : filtres principaux -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-gray-100">

          <!-- Période -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Période</label>
            <div class="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:border-gray-300 transition-colors">
              <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke-width="2"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke-width="2"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/>
              </svg>
              <span class="truncate text-xs">{{ formatPeriode() }}</span>
              <svg class="w-3.5 h-3.5 text-gray-400 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>

          <!-- Type de mémo -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Type de mémo</label>
            <div class="relative">
              <select
                  v-model="filtres.type"
                  class="w-full appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                <option value="">Tous les types</option>
                <option v-for="t in memoTypes.slice(1)" :key="t.value" :value="t.value">
                  {{ t.label }}
                </option>
              </select>
              <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>

          <!-- Employé -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Employé</label>
            <div class="relative">
              <select
                  v-model="filtres.employeId"
                  class="w-full appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                <option value="">Tous les employés</option>
                <option v-for="emp in employesFiltreOptions" :key="emp.guid" :value="emp.guid">
                  {{ emp.nom }}
                </option>
              </select>
              <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>

          <!-- Statut -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</label>
            <div class="relative">
              <select
                  v-model="filtres.statut"
                  class="w-full appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                <option value="">Tous les statuts</option>
                <option v-for="s in memoStatuts" :key="s.value" :value="s.value">
                  {{ s.label }}
                </option>
              </select>
              <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Row 2 : recherche + tri + actions -->
        <div class="flex items-center gap-3 px-4 py-3">
          <!-- Recherche -->
          <div class="relative flex-1">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" stroke-width="2"/>
              <path stroke-linecap="round" stroke-width="2" d="M21 21l-4.35-4.35"/>
            </svg>
            <input
                v-model="recherche"
                type="text"
                placeholder="Rechercher un mémo, un employé, un contenu..."
                class="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <!-- Tri -->
          <div class="flex items-center gap-1.5 text-sm text-gray-600 flex-shrink-0">
            <span class="text-gray-400 hidden sm:inline">Trier par</span>
            <div class="relative">
              <select
                  v-model="tri"
                  class="appearance-none pl-3 pr-7 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="recent">Plus récent</option>
                <option value="oldest">Plus ancien</option>
                <option value="name">Nom employé</option>
              </select>
              <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>

          <!-- Réinitialiser -->
          <button
              @click="reinitialiserFiltres"
              class="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span class="hidden sm:inline">Réinitialiser</span>
          </button>
        </div>
      </div>

      <!-- Memo List Component -->
      <Memo
          :memos="memosFiltres"
          :is-loading="memoStore.isLoading"
          :error="erreur"
          :empty-title="getEmptyTitle"
          :empty-description="getEmptyDescription"
          :on-retry="chargerMemos"
          @memo-click="voirDetailMemo"
      >
        <template #empty-action>
          <button
              v-if="!hasActiveFiltres"
              @click="naviguerCreerMemo"
              class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            <span>+</span> Créer mon premier mémo
          </button>
        </template>
      </Memo>

    </main>

    <Footer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import router from '@/router';
import { useUserStore } from '@/stores/userStore';
import { useMemoStore } from '@/stores/memoStore';
import Header from '@/views/components/header.vue';
import Footer from '@/views/components/footer.vue';
import Memo from '../memo/memo.vue';
import HeadBuilder from '@/utils/HeadBuilder';
import footerCss from "../../assets/css/toke-footer-24.css?url"

// ── Stores ─────────────────────────────────────
const userStore = useUserStore();
const memoStore = useMemoStore();
const managerGuid = computed(() => userStore.user?.guid ?? '');

// ── State ──────────────────────────────────────
const erreur = ref('');
const recherche = ref('');
const tri = ref<'recent' | 'oldest' | 'name'>('recent');
const filtres = ref({ employeId: '', type: '', statut: '' });

// ── Config ─────────────────────────────────────
const memoTypes = [
  { value: '', label: 'Tous les types' },
  { value: 'delay_justification', label: 'Retard' },
  { value: 'absence_justification', label: 'Absence' },
  { value: 'session_closure', label: 'Clôture' },
  { value: 'correction_request', label: 'Correction' },
  { value: 'auto_generated', label: 'Auto' },
];

const memoStatuts = [
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvé' },
  { value: 'rejected', label: 'Rejeté' },
];

/**
 * Employés pour le filtre = uniquement les target_user (jamais le manager).
 * author_user est toujours le manager → on l'exclut de la liste.
 * On déduplique par guid.
 */
const employesFiltreOptions = computed(() => {
  const map = new Map<string, { guid: string; nom: string }>();
  for (const memo of memoStore.memos) {
    if (memo.destinataireId && memo.destinataireId !== managerGuid.value && memo.destinataireNom && memo.destinataireNom !== 'N/A') {
      map.set(memo.destinataireId, { guid: memo.destinataireId, nom: memo.destinataireNom });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom));
});

// ── Computed ───────────────────────────────────
const getInterlocuteur = (memo: any) => {
  const destNom = memo.destinataireNom && memo.destinataireNom !== 'N/A' ? memo.destinataireNom : null;
  const creatNom = memo.createurNom || null;

  if (memo.autoGenerated) return {
    nom: destNom ?? creatNom ?? '—',
    code: memo.destinataireCode !== 'N/A' ? memo.destinataireCode : memo.createurCode,
    departement: memo.destinataireDepartement !== 'N/A' ? memo.destinataireDepartement : memo.createurDepartement,
  };
  // author_user = toujours manager → afficher le destinataire
  return {
    nom: destNom ?? '—',
    code: memo.destinataireCode !== 'N/A' ? memo.destinataireCode : '',
    departement: memo.destinataireDepartement !== 'N/A' ? memo.destinataireDepartement : '',
  };
};

const memosFiltres = computed(() => {
  let result = [...memoStore.memos];

  // Filtre employé : uniquement les mémos où il est target_user
  if (filtres.value.employeId) {
    result = result.filter(m => m.destinataireId === filtres.value.employeId);
  }
  if (filtres.value.type) {
    result = result.filter(m => m.type === filtres.value.type);
  }
  if (filtres.value.statut) {
    result = result.filter(m => {
      if (filtres.value.statut === 'pending') return m.statut === 'pending' || m.statut === 'submitted';
      return m.statut === filtres.value.statut;
    });
  }
  if (recherche.value.trim()) {
    const q = recherche.value.toLowerCase();
    result = result.filter(m =>
        m.titre?.toLowerCase().includes(q) ||
        m.destinataireNom?.toLowerCase().includes(q) ||
        m.contenu?.toLowerCase().includes(q)
    );
  }

  // Tri
  result.sort((a, b) => {
    if (tri.value === 'oldest') return new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime();
    if (tri.value === 'name') return (a.destinataireNom || '').localeCompare(b.destinataireNom || '');
    return new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime();
  });

  return result.map(m => {
    const interlocuteur = getInterlocuteur(m);
    return { ...m, interlocuteurNom: interlocuteur.nom, interlocuteurCode: interlocuteur.code, interlocuteurDepartement: interlocuteur.departement };
  });
});

const hasActiveFiltres = computed(() =>
    !!filtres.value.type || !!filtres.value.employeId || !!filtres.value.statut || !!recherche.value
);

const getEmptyTitle = computed(() => hasActiveFiltres.value ? 'Aucun mémo trouvé' : 'Aucun mémo disponible');
const getEmptyDescription = computed(() =>
    hasActiveFiltres.value ? 'Aucun mémo ne correspond à vos critères' : 'Commencez par créer votre premier mémo'
);

// ── Methods ────────────────────────────────────
const formatPeriode = () => {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(weekAgo)} - ${fmt(now)}`;
};

const reinitialiserFiltres = () => {
  filtres.value = { employeId: '', type: '', statut: '' };
  recherche.value = '';
  tri.value = 'recent';
};

const naviguerCreerMemo = () => router.push('/memoNew');

const voirDetailMemo = (memo: any) => {
  memoStore.markMemoAsRead(memo.guid);
  router.push({ name: 'memoDetails', params: { guid: memo.guid } });
};

const chargerMemos = async () => {
  try {
    erreur.value = '';
    const managerId = userStore.user?.guid;
    if (!managerId) { erreur.value = 'ID du manager non disponible'; return; }
    await memoStore.loadMemos(managerId);
  } catch {
    erreur.value = 'Une erreur est survenue lors du chargement des mémos';
  }
};

// ── Lifecycle ──────────────────────────────────
let stopWatcher: (() => void) | null = null;

onMounted(async () => {
  HeadBuilder.apply({
    title: 'Mémos - Toké',
    css: [footerCss],
    meta: { viewport: 'width=device-width, initial-scale=1.0' }
  });
  await chargerMemos();
  memoStore.markAllMemosAsRead();
  stopWatcher = watch(() => memoStore.memos.length, () => memoStore.markAllMemosAsRead());
});

onUnmounted(() => stopWatcher?.());
</script>