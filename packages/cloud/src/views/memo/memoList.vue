<template>
  <div class="liste-memos">

    <!-- En-tête moderne -->
    <div class="page-header">
      <button class="btn-primary" @click="naviguerCreerMemo">
        <span class="btn-icon">+</span>
        <span>Nouveau mémo</span>
      </button>
    </div>

    <!-- Tabs des types avec design moderne -->
    <div class="filters-wrapper">
      <div class="type-tabs">
        <button
          v-for="type in memoTypes"
          :key="type.value"
          :class="['type-tab', { active: filtres.type === type.value }]"
          @click="filtres.type = type.value"
        >
          <span class="tab-icon">{{ type.icon }}</span>
          <span class="tab-label">{{ type.label }}</span>
          <span v-if="getCountForType(type.value)" class="tab-badge">
            {{ getCountForType(type.value) }}
          </span>
        </button>
      </div>
    </div>

    <!-- Stats cards modernisées -->
    <div v-if="!chargement && memos.length" class="stats-section">
      <div class="stat-card total">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <div class="stat-value">{{ memos.length }}</div>
          <div class="stat-label">Total des mémos</div>
        </div>
      </div>
      <div class="stat-card pending">
        <div class="stat-icon">⏳</div>
        <div class="stat-info">
          <div class="stat-value">{{ memosParStatut.pending + memosParStatut.submitted }}</div>
          <div class="stat-label">En attente</div>
        </div>
      </div>
      <div class="stat-card approved">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="stat-value">{{ memosParStatut.approved }}</div>
          <div class="stat-label">Approuvés</div>
        </div>
      </div>
      <div class="stat-card rejected">
        <div class="stat-icon">❌</div>
        <div class="stat-info">
          <div class="stat-value">{{ memosParStatut.rejected }}</div>
          <div class="stat-label">Rejetés</div>
        </div>
      </div>
    </div>

    <!-- État de chargement moderne -->
    <div v-if="chargement" class="loading-state">
      <div class="loader">
        <div class="spinner"></div>
        <div class="loading-text">
          <p class="loading-title">Chargement en cours...</p>
          <p class="loading-subtitle">Récupération des mémos</p>
        </div>
      </div>
    </div>

    <!-- État d'erreur moderne -->
    <div v-else-if="erreur" class="error-state">
      <div class="error-icon">⚠️</div>
      <p class="error-message">{{ erreur }}</p>
      <button class="btn-retry" @click="chargerMemos">
        🔄 Réessayer
      </button>
    </div>

    <!-- Liste avec Dropdown améliorée -->
    <div v-else class="memos-container">

      <!-- État vide moderne -->
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

        <!-- En-tête de date amélioré -->
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

        <!-- Contenu date avec animation -->
        <transition name="smooth-expand">
          <div v-show="datesExpanded[groupe.date]" class="date-content">

            <div v-for="typeGroup in groupe.types" :key="typeGroup.type" class="type-group">

              <!-- En-tête type amélioré -->
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

              <!-- Contenu type avec animation -->
              <transition name="smooth-expand">
                <div
                  v-show="typesExpanded[`${groupe.date}-${typeGroup.type}`]"
                  class="type-content"
                >
                  <div
                    v-for="memo in typeGroup.memos"
                    :key="memo.id"
                    class="memo-item"
                    @click="voirDetailMemo(memo.id)"
                  >

                    <!-- Carte mémo modernisée -->
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
<!--                          <span class="memo-status" :class="`status-${memo.statut}`">-->
<!--                            {{ getStatutLabel(memo.statut) }}-->
<!--                          </span>-->
                        </div>
                      </div>

<!--                      <div v-if="memo.titre && memo.titre !== 'Sans titre'" class="memo-card-body">-->
<!--                        <h4 class="memo-title">{{ memo.titre }}</h4>-->
<!--                      </div>-->

                      <div class="memo-card-footer">
                        <div class="memo-stats">
                          <span class="stat-item">
                            💬 {{ memo.nombreMessages }} message{{ memo.nombreMessages > 1 ? 's' : '' }}
                          </span>
                          <span v-if="memo.entriesAffectees.length > 0" class="stat-item">
                            📎 {{ memo.entriesAffectees.length }} entrée{{ memo.entriesAffectees.length > 1 ? 's' : '' }}
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import HeadBuilder from '@/utils/HeadBuilder';
import memoListcss from "../../assets/css/toke-memoList-18.css?url"
import router from '@/router';
import { useUserStore } from '@/composables/userStore';
import UserService from '../../service/UserService';

// Interfaces
interface Employee {
  guid: string;
  tenant: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  country: string;
  employee_code: string;
  avatar_url: any;
  hire_date?: string;
  department: string;
  job_title?: string;
  active: boolean;
  last_login_at: any;
}

interface MemoContent {
  user: string;
  message: Array<{
    type: string;
    content: string;
  }>;
  created_at: string;
  type?: string;
}

interface MemoItem {
  guid: string;
  memo_type: string;
  memo_status: string;
  title: string;
  memo_content: MemoContent[];
  incident_date_time: string | null;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
  affected_entries: string[] | null;
  messages_count: number;
  latest_message: any;
  author_user: string;
  target_user: string;
  validator_user?: string;
}

interface Memo {
  id: string;
  titre: string;
  contenu: string;
  type: string;
  statut: string;
  dateCreation: Date;
  dateModification: Date;
  dateIncident: Date | null;
  createurId: string;
  createurNom: string;
  createurCode: string;
  createurDepartement: string;
  destinataireId: string;
  estAutoGenere: boolean;
  nombreMessages: number;
  entriesAffectees: string[];
}

interface MemoFilters {
  employeId?: string;
  type?: string;
  statut?: string;
}

// État
const userStore = useUserStore();
const memos = ref<Memo[]>([]);
const tousLesEmployes = ref<Employee[]>([]);
const chargement = ref(true);
const erreur = ref('');
const filtres = ref<MemoFilters>({
  employeId: '',
  type: '',
  statut: ''
});

// Tous les dropdowns fermés par défaut
const datesExpanded = reactive<Record<string, boolean>>({});
const typesExpanded = reactive<Record<string, boolean>>({});
const memosExpanded = reactive<Record<string, boolean>>({});

const toggleDateGroupe = (date: string) => {
  datesExpanded[date] = !datesExpanded[date];
};

const toggleTypeGroupe = (date: string, type: string) => {
  const key = `${date}-${type}`;
  typesExpanded[key] = !typesExpanded[key];
};

const toggleMemo = (memoId: string) => {
  memosExpanded[memoId] = !memosExpanded[memoId];
};

const getContenuPreview = (contenu: string, maxLength: number = 150): string => {
  if (!contenu) return 'Aucun contenu';
  return contenu.length > maxLength
    ? contenu.substring(0, maxLength) + '...'
    : contenu;
};

const getTotalMemosForDate = (groupe: any): number => {
  return groupe.types.reduce((total: number, typeGroup: any) => {
    return total + typeGroup.memos.length;
  }, 0);
};

const getCountForType = (typeValue: string): number => {
  if (!typeValue) return memosFiltres.value.length;
  return memosFiltres.value.filter(m => m.type === typeValue).length;
};

const getTypeIcon = (type: string): string => {
  const icons: { [key: string]: string } = {
    delay_justification: '⏰',
    absence_justification: '🏥',
    absence_notification: '📢',
    session_closure: '🔒',
    auto_generated: '🤖',
    other: '📝'
  };
  return icons[type] || '📝';
};

const getStatutLabel = (statut: string): string => {
  const labels: { [key: string]: string } = {
    draft: 'Brouillon',
    pending: 'En attente',
    submitted: 'Soumis',
    approved: 'Approuvé',
    rejected: 'Rejeté'
  };
  return labels[statut] || statut;
};

const memosParStatut = computed(() => {
  const stats = {
    draft: 0,
    pending: 0,
    submitted: 0,
    approved: 0,
    rejected: 0
  };

  memos.value.forEach(memo => {
    if (stats.hasOwnProperty(memo.statut)) {
      stats[memo.statut as keyof typeof stats]++;
    }
  });

  return stats;
});

const memosFiltres = computed(() => {
  let result = [...memos.value];

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
  // { value: 'absence_notification', label: 'Notification', icon: '📢' },
  { value: 'session_closure', label: 'Clôture', icon: '🔒' },
  { value: 'auto_generated', label: 'Auto', icon: '🤖' }
];

// Modifiez cette section dans votre computed "memosGroupes"
const memosGroupes = computed(() => {
  const groupes: Record<string, Record<string, Memo[]>> = {};

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
          .sort((a, b) => b.dateCreation.getTime() - a.dateCreation.getTime())
      }))
    }));

  // C'EST ICI QUE ÇA SE PASSE :
  result.forEach(groupe => {
    // Initialise à FALSE pour que ce soit fermé par défaut (Grand dropdown)
    if (!(groupe.date in datesExpanded)) {
      datesExpanded[groupe.date] = false;
    }

    groupe.types.forEach(typeGroup => {
      const typeKey = `${groupe.date}-${typeGroup.type}`;
      // Initialise à FALSE pour que ce soit fermé par défaut (Petit dropdown)
      if (!(typeKey in typesExpanded)) {
        typesExpanded[typeKey] = false;
      }

      typeGroup.memos.forEach(memo => {
        if (!(memo.id in memosExpanded)) {
          memosExpanded[memo.id] = false;
        }
      });
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

const extraireContenuTexte = (memoContent: MemoContent[]): string => {
  if (!memoContent || memoContent.length === 0) {
    return 'Aucun contenu';
  }

  const textes: string[] = [];
  let hasVoiceMessage = false;

  memoContent.forEach(content => {
    if (content.message && Array.isArray(content.message)) {
      content.message.forEach(msg => {
        if (msg.type === 'text' && msg.content) {
          textes.push(msg.content);
        } else if (msg.type === 'link' && msg.content) {
          // Détection des fichiers audio
          if (msg.content.match(/\.(m4a|mp3|wav|ogg|webm)$/i)) {
            hasVoiceMessage = true;
            textes.push('🎤 Message vocal');
          } else {
            textes.push(`🔗 ${msg.content}`);
          }
        }
      });
    }
  });

  if (textes.length === 0 && hasVoiceMessage) {
    return '🎤 Message vocal uniquement';
  }

  return textes.length > 0 ? textes.join(' • ') : 'Aucun contenu';
};
const chargerMemos = async () => {
  try {
    chargement.value = true;
    erreur.value = '';

    const managerId = userStore.user?.guid;

    if (!managerId) {
      erreur.value = 'ID du manager non disponible - utilisateur non connecté';
      chargement.value = false;
      return;
    }

    const response = await UserService.listAttendance(managerId);

    let allEmployeesStatus = null;

    if (response?.data?.data?.data?.all_employees_status) {
      allEmployeesStatus = response.data.data.data.all_employees_status;
    } else if (response?.data?.data?.all_employees_status) {
      allEmployeesStatus = response.data.data.all_employees_status;
    } else if (response?.data?.all_employees_status) {
      allEmployeesStatus = response.data.all_employees_status;
    }

    if (allEmployeesStatus && Array.isArray(allEmployeesStatus)) {
      const employesMap = new Map<string, Employee>();
      allEmployeesStatus.forEach((status: any) => {
        if (status.employee && status.employee.guid) {
          employesMap.set(status.employee.guid, status.employee);
        }
      });
      tousLesEmployes.value = Array.from(employesMap.values());

      const tousLesMemos: Memo[] = [];

      allEmployeesStatus.forEach((status: any) => {
        if (status.memos && status.memos.items && Array.isArray(status.memos.items)) {
          status.memos.items.forEach((memoApi: MemoItem) => {
            const auteur = tousLesEmployes.value.find(emp => emp.guid === memoApi.author_user);

            const memo: Memo = {
              id: memoApi.guid,
              titre: memoApi.title || 'Sans titre',
              contenu: extraireContenuTexte(memoApi.memo_content),
              type: memoApi.memo_type,
              statut: memoApi.memo_status,
              dateCreation: new Date(memoApi.created_at),
              dateModification: new Date(memoApi.updated_at),
              dateIncident: memoApi.incident_date_time ? new Date(memoApi.incident_date_time) : null,
              createurId: memoApi.author_user,
              createurNom: auteur ? `${auteur.first_name} ${auteur.last_name}` : userStore.user!.last_name,
              createurCode: auteur?.employee_code || 'N/A',
              createurDepartement: auteur?.department || 'N/A',
              destinataireId: memoApi.target_user,
              estAutoGenere: memoApi.auto_generated,
              nombreMessages: memoApi.messages_count,
              entriesAffectees: memoApi.affected_entries || []
            };
            console.log(memoApi);
            tousLesMemos.push(memo);
          });
        }
      });

      memos.value = tousLesMemos;

    } else {
      erreur.value = 'Structure de données invalide';
      memos.value = [];
      tousLesEmployes.value = [];
    }
  } catch (error) {
    console.error('💥 Erreur lors du chargement:', error);
    erreur.value = 'Une erreur est survenue lors du chargement des mémos';
    memos.value = [];
    tousLesEmployes.value = [];
  } finally {
    chargement.value = false;
  }
};

const naviguerCreerMemo = () => {
  router.push('/memoNew');
};

const voirDetailMemo = (memoId: string) => {
  router.push(`/memoDetails/${memoId}`);
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
  await chargerMemos();

  HeadBuilder.apply({
    title: 'memoList - Toké',
    css: [memoListcss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });
});
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.liste-memos {
  max-width: var(--container-max-width, 1200px);
  margin: 0 auto;
  padding: var(--space-lg, 24px);
  background: var(--bg-secondary, #F8F9FA);
  min-height: 100vh;
}

/* ===== EN-TÊTE ===== */
.page-header {
  background: var(--bg-card, white);
  border-radius: var(--border-radius-xl, 16px);
  padding: var(--space-xl, 32px);
  margin-bottom: var(--space-lg, 24px);
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.08));
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-lg, 24px);
  flex-wrap: wrap;
}

.title-section {
  flex: 1;
}

.page-title {
  margin: 0 0 var(--space-sm, 8px) 0;
  font-size: var(--font-size-h2, 40px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--text-primary, #212529);
  letter-spacing: -0.5px;
}

.page-subtitle {
  margin: 0;
  font-size: var(--font-size-body, 16px);
  color: var(--text-secondary, #6C757D);
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: var(--space-sm, 8px);
  padding: 12px var(--btn-padding-x, 24px);
  background: var(--color-primary, #004AAD);
  color: var(--bg-primary, white);
  border: none;
  border-radius: var(--border-radius-lg, 12px);
  font-size: var(--font-size-btn, 16px);
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
  transition: all var(--transition-base, 0.2s ease);
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.08));
  height: var(--btn-height, 48px);
}

.btn-primary:hover {
  background: #003d8f;
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.12));
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 20px;
  font-weight: 300;
}

/* ===== FILTRES ===== */
.filters-wrapper {
  margin-bottom: var(--space-lg, 24px);
}

.type-tabs {
  display: flex;
  gap: var(--space-md, 16px);
  background: var(--bg-card, white);
  padding: var(--space-md, 16px);
  border-radius: var(--border-radius-xl, 16px);
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.08));
  overflow-x: auto;
  scrollbar-width: thin;
}

.type-tab {
  display: flex;
  align-items: center;
  gap: var(--space-sm, 8px);
  padding: 10px 18px;
  background: var(--bg-secondary, #F8F9FA);
  border: 2px solid transparent;
  border-radius: var(--border-radius, 8px);
  cursor: pointer;
  transition: all var(--transition-base, 0.2s ease);
  white-space: nowrap;
  font-size: var(--font-size-body-sm, 14px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-primary, #212529);
}

.type-tab:hover {
  background: var(--border-light, #E9ECEF);
  border-color: var(--border-medium, #DEE2E6);
}

.type-tab.active {
  background: var(--color-primary, #004AAD);
  color: var(--bg-primary, white);
  border-color: var(--color-primary, #004AAD);
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.08));
}

.tab-icon {
  font-size: 18px;
}

.tab-label {
  font-weight: var(--font-weight-semibold, 600);
}


.tab-badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px var(--space-sm, 8px);
  border-radius: var(--border-radius-lg, 12px);
  font-size: var(--font-size-caption, 12px);
  font-weight: var(--font-weight-bold, 700);
}

.type-tab.active .tab-badge {
  background: rgba(255, 255, 255, 0.25);
}
.type-header-clickable {
  /* On ajuste les marges pour que ça rentre bien dans l'indentation */
  margin: var(--space-xs, 4px) var(--space-md, 16px) var(--space-xs, 4px) var(--space-xs, 8px);
}

.type-content {
  margin-left: var(--space-lg, 32px); /* Décale les mémos encore plus vers la droite */
}

/* ===== STATS ===== */
.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-md, 16px);
  margin-bottom: var(--space-lg, 24px);
}

.stat-card {
  background: var(--bg-card, white);
  padding: var(--space-lg, 20px);
  border-radius: var(--border-radius-xl, 16px);
  display: flex;
  align-items: center;
  gap: var(--space-md, 16px);
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.08));
  transition: all var(--transition-base, 0.2s ease);
  border-left: 4px solid;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.12));
}

.stat-card.total {
  border-left-color: var(--color-primary, #004AAD);
}

.stat-card.pending {
  border-left-color: var(--color-warning, #f67214);
}

.stat-card.approved {
  border-left-color: var(--color-success, #28A745);
}

.stat-card.rejected {
  border-left-color: var(--color-error, #DC3545);
}

.stat-icon {
  font-size: 32px;
  line-height: 1;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: var(--font-size-h2, 32px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--text-primary, #212529);
  line-height: 1;
  margin-bottom: var(--space-xs, 4px);
}

.stat-label {
  font-size: var(--font-size-body-sm, 13px);
  color: var(--text-secondary, #6C757D);
  font-weight: var(--font-weight-medium, 500);
}

/* ===== ÉTATS ===== */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 80px 20px;
  background: var(--bg-card, white);
  border-radius: var(--border-radius-xl, 16px);
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.08));
}

.loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg, 20px);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--border-light, #E9ECEF);
  border-top: 4px solid var(--color-primary, #004AAD);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  text-align: center;
}

.loading-title {
  margin: 0 0 var(--space-sm, 8px) 0;
  font-size: var(--font-size-body-lg, 18px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #212529);
}

.loading-subtitle {
  margin: 0;
  font-size: var(--font-size-body-sm, 14px);
  color: var(--text-secondary, #6C757D);
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg, 20px);
  padding: 60px 20px;
  background: var(--bg-card, white);
  border-radius: var(--border-radius-xl, 16px);
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.08));
}

.error-icon {
  font-size: 64px;
}

.error-message {
  font-size: var(--font-size-body, 16px);
  color: var(--color-error, #DC3545);
  margin: 0;
  text-align: center;
}

.btn-retry {
  padding: 12px var(--btn-padding-x, 24px);
  background: var(--color-primary, #004AAD);
  color: var(--bg-primary, white);
  border: none;
  border-radius: var(--border-radius, 8px);
  font-size: var(--font-size-btn, 16px);
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
  transition: all var(--transition-base, 0.2s ease);
  height: var(--btn-height, 48px);
}

.btn-retry:hover {
  background: #003d8f;
  transform: translateY(-2px);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg, 24px);
  padding: 80px 20px;
  background: var(--bg-card, white);
  border-radius: var(--border-radius-xl, 16px);
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.08));
}

.empty-illustration {
  position: relative;
}

.empty-icon {
  font-size: 80px;
  position: relative;
  z-index: 2;
}

.empty-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  background: var(--bg-secondary, #F8F9FA);
  border-radius: 50%;
  z-index: 1;
}

.empty-title {
  margin: 0;
  font-size: var(--font-size-h4, 24px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--text-primary, #212529);
}

.empty-description {
  margin: 0;
  font-size: var(--font-size-body, 16px);
  color: var(--text-secondary, #6C757D);
  text-align: center;
  max-width: 400px;
}

.btn-create-first {
  padding: 12px var(--btn-padding-x, 24px);
  background: var(--color-primary, #004AAD);
  color: var(--bg-primary, white);
  border: none;
  border-radius: var(--border-radius, 8px);
  font-size: var(--font-size-btn, 16px);
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
  transition: all var(--transition-base, 0.2s ease);
  height: var(--btn-height, 48px);
}

.btn-create-first:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.12));
}

/* ===== LISTE DES MÉMOS ===== */
.memos-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-md, 16px);
}

.groupe-date {
  background: var(--bg-card, white);
  border-radius: var(--border-radius-xl, 16px);
  overflow: hidden;
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.08));
  transition: all var(--transition-base, 0.2s ease);
}

/* En-tête date */
.date-header-clickable {
  cursor: pointer;
  user-select: none;
  transition: all var(--transition-base, 0.2s ease);
  background: var(--bg-secondary, #F8F9FA);
}

.date-header-clickable:hover {
  background: var(--border-light, #E9ECEF);
}

.date-header-clickable.expanded {
  background: var(--color-primary, #004AAD);
}

.date-header-clickable.expanded .date-title,
.date-header-clickable.expanded .date-badge {
  color: var(--bg-primary, white);
}

.date-header {
  padding: var(--space-lg, 20px) var(--space-lg, 24px);
}

.date-main {
  display: flex;
  align-items: center;
  gap: var(--space-md, 16px);
}

.dropdown-arrow {
  font-size: 24px;
  color: var(--text-secondary, #6C757D);
  transition: transform var(--transition-base, 0.2s ease);
  font-weight: bold;
}

.date-header-clickable.expanded .dropdown-arrow {
  color: var(--bg-primary, white);
}

.dropdown-arrow.expanded {
  transform: rotate(90deg);
}

.dropdown-arrow.small {
  font-size: 18px;
}

.date-info {
  display: flex;
  align-items: center;
  gap: var(--space-md, 12px);
  flex: 1;
}

.date-title {
  margin: 0;
  font-size: var(--font-size-h5, 20px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--text-primary, #212529);
  text-transform: capitalize;
}

.date-badge {
  background: var(--bg-secondary, #F8F9FA);
  color: var(--color-primary, #004AAD);
  padding: var(--space-xs, 4px) var(--space-md, 12px);
  border-radius: var(--border-radius-lg, 12px);
  font-size: var(--font-size-body-sm, 13px);
  font-weight: var(--font-weight-bold, 700);
  border: 1px solid var(--border-light, #E9ECEF);
}

.date-header-clickable.expanded .date-badge {
  background: rgba(255, 255, 255, 0.2);
  color: var(--bg-primary, white);
  border-color: transparent;
}

/* Contenu date */
.date-content {
  padding: var(--space-sm, 8px) 0;
}

/* En-tête type */
.type-group {
  margin: 0;
}

.type-header-clickable {
  cursor: pointer;
  user-select: none;
  transition: all var(--transition-base, 0.2s ease);
  margin: var(--space-xs, 4px) var(--space-md, 16px);
  border-radius: var(--border-radius-lg, 12px);
  background: var(--bg-secondary, #F8F9FA);
  border: 1px solid var(--border-light, #E9ECEF);
}

.type-header-clickable:hover {
  background: var(--border-light, #E9ECEF);
  border-color: var(--border-medium, #DEE2E6);
}

.type-header-clickable.expanded {
  background: var(--bg-card, white);
  border-color: var(--color-primary, #004AAD);
}

.type-header {
  display: flex;
  align-items: center;
  gap: var(--space-md, 12px);
  padding: var(--space-md, 16px) var(--space-lg, 20px);
}

.type-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm, 10px);
  flex: 1;
}

.type-icon {
  font-size: 22px;
}

.type-title {
  margin: 0;
  font-size: var(--font-size-body, 16px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #212529);
}

.type-count {
  background: var(--color-primary, #004AAD);
  color: var(--bg-primary, white);
  padding: var(--space-xs, 4px) var(--space-sm, 10px);
  border-radius: var(--border-radius, 8px);
  font-size: var(--font-size-caption, 12px);
  font-weight: var(--font-weight-bold, 700);
}

/* Contenu type */
.type-content {
  padding: var(--space-sm, 8px) var(--space-md, 16px) var(--space-md, 16px) var(--space-md, 16px);
}

/* Carte mémo */
.memo-item {
  margin-bottom: var(--space-md, 12px);
}

.memo-card {
  background: var(--bg-card, white);
  border: 2px solid var(--border-light, #E9ECEF);
  border-radius: var(--border-radius-lg, 12px);
  padding: var(--space-lg, 20px);
  cursor: pointer;
  transition: all var(--transition-base, 0.2s ease);
}

.memo-card:hover {
  border-color: var(--color-primary, #004AAD);
  box-shadow: var(--shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.12));
  transform: translateY(-2px);
}

.memo-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-md, 16px);
  margin-bottom: var(--space-md, 16px);
}

.memo-user-info {
  display: flex;
  align-items: center;
  gap: var(--space-md, 12px);
  flex: 1;
}

.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-primary, #004AAD);
  color: var(--bg-primary, white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-body-sm, 14px);
  font-weight: var(--font-weight-bold, 700);
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
  min-width: 0;
}

.user-name {
  background: none;
  border: none;
  padding: 0;
  font-size: var(--font-size-body, 16px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-primary, #004AAD);
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-base, 0.2s ease);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-name:hover {
  color: #003d8f;
  text-decoration: underline;
}

.user-code {
  font-size: var(--font-size-body-sm, 13px);
  color: var(--text-secondary, #6C757D);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.memo-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-sm, 8px);
  flex-shrink: 0;
}

.memo-time {
  font-size: var(--font-size-body-sm, 13px);
  color: var(--text-secondary, #6C757D);
  white-space: nowrap;
}

.memo-status {
  padding: 6px var(--space-md, 12px);
  border-radius: 20px;
  font-size: 11px;
  font-weight: var(--font-weight-bold, 700);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.memo-card-body {
  margin-bottom: var(--space-md, 16px);
  padding-bottom: var(--space-md, 16px);
  border-bottom: 1px solid var(--border-light, #E9ECEF);
}

.memo-title {
  margin: 0;
  font-size: var(--font-size-body, 16px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-primary, #212529);
  line-height: var(--line-height-body, 24px);
}

.memo-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-md, 12px);
}

.memo-stats {
  display: flex;
  gap: var(--space-md, 16px);
  flex-wrap: wrap;
}

.stat-item {
  font-size: var(--font-size-body-sm, 13px);
  color: var(--text-secondary, #6C757D);
  display: flex;
  align-items: center;
  gap: var(--space-xs, 4px);
}

.view-arrow {
  font-size: 20px;
  color: var(--color-primary, #004AAD);
  font-weight: bold;
  transition: transform var(--transition-base, 0.2s ease);
}

.memo-card:hover .view-arrow {
  transform: translateX(4px);

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .liste-memos {
    padding: 16px;
  }

  .page-header {
    padding: 24px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .page-title {
    font-size: 24px;
  }

  .btn-primary {
    width: 100%;
    justify-content: center;
  }

  .type-tabs {
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .stats-section {
    grid-template-columns: 1fr;
  }

  .memo-card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .memo-meta {
    flex-direction: row;
    align-items: center;
    width: 100%;
  }

  .memo-time {
    order: 2;
  }

  .memo-status {
    order: 1;
  }
}
}
</style>