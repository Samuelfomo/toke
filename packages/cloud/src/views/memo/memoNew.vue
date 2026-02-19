<template>
  <MemoChat
      :header-title="headerTitle"
      :header-subtitle="headerSubtitle"
      :show-welcome="!memoEnvoye"
      welcome-title="Nouveau mémo"
      welcome-text="Configurez votre mémo et commencez à écrire"
      :messages="messagesFormatted"
      :input-text="formulaire.contenu"
      :selected-files="fichiers"
      :is-recording="isRecording"
      :recording-time="recordingTime"
      :has-recording="!!audioBlob"
      :recorded-duration="recordedDuration"
      @update:input-text="formulaire.contenu = $event"
      @back="$router.back()"
      @send="soumettreMemo"
      @trigger-file-input="triggerFileInput"
      @toggle-recording="toggleRecording"
      @remove-file="removeFile"
      @remove-recording="deleteRecording"
      @toggle-panel="showConfigPanel = !showConfigPanel"
      @toggle-audio-play="toggleAudioPlay"
      @download-audio="downloadAudioFromMessage"
  >
    <!-- Avatar personnalisé dans l'en-tête -->
    <template #header-avatar>
      <svg v-if="typeDestinataire === 'general'" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="avatar-icon">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
      </svg>
      <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24" class="avatar-icon">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
      </svg>
    </template>

    <!-- Panneau de configuration -->
    <template #side-panel>
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
                <div v-if="typeDestinataire === 'individuel'" class="form-group">
                  <select
                      v-model="formulaire.destinataireId"
                      class="form-select"
                      required
                  >
                    <option value="" disabled>Choisir un employé</option>
                    <option v-for="employe in employes" :key="employe.guid" :value="employe.guid">
                      {{ employe.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Type de mémo -->
            <div class="config-section">
              <h4 class="config-section-title">Type de mémo</h4>
              <select v-model="formulaire.type" class="form-select">
                <option disabled value="">Sélectionner un type</option>
                <option
                    v-for="opt in memoTypeOptions"
                    :key="opt.value"
                    :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Titre du mémo - Affiché uniquement si type = "autres" -->
            <div v-if="formulaire.type === MEMO_TYPE_OTHER" class="config-section">
              <h4 class="config-section-title">Titre du mémo *</h4>
              <input
                  v-model="formulaire.titre"
                  type="text"
                  placeholder="Entrez le titre du mémo..."
                  :class="{ 'input-error': formulaire.type === 'other' && !formulaire.titre.trim() }"
                  required
              />
            </div>

            <!-- Bouton Terminé -->
            <div class="config-section">
              <button
                  @click="terminerConfiguration"
                  :disabled="!configurationComplete"
                  class="btn-terminer"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="check-icon-btn">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Terminé
              </button>
            </div>
          </div>
        </div>
      </transition>
    </template>
  </MemoChat>

  <!-- Input file caché -->
  <input
      ref="fileInput"
      type="file"
      multiple
      accept=".txt,.pdf,.jpg,.jpeg,.png,.mp3,.wav,.webm,.ogg"
      @change="ajouterFichiers"
      style="display: none"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { TeamEmployee, useTeamStore } from '@/stores/teamStore';
import MemoService, { CreateMemo, UploadedAttachment } from '@/service/MemoService';
import MemoChat from '../memo/memoChat.vue';
import "../../assets/css/toke-memo-08.css";
import { useMemoStore } from '@/stores/memoStore';

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
  isAutresType: boolean;
}

// Route et Store
const route = useRoute();
const userStore = useUserStore();
const teamStore = useTeamStore();
const memoStore = useMemoStore();

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
const configurationTerminee = ref(false);

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

const triggerFileInput = () => {
  fileInput.value?.click();
};

// Computed
const userInitials = computed(() => userStore.userInitials || '?');

const employeSelectionne = computed(() => {
  if (employePreselectionne.value) {
    return employePreselectionne.value;
  }
  return employes.value.find(e => e.id === formulaire.value.destinataireId);
});

const headerTitle = computed(() => {
  if (typeDestinataire.value === 'general') return 'Tous les employés';
  if (employeSelectionne.value) return employeSelectionne.value.name;
  return 'Sélectionner un employé';
});

const headerSubtitle = computed(() => {
  return getMemoTitle(formulaire.value.type) || 'Sélectionner un type';
});

const memoTitles = {
  delay_justification: 'Justification de retard',
  absence_justification: "Justification d'absence",
  other: 'Autres',
} as const;

const getMemoTitle = (type: string): string => {
  return memoTitles[type as keyof typeof memoTitles] ?? '';
};

const memoTypeOptions = computed(() =>
    Object.entries(memoTitles).map(([type, titre]) => ({
      value: type,
      label: titre,
    }))
);

const MEMO_TYPE_OTHER = 'other' as const;

const configurationComplete = computed(() => {
  const aDestinataire =
      typeDestinataire.value === 'general' ||
      !!formulaire.value.destinataireId;

  const aType = !!formulaire.value.type;

  if (formulaire.value.type === MEMO_TYPE_OTHER) {
    const aTitre = !!formulaire.value.titre.trim();
    return aDestinataire && aType && aTitre;
  }

  return aDestinataire && aType;
});

const peutEnvoyer = computed(() => {
  if (!configurationTerminee.value) return false;

  const aContenu = formulaire.value.contenu.trim();
  const aAudio = audioBlob.value !== null;

  return aContenu || aAudio;
});

const isEmployePreselectionne = computed(() => {
  return !!employePreselectionne.value;
});

// Messages formatés pour MemoChat
const messagesFormatted = computed(() => {
  return memosEnvoyes.value.map((memo, index) => ({
    id: `memo-${index}`,
    type: 'sent' as const,
    senderName: 'Manager',
    senderInitials: userInitials.value,
    timestamp: memo.timestamp,
    content: memo.contenu,
    attachments: memo.fichiers.map(f => ({
      id: `file-${index}-${f.name}`,
      name: f.name,
      type: getFileType(f),
      url: memo.audioURL || '',
      duration: memo.duration
    }))
  }));
});

// Méthodes
const getFileType = (file: File): string => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type === 'application/pdf') return 'pdf';
  return 'text';
};

const chargerEmployes = async () => {
  try {
    await teamStore.loadTeam(userStore.user?.guid!);
  } catch (error) {
    console.error('❌ Erreur chargement employés:', error);
  }
};

const terminerConfiguration = () => {
  if (!configurationComplete.value) return;

  if (formulaire.value.type !== MEMO_TYPE_OTHER) {
    formulaire.value.titre = getMemoTitle(formulaire.value.type);
  }

  configurationTerminee.value = true;
  showConfigPanel.value = false;
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

  if (target) {
    target.value = '';
  }
};

const removeFile = (index: number) => {
  fichiers.value.splice(index, 1);
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

// Lecture audio
const toggleAudioPlay = (audioId: string) => {
  const index = parseInt(audioId.split('-')[1]);
  const memo = memosEnvoyes.value[index];
  if (!memo.audioURL) return;

  if (currentPlayingIndex.value !== null && currentPlayingIndex.value !== index) {
    const oldAudio = audioElements.value.get(currentPlayingIndex.value);
    if (oldAudio) {
      oldAudio.pause();
      oldAudio.currentTime = 0;
    }
  }

  let audio = audioElements.value.get(index);
  if (!audio) {
    audio = new Audio(memo.audioURL);
    audioElements.value.set(index, audio);

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

  if (currentPlayingIndex.value === index && isPlaying.value) {
    audio.pause();
    isPlaying.value = false;
  } else {
    audio.play();
    isPlaying.value = true;
    currentPlayingIndex.value = index;
  }
};

const downloadAudioFromMessage = (fichier: any) => {
  const a = document.createElement('a');
  a.href = fichier.url;
  a.download = fichier.name || 'audio.webm';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const soumettreMemo = async () => {
  if (!peutEnvoyer || isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    let uploadedFiles: UploadedAttachment[] = [];
    if (fichiers.value.length > 0) {
      uploadedFiles = await MemoService.uploadMultipleFiles(fichiers.value);
    }

    if (audioBlob.value) {
      const audioFile = await MemoService.uploadAudioBlob(audioBlob.value);
      uploadedFiles.push(audioFile);
    }

    const messageContent = MemoService.buildMessageContent(
        formulaire.value.contenu,
        uploadedFiles
    );

    const memoPayload: CreateMemo = {
      user_author: userStore.user?.guid || '',
      target_user: formulaire.value.destinataireId,
      type: formulaire.value.type,
      title: formulaire.value.titre,
      message: messageContent
    };

    const response = await MemoService.createMemo(memoPayload);

    if (!response.success) {
      throw new Error(response.error?.message || 'Erreur lors de la création');
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const audioURLToSave = audioBlob.value ? URL.createObjectURL(audioBlob.value) : null;

    memosEnvoyes.value.push({
      titre: formulaire.value.titre,
      contenu: formulaire.value.contenu,
      fichiers: [...fichiers.value],
      audioBlob: audioBlob.value,
      audioURL: audioURLToSave,
      duration: recordedDuration.value,
      timestamp: timeString,
      isAutresType: formulaire.value.type === MEMO_TYPE_OTHER
    });

    formulaire.value.contenu = '';
    fichiers.value = [];
    audioBlob.value = null;
    recordedDuration.value = '00:00';
    if (audioURL.value) {
      URL.revokeObjectURL(audioURL.value);
      audioURL.value = '';
    }

    await memoStore.refreshMemo(userStore.user?.guid!, response.data.guid);

    // setTimeout(() => {
    //   router.push('/memoList');
    // }, 2000);

  } catch (error: any) {
    console.error('❌ Erreur création mémo:', error);
    alert(error.message || 'Erreur lors de la création du mémo');
  } finally {
    isSubmitting.value = false;
  }
};

// Watch
watch(() => formulaire.value.type, (newType) => {
  if (newType !== MEMO_TYPE_OTHER) {
    formulaire.value.titre = '';
  }
  configurationTerminee.value = false;
});

// Cleanup
onUnmounted(() => {
  if (recordingInterval.value) {
    clearInterval(recordingInterval.value);
  }
  if (audioURL.value) {
    URL.revokeObjectURL(audioURL.value);
  }

  audioElements.value.forEach(audio => {
    audio.pause();
    audio.src = '';
  });
  audioElements.value.clear();

  memosEnvoyes.value.forEach(memo => {
    if (memo.audioURL) {
      URL.revokeObjectURL(memo.audioURL);
    }
  });
});

// Lifecycle
onMounted(async () => {
  await chargerEmployes();

  // Pré-remplir l'employé si on arrive depuis la fiche de pointage
  const employeeGuid = route.query.employeeGuid as string | undefined
  const employeeName = route.query.employeeName as string | undefined

  if (employeeGuid && employeeName) {
    // Chercher l'employé complet dans le store (chargé par chargerEmployes)
    const employe = employes.value.find(e => e.id === employeeGuid || e.guid === employeeGuid)

    if (employe) {
      // Employé trouvé dans le store — utiliser l'objet complet
      employePreselectionne.value = employe
    } else {
      // Fallback : construire un objet minimal avec les infos de la query
      employePreselectionne.value = {
        id: employeeGuid,
        guid: employeeGuid,
        name: employeeName,
      } as any
    }

    // Pré-remplir le destinataireId pour que configurationComplete fonctionne
    formulaire.value.destinataireId = employeeGuid
  }
});
</script>

<style scoped>
/* Vos styles CSS personnalisés du panneau de configuration */
.config-panel {
  width: 320px;
  max-width: 320px;
  background: white;
  border-left: 1px solid #e5e7eb;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 20;
  overflow-y: auto;
  flex-shrink: 0;
}

.config-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f8f9fa;
  flex-shrink: 0;
}

.config-panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.btn-close-panel {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 50%;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-out;
  color: #6b7280;
}

.btn-close-panel:hover {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  transform: rotate(90deg);
}

.close-icon {
  width: 20px;
  height: 20px;
}

.config-panel-content {
  flex: 1;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.config-section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease-out;
}

.form-select:focus {
  outline: none;
  border-color: #004aad;
}

.form-select:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.btn-terminer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #004aad 0%, #0066cc 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease-out;
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.25);
}

.btn-terminer:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 74, 173, 0.35);
}

.btn-terminer:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.check-icon-btn {
  width: 20px;
  height: 20px;
}

.employe-preselectionne {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.employe-info-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 74, 173, 0.05);
  border: 2px solid #004aad;
  border-radius: 8px;
}

.employe-avatar-small {
  width: 40px;
  height: 40px;
  min-width: 40px;
  background: rgba(0, 74, 173, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon-small {
  width: 24px;
  height: 24px;
  color: #004aad;
}

.employe-text {
  flex: 1;
}

.employe-nom-selected {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.employe-label {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #6b7280;
}

.check-icon {
  width: 24px;
  height: 24px;
  color: #10b981;
  flex-shrink: 0;
}

.employe-note {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
}

input[type="text"] {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  transition: all 0.2s ease-out;
}

input[type="text"]:focus {
  outline: none;
  border-color: #004aad;
}

input.input-error {
  border-color: #dc3545;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease-out;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(100%);
}
</style>