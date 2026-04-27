<template>
  <div class="min-h-screen flex flex-col bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7]">
    <div class="top-header">
      <Header />
    </div>

    <main class="flex-1 flex overflow-hidden pb-4 max-w-[1600px] mx-auto rounded-md w-full bg-white/70 m-5">

      <!-- Sidebar gauche (header + liste) : toujours visible sur md+, caché sur mobile si un mémo est sélectionné -->
      <div :class="[
        'flex flex-col border-r border-gray-200 transition-all duration-300',
        memoSelectionneGuid ? 'hidden md:flex' : 'flex w-full md:w-auto'
      ]">
        <div class="grid grid-cols-1 gap-4 items-start justify-between pt-4">
          <!-- Page Header -->
          <div class="flex items-center justify-between flex-shrink-0 p-4 space-x-4 border-b border-gray-200">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Mémos</h1>
              <p class="text-sm text-gray-500 mt-0.5">Gérez tous les mémos du système</p>
            </div>
            <button
                @click="naviguerCreerMemo"
                class="flex items-center gap-2 px-2.5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
            >
              <span class="text-lg leading-none">+</span>
              <span>Nouveau mémo</span>
            </button>
          </div>

          <!-- Colonne gauche : sidebar liste -->
          <div class="flex-shrink-0 flex flex-col min-h-0 px-4">
            <MemoSidebar
                :memos="memosFiltres"
                :is-loading="memoStore.isLoading"
                :error="erreur"
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
                @update:tri="tri = $event"
                @reinitialiser="reinitialiserFiltres"
            />
          </div>
        </div>
      </div>

      <!-- Zone centrale + droite : cachée sur mobile si aucun mémo sélectionné -->
      <div :class="[
        'flex gap-3 flex-1 min-h-0 transition-all duration-300',
        !memoSelectionneGuid ? 'hidden md:flex' : 'flex'
      ]">
        <!-- Colonne centrale : chat -->
        <div class="flex-1 min-w-0 flex flex-col min-h-0 bg-white shadow-sm overflow-hidden">
          <!-- État vide (desktop seulement) -->
          <div v-if="!memoSelectionneGuid" class="hidden md:flex flex-1 flex-col items-center justify-center gap-4 text-gray-400">
            <svg class="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <p class="text-sm font-medium">Sélectionnez un mémo pour voir la conversation</p>
          </div>

          <!-- Detail mémo -->
          <MemoDetailChat
              v-if="memoSelectionneGuid"
              :key="memoSelectionneGuid"
              :memo-guid="memoSelectionneGuid"
              :manager-guid="managerGuid"
              @action-done="onActionDone"
              @back="memoSelectionneGuid = ''"
          />
        </div>
      </div>

      <!-- Panel droit : caché sur mobile et tablette, visible sur lg+ -->
      <div class="hidden lg:flex gap-3 min-h-0">
        <!-- Colonne droite : panel infos + actions -->
        <div class="w-[280px] flex-shrink-0 flex flex-col min-h-0">
          <MemoDetailPanel
              v-if="memoSelectionne"
              :memo="memoSelectionne"
              :manager-guid="managerGuid"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useMemoStore, type Memo } from '@/stores/memoStore';
import MemoService from '@/service/MemoService';
import Header from '@/views/components/header.vue';
import Footer from '@/views/components/footer.vue';
import MemoSidebar from './memoSidebar.vue';
import MemoDetailChat from './memoDetailChat.vue';
import MemoDetailPanel from './memoDetailPanel.vue';
import HeadBuilder from '@/utils/HeadBuilder';
import footerCss from '../../../assets/css/toke-footer-24.css?url';

const router = useRouter();
const userStore = useUserStore();
const memoStore = useMemoStore();
const managerGuid = computed(() => userStore.user?.guid ?? '');

// ── Sélection ──────────────────────────────────
const memoSelectionneGuid = ref<string>('');
const memoSelectionne = computed(() =>
    memoSelectionneGuid.value ? memoStore.getMemoByGuid(memoSelectionneGuid.value) ?? null : null
);

// ── Filtres ────────────────────────────────────
const erreur = ref('');
const recherche = ref('');
const tri = ref<'recent' | 'oldest' | 'name'>('recent');
const filtres = ref({ employeId: '', type: '', statut: '' });

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

const memosFiltres = computed(() => {
  let result = [...memoStore.memos];
  if (filtres.value.employeId)
    result = result.filter(m => m.destinataireId === filtres.value.employeId);
  if (filtres.value.type)
    result = result.filter(m => m.type === filtres.value.type);
  if (filtres.value.statut)
    result = result.filter(m => {
      if (filtres.value.statut === 'pending') return m.statut === 'pending' || m.statut === 'submitted';
      return m.statut === filtres.value.statut;
    });
  if (recherche.value.trim()) {
    const q = recherche.value.toLowerCase();
    result = result.filter(m =>
        m.titre?.toLowerCase().includes(q) ||
        m.destinataireNom?.toLowerCase().includes(q) ||
        m.contenu?.toLowerCase().includes(q)
    );
  }
  result.sort((a, b) => {
    if (tri.value === 'oldest') return new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime();
    if (tri.value === 'name') return (a.destinataireNom || '').localeCompare(b.destinataireNom || '');
    return new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime();
  });
  return result.map(m => {
    const i = getInterlocuteur(m);
    return { ...m, interlocuteurNom: i.nom, interlocuteurCode: i.code, interlocuteurDepartement: i.departement };
  });
});

// ── Actions métier (depuis le panel droit) ─────
const isProcessing = ref(false);
const actionType = ref<'approve' | 'reject' | 'revoke' | null>(null);

const approuverMemo = async () => {
  if (!memoSelectionne.value || isProcessing.value) return;
  isProcessing.value = true;
  actionType.value = 'approve';
  try {
    const response = await MemoService.validateMemo(memoSelectionne.value.guid, managerGuid.value);
    if (!response.success) return;
    await memoStore.refreshMemo(managerGuid.value, memoSelectionne.value.guid);
    memoSelectionneGuid.value = '';
  } catch (e: any) {
    console.error('❌ Approbation:', e);
  } finally {
    isProcessing.value = false;
    actionType.value = null;
  }
};

const rejeterMemo = async () => {
  if (!memoSelectionne.value || isProcessing.value) return;
  isProcessing.value = true;
  actionType.value = 'reject';
  try {
    await MemoService.rejetMemo(memoSelectionne.value.guid, managerGuid.value);
    await memoStore.refreshMemo(managerGuid.value, memoSelectionne.value.guid);
    memoSelectionneGuid.value = '';
  } catch (e: any) {
    console.error('❌ Rejet:', e);
  } finally {
    isProcessing.value = false;
    actionType.value = null;
  }
};

const revoquerMemo = async () => {
  if (!memoSelectionne.value || isProcessing.value) return;
  isProcessing.value = true;
  actionType.value = 'revoke';
  try {
    await MemoService.revokeMemo(memoSelectionne.value.guid, managerGuid.value);
    await memoStore.refreshMemo(managerGuid.value, memoSelectionne.value.guid);
    memoSelectionneGuid.value = '';
  } catch (e: any) {
    console.error('❌ Révocation:', e);
  } finally {
    isProcessing.value = false;
    actionType.value = null;
  }
};

// ── Methods ────────────────────────────────────
const selectionnerMemo = (memo: Memo) => {
  memoStore.markMemoAsRead(memo.guid);
  memoSelectionneGuid.value = memo.guid;
};

const onActionDone = async () => {
  // Après une réponse dans le chat, rafraîchir le mémo sélectionné
  if (memoSelectionneGuid.value) {
    await memoStore.refreshMemo(managerGuid.value, memoSelectionneGuid.value);
  }
};

const naviguerCreerMemo = () => router.push('/memoNew');

const reinitialiserFiltres = () => {
  filtres.value = { employeId: '', type: '', statut: '' };
  recherche.value = '';
  tri.value = 'recent';
};

const chargerMemos = async () => {
  try {
    erreur.value = '';
    if (!managerGuid.value) { erreur.value = 'ID du manager non disponible'; return; }
    await memoStore.loadMemos(managerGuid.value);
  } catch {
    erreur.value = 'Erreur lors du chargement des mémos';
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

<!--<template>-->
<!--  <div class="min-h-screen flex flex-col bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7]">-->
<!--    <div class="top-header">-->
<!--      <Header />-->
<!--    </div>-->

<!--    <main class="flex-1 flex overflow-hidden pb-4 max-w-[1600px] mx-auto rounded-md w-full bg-white/70 m-5">-->

<!--      <div class="grid grid-cols-1 gap-4 items-start justify-between border-r border-gray-200 pt-4">-->
<!--        &lt;!&ndash; Page Header &ndash;&gt;-->
<!--        <div class="flex items-center justify-between flex-shrink-0 p-4 space-x-4 border-b border-gray-200">-->
<!--          <div>-->
<!--            <h1 class="text-2xl font-bold text-gray-900">Mémos</h1>-->
<!--            <p class="text-sm text-gray-500 mt-0.5">Gérez tous les mémos du système</p>-->
<!--          </div>-->
<!--          <button-->
<!--              @click="naviguerCreerMemo"-->
<!--              class="flex items-center gap-2 px-2.5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm"-->
<!--          >-->
<!--            <span class="text-lg leading-none">+</span>-->
<!--            <span>Nouveau mémo</span>-->
<!--          </button>-->
<!--        </div>-->

<!--        &lt;!&ndash; Colonne gauche : sidebar liste &ndash;&gt;-->
<!--        <div class=" flex-shrink-0 flex flex-col min-h-0 px-4">-->
<!--          <MemoSidebar-->
<!--              :memos="memosFiltres"-->
<!--              :is-loading="memoStore.isLoading"-->
<!--              :error="erreur"-->
<!--              :selected-guid="memoSelectionneGuid"-->
<!--              :filtres="filtres"-->
<!--              :recherche="recherche"-->
<!--              :tri="tri"-->
<!--              :memo-types="memoTypes"-->
<!--              :memo-statuts="memoStatuts"-->
<!--              :employes-options="employesFiltreOptions"-->
<!--              @select="selectionnerMemo as any"-->
<!--              @nouveau="naviguerCreerMemo"-->
<!--              @update:filtres="filtres = $event"-->
<!--              @update:recherche="recherche = $event"-->
<!--              @update:tri="tri = $event as any"-->
<!--              @reinitialiser="reinitialiserFiltres"-->
<!--          />-->
<!--        </div>-->
<!--      </div>-->

<!--      &lt;!&ndash; Layout 2 colonnes &ndash;&gt;-->
<!--      <div class="flex gap-3 flex-1 min-h-0">-->
<!--        &lt;!&ndash; Colonne centrale : chat &ndash;&gt;-->
<!--        <div class="flex-1 min-w-0 flex flex-col min-h-0 bg-white shadow-sm overflow-hidden">-->
<!--          &lt;!&ndash; État vide &ndash;&gt;-->
<!--          <div v-if="!memoSelectionneGuid" class="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">-->
<!--            <svg class="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"-->
<!--                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>-->
<!--            </svg>-->
<!--            <p class="text-sm font-medium">Sélectionnez un mémo pour voir la conversation</p>-->
<!--          </div>-->

<!--          &lt;!&ndash; Detail mémo &ndash;&gt;-->
<!--          <MemoDetailChat-->
<!--            v-else-->
<!--            :key="memoSelectionneGuid"-->
<!--            :memo-guid="memoSelectionneGuid"-->
<!--            :manager-guid="managerGuid"-->
<!--            @action-done="onActionDone"-->
<!--          />-->
<!--        </div>-->
<!--      </div>-->
<!--      <div class="flex gap-3 min-h-0">-->

<!--        &lt;!&ndash; Colonne droite : panel infos + actions &ndash;&gt;-->
<!--        <div class="w-[280px] flex-shrink-0 flex flex-col min-h-0">-->
<!--          <MemoDetailPanel-->
<!--            v-if="memoSelectionne"-->
<!--            :memo="memoSelectionne"-->
<!--            :manager-guid="managerGuid"-->
<!--            :is-processing="isProcessing"-->
<!--            :action-type="actionType"-->
<!--            @approuver="approuverMemo"-->
<!--            @rejeter="rejeterMemo"-->
<!--            @revoquer="revoquerMemo"-->
<!--          />-->
<!--          <div v-else class="flex-1 bg-white/60 rounded-2xl" />-->
<!--        </div>-->

<!--      </div>-->
<!--    </main>-->

<!--    <Footer />-->
<!--  </div>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import { ref, computed, onMounted, onUnmounted, watch } from 'vue';-->
<!--import { useRouter } from 'vue-router';-->
<!--import { useUserStore } from '@/stores/userStore';-->
<!--import { useMemoStore, type Memo } from '@/stores/memoStore';-->
<!--import MemoService from '@/service/MemoService';-->
<!--import Header from '@/views/components/header.vue';-->
<!--import Footer from '@/views/components/footer.vue';-->
<!--import MemoSidebar from './memoSidebar.vue';-->
<!--import MemoDetailChat from './memoDetailChat.vue';-->
<!--import MemoDetailPanel from './memoDetailPanel.vue';-->
<!--import HeadBuilder from '@/utils/HeadBuilder';-->
<!--import footerCss from '../../../assets/css/toke-footer-24.css?url';-->

<!--const router = useRouter();-->
<!--const userStore = useUserStore();-->
<!--const memoStore = useMemoStore();-->
<!--const managerGuid = computed(() => userStore.user?.guid ?? '');-->

<!--// ── Sélection ──────────────────────────────────-->
<!--const memoSelectionneGuid = ref<string>('');-->
<!--const memoSelectionne = computed(() =>-->
<!--  memoSelectionneGuid.value ? memoStore.getMemoByGuid(memoSelectionneGuid.value) ?? null : null-->
<!--);-->

<!--// ── Filtres ────────────────────────────────────-->
<!--const erreur = ref('');-->
<!--const recherche = ref('');-->
<!--const tri = ref<'recent' | 'oldest' | 'name'>('recent');-->
<!--const filtres = ref({ employeId: '', type: '', statut: '' });-->

<!--const memoTypes = [-->
<!--  { value: 'delay_justification', label: 'Retard' },-->
<!--  { value: 'absence_justification', label: 'Absence' },-->
<!--  { value: 'session_closure', label: 'Clôture' },-->
<!--  { value: 'correction_request', label: 'Correction' },-->
<!--  { value: 'auto_generated', label: 'Auto' },-->
<!--];-->

<!--const memoStatuts = [-->
<!--  { value: 'pending', label: 'En attente' },-->
<!--  { value: 'approved', label: 'Approuvé' },-->
<!--  { value: 'rejected', label: 'Rejeté' },-->
<!--  { value: 'revoked', label: 'Révoqué' },-->
<!--];-->

<!--const employesFiltreOptions = computed(() => {-->
<!--  const map = new Map<string, { guid: string; nom: string }>();-->
<!--  for (const memo of memoStore.memos) {-->
<!--    if (memo.destinataireId && memo.destinataireId !== managerGuid.value && memo.destinataireNom && memo.destinataireNom !== 'N/A') {-->
<!--      map.set(memo.destinataireId, { guid: memo.destinataireId, nom: memo.destinataireNom });-->
<!--    }-->
<!--  }-->
<!--  return Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom));-->
<!--});-->

<!--const getInterlocuteur = (memo: Memo) => {-->
<!--  const destNom = memo.destinataireNom && memo.destinataireNom !== 'N/A' ? memo.destinataireNom : null;-->
<!--  if (memo.autoGenerated) return {-->
<!--    nom: destNom ?? memo.createurNom ?? '—',-->
<!--    code: memo.destinataireCode !== 'N/A' ? memo.destinataireCode : memo.createurCode,-->
<!--    departement: memo.destinataireDepartement !== 'N/A' ? memo.destinataireDepartement : memo.createurDepartement,-->
<!--  };-->
<!--  return {-->
<!--    nom: destNom ?? '—',-->
<!--    code: memo.destinataireCode !== 'N/A' ? memo.destinataireCode : '',-->
<!--    departement: memo.destinataireDepartement !== 'N/A' ? memo.destinataireDepartement : '',-->
<!--  };-->
<!--};-->

<!--const memosFiltres = computed(() => {-->
<!--  let result = [...memoStore.memos];-->
<!--  if (filtres.value.employeId)-->
<!--    result = result.filter(m => m.destinataireId === filtres.value.employeId);-->
<!--  if (filtres.value.type)-->
<!--    result = result.filter(m => m.type === filtres.value.type);-->
<!--  if (filtres.value.statut)-->
<!--    result = result.filter(m => {-->
<!--      if (filtres.value.statut === 'pending') return m.statut === 'pending' || m.statut === 'submitted';-->
<!--      return m.statut === filtres.value.statut;-->
<!--    });-->
<!--  if (recherche.value.trim()) {-->
<!--    const q = recherche.value.toLowerCase();-->
<!--    result = result.filter(m =>-->
<!--      m.titre?.toLowerCase().includes(q) ||-->
<!--      m.destinataireNom?.toLowerCase().includes(q) ||-->
<!--      m.contenu?.toLowerCase().includes(q)-->
<!--    );-->
<!--  }-->
<!--  result.sort((a, b) => {-->
<!--    if (tri.value === 'oldest') return new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime();-->
<!--    if (tri.value === 'name') return (a.destinataireNom || '').localeCompare(b.destinataireNom || '');-->
<!--    return new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime();-->
<!--  });-->
<!--  return result.map(m => {-->
<!--    const i = getInterlocuteur(m);-->
<!--    return { ...m, interlocuteurNom: i.nom, interlocuteurCode: i.code, interlocuteurDepartement: i.departement };-->
<!--  });-->
<!--});-->

<!--// ── Actions métier (depuis le panel droit) ─────-->
<!--const isProcessing = ref(false);-->
<!--const actionType = ref<'approve' | 'reject' | 'revoke' | null>(null);-->

<!--const approuverMemo = async () => {-->
<!--  if (!memoSelectionne.value || isProcessing.value) return;-->
<!--  isProcessing.value = true;-->
<!--  actionType.value = 'approve';-->
<!--  try {-->
<!--    const response = await MemoService.validateMemo(memoSelectionne.value.guid, managerGuid.value);-->
<!--    if (!response.success) return;-->
<!--    await memoStore.refreshMemo(managerGuid.value, memoSelectionne.value.guid);-->
<!--    memoSelectionneGuid.value = '';-->
<!--  } catch (e: any) {-->
<!--    console.error('❌ Approbation:', e);-->
<!--  } finally {-->
<!--    isProcessing.value = false;-->
<!--    actionType.value = null;-->
<!--  }-->
<!--};-->

<!--const rejeterMemo = async () => {-->
<!--  if (!memoSelectionne.value || isProcessing.value) return;-->
<!--  isProcessing.value = true;-->
<!--  actionType.value = 'reject';-->
<!--  try {-->
<!--    await MemoService.rejetMemo(memoSelectionne.value.guid, managerGuid.value);-->
<!--    await memoStore.refreshMemo(managerGuid.value, memoSelectionne.value.guid);-->
<!--    memoSelectionneGuid.value = '';-->
<!--  } catch (e: any) {-->
<!--    console.error('❌ Rejet:', e);-->
<!--  } finally {-->
<!--    isProcessing.value = false;-->
<!--    actionType.value = null;-->
<!--  }-->
<!--};-->

<!--const revoquerMemo = async () => {-->
<!--  if (!memoSelectionne.value || isProcessing.value) return;-->
<!--  isProcessing.value = true;-->
<!--  actionType.value = 'revoke';-->
<!--  try {-->
<!--    await MemoService.revokeMemo(memoSelectionne.value.guid, managerGuid.value);-->
<!--    await memoStore.refreshMemo(managerGuid.value, memoSelectionne.value.guid);-->
<!--    memoSelectionneGuid.value = '';-->
<!--  } catch (e: any) {-->
<!--    console.error('❌ Révocation:', e);-->
<!--  } finally {-->
<!--    isProcessing.value = false;-->
<!--    actionType.value = null;-->
<!--  }-->
<!--};-->

<!--// ── Methods ────────────────────────────────────-->
<!--const selectionnerMemo = (memo: Memo) => {-->
<!--  memoStore.markMemoAsRead(memo.guid);-->
<!--  memoSelectionneGuid.value = memo.guid;-->
<!--};-->

<!--const onActionDone = async () => {-->
<!--  // Après une réponse dans le chat, rafraîchir le mémo sélectionné-->
<!--  if (memoSelectionneGuid.value) {-->
<!--    await memoStore.refreshMemo(managerGuid.value, memoSelectionneGuid.value);-->
<!--  }-->
<!--};-->

<!--const naviguerCreerMemo = () => router.push('/memoNew');-->

<!--const reinitialiserFiltres = () => {-->
<!--  filtres.value = { employeId: '', type: '', statut: '' };-->
<!--  recherche.value = '';-->
<!--  tri.value = 'recent';-->
<!--};-->

<!--const chargerMemos = async () => {-->
<!--  try {-->
<!--    erreur.value = '';-->
<!--    if (!managerGuid.value) { erreur.value = 'ID du manager non disponible'; return; }-->
<!--    await memoStore.loadMemos(managerGuid.value);-->
<!--  } catch {-->
<!--    erreur.value = 'Erreur lors du chargement des mémos';-->
<!--  }-->
<!--};-->

<!--// ── Lifecycle ──────────────────────────────────-->
<!--let stopWatcher: (() => void) | null = null;-->

<!--onMounted(async () => {-->
<!--  HeadBuilder.apply({-->
<!--    title: 'Mémos - Toké',-->
<!--    css: [footerCss],-->
<!--    meta: { viewport: 'width=device-width, initial-scale=1.0' }-->
<!--  });-->
<!--  await chargerMemos();-->
<!--  memoStore.markAllMemosAsRead();-->
<!--  stopWatcher = watch(() => memoStore.memos.length, () => memoStore.markAllMemosAsRead());-->
<!--});-->

<!--onUnmounted(() => stopWatcher?.());-->
<!--</script>-->
