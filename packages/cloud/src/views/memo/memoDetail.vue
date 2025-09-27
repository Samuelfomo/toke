<template>
  <div class="memo-detail-container">
    <!-- Header -->
    <div class="memo-detail-header">
      <button @click="goBack" class="back-btn">
        <IconArrowLeft />
      </button>
      <div class="header-info">
        <h1 class="memo-title">{{ memo?.subject || 'Mémo sans objet' }}</h1>
        <div class="memo-meta">
          <span :class="['memo-status', 'status-' + memo?.status]">
            <IconCheck v-if="memo?.status === 'sent'" />
            <IconEdit v-else />
            {{ memo?.status === 'sent' ? 'Envoyé' : 'Brouillon' }}
          </span>
          <span :class="['memo-priority', 'priority-' + memo?.priority]">
            <IconAlertTriangle v-if="memo?.priority === 'high'" />
            <IconAlertCircle v-else-if="memo?.priority === 'medium'" />
            <IconCircle v-else />
            {{ getPriorityLabel(memo?.priority || 'medium') }}
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button v-if="memo?.status === 'draft'" @click="editMemo" class="action-btn edit-btn">
          <IconEdit />
          <span>Modifier</span>
        </button>
        <button @click="duplicateMemo" class="action-btn duplicate-btn">
          <IconCopy />
          <span>Dupliquer</span>
        </button>
        <button @click="deleteMemo" class="action-btn delete-btn">
          <IconTrash />
          <span>Supprimer</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Chargement du mémo...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <IconAlertCircle class="error-icon" />
      <h3>Erreur</h3>
      <p>{{ error }}</p>
      <button @click="goBack" class="error-action-btn">Retour à la liste</button>
    </div>

    <!-- Memo Content -->
    <div v-else-if="memo" class="memo-detail-content">
      <!-- Recipient Information -->
      <div class="memo-section">
        <h3 class="section-title">
          <IconUser class="section-icon" />
          Destinataire
        </h3>
        <div class="recipient-card">
          <div class="recipient-avatar-large">
            {{ getEmployeeInitials(memo.employeeId) }}
          </div>
          <div class="recipient-details">
            <h4 class="recipient-name">{{ getEmployeeName(memo.employeeId) }}</h4>
            <p class="recipient-role">{{ getEmployeeRole(memo.employeeId) }}</p>
            <div class="recipient-status">
              <span :class="['status-indicator', 'status-' + getEmployeeStatus(memo.employeeId)]"></span>
              {{ getEmployeeStatusText(memo.employeeId) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Memo Information -->
      <div class="memo-section">
        <h3 class="section-title">
          <IconInfoCircle class="section-icon" />
          Informations du mémo
        </h3>
        <div class="memo-info-grid">
          <div class="info-item">
            <label>Date de création</label>
            <span>{{ formatFullDate(memo.createdAt) }}</span>
          </div>
          <div class="info-item">
            <label>Statut</label>
            <span :class="['status-badge', 'status-' + memo.status]">
              <IconCheck v-if="memo.status === 'sent'" />
              <IconEdit v-else />
              {{ memo.status === 'sent' ? 'Envoyé' : 'Brouillon' }}
            </span>
          </div>
          <div class="info-item">
            <label>Priorité</label>
            <span :class="['priority-badge', 'priority-' + memo.priority]">
              <IconAlertTriangle v-if="memo.priority === 'high'" />
              <IconAlertCircle v-else-if="memo.priority === 'medium'" />
              <IconCircle v-else />
              {{ getPriorityLabel(memo.priority) }}
            </span>
          </div>
          <div class="info-item">
            <label>ID du mémo</label>
            <span class="memo-id">{{ memo.id }}</span>
          </div>
        </div>
      </div>

      <!-- Message Content -->
      <div class="memo-section">
        <h3 class="section-title">
          <IconMessage class="section-icon" />
          Message
        </h3>
        <div class="message-content">
          <div class="message-text">{{ memo.message || 'Aucun message' }}</div>
        </div>
      </div>

      <!-- Voice Note -->
      <div v-if="memo.voiceNote" class="memo-section">
        <h3 class="section-title">
          <IconMicrophone class="section-icon" />
          Note vocale
        </h3>
        <div class="voice-note-player">
          <audio :src="getVoiceNoteUrl(memo.voiceNote)" controls class="audio-player">
            Votre navigateur ne supporte pas l'élément audio.
          </audio>
          <div class="voice-note-info">
            <IconMicrophone class="voice-icon" />
            <span>Note vocale jointe</span>
          </div>
        </div>
      </div>

      <!-- Attachments -->
      <div v-if="memo.attachments && memo.attachments.length > 0" class="memo-section">
        <h3 class="section-title">
          <IconPaperclip class="section-icon" />
          Pièces jointes ({{ memo.attachments.length }})
        </h3>
        <div class="attachments-grid">
          <div
            v-for="(file, index) in memo.attachments"
            :key="index"
            class="attachment-card"
            @click="downloadAttachment(file, index)"
          >
            <div class="attachment-icon">
              <IconFile v-if="getFileType(file.name) === 'document'" />
              <IconPhoto v-else-if="getFileType(file.name) === 'image'" />
              <IconFileText v-else />
            </div>
            <div class="attachment-info">
              <div class="attachment-name">{{ file.name }}</div>
              <div class="attachment-size">{{ formatFileSize(file.size) }}</div>
            </div>
            <div class="attachment-actions">
              <button class="download-btn" title="Télécharger">
                <IconDownload />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline/History -->
      <div class="memo-section">
        <h3 class="section-title">
          <IconClock class="section-icon" />
          Historique
        </h3>
        <div class="timeline">
          <div class="timeline-item">
            <div class="timeline-marker created"></div>
            <div class="timeline-content">
              <div class="timeline-title">Mémo créé</div>
              <div class="timeline-date">{{ formatFullDate(memo.createdAt) }}</div>
            </div>
          </div>
          <div v-if="memo.status === 'sent'" class="timeline-item">
            <div class="timeline-marker sent"></div>
            <div class="timeline-content">
              <div class="timeline-title">Mémo envoyé</div>
              <div class="timeline-date">{{ formatFullDate(memo.createdAt) }}</div>
              <div class="timeline-subtitle">Envoyé à {{ getEmployeeName(memo.employeeId) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HeadBuilder from '@/utils/HeadBuilder'
import memoDetailCss from "../../assets/css/toke-memoDetail-11.css?url"

import {
  IconArrowLeft,
  IconCheck,
  IconEdit,
  IconAlertTriangle,
  IconAlertCircle,
  IconCircle,
  IconCopy,
  IconTrash,
  IconUser,
  IconInfoCircle,
  IconMessage,
  IconMicrophone,
  IconPaperclip,
  IconClock,
  IconFile,
  IconPhoto,
  IconFileText,
  IconDownload
} from '@tabler/icons-vue'

interface Employee {
  id: number
  name: string
  initials: string
  status: 'absent' | 'late' | 'present' | 'info'
  statusText: string
  role?: string
}

interface Memo {
  id: string
  subject: string
  message: string
  priority: 'low' | 'medium' | 'high'
  employeeId: number
  attachments: File[]
  voiceNote?: Blob
  createdAt: Date
  status: 'draft' | 'sent'
}

const route = useRoute()
const router = useRouter()

// State
const memo = ref<Memo | null>(null)
const loading = ref(true)
const error = ref<string>('')

// Mock employees data
const employees = ref<Employee[]>([
  { id: 1, name: 'Jean Dupont', initials: 'JD', status: 'present', statusText: 'Présent', role: 'Développeur Senior' },
  { id: 2, name: 'Marie Martin', initials: 'MM', status: 'late', statusText: 'En retard', role: 'Designer UX/UI' },
  { id: 3, name: 'Pierre Durand', initials: 'PD', status: 'absent', statusText: 'Absent', role: 'Chef de projet' },
  { id: 4, name: 'Sophie Leblanc', initials: 'SL', status: 'present', statusText: 'Présent', role: 'Analyste Business' },
  { id: 5, name: 'Lucas Bernard', initials: 'LB', status: 'present', statusText: 'Présent', role: 'Développeur Frontend' }
])

// Methods
const loadMemo = async () => {
  try {
    loading.value = true
    error.value = ''

    const memoId = route.params.memoId as string
    const savedMemos = localStorage.getItem('memos')

    if (!savedMemos) {
      error.value = 'Aucun mémo trouvé'
      return
    }

    const memos: any[] = JSON.parse(savedMemos)
    const foundMemo = memos.find(m => m.id === memoId)

    if (!foundMemo) {
      error.value = 'Mémo introuvable'
      return
    }

    memo.value = {
      ...foundMemo,
      createdAt: new Date(foundMemo.createdAt)
    }
  } catch (err) {
    error.value = 'Erreur lors du chargement du mémo'
    console.error('Erreur:', err)
  } finally {
    loading.value = false
  }
}

const getEmployeeName = (employeeId: number): string => {
  const employee = employees.value.find(emp => emp.id === employeeId)
  return employee?.name || 'Employé inconnu'
}

const getEmployeeInitials = (employeeId: number): string => {
  const employee = employees.value.find(emp => emp.id === employeeId)
  return employee?.initials || 'EI'
}

const getEmployeeRole = (employeeId: number): string => {
  const employee = employees.value.find(emp => emp.id === employeeId)
  return employee?.role || 'Poste non défini'
}

const getEmployeeStatus = (employeeId: number): string => {
  const employee = employees.value.find(emp => emp.id === employeeId)
  return employee?.status || 'info'
}

const getEmployeeStatusText = (employeeId: number): string => {
  const employee = employees.value.find(emp => emp.id === employeeId)
  return employee?.statusText || 'Statut inconnu'
}

const getPriorityLabel = (priority: string): string => {
  const labels = {
    low: 'Faible',
    medium: 'Moyenne',
    high: 'Élevée'
  }
  return labels[priority as keyof typeof labels] || priority
}

const formatFullDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileType = (filename: string): 'document' | 'image' | 'other' => {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '')) return 'image'
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return 'document'
  return 'other'
}

const getVoiceNoteUrl = (blob: Blob): string => {
  return URL.createObjectURL(blob)
}

const downloadAttachment = (file: File, index: number) => {
  // Create download link
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const editMemo = () => {
  router.push({
    name: 'memo-edit',
    params: { memoId: memo.value?.id }
  })
}

const duplicateMemo = () => {
  if (!memo.value) return

  try {
    const newMemo = {
      ...memo.value,
      id: Date.now().toString(),
      subject: `Copie - ${memo.value.subject}`,
      status: 'draft' as const,
      createdAt: new Date()
    }

    const savedMemos = localStorage.getItem('memos')
    const memos = savedMemos ? JSON.parse(savedMemos) : []
    memos.unshift(newMemo)
    localStorage.setItem('memos', JSON.stringify(memos))

    alert('Mémo dupliqué avec succès')
    router.push('/memos')
  } catch (err) {
    console.error('Erreur lors de la duplication:', err)
    alert('Erreur lors de la duplication')
  }
}

const deleteMemo = () => {
  if (!memo.value) return

  if (confirm('Êtes-vous sûr de vouloir supprimer ce mémo ?')) {
    try {
      const savedMemos = localStorage.getItem('memos')
      if (savedMemos) {
        const memos = JSON.parse(savedMemos)
        const filteredMemos = memos.filter((m: any) => m.id !== memo.value?.id)
        localStorage.setItem('memos', JSON.stringify(filteredMemos))
      }

      alert('Mémo supprimé avec succès')
      router.push('/memos')
    } catch (err) {
      console.error('Erreur lors de la suppression:', err)
      alert('Erreur lors de la suppression')
    }
  }
}

const goBack = () => {
  router.push('/memos')
}

onMounted(() => {
  HeadBuilder.apply({
    title: 'Détails du Mémo - Toké',
    css: [memoDetailCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })

  loadMemo()
})
</script>