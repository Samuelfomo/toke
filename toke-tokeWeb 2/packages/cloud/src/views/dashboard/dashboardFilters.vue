<template>
  <div class="dashboard-filters">
    <div class="filters-container">
      <!-- Filtre de période -->
      <div class="filter-group">
        <label class="filter-label">Période</label>
        <div class="period-tabs">
          <button
            v-for="period in periods"
            :key="period.value"
            class="period-tab"
            :class="{ active: selectedPeriod === period.value }"
            @click="handlePeriodChange(period.value)"
          >
            <svg v-html="period.icon" viewBox="0 0 24 24" fill="currentColor" class="tab-icon" />
            {{ period.label }}
          </button>
        </div>
      </div>

      <!-- Plage de dates personnalisée -->
      <transition name="slide">
        <div v-if="selectedPeriod === 'custom'" class="filter-group custom-dates">
          <label class="filter-label">Dates personnalisées</label>
          <div class="date-inputs">
            <input
              type="date"
              v-model="customDateRange.start"
              class="date-input"
              @change="handleCustomDateChange"
            />
            <span class="date-separator">→</span>
            <input
              type="date"
              v-model="customDateRange.end"
              class="date-input"
              @change="handleCustomDateChange"
            />
          </div>
        </div>
      </transition>

      <!-- Filtre par employé -->
      <div class="filter-group">
        <label class="filter-label">Employé</label>
        <select
          v-model="selectedEmployee"
          class="filter-select"
          @change="handleEmployeeChange"
        >
          <option value="">Tous les employés</option>
          <option
            v-for="employee in employees"
            :key="employee.guid"
            :value="employee.guid"
          >
            {{ employee.name }} - {{ employee.job_title }}
          </option>
        </select>
      </div>

      <!-- Filtre par département -->
      <div class="filter-group">
        <label class="filter-label">Département</label>
        <select
          v-model="selectedDepartment"
          class="filter-select"
          @change="handleDepartmentChange"
        >
          <option value="">Tous les départements</option>
          <option
            v-for="dept in departments"
            :key="dept"
            :value="dept"
          >
            {{ dept }}
          </option>
        </select>
      </div>

      <!-- Filtre par statut -->
      <div class="filter-group">
        <label class="filter-label">Statut</label>
        <div class="status-checkboxes">
          <label
            v-for="status in statuses"
            :key="status.value"
            class="status-checkbox"
            :class="{ active: selectedStatuses.includes(status.value) }"
          >
            <input
              type="checkbox"
              :value="status.value"
              v-model="selectedStatuses"
              @change="handleStatusChange"
            />
            <span class="checkbox-indicator" :class="`status-${status.color}`"></span>
            {{ status.label }}
          </label>
        </div>
      </div>

      <!-- Boutons d'action -->
      <div class="filter-actions">
        <button class="btn-reset" @click="resetFilters">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
          Réinitialiser
        </button>

        <button class="btn-apply" @click="applyFilters">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Appliquer
        </button>
      </div>
    </div>

    <!-- Résumé des filtres actifs -->
    <div v-if="hasActiveFilters" class="active-filters">
      <span class="active-label">Filtres actifs:</span>
      <div class="filter-tags">
        <span v-if="selectedPeriod !== 'day'" class="filter-tag">
          {{ getPeriodLabel(selectedPeriod) }}
          <button @click="selectedPeriod = 'day'" class="tag-remove">×</button>
        </span>
        <span v-if="selectedEmployee" class="filter-tag">
          {{ getEmployeeName(selectedEmployee) }}
          <button @click="selectedEmployee = ''" class="tag-remove">×</button>
        </span>
        <span v-if="selectedDepartment" class="filter-tag">
          {{ selectedDepartment }}
          <button @click="selectedDepartment = ''" class="tag-remove">×</button>
        </span>
        <span v-for="status in selectedStatuses" :key="status" class="filter-tag">
          {{ getStatusLabel(status) }}
          <button @click="removeStatus(status)" class="tag-remove">×</button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { FilterPeriod, TransformedEmployee, AttendanceFilters } from '@/service/UserService';

interface Props {
  employees: TransformedEmployee[];
  initialFilters?: AttendanceFilters;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'filter-change': [filters: AttendanceFilters];
}>();

// État des filtres
const selectedPeriod = ref<FilterPeriod>(props.initialFilters?.period || 'day');
const selectedEmployee = ref(props.initialFilters?.employeeGuid || '');
const selectedDepartment = ref(props.initialFilters?.department || '');
const selectedStatuses = ref<string[]>(props.initialFilters?.status || []);
const customDateRange = ref({
  start: '',
  end: ''
});

// Options de période
const periods = [
  {
    value: 'day' as FilterPeriod,
    label: 'Jour',
    icon: '<path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>'
  },
  {
    value: 'week' as FilterPeriod,
    label: 'Semaine',
    icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'
  },
  {
    value: 'month' as FilterPeriod,
    label: 'Mois',
    icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/>'
  },
  {
    value: 'custom' as FilterPeriod,
    label: 'Personnalisé',
    icon: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'
  }
];

// Options de statut
const statuses = [
  { value: 'present', label: 'Présents', color: 'green' },
  { value: 'late', label: 'En retard', color: 'orange' },
  { value: 'absent', label: 'Absents', color: 'red' },
  { value: 'on-pause', label: 'En pause', color: 'blue' },
  { value: 'off-day', label: 'Repos', color: 'gray' }
];

// Départements uniques
const departments = computed(() => {
  const depts = new Set(props.employees.map(e => e.department));
  return Array.from(depts).sort();
});

// Vérifier si des filtres sont actifs
const hasActiveFilters = computed(() => {
  return selectedPeriod.value !== 'day' ||
    selectedEmployee.value !== '' ||
    selectedDepartment.value !== '' ||
    selectedStatuses.value.length > 0;
});

// Gestionnaires d'événements
const handlePeriodChange = (period: FilterPeriod) => {
  selectedPeriod.value = period;
  if (period !== 'custom') {
    applyFilters();
  }
};

const handleEmployeeChange = () => {
  // Réinitialiser le filtre de département si un employé est sélectionné
  if (selectedEmployee.value) {
    selectedDepartment.value = '';
  }
};

const handleDepartmentChange = () => {
  // Réinitialiser le filtre d'employé si un département est sélectionné
  if (selectedDepartment.value) {
    selectedEmployee.value = '';
  }
};

const handleStatusChange = () => {
  // Les changements de statut seront appliqués au clic sur "Appliquer"
};

const handleCustomDateChange = () => {
  if (customDateRange.value.start && customDateRange.value.end) {
    applyFilters();
  }
};

const removeStatus = (status: string) => {
  const index = selectedStatuses.value.indexOf(status);
  if (index > -1) {
    selectedStatuses.value.splice(index, 1);
    applyFilters();
  }
};

const resetFilters = () => {
  selectedPeriod.value = 'day';
  selectedEmployee.value = '';
  selectedDepartment.value = '';
  selectedStatuses.value = [];
  customDateRange.value = { start: '', end: '' };
  applyFilters();
};

const applyFilters = () => {
  const filters: AttendanceFilters = {
    period: selectedPeriod.value,
    employeeGuid: selectedEmployee.value || undefined,
    department: selectedDepartment.value || undefined,
    status: selectedStatuses.value.length > 0 ? selectedStatuses.value as any : undefined
  };

  if (selectedPeriod.value === 'custom' && customDateRange.value.start && customDateRange.value.end) {
    filters.dateRange = {
      start: customDateRange.value.start,
      end: customDateRange.value.end
    };
  }

  emit('filter-change', filters);
};

// Helpers
const getPeriodLabel = (period: FilterPeriod): string => {
  return periods.find(p => p.value === period)?.label || period;
};

const getEmployeeName = (guid: string): string => {
  return props.employees.find(e => e.guid === guid)?.name || guid;
};

const getStatusLabel = (status: string): string => {
  return statuses.find(s => s.value === status)?.label || status;
};

// Appliquer les filtres initiaux au montage
watch(() => props.initialFilters, (newFilters) => {
  if (newFilters) {
    selectedPeriod.value = newFilters.period || 'day';
    selectedEmployee.value = newFilters.employeeGuid || '';
    selectedDepartment.value = newFilters.department || '';
    selectedStatuses.value = newFilters.status || [];
    if (newFilters.dateRange) {
      customDateRange.value = { ...newFilters.dateRange };
    }
  }
}, { immediate: true });
</script>

<style scoped>
.dashboard-filters {
  background: #ffffff;
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 1.5rem;
}

.filters-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

/* Filter Group */
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.25rem;
}

/* Period Tabs */
.period-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.period-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.period-tab:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.period-tab.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

.tab-icon {
  width: 18px;
  height: 18px;
}

/* Custom Dates */
.custom-dates {
  grid-column: 1 / -1;
}

.date-inputs {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.date-input {
  flex: 1;
  padding: 0.625rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #0f172a;
  transition: border-color 0.2s ease;
}

.date-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.date-separator {
  color: #94a3b8;
  font-weight: 600;
}

/* Select */
.filter-select {
  padding: 0.625rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #0f172a;
  background: #ffffff;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
}

/* Status Checkboxes */
.status-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.status-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-checkbox:hover {
  background: #f1f5f9;
}

.status-checkbox.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.status-checkbox input[type="checkbox"] {
  display: none;
}

.checkbox-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-green { background: #22c55e; }
.status-orange { background: #f59e0b; }
.status-red { background: #ef4444; }
.status-blue { background: #3b82f6; }
.status-gray { background: #94a3b8; }

/* Actions */
.filter-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}

.btn-reset,
.btn-apply {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reset {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.btn-reset:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.btn-apply {
  background: #3b82f6;
  border: 1px solid #3b82f6;
  color: #ffffff;
}

.btn-apply:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-reset svg,
.btn-apply svg {
  width: 16px;
  height: 16px;
}

/* Active Filters */
.active-filters {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.active-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1e40af;
}

.tag-remove {
  background: none;
  border: none;
  color: #1e40af;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  margin-left: 0.25rem;
}

.tag-remove:hover {
  color: #1e3a8a;
}

/* Animations */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 200px;
}

/* Responsive */
@media (max-width: 768px) {
  .filters-container {
    grid-template-columns: 1fr;
  }

  .period-tabs {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-actions {
    flex-direction: column;
  }

  .btn-reset,
  .btn-apply {
    width: 100%;
    justify-content: center;
  }
}
</style>