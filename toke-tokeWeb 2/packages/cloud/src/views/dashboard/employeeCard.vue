<template>
  <div :class="['employee-card', { 'has-issue': employee.priority === 'high' }]">
    <div class="employee-main" @click="openEmployeeDetails">
      <div class="employee-avatar">
        <div v-if="employee.avatar" class="avatar-employee" :style="{ backgroundImage: `url(${employee.avatar})` }"></div>
        <div v-else class="avatar-employee">{{ employee.initials }}</div>
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

          <svg v-else-if="employee.status === 'off-day'" class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>

          <svg v-else class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>

          <span class="status-text">{{ employee.statusText }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="employee-actions" @click.stop>
        <!-- Absence non justifiée -->
        <div class="employee-issue" v-if="employee.status === 'absent' && !employee.isJustified">
          <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <span class="issue-text">Absence non justifiée</span>
        </div>

        <!-- Retard validé -->
        <div class="employee-validated" v-if="employee.status === 'late' && employee.isValidated">
          <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span class="validated-text">Retard validé</span>
        </div>

        <!-- Durée du retard -->
        <div class="employee-late-duration" v-if="employee.status === 'late' && employee.lateDuration">
          <span class="late-duration-text">{{ employee.lateDuration }}</span>
        </div>
      </div>

      <!-- Indicateur cliquable -->
      <div class="click-indicator">
        <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

interface Employee {
  id: string
  name: string
  initials: string
  status: 'absent' | 'late' | 'present' | 'info' | 'off-day'
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
  click: []
  employeeUpdated: [employee: Employee]
}>()

const openEmployeeDetails = () => {
  emit('click')
  emit('employeeUpdated', props.employee)
}
</script>

<style scoped>
/* Disposition du contenu de l'employé en colonne */
.employee-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  justify-content: center;
}

.employee-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.employee-status {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>