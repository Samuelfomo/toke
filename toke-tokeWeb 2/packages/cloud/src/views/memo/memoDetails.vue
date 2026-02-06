<template>
  <div class="detail-memo-chat">
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
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="avatar-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <div class="destinataire-text">
            <h2 class="destinataire-nom">{{ memo?.createurNom || 'Employé' }}</h2>
            <p class="memo-type-label">{{ getTypeLabel(memo?.type || '') }}</p>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <!-- Badge du statut -->
        <div class="statut-badge" :class="`statut-${memo?.statut}`">
          <span class="statut-icon">{{ getStatutIcon(memo?.statut || '') }}</span>
          <span class="statut-text">{{ getStatutLabel(memo?.statut || '') }}</span>
        </div>

        <!-- Bouton paramètres -->
        <button
          v-if="peutValider"
          @click="showValidationPanel = !showValidationPanel"
          class="btn-config"
        >
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
        <div v-if="isLoading" class="loading-message">
          <div class="spinner"></div>
          <p>Chargement du mémo...</p>
        </div>

        <!-- Messages du mémo -->
        <div v-else-if="memo" class="messages-list">
          <!-- Afficher tous les messages de la conversation -->
          <div
            v-for="(message, msgIndex) in conversationMessages"
            :key="msgIndex"
            class="message-item"
            :class="message.isFromManager ? 'sent' : 'received'"
          >
            <!-- Avatar à gauche pour les messages reçus -->
            <div v-if="!message.isFromManager" class="message-avatar">
              <div class="avatar-placeholder employee">
                {{ getInitials(memo.createurNom) }}
              </div>
            </div>

            <div class="message-content">
              <div class="message-header-info">
                <span class="message-sender">{{ message.isFromManager ? 'Manager' : memo.createurNom }}</span>
                <span class="message-time">{{ formatDate(message.dateEnvoi) }}</span>
              </div>
              <div class="message-bubble" :class="message.type === 'validation' ? `validation-${memo.statut}` : ''">

                <!-- En-tête pour les messages de validation -->
                <div v-if="message.type === 'validation'" class="validation-header">
                  <span class="validation-icon">{{ memo.statut === 'approved' ? '✅' : '❌' }}</span>
                  <span class="validation-title">{{ memo.statut === 'approved' ? 'Mémo approuvé' : 'Mémo rejeté' }}</span>
                </div>

                <!-- Titre uniquement pour le premier message -->
                <h4 v-if="msgIndex === 0" class="message-titre">{{ memo.titre }}</h4>

                <!-- Contenu textuel -->
                <p v-if="message.contenu" class="message-text">{{ message.contenu }}</p>

                <!-- Fichiers attachés -->
                <div v-if="message.fichiers && message.fichiers.length > 0" class="attachments-preview">
                  <div v-for="(fichier, idx) in message.fichiers" :key="idx" class="attachment-item">
                    <span class="attachment-icon">{{ getFileIcon(fichier.type) }}</span>
                    <span class="attachment-name">{{ fichier.nom }}</span>

                    <!-- Preview pour les images -->
                    <div v-if="fichier.type === 'image'" class="image-preview-wrapper">
                      <AuthenticatedMedia :url="fichier.url" />
                      <button @click="voirImage(fichier.url)" class="btn-expand">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="expand-icon">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                        </svg>
                      </button>
                    </div>

                    <!-- Player pour l'audio -->
                    <div v-if="fichier.type === 'audio'" class="audio-player-container">
                      <button
                        @click="toggleAudioPlay(fichier.id)"
                        class="audio-play-btn"
                        :class="{ 'playing': currentPlayingIndex === fichier.id && isPlaying }"
                      >
                        <svg v-if="currentPlayingIndex !== fichier.id || !isPlaying" fill="currentColor" viewBox="0 0 20 20" class="play-icon">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path>
                        </svg>
                        <svg v-else fill="currentColor" viewBox="0 0 20 20" class="pause-icon">
                          <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"></path>
                        </svg>
                      </button>

                      <div class="audio-player-info">
                        <div class="audio-waveform">
                          <div class="waveform-bar" v-for="i in 20" :key="i"
                               :style="{ height: getWaveformHeight(i, currentPlayingIndex === fichier.id && isPlaying) }">
                          </div>
                        </div>
                        <div class="audio-time-info">
                          <span class="audio-current-time">{{ currentPlayingIndex === fichier.id && isPlaying ? currentAudioTime : '0:00' }}</span>
                          <span class="audio-duration-text">
                            {{ getFormattedDuration(fichier.id) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Métadonnées uniquement pour le premier message -->

<!--                  <div class="meta-item">-->
<!--                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="meta-icon">-->
<!--                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>-->
<!--                    </svg>-->
<!--&lt;!&ndash;                    <span>Créé le {{ formatDateShort(memo.dateCreation) }}</span>&ndash;&gt;-->
<!--                  </div>-->
                  <div v-if="memo.dateIncident" class="meta-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="meta-icon">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Incident: {{ formatDateShort(memo.dateIncident) }}</span>
                  </div>
              </div>
            </div>

            <!-- Avatar à droite pour les messages envoyés -->
            <div v-if="message.isFromManager" class="message-avatar">
              <div class="avatar-placeholder manager">{{ userInitials }}</div>
            </div>
          </div>

          <!-- Réponses envoyées localement (en attente de soumission réelle) -->
          <div v-for="(reponse, index) in reponsesEnvoyees" :key="`local-${index}`" class="message-item sent">
            <div class="message-content">
              <div class="message-header-info">
                <span class="message-time">{{ reponse.timestamp }}</span>
              </div>
              <div class="message-bubble">
                <p v-if="reponse.contenu" class="message-text">{{ reponse.contenu }}</p>

                <!-- Fichiers de la réponse -->
                <div v-if="reponse.fichiers && reponse.fichiers.length > 0" class="attachments-preview">
                  <div v-for="(fichier, idx) in reponse.fichiers" :key="idx" class="attachment-item">
                    <span class="attachment-icon">{{ getFileIconFromFile(fichier) }}</span>
                    <span class="attachment-name">{{ fichier.name }}</span>
                  </div>
                </div>

                <!-- Audio de la réponse -->
                <div v-if="reponse.audioURL" class="audio-player-container">
                  <button
                    @click="toggleReponseAudioPlay(`reponse-${index}`)"
                    class="audio-play-btn"
                    :class="{ 'playing': currentPlayingReponseId === `reponse-${index}` && isPlayingReponse }"
                  >
                    <svg v-if="currentPlayingReponseId !== `reponse-${index}` || !isPlayingReponse" fill="currentColor" viewBox="0 0 20 20" class="play-icon">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path>
                    </svg>
                    <svg v-else fill="currentColor" viewBox="0 0 20 20" class="pause-icon">
                      <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"></path>
                    </svg>
                  </button>

                  <div class="audio-player-info">
                    <div class="audio-waveform">
                      <div class="waveform-bar" v-for="i in 20" :key="i"
                           :style="{ height: getWaveformHeight(i, currentPlayingReponseId === `reponse-${index}` && isPlayingReponse) }">
                      </div>
                    </div>
                    <div class="audio-time-info">
                      <span class="audio-current-time">{{ currentPlayingReponseId === `reponse-${index}` ? currentReponseAudioTime : '0:00' }}</span>
                      <span class="audio-duration-text">{{ reponse.duration }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="message-avatar">
              <div class="avatar-placeholder manager">{{ userInitials }}</div>
            </div>
          </div>

          <!-- Message d'attente de validation -->
          <div v-if="peutValider && conversationMessages.length === 1" class="message-item system">
            <div class="system-message">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="system-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>En attente de votre validation</span>
            </div>
          </div>
        </div>

        <!-- État d'erreur -->
        <div v-else class="error-message">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="error-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p>{{ errorMessage || 'Mémo introuvable' }}</p>
        </div>
      </div>

      <!-- Panneau de validation -->
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

            <!-- Actions de validation -->
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
    </div>

    <!-- Zone de saisie de réponse (si le manager peut valider) -->
    <div v-if="peutValider" class="chat-input-area">
      <div class="input-wrapper">
        <!-- Input fichier caché -->
        <input
          type="file"
          ref="fileInput"
          @change="ajouterFichiers"
          multiple
          accept=".txt,.pdf,.jpg,.jpeg,.png,.mp3,.wav,.webm,.ogg"
          class="file-input"
          id="file-upload-input-reponse"
        />

        <!-- Bouton fichier -->
        <label for="file-upload-input-reponse" class="action-button" title="Ajouter des fichiers">
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
          v-model="reponseContenu"
          @keydown.enter.ctrl="envoyerReponse"
          placeholder="Écrire une réponse..."
          class="memo-input"
          rows="3"
          ref="reponseInput"
        ></textarea>

        <!-- Bouton envoyer -->
        <button
          @click="envoyerReponse"
          :disabled="!peutEnvoyerReponse || isSubmitting"
          class="send-button"
        >
          <svg v-if="!isSubmitting" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="send-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
          <div v-else class="spinner-small"></div>
        </button>
      </div>

      <!-- Liste des fichiers ajoutés -->
      <div v-if="fichiers.length > 0" class="fichiers-liste">
        <div v-for="(fichier, idx) in fichiers" :key="idx" class="fichier-item">
          <span class="fichier-icon">{{ getFileIconFromFile(fichier) }}</span>
          <span class="fichier-nom">{{ fichier.name }}</span>
          <button @click="supprimerFichier(idx)" class="btn-remove-fichier">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="remove-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal pour voir les images -->
    <div v-if="imageModalUrl" class="image-modal" @click="fermerImageModal">
      <div class="modal-content" @click.stop>
        <button class="btn-close-modal" @click="fermerImageModal">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="close-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        <AuthenticatedMedia :url="imageModalUrl" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import HeadBuilder from '@/utils/HeadBuilder';
import router from '@/router';
import AuthenticatedMedia from '../../views/memo/AuthenticatedMedia.vue';
import memoDetailChatCss from "../../assets/css/toke-memoDetails-19.css?url";
import { useMemoStore, type Memo, type MemoContent } from '@/stores/memoStore';
import MemoService, {
  MessageContent,
} from '@/service/MemoService';

// Interfaces
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

// Route et Store
const route = useRoute();
const memoId = computed(() => route.params.guid as string);
const userStore = useUserStore();
const memoStore = useMemoStore();
const managerGuid = computed(() => userStore.user?.guid || '');

// État
const memo = ref<Memo | null>(null);
const isLoading = ref(true);
const isProcessing = ref(false);
const actionType = ref<'approve' | 'reject' | null>(null);
const imageModalUrl = ref<string | null>(null);
const errorMessage = ref<string>('');
const messagesContainer = ref<HTMLElement | null>(null);
const showValidationPanel = ref(false);

// Réponse
const reponseContenu = ref('');
const fichiers = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const reponseInput = ref<HTMLTextAreaElement | null>(null);
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

// Lecture audio des fichiers du mémo
const currentPlayingIndex = ref<string | null>(null);
const isPlaying = ref(false);
const currentAudioTime = ref('0:00');
const audioElements = ref<Map<string, HTMLAudioElement>>(new Map());

// Lecture audio des réponses
const currentPlayingReponseId = ref<string | null>(null);
const isPlayingReponse = ref(false);
const currentReponseAudioTime = ref('0:00');
const reponseAudioElements = ref<Map<string, HTMLAudioElement>>(new Map());
const audioDurations = reactive<Record<string, number>>({});
const audioUpdateTrigger = ref(0);

const isUploadingFiles = ref(false);
const uploadProgress = ref<{ current: number; total: number } | null>(null);



// Computed
const userInitials = computed(() => userStore.userInitials || '?');

const peutValider = computed(() => {
  return memo.value && (memo.value.statut === 'pending' || memo.value.statut === 'submitted');
});

const peutEnvoyerReponse = computed(() => {
  const aContenu = reponseContenu.value.trim();
  const aAudio = audioBlob.value !== null;
  const aFichiers = fichiers.value.length > 0;

  return aContenu || aAudio || aFichiers;
});

// Computed pour extraire tous les messages de la conversation dans l'ordre chronologique
const conversationMessages = computed((): ConversationMessage[] => {
  if (!memo.value || !memo.value.memoContent) return [];

  const messages: ConversationMessage[] = [];

  // Parcourir tous les MemoContent
  memo.value.memoContent.forEach((content, index) => {
    // Un message provient du manager si l'auteur (user) est le destinataire du mémo (le manager)
    // OU si le type est 'validation' (seul le manager peut valider)
    const isFromManager = content.user === memo.value!.destinataireId ||
      content.type === 'validation';

    // Extraire le contenu textuel
    const textMessages = content.message
      .filter(msg => msg.type === 'text')
      .map(msg => msg.content)
      .join('\n');

    // Extraire les fichiers
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
      isFromManager: isFromManager,
      type: content.type as 'initial' | 'response' | 'validation'
    });
  });

  // Trier par date
  return messages.sort((a, b) => a.dateEnvoi.getTime() - b.dateEnvoi.getTime());
});

// Fonctions utilitaires
const getInitials = (nom: string): string => {
  const parts = nom.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nom.substring(0, 2).toUpperCase();
};

// 1. Fonction de détection de type de fichier (à remplacer)
const detectFileType = (url: string): 'image' | 'audio' | 'pdf' | 'text' => {
  const lowerUrl = url.toLowerCase();
  console.log('🔍 Détection du type de fichier pour:', url);

  // IMPORTANT: Accepter les URLs avec ou sans paramètres
  if (lowerUrl.match(/\.(m4a|mp3|wav|ogg|webm|aac|flac|mpeg)(\?.*)?$/i)) {
    console.log('✅ Type détecté: audio');
    return 'audio';
  }
  if (lowerUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i)) {
    console.log('✅ Type détecté: image');
    return 'image';
  }
  if (lowerUrl.match(/\.pdf(\?.*)?$/i)) {
    console.log('✅ Type détecté: pdf');
    return 'pdf';
  }

  console.log('⚠️ Type détecté: text (par défaut)');
  return 'text';
};

const extractFileName = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = pathname.split('/').pop() || 'Fichier';
    return decodeURIComponent(fileName);
  } catch {
    return 'Fichier';
  }
};

const extractAttachedFiles = (memoContent: MemoContent[]): AttachedFile[] => {
  if (!memoContent || memoContent.length === 0) return [];

  const files: AttachedFile[] = [];

  memoContent.forEach(content => {
    content.message.forEach((msg, index) => {
      if (msg.type === 'image' || msg.type === 'audio' || msg.type === 'file') {
        files.push({
          id: `${content.created_at}-${index}`,
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
            id: `${content.created_at}-${index}`,
            nom: extractFileName(msg.content),
            type: fileType,
            url: msg.content,
            dateAjout: new Date(content.created_at)
          });
        }
      }
    });
  });

  return files;
};

const extractMemoContent = (memoContent: MemoContent[]): string => {
  if (!memoContent || memoContent.length === 0) return '';

  const contenuParts: string[] = [];

  memoContent.forEach(content => {
    const messages: string[] = [];

    content.message.forEach(msg => {
      if (msg.type === 'text') {
        messages.push(msg.content);
      }
    });

    if (messages.length > 0) {
      contenuParts.push(messages.join('\n'));
    }
  });

  return contenuParts.join('\n\n') || 'Aucun contenu textuel';
};

const chargerMemo = async () => {
  if (!memoId.value || !managerGuid.value) {
    errorMessage.value = 'Données manquantes';
    isLoading.value = false;
    return;
  }

  isLoading.value = true;

  try {
    // 1. Charger tous les mémos si le cache n'est pas valide
    if (!memoStore.isCacheValid) {
      await memoStore.loadMemos(managerGuid.value);
    }

    // 2. Récupérer le mémo du store
    const memoFromStore = memoStore.getMemoByGuid(memoId.value);

    if (memoFromStore) {
      // Transformer le mémo du store vers le format attendu par le template
      memo.value = memoFromStore;

      scrollToBottom();
    } else {
      // Si non trouvé dans le cache, forcer un refresh
      const refreshedMemo = await memoStore.refreshMemo(managerGuid.value, memoId.value);

      if (refreshedMemo) {
        memo.value =refreshedMemo;
        scrollToBottom();
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

const getTypeLabel = (type: string): string => {
  const labels: { [key: string]: string } = {
    late_justification: 'Justification de retard',
    absence_justification: 'Justification d\'absence',
    correction_request: 'Demande de correction',
    session_closure: 'Clôture de session',
    auto_memo: 'Mémo automatique',
    other: 'Autres'
  };
  return labels[type] || type;
};

const getStatutLabel = (statut: string): string => {
  const labels: { [key: string]: string } = {
    pending: 'En attente',
    submitted: 'Soumis',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    draft: 'Brouillon'
  };
  return labels[statut] || statut;
};

const getStatutIcon = (statut: string): string => {
  const icons: { [key: string]: string } = {
    pending: '⏳',
    submitted: '📤',
    approved: '✅',
    rejected: '❌',
    draft: '📝'
  };
  return icons[statut] || '📋';
};

const getFileIcon = (type: string): string => {
  const icons: { [key: string]: string } = {
    image: '',
    pdf: '📄',
    audio: '🎵',
    text: '📝'
  };
  return icons[type] || '';
};

const getFileIconFromFile = (file: File): string => {
  if (file.type.startsWith('image/')) return '🖼️';
  if (file.type === 'application/pdf') return '📄';
  if (file.type.startsWith('audio/')) return '🎵';
  if (file.type.startsWith('text/')) return '📝';
  return '📎';
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateShort = (date: Date): string => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const voirImage = (url: string) => {
  imageModalUrl.value = url;
};

// Fonction pour charger un audio avec authentification (utiliser la même méthode que AuthenticatedMedia)
const loadAuthenticatedAudio = async (url: string): Promise<string> => {
  try {
    console.log('🔐 Chargement authentifié du fichier audio...');
    const blob = await MemoService.loadFiles(url);
    const blobUrl = URL.createObjectURL(blob);
    console.log('✅ URL blob créée:', blobUrl);
    return blobUrl;
  } catch (error) {
    console.error('❌ Erreur chargement audio authentifié:', error);
    throw error;
  }
};

const fermerImageModal = () => {
  imageModalUrl.value = null;
};

const formatDuration = (duration: number | undefined): string => {
  console.log('📐 formatDuration appelé avec:', duration);
  if (!duration || isNaN(duration) || duration === Infinity) {
    return '--:--';
  }
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  const result = `${minutes}:${String(seconds).padStart(2, '0')}`;
  console.log('📐 formatDuration retourne:', result);
  return result;
};

const getFormattedDuration = (fileId: string): string => {
  // Force la lecture du trigger pour la réactivité
  const _ = audioUpdateTrigger.value;
  const duration = audioDurations[fileId];
  console.log(`🔄 getFormattedDuration appelé pour ${fileId}:`, duration);
  return formatDuration(duration);
};

const supprimerFichier = (index: number) => {
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

// Lecture audio des fichiers du mémo
const toggleAudioPlay = async (audioKey: string) => {
  console.log('🎵 toggleAudioPlay appelé avec:', audioKey);

  // Trouver le fichier correspondant dans tous les messages
  let fichier: AttachedFile | undefined;

  for (const message of conversationMessages.value) {
    fichier = message.fichiers.find(f => f.id === audioKey);
    if (fichier) break;
  }

  if (!fichier) {
    console.error('❌ Fichier introuvable pour la clé:', audioKey);
    return;
  }

  console.log('📁 Fichier trouvé:', fichier);

  if (fichier.type !== 'audio') {
    console.error('❌ Type incorrect:', fichier.type);
    return;
  }

  // Arrêter l'ancien audio
  if (currentPlayingIndex.value !== null && currentPlayingIndex.value !== audioKey) {
    const oldAudio = audioElements.value.get(currentPlayingIndex.value);
    if (oldAudio) {
      oldAudio.pause();
      oldAudio.currentTime = 0;
    }
  }

  let audio = audioElements.value.get(audioKey);

  if (!audio) {
    console.log('🆕 Création nouvel élément audio avec authentification');

    try {
      // Charger le fichier avec authentification
      const authenticatedUrl = await loadAuthenticatedAudio(fichier.url);

      audio = new Audio();

      // IMPORTANT : Attendre que l'audio soit complètement chargé avant de le lire
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Timeout: le chargement de l\'audio a pris trop de temps'));
        }, 10000);

        audio!.addEventListener('loadedmetadata', () => {
          console.log(`✅ Métadonnées chargées, durée: ${audio!.duration}s`);

          if (audio!.duration && !isNaN(audio!.duration) && audio!.duration !== Infinity) {
            audioDurations[audioKey] = audio!.duration;
            console.log(`✅ Durée stockée pour ${audioKey}:`, audio!.duration);
          }
        });

        audio!.addEventListener('canplaythrough', () => {
          console.log('✅ Audio complètement chargé et prêt à être lu');
          clearTimeout(timeoutId);

          if (audio!.duration && !isNaN(audio!.duration) && audio!.duration !== Infinity) {
            audioDurations[audioKey] = audio!.duration;
            audioUpdateTrigger.value++;
          }

          resolve();
        });

        audio!.addEventListener('error', (e) => {
          clearTimeout(timeoutId);
          console.error('❌ Erreur de chargement:', audio!.error);
          reject(new Error(`Erreur de chargement: ${audio!.error?.message || 'inconnue'}`));
        });

        audio!.preload = 'auto';
        audio!.src = authenticatedUrl;
        audio!.load();
      });

      audioElements.value.set(audioKey, audio);

      audio.addEventListener('timeupdate', () => {
        if (currentPlayingIndex.value === audioKey) {
          const current = Math.floor(audio!.currentTime);
          const minutes = Math.floor(current / 60);
          const seconds = current % 60;
          currentAudioTime.value = `${minutes}:${String(seconds).padStart(2, '0')}`;
        }
      });

      audio.addEventListener('ended', () => {
        console.log('✅ Lecture terminée');
        isPlaying.value = false;
        currentPlayingIndex.value = null;
        currentAudioTime.value = '0:00';
      });

    } catch (error) {
      console.error('❌ Erreur chargement authentifié:', error);
      alert('Impossible de charger le fichier audio.');
      return;
    }
  }

  // Toggle play/pause
  if (currentPlayingIndex.value === audioKey && isPlaying.value) {
    console.log('⏸️ Pause');
    audio.pause();
    isPlaying.value = false;
  } else {
    console.log('▶️ Play');
    try {
      await audio.play();
      isPlaying.value = true;
      currentPlayingIndex.value = audioKey;
      console.log('✅ Lecture démarrée avec succès');
    } catch (error) {
      console.error('❌ Erreur de lecture:', error);
      audio.currentTime = 0;
      try {
        await audio.play();
        isPlaying.value = true;
        currentPlayingIndex.value = audioKey;
      } catch (retryError) {
        alert(`Impossible de lire ce fichier audio.`);
        isPlaying.value = false;
      }
    }
  }
};

const toggleReponseAudioPlay = (reponseId: string) => {
  if (currentPlayingReponseId.value !== null && currentPlayingReponseId.value !== reponseId) {
    const oldAudio = reponseAudioElements.value.get(currentPlayingReponseId.value);
    if (oldAudio) {
      oldAudio.pause();
      oldAudio.currentTime = 0;
    }
  }

  let audio = reponseAudioElements.value.get(reponseId);
  if (!audio) {
    const reponseIndex = parseInt(reponseId.split('-')[1]);
    const reponse = reponsesEnvoyees.value[reponseIndex];
    if (!reponse || !reponse.audioURL) return;

    audio = new Audio(reponse.audioURL);
    reponseAudioElements.value.set(reponseId, audio);

    audio.addEventListener('timeupdate', () => {
      const current = Math.floor(audio!.currentTime);
      const minutes = Math.floor(current / 60);
      const seconds = current % 60;
      currentReponseAudioTime.value = `${minutes}:${String(seconds).padStart(2, '0')}`;
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

const getWaveformHeight = (index: number, isActive: boolean): string => {
  const baseHeight = 4;
  const maxHeight = 20;

  if (isActive) {
    const randomHeight = baseHeight + Math.random() * (maxHeight - baseHeight);
    return `${randomHeight}px`;
  }

  const heights = [8, 14, 10, 18, 12, 16, 9, 15, 11, 17, 13, 19, 10, 14, 8, 16, 12, 15, 11, 13];
  return `${heights[index % heights.length]}px`;
};

const collectAllFiles = async (): Promise<File[]> => {
  const allFiles: File[] = [...fichiers.value];

  if (audioBlob.value) {
    allFiles.push(
      new File(
        [audioBlob.value],
        `audio-${Date.now()}.webm`,
        { type: audioBlob.value.type }
      )
    );
  }

  return allFiles;
};

const envoyerReponse = async () => {
  if (!peutEnvoyerReponse.value || isSubmitting.value || !memo.value || !managerGuid.value) return;

  // Validation du nombre de fichiers
  const totalFiles = fichiers.value.length + (audioBlob.value ? 1 : 0);
  if (totalFiles > 8) {
    alert('Maximum 8 fichiers autorisés par envoi');
    return;
  }

  isSubmitting.value = true;
  isUploadingFiles.value = true;

  try {
    // 1️⃣ Regrouper tous les fichiers
    const allFiles = await collectAllFiles();

    console.log('allFiles', allFiles.length);

    // 2️⃣ Upload en une fois
    const uploadedFiles =
      allFiles.length > 0
        ? await MemoService.uploadMultipleFiles(allFiles)
        : [];
    isUploadingFiles.value = false;

    // 3️⃣ Construire le message
    const messageContent = MemoService.buildMessageContent(
      reponseContenu.value,
      uploadedFiles
    );

    console.log('messageContent', messageContent);

    // 4️⃣ Envoyer la réponse
    await MemoService.sendReply(memo.value.guid,{
      user: managerGuid.value,
      message: messageContent
    });

    // 5️⃣ Ajouter à l'affichage local
    const now = new Date();
    const timeString = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    reponsesEnvoyees.value.push({
      contenu: reponseContenu.value,
      fichiers: [...fichiers.value],
      audioBlob: audioBlob.value,
      audioURL: audioBlob.value ? URL.createObjectURL(audioBlob.value) : null,
      duration: recordedDuration.value,
      timestamp: timeString
    });

    // 6. Réinitialiser le formulaire
    reponseContenu.value = '';
    fichiers.value = [];
    audioBlob.value = null;
    recordedDuration.value = '00:00';
    if (audioURL.value) {
      URL.revokeObjectURL(audioURL.value);
      audioURL.value = '';
    }
    uploadProgress.value = null;

    scrollToBottom();

    // 7. Rafraîchir le mémo spécifique dans le store
    await memoStore.refreshMemo(managerGuid.value, memo.value.guid);

    // Puis recharger localement
    await chargerMemo();

  } catch (error: any) {
    console.error('❌ Erreur envoi réponse:', error);
    alert(`Erreur: ${error.message || 'Impossible d\'envoyer la réponse'}`);
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

    // Si une réponse a été ajoutée avant l'approbation
    if (reponseContenu.value.trim() || fichiers.value.length > 0 || audioBlob.value) {
      const totalFiles = fichiers.value.length + (audioBlob.value ? 1 : 0);
      if (totalFiles > 8) {
        throw new Error('Maximum 8 fichiers autorisés');
      }
      const allFiles = await collectAllFiles();

      const uploadedFiles =
        allFiles.length > 0
          ? await MemoService.uploadMultipleFiles(allFiles)
          : [];
      messageContent = MemoService.buildMessageContent(
        reponseContenu.value,
        uploadedFiles
      );
    }

    isUploadingFiles.value = false;


    const contentData = {
      user: managerGuid.value,
      message: messageContent
    }

    console.log('Data', memo.value.guid, managerGuid.value);

    // Appel API d'approbation
   const response = await MemoService.validateMemo(memo.value.guid, managerGuid.value);
   if (!response.success) {
     // alert(`Erreur: ${response.error?.message || 'Impossible d\'approuver le mémo'}`);
     return;
   }
    await memoStore.refreshMemo(managerGuid.value, memo.value.guid);

    await chargerMemo()

    setTimeout(() => {
      router.push('/memoList');
    }, 2500);

  } catch (error: any) {
    console.error('❌ Erreur approbation:', error);
    alert(`Erreur: ${error.message || 'Impossible d\'approuver le mémo'}`);
  } finally {
    isProcessing.value = false;
    actionType.value = null;
    isUploadingFiles.value = false;
    uploadProgress.value = null;
  }
};

const rejeterMemo = async () => {
  if (!memo.value || isProcessing.value || !managerGuid.value) return;
  //
  // if (!reponseContenu.value.trim() && !fichiers.value.length && !audioBlob.value) {
  //   alert('Veuillez ajouter une réponse pour expliquer le rejet');
  //   return;
  // }

  if (!confirm) return;

  isProcessing.value = true;
  actionType.value = 'reject';
  isUploadingFiles.value = true;

  try {
    // const totalFiles = fichiers.value.length + (audioBlob.value ? 1 : 0);
    // if (totalFiles > 8) throw new Error('Maximum 8 fichiers autorisés');
    //
    // const allFiles = await collectAllFiles();
    //
    // const uploadedFiles =
    //   allFiles.length > 0
    //     ? await MemoService.uploadMultipleFiles(allFiles)
    //     : [];
    //
    // isUploadingFiles.value = false;
    //
    // const messageContent = MemoService.buildMessageContent(
    //   reponseContenu.value,
    //   uploadedFiles
    // );
    //
    //
    // const contentData = {
    //   user: managerGuid.value,
    //   message: messageContent
    // }

    let messageContent: MessageContent[] | undefined;

    // Si une réponse a été ajoutée avant l'approbation
    if (reponseContenu.value.trim() || fichiers.value.length > 0 || audioBlob.value) {
      const totalFiles = fichiers.value.length + (audioBlob.value ? 1 : 0);
      if (totalFiles > 8) {
        throw new Error('Maximum 8 fichiers autorisés');
      }
      const allFiles = await collectAllFiles();

      const uploadedFiles =
        allFiles.length > 0
          ? await MemoService.uploadMultipleFiles(allFiles)
          : [];
      messageContent = MemoService.buildMessageContent(
        reponseContenu.value,
        uploadedFiles
      );
    }

    isUploadingFiles.value = false;


    const contentData = {
      user: managerGuid.value,
      message: messageContent
    }

    await MemoService.rejetMemo(memo.value.guid, managerGuid.value);

    await memoStore.refreshMemo(managerGuid.value, memo.value.guid);

    await chargerMemo()

    // alert('Mémo rejeté');
    // retourListe();
    setTimeout(() => {
      router.push('/memoList');
    }, 2000);

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

// Ajouter validation du nombre de fichiers
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

  // Réinitialiser l'input pour permettre de sélectionner les mêmes fichiers
  if (target) {
    target.value = '';
  }
};

const retourListe = () => {
  router.push('/memoList');
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

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
  if (recordingInterval.value) {
    clearInterval(recordingInterval.value);
  }
  if (audioURL.value) {
    URL.revokeObjectURL(audioURL.value);
  }

  // Libérer tous les audios et leurs URLs blob
  audioElements.value.forEach(audio => {
    if (audio.src && audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(audio.src);
    }
    audio.pause();
    audio.src = '';
  });
  audioElements.value.clear();

  reponseAudioElements.value.forEach(audio => {
    if (audio.src && audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(audio.src);
    }
    audio.pause();
    audio.src = '';
  });
  reponseAudioElements.value.clear();

  reponsesEnvoyees.value.forEach(reponse => {
    if (reponse.audioURL) {
      URL.revokeObjectURL(reponse.audioURL);
    }
  });

  // AJOUTEZ CETTE LIGNE :
  Object.keys(audioDurations).forEach(key => delete audioDurations[key]);
});
</script>

<style scoped>
.image-preview-wrapper :deep(img) {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
}

.modal-content :deep(img) {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
}
</style>