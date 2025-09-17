<template>
  <div class="memo-page">
    <!-- Contenu principal -->
    <div class="memo-page-content">
      <!-- Zone de chat -->
      <div class="chat-container" ref="chatContainer">
        <!-- Messages -->
        <div class="">
          <div v-for="message in messages" :key="message.id" :class="['message', message.type]">
            <div class="message-content">
              <div v-if="message.contentType === 'text'" class="message-text">
                {{ message.content }}
              </div>

              <div v-else-if="message.contentType === 'audio'" class="message-audio">
                <audio :src="message.audioUrl" controls class="audio-player-small"></audio>
              </div>

              <div v-else-if="message.contentType === 'file'" class="message-file">
                <div class="file-preview">
                  <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <span>{{ message.fileName }}</span>
                </div>
              </div>
            </div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>

        <!-- Templates de mémos -->
        <div v-if="showTemplates" class="memo-templates">
          <!--          <h4>Templates de mémos :</h4>-->
          <div class="templates-grid">
            <button
              v-for="template in memoTemplates"
              :key="template.id"
              @click="selectTemplate(template)"
              class="template-btn"
            >
              <div class="template-icon">
                <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="template.icon"></path>
                </svg>
              </div>
              <div class="template-content">
                <div class="template-title">{{ template.title }}</div>
                <div class="template-preview">{{ template.preview }}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Zone de saisie fixe -->
    <div class="memo-page-footer">
      <!-- Barre d'outils -->
      <div class="input-toolbar">

        <button @click="toggleInputType('text')" :class="['toolbar-btn', { active: inputType === 'text' }]" title="Texte">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"></path>
          </svg>
        </button>

        <button @click="toggleInputType('voice')" :class="['toolbar-btn', { active: inputType === 'voice' }]" title="Vocal">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
          </svg>
        </button>

        <input
          ref="fileInput"
          type="file"
          @change="handleFileSelect"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
          style="display: none"
        />
<!--        <button @click="$refs.fileInput.click()" class="toolbar-btn" title="Fichier">-->
<!--          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>-->
<!--          </svg>-->
<!--        </button>-->
      </div>

      <!-- Zone de saisie texte -->
      <div v-if="inputType === 'text'" class="text-input-area">
        <div class="input-wrapper">
          <textarea
            v-model="currentMessage"
            @keydown.enter.prevent="handleEnterKey"
            placeholder="Tapez votre message..."
            class="message-input"
            rows="2"
            ref="textInput"
          ></textarea>
          <button
            @click="sendMessage"
            :disabled="!canSendMessage"
            class="send-btn"
          >
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Zone d'enregistrement vocal -->
      <div v-if="inputType === 'voice'" class="voice-input-area">
        <div class="voice-recorder">
          <button
            v-if="!isRecording && !audioBlob"
            @click="startRecording"
            class="record-btn-large"
          >
            <svg class="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
            </svg>
            <span>Appuyer pour enregistrer</span>
          </button>

          <div v-if="isRecording" class="recording-controls">
            <div class="recording-indicator">
              <div class="pulse-dot"></div>
              <span>Enregistrement... {{ recordingTime }}s</span>
            </div>
            <button @click="stopRecording" class="stop-record-btn">
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z"></path>
              </svg>
              Arrêter
            </button>
          </div>

          <div v-if="audioBlob" class="audio-preview-controls">
            <audio :src="audioUrl" controls class="audio-preview"></audio>
            <div class="preview-actions">
              <button @click="sendVoiceMessage" class="send-voice-btn">
                <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
                Envoyer
              </button>
              <button @click="deleteRecording" class="delete-voice-btn">
                <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Fichier sélectionné -->
      <div v-if="selectedFile" class="selected-file">
        <div class="file-info">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <span>{{ selectedFile.name }}</span>
          <small>({{ formatFileSize(selectedFile.size) }})</small>
        </div>
        <div class="file-actions">
          <button @click="sendFileMessage" class="send-file-btn">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
            Envoyer
          </button>
          <button @click="selectedFile = null" class="remove-file-btn">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

  </div>

</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick, onMounted } from 'vue';
import memoCss from "../assets/css/toke-memo-08.css?url"
import HeadBuilder from '@/utils/HeadBuilder';
import HeaderC from '../views/components/headerC.vue'
import router from '@/router';


interface Employee {
  id: number
  name: string
  initials: string
  status: 'absent' | 'late' | 'present' | 'info'
  statusText: string
  location?: string
  time?: string
  avatar?: string
  priority?: 'high' | 'medium' | 'low'
  isJustified?: boolean
  isValidated?: boolean
}

interface Message {
  id: string
  type: 'sent' | 'received'
  contentType: 'text' | 'audio' | 'file'
  content?: string
  audioUrl?: string
  audioBlob?: Blob
  fileName?: string
  fileUrl?: string
  timestamp: Date
}

interface MemoTemplate {
  id: string
  title: string
  content: string
  preview: string
  icon: string
  category: string
}

const props = defineProps<{
  employee: Employee
}>()

const emit = defineEmits<{
  goBack: []
  memoSent: [memo: any]
}>()

// Données réactives pour le header
const currentUser = ref({
  name: 'Danielle',
  company: 'IMEDIATIS'
})

const notificationCount = ref(2)

// État du chat
const messages = ref<Message[]>([])
const currentMessage = ref('')
const inputType = ref<'text' | 'voice'>('text')
const showTemplates = ref(true)
const chatContainer = ref<HTMLElement | null>(null)
const textInput = ref<HTMLTextAreaElement | null>(null)

// État vocal
const isRecording = ref(false)
const audioBlob = ref<Blob | null>(null)
const audioUrl = ref('')
const mediaRecorder = ref<MediaRecorder | null>(null)
const recordingTime = ref(0)
const recordingInterval = ref<number | null>(null)

// État fichier
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// Templates de mémos
// const memoTemplates = ref<MemoTemplate[]>([
//   {
//     id: '1',
//     title: 'Demande d\'explication',
//     content: 'Bonjour, pouvez-vous m\'expliquer la raison de votre absence/retard aujourd\'hui ?',
//     preview: 'Demande d\'explication pour absence/retard',
//     icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
//     category: 'explanation'
//   },
//   {
//     id: '2',
//     title: 'Rappel de procédure',
//     content: 'Je vous rappelle qu\'il est important de signaler tout retard ou absence en avance. Merci de votre compréhension.',
//     preview: 'Rappel des procédures d\'absence',
//     icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z',
//     category: 'reminder'
//   },
//   {
//     id: '3',
//     title: 'Demande de justificatif',
//     content: 'Merci de fournir un justificatif médical ou administratif pour votre absence d\'aujourd\'hui dans les plus brefs délais.',
//     preview: 'Demande de justificatif médical/administratif',
//     icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
//     category: 'document'
//   },
//   {
//     id: '4',
//     title: 'Avertissement léger',
//     content: 'Ceci constitue un avertissement concernant vos récents retards. Merci de faire attention à la ponctualité.',
//     preview: 'Avertissement pour retards répétés',
//     icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
//     category: 'warning'
//   },
//   {
//     id: '5',
//     title: 'Félicitations',
//     content: 'Félicitations pour votre ponctualité et votre assiduité cette semaine. Continuez ainsi !',
//     preview: 'Message de félicitations',
//     icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
//     category: 'positive'
//   },
//   {
//     id: '6',
//     title: 'Convocation',
//     content: 'Je souhaiterais vous rencontrer dans mon bureau concernant votre situation. Merci de prendre rendez-vous.',
//     preview: 'Convocation pour entretien',
//     icon: 'M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-1.5 8.5A2 2 0 009.5 21h5a2 2 0 002-1.5L15 12',
//     category: 'meeting'
//   }
// ])

const canSendMessage = computed(() => {
  return currentMessage.value.trim().length > 0
})

// Méthodes
// const goBack = () => {
//   emit('goBack')
// }

const toggleInputType = (type: 'text' | 'voice') => {
  inputType.value = type
  if (type === 'text') {
    deleteRecording()
    nextTick(() => {
      textInput.value?.focus()
    })
  } else {
    currentMessage.value = ''
  }
}

const selectTemplate = (template: MemoTemplate) => {
  const message: Message = {
    id: Date.now().toString(),
    type: 'sent',
    contentType: 'text',
    content: template.content,
    timestamp: new Date()
  }

  messages.value.push(message)
  showTemplates.value = false

  emit('memoSent', {
    employeeId: props.employee.id,
    employeeName: props.employee.name,
    type: 'text',
    content: template.content,
    template: template.title,
    timestamp: new Date()
  })

  scrollToBottom()
}

const sendMessage = () => {
  if (!canSendMessage.value) return

  const message: Message = {
    id: Date.now().toString(),
    type: 'sent',
    contentType: 'text',
    content: currentMessage.value,
    timestamp: new Date()
  }

  messages.value.push(message)

  emit('memoSent', {
    employeeId: props.employee.id,
    employeeName: props.employee.name,
    type: 'text',
    content: currentMessage.value,
    timestamp: new Date()
  })

  currentMessage.value = ''
  scrollToBottom()
}

const handleEnterKey = (event: KeyboardEvent) => {
  if (!event.shiftKey) {
    sendMessage()
  }
}

// Fonctions d'enregistrement vocal
const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.value = new MediaRecorder(stream)

    const chunks: BlobPart[] = []

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    mediaRecorder.value.onstop = () => {
      audioBlob.value = new Blob(chunks, { type: 'audio/wav' })
      audioUrl.value = URL.createObjectURL(audioBlob.value)
      stream.getTracks().forEach(track => track.stop())
    }

    mediaRecorder.value.start()
    isRecording.value = true
    recordingTime.value = 0

    recordingInterval.value = window.setInterval(() => {
      recordingTime.value++
    }, 1000)

  } catch (error) {
    console.error('Erreur microphone:', error)
    alert('Impossible d\'accéder au microphone')
  }
}

const stopRecording = () => {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
    isRecording.value = false

    if (recordingInterval.value) {
      clearInterval(recordingInterval.value)
      recordingInterval.value = null
    }
  }
}

const deleteRecording = () => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  audioBlob.value = null
  audioUrl.value = ''
  recordingTime.value = 0
}

const sendVoiceMessage = () => {
  if (!audioBlob.value) return

  const message: Message = {
    id: Date.now().toString(),
    type: 'sent',
    contentType: 'audio',
    audioUrl: audioUrl.value,
    audioBlob: audioBlob.value,
    timestamp: new Date()
  }

  messages.value.push(message)

  emit('memoSent', {
    employeeId: props.employee.id,
    employeeName: props.employee.name,
    type: 'voice',
    audioBlob: audioBlob.value,
    timestamp: new Date()
  })

  const currentUrl = audioUrl.value
  audioBlob.value = null
  audioUrl.value = ''
  recordingTime.value = 0

  scrollToBottom()
}

// Fonctions de fichier
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

const sendFileMessage = () => {
  if (!selectedFile.value) return

  const fileUrl = URL.createObjectURL(selectedFile.value)

  const message: Message = {
    id: Date.now().toString(),
    type: 'sent',
    contentType: 'file',
    fileName: selectedFile.value.name,
    fileUrl: fileUrl,
    timestamp: new Date()
  }

  messages.value.push(message)

  emit('memoSent', {
    employeeId: props.employee.id,
    employeeName: props.employee.name,
    type: 'file',
    file: selectedFile.value,
    fileName: selectedFile.value.name,
    timestamp: new Date()
  })

  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }

  scrollToBottom()
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
const goBack = () => {
  router.push('/dashboard')
}
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

onMounted(() => {
  HeadBuilder.apply({
    title: 'memo - Toké',
    css: [memoCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })

  scrollToBottom()
  nextTick(() => {
    textInput.value?.focus()
  })
})

onUnmounted(() => {
  if (recordingInterval.value) {
    clearInterval(recordingInterval.value)
  }
  deleteRecording()

  messages.value.forEach(message => {
    if (message.audioUrl) {
      URL.revokeObjectURL(message.audioUrl)
    }
    if (message.fileUrl) {
      URL.revokeObjectURL(message.fileUrl)
    }
  })
})
</script>