<template>
  <div class="schedule-manager">
    <!-- Sidebar -->
    <aside class="sidebar">
      <nav class="sidebar-nav">
        <button
          class="nav-item"
          :class="{ 'active': activeTab === 'schedules' }"
          @click="activeTab = 'schedules'"
        >
          <span class="nav-item-icon">📅</span>
          <span>Emplois du temps</span>
          <span class="nav-item-badge">{{ schedules.length }}</span>
        </button>
        <button
          class="nav-item"
          :class="{ 'active': activeTab === 'assignments' }"
          @click="activeTab = 'assignments'"
        >
          <span class="nav-item-icon">👥</span>
          <span>Assignations</span>
          <span class="nav-item-badge">{{ employees.length }}</span>
        </button>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Header -->
      <header class="page-header">
        <div class="page-header-left">
        </div>
        <button class="btn btn-primary" @click="openCreateModal" v-if="activeTab === 'schedules'">
          <span class="btn-icon">+</span>
          Créer un emploi du temps
        </button>
      </header>

      <!-- Content: Liste des emplois du temps -->
      <div v-if="activeTab === 'schedules'">
        <div v-if="schedules.length === 0" class="content">
          <div class="empty-state">
            <div class="empty-icon">📅</div>
            <h3>Aucun emploi du temps</h3>
            <p>Commencez par créer votre premier emploi du temps planifié</p>
            <button class="btn btn-primary" @click="openCreateModal">
              <span class="btn-icon">+</span>
              Créer un emploi du temps
            </button>
          </div>
        </div>

        <div v-else class="schedules-grid">
          <div
            v-for="schedule in schedules"
            :key="schedule.id"
            class="schedule-card"
            :class="{ 'schedule-expired': isExpired(schedule.endDate) }"
          >
            <div class="schedule-card-header">
              <div>
                <h3 class="schedule-name">{{ schedule.name }}</h3>
                <div class="schedule-meta">
                  <span class="schedule-date-range">
                    📅 {{ formatDate(schedule.startDate) }} → {{ formatDate(schedule.endDate) }}
                  </span>
                  <span class="schedule-status" :class="getStatusClass(schedule)">
                    {{ getStatus(schedule) }}
                  </span>
                  <span class="schedule-employees">
                    👥 {{ getAssignedEmployeesCount(schedule.id) }} employé(s)
                  </span>
                </div>
              </div>
              <div class="schedule-actions">
                <button class="btn-icon-action" @click="editSchedule(schedule)" title="Modifier">
                  ✏️
                </button>
                <button class="btn-icon-action" @click="duplicateSchedule(schedule)" title="Dupliquer">
                  📋
                </button>
                <button class="btn-icon-action" @click="deleteSchedule(schedule.id)" title="Supprimer">
                  🗑️
                </button>
              </div>
            </div>

            <!-- Tolérance globale -->
            <div class="schedule-global-tolerance">
              <span class="tolerance-label">Tolérance globale :</span>
              <span class="tolerance-value-global">⏱️ {{ schedule.defaultTolerance }} minutes</span>
              <span class="tolerance-note">{{ schedule.autoRepeat ? '🔄 Répétition automatique activée' : '' }}</span>
            </div>

            <!-- Preview des jours -->
            <div class="schedule-preview">
              <div
                v-for="day in daysOfWeek"
                :key="day.value"
                class="day-preview"
                :class="{ 'day-off': !schedule.days[day.value].isActive }"
              >
                <span class="day-label">{{ day.short }}</span>
                <span v-if="schedule.days[day.value].isActive" class="day-hours">
                  {{ schedule.days[day.value].startTime }} - {{ schedule.days[day.value].endTime }}
                </span>
                <span v-else class="day-off-label">Repos</span>
                <span
                  v-if="schedule.days[day.value].isActive && schedule.days[day.value].customTolerance !== null"
                  class="day-tolerance-custom"
                  :title="`Tolérance personnalisée: ${schedule.days[day.value].customTolerance}min`"
                >
                  ⏱️ {{ schedule.days[day.value].customTolerance }}min
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content: Assignations -->
      <div v-if="activeTab === 'assignments'">
        <div v-if="employees.length === 0" class="content">
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <h3>Aucun employé</h3>
            <p>Les employés apparaîtront ici pour l'assignation</p>
          </div>
        </div>

        <div v-else class="content">
          <div class="employees-list">
            <div
              v-for="employee in employees"
              :key="employee.id"
              class="employee-card"
            >
              <div class="employee-info">
                <div class="employee-avatar">{{ getInitials(employee.name) }}</div>
                <div>
                  <h4 class="employee-name">{{ employee.name }}</h4>
                  <p class="employee-role">{{ employee.role }}</p>
                </div>
              </div>

              <div class="employee-schedule">
                <label class="form-label">Emploi du temps assigné</label>
                <select
                  class="form-select"
                  v-model="employee.assignedScheduleId"
                  @change="updateEmployeeSchedule(employee.id, employee.assignedScheduleId)"
                >
                  <option :value="null">Aucun</option>
                  <option
                    v-for="schedule in activeSchedules"
                    :key="schedule.id"
                    :value="schedule.id"
                  >
                    {{ schedule.name }} ({{ formatDate(schedule.startDate) }} → {{ formatDate(schedule.endDate) }})
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal Création/Modification -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ isEditMode ? 'Modifier l\'emploi du temps' : 'Créer un emploi du temps' }}</h2>
          <button class="btn-close" @click="closeModal">×</button>
        </div>

        <div class="modal-body">
          <!-- Informations générales -->
          <div class="form-section">
            <h3 class="section-title">Informations générales</h3>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nom de l'emploi du temps *</label>
                <input
                  type="text"
                  class="form-input"
                  v-model="currentSchedule.name"
                  placeholder="Ex: Équipe Matin Janvier, Service Client..."
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Date de début *</label>
                <input
                  type="date"
                  class="form-input"
                  v-model="currentSchedule.startDate"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Date de fin *</label>
                <input
                  type="date"
                  class="form-input"
                  v-model="currentSchedule.endDate"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Tolérance de retard par défaut</label>
                <select class="form-select" v-model="currentSchedule.defaultTolerance">
                  <option :value="0">Aucune tolérance</option>
                  <option :value="5">5 minutes</option>
                  <option :value="10">10 minutes</option>
                  <option :value="15">15 minutes</option>
                  <option :value="20">20 minutes</option>
                  <option :value="30">30 minutes</option>
                </select>
                <p class="form-hint">Cette tolérance s'appliquera à tous les jours sauf si personnalisée</p>
              </div>

              <div class="form-group">
                <label class="checkbox-wrapper-inline">
                  <input
                    type="checkbox"
                    v-model="currentSchedule.autoRepeat"
                  />
                  <span class="checkbox-label">Répéter automatiquement</span>
                </label>
                <p class="form-hint">L'emploi du temps se répétera automatiquement après la date de fin</p>
              </div>
            </div>
          </div>

          <!-- Configuration par jour -->
          <div class="form-section">
            <h3 class="section-title">Configuration hebdomadaire</h3>

            <div
              v-for="day in daysOfWeek"
              :key="day.value"
              class="day-config"
            >
              <div class="day-header">
                <label class="checkbox-wrapper">
                  <input
                    type="checkbox"
                    v-model="currentSchedule.days[day.value].isActive"
                  />
                  <span class="checkbox-label">{{ day.label }}</span>
                </label>
              </div>

              <div v-if="currentSchedule.days[day.value].isActive" class="day-details">
                <!-- Horaires -->
                <div class="time-group">
                  <div class="form-group">
                    <label class="form-label-sm">Début</label>
                    <input
                      type="time"
                      class="form-input-sm"
                      v-model="currentSchedule.days[day.value].startTime"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label-sm">Fin</label>
                    <input
                      type="time"
                      class="form-input-sm"
                      v-model="currentSchedule.days[day.value].endTime"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label-sm">Tolérance personnalisée</label>
                    <select
                      class="form-select-sm"
                      v-model="currentSchedule.days[day.value].customTolerance"
                    >
                      <option :value="null">Par défaut ({{ currentSchedule.defaultTolerance }}min)</option>
                      <option :value="0">Aucune tolérance</option>
                      <option :value="5">5 min</option>
                      <option :value="10">10 min</option>
                      <option :value="15">15 min</option>
                      <option :value="20">20 min</option>
                      <option :value="30">30 min</option>
                    </select>
                  </div>
                </div>

                <!-- Pauses -->
                <div class="pauses-section">
                  <div class="pauses-header">
                    <label class="form-label-sm">Pauses</label>
                    <button
                      class="btn-add-pause"
                      @click="addPause(day.value)"
                    >
                      + Ajouter une pause
                    </button>
                  </div>

                  <div
                    v-for="(pause, index) in currentSchedule.days[day.value].pauses"
                    :key="index"
                    class="pause-item"
                  >
                    <input
                      type="number"
                      class="form-input-sm"
                      v-model="pause.duration"
                      placeholder="Durée (min)"
                      min="0"
                    />
                    <span class="pause-unit">minutes</span>
                    <button
                      class="btn-remove"
                      @click="removePause(day.value, index)"
                    >
                      ×
                    </button>
                  </div>

                  <div v-if="currentSchedule.days[day.value].pauses.length === 0" class="no-pauses">
                    Aucune pause
                  </div>
                </div>
              </div>

              <div v-else class="day-off-notice">
                Jour de repos
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">
            Annuler
          </button>
          <button class="btn btn-primary" @click="saveSchedule">
            {{ isEditMode ? 'Enregistrer' : 'Créer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import "../assets/css/planning-toke-14.css"

// Types
interface Pause {
  duration: number;
}

interface DaySchedule {
  isActive: boolean;
  startTime: string;
  endTime: string;
  customTolerance: number | null;
  pauses: Pause[];
}

interface Schedule {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  defaultTolerance: number;
  autoRepeat: boolean;
  days: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
}

interface Employee {
  id: number;
  name: string;
  role: string;
  assignedScheduleId: number | null;
}

interface DayOfWeek {
  label: string;
  short: string;
  value: keyof Schedule['days'];
}

// State
const activeTab = ref<'schedules' | 'assignments'>('schedules');
const showModal = ref(false);
const isEditMode = ref(false);
const editingScheduleId = ref<number | null>(null);

const daysOfWeek: DayOfWeek[] = [
  { label: 'Lundi', short: 'Lun', value: 'monday' },
  { label: 'Mardi', short: 'Mar', value: 'tuesday' },
  { label: 'Mercredi', short: 'Mer', value: 'wednesday' },
  { label: 'Jeudi', short: 'Jeu', value: 'thursday' },
  { label: 'Vendredi', short: 'Ven', value: 'friday' },
  { label: 'Samedi', short: 'Sam', value: 'saturday' },
  { label: 'Dimanche', short: 'Dim', value: 'sunday' }
];

const schedules = ref<Schedule[]>([
  {
    id: 1,
    name: 'Équipe Matin - Janvier 2026',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    defaultTolerance: 15,
    autoRepeat: true,
    days: {
      monday: { isActive: true, startTime: '08:00', endTime: '16:00', customTolerance: null, pauses: [{ duration: 30 }, { duration: 15 }] },
      tuesday: { isActive: true, startTime: '08:00', endTime: '16:00', customTolerance: 10, pauses: [{ duration: 30 }, { duration: 15 }] },
      wednesday: { isActive: true, startTime: '08:00', endTime: '16:00', customTolerance: null, pauses: [{ duration: 30 }, { duration: 15 }] },
      thursday: { isActive: true, startTime: '08:00', endTime: '16:00', customTolerance: 20, pauses: [{ duration: 30 }, { duration: 15 }] },
      friday: { isActive: true, startTime: '08:00', endTime: '14:00', customTolerance: null, pauses: [{ duration: 30 }] },
      saturday: { isActive: false, startTime: '08:00', endTime: '16:00', customTolerance: null, pauses: [] },
      sunday: { isActive: false, startTime: '08:00', endTime: '16:00', customTolerance: null, pauses: [] }
    }
  },
  {
    id: 2,
    name: 'Équipe Après-midi - Janvier 2026',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    defaultTolerance: 10,
    autoRepeat: false,
    days: {
      monday: { isActive: true, startTime: '14:00', endTime: '22:00', customTolerance: null, pauses: [{ duration: 45 }] },
      tuesday: { isActive: true, startTime: '14:00', endTime: '22:00', customTolerance: null, pauses: [{ duration: 45 }] },
      wednesday: { isActive: true, startTime: '14:00', endTime: '22:00', customTolerance: null, pauses: [{ duration: 45 }] },
      thursday: { isActive: true, startTime: '14:00', endTime: '22:00', customTolerance: null, pauses: [{ duration: 45 }] },
      friday: { isActive: true, startTime: '14:00', endTime: '22:00', customTolerance: null, pauses: [{ duration: 45 }] },
      saturday: { isActive: true, startTime: '10:00', endTime: '18:00', customTolerance: 5, pauses: [{ duration: 30 }] },
      sunday: { isActive: false, startTime: '14:00', endTime: '22:00', customTolerance: null, pauses: [] }
    }
  }
]);

const employees = ref<Employee[]>([
  { id: 1, name: 'Jean Dupont', role: 'Développeur', assignedScheduleId: 1 },
  { id: 2, name: 'Marie Martin', role: 'Designer', assignedScheduleId: null },
  { id: 3, name: 'Pierre Dubois', role: 'Chef de projet', assignedScheduleId: 2 }
]);

const currentSchedule = ref<Schedule>(getEmptySchedule());

// Computed
const currentDate = computed(() => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return new Date().toLocaleDateString('fr-FR', options);
});

const activeSchedules = computed(() => {
  const today = new Date().toISOString().split('T')[0];
  return schedules.value.filter(s => s.endDate >= today);
});

// Functions
function getEmptySchedule(): Schedule {
  const emptyDay = (): DaySchedule => ({
    isActive: true,
    startTime: '09:00',
    endTime: '17:00',
    customTolerance: null,
    pauses: []
  });

  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

  return {
    id: 0,
    name: '',
    startDate: nextMonth.toISOString().split('T')[0],
    endDate: endOfNextMonth.toISOString().split('T')[0],
    defaultTolerance: 15,
    autoRepeat: false,
    days: {
      monday: emptyDay(),
      tuesday: emptyDay(),
      wednesday: emptyDay(),
      thursday: emptyDay(),
      friday: emptyDay(),
      saturday: { ...emptyDay(), isActive: false },
      sunday: { ...emptyDay(), isActive: false }
    }
  };
}

function openCreateModal() {
  isEditMode.value = false;
  currentSchedule.value = getEmptySchedule();
  showModal.value = true;
}

function editSchedule(schedule: Schedule) {
  isEditMode.value = true;
  editingScheduleId.value = schedule.id;
  currentSchedule.value = JSON.parse(JSON.stringify(schedule));
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  currentSchedule.value = getEmptySchedule();
  editingScheduleId.value = null;
}

function saveSchedule() {
  if (!currentSchedule.value.name.trim()) {
    alert('Veuillez saisir un nom pour l\'emploi du temps');
    return;
  }

  if (!currentSchedule.value.startDate || !currentSchedule.value.endDate) {
    alert('Veuillez saisir les dates de début et de fin');
    return;
  }

  if (currentSchedule.value.startDate > currentSchedule.value.endDate) {
    alert('La date de début doit être antérieure à la date de fin');
    return;
  }

  if (isEditMode.value && editingScheduleId.value) {
    const index = schedules.value.findIndex(s => s.id === editingScheduleId.value);
    if (index !== -1) {
      schedules.value[index] = {
        ...currentSchedule.value,
        id: editingScheduleId.value
      };
    }
  } else {
    const newSchedule: Schedule = {
      ...currentSchedule.value,
      id: Date.now()
    };
    schedules.value.push(newSchedule);
  }

  closeModal();
}

function deleteSchedule(id: number) {
  if (confirm('Êtes-vous sûr de vouloir supprimer cet emploi du temps ?')) {
    schedules.value = schedules.value.filter(s => s.id !== id);
    employees.value.forEach(emp => {
      if (emp.assignedScheduleId === id) {
        emp.assignedScheduleId = null;
      }
    });
  }
}

function duplicateSchedule(schedule: Schedule) {
  const duplicate: Schedule = JSON.parse(JSON.stringify(schedule));
  duplicate.id = Date.now();
  duplicate.name = `${schedule.name} (Copie)`;

  // Proposer le mois suivant
  const endDate = new Date(schedule.endDate);
  const nextMonthStart = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1);
  const nextMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 2, 0);

  duplicate.startDate = nextMonthStart.toISOString().split('T')[0];
  duplicate.endDate = nextMonthEnd.toISOString().split('T')[0];

  schedules.value.push(duplicate);
}

function addPause(day: keyof Schedule['days']) {
  currentSchedule.value.days[day].pauses.push({ duration: 30 });
}

function removePause(day: keyof Schedule['days'], index: number) {
  currentSchedule.value.days[day].pauses.splice(index, 1);
}

function getAssignedEmployeesCount(scheduleId: number): number {
  return employees.value.filter(e => e.assignedScheduleId === scheduleId).length;
}

function updateEmployeeSchedule(employeeId: number, scheduleId: number | null) {
  console.log(`Employé ${employeeId} assigné à l'emploi du temps ${scheduleId}`);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short'
  };
  return date.toLocaleDateString('fr-FR', options);
}

function isExpired(endDate: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return endDate < today;
}

function getStatus(schedule: Schedule): string {
  const today = new Date().toISOString().split('T')[0];

  if (schedule.endDate < today) {
    return schedule.autoRepeat ? '🔄 Expiré (répétition active)' : '⏹️ Terminé';
  }

  if (schedule.startDate > today) {
    return '⏳ À venir';
  }

  return '✅ En cours';
}

function getStatusClass(schedule: Schedule): string {
  const today = new Date().toISOString().split('T')[0];

  if (schedule.endDate < today) {
    return schedule.autoRepeat ? 'status-repeat' : 'status-expired';
  }

  if (schedule.startDate > today) {
    return 'status-upcoming';
  }

  return 'status-active';
}
</script>

<style>

</style>