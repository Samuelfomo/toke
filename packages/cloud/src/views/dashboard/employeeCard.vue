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
          <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
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
      <a href="#" class="action-btn-small" v-if="employee.status === 'late'">
        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>Valider</span>
      </a>
      <a href="#" class="action-btn-small" v-if="employee.status === 'absent'">
        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
        </svg>
        <span>Justifier</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import"../../assets/css/tokt-employeeC-06.css"

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
}

const props = defineProps<{
  employee: Employee
}>()

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
</script>

<style>

</style>