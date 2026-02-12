<template>
  <div class="memo-app-container">
    <!-- Top Header -->
    <div class="top-header">
      <Header />
    </div>

    <div class="memo-layout">
      <!-- Sidebar verticale -->
      <aside class="memo-sidebar">
        <nav class="memo-nav">
          <!-- Filtres par type -->
          <div class="nav-section">
            <h3 class="nav-section-title">Type de mémo</h3>
            <button
                v-for="type in memoTypes"
                :key="type.value"
                :class="['nav-memo-item', { active: filtres.type === type.value }]"
                @click="appliquerFiltreType(type.value)"
            >
              <span class="nav-memo-icon">{{ type.icon }}</span>
              <div class="nav-memo-content">
                <span class="nav-memo-label">{{ type.label }}</span>
                <span v-if="getCountForType(type.value)" class="nav-memo-badge">
                  {{ getCountForType(type.value) }}
                </span>
              </div>
            </button>
          </div>

          <!-- Filtres par statut -->
          <div class="nav-section">
            <h3 class="nav-section-title">Statut</h3>
            <button
                v-for="statut in memoStatuts"
                :key="statut.value"
                :class="['nav-memo-item', { active: filtres.statut === statut.value }]"
                @click="appliquerFiltreStatut(statut.value)"
            >
              <span class="nav-memo-icon">{{ statut.icon }}</span>
              <div class="nav-memo-content">
                <span class="nav-memo-label">{{ statut.label }}</span>
                <span v-if="getCountForStatut(statut.value)" class="nav-memo-badge">
                  {{ getCountForStatut(statut.value) }}
                </span>
              </div>
            </button>
          </div>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="memo-main-content">
        <!-- Header actions -->
        <header class="memo-content-header">
          <div class="header-title-section">
            <button class="btn-new-memo" @click="naviguerCreerMemo">
              <span class="btn-icon">+</span>
              <span>Nouveau mémo</span>
            </button>
          </div>
        </header>

        <!-- Content wrapper -->
        <div class="memo-content-wrapper">
          <!-- Composant réutilisable MemoList -->
          <Memo
              :memos="memosFiltres"
              :is-loading="memoStore.isLoading"
              :error="erreur"
              :empty-title="getEmptyTitle"
              :empty-description="getEmptyDescription"
              :show-employee-filter="true"
              :on-retry="chargerMemos"
              @memo-click="voirDetailMemo"
              @employee-filter="filtrerParCreateur"
          >
            <!-- Slot pour l'action de l'état vide -->
            <template class="empty-action">
              <button
                  v-if="!filtres.type && !filtres.employeId"
                  class="btn-create-first"
                  @click="naviguerCreerMemo"
              >
                <span>+</span> Créer mon premier mémo
              </button>
            </template>
          </Memo>
        </div>
      </main>
    </div>
    <!-- Footer -->
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import router from '@/router';
import { useUserStore } from '@/stores/userStore';
import { useMemoStore } from '@/stores/memoStore';
import Header from '@/views/components/header.vue';
import Footer from '@/views/components/footer.vue';
import Memo from '../memo/memo.vue';
import "../../assets/css/toke-memoList-18.css"
import footerCss from "../../assets/css/toke-footer-24.css?url"
import HeadBuilder from '@/utils/HeadBuilder';

interface MemoFilters {
  employeId?: string;
  type?: string;
  statut?: string;
}

// ============ STORES ============
const userStore = useUserStore();
const memoStore = useMemoStore();

// ============ STATE ============
const erreur = ref('');
const filtres = ref<MemoFilters>({
  employeId: '',
  type: '',
  statut: ''
});

// ============ CONFIGURATION DES FILTRES ============
const memoTypes = [
  { value: '', label: 'Tous', icon: '📂' },
  { value: 'delay_justification', label: 'Retard', icon: '⏰' },
  { value: 'absence_justification', label: 'Absence', icon: '🏥' },
  { value: 'session_closure', label: 'Clôture', icon: '🔒' },
  { value: 'auto_generated', label: 'Auto', icon: '🤖' }
];

const memoStatuts = [
  { value: 'pending', label: 'En attente', icon: '⏳' },
  { value: 'approved', label: 'Approuvés', icon: '✅' },
  { value: 'rejected', label: 'Rejetés', icon: '❌' }
];

// ============ COMPUTED ============
const memosFiltres = computed(() => {
  let result = [...memoStore.memos];

  if (filtres.value.employeId) {
    result = result.filter(m =>
        m.createurId === filtres.value.employeId ||
        m.destinataireId === filtres.value.employeId
    );
  }

  if (filtres.value.type) {
    result = result.filter(m => m.type === filtres.value.type);
  }

  if (filtres.value.statut) {
    result = result.filter(m => m.statut === filtres.value.statut);
  }

  return result;
});

const getEmptyTitle = computed(() => {
  if (filtres.value.type || filtres.value.employeId || filtres.value.statut) {
    return 'Aucun mémo trouvé';
  }
  return 'Aucun mémo disponible';
});

const getEmptyDescription = computed(() => {
  if (filtres.value.type || filtres.value.employeId || filtres.value.statut) {
    return 'Aucun mémo ne correspond à vos critères de recherche';
  }
  return 'Commencez par créer votre premier mémo';
});

// ============ METHODS - FILTRES ============
const getCountForType = (typeValue: string): number => {
  if (!typeValue) return memoStore.memos.length;
  return memoStore.memos.filter(m => m.type === typeValue).length;
};

const getCountForStatut = (statutValue: string): number => {
  if (!statutValue) return memoStore.memos.length;
  if (statutValue === 'pending') {
    return memoStore.memos.filter(m => m.statut === 'pending' || m.statut === 'submitted').length;
  }
  return memoStore.memos.filter(m => m.statut === statutValue).length;
};

const appliquerFiltreType = (typeValue: string) => {
  if (filtres.value.type === typeValue) {
    filtres.value.type = '';
  } else {
    filtres.value.type = typeValue;
    filtres.value.statut = '';
  }
};

const appliquerFiltreStatut = (statutValue: string) => {
  if (filtres.value.statut === statutValue) {
    filtres.value.statut = '';
  } else {
    filtres.value.statut = statutValue;
    filtres.value.type = '';
  }
};

const filtrerParCreateur = (createurId: string) => {
  if (filtres.value.employeId === createurId) {
    filtres.value.employeId = '';
  } else {
    filtres.value.employeId = createurId;
  }
};

// ============ METHODS - NAVIGATION ============
const naviguerCreerMemo = () => {
  router.push('/memoNew');
};

const voirDetailMemo = (memo: any) => {
  router.push({
    name: 'memoDetails',
    params: { guid: memo.guid }
  });
};

// ============ METHODS - DATA ============
const chargerMemos = async () => {
  try {
    erreur.value = '';

    const managerId = userStore.user?.guid;

    if (!managerId) {
      erreur.value = 'ID du manager non disponible - utilisateur non connecté';
      return;
    }

    await memoStore.loadMemos(managerId);

  } catch (error) {
    console.error('💥 Erreur lors du chargement:', error);
    erreur.value = 'Une erreur est survenue lors du chargement des mémos';
  }
};

// ============ LIFECYCLE ============
onMounted(async () => {
  HeadBuilder.apply({
    title: 'Mémos - Toké',
    css: [footerCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });

  await chargerMemos();
});
</script>

<style scoped>
/* Les styles de la sidebar et du header restent inchangés */
/* Ils peuvent rester dans le fichier CSS toke-memoList-18.css */
</style>