<template>
  <div class="detail-memo-chat">

    <!-- Input fichier caché (géré ici car MemoChat émet 'trigger-file-input') -->
    <input
        type="file"
        ref="fileInput"
        @change="ajouterFichiers"
        multiple
        accept=".txt,.pdf,.jpg,.jpeg,.png,.mp3,.wav,.webm,.ogg"
        class="file-input"
    />

    <MemoChat
        :header-title="interlocuteurNom"
        :header-subtitle="getTypeLabel(memo?.type || '')"
        :header-info="memoHeaderInfo"
        :status-badge="statusBadge"
        :show-header-action="!!peutValider"
        :messages="chatMessages"
        :loading="isLoading"
        loading-text="Chargement du mémo..."
        :show-input="!!peutValider"
        v-model:input-text="reponseContenu"
        input-placeholder="Écrire une réponse..."
        :selected-files="fichiers"
        :is-recording="isRecording"
        :recording-time="recordingTime"
        :has-recording="!!audioBlob"
        :recorded-duration="recordedDuration"
        :is-preview-playing="isPreviewPlaying"
        :preview-current-time="previewCurrentTime"
        :show-audio-download="false"
        @back="retourListe"
        @toggle-panel="showValidationPanel = !showValidationPanel"
        @send="envoyerReponse"
        @trigger-file-input="fileInput?.click()"
        @remove-file="supprimerFichier"
        @toggle-recording="toggleRecording"
        @remove-recording="deleteRecording"
        @toggle-preview-play="togglePreviewPlay"
        @view-image="(f) => voirImage(f.url!)"
        @toggle-audio-play="handleToggleAudioPlay"
    >
      <!-- Slot image preview avec AuthenticatedMedia -->
      <template #image-preview="{ fichier }">
        <AuthenticatedMedia :url="fichier.url ?? ''" />
      </template>

      <!-- Panneau de validation dans le slot side-panel -->
      <template #side-panel>
        <transition name="slide">
          <div v-if="peutValider && showValidationPanel" class="validation-panel">
            <div class="validation-panel-header">
              <h3>Actions de validation</h3>
              <button @click="showValidationPanel = false" class="btn-close-panel">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="close-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div class="validation-panel-content">
              <div class="validation-info">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="info-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>Vous pouvez ajouter une réponse avant de valider ou rejeter le mémo.</p>
              </div>

              <div class="validation-actions-section">
                <h4 class="section-subtitle">Décision finale</h4>
                <div class="actions-buttons-vertical">
                  <button
                      class="btn-action-full btn-approve-full"
                      @click="approuverMemo"
                      :disabled="isProcessing"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="action-icon">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <div class="action-text">
                      <span class="action-title">Approuver le mémo</span>
                      <span class="action-subtitle">Le mémo sera marqué comme validé</span>
                    </div>
                    <div v-if="isProcessing && actionType === 'approve'" class="spinner-small"></div>
                  </button>

                  <button
                      class="btn-action-full btn-reject-full"
                      @click="rejeterMemo"
                      :disabled="isProcessing"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="action-icon">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <div class="action-text">
                      <span class="action-title">Rejeter le mémo</span>
                      <span class="action-subtitle">Ajoutez une réponse pour expliquer</span>
                    </div>
                    <div v-if="isProcessing && actionType === 'reject'" class="spinner-small"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </template>
    </MemoChat>

    <!-- Modal pour voir les images -->
    <div v-if="imageModalUrl" class="image-modal" @click="fermerImageModal">
      <div class="modal-content" @click.stop>
        <button class="btn-close-modal" @click="fermerImageModal">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="close-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        <AuthenticatedMedia :url="imageModalUrl!" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import HeadBuilder from '@/utils/HeadBuilder';
import router from '@/router';
import AuthenticatedMedia from '../../views/memo/AuthenticatedMedia.vue';
import MemoChat from '../../views/memo/memoChat.vue';
import memoDetailChatCss from "../../assets/css/toke-memoDetails-19.css?url";
import { useMemoStore, type Memo} from '@/stores/memoStore';
import MemoService, { MessageContent } from '@/service/MemoService';

// ============ INTERFACES ============

interface AttachedFile {
  id: string;
  nom: string;
  type: 'text' | 'image' | 'pdf' | 'audio';
  url: string;
  dateAjout: Date;
}

interface ConversationMessage {
  contenu: string;
  fichiers: AttachedFile[];
  dateEnvoi: Date;
  isFromManager: boolean;
  type: 'initial' | 'response' | 'validation';
}

interface ReponseEnvoyee {
  contenu: string;
  fichiers: File[];
  audioBlob: Blob | null;
  audioURL: string | null;
  duration: string;
  timestamp: string;
}

// ============ STORES & ROUTE ============

const route = useRoute();
const memoId = computed(() => route.params.guid as string);
const userStore = useUserStore();
const memoStore = useMemoStore();
const managerGuid = computed(() => userStore.user?.guid || '');

// ============ STATE ============

const memo = ref<Memo | null>(null);
const isLoading = ref(true);
const isProcessing = ref(false);
const actionType = ref<'approve' | 'reject' | null>(null);
const imageModalUrl = ref<string | null>(null);
const errorMessage = ref<string>('');
const showValidationPanel = ref(false);

// Réponse
const reponseContenu = ref('');
const fichiers = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const isSubmitting = ref(false);
const reponsesEnvoyees = ref<ReponseEnvoyee[]>([]);

// Enregistrement audio
const isRecording = ref(false);
const mediaRecorder = ref<MediaRecorder | null>(null);
const audioChunks = ref<Blob[]>([]);
const audioBlob = ref<Blob | null>(null);
const audioURL = ref<string>('');
const recordingTime = ref('00:00');
const recordingInterval = ref<number | null>(null);
const recordingStartTime = ref<number>(0);
const recordedDuration = ref<string>('00:00');

// Preview audio enregistrement
const isPreviewPlaying = ref(false);
const previewCurrentTime = ref('0:00');
const previewAudio = ref<HTMLAudioElement | null>(null);

// Lecture audio des messages
const currentPlayingIndex = ref<string | null>(null);
const isPlaying = ref(false);
const currentAudioTime = ref('0:00');
const audioElements = ref<Map<string, HTMLAudioElement>>(new Map());

// Lecture audio des réponses locales
const currentPlayingReponseId = ref<string | null>(null);
const isPlayingReponse = ref(false);
const currentReponseAudioTime = ref('0:00');
const reponseAudioElements = ref<Map<string, HTMLAudioElement>>(new Map());
const audioDurations = reactive<Record<string, number>>({});
const audioUpdateTrigger = ref(0);

const isUploadingFiles = ref(false);
const uploadProgress = ref<{ current: number; total: number } | null>(null);

// ============ COMPUTED ============

const userInitials = computed(() => userStore.userInitials || '?');

/**
 * Le manager peut valider uniquement si :
 * - Le mémo a été créé PAR l'employé (createurId !== managerGuid)
 * - ET le statut est en attente de validation
 *
 * Si c'est le manager qui a créé le mémo, il attend une RÉPONSE de l'employé,
 * donc il n'y a pas d'action de validation disponible pour lui.
 */
const memoCreeParlEmploye = computed(() => {
  if (!memo.value || !managerGuid.value) return false;
  return memo.value.createurId !== managerGuid.value;
});

const peutValider = computed(() =>
    memo.value &&
    memoCreeParlEmploye.value &&
    (memo.value.statut === 'pending' || memo.value.statut === 'submitted')
);

/**
 * Nom affiché dans le header = l'interlocuteur du manager.
 * - Si le manager a créé le mémo → l'interlocuteur est le destinataire (l'employé)
 * - Si l'employé a créé le mémo → l'interlocuteur est le créateur (l'employé)
 * Dans les deux cas, c'est la personne qui N'EST PAS le manager connecté.
 */
const interlocuteurNom = computed(() => {
  if (!memo.value) return 'Employé';
  // Si le manager est le créateur, l'interlocuteur est le destinataire
  if (memo.value.createurId === managerGuid.value) {
    return memo.value.destinataireNom && memo.value.destinataireNom !== 'N/A'
        ? memo.value.destinataireNom
        : 'Employé';
  }
  // Sinon, l'interlocuteur est le créateur (l'employé qui a soumis)
  return memo.value.createurNom || 'Employé';
});

/**
 * Titre informatif affiché en 3ème ligne du header de MemoChat.
 * Reprend le titre brut de l'API (ex: "delay Arrivee - 19 minutes")
 * et reformate les durées pour l'affichage (ex: "delay Arrivee - 19 min").
 * Non affiché pour les mémos de type "other" (titre libre déjà visible).
 */
const memoHeaderInfo = computed((): string => {
  if (!memo.value?.titre || memo.value.titre === 'Sans titre') return '';
  if (memo.value.type === 'other') return ''; // titre saisi par l'user, affiché ailleurs
  return formatMinutesInContent(memo.value.titre);
});

const peutEnvoyerReponse = computed(() =>
    reponseContenu.value.trim() || audioBlob.value !== null || fichiers.value.length > 0
);

/** Badge de statut passé à MemoChat */
const statusBadge = computed(() => {
  if (!memo.value) return undefined;
  return {
    value: memo.value.statut,
    icon: getStatutIcon(memo.value.statut),
    label: getStatutLabel(memo.value.statut)
  };
});

/**
 * Transforme conversationMessages (format interne) en Message[] (format MemoChat).
 * Inclut également les réponses locales (reponsesEnvoyees) en fin de liste.
 */
const chatMessages = computed(() => {
  const result: any[] = [];

  conversationMessages.value.forEach((msg, index) => {
    // Convertir les fichiers AttachedFile → Attachment (format MemoChat)
    const attachments = msg.fichiers.map(f => ({
      id: f.id,
      nom: f.nom,
      name: f.nom,
      type: f.type,
      url: f.url,
      duration: getFormattedDuration(f.id)
    }));

    // Métadonnées (date d'incident sur le premier message)
    const metadata: any[] = [];
    if (index === 0 && memo.value?.dateIncident) {
      metadata.push({
        iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
        label: `Incident: ${formatDateShort(memo.value.dateIncident)}`
      });
    }

    result.push({
      id: `msg-${index}`,
      type: msg.isFromManager ? 'sent' : 'received',
      senderName: msg.isFromManager
          ? (memo.value?.autoGenerated && msg.type === 'initial' ? '🤖 Système' : 'Manager')
          : interlocuteurNom.value,
      senderInitials: msg.isFromManager
          ? userInitials.value
          : getInitials(interlocuteurNom.value),
      timestamp: formatDate(msg.dateEnvoi),
      content: msg.contenu || undefined,
      title: index === 0 ? memo.value?.titre : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      metadata: metadata.length > 0 ? metadata : undefined,
      validationType: msg.type === 'validation'
          ? (memo.value?.statut === 'approved' ? 'approved' : 'rejected') as 'approved' | 'rejected'
          : undefined
    });
  });

  // Ajouter les réponses envoyées localement
  reponsesEnvoyees.value.forEach((reponse, index) => {
    const attachments: any[] = reponse.fichiers.map(f => ({
      nom: f.name,
      name: f.name,
      type: f.type.startsWith('image/') ? 'image' : f.type.startsWith('audio/') ? 'audio' : 'text'
    }));

    if (reponse.audioURL) {
      attachments.push({
        id: `reponse-audio-${index}`,
        nom: 'Note vocale',
        name: 'Note vocale',
        type: 'audio',
        url: reponse.audioURL,
        duration: reponse.duration
      });
    }

    result.push({
      id: `local-${index}`,
      type: 'sent',
      senderName: 'Manager',
      senderInitials: userInitials.value,
      timestamp: reponse.timestamp,
      content: reponse.contenu || undefined,
      attachments: attachments.length > 0 ? attachments : undefined
    });
  });

  // Message système si en attente de validation et un seul message
  if (peutValider.value && conversationMessages.value.length === 1) {
    result.push({
      id: 'system-waiting',
      type: 'system',
      senderName: '',
      senderInitials: '',
      timestamp: '',
      content: '⏳ En attente de votre validation'
    });
  }

  return result;
});

// ============ COMPUTED - CONVERSATION MESSAGES (logique métier) ============

const conversationMessages = computed((): ConversationMessage[] => {
  if (!memo.value || !memo.value.memoContent) return [];

  const messages: ConversationMessage[] = [];

  memo.value.memoContent.forEach((content) => {
    /**
     * content.user contient l'email de l'auteur (pas son GUID).
     * On compare avec les emails récupérés depuis memoStore.employees.
     */
    const authorUser = content.user;

    const auteurEmployee = memoStore.employees.find(e => e.guid === memo.value!.createurId);
    const destinataireEmployee = memoStore.employees.find(e => e.guid === memo.value!.destinataireId);

    const auteurEmail = auteurEmployee?.email ?? '';
    const destinataireEmail = destinataireEmployee?.email ?? '';

    let isFromManager: boolean;

    if (content.type === 'validation') {
      isFromManager = true;
    } else if (destinataireEmail && authorUser === destinataireEmail) {
      isFromManager = true;
    } else if (auteurEmail && authorUser === auteurEmail) {
      isFromManager = false;
    } else if (content.type === 'initial') {
      isFromManager = false;
    } else {
      isFromManager = true;
    }

    const textMessages = formatMinutesInContent(
        content.message
            .filter(msg => msg.type === 'text')
            .map(msg => msg.content)
            .join('\n')
    );

    const files: AttachedFile[] = [];
    content.message.forEach((msg, msgIdx) => {
      if (msg.type === 'image' || msg.type === 'audio' || msg.type === 'file') {
        files.push({
          id: `${content.created_at}-${msgIdx}`,
          nom: extractFileName(msg.content),
          type: msg.type === 'image' ? 'image' : msg.type === 'audio' ? 'audio' : 'text',
          url: msg.content,
          dateAjout: new Date(content.created_at)
        } as AttachedFile);
      }

      if (msg.type === 'link') {
        const fileType = detectFileType(msg.content);
        if (fileType === 'audio' || fileType === 'image' || fileType === 'pdf') {
          files.push({
            id: `${content.created_at}-${msgIdx}`,
            nom: extractFileName(msg.content),
            type: fileType,
            url: msg.content,
            dateAjout: new Date(content.created_at)
          });
        }
      }
    });

    messages.push({
      contenu: textMessages,
      fichiers: files,
      dateEnvoi: new Date(content.created_at),
      isFromManager,
      type: content.type as 'initial' | 'response' | 'validation'
    });
  });

  return messages.sort((a, b) => a.dateEnvoi.getTime() - b.dateEnvoi.getTime());
});

// ============ UTILITAIRES ============

const getInitials = (nom: string): string => {
  const parts = nom.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nom.substring(0, 2).toUpperCase();
};

const detectFileType = (url: string): 'image' | 'audio' | 'pdf' | 'text' => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.match(/\.(m4a|mp3|wav|ogg|webm|aac|flac|mpeg)(\?.*)?$/i)) return 'audio';
  if (lowerUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i)) return 'image';
  if (lowerUrl.match(/\.pdf(\?.*)?$/i)) return 'pdf';
  return 'text';
};

const extractFileName = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const fileName = urlObj.pathname.split('/').pop() || 'Fichier';
    return decodeURIComponent(fileName);
  } catch {
    return 'Fichier';
  }
};

/**
 * Convertit une durée en minutes en format lisible.
 * Ex : 127 → "2h07"  |  45 → "45 min"  |  60 → "1h00"
 */
const formatMinutes = (totalMinutes: number): string => {
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const heures = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0
      ? `${heures}h${String(minutes).padStart(2, '0')}`
      : `${heures}h`;
};

/**
 * Parcourt le texte d'un message et reformate toutes les occurrences
 * de durées en minutes générées par le système.
 * Patterns détectés :
 *   "127 minutes"  → "2h07"
 *   "127 min"      → "2h07"
 *   "127min"       → "2h07"
 *   "retard de 45" → "retard de 45 min" (si < 60) ou "retard de 1h30"
 */
const formatMinutesInContent = (text: string): string => {
  if (!text) return text;
  // Pattern : nombre suivi de "minutes", "min", "mn" (avec ou sans espace)
  return text.replace(
      /(\d+)\s*(minutes?|mins?|mn)/gi,
      (_, nb) => {
        const total = parseInt(nb, 10);
        return formatMinutes(total);
      }
  );
};

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    late_justification: 'Justification de retard',
    absence_justification: "Justification d'absence",
    correction_request: 'Demande de correction',
    session_closure: 'Clôture de session',
    auto_memo: 'Mémo automatique',
    other: 'Autres'
  };
  return labels[type] || type;
};

const getStatutLabel = (statut: string): string => {
  if (statut === 'pending' || statut === 'submitted') {
    // Si le manager a créé le mémo → il attend une réponse de l'employé
    // Si l'employé a créé le mémo → le manager doit valider
    return memoCreeParlEmploye.value ? 'En attente de validation' : 'En attente de réponse';
  }
  const labels: Record<string, string> = {
    approved: 'Approuvé',
    rejected: 'Rejeté',
    draft: 'Brouillon'
  };
  return labels[statut] || statut;
};

const getStatutIcon = (statut: string): string => {
  const icons: Record<string, string> = {
    pending: '⏳',
    submitted: '📤',
    approved: '✅',
    rejected: '❌',
    draft: '📝'
  };
  return icons[statut] || '📋';
};

const getFileIconFromFile = (file: File): string => {
  if (file.type.startsWith('image/')) return '🖼️';
  if (file.type === 'application/pdf') return '📄';
  if (file.type.startsWith('audio/')) return '🎵';
  if (file.type.startsWith('text/')) return '📝';
  return '📎';
};

/**
 * Format d'heure contextuel pour les bulles de chat :
 * - Même jour       → "14h30"
 * - Hier            → "Hier à 09h15"
 * - Cette semaine   → "Lun. à 10h00"
 * - Plus ancien     → "18 jan. à 08h45"
 * - Autre année     → "18 jan. 2023 à 08h45"
 */
const formatDate = (date: Date): string => {
  const d = new Date(date);
  const now = new Date();

  const heures = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const heure = `${heures}h${minutes}`;

  const debutAujourdhui = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const debutHier = new Date(debutAujourdhui);
  debutHier.setDate(debutHier.getDate() - 1);
  const debutSemaine = new Date(debutAujourdhui);
  debutSemaine.setDate(debutSemaine.getDate() - 6);

  if (d >= debutAujourdhui) {
    return heure;
  } else if (d >= debutHier) {
    return `Hier à ${heure}`;
  } else if (d >= debutSemaine) {
    const jours = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
    return `${jours[d.getDay()]} à ${heure}`;
  } else if (d.getFullYear() === now.getFullYear()) {
    const mois = ['jan.', 'fév.', 'mar.', 'avr.', 'mai', 'juin',
      'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.'];
    return `${d.getDate()} ${mois[d.getMonth()]} à ${heure}`;
  } else {
    const mois = ['jan.', 'fév.', 'mar.', 'avr.', 'mai', 'juin',
      'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.'];
    return `${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()} à ${heure}`;
  }
};

const formatDateShort = (date: Date): string => {
  const d = new Date(date);
  const mois = ['jan.', 'fév.', 'mar.', 'avr.', 'mai', 'juin',
    'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.'];
  const heures = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()} à ${heures}h${minutes}`;
};

const formatDuration = (duration: number | undefined): string => {
  if (!duration || isNaN(duration) || duration === Infinity) return '--:--';
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const getFormattedDuration = (fileId: string): string => {
  const _ = audioUpdateTrigger.value; // réactivité
  return formatDuration(audioDurations[fileId]);
};

const voirImage = (url: string) => {
  imageModalUrl.value = url;
};

const fermerImageModal = () => {
  imageModalUrl.value = null;
};

// ============ CHARGEMENT ============

const chargerMemo = async () => {
  if (!memoId.value || !managerGuid.value) {
    errorMessage.value = 'Données manquantes';
    isLoading.value = false;
    return;
  }

  isLoading.value = true;

  try {
    if (!memoStore.isCacheValid) {
      await memoStore.loadMemos(managerGuid.value);
    }

    const memoFromStore = memoStore.getMemoByGuid(memoId.value);

    if (memoFromStore) {
      memo.value = memoFromStore;
    } else {
      const refreshedMemo = await memoStore.refreshMemo(managerGuid.value, memoId.value);
      if (refreshedMemo) {
        memo.value = refreshedMemo;
      } else {
        errorMessage.value = 'Mémo introuvable';
      }
    }
  } catch (error: any) {
    console.error('❌ Erreur chargement:', error);
    errorMessage.value = error.message || 'Une erreur est survenue';
  } finally {
    isLoading.value = false;
  }
};

// ============ AUDIO - ENREGISTREMENT ============

const toggleRecording = async () => {
  if (isRecording.value) {
    stopRecording();
  } else {
    await startRecording();
  }
};

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.value = new MediaRecorder(stream);
    audioChunks.value = [];

    mediaRecorder.value.ondataavailable = (event) => {
      audioChunks.value.push(event.data);
    };

    mediaRecorder.value.onstop = () => {
      audioBlob.value = new Blob(audioChunks.value, { type: 'audio/webm' });
      audioURL.value = URL.createObjectURL(audioBlob.value);
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.value.start();
    isRecording.value = true;
    recordingStartTime.value = Date.now();

    recordingInterval.value = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartTime.value) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      recordingTime.value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
  } catch (error) {
    console.error('Erreur microphone:', error);
    alert("Impossible d'accéder au microphone");
  }
};

const stopRecording = () => {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop();
    isRecording.value = false;
    if (recordingInterval.value) {
      clearInterval(recordingInterval.value);
      recordingInterval.value = null;
    }
    recordedDuration.value = recordingTime.value;
    recordingTime.value = '00:00';
  }
};

const deleteRecording = () => {
  if (audioURL.value) {
    URL.revokeObjectURL(audioURL.value);
    audioURL.value = '';
  }
  audioBlob.value = null;
  audioChunks.value = [];
  recordedDuration.value = '00:00';
};

// ============ AUDIO - PREVIEW ============

const togglePreviewPlay = () => {
  if (!audioURL.value) return;

  if (!previewAudio.value) {
    previewAudio.value = new Audio(audioURL.value);
    previewAudio.value.addEventListener('timeupdate', () => {
      const current = Math.floor(previewAudio.value!.currentTime);
      const m = Math.floor(current / 60);
      const s = current % 60;
      previewCurrentTime.value = `${m}:${String(s).padStart(2, '0')}`;
    });
    previewAudio.value.addEventListener('ended', () => {
      isPreviewPlaying.value = false;
      previewCurrentTime.value = '0:00';
    });
  }

  if (isPreviewPlaying.value) {
    previewAudio.value.pause();
    isPreviewPlaying.value = false;
  } else {
    previewAudio.value.play();
    isPreviewPlaying.value = true;
  }
};

// ============ AUDIO - LECTURE MESSAGES ============

const loadAuthenticatedAudio = async (url: string): Promise<string> => {
  const blob = await MemoService.loadFiles(url);
  return URL.createObjectURL(blob);
};

/**
 * Gère l'événement 'toggle-audio-play' émis par MemoChat.
 * L'audioId peut correspondre à un fichier de message ou d'une réponse locale.
 */
const handleToggleAudioPlay = async (audioId: string) => {
  // Réponses locales
  if (audioId.startsWith('reponse-')) {
    toggleReponseAudioPlay(audioId);
    return;
  }

  // Fichiers des messages de la conversation
  let fichier: AttachedFile | undefined;
  for (const message of conversationMessages.value) {
    fichier = message.fichiers.find(f => f.id === audioId);
    if (fichier) break;
  }

  if (!fichier || fichier.type !== 'audio') return;

  // Arrêter l'ancien audio si différent
  if (currentPlayingIndex.value !== null && currentPlayingIndex.value !== audioId) {
    const oldAudio = audioElements.value.get(currentPlayingIndex.value);
    if (oldAudio) { oldAudio.pause(); oldAudio.currentTime = 0; }
  }

  let audio = audioElements.value.get(audioId);

  if (!audio) {
    try {
      const authenticatedUrl = await loadAuthenticatedAudio(fichier.url);
      audio = new Audio();

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Timeout audio')), 10000);

        audio!.addEventListener('loadedmetadata', () => {
          if (audio!.duration && !isNaN(audio!.duration) && audio!.duration !== Infinity) {
            audioDurations[audioId] = audio!.duration;
          }
        });

        audio!.addEventListener('canplaythrough', () => {
          clearTimeout(timeoutId);
          if (audio!.duration && !isNaN(audio!.duration) && audio!.duration !== Infinity) {
            audioDurations[audioId] = audio!.duration;
            audioUpdateTrigger.value++;
          }
          resolve();
        });

        audio!.addEventListener('error', () => {
          clearTimeout(timeoutId);
          reject(new Error('Erreur de chargement audio'));
        });

        audio!.preload = 'auto';
        audio!.src = authenticatedUrl;
        audio!.load();
      });

      audioElements.value.set(audioId, audio);

      audio.addEventListener('timeupdate', () => {
        if (currentPlayingIndex.value === audioId) {
          const current = Math.floor(audio!.currentTime);
          const m = Math.floor(current / 60);
          const s = current % 60;
          currentAudioTime.value = `${m}:${String(s).padStart(2, '0')}`;
        }
      });

      audio.addEventListener('ended', () => {
        isPlaying.value = false;
        currentPlayingIndex.value = null;
        currentAudioTime.value = '0:00';
      });

    } catch (error) {
      console.error('❌ Erreur chargement audio:', error);
      alert('Impossible de charger le fichier audio.');
      return;
    }
  }

  if (currentPlayingIndex.value === audioId && isPlaying.value) {
    audio.pause();
    isPlaying.value = false;
  } else {
    try {
      await audio.play();
      isPlaying.value = true;
      currentPlayingIndex.value = audioId;
    } catch {
      alert('Impossible de lire ce fichier audio.');
      isPlaying.value = false;
    }
  }
};

const toggleReponseAudioPlay = (reponseId: string) => {
  if (currentPlayingReponseId.value !== null && currentPlayingReponseId.value !== reponseId) {
    const oldAudio = reponseAudioElements.value.get(currentPlayingReponseId.value);
    if (oldAudio) { oldAudio.pause(); oldAudio.currentTime = 0; }
  }

  let audio = reponseAudioElements.value.get(reponseId);
  if (!audio) {
    const reponseIndex = parseInt(reponseId.split('-')[1]);
    const reponse = reponsesEnvoyees.value[reponseIndex];
    if (!reponse?.audioURL) return;

    audio = new Audio(reponse.audioURL);
    reponseAudioElements.value.set(reponseId, audio);

    audio.addEventListener('timeupdate', () => {
      const current = Math.floor(audio!.currentTime);
      const m = Math.floor(current / 60);
      const s = current % 60;
      currentReponseAudioTime.value = `${m}:${String(s).padStart(2, '0')}`;
    });

    audio.addEventListener('ended', () => {
      isPlayingReponse.value = false;
      currentPlayingReponseId.value = null;
      currentReponseAudioTime.value = '0:00';
    });
  }

  if (currentPlayingReponseId.value === reponseId && isPlayingReponse.value) {
    audio.pause();
    isPlayingReponse.value = false;
  } else {
    audio.play();
    isPlayingReponse.value = true;
    currentPlayingReponseId.value = reponseId;
  }
};

// ============ FICHIERS ============

const supprimerFichier = (index: number) => {
  fichiers.value.splice(index, 1);
};

const ajouterFichiers = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    const nouveauxFichiers = Array.from(target.files);
    const totalApres = fichiers.value.length + nouveauxFichiers.length + (audioBlob.value ? 1 : 0);
    if (totalApres > 8) {
      alert(`Maximum 8 fichiers autorisés. Vous avez déjà ${fichiers.value.length} fichier(s)${audioBlob.value ? ' + 1 audio' : ''}`);
      return;
    }
    fichiers.value.push(...nouveauxFichiers);
  }
  if (target) target.value = '';
};

const collectAllFiles = async (): Promise<File[]> => {
  const allFiles: File[] = [...fichiers.value];
  if (audioBlob.value) {
    allFiles.push(new File([audioBlob.value], `audio-${Date.now()}.webm`, { type: audioBlob.value.type }));
  }
  return allFiles;
};

// ============ ACTIONS MÉTIER ============

const envoyerReponse = async () => {
  if (!peutEnvoyerReponse.value || isSubmitting.value || !memo.value || !managerGuid.value) return;

  const totalFiles = fichiers.value.length + (audioBlob.value ? 1 : 0);
  if (totalFiles > 8) {
    alert('Maximum 8 fichiers autorisés par envoi');
    return;
  }

  isSubmitting.value = true;
  isUploadingFiles.value = true;

  try {
    const allFiles = await collectAllFiles();
    const uploadedFiles = allFiles.length > 0 ? await MemoService.uploadMultipleFiles(allFiles) : [];
    isUploadingFiles.value = false;

    const messageContent = MemoService.buildMessageContent(reponseContenu.value, uploadedFiles);

    await MemoService.sendReply(memo.value.guid, {
      user: managerGuid.value,
      message: messageContent
    });

    const now = new Date();
    const timeString = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    reponsesEnvoyees.value.push({
      contenu: reponseContenu.value,
      fichiers: [...fichiers.value],
      audioBlob: audioBlob.value,
      audioURL: audioBlob.value ? URL.createObjectURL(audioBlob.value) : null,
      duration: recordedDuration.value,
      timestamp: timeString
    });

    // Reset formulaire
    reponseContenu.value = '';
    fichiers.value = [];
    audioBlob.value = null;
    recordedDuration.value = '00:00';
    if (audioURL.value) { URL.revokeObjectURL(audioURL.value); audioURL.value = ''; }
    uploadProgress.value = null;

    await memoStore.refreshMemo(managerGuid.value, memo.value.guid);
    await chargerMemo();

  } catch (error: any) {
    console.error('❌ Erreur envoi réponse:', error);
    alert(`Erreur: ${error.message || "Impossible d'envoyer la réponse"}`);
  } finally {
    isSubmitting.value = false;
    isUploadingFiles.value = false;
    uploadProgress.value = null;
  }
};

const approuverMemo = async () => {
  if (!memo.value || isProcessing.value || !managerGuid.value) return;
  if (!confirm) return;

  isProcessing.value = true;
  actionType.value = 'approve';
  isUploadingFiles.value = true;

  try {
    let messageContent: MessageContent[] | undefined;
    if (reponseContenu.value.trim() || fichiers.value.length > 0 || audioBlob.value) {
      const totalFiles = fichiers.value.length + (audioBlob.value ? 1 : 0);
      if (totalFiles > 8) throw new Error('Maximum 8 fichiers autorisés');
      const allFiles = await collectAllFiles();
      const uploadedFiles = allFiles.length > 0 ? await MemoService.uploadMultipleFiles(allFiles) : [];
      messageContent = MemoService.buildMessageContent(reponseContenu.value, uploadedFiles);
    }

    isUploadingFiles.value = false;

    const response = await MemoService.validateMemo(memo.value.guid, managerGuid.value);
    if (!response.success) return;

    await memoStore.refreshMemo(managerGuid.value, memo.value.guid);
    await chargerMemo();

    setTimeout(() => router.push('/memoList'), 2500);

  } catch (error: any) {
    console.error('❌ Erreur approbation:', error);
    alert(`Erreur: ${error.message || "Impossible d'approuver le mémo"}`);
  } finally {
    isProcessing.value = false;
    actionType.value = null;
    isUploadingFiles.value = false;
    uploadProgress.value = null;
  }
};

const rejeterMemo = async () => {
  if (!memo.value || isProcessing.value || !managerGuid.value) return;
  if (!confirm) return;

  isProcessing.value = true;
  actionType.value = 'reject';
  isUploadingFiles.value = true;

  try {
    let messageContent: MessageContent[] | undefined;
    if (reponseContenu.value.trim() || fichiers.value.length > 0 || audioBlob.value) {
      const totalFiles = fichiers.value.length + (audioBlob.value ? 1 : 0);
      if (totalFiles > 8) throw new Error('Maximum 8 fichiers autorisés');
      const allFiles = await collectAllFiles();
      const uploadedFiles = allFiles.length > 0 ? await MemoService.uploadMultipleFiles(allFiles) : [];
      messageContent = MemoService.buildMessageContent(reponseContenu.value, uploadedFiles);
    }

    isUploadingFiles.value = false;

    await MemoService.rejetMemo(memo.value.guid, managerGuid.value);
    await memoStore.refreshMemo(managerGuid.value, memo.value.guid);
    await chargerMemo();

    setTimeout(() => router.push('/memoList'), 2000);

  } catch (error: any) {
    console.error('❌ Erreur rejet:', error);
    alert(`Erreur: ${error.message || "Impossible de rejeter le mémo"}`);
  } finally {
    isProcessing.value = false;
    actionType.value = null;
    isUploadingFiles.value = false;
    uploadProgress.value = null;
  }
};

const retourListe = () => {
  router.push('/memoList');
};

// ============ LIFECYCLE ============

onMounted(() => {
  console.log('=== 🚀 MEMO DETAILS MOUNTED ===');
  chargerMemo();
  HeadBuilder.apply({
    title: 'Détails du mémo - Toké',
    css: [memoDetailChatCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });
});

onUnmounted(() => {
  if (recordingInterval.value) clearInterval(recordingInterval.value);
  if (audioURL.value) URL.revokeObjectURL(audioURL.value);

  audioElements.value.forEach(audio => {
    if (audio.src?.startsWith('blob:')) URL.revokeObjectURL(audio.src);
    audio.pause();
    audio.src = '';
  });
  audioElements.value.clear();

  reponseAudioElements.value.forEach(audio => {
    if (audio.src?.startsWith('blob:')) URL.revokeObjectURL(audio.src);
    audio.pause();
    audio.src = '';
  });
  reponseAudioElements.value.clear();

  reponsesEnvoyees.value.forEach(reponse => {
    if (reponse.audioURL) URL.revokeObjectURL(reponse.audioURL);
  });

  if (previewAudio.value) {
    previewAudio.value.pause();
    previewAudio.value.src = '';
  }

  Object.keys(audioDurations).forEach(key => delete audioDurations[key]);
});
</script>

<style scoped>
/* Input fichier masqué */
.file-input {
  display: none;
}

/* Modal image */
.image-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.modal-content :deep(img) {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
}

.btn-close-modal {
  position: absolute;
  top: -16px;
  right: -16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.close-icon { width: 18px; height: 18px; color: #374151; }

/* Panneau de validation */
.validation-panel {
  width: 320px;
  background: white;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
}

.validation-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.validation-panel-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.btn-close-panel {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f3f4f6;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.validation-panel-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.validation-info {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: #eff6ff;
  border-radius: 8px;
  border: 1px solid #bfdbfe;
}

.info-icon { width: 20px; height: 20px; color: #3b82f6; flex-shrink: 0; }

.validation-info p {
  font-size: 13px;
  color: #1d4ed8;
  margin: 0;
  line-height: 1.5;
}

.section-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 12px 0;
}

.actions-buttons-vertical {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-action-full {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.btn-action-full:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-approve-full {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.btn-approve-full:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-reject-full {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.btn-reject-full:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.action-icon { width: 20px; height: 20px; flex-shrink: 0; }

.action-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.action-title { font-size: 14px; font-weight: 600; }
.action-subtitle { font-size: 12px; opacity: 0.85; }

.spinner-small {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Transition panneau */
.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>