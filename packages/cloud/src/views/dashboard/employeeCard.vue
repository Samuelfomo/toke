<template>
  <div :class="['employee-card', { 'has-issue': employee.priority === 'high' }]">
    <div class="employee-main">
      <div class="employee-avatar">
        <div class="avatar-employee">{{ employee.initials }}</div>
        <div :class="['status-indicator', 'indicator-' + employee.status]"></div>
      </div>
      <div class="employee-info">
        <h3 class="employee-name">{{ employee.name }}</h3>
        <div class="employee-status">
          <svg v-if="employee.status === 'present'" class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>

          <svg v-else-if="employee.status === 'absent'" class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>

          <svg v-else-if="employee.status === 'late'" class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>

          <svg v-else-if="employee.status === 'info'" class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-1.5 8.5A2 2 0 009.5 21h5a2 2 0 002-1.5L15 12"></path>
          </svg>
          <span class="status-text">{{ employee.statusText }}</span>
        </div>
        <div v-if="employee.time" class="time-info">
          {{ employee.time }}
        </div>
        <div v-if="employee.location" class="context-info">
          {{ employee.location }}
        </div>
      </div>
    </div>
    <div class="employee-actions">
      <a href="#" class="action-btn-small action-primary" v-if="employee.status === 'late' && !employee.isValidated">
        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>Valider</span>
      </a>

      <a href="#" class="action-btn-small action-primary" v-if="employee.status === 'absent' && !employee.isJustified">
        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
          </path>
        </svg>
        <span>Justifier</span>
      </a>

      <button @click="openMemoChat" class="action-btn-small action-primary" v-if="employee.status === 'absent' && !employee.isJustified">
        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
          </path>
        </svg>
        <span>Memo</span>
      </button>

      <a href="#" class="action-btn-small action-warning" v-if="employee.status === 'late' && !employee.isValidated">
        <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
        <span>Avertir</span>
      </a>

      <div class="employee-issue" v-if="employee.status === 'absent' && !employee.isJustified">
        <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
        <span class="issue-text">Absence non justifie</span>
      </div>

      <div class="employee-validated" v-if="employee.status === 'late' && employee.isValidated">
        <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span class="validated-text">Retard valide</span>
      </div>
    </div>

    <Memo
      v-if="showMemoChat"
      :employee="employee"
      @goBack="closeMemoChat"
      @memo-sent="handleMemoSent"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Memo from '../memo.vue'
// import MemoHistoryModal from './MemoHistoryModal.vue'
import  cardCss from "../../assets/css/tokt-employeeC-06.css?url"
import HeadBuilder from '@/utils/HeadBuilder';

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
  memoSent: [memo: any]
  employeeUpdated: [employee: Employee]
}>()

const showMemoChat = ref(false)
const showMemoHistory = ref(false)

const openMemoChat = () => {
  showMemoChat.value = true
}

const closeMemoChat = () => {
  showMemoChat.value = false
}

const openMemoHistory = () => {
  showMemoHistory.value = true
}

const closeMemoHistory = () => {
  showMemoHistory.value = false
}

const handleMemoSent = (memo: any) => {
  console.log('Mémos envoyé:', memo)

  // Émettre l'événement vers le parent pour traitement
  emit('memoSent', memo)

  // Optionnel: Afficher une notification de succès
  // Vous pouvez implémenter un système de toast/notification ici
}

const statusIcon = computed(() => {
  switch (props.employee.status) {
    case 'present':
      return 'icon-check'
    case 'absent':
      return 'icon-x'
    case 'late':
      return 'icon-clock'
    case 'info':
      return 'icon-info'
    default:
      return 'icon-user'
  }
})

onMounted(()=> {
  HeadBuilder.apply({
    title: 'card - Toké',
    css: [cardCss], // Charger les deux fichiers CSS
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})
</script>

<style>
/* Les styles existants de la carte employé restent inchangés */
</style>