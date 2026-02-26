<template>
  <div class="memo-chat-container">
    <!-- En-tête -->
    <div class="chat-header">
      <button @click="$emit('back')" class="btn-retour">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="back-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>

      <div class="header-info">
        <div class="destinataire-info">
          <div class="destinataire-avatar">
            <slot name="header-avatar">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="avatar-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </slot>
          </div>
          <div class="destinataire-text">
            <h2 class="destinataire-nom">{{ headerTitle }}</h2>
            <p class="memo-type-label" v-if="headerSubtitle">{{ headerSubtitle }}</p>
            <p class="memo-info-label" v-if="headerInfo">{{ headerInfo }}</p>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <!-- Badge du statut (optionnel) -->
        <div v-if="statusBadge" class="statut-badge" :class="`statut-${statusBadge.value}`">
          <span class="statut-icon">{{ statusBadge.icon }}</span>
          <span class="statut-text">{{ statusBadge.label }}</span>
        </div>

        <!-- Bouton d'actions -->
        <button v-if="showHeaderAction" @click="$emit('toggle-panel')" class="btn-config">
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
        <!-- Loading -->
        <div v-if="loading" class="loading-message">
          <div class="spinner"></div>
          <p>{{ loadingText }}</p>
        </div>

        <!-- Message de bienvenue (mode création) -->
        <div v-else-if="showWelcome" class="welcome-message">
          <div class="welcome-icon">✏️</div>
          <h3 class="welcome-title">{{ welcomeTitle }}</h3>
          <p class="welcome-text">{{ welcomeText }}</p>
        </div>

        <!-- Liste des messages -->
        <div v-else class="messages-list">
          <div
              v-for="(message, index) in messages"
              :key="message.id || index"
              class="message-item"
              :class="[
              message.type === 'sent' ? 'sent' : message.type === 'received' ? 'received' : 'system',
              message.validationType ? `validation-${message.validationType}` : ''
            ]"
          >
            <!-- Avatar à gauche pour les messages reçus -->
            <div v-if="message.type === 'received'" class="message-avatar">
              <div class="avatar-placeholder employee">
                {{ message.senderInitials }}
              </div>
            </div>

            <div class="message-content">
              <div class="message-header-info">
                <span class="message-sender">{{ message.senderName }}</span>
                <span class="message-time">{{ message.timestamp }}</span>
              </div>

              <div class="message-bubble" :class="message.validationType ? `validation-${message.validationType}` : ''">
                <!-- En-tête pour les messages de validation -->
                <div v-if="message.validationType" class="validation-header">
                  <span class="validation-icon">{{ message.validationType === 'approved' ? '✅' : '❌' }}</span>
                  <span class="validation-title">{{ message.validationType === 'approved' ? 'Mémo approuvé' : 'Mémo rejeté' }}</span>
                </div>

                <!-- Titre (optionnel) -->
                <h4 v-if="message.title" class="message-titre">{{ message.title }}</h4>

                <!-- Contenu textuel -->
                <p v-if="message.content" class="message-text">{{ message.content }}</p>

                <!-- Fichiers attachés -->
                <div v-if="message.attachments && message.attachments.length > 0" class="attachments-preview">
                  <div v-for="(fichier, idx) in message.attachments" :key="idx" class="attachment-item">
                    <span class="attachment-icon">{{ getFileIcon(fichier) }}</span>
                    <span class="attachment-name">{{ getFileName(fichier) }}</span>

                    <!-- Preview pour les images -->
                    <div v-if="isImage(fichier)" class="image-preview-wrapper">
                      <slot name="image-preview" :fichier="fichier">
                        <img v-if="fichier.url" :src="fichier.url" alt="Preview" />
                      </slot>
                      <button @click="$emit('view-image', fichier)" class="btn-expand">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="expand-icon">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                        </svg>
                      </button>
                    </div>

                    <!-- Player pour l'audio -->
                    <div v-if="isAudio(fichier)" class="audio-player-container">
                      <button
                          @click="toggleAudioPlay(fichier.id || `${index}-${idx}`)"
                          class="audio-play-btn"
                          :class="{ 'playing': currentAudioId === (fichier.id || `${index}-${idx}`) && isAudioPlaying }"
                      >
                        <svg v-if="currentAudioId !== (fichier.id || `${index}-${idx}`) || !isAudioPlaying" fill="currentColor" viewBox="0 0 20 20" class="play-icon">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path>
                        </svg>
                        <svg v-else fill="currentColor" viewBox="0 0 20 20" class="pause-icon">
                          <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"></path>
                        </svg>
                      </button>

                      <div class="audio-player-info">
                        <div class="audio-waveform">
                          <div class="waveform-bar" v-for="i in 20" :key="i" :style="{ height: getWaveformHeight(i) }"></div>
                        </div>
                        <div class="audio-time-info">
                          <span class="audio-current-time">{{ currentAudioId === (fichier.id || `${index}-${idx}`) ? audioCurrentTime : '0:00' }}</span>
                          <span class="audio-duration-text">{{ fichier.duration || '0:00' }}</span>
                        </div>
                      </div>

                      <button
                          v-if="showAudioDownload"
                          @click="$emit('download-audio', fichier)"
                          class="audio-download-btn"
                          title="Télécharger"
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="download-icon">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Métadonnées (optionnel) -->
                <div v-if="message.metadata && message.metadata.length > 0" class="message-metadata">
                  <div v-for="(meta, idx) in message.metadata" :key="idx" class="meta-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="meta-icon">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="meta.iconPath"></path>
                    </svg>
                    <span>{{ meta.label }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Avatar à droite pour les messages envoyés -->
            <div v-if="message.type === 'sent'" class="message-avatar">
              <div class="avatar-placeholder manager">{{ message.senderInitials }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Slot pour panneau latéral (validation, configuration, etc.) -->
      <slot name="side-panel"></slot>
    </div>

    <!-- Zone de saisie -->
    <div v-if="showInput" class="input-area-wrapper">
      <!-- Zone des fichiers sélectionnés -->
      <div v-if="selectedFiles.length > 0" class="fichiers-selectionnes">
        <div v-for="(fichier, index) in selectedFiles" :key="index" class="fichier-item">
          <span class="fichier-icon">{{ getFileIconFromFile(fichier) }}</span>
          <span class="fichier-nom">{{ fichier.name }}</span>
          <button @click="removeFile(index)" class="btn-remove-fichier">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="remove-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Preview audio enregistré -->
      <div v-if="hasRecording" class="audio-preview">
        <div class="audio-player-container">
          <button
              @click="togglePreviewPlay"
              class="audio-play-btn"
              :class="{ 'playing': isPreviewPlaying }"
          >
            <svg v-if="!isPreviewPlaying" fill="currentColor" viewBox="0 0 20 20" class="play-icon">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path>
            </svg>
            <svg v-else fill="currentColor" viewBox="0 0 20 20" class="pause-icon">
              <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"></path>
            </svg>
          </button>

          <div class="audio-player-info">
            <div class="audio-waveform">
              <div class="waveform-bar" v-for="i in 20" :key="i" :style="{ height: getWaveformHeight(i) }"></div>
            </div>
            <div class="audio-time-info">
              <span class="audio-current-time">{{ previewCurrentTime }}</span>
              <span class="audio-duration-text">{{ recordedDuration }}</span>
            </div>
          </div>
        </div>

        <button @click="removeRecording" class="btn-remove-audio">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="trash-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>

      <!-- Zone de saisie principale -->
      <div class="input-area">
        <div class="input-actions-left">
          <!-- Bouton pièce jointe -->
          <button
              @click="$emit('trigger-file-input')"
              class="btn-action"
              :disabled="inputDisabled"
              title="Ajouter des fichiers"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="action-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
            </svg>
          </button>

          <!-- Bouton microphone -->
          <button
              @click="toggleRecording"
              class="btn-action btn-microphone"
              :class="{ 'recording': isRecording }"
              :disabled="inputDisabled"
              title="Enregistrer un message vocal"
          >
            <svg v-if="!isRecording" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="action-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
            </svg>
            <svg v-else fill="currentColor" viewBox="0 0 20 20" class="action-icon recording-icon">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd"></path>
            </svg>
          </button>

          <!-- Timer d'enregistrement -->
          <span v-if="isRecording" class="recording-timer">{{ recordingTime }}</span>
        </div>

        <!-- Champ de texte -->
        <textarea
            ref="textareaRef"
            :value="inputText"
            @input="updateInputText"
            @keydown.enter.exact.prevent="handleSend"
            :placeholder="inputPlaceholder"
            :disabled="inputDisabled || isRecording"
            class="input-text"
            rows="1"
        ></textarea>

        <!-- Bouton d'envoi -->
        <button
            @click="handleSend"
            :disabled="!canSend || inputDisabled"
            class="btn-send"
            :class="{ 'can-send': canSend }"
            title="Envoyer"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="send-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';

// Types
interface Message {
  id?: string;
  type: 'sent' | 'received' | 'system';
  senderName: string;
  senderInitials: string;
  timestamp: string;
  content?: string;
  title?: string;
  attachments?: Attachment[];
  metadata?: Metadata[];
  validationType?: 'approved' | 'rejected';
}

interface Attachment {
  id?: string;
  nom?: string;
  name?: string;
  type?: string;
  url?: string;
  duration?: string;
}

interface Metadata {
  iconPath: string;
  label: string;
}

interface StatusBadge {
  value: string;
  icon: string;
  label: string;
}

// Props
const props = withDefaults(defineProps<{
  // Header
  headerTitle: string;
  headerSubtitle?: string;
  /** Troisième ligne : titre du mémo avec temps reformaté (ex: "Retard - 19 min") */
  headerInfo?: string;
  statusBadge?: StatusBadge;
  showHeaderAction?: boolean;

  // Messages
  messages?: Message[];
  loading?: boolean;
  loadingText?: string;

  // Welcome (mode création)
  showWelcome?: boolean;
  welcomeTitle?: string;
  welcomeText?: string;

  // Input
  showInput?: boolean;
  inputText?: string;
  inputPlaceholder?: string;
  inputDisabled?: boolean;
  selectedFiles?: File[];

  // Recording
  isRecording?: boolean;
  recordingTime?: string;
  hasRecording?: boolean;
  recordedDuration?: string;
  isPreviewPlaying?: boolean;
  previewCurrentTime?: string;

  // Audio
  showAudioDownload?: boolean;
}>(), {
  messages: () => [],
  selectedFiles: () => [],
  loadingText: 'Chargement...',
  welcomeTitle: 'Nouveau mémo',
  welcomeText: 'Configurez votre mémo et commencez à écrire',
  inputPlaceholder: 'Écrivez votre message...',
  recordingTime: '00:00',
  recordedDuration: '00:00',
  previewCurrentTime: '0:00',
  showInput: true,
  showHeaderAction: true,
  showAudioDownload: false,
});

// Emits
const emit = defineEmits<{
  'back': [];
  'toggle-panel': [];
  'send': [];
  'update:inputText': [value: string];
  'trigger-file-input': [];
  'remove-file': [index: number];
  'toggle-recording': [];
  'remove-recording': [];
  'toggle-preview-play': [];
  'view-image': [fichier: Attachment];
  'download-audio': [fichier: Attachment];
  'toggle-audio-play': [audioId: string];
}>();

// Refs
const messagesContainer = ref<HTMLElement>();
const textareaRef = ref<HTMLTextAreaElement>();
const currentAudioId = ref<string | null>(null);
const isAudioPlaying = ref(false);
const audioCurrentTime = ref('0:00');

// Computed
const canSend = computed(() => {
  return props.inputText?.trim() || props.selectedFiles.length > 0 || props.hasRecording;
});

// Methods
const updateInputText = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit('update:inputText', target.value);

  // Auto-resize textarea
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto';
      textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px';
    }
  });
};

const handleSend = () => {
  if (canSend.value && !props.inputDisabled) {
    emit('send');
  }
};

const removeFile = (index: number) => {
  emit('remove-file', index);
};

const toggleRecording = () => {
  emit('toggle-recording');
};

const removeRecording = () => {
  emit('remove-recording');
};

const togglePreviewPlay = () => {
  emit('toggle-preview-play');
};

const toggleAudioPlay = (audioId: string) => {
  if (currentAudioId.value === audioId && isAudioPlaying.value) {
    isAudioPlaying.value = false;
    currentAudioId.value = null;
  } else {
    currentAudioId.value = audioId;
    isAudioPlaying.value = true;
  }
  emit('toggle-audio-play', audioId);
};

const getFileIcon = (fichier: Attachment): string => {
  const type = fichier.type?.toLowerCase();

  if (type === 'image' || type?.includes('image')) return '🖼️';
  if (type === 'audio' || type?.includes('audio')) return '🎵';
  if (type === 'pdf' || type?.includes('pdf')) return '📄';
  if (type?.includes('word') || type?.includes('doc')) return '📝';
  if (type?.includes('excel') || type?.includes('sheet')) return '📊';

  return '📎';
};

const getFileIconFromFile = (fichier: File): string => {
  const type = fichier.type.toLowerCase();

  if (type.includes('image')) return '🖼️';
  if (type.includes('audio')) return '🎵';
  if (type.includes('pdf')) return '📄';
  if (type.includes('word') || type.includes('doc')) return '📝';
  if (type.includes('excel') || type.includes('sheet')) return '📊';

  return '📎';
};

const getFileName = (fichier: Attachment): string => {
  return fichier.nom || fichier.name || 'Fichier';
};

const isImage = (fichier: Attachment): boolean => {
  const type = fichier.type?.toLowerCase();
  return type === 'image' || type?.includes('image') || false;
};

const isAudio = (fichier: Attachment): boolean => {
  const type = fichier.type?.toLowerCase();
  return type === 'audio' || type?.includes('audio') || false;
};

const getWaveformHeight = (index: number): string => {
  const heights = [8, 14, 10, 18, 12, 16, 9, 15, 11, 17, 13, 19, 10, 14, 8, 16, 12, 15, 11, 13];
  return `${heights[index % heights.length]}px`;
};

// Scroll to bottom when messages change
watch(() => props.messages.length, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
});

// Expose methods if needed
defineExpose({
  scrollToBottom: () => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  }
});
</script>

<style scoped>
/* ============================================================================
   RESET & BASE
   ============================================================================ */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ============================================================================
   CONTAINER PRINCIPAL
   ============================================================================ */
.memo-chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #e8eef3 0%, #f5f7fa 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

/* ============================================================================
   HEADER
   ============================================================================ */
.chat-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #004aad 0%, #0066cc 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 100;
  min-height: 80px;
  flex-shrink: 0;
}

.btn-retour {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease-out;
}

.btn-retour:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.back-icon {
  width: 24px;
  height: 24px;
  color: white;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.destinataire-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.destinataire-avatar {
  width: 48px;
  height: 48px;
  min-width: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.avatar-icon {
  width: 28px;
  height: 28px;
  color: white;
}

.destinataire-text {
  flex: 1;
  min-width: 0;
}

.destinataire-nom {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.memo-type-label {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.memo-info-label {
  margin: 3px 0 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: italic;
  letter-spacing: 0.01em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.statut-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.statut-badge.statut-pending,
.statut-badge.statut-submitted {
  background: #fff3cd;
  color: #856404;
}

.statut-badge.statut-approved {
  background: #d1e7dd;
  color: #0f5132;
}

.statut-badge.statut-rejected {
  background: #f8d7da;
  color: #842029;
}

.statut-icon {
  font-size: 16px;
  line-height: 1;
}

.statut-text {
  font-weight: 600;
}

.btn-config {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease-out;
}

.btn-config:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: rotate(90deg);
}

.config-icon {
  width: 24px;
  height: 24px;
  color: white;
}

/* ============================================================================
   CONTENT WRAPPER
   ============================================================================ */
.chat-content-wrapper {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

/* ============================================================================
   MESSAGES AREA
   ============================================================================ */
.messages-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.5rem;
  background: linear-gradient(135deg, #e8eef3 0%, #f5f7fa 100%);
}

.messages-area::-webkit-scrollbar {
  width: 8px;
}

.messages-area::-webkit-scrollbar-track {
  background: transparent;
}

.messages-area::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

/* ============================================================================
   LOADING STATE
   ============================================================================ */
.loading-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 1.5rem;
  min-height: 300px;
}

.loading-message .spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(0, 74, 173, 0.1);
  border-top-color: #004aad;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-message p {
  font-size: 16px;
  color: #6b7280;
  font-weight: 500;
  margin: 0;
}

/* ============================================================================
   WELCOME MESSAGE
   ============================================================================ */
.welcome-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 1rem;
  min-height: 300px;
}

.welcome-icon {
  font-size: 64px;
  line-height: 1;
}

.welcome-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.welcome-text {
  margin: 0;
  font-size: 16px;
  color: #6b7280;
  text-align: center;
}

/* ============================================================================
   MESSAGES LIST
   ============================================================================ */
.messages-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.message-item {
  display: flex;
  gap: 1rem;
  animation: messageSlideIn 0.3s ease-out;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-item.sent {
  flex-direction: row-reverse;
}

.message-item.received {
  flex-direction: row;
}

.message-item.system {
  justify-content: center;
}

/* ============================================================================
   AVATARS
   ============================================================================ */
.message-avatar {
  flex-shrink: 0;
}

.avatar-placeholder {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.avatar-placeholder.employee {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.avatar-placeholder.manager {
  background: linear-gradient(135deg, #004aad 0%, #0066cc 100%);
}

/* ============================================================================
   MESSAGE CONTENT
   ============================================================================ */
.message-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 65%;
  flex: 1;
  min-width: 0;
}

.message-item.sent .message-content {
  align-items: flex-end;
}

.message-item.received .message-content {
  align-items: flex-start;
}

.message-header-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  font-size: 12px;
}

.message-item.sent .message-header-info {
  flex-direction: row-reverse;
}

.message-sender {
  font-weight: 600;
  color: #6b7280;
}

.message-time {
  color: #9ca3af;
}

/* ============================================================================
   MESSAGE BUBBLE
   ============================================================================ */
.message-bubble {
  padding: 1rem 1.5rem;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.message-item.sent .message-bubble {
  background: linear-gradient(135deg, #004aad 0%, #0066cc 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-item.received .message-bubble {
  background: white;
  color: #1f2937;
  border-bottom-left-radius: 4px;
  border: 1px solid #e5e7eb;
}

.validation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 0.75rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  font-weight: 700;
}

.message-bubble.validation-approved {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.message-bubble.validation-rejected {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.validation-icon {
  font-size: 20px;
  line-height: 1;
}

.validation-title {
  font-size: 16px;
  font-weight: 700;
}

.message-titre {
  margin: 0 0 0.75rem 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

.message-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* ============================================================================
   ATTACHMENTS
   ============================================================================ */
.attachments-preview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.attachment-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item > span {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.attachment-icon {
  font-size: 20px;
  line-height: 1;
}

.attachment-name {
  font-weight: 500;
  word-break: break-word;
}

.image-preview-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
}

.image-preview-wrapper img {
  width: 100%;
  height: auto;
  display: block;
  max-height: 300px;
  object-fit: cover;
}

.btn-expand {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-out;
  opacity: 0;
}

.image-preview-wrapper:hover .btn-expand {
  opacity: 1;
}

.btn-expand:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
}

.expand-icon {
  width: 20px;
  height: 20px;
  color: white;
}

/* ============================================================================
   AUDIO PLAYER
   ============================================================================ */
.audio-player-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 74, 173, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(0, 74, 173, 0.1);
  margin-top: 0.5rem;
}

.audio-play-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #004aad 0%, #0066cc 100%);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-out;
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.25);
}

.audio-play-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 74, 173, 0.35);
}

.audio-play-btn.playing {
  background: linear-gradient(135deg, #0066cc 0%, #004aad 100%);
}

.play-icon,
.pause-icon {
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
  gap: 3px;
  height: 24px;
}

.waveform-bar {
  flex: 1;
  background: linear-gradient(135deg, #004aad 0%, #0066cc 100%);
  border-radius: 2px;
  transition: height 0.2s ease-out;
  min-width: 2px;
}

.audio-time-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.audio-current-time {
  color: #004aad;
  font-weight: 600;
}

.audio-download-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-out;
  color: #6b7280;
}

.audio-download-btn:hover {
  background: #004aad;
  border-color: #004aad;
  color: white;
  transform: scale(1.05);
}

.download-icon {
  width: 18px;
  height: 18px;
}

/* ============================================================================
   METADATA
   ============================================================================ */
.message-metadata {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.message-item.sent .message-metadata {
  border-top-color: rgba(255, 255, 255, 0.2);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  opacity: 0.9;
}

.meta-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* ============================================================================
   INPUT AREA
   ============================================================================ */
.input-area-wrapper {
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.fichiers-selectionnes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1rem 1.5rem 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.fichier-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 1rem;
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  font-size: 14px;
  transition: all 0.2s ease-out;
}

.fichier-item:hover {
  border-color: #004aad;
  background: rgba(0, 74, 173, 0.05);
}

.fichier-icon {
  font-size: 18px;
  line-height: 1;
}

.fichier-nom {
  font-weight: 500;
  color: #1f2937;
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-remove-fichier {
  width: 20px;
  height: 20px;
  min-width: 20px;
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

.btn-remove-fichier:hover {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.remove-icon {
  width: 14px;
  height: 14px;
}

.audio-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f8f9fa;
}

.btn-remove-audio {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-out;
  color: #6b7280;
}

.btn-remove-audio:hover {
  background: #dc3545;
  border-color: #dc3545;
  color: white;
  transform: scale(1.05);
}

.trash-icon {
  width: 20px;
  height: 20px;
}

.input-area {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
}

.input-actions-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-action {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  background: #f3f4f6;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-out;
  color: #6b7280;
}

.btn-action:hover:not(:disabled) {
  background: #004aad;
  color: white;
  transform: scale(1.05);
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-microphone.recording {
  background: #dc3545;
  color: white;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.action-icon {
  width: 20px;
  height: 20px;
}

.recording-icon {
  animation: none;
}

.recording-timer {
  font-size: 14px;
  font-weight: 600;
  color: #dc3545;
  font-variant-numeric: tabular-nums;
  min-width: 50px;
}

.input-text {
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: 10px 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 20px;
  font-size: 15px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: all 0.2s ease-out;
  overflow-y: auto;
}

.input-text:focus {
  border-color: #004aad;
}

.input-text:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.input-text::placeholder {
  color: #9ca3af;
}

.btn-send {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: #e5e7eb;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-out;
  color: #9ca3af;
}

.btn-send.can-send {
  background: linear-gradient(135deg, #004aad 0%, #0066cc 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.25);
}

.btn-send.can-send:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 74, 173, 0.35);
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-icon {
  width: 22px;
  height: 22px;
}

/* ============================================================================
   RESPONSIVE
   ============================================================================ */
@media (max-width: 768px) {
  .chat-header {
    padding: 0.5rem 1rem;
    min-height: 64px;
  }

  .destinataire-avatar {
    width: 40px;
    height: 40px;
    min-width: 40px;
  }

  .destinataire-nom {
    font-size: 16px;
  }

  .message-content {
    max-width: 80%;
  }

  .input-area {
    padding: 0.75rem 1rem;
  }

  .btn-action {
    width: 36px;
    height: 36px;
    min-width: 36px;
  }

  .btn-send {
    width: 40px;
    height: 40px;
    min-width: 40px;
  }
}

@media (max-width: 480px) {
  .message-content {
    max-width: 85%;
  }

  .avatar-placeholder {
    width: 36px;
    height: 36px;
    min-width: 36px;
    font-size: 12px;
  }
}
</style>