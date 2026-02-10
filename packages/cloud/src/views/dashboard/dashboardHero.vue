<template>
  <section class="dashboard-hero">
    <!-- ================= HEADER ================= -->
    <div class="hero-header">
      <div class="hero-left">
        <h1 class="hero-title">
          Tableau de Bord
          <span class="employee-count">
            {{ employeeCount }} employé{{ employeeCount > 1 ? 's' : '' }}
          </span>
        </h1>

        <div class="date-display">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="calendar-icon">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke-width="2" stroke-linecap="round"/>
            <line x1="8" y1="2" x2="8" y2="6" stroke-width="2" stroke-linecap="round"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/>
          </svg>
          <span class="date-text">{{ formattedRange }}</span>

          <!-- Badge du mode actif -->
          <transition name="badge-fade">
            <span v-if="!isSingleDay" class="mode-badge analytics">
              📊 Analytique
            </span>
          </transition>
        </div>
      </div>

      <!-- ================= FILTER BAR ================= -->
      <div class="filter-bar">
        <!-- Filtre employé -->
        <div class="employee-filter-group">
          <label class="filter-label">Employé</label>
          <select
              v-model="selectedEmployee"
              @change="emitFilters"
              class="employee-select"
          >
            <option value="">👥 Tous les employés</option>
            <option
                v-for="emp in employees"
                :key="emp.id"
                :value="emp.id"
            >
              {{ emp.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- ================= QUICK PERIOD SHORTCUTS ================= -->
    <div class="period-shortcuts">
      <button
          v-for="shortcut in periodShortcuts"
          :key="shortcut.label"
          @click="applyPeriodShortcut(shortcut)"
          :class="['shortcut-btn', { active: isShortcutActive(shortcut) }]"
          :title="shortcut.description"
      >
        <span class="shortcut-icon" v-html="shortcut.icon"></span>
        <span class="shortcut-label">{{ shortcut.label }}</span>
      </button>
    </div>

    <!-- ================= PÉRIODE SELECTOR ================= -->
    <div class="period-selector-card">
      <div class="card-header">
        <div class="header-left">
          <h3 class="card-title">Sélectionner une période</h3>
          <span v-if="periodDuration > 1" class="duration-badge">
            {{ periodDuration }} jours
          </span>
        </div>

        <!-- Indicateur du mode -->
        <div class="mode-indicator">
          <div :class="['mode-dot', isSingleDay ? 'normal' : 'analytics']"></div>
          <span class="mode-label">
            {{ isSingleDay ? 'Jour unique' : 'Période d\'analyse' }}
          </span>
        </div>
      </div>

      <div class="date-range-inputs">
        <div class="date-input-wrapper">
          <label class="input-label">Date de début</label>
          <input
              type="date"
              v-model="customStartDate"
              @change="handleDateChange"
              :max="customEndDate"
              class="date-input"
          />
        </div>

        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="arrow-icon">
          <line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round"/>
          <polyline points="12 5 19 12 12 19" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>

        <div class="date-input-wrapper">
          <label class="input-label">Date de fin</label>
          <input
              type="date"
              v-model="customEndDate"
              @change="handleDateChange"
              :min="customStartDate"
              class="date-input"
          />
        </div>
      </div>

      <!-- Aperçu de la période si période multi-jours -->
      <transition name="slide-fade">
        <div v-if="!isSingleDay" class="period-preview">
          <div class="preview-item">
            <svg viewBox="0 0 24 24" fill="currentColor" class="preview-icon">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
            <div class="preview-text">
              <span class="preview-label">Période d'analyse</span>
              <span class="preview-value">{{ periodDuration }} jours · {{ getDayOfWeek(customStartDate) }} au {{ getDayOfWeek(customEndDate) }}</span>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- ================= ACTIVE FILTERS INDICATOR ================= -->
    <transition name="slide-fade">
      <div v-if="hasActiveFilters" class="active-filters-indicator">
        <div class="indicator-content">
          <svg viewBox="0 0 24 24" fill="currentColor" class="info-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <div class="indicator-text">
            <strong>{{ periodLabel }}</strong>
            <span class="date-range">{{ formattedRange }}</span>
            <span v-if="selectedEmployee" class="employee-info">
              · {{ getEmployeeName(selectedEmployee) }}
            </span>
          </div>
        </div>
        <button @click="resetFilters" class="reset-button" title="Réinitialiser les filtres">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="1 4 1 10 7 10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="23 20 23 14 17 14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Réinitialiser
        </button>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Summary } from '@/service/UserService'

interface Employee {
  id: number | string
  name: string
}

interface Props {
  summary: Summary
  date: string
  employees: Employee[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'filter-change', payload: {
    startDate: string
    endDate: string
    employeeId: string | number | ''
    period: string
    viewMode: 'normal' | 'analytics'
  }): void
}>()

/* ================= FILTER STATE ================= */
const today = new Date().toISOString().split('T')[0]

const selectedEmployee = ref('')

// Initialiser avec la date du jour par défaut
const customStartDate = ref(today)
const customEndDate = ref(today)

/* ================= PERIOD SHORTCUTS ================= */
const periodShortcuts = [
  {
    label: 'Aujourd\'hui',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM7 12h5v5H7z"/></svg>',
    description: 'Afficher les statistiques d\'aujourd\'hui',
    getDates: () => ({ start: today, end: today })
  },
  {
    label: '7 derniers jours',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>',
    description: 'Analyser les 7 derniers jours',
    getDates: () => {
      const end = today
      const start = new Date()
      start.setDate(start.getDate() - 6)
      return { start: start.toISOString().split('T')[0], end }
    }
  },
  {
    label: '30 derniers jours',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>',
    description: 'Analyser les 30 derniers jours',
    getDates: () => {
      const end = today
      const start = new Date()
      start.setDate(start.getDate() - 29)
      return { start: start.toISOString().split('T')[0], end }
    }
  },
  {
    label: 'Ce mois',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/></svg>',
    description: 'Analyser le mois en cours',
    getDates: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      return { start, end: today }
    }
  }
]

/* ================= COMPUTED ================= */
// Déterminer si c'est une période ou un jour unique
const isSingleDay = computed(() => {
  return customStartDate.value === customEndDate.value
})

// Le mode vue est déterminé automatiquement selon la période
const selectedViewMode = computed(() => {
  return isSingleDay.value ? 'normal' : 'analytics'
})

// Calculer la plage de dates
const range = computed(() => {
  return {
    start: new Date(customStartDate.value),
    end: new Date(customEndDate.value)
  }
})

// Calculer la durée de la période en jours
const periodDuration = computed(() => {
  const start = new Date(customStartDate.value)
  const end = new Date(customEndDate.value)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return diffDays
})

/* ================= METHODS ================= */
const emitFilters = () => {
  const start = range.value.start
  const end = range.value.end

  // Formater les dates en YYYY-MM-DD
  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  emit('filter-change', {
    startDate: formatDate(start),
    endDate: formatDate(end),
    employeeId: selectedEmployee.value,
    period: isSingleDay.value ? 'day' : 'custom',
    viewMode: selectedViewMode.value // 'analytics' si période, 'normal' si jour unique
  })
}

const handleDateChange = () => {
  // Vérifier que la date de début est avant la date de fin
  if (new Date(customStartDate.value) > new Date(customEndDate.value)) {
    customEndDate.value = customStartDate.value
  }

  emitFilters()
}

const applyPeriodShortcut = (shortcut: any) => {
  const dates = shortcut.getDates()
  customStartDate.value = dates.start
  customEndDate.value = dates.end
  emitFilters()
}

const isShortcutActive = (shortcut: any) => {
  const dates = shortcut.getDates()
  return customStartDate.value === dates.start && customEndDate.value === dates.end
}

const resetFilters = () => {
  customStartDate.value = today
  customEndDate.value = today
  selectedEmployee.value = ''
  emitFilters()
}

const getDayOfWeek = (dateStr: string) => {
  const date = new Date(dateStr)
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  return days[date.getDay()]
}

// Vérifier s'il y a des filtres actifs
const hasActiveFilters = computed(() => {
  return customStartDate.value !== today ||
      customEndDate.value !== today ||
      selectedEmployee.value !== ''
})

// Label de la période
const periodLabel = computed(() => {
  if (isSingleDay.value) {
    return customStartDate.value === today ? 'Aujourd\'hui' : 'Jour sélectionné'
  }
  return 'Période sélectionnée'
})

// Obtenir le nom de l'employé
const getEmployeeName = (id: string | number) => {
  const emp = props.employees.find(e => e.id === id)
  return emp ? emp.name : ''
}

// Synchroniser avec les props
watch(() => props.date, d => {
  if (d) {
    customStartDate.value = d
    customEndDate.value = d
  }
})

// Émettre les filtres au montage du composant
emitFilters()

/* ================= FORMATTED RANGE ================= */
const formattedRange = computed(() => {
  const formatOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }

  const formatShort: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short'
  }

  const start = new Date(customStartDate.value)
  const end = new Date(customEndDate.value)

  // Si c'est aujourd'hui
  if (customStartDate.value === today && customEndDate.value === today) {
    return 'Aujourd\'hui - ' + start.toLocaleDateString('fr-FR', formatOptions)
  }

  // Si même jour
  if (isSingleDay.value) {
    return start.toLocaleDateString('fr-FR', formatOptions)
  }

  // Si même mois et année
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} - ${end.toLocaleDateString('fr-FR', formatOptions)}`
  }

  // Si même année
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('fr-FR', formatShort)} - ${end.toLocaleDateString('fr-FR', formatOptions)}`
  }

  // Années différentes
  return `${start.toLocaleDateString('fr-FR', formatOptions)} - ${end.toLocaleDateString('fr-FR', formatOptions)}`
})

const employeeCount = computed(() => props.summary.total_team_members)
</script>

<style scoped>
.dashboard-hero {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ================= HEADER ================= */
.hero-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  flex-wrap: wrap;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  padding: 2rem;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
}

.hero-left {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hero-title {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  line-height: 1.2;
}

.employee-count {
  font-size: 1rem;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
}

.date-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1.25rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
}

.calendar-icon {
  width: 20px;
  height: 20px;
  color: #ffffff;
  stroke-width: 2;
}

.date-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.01em;
}

.mode-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.mode-badge.analytics {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.badge-fade-enter-active,
.badge-fade-leave-active {
  transition: all 0.3s ease;
}

.badge-fade-enter-from,
.badge-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* ================= FILTER BAR ================= */
.filter-bar {
  display: flex;
  align-items: flex-end;
  gap: 1.5rem;
  flex-wrap: wrap;
}

/* Employee Filter */
.employee-filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 220px;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.employee-select {
  padding: 0.875rem 1.125rem;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
  background: white;
  font-size: 0.9rem;
  color: #0f172a;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.employee-select:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.employee-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

/* ================= PERIOD SHORTCUTS ================= */
.period-shortcuts {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.shortcut-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.shortcut-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.shortcut-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-color: #3b82f6;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.shortcut-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shortcut-icon svg {
  width: 18px;
  height: 18px;
}

/* ================= PERIOD SELECTOR CARD ================= */
.period-selector-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.period-selector-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.duration-badge {
  padding: 0.375rem 0.875rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #0369a1;
  letter-spacing: 0.5px;
}

.mode-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f8fafc;
  border-radius: 10px;
}

.mode-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

.mode-dot.normal {
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
}

.mode-dot.analytics {
  background: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.mode-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
}

.date-range-inputs {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1.25rem;
  background: #f8fafc;
  border-radius: 14px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.date-range-inputs:hover {
  background: white;
  border-color: #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.date-range-inputs:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  background: #ffffff;
}

.date-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
}

.input-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-input {
  padding: 0.625rem 0.875rem;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: white;
  font-size: 0.9rem;
  color: #0f172a;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-input:hover {
  border-color: #cbd5e1;
}

.date-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.arrow-icon {
  width: 22px;
  height: 22px;
  color: #94a3b8;
  stroke-width: 2.5;
  flex-shrink: 0;
  margin-top: 1.25rem;
}

/* ================= PERIOD PREVIEW ================= */
.period-preview {
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px dashed #7dd3fc;
  border-radius: 12px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.preview-icon {
  width: 20px;
  height: 20px;
  color: #0369a1;
  flex-shrink: 0;
}

.preview-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.preview-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #0369a1;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #075985;
}

/* ================= ACTIVE FILTERS INDICATOR ================= */
.active-filters-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 2px solid #93c5fd;
  border-radius: 16px;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.indicator-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.info-icon {
  width: 24px;
  height: 24px;
  min-width: 24px;
  color: #3b82f6;
  flex-shrink: 0;
}

.indicator-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.9rem;
  color: #1e40af;
  font-weight: 500;
}

.indicator-text strong {
  font-weight: 800;
  color: #1e3a8a;
}

.date-range {
  color: #2563eb;
  font-weight: 600;
}

.employee-info {
  color: #1e40af;
  font-style: italic;
}

.reset-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: white;
  border: 2px solid #93c5fd;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #3b82f6;
  font-size: 0.875rem;
  font-weight: 600;
}

.reset-button:hover {
  background: #3b82f6;
  color: white;
  transform: scale(1.05);
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
}

.reset-button svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
  transition: transform 0.3s ease;
}

.reset-button:hover svg {
  transform: rotate(180deg);
}

/* ================= ANIMATIONS ================= */
.slide-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ================= RESPONSIVE ================= */
@media (max-width: 1200px) {
  .hero-header {
    gap: 1.5rem;
  }

  .filter-bar {
    gap: 1rem;
  }

  .period-shortcuts {
    gap: 0.5rem;
  }
}

@media (max-width: 900px) {
  .hero-header {
    flex-direction: column;
    align-items: stretch;
    padding: 1.5rem;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .employee-filter-group {
    min-width: unset;
    width: 100%;
  }

  .period-shortcuts {
    flex-wrap: wrap;
  }

  .shortcut-btn {
    flex: 1;
    min-width: calc(50% - 0.375rem);
    justify-content: center;
  }

  .date-range-inputs {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .arrow-icon {
    transform: rotate(90deg);
    align-self: center;
    margin-top: 0;
  }

  .date-input-wrapper {
    width: 100%;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 1.5rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .employee-count {
    font-size: 0.875rem;
  }

  .date-display {
    padding: 0.625rem 1rem;
    flex-wrap: wrap;
  }

  .date-text {
    font-size: 0.875rem;
  }

  .shortcut-btn {
    min-width: 100%;
  }

  .active-filters-indicator {
    flex-direction: column;
    align-items: stretch;
    padding: 1rem;
  }

  .reset-button {
    width: 100%;
    justify-content: center;
    padding: 0.75rem;
  }
}
</style>