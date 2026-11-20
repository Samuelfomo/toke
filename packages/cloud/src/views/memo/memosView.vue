<template>
  <div class="min-h-screen flex flex-col bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7]">
    <!--    <div class="top-header">-->
    <Header />
    <!--    </div>-->

    <main class="flex-1 flex overflow-hidden pb-4 max-w-[1600px] mx-auto rounded-md w-full bg-white/70 m-5">

      <div :class="['grid grid-cols-1 gap-4 items-start justify-between border-r border-gray-200 pt-4 transition-all duration-300', mode !== 'idle' ? 'hidden md:grid' : '']">
        <!-- Page Header -->
        <div class="flex items-center justify-between flex-shrink-0 p-4 space-x-4 border-b border-gray-200">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Mémos</h1>
            <p class="text-sm text-gray-500 mt-0.5">Gérez tous les mémos du système</p>
          </div>
          <button
              disabled title="Consultation uniquement"
              class="flex items-center gap-2 px-2.5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
          >
            <span class="text-lg leading-none">+</span>
            <span>Nouveau mémo</span>
          </button>
        </div>

        <!-- Colonne gauche : sidebar liste -->
        <div class=" flex-shrink-0 flex flex-col min-h-0 px-4">
          <MemoSidebar
              :memos="memosFiltres"
              :current-page="currentPage"
              :per-page="perPage"
              :total-items="memoStore.totalMemos"
              @page-change="changerPage"
              @limit-change="changerLimite"
              :is-loading="memoStore.isLoading"
              :error="erreur"
              @retry="chargerMemos"
              :selected-guid="memoSelectionneGuid"
              :filtres="filtres"
              :recherche="recherche"
              :tri="tri"
              :memo-types="memoTypes"
              :memo-statuts="memoStatuts"
              :employes-options="employesFiltreOptions"
              @select="selectionnerMemo"
              @nouveau="naviguerCreerMemo"
              @update:filtres="filtres = $event"
              @update:recherche="recherche = $event"
              @update:tri="updateTri"
              @reinitialiser="reinitialiserFiltres"
          />
        </div>
      </div>

      <!-- Layout 2 colonnes -->
      <div class="flex gap-3 flex-1 min-h-0 z-50">
        <!-- Colonne centrale : chat -->
        <div class="flex-1 min-w-0 flex flex-col min-h-0 bg-white shadow-sm overflow-hidden">
          <!-- Mode idle : invitation (desktop seulement) -->
          <div v-if="mode === 'idle'" class="hidden md:flex flex-1 flex-col items-center justify-center gap-4 text-gray-400">
            <svg class="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <p class="text-sm font-medium">Sélectionnez un mémo pour le consulter</p>
          </div>

          <!-- Mode create : formulaire création inline -->
          <MemoCreateChat
              v-else-if="!lectureSeule && mode === 'create'"
              @created="onMemoCreated"
              @cancel="mode = 'idle'"
              :preselected-employee-guid="getQueryString(route.query.employeeGuid)"
              :preselected-employee-name="getQueryString(route.query.employeeName)"
          />

          <!-- Mode detail : conversation -->
          <MemoDetailChat
              v-else-if="mode === 'detail' && memoSelectionneGuid"
              :key="`${memoStore.sessionKey}:${memoSelectionneGuid}`"
              :memo-guid="memoSelectionneGuid"
              :manager-guid="managerGuid"
              @action-done="onActionDone"
              @back="retourListe"
          />
        </div>
      </div>

      <!-- Panel droit : visible uniquement en mode detail sur lg+ -->
      <div v-if="mode === 'detail'" class="hidden lg:flex gap-3 min-h-0">
        <div class="w-[280px] flex-shrink-0 flex flex-col min-h-0">
          <MemoDetailPanel
              v-if="memoSelectionne"
              :memo="memoSelectionne"
              :manager-guid="managerGuid"
              :read-only="lectureSeule"
              :is-processing="isProcessing"
              :action-type="actionType"
              @approuver="approuverMemo"
              @rejeter="rejeterMemo"
              @revoquer="revoquerMemo"
          />
          <div v-else class="flex-1 bg-white/60 rounded-2xl" />
        </div>
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useMemoStore, type Memo } from '@/stores/memoStore';
import MemoService from '@/service/MemoService';
import Header from '@/views/components/header.vue';
import Footer from '@/views/components/footer.vue';
import MemoSidebar from './memoSidebar.vue';
import MemoDetailChat from './memoDetailChat.vue';
import MemoDetailPanel from './memoDetailPanel.vue';
import MemoCreateChat from './memoCreateChat.vue';
import HeadBuilder from '@/utils/HeadBuilder';
import footerCss from '../../assets/css/toke-footer-24.css?url';
import type { MemoItem } from './memoSidebar.vue'
import { formatMemoMessage } from '@/utils/memoLexicon';
import { memoReadErrorMessage } from '@/utils/memoReadError';

const router = useRouter();
const userStore = useUserStore();
const memoStore = useMemoStore();
const managerGuid = computed(() => userStore.user?.guid ?? '');

import { useRoute } from 'vue-router'
const route = useRoute()

// ── Mode ───────────────────────────────────────
// 'idle'   : rien de sélectionné (desktop : message d'accueil)
// 'create' : formulaire de création inline
// 'detail' : consultation d'un mémo existant
const lectureSeule = true;
const mode = ref<'idle' | 'create' | 'detail'>('idle');

// ── Sélection ──────────────────────────────────
const memoSelectionneGuid = ref<string>('');
const memoSelectionne = computed(() =>
    memoSelectionneGuid.value ? memoStore.getMemoByGuid(memoSelectionneGuid.value) ?? null : null
);

const retourListe = () => {
  memoSelectionneGuid.value = '';
  mode.value = 'idle';
};

const updateTri = (value: 'recent' | 'oldest') => {
  tri.value = value
}

// ── Filtres ────────────────────────────────────
const erreur = ref('');
const recherche = ref('');
const tri = ref<'recent' | 'oldest'>('recent');
const filtres = ref({ employeId: '', type: '', statut: '' });
const currentPage = ref(1);
const perPage = ref(25);
let debounceHandle: ReturnType<typeof setTimeout> | undefined;
let requestVersion = 0;

const memoTypes = [
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
  { value: 'revoked', label: 'Révoqué' },
];

const employesFiltreOptions = computed(() => {
  const map = new Map<string, { guid: string; nom: string }>();
  for (const employee of memoStore.employees) {
    const nom = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
    if (employee.guid && employee.guid !== managerGuid.value) map.set(employee.guid, { guid: employee.guid, nom });
  }
  /* Les options issues des mémos ne couvrent que la page chargée.
     Le sélecteur reste alimenté par les employés déjà récupérés ; une source
     globale de collaborateurs est requise pour une exhaustivité parfaite. */
  for (const memo of memoStore.memos) {
    if (memo.destinataireId && memo.destinataireId !== managerGuid.value && memo.destinataireNom && memo.destinataireNom !== 'N/A') {
      map.set(memo.destinataireId, { guid: memo.destinataireId, nom: memo.destinataireNom });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom));
});

const getInterlocuteur = (memo: Memo) => {
  const destNom = memo.destinataireNom && memo.destinataireNom !== 'N/A' ? memo.destinataireNom : null;
  if (memo.autoGenerated) return {
    nom: destNom ?? memo.createurNom ?? '—',
    code: memo.destinataireCode !== 'N/A' ? memo.destinataireCode : memo.createurCode,
    departement: memo.destinataireDepartement !== 'N/A' ? memo.destinataireDepartement : memo.createurDepartement,
  };
  return {
    nom: destNom ?? '—',
    code: memo.destinataireCode !== 'N/A' ? memo.destinataireCode : '',
    departement: memo.destinataireDepartement !== 'N/A' ? memo.destinataireDepartement : '',
  };
};

const memosFiltres = computed(() => memoStore.memos.map(m => {
  const i = getInterlocuteur(m);
  return { ...m, titre: formatMemoMessage(m.titre),
    interlocuteurNom: i.nom, interlocuteurCode: i.code,
    interlocuteurDepartement: i.departement, isRead: m.isRead };
}));

const chargerPage = async (force = true) => {
  try {
    erreur.value = '';
    if (!managerGuid.value) return;
    const version = ++requestVersion;
    await memoStore.loadMemos(managerGuid.value, force, {
      offset: (currentPage.value - 1) * perPage.value, limit: perPage.value,
      memo_type: filtres.value.type === 'auto_generated' ? undefined : (filtres.value.type || undefined),
      memo_status: filtres.value.statut || undefined,
      target_user: filtres.value.employeId || undefined,
      search: recherche.value.trim() || undefined,
      sort: tri.value,
      ...(filtres.value.type === 'auto_generated' ? { auto_generated: true } : {}),
    });
    if (version !== requestVersion) return;
  } catch (error) { erreur.value = memoReadErrorMessage(error, 'Impossible de charger les mémos.'); console.error(error); }
};
const changerPage = (page: number) => { currentPage.value = page; void chargerPage(); };
const changerLimite = (limit: number) => { perPage.value = limit; currentPage.value = 1; void chargerPage(); };
watch([filtres, tri], () => { currentPage.value = 1; void chargerPage(); }, { deep: true });
watch(recherche, () => { clearTimeout(debounceHandle); debounceHandle = setTimeout(() => {
  currentPage.value = 1; void chargerPage();
}, 300); });

// ── Actions métier (depuis le panel droit) ─────
const isProcessing = ref(false);
const actionType = ref<'approve' | 'reject' | 'revoke' | null>(null);

const approuverMemo = async () => {
  if (lectureSeule) return;
  if (!memoSelectionne.value || isProcessing.value) return;
  const session = memoStore.sessionKey;
  const guid = memoSelectionne.value.guid;
  const manager = managerGuid.value;
  isProcessing.value = true;
  actionType.value = 'approve';
  try {
    const response = await MemoService.validateMemo(guid, manager);
    if (!response.success) return;
    if (session !== memoStore.sessionKey) return;
    await memoStore.refreshMemo(manager, guid);
    if (session !== memoStore.sessionKey) return;
    memoSelectionneGuid.value = '';
  } catch (e: any) {
    console.error('❌ Approbation:', e);
  } finally {
    if (session !== memoStore.sessionKey) return;
    isProcessing.value = false;
    actionType.value = null;
  }
};

const rejeterMemo = async () => {
  if (lectureSeule) return;
  if (!memoSelectionne.value || isProcessing.value) return;
  const session = memoStore.sessionKey;
  const guid = memoSelectionne.value.guid;
  const manager = managerGuid.value;
  isProcessing.value = true;
  actionType.value = 'reject';
  try {
    await MemoService.rejetMemo(guid, manager);
    if (session !== memoStore.sessionKey) return;
    await memoStore.refreshMemo(manager, guid);
    if (session !== memoStore.sessionKey) return;
    memoSelectionneGuid.value = '';
  } catch (e: any) {
    console.error('❌ Rejet:', e);
  } finally {
    if (session !== memoStore.sessionKey) return;
    isProcessing.value = false;
    actionType.value = null;
  }
};

const revoquerMemo = async () => {
  if (lectureSeule) return;
  if (!memoSelectionne.value || isProcessing.value) return;
  const session = memoStore.sessionKey;
  const guid = memoSelectionne.value.guid;
  const manager = managerGuid.value;
  isProcessing.value = true;
  actionType.value = 'revoke';
  try {
    await MemoService.revokeMemo(guid, manager);
    if (session !== memoStore.sessionKey) return;
    await memoStore.refreshMemo(manager, guid);
    if (session !== memoStore.sessionKey) return;
    memoSelectionneGuid.value = '';
  } catch (e: any) {
    console.error('❌ Révocation:', e);
  } finally {
    if (session !== memoStore.sessionKey) return;
    isProcessing.value = false;
    actionType.value = null;
  }
};

// ── Methods ────────────────────────────────────
const selectionnerMemo = async (memo: MemoItem) => {
  memoSelectionneGuid.value = memo.guid;
  mode.value = 'detail';

};

const onActionDone = async () => {
  // Le composant détail a déjà rafraîchi le mémo concerné.
  // L'événement Socket.IO synchronise les autres sessions.
};

// const naviguerCreerMemo = () => {
//   memoSelectionneGuid.value = '';
//   mode.value = 'create';
// };

const naviguerCreerMemo = () => {
  if (lectureSeule) return;
  memoSelectionneGuid.value = '';
  router.replace({ name: 'memoList' }); // nettoie les query params sans recharger la page
  mode.value = 'create';
};

const onMemoCreated = async (newGuid: string) => {
  const session = memoStore.sessionKey;
  const manager = managerGuid.value;
  if (newGuid) {
    // Une seule requête ciblée au lieu de recharger toute la liste.
    await memoStore.refreshMemo(manager, newGuid);
    if (session !== memoStore.sessionKey) return;
    try { await memoStore.confirmRead(manager, newGuid); }
    catch (error) { console.error('Lecture non enregistrée', error); }
    if (session !== memoStore.sessionKey) return;
    memoSelectionneGuid.value = newGuid;
    mode.value = 'detail';
  } else {
    mode.value = 'idle';
  }
};

const reinitialiserFiltres = () => {
  filtres.value = { employeId: '', type: '', statut: '' };
  recherche.value = '';
  tri.value = 'recent';
};

const chargerMemos = async () => {
  try {
    erreur.value = '';
    if (!managerGuid.value) { erreur.value = 'ID du manager non disponible'; return; }
    await chargerPage(false);
  } catch (error) {
    erreur.value = memoReadErrorMessage(error, 'Erreur lors du chargement des mémos.');
  }
};

const getQueryString = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] || ''
  return ''
}

watch(() => memoStore.sessionKey, () => {
  requestVersion++; clearTimeout(debounceHandle);
  memoSelectionneGuid.value = ''; mode.value = 'idle';
  erreur.value = ''; recherche.value = ''; currentPage.value = 1;
  filtres.value = { employeId: '', type: '', statut: '' };
  isProcessing.value = false; actionType.value = null;
}, { flush: 'sync' });

// ── Lifecycle ──────────────────────────────────
onMounted(async () => {
  const session = memoStore.sessionKey;
  HeadBuilder.apply({
    title: 'Mémos - Toké',
    css: [footerCss],
    meta: { viewport: 'width=device-width, initial-scale=1.0' }
  });
  await chargerMemos();
  if (session !== memoStore.sessionKey) return;

  // Ouverture directe d'un mémo depuis le contrôle des pointages.
  const requestedMemoGuid = getQueryString(route.query.memoGuid)
  if (requestedMemoGuid && memoStore.getMemoByGuid(requestedMemoGuid)) {
    await selectionnerMemo(memoStore.getMemoByGuid(requestedMemoGuid)!)
  }

  // Ajouter dans onMounted, après chargerMemos()
  const { action, employeeGuid, employeeName, entryGuid, date } = route.query
  if (!lectureSeule && action === 'create') {
    mode.value = 'create'
    // Si memoCreateChat accepte des props pré-remplies, tu peux les stocker dans un ref ici
  }
});

</script>
