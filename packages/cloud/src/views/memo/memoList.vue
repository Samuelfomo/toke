<template>
  <div class="memo-app-container">
    <!-- Top Header -->
    <div class="top-header">
<!--      <Header-->
<!--        :user-name="currentUser.name"-->
<!--        :company-name="currentUser.company"-->
<!--        :notification-count="notificationCount"-->
<!--      /> -->
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
          <!-- État de chargement -->
          <div v-if="memoStore.isLoading" class="loading-state">
            <div class="loader">
              <div class="spinner"></div>
              <div class="loading-text">
                <p class="loading-title">Chargement en cours...</p>
                <p class="loading-subtitle">Récupération des mémos</p>
              </div>
            </div>
          </div>

          <!-- État d'erreur -->
          <div v-else-if="erreur" class="error-state">
            <div class="error-icon">⚠️</div>
            <p class="error-message">{{ erreur }}</p>
            <button class="btn-retry" @click="chargerMemos">
              🔄 Réessayer
            </button>
          </div>

          <!-- Liste des mémos -->
<!--          <div v-else class="memos-list-container">-->
          <div class="memos-list-container">
            <!-- État vide -->
            <div v-if="memosGroupes.length === 0" class="empty-state">
              <div class="empty-illustration">
                <div class="empty-icon">📝</div>
                <div class="empty-circle"></div>
              </div>
              <h3 class="empty-title">Aucun mémo trouvé</h3>
              <p class="empty-description">
                {{ filtres.type || filtres.employeId
                ? 'Aucun mémo ne correspond à vos critères de recherche'
                : 'Commencez par créer votre premier mémo' }}
              </p>
              <button v-if="!filtres.type && !filtres.employeId" class="btn-create-first" @click="naviguerCreerMemo">
                <span>+</span> Créer mon premier mémo
              </button>
            </div>

            <!-- Liste des groupes de dates -->
            <div v-for="groupe in memosGroupes" :key="groupe.date" class="groupe-date">
              <!-- En-tête de date -->
              <div
                class="date-header-clickable"
                @click="toggleDateGroupe(groupe.date)"
                :class="{ expanded: datesExpanded[groupe.date] }"
              >
                <div class="date-header">
                  <div class="date-main">
                    <span class="dropdown-arrow" :class="{ expanded: datesExpanded[groupe.date] }">
                      ›
                    </span>
                    <div class="date-info">
                      <h2 class="date-title">{{ groupe.dateFormatee }}</h2>
                      <span class="date-badge">{{ getTotalMemosForDate(groupe) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Contenu date -->
              <transition name="smooth-expand">
                <div v-show="datesExpanded[groupe.date]" class="date-content">
                  <div v-for="typeGroup in groupe.types" :key="typeGroup.type" class="type-group">
                    <!-- En-tête type -->
                    <div
                      class="type-header-clickable"
                      @click="toggleTypeGroupe(groupe.date, typeGroup.type)"
                      :class="{ expanded: typesExpanded[`${groupe.date}-${typeGroup.type}`] }"
                    >
                      <div class="type-header">
                        <span class="dropdown-arrow small" :class="{ expanded: typesExpanded[`${groupe.date}-${typeGroup.type}`] }">
                          ›
                        </span>
                        <div class="type-info">
                          <span class="type-icon">{{ getTypeIcon(typeGroup.type) }}</span>
                          <h3 class="type-title">{{ getTypeLabel(typeGroup.type) }}</h3>
                        </div>
                        <span class="type-count">{{ typeGroup.memos.length }}</span>
                      </div>
                    </div>

                    <!-- Contenu type -->
                    <transition name="smooth-expand">
                      <div
                        v-show="typesExpanded[`${groupe.date}-${typeGroup.type}`]"
                        class="type-content"
                      >
                        <div
                          v-for="memo in typeGroup.memos"
                          :key="memo.guid"
                          class="memo-item"
                          @click="voirDetailMemo(memo.guid)"
                        >
                          <!-- Carte mémo -->
                          <div class="memo-card">
                            <div class="memo-card-header">
                              <div class="memo-user-info">
                                <div class="user-avatar">
                                  {{ memo.createurNom.split(' ').map(n => n[0]).join('').toUpperCase() }}
                                </div>
                                <div class="user-details">
                                  <button
                                    class="user-name"
                                    @click.stop="filtrerParCreateur(memo.createurId)"
                                    title="Filtrer par cet employé"
                                  >
                                    {{ memo.createurNom }}
                                  </button>
                                  <span class="user-code">{{ memo.createurCode }} • {{ memo.createurDepartement }}</span>
                                </div>
                              </div>
                              <div class="memo-meta">
                                <span class="memo-time">
                                  🕐 {{ formatHeure(memo.dateCreation) }}
                                </span>
                              </div>
                            </div>

                            <div class="memo-card-footer">
                              <div class="memo-stats">
                                <span class="stat-item">
                                  💬 {{ memo.messagesCount }} message{{ memo.messagesCount > 1 ? 's' : '' }}
                                </span>
                                <span v-if="memo.entriesAffectees.length > 0" class="stat-item">
                                  🔎 {{ memo.entriesAffectees.length }} entrée{{ memo.entriesAffectees.length > 1 ? 's' : '' }}
                                </span>
                              </div>
                              <span class="view-arrow">→</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </transition>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </main>
    </div>
    <!-- Footer -->
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import router from '@/router';
import { useUserStore } from '@/stores/userStore';
import { useMemoStore } from '@/stores/memoStore';
import Header from '@/views/components/header.vue';
import Footer from '@/views/components/footer.vue';
import "../../assets/css/toke-memoList-18.css"
import footerCss from "../../assets/css/toke-footer-24.css?url"
import HeadBuilder from '@/utils/HeadBuilder';

interface MemoFilters {
  employeId?: string;
  type?: string;
  statut?: string;
}

// Stores
const userStore = useUserStore();
const memoStore = useMemoStore();

// État local
const erreur = ref('');
const filtres = ref<MemoFilters>({
  employeId: '',
  type: '',
  statut: ''
});
const notificationCount = ref(2);

const currentUser = computed(() => ({
  name: userStore.fullName || 'Manager',
  company: userStore.tenantName || 'N/A'
}));

const datesExpanded = reactive<Record<string, boolean>>({});
const typesExpanded = reactive<Record<string, boolean>>({});

const toggleDateGroupe = (date: string) => {
  datesExpanded[date] = !datesExpanded[date];
};

const toggleTypeGroupe = (date: string, type: string) => {
  const key = `${date}-${type}`;
  typesExpanded[key] = !typesExpanded[key];
};

const getTotalMemosForDate = (groupe: any): number => {
  return groupe.types.reduce((total: number, typeGroup: any) => {
    return total + typeGroup.memos.length;
  }, 0);
};

// const getCountForType = (typeValue: string): number => {
//   if (!typeValue) return memosFiltres.value.length;
//   return memosFiltres.value.filter(m => m.type === typeValue).length;
// };

const getCountForType = (typeValue: string): number => {
  if (!typeValue) return memoStore.memos.length;
  return memoStore.memos.filter(m => m.type === typeValue).length;
};

// 🔧 Appliquer le filtre par type (réinitialise statut)
const appliquerFiltreType = (typeValue: string) => {
  // Si on clique sur le filtre déjà actif, on le désactive
  if (filtres.value.type === typeValue) {
    filtres.value.type = '';
  } else {
    filtres.value.type = typeValue;
    // Réinitialiser le filtre statut quand on change de type
    filtres.value.statut = '';
  }
};

// 🔧 Appliquer le filtre par statut (réinitialise type)
const appliquerFiltreStatut = (statutValue: string) => {
  // Si on clique sur le filtre déjà actif, on le désactive
  if (filtres.value.statut === statutValue) {
    filtres.value.statut = '';
  } else {
    filtres.value.statut = statutValue;
    // Réinitialiser le filtre type quand on change de statut
    filtres.value.type = '';
  }
};


const getTypeIcon = (type: string): string => {
  const icons: { [key: string]: string } = {
    delay_justification: '⏰',
    absence_justification: '🏥',
    absence_notification: '📢',
    session_closure: '🔒',
    auto_generated: '🤖',
    other: '📄'
  };
  return icons[type] || '📝';
};

const memosFiltres = computed(() => {
  let result = [...memoStore.memos];

  console.log(result);

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

const getCountForStatut = (statutValue: string): number => {
  if (!statutValue) return memoStore.memos.length;
  if (statutValue === 'pending') {
    return memoStore.memos.filter(m => m.statut === 'pending' || m.statut === 'submitted').length;
  }
  return memoStore.memos.filter(m => m.statut === statutValue).length;
};

const memosGroupes = computed(() => {
  const groupes: Record<string, Record<string, typeof memoStore.memos[0][]>> = {};

  memosFiltres.value.forEach(memo => {
    const dateKey = new Date(memo.dateCreation).toLocaleDateString('fr-FR');
    groupes[dateKey] ??= {};
    groupes[dateKey][memo.type] ??= [];
    groupes[dateKey][memo.type].push(memo);
  });

  const result = Object.keys(groupes)
    .sort((a, b) =>
      new Date(b.split('/').reverse().join('-')).getTime() -
      new Date(a.split('/').reverse().join('-')).getTime()
    )
    .map(date => ({
      date,
      dateFormatee: formatDateGroupe(date),
      types: Object.keys(groupes[date]).map(type => ({
        type,
        memos: groupes[date][type]
          .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
          // .sort((a, b) => b.dateCreation.getTime() - a.dateCreation.getTime())
      }))
    }));

  result.forEach(groupe => {
    if (!(groupe.date in datesExpanded)) {
      datesExpanded[groupe.date] = false;
    }

    groupe.types.forEach(typeGroup => {
      const typeKey = `${groupe.date}-${typeGroup.type}`;
      if (!(typeKey in typesExpanded)) {
        typesExpanded[typeKey] = false;
      }
    });
  });

  return result;
});

const filtrerParCreateur = (createurId: string) => {
  if (filtres.value.employeId === createurId) {
    filtres.value.employeId = '';
  } else {
    filtres.value.employeId = createurId;
  }
};

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

const naviguerCreerMemo = () => {
  router.push('/memoNew');
};

const voirDetailMemo = (memoGuid: string) => {
  router.push(
    {
      name: 'memoDetails',
      params: { guid: memoGuid }
    }
  );
  // router.push(`/memoDetails/${memoGuid}`);
};

const getTypeLabel = (type: string): string => {
  const labels: { [key: string]: string } = {
    delay_justification: 'Justification de retard',
    absence_justification: "Justification d'absence",
    absence_notification: "Notification d'absence",
    session_closure: 'Clôture de session',
    auto_generated: 'Généré automatiquement',
    other: 'Autres'
  };
  return labels[type] || type.replace(/_/g, ' ');
};

const formatHeure = (date: Date): string => {
  return new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateGroupe = (dateStr: string): string => {
  const parts = dateStr.split('/');
  const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const hier = new Date(aujourdhui);
  hier.setDate(hier.getDate() - 1);

  date.setHours(0, 0, 0, 0);

  if (date.getTime() === aujourdhui.getTime()) {
    return "Aujourd'hui";
  } else if (date.getTime() === hier.getTime()) {
    return 'Hier';
  } else {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
};

onMounted(async () => {
  HeadBuilder.apply({
    title: 'Mémos - Toké',
    css: [footerCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });
  console.log('✅Recherche de Données depuis')

  await chargerMemos();
});
</script>