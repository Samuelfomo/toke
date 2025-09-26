<template>
  <div :class="['employee-card', { 'has-issue': employee.priority === 'high' }]">
    <!-- Zone cliquable pour naviguer vers les détails -->
    <div class="employee-main" @click="openEmployeeDetails">
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
      <!-- Actions - empêcher la propagation du clic -->
      <div class="employee-actions" @click.stop>
        <div class="employee-issue" v-if="employee.status === 'absent' && !employee.isJustified">
          <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <span class="issue-text">Absence non justifiée</span>
        </div>

        <div class="employee-validated" v-if="employee.status === 'late' && employee.isValidated">
          <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span class="validated-text">Retard validé</span>
        </div>
      </div>
      <!-- Indicateur visuel pour montrer que c'est cliquable -->
      <div class="click-indicator">
        <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import cardCss from "../../assets/css/tokt-employeeC-06.css?url"
import HeadBuilder from '@/utils/HeadBuilder';
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

const props = defineProps<{
  employee: Employee
}>()

const emit = defineEmits<{
  memoSent: [memo: any]
  employeeUpdated: [employee: Employee]
}>()

// Navigation vers la page de détails de l'employé
const openEmployeeDetails = () => {
  router.push({
    name: 'employeeD',
    params: { employeeId: props.employee.id.toString() },
    query: {
      employeeName: props.employee.name,
      employeeInitials: props.employee.initials,
      employeeStatus: props.employee.status,
      employeeStatusText: props.employee.statusText,
      employeeTime: props.employee.time || '',
      employeeLocation: props.employee.location || ''
    }
  })
}

// Navigation vers la page memo
const openMemoChat = () => {
  router.push({
    name: 'memo',
    params: { employeeId: props.employee.id },
    query: {
      employeeName: props.employee.name,
      employeeInitials: props.employee.initials,
      employeeStatus: props.employee.status,
      employeeStatusText: props.employee.statusText,
      employeeLocation: props.employee.location || ''
    }
  })
}

// Actions des boutons
const validateLate = () => {
  console.log('Valider le retard de:', props.employee.name)
  // Logique pour valider le retard
  emit('employeeUpdated', { ...props.employee, isValidated: true })
}

const justifyAbsence = () => {
  console.log('Justifier l\'absence de:', props.employee.name)
  // Logique pour justifier l'absence
}

const warnEmployee = () => {
  console.log('Avertir:', props.employee.name)
  // Logique pour avertir l'employé
}

onMounted(() => {
  HeadBuilder.apply({
    title: 'card - Toké',
    css: [cardCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})
</script>

<style>
/* Styles pour rendre la zone principale cliquable */
.employee-main {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
  margin: -0.5rem;
}

.employee-main:hover {
  background-color: rgba(59, 130, 246, 0.05);
  transform: translateY(-1px);
}

.employee-main:active {
  transform: translateY(0);
}

/* Indicateur de clic */
.click-indicator {
  margin-left: auto;
  opacity: 0.3;
  transition: opacity 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.employee-main:hover .click-indicator {
  opacity: 0.6;
}

/* Assurer que les actions ne déclenchent pas le clic principal */
.employee-actions {
  position: relative;
  z-index: 10;
}

/* Styles pour le modal overlay */
.memo-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.memo-modal-content {
  background: white;
  border-radius: 8px;
  width: 90vw;
  max-width: 800px;
  height: 90vh;
  max-height: 700px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

/* Responsive pour mobile */
@media (max-width: 768px) {
  .memo-modal-content {
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    border-radius: 0;
  }

  .click-indicator {
    display: none;
  }
}

/* Animation pour les icônes */
.icon-xs, .icon-sm {
  transition: transform 0.2s ease;
}

.employee-main:hover .icon-xs,
.employee-main:hover .icon-sm {
  transform: scale(1.05);
}

/* Focus pour l'accessibilité */
.employee-main:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Rendre la zone principale focusable au clavier */
.employee-main[tabindex] {
  outline: none;
}
</style>