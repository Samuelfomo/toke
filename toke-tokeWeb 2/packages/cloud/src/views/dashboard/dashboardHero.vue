<template>
  <section class="dashboard-hero">
    <!-- ================= HEADER ================= -->
    <div class="hero-header">
      <div class="hero-left">
        <h1 class="hero-title">
          Tableau de Bord
          <span class="employee-count">
            ({{ employeeCount }} employés)
          </span>
        </h1>

        <span class="hero-date">
          📅 {{ formattedRange }}
        </span>
      </div>

      <!-- ================= FILTER BAR ================= -->
      <div class="filter-bar">
        <!-- 🔥 Mode Vue - Nouveau bouton -->
        <div class="view-mode-switch">
          <button
            :class="{ active: selectedViewMode === 'normal' }"
            @click="selectViewMode('normal')"
            title="Vue normale avec statistiques du jour"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" class="mode-icon">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
            Normal
          </button>
          <button
            :class="{ active: selectedViewMode === 'analytics' }"
            @click="selectViewMode('analytics')"
            title="Mode analytique avec évolution sur la période"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" class="mode-icon">
              <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
            </svg>
            Analytique
          </button>
        </div>

        <!-- 🔥 Type période -->
        <div class="period-switch">
          <button
            v-for="p in periods"
            :key="p.value"
            :class="{ active: selectedPeriod === p.value }"
            @click="selectPeriod(p.value)"
            :title="p.description"
          >
            <svg v-html="p.icon" class="period-icon" viewBox="0 0 24 24" fill="currentColor" />
            {{ p.label }}
          </button>
        </div>

        <!-- Date Picker - Simple pour Jour -->
        <div v-if="selectedPeriod === 'day'" class="date-picker-container">
          <label class="date-label">Date :</label>
          <input
            type="date"
            v-model="selectedDate"
            @change="emitFilters"
            class="date-input"
          />
        </div>

        <!-- Date Picker - Plage personnalisée -->
        <div v-else-if="selectedPeriod === 'custom'" class="custom-range">
          <div class="date-picker-container">
            <label class="date-label">Du :</label>
            <input
              type="date"
              v-model="customStartDate"
              @change="handleCustomDateChange"
              :max="customEndDate"
              class="date-input"
            />
          </div>
          <span class="range-arrow">→</span>
          <div class="date-picker-container">
            <label class="date-label">Au :</label>
            <input
              type="date"
              v-model="customEndDate"
              @change="handleCustomDateChange"
              :min="customStartDate"
              class="date-input"
            />
          </div>
        </div>

        <!-- Employé -->
        <div class="employee-filter">
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

    <!-- Indicateur de période active -->
    <div v-if="hasActiveFilters" class="active-filters-indicator">
      <svg viewBox="0 0 24 24" fill="currentColor" class="info-icon">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4M12 8h.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>
        <span v-if="selectedViewMode === 'analytics'">📊 Mode Analytique - </span>
        Statistiques {{ periodLabel }}
        <strong>{{ formattedRange }}</strong>
        <span v-if="selectedEmployee" class="employee-filter-text">
          pour {{ getEmployeeName(selectedEmployee) }}
        </span>
      </span>
    </div>
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

const selectedDate = ref(props.date || today)
const selectedMonth = ref(getYearMonth(new Date(props.date || today)))
const selectedEmployee = ref('')
const selectedPeriod = ref<'day' | 'week' | 'month' | 'custom'>('day')
const selectedViewMode = ref<'normal' | 'analytics'>('normal')

// Pour la plage personnalisée
const customStartDate = ref(today)
const customEndDate = ref(today)

const periods = [
  {
    label: 'Jour',
    value: 'day',
    description: 'Afficher les statistiques du jour sélectionné',
    icon: '<path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>'
  },
  {
    label: 'Personnalisé',
    value: 'custom',
    description: 'Définir une plage de dates personnalisée',
    icon: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'
  }
]

/* ================= HELPERS ================= */
function getYearMonth(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const getStartOfWeek = (d: Date) => {
  const date = new Date(d)
  const day = date.getDay() || 7
  if (day !== 1) date.setHours(-24 * (day - 1))
  return date
}

const getEndOfWeek = (d: Date) => {
  const start = getStartOfWeek(d)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return end
}

/* ================= DATE RANGE CALCUL ================= */
const range = computed(() => {
  if (selectedPeriod.value === 'custom') {
    return {
      start: new Date(customStartDate.value),
      end: new Date(customEndDate.value)
    }
  }

  const base = new Date(selectedDate.value)

  if (selectedPeriod.value === 'day') {
    return { start: base, end: base }
  }

  if (selectedPeriod.value === 'week') {
    return {
      start: getStartOfWeek(base),
      end: getEndOfWeek(base)
    }
  }

  // month
  return {
    start: new Date(base.getFullYear(), base.getMonth(), 1),
    end: new Date(base.getFullYear(), base.getMonth() + 1, 0)
  }
})

/* ================= EMIT ================= */
const emitFilters = () => {
  const start = range.value.start
  const end = range.value.end

  // Formater les dates en YYYY-MM-DD
  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  emit('filter-change', {
    startDate: formatDate(start),
    endDate: formatDate(end),
    employeeId: selectedEmployee.value,
    period: selectedPeriod.value,
    viewMode: selectedViewMode.value
  })
}

const selectPeriod = (p: any) => {
  selectedPeriod.value = p

  // Si on passe en mode personnalisé, initialiser les dates
  if (p === 'custom') {
    customStartDate.value = selectedDate.value
    customEndDate.value = selectedDate.value
  }

  emitFilters()
}

const selectViewMode = (mode: 'normal' | 'analytics') => {
  selectedViewMode.value = mode
  emitFilters()
}

const handleMonthChange = () => {
  // Convertir le mois sélectionné en date
  const [year, month] = selectedMonth.value.split('-')
  selectedDate.value = `${year}-${month}-01`
  emitFilters()
}

const handleCustomDateChange = () => {
  // Vérifier que la date de début est avant la date de fin
  if (new Date(customStartDate.value) > new Date(customEndDate.value)) {
    customEndDate.value = customStartDate.value
  }
  emitFilters()
}

const resetFilters = () => {
  selectedPeriod.value = 'day'
  selectedDate.value = today
  selectedEmployee.value = ''
  selectedViewMode.value = 'normal'
  customStartDate.value = today
  customEndDate.value = today
  emitFilters()
}

// Vérifier s'il y a des filtres actifs
const hasActiveFilters = computed(() => {
  return selectedPeriod.value !== 'day' ||
    selectedDate.value !== today ||
    selectedEmployee.value !== '' ||
    selectedViewMode.value === 'analytics'
})

// Label de la période
const periodLabel = computed(() => {
  const period = periods.find(p => p.value === selectedPeriod.value)
  return period ? `de ${period.label.toLowerCase()}` : ''
})

// Obtenir le nom de l'employé
const getEmployeeName = (id: string | number) => {
  const emp = props.employees.find(e => e.id === id)
  return emp ? emp.name : ''
}

// Synchroniser avec les props
watch(() => props.date, d => {
  if (d) {
    selectedDate.value = d
    selectedMonth.value = getYearMonth(new Date(d))
  }
})

/* ================= COMPUTED ================= */
const formattedRange = computed(() => {
  const opt: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }

  if (selectedPeriod.value === 'day') {
    return new Date(selectedDate.value).toLocaleDateString('fr-FR', opt)
  }

  const start = range.value.start.toLocaleDateString('fr-FR', opt)
  const end = range.value.end.toLocaleDateString('fr-FR', opt)

  return `du ${start} au ${end}`
})

const employeeCount = computed(() => props.summary.total_team_members)

const attendancePercentage = computed(() => {
  if (props.summary.total_expected_workdays === 0) return 0
  return Math.round(
    (props.summary.total_present_on_time / props.summary.total_expected_workdays) * 100
  )
})

const absencePercentage = computed(() => {
  if (props.summary.total_expected_workdays === 0) return 0
  return Math.round(
    (props.summary.total_absences / props.summary.total_expected_workdays) * 100
  )
})

const formatDelay = (minutes: number): string => {
  if (!minutes || minutes === 0) return '0 min'

  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours > 0) {
    return `${hours}h${mins.toString().padStart(2, '0')}`
  }
  return `${mins} min`
}
</script>


<style scoped>
.dashboard-hero {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ================= HEADER ================= */
.hero-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;
  background: #ffffff;
  padding: 1.5rem;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.hero-left {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hero-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.employee-count {
  font-size: 1rem;
  font-weight: 500;
  color: #94a3b8;
}

.hero-date {
  font-size: 0.95rem;
  color: #64748b;
  font-weight: 500;
}

/* ================= FILTER BAR ================= */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

/* View Mode Switch - Nouveau */
.view-mode-switch {
  display: flex;
  gap: 0.25rem;
  background: #f8fafc;
  padding: 0.25rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.view-mode-switch button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.view-mode-switch button:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.view-mode-switch button.active {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
}

.mode-icon {
  width: 16px;
  height: 16px;
}

/* Period Switch */
.period-switch {
  display: flex;
  gap: 0.25rem;
  background: #f8fafc;
  padding: 0.25rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.period-switch button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.period-switch button:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.period-switch button.active {
  background: #3b82f6;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.period-icon {
  width: 16px;
  height: 16px;
}

/* Date Picker */
.date-picker-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
}

.date-input {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 0.875rem;
  color: #0f172a;
  font-weight: 500;
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

/* Custom Range */
.custom-range {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.range-arrow {
  font-size: 1.25rem;
  color: #94a3b8;
  font-weight: 600;
}

/* Employee Filter */
.employee-filter {
  display: flex;
  align-items: center;
}

.employee-select {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 0.875rem;
  color: #0f172a;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 180px;
}

.employee-select:hover {
  border-color: #cbd5e1;
}

.employee-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* ================= ACTIVE FILTERS INDICATOR ================= */
.active-filters-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  font-size: 0.875rem;
  color: #1e40af;
  font-weight: 500;
}

.info-icon {
  width: 20px;
  height: 20px;
  min-width: 20px;
  color: #3b82f6;
}

.active-filters-indicator strong {
  font-weight: 700;
  color: #1e3a8a;
}

.employee-filter-text {
  color: #1e40af;
  font-style: italic;
}

/* ================= RESPONSIVE ================= */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .hero-header {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .view-mode-switch,
  .period-switch {
    justify-content: space-between;
  }

  .custom-range {
    flex-direction: column;
    align-items: stretch;
  }

  .range-arrow {
    display: none;
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .hero-title {
    font-size: 1.5rem;
  }

  .value {
    font-size: 1.75rem;
  }

  .view-mode-switch,
  .period-switch {
    flex-direction: column;
  }

  .view-mode-switch button,
  .period-switch button {
    justify-content: center;
  }
}
</style>