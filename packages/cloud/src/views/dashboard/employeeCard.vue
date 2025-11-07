<template>
  <div :class="['employee-card', { 'has-issue': employee.priority === 'high' }]">
    <div class="employee-main" @click="openEmployeeDetails">
      <div class="employee-avatar">
        <div class="avatar-employee">{{ employee.initials }}</div>
        <div :class="['status-indicator', 'indicator-' + employee.status]"></div>
      </div>

      <div class="employee-info">
        <h3 class="employee-name">{{ employee.name }}</h3>
        <div class="employee-status">
          <!-- Icône selon le statut -->
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

          <!-- Affichage simple du statut seulement -->
          <span class="status-text">{{ employee.statusText }}</span>
        </div>
      </div>

      <!-- Actions - empêcher la propagation du clic -->
      <div class="employee-actions" @click.stop>
        <!-- N'afficher "Absence non justifiée" QUE si l'absence n'est pas justifiée -->
        <div class="employee-issue" v-if="employee.status === 'absent' && !employee.isJustified">
          <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <span class="issue-text">Absence non justifiée</span>
        </div>

        <!-- Afficher si le retard est validé -->
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
  checkInTime?: string
  lateDuration?: string
  absenceReason?: string
  motif?: string
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
  // Émettre un événement au parent pour ouvrir le modal
  emit('employeeUpdated', props.employee)
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
</style>