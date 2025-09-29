<template>
  <div class="memo-list-container">
    <!-- Header -->
    <div class="memo-list-header">
      <button @click="goBack" class="back-btn">
        <IconArrowLeft />
      </button>
      <div class="header-content">
        <h1 class="page-title">
          {{ isEmployeeSpecific ? `Mémos - ${targetEmployee?.name}` : 'Historique des Mémos' }}
        </h1>
        <div v-if="isEmployeeSpecific" class="employee-summary">
          <div class="employee-avatar-mini">{{ targetEmployee?.initials }}</div>
          <span class="memo-count">{{ filteredMemos.length }} mémo(s)</span>
        </div>
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
          {{ isEmployeeSpecific
          ? `Aucun mémo n'a encore été envoyé à ${targetEmployee?.name}.`
          : (searchQuery ? 'Aucun mémo ne correspond à votre recherche.' : 'Vous n\'avez encore envoyé aucun mémo.')
          }}
        </p>
      </div>

      <div v-else class="memo-grid">
        <div
          v-for="memo in filteredMemos"
          :key="memo.id"
          class="memo-card"
          @click="viewMemo(memo)"
        >
          <div class="memo-card-header">
            <div class="memo-status-priority">
              <span :class="['memo-status', 'status-' + memo.status]">
                <IconCheck v-if="memo.status === 'sent'" />
                <IconEdit v-else />
                {{ memo.status === 'sent' ? 'Envoyé' : 'Brouillon' }}
              </span>
              <span v-if="memo.updatedAt" class="updated-badge" title="Modifié">
                <IconEdit class="icon-xs" />
              </span>
            </div>

            <div class="memo-actions-menu">
              <button @click.stop="toggleMemoActions(memo.id)" class="action-menu-btn">
                <IconDots />
              </button>
              <div v-if="activeMenuId === memo.id" class="action-menu-dropdown">
                <button @click.stop="editMemo(memo)" class="menu-item">
                  <IconEdit />
                  <span>Modifier</span>
                </button>
                <button @click.stop="copyMemo(memo)" class="menu-item">
                  <IconCopy />
                  <span>Copier</span>
                </button>
                <button @click.stop="deleteMemo(memo.id)" class="menu-item delete">
                  <IconTrash />
                  <span>Supprimer</span>
                </button>
              </div>
            </div>
          </div>

          <div class="memo-card-content">
            <h3 class="memo-subject">{{ memo.subject || 'Sans objet' }}</h3>
            <p class="memo-preview">{{ getMessagePreview(memo.message) }}</p>

            <!-- Affichage du destinataire si pas vue employé spécifique -->
<!--            <div v-if="!isEmployeeSpecific" class="memo-recipient">-->
<!--              <div class="recipient-avatar">-->
<!--                {{ getEmployeeInitials(memo.employeeId) }}-->
<!--              </div>-->
<!--              <span class="recipient-name">{{ getEmployeeName(memo.employeeId) }}</span>-->
<!--            </div>-->
          </div>

          <div class="memo-card-footer">
            <div class="memo-attachments" v-if="memo.attachments?.length > 0 || memo.voiceNote">
              <div v-if="memo.attachments?.length > 0" class="attachment-indicator">
                <IconPaperclip />
                <span>{{ memo.attachments.length }}</span>
              </div>
              <div v-if="memo.voiceNote" class="voice-indicator">
                <IconMicrophone />
              </div>
            </div>

            <div class="memo-datetime">
              <div class="memo-date">
                <IconCalendar />
                <span>{{ formatDate(memo.createdAt) }}</span>
              </div>
              <div class="memo-time">
                <IconClock />
                <span>{{ formatTime(memo.createdAt) }}</span>
              </div>
              <div v-if="memo.updatedAt" class="memo-updated">
                <IconEdit class="icon-xs" />
                <span class="updated-text">Modifié le {{ formatDateTime(memo.updatedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
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
import { useRouter, useRoute } from 'vue-router'
import HeadBuilder from '@/utils/HeadBuilder'
import memoListCss from "../../assets/css/toke-memoList-10.css?url"

import {
  IconArrowLeft,
  IconPlus,
  IconFileX,
  IconCheck,
  IconEdit,
  IconDots,
  IconCopy,
  IconTrash,
  IconPaperclip,
  IconMicrophone,
  IconCalendar,
  IconClock,
  IconX,
  IconSearch,
} from '@tabler/icons-vue'

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

interface Memo {
  id: string
  subject: string
  message: string
  priority: 'low' | 'medium' | 'high'
  employeeId: number
  attachments: File[]
  voiceNote?: Blob
  createdAt: Date
  updatedAt?: Date
  status: 'draft' | 'sent'
}

const router = useRouter()
const route = useRoute()

// State
const memos = ref<Memo[]>([])
const searchQuery = ref('')
const selectedStatus = ref('all')
const selectedEmployee = ref('all')
const activeMenuId = ref<string | null>(null)
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

// Check si on vient d'un profil employé spécifique
const targetEmployeeId = ref<number | null>(
  route.query.employeeId ? Number(route.query.employeeId) : null
)

const isEmployeeSpecific = computed(() => targetEmployeeId.value !== null)

// IMPORT DES DONNÉES DEPUIS EMPLOYEESTATUSLIST
// Fonction pour récupérer les employés depuis localStorage ou autre source
const loadEmployees = (): Employee[] => {
  // Option 1: Si vous stockez les employés dans localStorage
  try {
    const savedEmployees = localStorage.getItem('employees')
    if (savedEmployees) {
      return JSON.parse(savedEmployees)
    }
  } catch (error) {
    console.error('Erreur lors du chargement des employés:', error)
  }
  return []
}

// Charger les employés
const employees = ref<Employee[]>(loadEmployees())

// Employé cible si vue spécifique
const targetEmployee = computed(() => {
  if (!targetEmployeeId.value) return null

  // D'abord chercher dans les employés chargés
  // const foundEmployee = employees.value.find(emp => emp.id === targetEmployeeId.value)
  //
  // if (foundEmployee) {
  //   return foundEmployee
  // }

  // Si pas trouvé, utiliser les données de l'URL
  return {
    id: targetEmployeeId.value,
    name: decodeURIComponent(route.query.employeeName as string || 'Employé inconnu'),
    initials: route.query.employeeInitials as string || 'EI',
    status: route.query.employeeStatus as any || 'info',
    statusText: decodeURIComponent(route.query.employeeStatusText as string || 'Statut inconnu'),
    location: route.query.employeeLocation as string || ''
  }
})

// Computed properties
const filteredMemos = computed(() => {
  let filtered = memos.value

  // Si vue employé spécifique, filtrer par employé
  if (isEmployeeSpecific.value && targetEmployeeId.value) {
    filtered = filtered.filter(memo => memo.employeeId === targetEmployeeId.value)
  }

  // Filter by search query (seulement si pas vue employé spécifique)
  if (!isEmployeeSpecific.value && searchQuery.value) {
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

  // Filter by employee (seulement si pas vue employé spécifique)
  if (!isEmployeeSpecific.value && selectedEmployee.value !== 'all') {
    filtered = filtered.filter(memo => memo.employeeId === Number(selectedEmployee.value))
  }

  return filtered.sort((a, b) => {
    const dateA = a.updatedAt || a.createdAt
    const dateB = b.updatedAt || b.createdAt
    return new Date(dateB).getTime() - new Date(dateA).getTime()
  })
})

const uniqueEmployees = computed(() => {
  const employeeIds = [...new Set(memos.value.map(memo => memo.employeeId))]
  return employeeIds.map(id => employees.value.find(emp => emp.id === id)).filter(Boolean) as Employee[]
})

// Methods
const loadMemos = () => {
  try {
    const savedMemos = localStorage.getItem('memos')
    if (savedMemos) {
      const parsed = JSON.parse(savedMemos)
      memos.value = parsed.map((memo: any) => ({
        ...memo,
        createdAt: new Date(memo.createdAt),
        updatedAt: memo.updatedAt ? new Date(memo.updatedAt) : undefined,
        attachments: memo.attachments || [],
        voiceNote: memo.voiceNote ? memo.voiceNote : undefined
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

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateTime = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true

  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

const createNewMemo = () => {
  // Si vue employé spécifique, pré-remplir l'employé
  if (isEmployeeSpecific.value && targetEmployee.value) {
    router.push({
      path: '/memo',
      query: {
        employeeId: targetEmployee.value.id.toString(),
        employeeName: targetEmployee.value.name,
        employeeInitials: targetEmployee.value.initials,
        employeeStatus: targetEmployee.value.status,
        employeeStatusText: targetEmployee.value.statusText,
        employeeLocation: targetEmployee.value.location || ''
      }
    })
  } else {
    router.push('/memo')
  }
}

const viewMemo = (memo: Memo) => {
  // Optionnel: afficher les détails du mémo
  console.log('Voir le mémo:', memo)
}

const editMemo = (memo: Memo) => {
  // Récupérer les informations de l'employé
  let employee = employees.value.find(emp => emp.id === memo.employeeId)

  // Si pas trouvé dans la liste et qu'on est en vue employé spécifique, utiliser l'employé cible
  if (!employee && targetEmployee.value && memo.employeeId === targetEmployee.value.id) {
    employee = targetEmployee.value
  }

  // Si toujours pas trouvé, créer un employé par défaut
  if (!employee) {
    employee = {
      id: memo.employeeId,
      name: 'Employé inconnu',
      initials: 'EI',
      status: 'info',
      statusText: 'Statut inconnu'
    }
  }

  // Naviguer vers la page de création/édition avec toutes les données du mémo
  router.push({
    path: '/memo',
    query: {
      editMemoId: memo.id,
      employeeId: memo.employeeId.toString(),
      employeeName: employee.name,
      employeeInitials: employee.initials,
      employeeStatus: employee.status,
      employeeStatusText: employee.statusText,
      employeeLocation: employee.location || ''
    }
  })

  activeMenuId.value = null
}

const copyMemo = async (memo: Memo) => {
  try {
    let copyText = `Objet: ${memo.subject}\n\nMessage:\n${memo.message}\n\n`

    if (memo.attachments?.length > 0) {
      copyText += `Pièces jointes (${memo.attachments.length}):\n`
      memo.attachments.forEach((file) => {
        copyText += `- ${file.name}\n`
      })
      copyText += '\n'
    }

    if (memo.voiceNote) {
      copyText += 'Note vocale incluse\n\n'
    }

    copyText += `Statut: ${memo.status === 'sent' ? 'Envoyé' : 'Brouillon'}\n`
    copyText += `Date de création: ${formatDateTime(memo.createdAt)}\n`
    if (memo.updatedAt) {
      copyText += `Dernière modification: ${formatDateTime(memo.updatedAt)}\n`
    }
    copyText += `Destinataire: ${getEmployeeName(memo.employeeId)}`

    await navigator.clipboard.writeText(copyText)
    showToastMessage('Mémo copié dans le presse-papiers')
  } catch (error) {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = copyText
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)

      showToastMessage('Mémo copié dans le presse-papiers')
    } catch (fallbackError) {
      showToastMessage('Erreur lors de la copie', 'error')
    }
  }

  activeMenuId.value = null
}

const deleteMemo = (memoId: string) => {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce mémo ?')) {
    const index = memos.value.findIndex(memo => memo.id === memoId)
    if (index > -1) {
      memos.value.splice(index, 1)
      saveMemos()
      showToastMessage('Mémo supprimé avec succès')
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
  if (isEmployeeSpecific.value) {
    // Retourner au profil de l'employé
    router.push({
      name: 'employeeD',
      params: { employeeId: targetEmployeeId.value?.toString() },
      query: {
        employeeName: targetEmployee.value?.name,
        employeeInitials: targetEmployee.value?.initials,
        employeeStatus: targetEmployee.value?.status,
        employeeStatusText: targetEmployee.value?.statusText,
        employeeLocation: targetEmployee.value?.location || ''
      }
    })
  } else {
    router.push('/employeeD')
  }
}

// Click outside to close menu
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.memo-actions-menu')) {
    activeMenuId.value = null
  }
}

onMounted(() => {
  const title = isEmployeeSpecific.value
    ? `Mémos - ${targetEmployee.value?.name} - Toké`
    : 'Historique des Mémos - Toké'

  HeadBuilder.apply({
    title,
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

<style scoped>
.employee-summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.employee-avatar-mini {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.75rem;
}

.memo-count {
  background: #3b82f6;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
}

.memo-filters {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.search-section {
  margin-bottom: 1rem;
}

.search-input-wrapper {
  position: relative;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  width: 20px;
  height: 20px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
}

.filter-section {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-select {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 0.9rem;
  min-width: 150px;
}

.updated-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: #f59e0b;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
}

.icon-xs {
  width: 12px;
  height: 12px;
}

.memo-recipient {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f3f4f6;
}

.recipient-avatar {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.7rem;
}

.recipient-name {
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 500;
}

.memo-datetime {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.memo-date, .memo-time {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.memo-updated {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  color: #f59e0b;
  font-style: italic;
  margin-top: 0.25rem;
}

.updated-text {
  font-size: 0.7rem;
}

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

@media (max-width: 768px) {
  .filter-section {
    flex-direction: column;
  }

  .filter-select {
    min-width: auto;
  }
}
</style>