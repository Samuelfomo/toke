<template>
  <div class="bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7]">
    <div class="flex h-dvh flex-col">
    <!--    <div class="top-header">-->
    <Header />
    <!--    </div>-->

    <main class="flex min-h-0 flex-1 flex-col overflow-hidden max-w-[1600px] mx-auto rounded-md w-full bg-white/70 lg:flex-row">

      <div :class="['min-h-0 flex-col border-r border-gray-200 lg:w-[340px] lg:shrink-0', mode !== 'idle' ? 'hidden lg:flex' : 'flex flex-1 lg:flex-none']">
        <!-- Page Header -->
        <div class="flex items-center justify-between flex-shrink-0 p-4 space-x-4 border-b border-gray-200">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Mémos</h1>
          </div>
          <button
              type="button" @click="naviguerCreerMemo"
              :disabled="lectureSeule" :aria-describedby="lectureSeule ? 'memo-write-status' : undefined"
              class="flex items-center gap-2 px-2.5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span class="text-lg leading-none">+</span>
            <span>Nouveau mémo</span>
          </button>
        </div>
        <p v-if="lectureSeule" id="memo-write-status" class="px-4 py-2 text-xs text-gray-600">
          Création et décisions indisponibles sur ce serveur.
        </p>

        <!-- Colonne gauche : sidebar liste -->
        <div class="flex flex-1 flex-col min-h-0 overflow-y-auto px-4">
          <MemoSidebar
              :memos="memosFiltres"
              :current-page="currentPage"
              :per-page="perPage"
              :total-items="memoStore.totalMemos"
              :unread-total="memoStore.unreadMemosCount"
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
      <div :class="['min-h-0 min-w-0 flex-1', mode === 'idle' ? 'hidden lg:flex' : 'flex']">
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
              @cancel="annulerEdition"
              :preselected-employee-guid="getQueryString(route.query.employeeGuid)"
              :draft="brouillonEdite"
          />

          <!-- Mode detail : conversation -->
          <MemoDetailChat
              v-else-if="mode === 'detail' && memoSelectionneGuid"
              :key="`${memoStore.sessionKey}:${memoSelectionneGuid}:${detailRevision}`"
              :memo-guid="memoSelectionneGuid"
              :manager-guid="managerGuid"
              @action-done="onActionDone"
              @back="retourListe"
          />
        </div>
      </div>

      <!-- Panel droit : visible uniquement en mode detail sur lg+ -->
      <aside v-if="mode === 'detail' && memoSelectionne" aria-label="Informations complémentaires"
             class="max-h-[25dvh] shrink-0 overflow-y-auto border-t lg:max-h-none lg:w-[260px] lg:border-l lg:border-t-0">
          <MemoDetailPanel
              v-if="memoSelectionne"
              :memo="memoSelectionne"
              :read-only="lectureSeule"
              :is-processing="isProcessing"
              :action-type="actionType"
              :write-error="erreurAction"
              @modifier="modifierMemo"
              @soumettre="agirSurMemo('SUBMIT')"
              @approuver="agirSurMemo('APPROVE')"
              @rejeter="agirSurMemo('REJECT')"
              @revoquer="agirSurMemo('REVOKE')"
          />
      </aside>
    </main>

    </div>
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
import { formatMemoTitle } from '@/utils/memoLexicon';
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
const lectureSeule = computed(() => !memoStore.writesEnabled);
const brouillonEdite = ref<Memo>();
const detailRevision = ref(0);
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
    if (nom && employee.guid && employee.guid !== managerGuid.value) map.set(employee.guid, { guid: employee.guid, nom });
  }
  return Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom));
});

const getInterlocuteur = (memo: Memo) => {
  if (!memo.autoGenerated && memo.destinataireId === managerGuid.value) return {
    nom: memo.createurNom,
    code: memo.createurCode !== 'N/A' ? memo.createurCode : '',
    departement: memo.createurDepartement !== 'N/A' ? memo.createurDepartement : '',
  };
  return {
    nom: memo.destinataireNom,
    code: memo.destinataireCode !== 'N/A' ? memo.destinataireCode : '',
    departement: memo.destinataireDepartement !== 'N/A' ? memo.destinataireDepartement : '',
  };
};

const memosFiltres = computed(() => memoStore.memos.map(m => {
  const i = getInterlocuteur(m);
  return { ...m, titre: formatMemoTitle(m.titre),
    interlocuteurNom: i.nom, interlocuteurCode: i.code,
    interlocuteurDepartement: i.departement, isRead: m.isRead };
}));

const chargerPage = async (force = true) => {
  if (!memoStore.sessionKey) return;
  const version = ++requestVersion;
  try {
    erreur.value = '';
    await memoStore.loadMemos(managerGuid.value, force, {
      offset: (currentPage.value - 1) * perPage.value, limit: perPage.value,
      memo_type: filtres.value.type === 'auto_generated' ? undefined : (filtres.value.type || undefined),
      memo_status: filtres.value.statut || undefined,
      target_user: filtres.value.employeId || undefined,
      search: recherche.value.trim() || undefined,
      sort: tri.value,
      ...(filtres.value.type === 'auto_generated' ? { auto_generated: true } : {}),
    });
  } catch (error) {
    if (version === requestVersion) {
      erreur.value = memoReadErrorMessage(error, 'Impossible de charger les mémos.');
      console.error(error);
    }
  }
};
const changerPage = (page: number) => { currentPage.value = page; void chargerPage(); };
const changerLimite = (limit: number) => { perPage.value = limit; currentPage.value = 1; void chargerPage(); };
watch(() => memoStore.realtimeRevision, (next, previous) => {
  if (next && next !== previous) void chargerPage();
});
watch([filtres, tri], () => { currentPage.value = 1; void chargerPage(); }, { deep: true });
watch(recherche, () => { clearTimeout(debounceHandle); debounceHandle = setTimeout(() => {
  currentPage.value = 1; void chargerPage();
}, 300); });

// ── Actions métier (depuis le panel droit) ─────
const isProcessing = ref(false);
const actionType = ref<'approve' | 'reject' | 'revoke' | null>(null);
const erreurAction = ref('');
let lastCommand: { payload: string; id: string } | undefined;

async function agirSurMemo(action: 'APPROVE' | 'REJECT' | 'REVOKE' | 'SUBMIT') {
  const memo = memoSelectionne.value;
  if (lectureSeule.value || !memo || isProcessing.value) return;
  const session = memoStore.sessionKey;
  const manager = managerGuid.value;
  const command = { action, guid: memo.guid, version: memo.version ?? null };
  const payload = JSON.stringify(command);
  if (lastCommand?.payload !== payload) lastCommand = { payload, id: crypto.randomUUID() };
  isProcessing.value = true;
  erreurAction.value = '';
  actionType.value = action === 'SUBMIT' ? null : action === 'APPROVE' ? 'approve' : action === 'REJECT' ? 'reject' : 'revoke';
  try {
    await MemoService.command(command, lastCommand.id);
    if (session !== memoStore.sessionKey) return;
    await memoStore.refreshMemo(manager, memo.guid, true);
    if (session === memoStore.sessionKey && memoSelectionneGuid.value === memo.guid) detailRevision.value++;
  } catch (error) {
    if (session === memoStore.sessionKey && memoSelectionneGuid.value === memo.guid)
      erreurAction.value = memoReadErrorMessage(error, 'Impossible d’appliquer cette action.');
  } finally {
    if (session === memoStore.sessionKey) {
      isProcessing.value = false;
      actionType.value = null;
    }
  }
}

function modifierMemo() {
  const memo = memoSelectionne.value;
  if (lectureSeule.value || !memo?.capabilities?.edit || isProcessing.value) return;
  brouillonEdite.value = memo;
  mode.value = 'create';
}
function annulerEdition() {
  mode.value = brouillonEdite.value ? 'detail' : 'idle';
  brouillonEdite.value = undefined;
}

// ── Methods ────────────────────────────────────
const ouvrirMemo = (guid: string) => {
  erreurAction.value = '';
  memoSelectionneGuid.value = guid;
  mode.value = 'detail';
};

const selectionnerMemo = (memo: MemoItem) => ouvrirMemo(memo.guid);

const onActionDone = async () => {
  // Le composant détail a déjà rafraîchi le mémo concerné.
  // L'événement Socket.IO synchronise les autres sessions.
};

// const naviguerCreerMemo = () => {
//   memoSelectionneGuid.value = '';
//   mode.value = 'create';
// };

const naviguerCreerMemo = () => {
  if (lectureSeule.value) return;
  brouillonEdite.value = undefined;
  memoSelectionneGuid.value = '';
  router.replace({ name: 'memoList' }); // nettoie les query params sans recharger la page
  mode.value = 'create';
};

const onMemoCreated = async (newGuid: string) => {
  const session = memoStore.sessionKey;
  brouillonEdite.value = undefined;
  currentPage.value = 1;
  await chargerPage(true);
  if (session !== memoStore.sessionKey) return;
  try {
    await memoStore.refreshMemo(managerGuid.value, newGuid, true);
  } catch {
    // Le détail assure sa propre gestion d'erreur et permet de réessayer.
  }
  if (session === memoStore.sessionKey) ouvrirMemo(newGuid);
};

const reinitialiserFiltres = () => {
  filtres.value = { employeId: '', type: '', statut: '' };
  recherche.value = '';
  tri.value = 'recent';
};

const chargerMemos = () => chargerPage(false);

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
  brouillonEdite.value = undefined; erreurAction.value = ''; lastCommand = undefined;
}, { flush: 'sync' });

// ── Lifecycle ──────────────────────────────────
onMounted(() => {
  HeadBuilder.apply({
    title: 'Mémos - Toké',
    css: [footerCss],
    meta: { viewport: 'width=device-width, initial-scale=1.0' }
  });
});

watch(() => memoStore.sessionKey, async (session) => {
  if (!session) return;
  await chargerMemos();
  if (session !== memoStore.sessionKey) return;

  // Le détail applique ses propres contrôles et peut être hors de la page courante.
  const requestedMemoGuid = getQueryString(route.query.memoGuid);
  if (requestedMemoGuid) ouvrirMemo(requestedMemoGuid);

  // Ajouter dans onMounted, après chargerMemos()
  const { action, employeeGuid, employeeName, entryGuid, date } = route.query
  if (!lectureSeule.value && action === 'create') {
    mode.value = 'create'
    // Si memoCreateChat accepte des props pré-remplies, tu peux les stocker dans un ref ici
  }
}, { immediate: true, flush: 'post' });

</script>
