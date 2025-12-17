<template>
  <div class="memo-chat-container">
    <!-- Header -->
    <div class="memo-header">
      <button @click="goBack" class="back-button">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="back-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>

      <div class="employee-header-info">
        <div class="employee-avatar-small">
          <img v-if="employee?.avatar" :src="employee.avatar" :alt="employee.name">
          <div v-else class="avatar-placeholder-small">{{ employee?.initials || '?' }}</div>
        </div>
        <div class="employee-info-text">
          <h2 class="employee-name-header">{{ employee?.name || 'Chargement...' }}</h2>
          <p class="employee-position-header">{{ employee?.position || '' }}</p>
        </div>
      </div>

      <div class="header-actions">
        <button @click="showInfoPanel = !showInfoPanel" class="info-button">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="info-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="memo-content-wrapper">
      <!-- Messages Area -->
      <div class="messages-area" ref="messagesContainer">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Chargement des mémos...</p>
        </div>

        <div v-else-if="memos.length === 0" class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
          </svg>
          <h3>Aucun mémo</h3>
          <p>Commencez la conversation en envoyant un mémo</p>
        </div>

        <div v-else class="messages-list">
          <div
            v-for="memo in memos"
            :key="memo.id"
            :class="['message-item', memo.sender === 'manager' ? 'sent' : 'received']"
          >
            <div class="message-avatar" v-if="memo.sender === 'employee'">
              <img v-if="employee?.avatar" :src="employee.avatar" :alt="employee.name">
              <div v-else class="avatar-placeholder-msg">{{ employee?.initials || '?' }}</div>
            </div>

            <div class="message-content">
              <div class="message-header-info">
                <span class="message-sender">{{ memo.sender === 'manager' ? 'Vous' : employee?.name }}</span>
                <span class="message-time">{{ formatTime(memo.timestamp) }}</span>
              </div>
              <div class="message-bubble">
                <p class="message-text">{{ memo.content }}</p>
                <div v-if="memo.status" class="message-status">
                  <svg v-if="memo.status === 'sent'" class="status-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  <svg v-else-if="memo.status === 'read'" class="status-icon status-read" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div class="message-avatar" v-if="memo.sender === 'manager'">
              <div class="avatar-placeholder-msg manager">{{ userInitials }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Panel (Sidebar) -->
      <transition name="slide">
        <div v-if="showInfoPanel" class="info-panel">
          <div class="info-panel-header">
            <h3>Informations</h3>
            <button @click="showInfoPanel = false" class="close-panel-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="close-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div class="info-panel-content">
            <div class="employee-profile-section">
              <div class="employee-avatar-large">
                <img v-if="employee?.avatar" :src="employee.avatar" :alt="employee.name">
                <div v-else class="avatar-placeholder-large">{{ employee?.initials || '?' }}</div>
              </div>
              <h4 class="employee-name-panel">{{ employee?.name }}</h4>
              <p class="employee-position-panel">{{ employee?.position }}</p>
            </div>

            <div class="info-section">
              <h5 class="info-section-title">Contact</h5>
              <div class="info-item">
                <svg class="info-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                <span>{{ employee?.email }}</span>
              </div>
              <div class="info-item" v-if="employee?.phone">
                <svg class="info-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                </svg>
                <span>{{ employee.phone }}</span>
              </div>
            </div>

            <div class="info-section">
              <h5 class="info-section-title">Statistiques</h5>
              <div class="stats-item">
                <span class="stats-label">Ponctualité</span>
                <span class="stats-value">{{ employee?.punctualityScore || 0 }}%</span>
              </div>
              <div class="stats-item">
                <span class="stats-label">Mémos envoyés</span>
                <span class="stats-value">{{ sentMemosCount }}</span>
              </div>
              <div class="stats-item">
                <span class="stats-label">Mémos reçus</span>
                <span class="stats-value">{{ receivedMemosCount }}</span>
              </div>
            </div>

            <div class="info-actions">
              <button @click="viewEmployeeProfile" class="action-btn-panel">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="action-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                Voir le profil
              </button>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- Input Area -->
    <div class="memo-input-area">
      <div class="input-wrapper">
        <button @click="showEmojiPicker = !showEmojiPicker" class="emoji-button">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="emoji-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </button>

        <textarea
          v-model="newMemoContent"
          @keydown.enter.prevent="handleEnter"
          placeholder="Écrire un mémo..."
          class="memo-input"
          rows="1"
          ref="memoInput"
        ></textarea>

        <button
          @click="sendMemo"
          :disabled="!newMemoContent.trim()"
          class="send-button"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="send-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
        </button>
      </div>

      <div v-if="showEmojiPicker" class="emoji-picker">
        <button
          v-for="emoji in commonEmojis"
          :key="emoji"
          @click="addEmoji(emoji)"
          class="emoji-item"
        >
          {{ emoji }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/composables/userStore'
import UserService from '@/service/UserService'
import HeadBuilder from '@/utils/HeadBuilder'
import memoCss from "../../assets/css/toke-memo-08.css?url"

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// Refs
const loading = ref(true)
const employee = ref<any>(null)
const memos = ref<any[]>([])
const newMemoContent = ref('')
const showInfoPanel = ref(false)
const showEmojiPicker = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const memoInput = ref<HTMLTextAreaElement | null>(null)

// Emojis communs
const commonEmojis = ['👍', '👎', '✅', '❌', '⚠️', '📌', '🎯', '💼', '📊', '🔔', '⏰', '📅']

// Computed
const userInitials = computed(() => userStore.userInitials)

const sentMemosCount = computed(() =>
  memos.value.filter(m => m.sender === 'manager').length
)

const receivedMemosCount = computed(() =>
  memos.value.filter(m => m.sender === 'employee').length
)

// Fonctions
const formatTime = (timestamp: Date | string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

  if (diffInHours < 24) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } else if (diffInHours < 48) {
    return 'Hier ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const loadEmployee = async (employeeGuid: string) => {
  try {
    const managerGuid = userStore.user?.guid
    if (!managerGuid) return

    const response = await UserService.listSubordinates(managerGuid)

    if (response.success && response.data?.hierarchy) {
      const foundEmployee = response.data.hierarchy.find((emp: any) => emp.user.guid === employeeGuid)

      if (foundEmployee) {
        const userData = foundEmployee.user
        const firstName = userData.first_name || ''
        const lastName = userData.last_name || ''
        const fullName = foundEmployee.full_name || `${firstName} ${lastName}`.trim()
        const initials = firstName && lastName
          ? `${firstName[0]}${lastName[0]}`.toUpperCase()
          : fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

        employee.value = {
          id: userData.guid,
          name: fullName,
          email: userData.email,
          position: foundEmployee.roles?.[0]?.role || 'N/A',
          phone: userData.phone_number,
          avatar: userData.avatar_url,
          initials: initials,
          punctualityScore: Math.floor(Math.random() * 30) + 70
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement de l\'employé:', error)
  }
}

const loadMemos = async () => {
  // Simulation de chargement des mémos
  // TODO: Remplacer par un vrai appel API
  await new Promise(resolve => setTimeout(resolve, 800))

  memos.value = [
    {
      id: 1,
      sender: 'manager',
      content: 'Bonjour, pouvez-vous me faire un rapport sur votre avancement ?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'read'
    },
    {
      id: 2,
      sender: 'employee',
      content: 'Bonjour, bien sûr. Je vous envoie ça dans la journée.',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      status: 'read'
    },
    {
      id: 3,
      sender: 'manager',
      content: 'Parfait, merci !',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      status: 'sent'
    }
  ]

  loading.value = false
  scrollToBottom()
}

const sendMemo = async () => {
  if (!newMemoContent.value.trim()) return

  const newMemo = {
    id: Date.now(),
    sender: 'manager',
    content: newMemoContent.value.trim(),
    timestamp: new Date(),
    status: 'sent'
  }

  memos.value.push(newMemo)
  newMemoContent.value = ''
  showEmojiPicker.value = false

  scrollToBottom()

  // TODO: Envoyer le mémo à l'API
  console.log('Mémo envoyé:', newMemo)
}

const handleEnter = (event: KeyboardEvent) => {
  if (!event.shiftKey) {
    sendMemo()
  }
}

const addEmoji = (emoji: string) => {
  newMemoContent.value += emoji
  memoInput.value?.focus()
}

const goBack = () => {
  router.push('/equipe')
}

const viewEmployeeProfile = () => {
  if (employee.value) {
    router.push(`/equipe/${employee.value.id}`)
  }
}

// Lifecycle
onMounted(async () => {
  const employeeId = route.params.employeeId as string

  await loadEmployee(employeeId)
  await loadMemos()

  HeadBuilder.apply({
    title: `Mémos - ${employee.value?.name || 'Employé'} - Toké`,
    css: [memoCss],
    meta: { viewport: 'width=device-width, initial-scale=1.0' }
  })
})

// Watcher pour auto-resize du textarea
watch(newMemoContent, () => {
  if (memoInput.value) {
    memoInput.value.style.height = 'auto'
    memoInput.value.style.height = memoInput.value.scrollHeight + 'px'
  }
})
</script>

<style scoped>
/* Les styles sont dans le fichier CSS externe */
</style>