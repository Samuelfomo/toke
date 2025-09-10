<template>
  <div class="memo-modal-overlay" @click="closeModal">
    <div class="memo-modal" @click.stop>
      <div class="memo-modal-header">
        <h3>Envoyer un mémo à {{ employee.name }}</h3>
        <button @click="closeModal" class="close-btn">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="memo-modal-body">
        <!-- Toggle pour choisir le type de mémo -->
        <div class="memo-type-selector">
          <button
            :class="['type-btn', { active: memoType === 'text' }]"
            @click="setMemoType('text')"
          >
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Texte
          </button>
          <button
            :class="['type-btn', { active: memoType === 'voice' }]"
            @click="setMemoType('voice')"
          >
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
            </svg>
            Vocal
          </button>
        </div>

        <!-- Zone de texte -->
        <div v-if="memoType === 'text'" class="text-input-section">
          <label for="memo-text">Message :</label>
          <textarea
            id="memo-text"
            v-model="memoText"
            placeholder="Tapez votre message ici..."
            rows="5"
            class="memo-textarea"
          ></textarea>
        </div>

        <!-- Zone d'enregistrement vocal -->
        <div v-if="memoType === 'voice'" class="voice-input-section">
          <div class="voice-controls">
            <button
              v-if="!isRecording && !audioBlob"
              @click="startRecording"
              class="voice-btn record-btn"
            >
              <svg class="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
              </svg>
              Commencer l'enregistrement
            </button>

            <button
              v-if="isRecording"
              @click="stopRecording"
              class="voice-btn stop-btn"
            >
              <svg class="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z"></path>
              </svg>
              Arrêter ({{ recordingTime }}s)
            </button>

            <div v-if="audioBlob" class="audio-preview">
              <audio :src="audioUrl" controls class="audio-player"></audio>
              <button @click="deleteRecording" class="delete-btn">
                <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Sélection de priorité -->
<!--        <div class="priority-section">-->
<!--          <label>Priorité :</label>-->
<!--          <div class="priority-options">-->
<!--            <button-->
<!--              v-for="priority in priorities"-->
<!--              :key="priority.value"-->
<!--              :class="['priority-btn', priority.value, { active: memoPriority === priority.value }]"-->
<!--              @click="memoPriority = priority.value"-->
<!--            >-->
<!--              {{ priority.label }}-->
<!--            </button>-->
<!--          </div>-->
<!--        </div>-->
      </div>

      <div class="memo-modal-footer">
        <button @click="closeModal" class="btn-secondary">
          Annuler
        </button>
        <button
          @click="sendMemo"
          :disabled="!canSendMemo"
          class="btn-primary"
        >
          Envoyer le mémo
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
// import { useMemoStore } from '../stores/memoStore'
import "../assets/css/toke-memo-08.css"

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

const props = defineProps<{
  employee: Employee
}>()

const emit = defineEmits<{
  close: []
  memoSent: [memo: any]
}>()

// const memoStore = useMemoStore()

// État du modal
const memoType = ref<'text' | 'voice'>('text')
const memoText = ref('')
const memoPriority = ref<'low' | 'medium' | 'high'>('medium')

// État de l'enregistrement vocal
const isRecording = ref(false)
const audioBlob = ref<Blob | null>(null)
const audioUrl = ref('')
const mediaRecorder = ref<MediaRecorder | null>(null)
const recordingTime = ref(0)
const recordingInterval = ref<number | null>(null)

const priorities = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Normale' },
  { value: 'high', label: 'Urgente' }
]

const canSendMemo = computed(() => {
  if (memoType.value === 'text') {
    return memoText.value.trim().length > 0
  }
  return audioBlob.value !== null
})

const setMemoType = (type: 'text' | 'voice') => {
  memoType.value = type
  // Réinitialiser les données de l'autre type
  if (type === 'text') {
    deleteRecording()
  } else {
    memoText.value = ''
  }
}

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
    console.error('Erreur lors de l\'accès au microphone:', error)
    alert('Impossible d\'accéder au microphone. Vérifiez les permissions.')
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

const sendMemo = async () => {
  const memoData = {
    employeeId: props.employee.id,
    employeeName: props.employee.name,
    type: memoType.value,
    content: memoType.value === 'text' ? memoText.value : null,
    audioBlob: memoType.value === 'voice' ? audioBlob.value : null,
    priority: memoPriority.value,
    timestamp: new Date(),
    read: false
  }

  try {
    // await memoStore.addMemo(memoData)
    emit('memoSent', memoData)
    closeModal()
  } catch (error) {
    console.error('Erreur lors de l\'envoi du mémo:', error)
    alert('Erreur lors de l\'envoi du mémo')
  }
}

const closeModal = () => {
  // Nettoyer l'enregistrement en cours
  if (isRecording.value) {
    stopRecording()
  }
  deleteRecording()
  emit('close')
}

onUnmounted(() => {
  if (recordingInterval.value) {
    clearInterval(recordingInterval.value)
  }
  deleteRecording()
})
</script>

<style>
</style>