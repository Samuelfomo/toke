<template>
  <div class="creer-memo-chat">
    <!-- En-tête -->
    <div class="chat-header">
      <button @click="retourListe" class="btn-retour">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="back-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>

      <div class="header-info">
        <div class="destinataire-info">
          <div class="destinataire-avatar">
            <svg v-if="typeDestinataire === 'general'" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="avatar-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24" class="avatar-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <div class="destinataire-text">
            <h2 class="destinataire-nom">
              {{ typeDestinataire === 'general' ? 'Tous les employés' :
              (employeSelectionne ? employeSelectionne.name : 'Sélectionner un employé') }}
            </h2>
            <p class="memo-type-label">{{ getTypeLabel(formulaire.type) || 'Sélectionner un type' }}</p>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <button @click="showConfigPanel = !showConfigPanel" class="btn-config">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="config-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Zone de contenu principale -->
    <div class="chat-content-wrapper">
      <!-- Zone de messages -->
      <div class="messages-area" ref="messagesContainer">
        <!-- Message de bienvenue - affiché uniquement si aucun mémo n'a été envoyé -->
        <div v-if="!memoEnvoye" class="welcome-message">
          <div class="welcome-icon">✍️</div>
          <h3 class="welcome-title">Nouveau mémo</h3>
          <p class="welcome-text">Configurez votre mémo et commencez à écrire</p>
        </div>

        <!-- Liste des mémos envoyés -->
        <div v-for="(memo, index) in memosEnvoyes" :key="index" class="message-item sent">
          <div class="message-content">
            <div class="message-header-info">
              <span class="message-time">{{ memo.timestamp }}</span>
            </div>
            <div class="message-bubble">
              <h4 class="preview-titre">{{ memo.titre }}</h4>
              <p v-if="memo.contenu" class="preview-contenu">{{ memo.contenu }}</p>

              <!-- Fichiers attachés -->
              <div v-if="memo.fichiers && memo.fichiers.length > 0" class="attachments-preview">
                <div v-for="(fichier, idx) in memo.fichiers" :key="idx" class="attachment-item">
                  <span class="attachment-icon">{{ getFileIcon(fichier.type) }}</span>
                  <span class="attachment-name">{{ fichier.name }}</span>
                </div>
              </div>

              <!-- Audio player -->
              <div v-if="memo.audioURL" class="audio-player-container">
                <button
                  @click="toggleAudioPlay(index)"
                  class="audio-play-btn"
                  :class="{ 'playing': currentPlayingIndex === index && isPlaying }"
                >
                  <!-- Icône Play -->
                  <svg v-if="currentPlayingIndex !== index || !isPlaying" fill="currentColor" viewBox="0 0 20 20" class="play-icon">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path>
                  </svg>
                  <!-- Icône Pause -->
                  <svg v-else fill="currentColor" viewBox="0 0 20 20" class="pause-icon">
                    <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"></path>
                  </svg>
                </button>

                <div class="audio-player-info">
                  <div class="audio-waveform">
                    <div class="waveform-bar" v-for="i in 20" :key="i"
                         :style="{ height: getWaveformHeight(i, currentPlayingIndex === index && isPlaying) }">
                    </div>
                  </div>
                  <div class="audio-time-info">
                    <span class="audio-current-time">{{ currentPlayingIndex === index ? currentAudioTime : '0:00' }}</span>
                    <span class="audio-duration-text">{{ memo.duration }}</span>
                  </div>
                </div>

                <button @click="downloadAudio(memo.audioURL, index)" class="audio-download-btn" title="Télécharger">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="download-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div class="message-avatar">
            <div class="avatar-placeholder manager">{{ userInitials }}</div>
          </div>
        </div>
      </div>

      <!-- Panneau de configuration -->
      <transition name="slide">
        <div v-if="showConfigPanel" class="config-panel">
          <div class="config-panel-header">
            <h3>Configuration</h3>
            <button @click="showConfigPanel = false" class="btn-close-panel">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="close-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div class="config-panel-content">
            <!-- Destinataire -->
            <div class="config-section">
              <h4 class="config-section-title">Destinataire</h4>

              <!-- Si employé présélectionné -->
              <div v-if="isEmployePreselectionne" class="employe-preselectionne">
                <div class="employe-info-card">
                  <div class="employe-avatar-small">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="avatar-icon-small">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <div class="employe-text">
                    <p class="employe-nom-selected">{{ employePreselectionne?.name }}</p>
                    <p class="employe-label">Destinataire</p>
                  </div>
                  <svg class="check-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <p class="employe-note">Cet employé a été sélectionné automatiquement</p>
              </div>

              <!-- Sinon afficher les options normales -->
              <div v-else>
                <div class="radio-group">
                  <label class="radio-label">
                    <input
                      type="radio"
                      v-model="typeDestinataire"
                      value="individuel"
                      class="radio-input"
                    />
                    <span class="radio-text">Employé spécifique</span>
                  </label>

                  <label class="radio-label">
                    <input
                      type="radio"
                      v-model="typeDestinataire"
                      value="general"
                      class="radio-input"
                    />
                    <span class="radio-text">Tous les employés</span>
                  </label>
                </div>

                <div v-if="typeDestinataire === 'individuel'" class="form-group">
                  <select
                    v-model="formulaire.destinataireId"
                    class="form-select"
                    required
                  >
                    <option value="">Choisir un employé</option>
                    <option v-for="employe in employes" :key="employe.id" :value="employe.id">
                      {{ employe.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

<!--            &lt;!&ndash; Type de mémo &ndash;&gt;-->
<!--            <div class="config-section">-->
<!--              <h4 class="config-section-title">Type de mémo</h4>-->
<!--              <select-->
<!--                v-model="formulaire.type"-->
<!--                class="form-select"-->
<!--                required-->
<!--              >-->
<!--                <option value="" disabled>Sélectionner un type</option>-->
<!--                <option v-for="(req, index) in memoTitle" :key="index" :value="req.type">{{ req.titre }}</option>-->
<!--              </select>-->
<!--            </div>-->

<!--            &lt;!&ndash; Titre du mémo &ndash;&gt;-->
<!--            <div class="config-section">-->
<!--              <h4 class="config-section-title">Titre du mémo *</h4>-->
<!--              <input-->
<!--                v-model="formulaire.titre"-->
<!--                type="text"-->
<!--                placeholder="Entrez le titre du mémo..."-->
<!--                class="form-input-titre"-->
<!--                required-->
<!--              />-->
<!--            </div>-->

            <!-- Type de mémo -->
            <div class="config-section">
              <h4 class="config-section-title">Type de mémo</h4>
              <select
                  v-model="formulaire.type"
                  class="form-select"
                  required
              >
                <option value="" disabled>Sélectionner un type</option>
                <option
                    v-for="(req, index) in memoTitle"
                    :key="index"
                    :value="req.type"
                >
                  {{ req.titre }}
                </option>
              </select>
            </div>

            <!-- Titre du mémo (uniquement si type = other) -->
            <div class="config-section" v-if="formulaire.type === 'other'">
              <h4 class="config-section-title">Titre du mémo *</h4>
              <input
                  v-model="formulaire.titre"
                  type="text"
                  placeholder="Entrez le titre du mémo..."
                  class="form-input-titre"
                  required
              />
            </div>

          </div>
        </div>
      </transition>
    </div>

    <!-- Zone de saisie -->
    <div class="chat-input-area">
      <div class="input-wrapper">
        <!-- Input fichier caché -->
        <input
          type="file"
          ref="fileInput"
          @change="ajouterFichiers"
          multiple
          accept=".txt,.pdf,.jpg,.jpeg,.png,.mp3,.wav,.webm,.ogg"
          class="file-input"
          id="file-upload-input"
        />

        <!-- Bouton fichier -->
        <label for="file-upload-input" class="action-button" title="Ajouter des fichiers">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="action-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
          </svg>
        </label>

        <!-- Bouton note vocale -->
        <button
          class="action-button"
          :class="{ 'recording': isRecording }"
          @click="toggleRecording"
          :title="isRecording ? 'Arrêter l\'enregistrement' : 'Enregistrer une note vocale'"
        >
          <svg v-if="!isRecording" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="action-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
          </svg>
          <svg v-else fill="currentColor" viewBox="0 0 20 20" class="action-icon">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd"></path>
          </svg>
        </button>

        <!-- Barre d'enregistrement audio OU Textarea -->
        <div v-if="isRecording || audioBlob" class="audio-recorder-container">
          <!-- Mode enregistrement actif -->
          <div v-if="isRecording" class="audio-recorder-bar recording-active">
            <div class="recorder-left">
              <div class="pulse-animation">
                <span class="pulse-dot"></span>
                <span class="pulse-ring"></span>
              </div>
              <div class="recorder-info">
                <span class="recorder-label">Enregistrement en cours</span>
                <span class="recorder-time">{{ recordingTime }}</span>
              </div>
            </div>

            <button class="recorder-stop-btn" @click="stopRecording" title="Arrêter l'enregistrement">
              <svg fill="currentColor" viewBox="0 0 20 20" class="stop-icon">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd"></path>
              </svg>
            </button>
          </div>

          <!-- Mode enregistrement terminé (preview) -->
          <div v-else class="audio-recorder-bar recording-done">
            <div class="recorder-preview">
              <div class="audio-icon-wrapper">
                <svg fill="currentColor" viewBox="0 0 20 20" class="audio-wave-icon">
                  <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div class="audio-info">
                <span class="audio-label">Note vocale enregistrée</span>
                <span class="audio-duration">{{ recordedDuration }}</span>
              </div>
            </div>

            <button class="recorder-delete-btn" @click="deleteRecording" title="Supprimer l'enregistrement">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="delete-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        </div>

        <textarea
          v-if="!isRecording && !audioBlob"
          v-model="formulaire.contenu"
          @keydown.enter.ctrl="soumettreMemo"
          placeholder="Écrire le contenu du mémo..."
          class="memo-input"
          rows="3"
          ref="memoInput"
        ></textarea>

        <!-- Bouton envoyer -->
        <button
          @click="soumettreMemo"
          :disabled="!peutEnvoyer || isSubmitting"
          class="send-button"
        >
          <svg v-if="!isSubmitting" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="send-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
          <div v-else class="spinner-small"></div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch, nextTick, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/composables/userStore';
import "../../assets/css/toke-memo-08.css"
import router from '@/router';
import {TeamEmployee, useTeamStore} from "@/composables/teamStore";

// Interfaces

interface FormulaireMemo {
  destinataireId: string;
  type: string;
  titre: string;
  contenu: string;
}

interface MemoEnvoye {
  titre: string;
  contenu: string;
  fichiers: File[];
  audioBlob: Blob | null;
  audioURL: string | null;
  duration: string;
  timestamp: string;
}

// Route et Store
const route = useRoute();
const userStore = useUserStore();

const teamStore = useTeamStore()

// État
const employes = computed(() => teamStore.employees);
const typeDestinataire = ref<'individuel' | 'general'>('individuel');
const employePreselectionne = ref<TeamEmployee | null>(null);
const formulaire = ref<FormulaireMemo>({
  destinataireId: '',
  type: '',
  titre: '',
  contenu: ''
});
const fichiers = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const isSubmitting = ref(false);
const showConfigPanel = ref(true);
const messagesContainer = ref<HTMLElement | null>(null);
const memoInput = ref<HTMLTextAreaElement | null>(null);


const memoTitle = ref([
  {
    type: 'delay_justification',
    titre: 'Justification de retard',
  },
  {
    type: 'absence_justification',
    titre: `Justification d'absence`,
  },
  {
    type: 'other',
    titre: 'Autres',
  },
]);

watch(() => formulaire.value.type, (newType) => {
  if (newType !== 'other') {
    const found = memoTitle.value.find(m => m.type === newType);
    formulaire.value.titre = found ? found.titre : '';
  } else {
    formulaire.value.titre = '';
  }
});


// Mémos envoyés
const memosEnvoyes = ref<MemoEnvoye[]>([]);
const memoEnvoye = computed(() => memosEnvoyes.value.length > 0);

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

// Lecture audio
const currentPlayingIndex = ref<number | null>(null);
const isPlaying = ref(false);
const currentAudioTime = ref('0:00');
const audioElements = ref<Map<number, HTMLAudioElement>>(new Map());

// Computed
const userInitials = computed(() => userStore.userInitials || '?');

const employeSelectionne = computed(() => {
  if (employePreselectionne.value) {
    return employePreselectionne.value;
  }
  return employes.value.find(e => e.id === formulaire.value.destinataireId);
});

const peutEnvoyer = computed(() => {
  const aDestinataire = typeDestinataire.value === 'general' || formulaire.value.destinataireId;
  const aType = formulaire.value.type;
  const aTitre = formulaire.value.titre.trim();
  const aContenu = formulaire.value.contenu.trim();
  const aAudio = audioBlob.value !== null;

  // Peut envoyer si tous les champs requis sont remplis ET (contenu texte OU audio)
  return aDestinataire && aType && aTitre && (aContenu || aAudio);
});

const isEmployePreselectionne = computed(() => {
  return !!employePreselectionne.value;
});

// Méthodes
const chargerEmployes = async () => {
  try {
    await teamStore.loadTeam(userStore.user?.guid!)
  } catch (error) {
    console.error('❌ Erreur chargement employés:', error);
  }
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
  return labels[type] || '';
};

const ajouterFichiers = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    fichiers.value.push(...Array.from(target.files));
  }
};

const getFileIcon = (type: string): string => {
  if (type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf') return '📄';
  if (type.startsWith('audio/')) return '🎵';
  if (type.startsWith('text/')) return '📝';
  return '📎';
};

// Enregistrement audio
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
    alert('Impossible d\'accéder au microphone');
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

    // Sauvegarder la durée finale
    recordedDuration.value = recordingTime.value;
    recordingTime.value = '00:00';
  }
};

const deleteRecording = () => {
  // Supprimer l'enregistrement
  if (audioURL.value) {
    URL.revokeObjectURL(audioURL.value);
    audioURL.value = '';
  }
  audioBlob.value = null;
  audioChunks.value = [];
  recordedDuration.value = '00:00';
};

// Lecture audio
const toggleAudioPlay = (index: number) => {
  const memo = memosEnvoyes.value[index];
  if (!memo.audioURL) return;

  // Si c'est un autre audio qui joue, l'arrêter
  if (currentPlayingIndex.value !== null && currentPlayingIndex.value !== index) {
    const oldAudio = audioElements.value.get(currentPlayingIndex.value);
    if (oldAudio) {
      oldAudio.pause();
      oldAudio.currentTime = 0;
    }
  }

  // Récupérer ou créer l'élément audio
  let audio = audioElements.value.get(index);
  if (!audio) {
    audio = new Audio(memo.audioURL);
    audioElements.value.set(index, audio);

    // Événements audio
    audio.addEventListener('timeupdate', () => {
      const current = Math.floor(audio!.currentTime);
      const minutes = Math.floor(current / 60);
      const seconds = current % 60;
      currentAudioTime.value = `${minutes}:${String(seconds).padStart(2, '0')}`;
    });

    audio.addEventListener('ended', () => {
      isPlaying.value = false;
      currentPlayingIndex.value = null;
      currentAudioTime.value = '0:00';
    });
  }

  // Toggle play/pause
  if (currentPlayingIndex.value === index && isPlaying.value) {
    audio.pause();
    isPlaying.value = false;
  } else {
    audio.play();
    isPlaying.value = true;
    currentPlayingIndex.value = index;
  }
};

const downloadAudio = (audioURL: string | null, index: number) => {
  if (!audioURL) return;

  const a = document.createElement('a');
  a.href = audioURL;
  a.download = `note-vocale-${index + 1}.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const getWaveformHeight = (index: number, isActive: boolean): string => {
  // Génère des hauteurs aléatoires pour l'animation de la forme d'onde
  const baseHeight = 4;
  const maxHeight = 20;

  if (isActive) {
    // Animation plus dynamique quand l'audio joue
    const randomHeight = baseHeight + Math.random() * (maxHeight - baseHeight);
    return `${randomHeight}px`;
  } else {
    // Forme d'onde statique
    const heights = [8, 14, 10, 18, 12, 16, 9, 15, 11, 17, 13, 19, 10, 14, 8, 16, 12, 15, 11, 13];
    return `${heights[index % heights.length]}px`;
  }
};

const soumettreMemo = async () => {
  if (!peutEnvoyer.value || isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    const formData = new FormData();
    formData.append('type', formulaire.value.type);
    formData.append('titre', formulaire.value.titre);
    formData.append('contenu', formulaire.value.contenu);
    formData.append('estMemoGeneral', String(typeDestinataire.value === 'general'));

    if (typeDestinataire.value === 'individuel') {
      formData.append('destinataireId', formulaire.value.destinataireId);
    }

    fichiers.value.forEach((fichier) => {
      formData.append(`fichiers`, fichier);
    });

    if (audioBlob.value) {
      formData.append('noteVocale', audioBlob.value, 'note-vocale.webm');
    }

    // TODO: Appel API
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Ajouter le mémo à la liste des mémos envoyés
    const now = new Date();
    const timeString = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Créer une URL permanente pour l'audio si présent
    const audioURLToSave = audioBlob.value ? URL.createObjectURL(audioBlob.value) : null;

    memosEnvoyes.value.push({
      titre: formulaire.value.titre,
      contenu: formulaire.value.contenu,
      fichiers: [...fichiers.value],
      audioBlob: audioBlob.value,
      audioURL: audioURLToSave,
      duration: recordedDuration.value,
      timestamp: timeString
    });

    // Réinitialiser le formulaire
    formulaire.value.titre = '';
    formulaire.value.contenu = '';
    fichiers.value = [];
    audioBlob.value = null;
    recordedDuration.value = '00:00';
    if (audioURL.value) {
      URL.revokeObjectURL(audioURL.value);
      audioURL.value = '';
    }

    // Scroller vers le bas
    scrollToBottom();

    alert('Mémo créé avec succès !');
  } catch (error) {
    console.error('Erreur:', error);
    alert('Erreur lors de la création du mémo');
  } finally {
    isSubmitting.value = false;
  }
};

const retourListe = () => {
  router.push('/equipe');
  console.log('Retour à la liste');
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// Cleanup
onUnmounted(() => {
  if (recordingInterval.value) {
    clearInterval(recordingInterval.value);
  }
  if (audioURL.value) {
    URL.revokeObjectURL(audioURL.value);
  }

  // Nettoyer tous les éléments audio
  audioElements.value.forEach(audio => {
    audio.pause();
    audio.src = '';
  });
  audioElements.value.clear();

  // Nettoyer les URLs audio des mémos
  memosEnvoyes.value.forEach(memo => {
    if (memo.audioURL) {
      URL.revokeObjectURL(memo.audioURL);
    }
  });
});

// Lifecycle
onMounted(async () => {
  console.log('🚀 CreerMemo monté');
  console.log('📍 Route params:', route.params);

  await chargerEmployes();

});
</script>

<style scoped>
/* ============================================
   BARRE D'ENREGISTREMENT AUDIO - DESIGN MODERNE
   ============================================ */

.audio-recorder-container {
  flex: 1;
  display: flex;
  align-items: center;
}

.audio-recorder-bar {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

/* Mode enregistrement actif */
.recording-active {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border: 2px solid #ef4444;
  animation: pulse-border 2s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% {
    border-color: #ef4444;
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    border-color: #dc2626;
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
  }
}

.recorder-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pulse-animation {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-dot {
  width: 12px;
  height: 12px;
  background: #dc2626;
  border-radius: 50%;
  position: relative;
  z-index: 2;
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.pulse-ring {
  position: absolute;
  width: 24px;
  height: 24px;
  border: 2px solid #dc2626;
  border-radius: 50%;
  animation: pulse-ring 1.5s ease-out infinite;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.recorder-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recorder-label {
  font-size: 13px;
  font-weight: 600;
  color: #991b1b;
}

.recorder-time {
  font-size: 16px;
  font-weight: 700;
  color: #dc2626;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
}

.recorder-stop-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #dc2626;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

.recorder-stop-btn:hover {
  background: #b91c1c;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
}

.recorder-stop-btn:active {
  transform: scale(0.95);
}

.stop-icon {
  width: 20px;
  height: 20px;
  color: white;
}

/* Mode enregistrement terminé */
.recording-done {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border: 2px solid #3b82f6;
}

.recorder-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.audio-icon-wrapper {
  width: 40px;
  height: 40px;
  background: #3b82f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.audio-wave-icon {
  width: 20px;
  height: 20px;
  color: white;
}

.audio-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.audio-label {
  font-size: 13px;
  font-weight: 600;
  color: #1e40af;
}

.audio-duration {
  font-size: 14px;
  font-weight: 600;
  color: #3b82f6;
  font-variant-numeric: tabular-nums;
}

.recorder-delete-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #ef4444;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.2);
}

.recorder-delete-btn:hover {
  background: #dc2626;
  transform: scale(1.05);
  box-shadow: 0 3px 10px rgba(239, 68, 68, 0.3);
}

.recorder-delete-btn:active {
  transform: scale(0.95);
}

.delete-icon {
  width: 18px;
  height: 18px;
  color: white;
}

/* Responsive */
@media (max-width: 640px) {
  .recorder-label, .audio-label {
    font-size: 12px;
  }

  .recorder-time {
    font-size: 14px;
  }

  .audio-duration {
    font-size: 13px;
  }
}

/* ============================================
   LECTEUR AUDIO DANS LES MESSAGES
   ============================================ */

.audio-player-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 12px;
  border: 1px solid #bae6fd;
  margin-top: 8px;
}

.audio-play-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  position: relative;
  overflow: hidden;
}

.audio-play-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.audio-play-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.audio-play-btn:hover::before {
  opacity: 1;
}

.audio-play-btn:active {
  transform: scale(0.95);
}

.audio-play-btn.playing {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  animation: pulse-playing 2s ease-in-out infinite;
}

@keyframes pulse-playing {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
  50% {
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.5);
  }
}

.play-icon, .pause-icon {
  width: 20px;
  height: 20px;
  color: white;
}

.audio-player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.audio-waveform {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 24px;
}

.waveform-bar {
  flex: 1;
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 2px;
  transition: height 0.3s ease;
  min-width: 2px;
}

.audio-time-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.audio-current-time {
  font-weight: 600;
  color: #1e40af;
  font-variant-numeric: tabular-nums;
}

.audio-duration-text {
  font-weight: 500;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

.audio-download-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  background: white;
  border: 2px solid #bae6fd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.audio-download-btn:hover {
  background: #f0f9ff;
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.2);
}

.audio-download-btn:active {
  transform: translateY(0);
}

.download-icon {
  width: 18px;
  height: 18px;
  color: #3b82f6;
}

/* Responsive audio player */
@media (max-width: 640px) {
  .audio-player-container {
    padding: 10px;
    gap: 10px;
  }

  .audio-play-btn {
    width: 40px;
    height: 40px;
    min-width: 40px;
  }

  .play-icon, .pause-icon {
    width: 18px;
    height: 18px;
  }

  .audio-waveform {
    height: 20px;
  }

  .audio-time-info {
    font-size: 11px;
  }

  .audio-download-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
  }

  .download-icon {
    width: 16px;
    height: 16px;
  }
}
</style>