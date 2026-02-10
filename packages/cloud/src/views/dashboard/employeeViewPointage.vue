<template>
  <div class="pointage-panel">

    <!-- ================= HEADER ================= -->
    <div class="panel-header">
      <h3>
        Pointages des Employés
        <span class="count">({{ workingEmployees.length }})</span>
      </h3>
    </div>

    <!-- ================= LAST UPDATE ================= -->
    <div class="last-update">
      ⏱ Mis à jour il y a {{ lastUpdateMinutes }} min
    </div>

    <!-- ================= INFO MESSAGE (si des employés sont exclus) ================= -->
    <div v-if="offDayEmployees.length > 0" class="info-banner">
      ℹ️ {{ offDayEmployees.length }} employé(s) en repos aujourd'hui (non affiché{{ offDayEmployees.length > 1 ? 's' : '' }})
    </div>

    <!-- ================= EMPTY STATE ================= -->
    <div v-if="workingEmployees.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <p class="empty-title">Aucun employé prévu aujourd'hui</p>
      <p class="empty-text">Tous les employés sont en repos</p>
    </div>

    <!-- ================= LIST ================= -->
    <div v-else class="employee-list">

      <div
        v-for="employee in sortedWorkingEmployees"
        :key="employee.guid"
        class="employee-item"
        :class="{ expanded: selectedEmployee?.guid === employee.guid }"
      >
        <!-- ========== COMPACT ROW ========== -->
        <div class="employee-compact" @click="toggleEmployee(employee)">
          <div class="employee-left">
            <div class="avatar">
              <img v-if="employee.avatar" :src="employee.avatar" />
              <span v-else class="initials">{{ employee.initials }}</span>
              <span :class="['status-dot', `dot-${employee.statusColor}`]" />
            </div>

            <div class="employee-info">
              <strong class="name">{{ employee.name }}</strong>
            </div>
          </div>

          <div class="employee-right">
            <span class="status-badge" :class="`badge-${employee.status}`">
              {{ formatStatus(employee.status) }}
            </span>

            <button class="expand-btn" :class="{ rotated: selectedEmployee?.guid === employee.guid }">
              ▼
            </button>
          </div>
        </div>

        <!-- ========== DETAILS TIMELINE ========== -->
        <transition name="expand">
          <div v-if="selectedEmployee?.guid === employee.guid" class="employee-details">

            <div class="schedule-timeline">
              <div
                v-for="event in getEmployeeTimeline(employee)"
                :key="event.type + event.time"
                class="timeline-item"
                :class="getStatusClass(event.type)"
              >
                <div class="timeline-icon">{{ getStatusIcon(event.type) }}</div>
                <div class="timeline-content">
                  <span class="label">{{ event.label }}</span>
                  <span class="time-badge">{{ event.time || '—' }}</span>
                  <button class="memo-icon" @click.stop="openMemo(employee, event)">📝</button>
                </div>
              </div>
            </div>

            <div v-if="employee.delayText" class="delay-info">
              ⚠ Retard de {{ employee.delayText }}
            </div>

          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TransformedEmployee } from '@/service/UserService'

interface Props {
  employees: TransformedEmployee[]
  selectedEmployee?: TransformedEmployee | null
}

const props = defineProps<Props>()
const emit = defineEmits(['employee-click', 'close'])

// ================== REACTIVES ==================
const lastUpdateMinutes = ref(1)

// ================== COMPUTEDS ==================

/**
 * Filtre pour ne garder QUE les employés censés travailler aujourd'hui
 * (exclut ceux en "off-day" ou repos)
 */
const workingEmployees = computed(() => {
  return props.employees.filter(emp => {
    // Exclure les employés en jour de repos
    return emp.status !== 'off-day'
  })
})

/**
 * Employés en repos (pour afficher l'info banner)
 */
const offDayEmployees = computed(() => {
  return props.employees.filter(emp => emp.status === 'off-day')
})

/**
 * Liste triée alphabétiquement des employés qui travaillent
 */
const sortedWorkingEmployees = computed(() =>
  [...workingEmployees.value].sort((a, b) => a.name.localeCompare(b.name))
)

// ================== HELPERS ==================
const toggleEmployee = (employee: TransformedEmployee) =>
  props.selectedEmployee?.guid === employee.guid
    ? emit('close')
    : emit('employee-click', employee)

const formatStatus = (s: string) =>
  ({
    present: 'Présent',
    late: 'Retard',
    absent: 'Absent',
    'on-pause': 'Pause',
    active: 'Mission',
    'off-day': 'Repos'
  } as any)[s] || s

/**
 * Récupère le dernier temps significatif de l'employé
 */
const getLastTime = (employee: TransformedEmployee): string => {
  // Priorité: clock_out > mission_end > pause_end > mission_start > pause_start > clock_in
  if (employee.clockOutTime) return employee.clockOutTime
  if (employee.mission_end_time) return employee.mission_end_time
  if (employee.pause_end_time) return employee.pause_end_time
  if (employee.mission_start_time) return employee.mission_start_time
  if (employee.pause_start_time) return employee.pause_start_time
  if (employee.actualTime) return employee.actualTime
  return employee.expectedTime
}

/**
 * Construit la timeline des événements pour un employé
 */
const getEmployeeTimeline = (employee: TransformedEmployee) => {
  const timeline: Array<{ type: string; label: string; time: string | null }> = []

  // Arrivée
  if (employee.actualTime || employee.expectedTime) {
    timeline.push({
      type: 'arrivee',
      label: employee.actualTime ? 'Arrivée' : 'Arrivée prévue',
      time: employee.actualTime || employee.expectedTime
    })
  }

  // Pause début
  if (employee.pause_start_time) {
    timeline.push({
      type: 'pause_start',
      label: 'Début pause',
      time: employee.pause_start_time
    })
  }

  // Pause fin
  if (employee.pause_end_time) {
    timeline.push({
      type: 'pause_end',
      label: 'Fin pause',
      time: employee.pause_end_time
    })
  }

  // Mission début
  if (employee.mission_start_time) {
    timeline.push({
      type: 'mission_start',
      label: 'Début mission',
      time: employee.mission_start_time
    })
  }

  // Mission fin
  if (employee.mission_end_time) {
    timeline.push({
      type: 'mission_end',
      label: 'Fin mission',
      time: employee.mission_end_time
    })
  }

  // Départ
  if (employee.clockOutTime) {
    timeline.push({
      type: 'depart',
      label: 'Départ',
      time: employee.clockOutTime
    })
  }

  return timeline
}

// ================== TIMELINE HELPERS ==================
const getStatusIcon = (type: string) => {
  return {
    arrivee: '✅',
    depart: '⏹',
    mission_start: '🚀',
    mission_end: '🏁',
    pause_start: '💤',
    pause_end: '▶'
  }[type] || '❔'
}

const getStatusClass = (type: string) => {
  return {
    arrivee: 'success',
    depart: 'neutral',
    mission_start: 'info',
    mission_end: 'info light',
    pause_start: 'warning',
    pause_end: 'warning light'
  }[type] || ''
}

// ================== MEMO ==================
const openEmployeeMemo = (employee: TransformedEmployee) => {
  alert(`Ajouter mémo pour ${employee.name}`)
}

const openMemo = (employee: TransformedEmployee, event: any) => {
  alert(`Ajouter mémo pour ${employee.name} - ${event.label}`)
}
</script>

<style scoped>
.pointage-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: none;
  min-height: 420px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04), 0 10px 28px rgba(0,0,0,0.06);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.panel-header h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
}

.count {
  font-size: 12px;
  color: #94a3b8;
}

.last-update {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 12px;
}

/* ================= INFO BANNER ================= */
.info-banner {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12px;
  color: #1e40af;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ================= EMPTY STATE ================= */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.5rem 0;
}

.empty-text {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

/* ================= EMPLOYEE LIST ================= */
.employee-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

.employee-list::-webkit-scrollbar {
  width: 6px;
}
.employee-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 6px;
}

.employee-item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  transition: all .25s ease;
}

.employee-item:hover {
  background: #f8fafc;
  transform: translateY(-1px);
}

.employee-compact {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  cursor: pointer;
}

.employee-left {
  display: flex;
  gap: 10px;
  align-items: center;
}

.employee-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.initials {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid white;
}

.dot-green { background: #22c55e; }
.dot-orange { background: #f59e0b; }
.dot-red { background: #b91c1c; }
.dot-blue { background: #3b82f6; }
.dot-gray { background: #64748b; }

.employee-info .name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.status-badge {
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 999px;
  font-weight: 700;
}

.badge-present { background: #dcfce7; color: #166534; }
.badge-late { background: #fef2f2; color: #b91c1c; }
.badge-absent { background: #f1f5f9; color: #64748b; }
.badge-on-pause { background: #fef3c7; color: #92400e; }
.badge-active { background: #dbeafe; color: #1e40af; }
.badge-off-day { background: #f1f5f9; color: #475569; }

.time {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.memo-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.memo-icon:hover {
  opacity: 1;
}

.expand-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 12px;
  transition: transform 0.3s;
  color: #64748b;
}

.expand-btn.rotated {
  transform: rotate(180deg);
}

.employee-details {
  padding: 12px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.schedule-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 18px;
}

.schedule-timeline::before {
  content: "";
  position: absolute;
  left: 9px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e2e8f0;
}

.timeline-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.timeline-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
}

.success .timeline-icon { background: #22c55e; }
.warning .timeline-icon { background: #f59e0b; }
.warning.light .timeline-icon { background: #fbbf24; }
.info .timeline-icon { background: #3b82f6; }
.info.light .timeline-icon { background: #60a5fa; }
.neutral .timeline-icon { background: #94a3b8; }

.timeline-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-size: 12px;
  gap: 8px;
}

.timeline-content .label {
  color: #0f172a;
  font-weight: 500;
}

.time-badge {
  background: #e2e8f0;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
  color: #475569;
}

.delay-info {
  margin-top: 10px;
  font-size: 12px;
  background: #fef2f2;
  color: #b91c1c;
  padding: 8px 10px;
  border-radius: 8px;
  font-weight: 500;
}

.expand-enter-active, .expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to, .expand-leave-from {
  max-height: 500px;
  opacity: 1;
}
</style>