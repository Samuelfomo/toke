<template>
  <div class="validation-memos">
    <!-- En-tête -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Mémos en attente de validation</h1>
        <div class="header-stats">
          <span class="stat-badge">{{ memosEnAttente.length }} mémo(s)</span>
        </div>
      </div>
      <button class="btn-retour" @click="retourListe">
        ← Retour
      </button>
    </div>

    <!-- Filtres rapides -->
    <div class="filtres-rapides">
      <button
        class="filtre-btn"
        :class="{ active: filtreTypeActif === 'tous' }"
        @click="filtreTypeActif = 'tous'"
      >
        Tous ({{ memosEnAttente.length }})
      </button>
      <button
        class="filtre-btn"
        :class="{ active: filtreTypeActif === 'justification_retard' }"
        @click="filtreTypeActif = 'justification_retard'"
      >
        Retards ({{ compterParType('justification_retard') }})
      </button>
      <button
        class="filtre-btn"
        :class="{ active: filtreTypeActif === 'absence' }"
        @click="filtreTypeActif = 'absence'"
      >
        Absences ({{ compterParType('absence') }})
      </button>
      <button
        class="filtre-btn"
        :class="{ active: filtreTypeActif === 'demande_correction' }"
        @click="filtreTypeActif = 'demande_correction'"
      >
        Corrections ({{ compterParType('demande_correction') }})
      </button>
      <button
        class="filtre-btn"
        :class="{ active: filtreTypeActif === 'autres' }"
        @click="filtreTypeActif = 'autres'"
      >
        Autres ({{ compterParType('autres') }})
      </button>
    </div>

    <!-- Liste des mémos -->
    <div class="memos-container">
      <div v-if="memosFiltres.length === 0" class="empty-state">
        <div class="empty-icon">✅</div>
        <p class="empty-title">Aucun mémo en attente</p>
        <p class="empty-text">Tous les mémos ont été traités !</p>
      </div>

      <div v-else class="memos-grid">
        <div
          v-for="memo in memosFiltres"
          :key="memo.id"
          class="memo-card"
        >
          <!-- En-tête de la carte -->
          <div class="card-header">
            <div class="card-header-left">
              <span class="memo-type" :class="`type-${memo.type}`">
                {{ getTypeLabel(memo.type) }}
              </span>
              <span class="memo-date">{{ formatDateRelative(memo.dateCreation) }}</span>
            </div>
            <button class="btn-expand" @click="toggleExpand(memo.id)">
              {{ expandedIds.includes(memo.id) ? '▼' : '▶' }}
            </button>
          </div>

          <!-- Corps de la carte -->
          <div class="card-body">
            <h3 class="memo-titre">{{ memo.titre }}</h3>

            <p class="memo-extrait">
              {{ memo.contenu.substring(0, 120) }}{{ memo.contenu.length > 120 ? '...' : '' }}
            </p>

            <div class="memo-meta">
              <div class="meta-row">
                <span class="meta-label">De:</span>
                <span class="meta-value">{{ memo.createurNom }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Pour:</span>
                <span class="meta-value">
                  {{ memo.estMemoGeneral ? 'Tous les employés' : 'Employé spécifique' }}
                </span>
              </div>
              <div v-if="memo.fichiersAttaches.length > 0" class="meta-row">
                <span class="meta-label">Fichiers:</span>
                <span class="meta-value">{{ memo.fichiersAttaches.length }} pièce(s) jointe(s)</span>
              </div>
            </div>
          </div>

          <!-- Contenu étendu -->
          <div v-if="expandedIds.includes(memo.id)" class="card-extended">
            <div class="extended-section">
              <h4 class="extended-title">Contenu complet</h4>
              <p class="extended-content">{{ memo.contenu }}</p>
            </div>

            <div v-if="memo.fichiersAttaches.length > 0" class="extended-section">
              <h4 class="extended-title">Fichiers joints</h4>
              <div class="fichiers-list">
                <div
                  v-for="fichier in memo.fichiersAttaches"
                  :key="fichier.id"
                  class="fichier-item"
                >
                  <span class="fichier-icon">{{ getFileIcon(fichier.type) }}</span>
                  <span class="fichier-nom">{{ fichier.nom }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions rapides -->
          <div class="card-actions">
            <button
              class="btn-action btn-detail"
              @click="voirDetail(memo.id)"
            >
              👁️ Voir détails
            </button>
            <button
              class="btn-action btn-rejeter"
              @click="actionRapide(memo.id, 'rejeter')"
            >
              ❌ Rejeter
            </button>
            <button
              class="btn-action btn-approuver"
              @click="actionRapide(memo.id, 'approuver')"
            >
              ✅ Approuver
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmation -->
    <div v-if="modalVisible" class="modal-overlay" @click="fermerModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">
            {{ actionEnCours === 'approuver' ? 'Approuver le mémo' : 'Rejeter le mémo' }}
          </h2>
          <button class="btn-close" @click="fermerModal">✕</button>
        </div>

        <div class="modal-body">
          <p class="modal-question">
            {{ actionEnCours === 'approuver'
            ? 'Voulez-vous approuver ce mémo ?'
            : 'Voulez-vous rejeter ce mémo ?'
            }}
          </p>

          <div class="form-group">
            <label for="commentaire-modal" class="form-label">
              Commentaire {{ actionEnCours === 'rejeter' ? '(recommandé)' : '(optionnel)' }}
            </label>
            <textarea
              id="commentaire-modal"
              v-model="commentaireModal"
              class="form-textarea"
              rows="4"
              :placeholder="actionEnCours === 'rejeter'
                ? 'Expliquez la raison du rejet...'
                : 'Ajoutez un commentaire...'"
            ></textarea>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="fermerModal">
            Annuler
          </button>
          <button
            class="btn-confirm"
            :class="{ 'btn-danger': actionEnCours === 'rejeter' }"
            @click="confirmerAction"
            :disabled="isProcessing"
          >
            {{ isProcessing ? 'Traitement...' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import HeadBuilder from '@/utils/HeadBuilder';
import memoValidatecss from "../../assets/css/toke-memoValidate-20.css?url"
import router from '@/router';

// Interfaces
interface AttachedFile {
  id: string;
  nom: string;
  type: 'text' | 'image' | 'pdf' | 'audio';
  url: string;
  dateAjout: Date;
}

interface Memo {
  id: string;
  titre: string;
  contenu: string;
  type: string;
  statut: string;
  dateCreation: Date;
  dateModification?: Date;
  createurId: string;
  createurNom: string;
  destinataireIds: string[];
  estMemoGeneral: boolean;
  fichiersAttaches: AttachedFile[];
}

// État
const memosEnAttente = ref<Memo[]>([]);
const filtreTypeActif = ref<string>('tous');
const expandedIds = ref<string[]>([]);
const modalVisible = ref(false);
const memoIdEnCours = ref<string | null>(null);
const actionEnCours = ref<'approuver' | 'rejeter'>('approuver');
const commentaireModal = ref('');
const isProcessing = ref(false);

// Computed
const memosFiltres = computed(() => {
  if (filtreTypeActif.value === 'tous') {
    return memosEnAttente.value;
  }
  return memosEnAttente.value.filter(m => m.type === filtreTypeActif.value);
});

// Méthodes
const chargerMemosEnAttente = async () => {
  try {
    // TODO: Appel API
    // const response = await fetch('/api/memos?statut=soumis,en_attente');
    // memosEnAttente.value = await response.json();
  } catch (error) {
    console.error('Erreur lors du chargement des mémos:', error);
  }
};

const compterParType = (type: string): number => {
  return memosEnAttente.value.filter(m => m.type === type).length;
};

const getTypeLabel = (type: string): string => {
  const labels: { [key: string]: string } = {
    justification_retard: 'Justification de retard',
    absence: 'Absence',
    demande_correction: 'Demande de correction',
    cloture_session: 'Clôture de session',
    memo_auto: 'Mémo automatique',
    autres: 'Autres'
  };
  return labels[type] || type;
};

const getFileIcon = (type: string): string => {
  const icons: { [key: string]: string } = {
    image: '🖼️',
    pdf: '📄',
    audio: '🎵',
    text: '📝'
  };
  return icons[type] || '📎';
};

const formatDateRelative = (date: Date): string => {
  const now = new Date();
  const memoDate = new Date(date);
  const diffMs = now.getTime() - memoDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  } else {
    return memoDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
};

const toggleExpand = (memoId: string) => {
  const index = expandedIds.value.indexOf(memoId);
  if (index > -1) {
    expandedIds.value.splice(index, 1);
  } else {
    expandedIds.value.push(memoId);
  }
};

const voirDetail = (memoId: string) => {
  // TODO: Navigation vers la page de détail
  router.push(`/memoDetails/${memoId}`);
};

const actionRapide = (memoId: string, action: 'approuver' | 'rejeter') => {
  memoIdEnCours.value = memoId;
  actionEnCours.value = action;
  commentaireModal.value = '';
  modalVisible.value = true;
};

const fermerModal = () => {
  modalVisible.value = false;
  memoIdEnCours.value = null;
  commentaireModal.value = '';
  isProcessing.value = false;
};

const confirmerAction = async () => {
  if (!memoIdEnCours.value || isProcessing.value) return;

  isProcessing.value = true;

  try {
    // TODO: Appel API
    const endpoint = actionEnCours.value === 'approuver' ? 'approuver' : 'rejeter';
    // const response = await fetch(`/api/memos/${memoIdEnCours.value}/${endpoint}`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ commentaire: commentaireModal.value })
    // });
    // const result = await response.json();

    // Simuler un délai
    await new Promise(resolve => setTimeout(resolve, 500));

    // Retirer le mémo de la liste
    const index = memosEnAttente.value.findIndex(m => m.id === memoIdEnCours.value);
    if (index > -1) {
      memosEnAttente.value.splice(index, 1);
    }

    alert(`Mémo ${actionEnCours.value === 'approuver' ? 'approuvé' : 'rejeté'} avec succès !`);
    fermerModal();
  } catch (error) {
    console.error('Erreur lors de l\'action:', error);
    alert('Erreur lors du traitement du mémo');
  } finally {
    isProcessing.value = false;
  }
};

const retourListe = () => {
  // TODO: Navigation
  // router.push('/memos');
};

// Lifecycle
chargerMemosEnAttente();

onMounted(() => {
  HeadBuilder.apply({
    title: 'memoValidation - Toké',
    css: [memoValidatecss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
});


</script>

<style scoped>
</style>