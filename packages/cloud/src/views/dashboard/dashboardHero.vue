<template>
  <section class="dashboard-hero">
    <!-- ================= HEADER ================= -->
    <div class="hero-header">
      <div class="hero-left">
        <h1 class="hero-title">
          Tableau de Bord
          <span class="employee-count">({{ employeeCount }} employés)</span>
        </h1>
        <div class="date-bar">
      <span class="date-badge">
        📅 {{ displayedRange }}
      </span>
        </div>
      </div>

      <!-- ================= FILTER BAR ================= -->
      <div class="filter-bar">
        <!-- VIEW MODE -->
        <div class="view-mode-switch">
          <button
              :class="{ active: selectedViewMode === 'normal' }"
              @click="selectViewMode('normal')">
            Normal
          </button>

          <!-- FIX: même style actif que Normal -->
          <button
              :class="{ active: selectedViewMode === 'analytics' }"
              @click="selectViewMode('analytics')">
            Analytique
          </button>
        </div>

        <!-- PERIOD -->
        <div class="period-switch">
          <button
              v-for="p in periods"
              :key="p.value"
              :class="{ active: selectedPeriod === p.value }"
              @click="selectPeriod(p.value)">
            {{ p.label }}
          </button>
        </div>

        <!-- DATE PICKERS -->
        <div v-if="selectedPeriod === 'day'" class="date-picker-container">
          <input type="date" v-model="selectedDate" @change="emitFilters" class="date-input" />
        </div>

        <div v-else-if="selectedPeriod === 'custom'" class="custom-range">
          <input type="date" v-model="customStartDate" @change="handleCustomDateChange" class="date-input" />
          <span class="range-arrow">→</span>
          <input type="date" v-model="customEndDate" @change="handleCustomDateChange" class="date-input" />
        </div>

        <!-- EMPLOYEE -->
        <div class="employee-filter">
          <select v-model="selectedEmployee" @change="emitFilters" class="employee-select">
            <option value="">Tous les employés</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ================= DATE BAR (NEW POSITION) ================= -->
    <!-- Toujours visible + support période personnalisée -->

    <!-- ACTIVE FILTERS -->
    <transition name="slide-fade">
      <div v-if="hasActiveFilters" class="active-filters-indicator">
        <span class="indicator-text">
          Statistiques {{ periodLabel }} <strong>{{ displayedRange }}</strong>
        </span>
        <button @click="resetFilters" class="reset-button">Réinitialiser</button>
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
const emit = defineEmits(['filter-change'])

const today = new Date().toISOString().split('T')[0]

const selectedDate = ref(props.date || today)
const selectedEmployee = ref('')
const selectedPeriod = ref<'day' | 'custom'>('day')
const selectedViewMode = ref<'normal' | 'analytics'>('normal')

const customStartDate = ref(today)
const customEndDate = ref(today)

// ✅ FIX: Typage strict avec 'as const' pour inférer les types littéraux
const periods = [
  { label: 'Jour', value: 'day' as const },
  { label: 'Personnalisé', value: 'custom' as const }
]

/* ================= RANGE ================= */
const range = computed(() => {
  if (selectedPeriod.value === 'custom') {
    return { start: new Date(customStartDate.value), end: new Date(customEndDate.value) }
  }
  const base = new Date(selectedDate.value)
  return { start: base, end: base }
})

const format = (d: Date) => d.toISOString().split('T')[0]

const emitFilters = () => {
  emit('filter-change', {
    startDate: format(range.value.start),
    endDate: format(range.value.end),
    employeeId: selectedEmployee.value,
    period: selectedPeriod.value,
    viewMode: selectedViewMode.value
  })
}

/* ================= ACTIONS ================= */
const selectPeriod = (p: 'day' | 'custom') => {
  selectedPeriod.value = p
  emitFilters()
}

const selectViewMode = (mode: 'normal' | 'analytics') => {
  selectedViewMode.value = mode
  emitFilters()
}

const handleCustomDateChange = () => emitFilters()

const resetFilters = () => {
  selectedPeriod.value = 'day'
  selectedDate.value = today
  selectedEmployee.value = ''
  selectedViewMode.value = 'normal'
  customStartDate.value = today
  customEndDate.value = today
  emitFilters()
}

/* ================= UI COMPUTED ================= */
const hasActiveFilters = computed(() =>
    selectedPeriod.value !== 'day' || selectedEmployee.value !== '' || selectedViewMode.value === 'analytics'
)

const periodLabel = computed(() => (selectedPeriod.value === 'day' ? 'du jour' : 'de la période'))

/* ✅ FIX : support affichage range custom */
/* ================= DISPLAYED RANGE (FIX PRINCIPAL) ================= */
const displayedRange = computed(() => {
  const f = (d: Date) =>
      d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })

  // 👉 priorité aux dates sélectionnées par l'utilisateur
  if (selectedPeriod.value === 'custom') {
    return `${f(range.value.start)} → ${f(range.value.end)}`
  }

  if (selectedPeriod.value === 'day') {
    return f(range.value.start)
  }

  // fallback backend
  // if (props.summary?.period) {
  //   return `${f(new Date(props.summary.period.start))} → ${f(new Date(props.summary.period.end))}`
  // }

  return ''
})


const employeeCount = computed(() => props.summary.total_team_members)

watch(() => props.date, d => d && (selectedDate.value = d))
</script>

<style scoped>
.dashboard-hero { display: flex; flex-direction: column; gap: 1.4rem; }

.hero-header {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1.5rem;
  padding: 1.75rem 2rem;
  border-radius: 20px;
  background: linear-gradient(135deg,#ffffff,#f8fafc);
  border: 1px solid #e2e8f0;
  box-shadow: 0 12px 30px rgba(0,0,0,0.06);
}

.hero-title { font-size: 2rem; font-weight: 800; margin: 0; }
.employee-count { background:#eef2ff; padding:.2rem .6rem; border-radius:999px; font-size:.85rem; }

/* ================= DATE BAR (NEW) ================= */
.date-bar { display:flex; justify-content:flex-start; }
.date-badge {
  background: linear-gradient(135deg,#3b82f6,#2563eb);
  color:white;
  padding:.5rem .9rem;
  border-radius:999px;
  font-weight:600;
  font-size:.85rem;
  box-shadow:0 6px 14px rgba(59,130,246,.35);
}

.filter-bar { display:flex; gap:.75rem; flex-wrap:wrap; justify-content:flex-end; }

.view-mode-switch, .period-switch, .date-picker-container, .custom-range, .employee-filter {
  background:white; border:1px solid #e2e8f0; border-radius:14px; padding:.4rem; display:flex; align-items:center;
}

button { cursor:pointer; border:none; background:transparent; padding:.45rem .8rem; border-radius:10px; font-weight:600; }

/* ✅ FIX : même couleur active pour tous */
button.active {
  background: linear-gradient(135deg,#3b82f6,#2563eb);
  color:white;
  box-shadow:0 4px 10px rgba(59,130,246,.35);
}

.employee-select, .date-input { border:none; background:transparent; font-weight:600; }

.active-filters-indicator {
  display:flex; justify-content:space-between; align-items:center; padding:1rem 1.4rem;
  background:linear-gradient(135deg,#eef2ff,#dbeafe); border-radius:14px;
}

.reset-button { background:#3b82f6; color:white; border-radius:10px; padding:.5rem .9rem; }

@media(max-width:900px){ .hero-header{grid-template-columns:1fr;} .filter-bar{justify-content:flex-start;} }
</style>