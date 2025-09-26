<template>
  <div class="memo-container">
    <!-- Header -->
    <div class="memo-header">
      <button @click="goBack" class="back-btn">
        <IconArrowLeft />
      </button>
      <div class="memo-title">
        <h1>Nouveau Mémo</h1>
<!--        <p class="employee-info">-->
<!--          <span class="employee-name">{{ employee.name }}</span>-->
<!--          <span class="employee-status" :class="'status-' + employee.status">-->
<!--            {{ employee.statusText }}-->
<!--          </span>-->
<!--        </p>-->
      </div>
    </div>

    <!-- Main Content -->
    <div class="memo-content">
      <!-- Subject Input -->
      <div class="memo-field">
        <label for="subject" class="field-label">
          <IconFileText class="field-icon" />
          Objet du mémo
        </label>
        <input
          id="subject"
          v-model="memo.subject"
          type="text"
          class="memo-input"
          placeholder="Saisissez l'objet de votre mémo..."
          maxlength="100"
        />
        <div class="char-counter">{{ memo.subject.length }}/100</div>
      </div>

      <!-- Message Input -->
      <div class="memo-field">
        <label for="message" class="field-label">
          <IconMessage class="field-icon" />
          Message
        </label>
        <textarea
          id="message"
          v-model="memo.message"
          class="memo-textarea"
          placeholder="Rédigez votre message..."
          rows="6"
          maxlength="1000"
        ></textarea>
        <div class="char-counter">{{ memo.message.length }}/1000</div>
      </div>

      <!-- Voice Note Section -->
      <div class="memo-field">
        <label class="field-label">
          <IconMicrophone class="field-icon" />
          Note vocale
        </label>
        <div class="voice-recorder">
          <button
            @click="toggleRecording"
            :class="['record-btn', { 'recording': isRecording }]"
            :disabled="audioBlob && !isRecording"
          >
            <IconMicrophone v-if="!isRecording" />
            <IconPlayerStop v-else />
            <span>{{ recordButtonText }}</span>
          </button>

          <div v-if="isRecording" class="recording-indicator">
            <div class="recording-wave">
              <div class="wave-bar" v-for="i in 5" :key="i"></div>
            </div>
            <span class="recording-time">{{ formatTime(recordingTime) }}</span>
          </div>

          <div v-if="audioBlob" class="audio-preview">
            <audio :src="audioUrl" controls class="audio-player"></audio>
            <button @click="deleteRecording" class="delete-audio-btn">
              <IconTrash />
            </button>
          </div>
        </div>
      </div>

      <!-- File Attachments -->
      <div class="memo-field">
        <label class="field-label">
          <IconPaperclip class="field-icon" />
          Pièces jointes
        </label>
        <div class="file-upload-area">
          <input
            ref="fileInput"
            type="file"
            multiple
            @change="handleFileSelect"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            class="file-input"
          />
          <button @click="triggerFileSelect" class="upload-btn">
            <IconUpload />
            <span>Joindre des fichiers</span>
          </button>
          <p class="upload-info">PDF, DOC, Images (Max: 10MB par fichier)</p>
        </div>

        <div v-if="attachedFiles.length > 0" class="attached-files">
          <div v-for="(file, index) in attachedFiles" :key="index" class="file-item">
            <div class="file-info">
              <IconFile class="file-icon" />
              <div class="file-details">
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
              </div>
            </div>
            <button @click="removeFile(index)" class="remove-file-btn">
              <IconX />
            </button>
          </div>
        </div>
      </div>

      <!-- Priority Level -->
<!--      <div class="memo-field">-->
<!--        <label class="field-label">-->
<!--          <IconFlag class="field-icon" />-->
<!--          Priorité-->
<!--        </label>-->
<!--        <div class="priority-options">-->
<!--          <label v-for="priority in priorities" :key="priority.value" class="priority-option">-->
<!--            <input-->
<!--              type="radio"-->
<!--              :value="priority.value"-->
<!--              v-model="memo.priority"-->
<!--              class="priority-radio"-->
<!--            />-->
<!--            <span class="priority-label" :class="'priority-' + priority.value">-->
<!--              <component :is="priority.icon" class="priority-icon" />-->
<!--              {{ priority.label }}-->
<!--            </span>-->
<!--          </label>-->
<!--        </div>-->
<!--      </div>-->

      <!-- Action Buttons -->
      <div class="memo-actions">
        <button @click="saveDraft" class="action-btn draft-btn" :disabled="!canSave">
          <IconDeviceFloppy />
          <span>Enregistrer comme brouillon</span>
        </button>
        <button @click="sendMemo" class="action-btn send-btn" :disabled="!canSend">
          <IconSend />
          <span>Envoyer le mémo</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HeadBuilder from '@/utils/HeadBuilder'
import memoCss from "../../assets/css/toke-memo-08.css?url"
import {
  IconArrowLeft,
  IconFileText,
  IconMessage,
  IconMicrophone,
  IconPlayerStop,
  IconPaperclip,
  IconUpload,
  IconFile,
  IconX,
  IconFlag,
  IconDeviceFloppy,
  IconSend,
  IconTrash,
  IconAlertCircle,
  IconAlertTriangle,
  IconCircle
} from '@tabler/icons-vue'

interface Employee {
  id: number
  name: string
  initials: string
  status: 'absent' | 'late' | 'present' | 'info'
  statusText: string
  location?: string
}

interface Memo {
  id?: string
  subject: string
  message: string
  priority: 'low' | 'medium' | 'high'
  employeeId: number
  attachments: File[]
  voiceNote?: Blob
  createdAt?: Date
  status: 'draft' | 'sent'
}

const route = useRoute()
const router = useRouter()
const fileInput = ref<HTMLInputElement>()

// Employee data from route
const employee = ref<Employee>({
  id: Number(route.params.employeeId || route.query.employeeId),
  name: route.query.employeeName as string || 'Employé inconnu',
  initials: route.query.employeeInitials as string || 'EI',
  status: route.query.employeeStatus as any || 'info',
  statusText: route.query.employeeStatusText as string || 'Statut inconnu',
  location: route.query.employeeLocation as string || ''
})

// Memo data
const memo = ref<Memo>({
  subject: '',
  message: '',
  priority: 'medium',
  employeeId: employee.value.id,
  attachments: [],
  status: 'draft'
})

// Voice recording
const isRecording = ref(false)
const recordingTime = ref(0)
const audioBlob = ref<Blob | null>(null)
const audioUrl = ref<string>('')
const mediaRecorder = ref<MediaRecorder | null>(null)
const recordingInterval = ref<number | null>(null)

// File attachments
const attachedFiles = ref<File[]>([])

// Priority options
const priorities = [
  { value: 'low', label: 'Faible', icon: IconCircle },
  { value: 'medium', label: 'Moyenne', icon: IconAlertCircle },
  { value: 'high', label: 'Élevée', icon: IconAlertTriangle }
]

// Computed properties
const recordButtonText = computed(() => {
  if (isRecording.value) return 'Arrêter l\'enregistrement'
  if (audioBlob.value) return 'Nouvel enregistrement'
  return 'Démarrer l\'enregistrement'
})

const canSave = computed(() => {
  return memo.value.subject.trim() !== '' || memo.value.message.trim() !== ''
})

const canSend = computed(() => {
  return memo.value.subject.trim() !== '' && memo.value.message.trim() !== ''
})

// Voice recording methods
const toggleRecording = async () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    await startRecording()
  }
}

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.value = new MediaRecorder(stream)

    const chunks: BlobPart[] = []
    mediaRecorder.value.ondataavailable = (event) => {
      chunks.push(event.data)
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
    console.error('Erreur lors du démarrage de l\'enregistrement:', error)
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
  audioBlob.value = null
  audioUrl.value = ''
  recordingTime.value = 0
}

// File handling methods
const triggerFileSelect = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const files = Array.from(target.files)
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024 // 10MB
      return file.size <= maxSize
    })

    if (validFiles.length !== files.length) {
      alert('Certains fichiers dépassent la taille limite de 10MB et ont été ignorés')
    }

    attachedFiles.value = [...attachedFiles.value, ...validFiles]
    memo.value.attachments = attachedFiles.value
  }
}

const removeFile = (index: number) => {
  attachedFiles.value.splice(index, 1)
  memo.value.attachments = attachedFiles.value
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Save and send methods
const saveDraft = async () => {
  try {
    const memoData = {
      ...memo.value,
      id: Date.now().toString(),
      createdAt: new Date(),
      status: 'draft' as const,
      voiceNote: audioBlob.value
    }

    // Save to localStorage for demo purposes
    const existingMemos = JSON.parse(localStorage.getItem('memos') || '[]')
    existingMemos.push(memoData)
    localStorage.setItem('memos', JSON.stringify(existingMemos))

    alert('Mémo sauvegardé comme brouillon')
    router.push('/dashboard')
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    alert('Erreur lors de la sauvegarde')
  }
}

const sendMemo = async () => {
  try {
    const memoData = {
      ...memo.value,
      id: Date.now().toString(),
      createdAt: new Date(),
      status: 'sent' as const,
      voiceNote: audioBlob.value
    }

    // Save to localStorage for demo purposes
    const existingMemos = JSON.parse(localStorage.getItem('memos') || '[]')
    existingMemos.push(memoData)
    localStorage.setItem('memos', JSON.stringify(existingMemos))

    // alert(`Mémo envoyé avec succès à ${employee.value.name}`)
    router.push('/memoList')
  } catch (error) {
    console.error('Erreur lors de l\'envoi:', error)
    alert('Erreur lors de l\'envoi du mémo')
  }
}

const goBack = () => {
  if (canSave.value) {
    const confirm = window.confirm('Voulez-vous sauvegarder ce mémo avant de quitter ?')
    if (confirm) {
      saveDraft()
      return
    }
  }
  router.go(-1)
}

onMounted(() => {
  HeadBuilder.apply({
    title: `Nouveau Mémo - ${employee.value.name} - Toké`,
    css: [memoCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})

onUnmounted(() => {
  if (recordingInterval.value) {
    clearInterval(recordingInterval.value)
  }
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
})
</script>