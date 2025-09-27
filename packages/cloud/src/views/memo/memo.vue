<template>
  <div class="memo-container">
    <!-- Header -->
    <div class="memo-header">
      <button @click="goBack" class="back-btn">
        <IconArrowLeft />
      </button>
      <div class="memo-title">
        <h1>{{ isEditMode ? 'Modifier le MÃ©mo' : 'Nouveau MÃ©mo' }}</h1>
      </div>
    </div>

    <!-- Main Content -->
    <div class="memo-content">
      <!-- Subject Input -->
      <div class="memo-field">
        <label for="subject" class="field-label">
          <IconFileText class="field-icon" />
          Objet du mÃ©mo
        </label>
        <input
          id="subject"
          v-model="memo.subject"
          type="text"
          class="memo-input"
          placeholder="Saisissez l'objet de votre mÃ©mo..."
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
          placeholder="RÃ©digez votre message..."
          rows="6"
          maxlength="1000"
        ></textarea>
        <div class="char-counter">{{ memo.message.length }}/1000</div>
      </div>

      <div class="voice-file-container">
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

            <div v-if="audioBlob || existingVoiceNote" class="audio-preview">
              <audio :src="audioUrl || existingVoiceNoteUrl" controls class="audio-player"></audio>
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
            PiÃ¨ces jointes
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
      </div>

      <!-- Action Buttons -->
      <div class="memo-actions">
        <button @click="saveDraft" class="action-btn draft-btn" :disabled="!canSave">
          <IconDeviceFloppy />
          <span>{{ isEditMode ? 'Sauvegarder les modifications' : 'Enregistrer comme brouillon' }}</span>
        </button>
        <button @click="sendMemo" class="action-btn send-btn" :disabled="!canSend">
          <IconSend />
          <span>{{ isEditMode ? 'Mettre Ã  jour et envoyer' : 'Envoyer le mÃ©mo' }}</span>
        </button>
      </div>

      <!-- Delete button for edit mode -->
      <div v-if="isEditMode" class="delete-section">
        <button @click="confirmDelete" class="delete-memo-btn">
          <IconTrash />
          <span>Supprimer ce mÃ©mo</span>
        </button>
      </div>
    </div>

    <!-- Toast notification -->
    <div v-if="showToast" class="toast" :class="toastType">
      <IconCheck v-if="toastType === 'success'" />
      <IconX v-if="toastType === 'error'" />
      <span>{{ toastMessage }}</span>
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
  IconDeviceFloppy,
  IconSend,
  IconTrash,
  IconCheck
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

// Check if we're in edit mode
const isEditMode = computed(() => !!route.query.editMemoId)
const editMemoId = ref<string | null>(route.query.editMemoId as string || null)

// Employee data from route
const employee = ref<Employee>({
  id: Number(route.params.employeeId || route.query.employeeId),
  name: route.query.employeeName as string || 'EmployÃ© inconnu',
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
const existingVoiceNote = ref<Blob | null>(null)
const existingVoiceNoteUrl = ref<string>('')

// File attachments
const attachedFiles = ref<File[]>([])

// Toast notifications
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

// Computed properties
const recordButtonText = computed(() => {
  if (isRecording.value) return 'ArrÃªter l\'enregistrement'
  if (audioBlob.value || existingVoiceNote.value) return 'Nouvel enregistrement'
  return 'DÃ©marrer l\'enregistrement'
})

const canSave = computed(() => {
  return memo.value.subject.trim() !== '' || memo.value.message.trim() !== ''
})

const canSend = computed(() => {
  return memo.value.subject.trim() !== '' && memo.value.message.trim() !== ''
})

// Load existing memo for editing
const loadMemoForEdit = () => {
  if (!editMemoId.value) return

  try {
    const savedMemos = JSON.parse(localStorage.getItem('memos') || '[]')
    const existingMemo = savedMemos.find((m: Memo) => m.id === editMemoId.value)

    if (existingMemo) {
      memo.value = {
        id: existingMemo.id,
        subject: existingMemo.subject,
        message: existingMemo.message,
        priority: existingMemo.priority,
        employeeId: existingMemo.employeeId,
        attachments: existingMemo.attachments || [],
        status: existingMemo.status,
        createdAt: new Date(existingMemo.createdAt)
      }

      // Load existing attachments
      attachedFiles.value = existingMemo.attachments || []

      // Load existing voice note if present
      if (existingMemo.voiceNote) {
        existingVoiceNote.value = existingMemo.voiceNote
        existingVoiceNoteUrl.value = URL.createObjectURL(existingMemo.voiceNote)
      }

      // Update employee info based on memo
      const employees = [
        { id: 1, name: 'Jean Dupont', initials: 'JD', status: 'present', statusText: 'PrÃ©sent' },
        { id: 2, name: 'Marie Martin', initials: 'MM', status: 'late', statusText: 'En retard' },
        { id: 3, name: 'Pierre Durand', initials: 'PD', status: 'absent', statusText: 'Absent' },
        { id: 4, name: 'Sophie Leblanc', initials: 'SL', status: 'present', statusText: 'PrÃ©sent' },
        { id: 5, name: 'Lucas Bernard', initials: 'LB', status: 'present', statusText: 'PrÃ©sent' }
      ]

      const emp = employees.find(e => e.id === existingMemo.employeeId)
      if (emp) {
        employee.value = emp
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement du mÃ©mo:', error)
    showToastMessage('Erreur lors du chargement du mÃ©mo', 'error')
  }
}

const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true

  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

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
    console.error('Erreur lors du dÃ©marrage de l\'enregistrement:', error)
    showToastMessage('Impossible d\'accÃ©der au microphone', 'error')
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
  existingVoiceNote.value = null
  existingVoiceNoteUrl.value = ''
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
      showToastMessage('Certains fichiers dÃ©passent la taille limite de 10MB et ont Ã©tÃ© ignorÃ©s', 'error')
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
      id: isEditMode.value ? editMemoId.value : Date.now().toString(),
      createdAt: isEditMode.value ? memo.value.createdAt : new Date(),
      updatedAt: isEditMode.value ? new Date() : undefined,
      status: 'draft' as const,
      voiceNote: audioBlob.value || existingVoiceNote.value
    }

    const existingMemos = JSON.parse(localStorage.getItem('memos') || '[]')

    if (isEditMode.value) {
      // Update existing memo
      const index = existingMemos.findIndex((m: Memo) => m.id === editMemoId.value)
      if (index > -1) {
        existingMemos[index] = memoData
      }
      showToastMessage('MÃ©mo modifiÃ© avec succÃ¨s')
    } else {
      // Add new memo
      existingMemos.push(memoData)
      showToastMessage('MÃ©mo sauvegardÃ© comme brouillon')
    }

    localStorage.setItem('memos', JSON.stringify(existingMemos))

    setTimeout(() => {
      router.push('/memoList')
    }, 1000)
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    showToastMessage('Erreur lors de la sauvegarde', 'error')
  }
}

const sendMemo = async () => {
  try {
    const memoData = {
      ...memo.value,
      id: isEditMode.value ? editMemoId.value : Date.now().toString(),
      createdAt: isEditMode.value ? memo.value.createdAt : new Date(),
      updatedAt: isEditMode.value ? new Date() : undefined,
      status: 'sent' as const,
      voiceNote: audioBlob.value || existingVoiceNote.value
    }

    const existingMemos = JSON.parse(localStorage.getItem('memos') || '[]')

    if (isEditMode.value) {
      // Update existing memo
      const index = existingMemos.findIndex((m: Memo) => m.id === editMemoId.value)
      if (index > -1) {
        existingMemos[index] = memoData
      }
      showToastMessage('MÃ©mo mis Ã  jour et envoyÃ© avec succÃ¨s')
    } else {
      // Add new memo
      existingMemos.push(memoData)
      showToastMessage('MÃ©mo envoyÃ© avec succÃ¨s')
    }

    localStorage.setItem('memos', JSON.stringify(existingMemos))

    setTimeout(() => {
      router.push('/memoList')
    }, 1000)
  } catch (error) {
    console.error('Erreur lors de l\'envoi:', error)
    showToastMessage('Erreur lors de l\'envoi du mÃ©mo', 'error')
  }
}

const confirmDelete = () => {
  if (confirm('ÃŠtes-vous sÃ»r de vouloir supprimer dÃ©finitivement ce mÃ©mo ?')) {
    deleteMemo()
  }
}

const deleteMemo = () => {
  try {
    const existingMemos = JSON.parse(localStorage.getItem('memos') || '[]')
    const filteredMemos = existingMemos.filter((m: Memo) => m.id !== editMemoId.value)

    localStorage.setItem('memos', JSON.stringify(filteredMemos))
    showToastMessage('MÃ©mo supprimÃ© avec succÃ¨s')

    setTimeout(() => {
      router.push('/memoList')
    }, 1000)
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    showToastMessage('Erreur lors de la suppression', 'error')
  }
}

const goBack = () => {
  if (canSave.value && !isEditMode.value) {
    const shouldSave = window.confirm('Voulez-vous sauvegarder ce mÃ©mo avant de quitter ?')
    if (shouldSave) {
      saveDraft()
      return
    }
  }

  if (isEditMode.value && hasUnsavedChanges()) {
    const shouldSave = window.confirm('Vous avez des modifications non sauvegardÃ©es. Voulez-vous les sauvegarder avant de quitter ?')
    if (shouldSave) {
      saveDraft()
      return
    }
  }

  router.go(-1)
}

const hasUnsavedChanges = (): boolean => {
  if (!isEditMode.value) return false

  try {
    const savedMemos = JSON.parse(localStorage.getItem('memos') || '[]')
    const originalMemo = savedMemos.find((m: Memo) => m.id === editMemoId.value)

    if (!originalMemo) return false

    return (
      memo.value.subject !== originalMemo.subject ||
      memo.value.message !== originalMemo.message ||
      memo.value.priority !== originalMemo.priority ||
      attachedFiles.value.length !== (originalMemo.attachments?.length || 0) ||
      (audioBlob.value !== null) !== (originalMemo.voiceNote !== null)
    )
  } catch {
    return false
  }
}

onMounted(() => {
  HeadBuilder.apply({
    title: `${isEditMode.value ? 'Modifier le MÃ©mo' : 'Nouveau MÃ©mo'} - TokÃ©`,
    css: [memoCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })

  // Load memo data for editing if in edit mode
  if (isEditMode.value) {
    loadMemoForEdit()
  }
})

onUnmounted(() => {
  if (recordingInterval.value) {
    clearInterval(recordingInterval.value)
  }
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  if (existingVoiceNoteUrl.value) {
    URL.revokeObjectURL(existingVoiceNoteUrl.value)
  }
})
</script>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #10b981;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

.toast.error {
  background: #ef4444;
}

.delete-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
}

.delete-memo-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-memo-btn:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3);
}

.delete-memo-btn:active {
  transform: translateY(0);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>