<template>
  <div class="memo-list-container">
    <!-- Header -->
    <div class="memo-list-header">
      <button @click="goBack" class="back-btn">
        <IconArrowLeft />
      </button>
      <div class="header-content">
        <h1 class="page-title">Historique des Mémos</h1>
<!--        <div class="memo-stats">-->
<!--          <div class="stat-item">-->
<!--            <span class="stat-number">{{ totalMemos }}</span>-->
<!--            <span class="stat-label">Total</span>-->
<!--          </div>-->
<!--          <div class="stat-item">-->
<!--            <span class="stat-number">{{ sentMemos }}</span>-->
<!--            <span class="stat-label">Envoyés</span>-->
<!--          </div>-->
<!--          <div class="stat-item">-->
<!--            <span class="stat-number">{{ draftMemos }}</span>-->
<!--            <span class="stat-label">Brouillons</span>-->
<!--          </div>-->
<!--        </div>-->
      </div>
      <button @click="createNewMemo" class="new-memo-btn">
        <IconPlus />
        <span>Nouveau Mémo</span>
      </button>
    </div>
    <!-- Memo List -->
    <div class="memo-list-content">
      <div v-if="filteredMemos.length === 0" class="empty-state">
        <IconFileX class="empty-icon" />
        <h3 class="empty-title">Aucun mémo trouvé</h3>
        <p class="empty-message">
          {{ searchQuery ? 'Aucun mémo ne correspond à votre recherche.' : 'Vous n\'avez encore envoyé aucun mémo.' }}
        </p>
        <button @click="createNewMemo" class="empty-action-btn">
          <IconPlus />
          <span>Créer le premier mémo</span>
        </button>
      </div>

      <div v-else class="memo-grid">
        <div
          v-for="memo in filteredMemos"
          :key="memo.id"
          class="memo-card"
          @click="viewMemo(memo)"
        >
          <div class="memo-card-content">
            <h3 class="memo-subject">{{ memo.subject || 'Sans objet' }}</h3>
            <p class="memo-preview">{{ getMessagePreview(memo.message) }}</p>

<!--            <div class="memo-recipient">-->
<!--              <div class="recipient-avatar">-->
<!--                {{ getEmployeeInitials(memo.employeeId) }}-->
<!--              </div>-->
<!--              <span class="recipient-name">{{ getEmployeeName(memo.employeeId) }}</span>-->
<!--            </div>-->
          </div>

          <div class="memo-card-footer">
            <div class="memo-attachments" v-if="memo.attachments.length > 0 || memo.voiceNote">
              <div v-if="memo.attachments.length > 0" class="attachment-indicator">
                <IconPaperclip />
                <span>{{ memo.attachments.length }}</span>
              </div>
              <div v-if="memo.voiceNote" class="voice-indicator">
                <IconMicrophone />
              </div>
            </div>

            <div class="memo-date">
              <IconCalendar />
              <span>{{ formatDate(memo.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import HeadBuilder from '@/utils/HeadBuilder'
import memoListCss from "../../assets/css/toke-memoList-10.css?url"

import {
  IconArrowLeft,
  IconPlus,
  IconSearch,
  IconFileX,
  IconCheck,
  IconEdit,
  IconAlertTriangle,
  IconAlertCircle,
  IconCircle,
  IconDots,
  IconCopy,
  IconTrash,
  IconPaperclip,
  IconMicrophone,
  IconCalendar
} from '@tabler/icons-vue'

interface Employee {
  id: number
  name: string
  initials: string
  status: 'absent' | 'late' | 'present' | 'info'
  statusText: string
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

const router = useRouter()

// State
const memos = ref<Memo[]>([])
const searchQuery = ref('')
const selectedStatus = ref('all')
const selectedPriority = ref('all')
const selectedEmployee = ref('all')
const activeMenuId = ref<string | null>(null)

// Mock employees data - À remplacer par des données réelles
const employees = ref<Employee[]>([
  { id: 1, name: 'Jean Dupont', initials: 'JD', status: 'present', statusText: 'Présent' },
  { id: 2, name: 'Marie Martin', initials: 'MM', status: 'late', statusText: 'En retard' },
  { id: 3, name: 'Pierre Durand', initials: 'PD', status: 'absent', statusText: 'Absent' },
  { id: 4, name: 'Sophie Leblanc', initials: 'SL', status: 'present', statusText: 'Présent' },
  { id: 5, name: 'Lucas Bernard', initials: 'LB', status: 'present', statusText: 'Présent' }
])

// Computed properties
const filteredMemos = computed(() => {
  let filtered = memos.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(memo =>
      memo.subject.toLowerCase().includes(query) ||
      memo.message.toLowerCase().includes(query) ||
      getEmployeeName(memo.employeeId).toLowerCase().includes(query)
    )
  }

  // Filter by status
  if (selectedStatus.value !== 'all') {
    filtered = filtered.filter(memo => memo.status === selectedStatus.value)
  }

  // Filter by priority
  if (selectedPriority.value !== 'all') {
    filtered = filtered.filter(memo => memo.priority === selectedPriority.value)
  }

  // Filter by employee
  if (selectedEmployee.value !== 'all') {
    filtered = filtered.filter(memo => memo.employeeId === Number(selectedEmployee.value))
  }

  // Sort by date (most recent first)
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const uniqueEmployees = computed(() => {
  const employeeIds = [...new Set(memos.value.map(memo => memo.employeeId))]
  return employeeIds.map(id => employees.value.find(emp => emp.id === id)).filter(Boolean) as Employee[]
})

const totalMemos = computed(() => memos.value.length)
const sentMemos = computed(() => memos.value.filter(memo => memo.status === 'sent').length)
const draftMemos = computed(() => memos.value.filter(memo => memo.status === 'draft').length)

// Methods
const loadMemos = () => {
  try {
    const savedMemos = localStorage.getItem('memos')
    if (savedMemos) {
      const parsed = JSON.parse(savedMemos)
      memos.value = parsed.map((memo: any) => ({
        ...memo,
        createdAt: new Date(memo.createdAt)
      }))
    }
  } catch (error) {
    console.error('Erreur lors du chargement des mémos:', error)
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

const getPriorityLabel = (priority: string): string => {
  const labels = {
    low: 'Faible',
    medium: 'Moyenne',
    high: 'Élevée'
  }
  return labels[priority as keyof typeof labels] || priority
}

const getMessagePreview = (message: string): string => {
  return message.length > 100 ? message.substring(0, 100) + '...' : message
}

const formatDate = (date: Date): string => {
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Aujourd\'hui'
  } else if (diffDays === 1) {
    return 'Hier'
  } else if (diffDays < 7) {
    return `Il y a ${diffDays} jours`
  } else {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }
}

const createNewMemo = () => {
  router.push('/memo')
}

const viewMemo = (memo: Memo) => {
  router.push({
    name: 'memo-detail',
    params: { memoId: memo.id }
  })
}

const editMemo = (memo: Memo) => {
  router.push({
    name: 'memo-edit',
    params: { memoId: memo.id }
  })
}

const duplicateMemo = (memo: Memo) => {
  const newMemo = {
    ...memo,
    id: Date.now().toString(),
    subject: `Copie - ${memo.subject}`,
    status: 'draft' as const,
    createdAt: new Date()
  }

  memos.value.unshift(newMemo)
  saveMemos()
  activeMenuId.value = null
}

const deleteMemo = (memoId: string) => {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce mémo ?')) {
    const index = memos.value.findIndex(memo => memo.id === memoId)
    if (index > -1) {
      memos.value.splice(index, 1)
      saveMemos()
    }
  }
  activeMenuId.value = null
}

const toggleMemoActions = (memoId: string) => {
  activeMenuId.value = activeMenuId.value === memoId ? null : memoId
}

const saveMemos = () => {
  try {
    localStorage.setItem('memos', JSON.stringify(memos.value))
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
  }
}

const goBack = () => {
  router.push('/employeeD')
}

// Click outside to close menu
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.memo-actions-menu')) {
    activeMenuId.value = null
  }
}

onMounted(() => {
  HeadBuilder.apply({
    title: 'Historique des Mémos - Toké',
    css: [memoListCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })

  loadMemos()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>