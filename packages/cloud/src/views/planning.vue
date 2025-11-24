<template>
  <section class="planning-section">

    <div class="planning-container">
      <div class="planning-header">
        <h2 class="section-title">Planning de travail</h2>
        <div class="planning-controls">
          <div class="week-selector">
            <button @click="changeWeek(-1)" class="week-btn">
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <span class="current-week">{{ currentWeekLabel }}</span>
            <button @click="changeWeek(1)" class="week-btn">
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
          <button @click="goToToday" class="today-btn">Aujourd'hui</button>
          <select v-model="viewMode" class="view-select">
            <option value="week">Vue semaine</option>
            <option value="month">Vue mois</option>
          </select>
        </div>
      </div>

      <div class="planning-filters">
        <div class="search-box">
          <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            type="text"
            v-model="searchEmployee"
            placeholder="Rechercher un employé..."
            class="search-input"
          >
        </div>
        <select v-model="siteFilter" class="filter-select">
          <option value="">Tous les sites</option>
          <option v-for="site in sites" :key="site.id" :value="site.id">
            {{ site.name }}
          </option>
        </select>
      </div>

      <div class="planning-grid" v-if="viewMode === 'week'">
        <div class="grid-header">
          <div class="employee-column-header">Employé</div>
          <div v-for="day in weekDays" :key="day.date" class="day-header" :class="{ 'today': isToday(day.date) }">
            <div class="day-name">{{ day.name }}</div>
            <div class="day-date">{{ formatDayDate(day.date) }}</div>
          </div>
        </div>

        <div class="grid-body">
          <div v-for="employee in filteredEmployees" :key="employee.id" class="employee-row">
            <div class="employee-info-cell">
              <div class="employee-avatar">
                <img v-if="employee.avatar" :src="employee.avatar" :alt="employee.name">
                <div v-else class="avatar-placeholder">{{ employee.initials }}</div>
              </div>
              <div class="employee-details">
                <span class="employee-name">{{ employee.name }}</span>
                <span class="employee-position">{{ employee.position }}</span>
              </div>
            </div>

            <div v-for="day in weekDays" :key="`${employee.id}-${day.date}`"
                 class="schedule-cell"
                 :class="{ 'today': isToday(day.date) }"
                 @click="editSchedule(employee, day)">
              <div v-if="getSchedule(employee.id, day.date)" class="schedule-item" :class="getScheduleClass(employee.id, day.date)">
                <div class="schedule-time">
                  {{ getSchedule(employee.id, day.date).startTime }} - {{ getSchedule(employee.id, day.date).endTime }}
                </div>
                <div class="schedule-type">{{ getSchedule(employee.id, day.date).type }}</div>
              </div>
              <div v-else class="schedule-empty">
                <span class="add-schedule">+</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vue mois -->
      <div class="planning-month" v-if="viewMode === 'month'">
        <div class="month-header">
          <div v-for="day in monthDays" :key="day" class="month-day-header">
            {{ day }}
          </div>
        </div>
        <div class="month-grid">
          <div v-for="week in monthWeeks" :key="week.weekNumber" class="month-week">
            <div v-for="day in week.days" :key="day.date"
                 class="month-day-cell"
                 :class="{
                   'other-month': !day.isCurrentMonth,
                   'today': isToday(day.date)
                 }">
              <div class="day-number">{{ day.dayNumber }}</div>
              <div class="day-schedules">
                <div v-for="schedule in getDaySchedules(day.date)" :key="schedule.employeeId"
                     class="mini-schedule"
                     :class="schedule.type"
                     :title="`${schedule.employeeName}: ${schedule.startTime}-${schedule.endTime}`">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="planning-legend">
        <h3 class="legend-title">Légende</h3>
        <div class="legend-items">
          <div class="legend-item">
            <div class="legend-color work"></div>
            <span>Travail</span>
          </div>
          <div class="legend-item">
            <div class="legend-color remote"></div>
            <span>Télétravail</span>
          </div>
          <div class="legend-item">
            <div class="legend-color leave"></div>
            <span>Congé</span>
          </div>
          <div class="legend-item">
            <div class="legend-color sick"></div>
            <span>Maladie</span>
          </div>
          <div class="legend-item">
            <div class="legend-color rest"></div>
            <span>Repos</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal d'édition -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Modifier le planning</h3>
          <button @click="closeModal" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Employé</label>
            <input type="text" :value="editingSchedule.employeeName" disabled class="form-input">
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="text" :value="formatDate(editingSchedule.date)" disabled class="form-input">
          </div>
          <div class="form-group">
            <label>Type</label>
            <select v-model="editingSchedule.type" class="form-select">
              <option value="work">Travail</option>
              <option value="remote">Télétravail</option>
              <option value="leave">Congé</option>
              <option value="sick">Maladie</option>
              <option value="rest">Repos</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Heure début</label>
              <input type="time" v-model="editingSchedule.startTime" class="form-input">
            </div>
            <div class="form-group">
              <label>Heure fin</label>
              <input type="time" v-model="editingSchedule.endTime" class="form-input">
            </div>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="editingSchedule.notes" class="form-textarea" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="deleteSchedule" class="btn-delete">Supprimer</button>
          <div class="modal-actions">
            <button @click="closeModal" class="btn-cancel">Annuler</button>
            <button @click="saveSchedule" class="btn-save">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useEmployeeStore } from '../composables/useEmployeeStore';
import HeadBuilder from '@/utils/HeadBuilder';
import planningCss from "../assets/css/planning-toke-14.css?url";
import dashboardCss from "../assets/css/toke-dMain-04.css?url";

// const currentUser = ref({
//   name: 'Danielle',
//   company: 'IMEDIATIS'
// });
const notificationCount = ref(2);

const employeeStore = useEmployeeStore();
const currentWeekStart = ref(getMonday(new Date()));
const viewMode = ref<'week' | 'month'>('week');
const searchEmployee = ref('');
const siteFilter = ref<number | ''>('');
const showEditModal = ref(false);
const editingSchedule = ref<any>({});

const sites = ref([
  { id: 1, name: 'Total Bedi' },
  { id: 2, name: 'Total energie' },
  { id: 3, name: 'Total bonamoussadi' }
]);

// Données de planning (à remplacer par des vraies données du store)
const schedules = ref<any[]>([
  { employeeId: 1, date: '2024-01-15', startTime: '09:00', endTime: '17:00', type: 'work' },
  { employeeId: 1, date: '2024-01-16', startTime: '09:00', endTime: '17:00', type: 'remote' },
  { employeeId: 1, date: '2024-01-17', startTime: '09:00', endTime: '17:00', type: 'work' },
  { employeeId: 2, date: '2024-01-15', startTime: '08:00', endTime: '16:00', type: 'work' },
  { employeeId: 2, date: '2024-01-16', startTime: '08:00', endTime: '16:00', type: 'work' },
  { employeeId: 2, date: '2024-01-18', type: 'leave' },
]);

const currentWeekLabel = computed(() => {
  const endDate = new Date(currentWeekStart.value);
  endDate.setDate(endDate.getDate() + 6);
  return `${formatShortDate(currentWeekStart.value)} - ${formatShortDate(endDate)}`;
});

const weekDays = computed(() => {
  const days = [];
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart.value);
    date.setDate(date.getDate() + i);
    days.push({
      name: dayNames[i],
      date: formatDateKey(date)
    });
  }
  return days;
});

const monthDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const monthWeeks = computed(() => {
  const weeks = [];
  const firstDay = new Date(currentWeekStart.value.getFullYear(), currentWeekStart.value.getMonth(), 1);
  const lastDay = new Date(currentWeekStart.value.getFullYear(), currentWeekStart.value.getMonth() + 1, 0);

  let currentDate = getMonday(firstDay);
  let weekNumber = 0;

  while (currentDate <= lastDay || weekNumber < 6) {
    const week: any = { weekNumber, days: [] };

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + i);

      week.days.push({
        date: formatDateKey(date),
        dayNumber: date.getDate(),
        isCurrentMonth: date.getMonth() === currentWeekStart.value.getMonth()
      });
    }

    weeks.push(week);
    currentDate.setDate(currentDate.getDate() + 7);
    weekNumber++;

    if (weekNumber >= 6) break;
  }

  return weeks;
});

const filteredEmployees = computed(() => {
  return employeeStore.employees.value.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchEmployee.value.toLowerCase());
    const matchesSite = siteFilter.value ? emp.siteId === siteFilter.value : true;
    return matchesSearch && matchesSite;
  });
});

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  return dateStr === formatDateKey(today);
}

function changeWeek(direction: number): void {
  const newDate = new Date(currentWeekStart.value);
  newDate.setDate(newDate.getDate() + (direction * 7));
  currentWeekStart.value = newDate;
}

function goToToday(): void {
  currentWeekStart.value = getMonday(new Date());
}

function getSchedule(employeeId: number, dateStr: string): any {
  return schedules.value.find(s => s.employeeId === employeeId && s.date === dateStr);
}

function getScheduleClass(employeeId: number, dateStr: string): string {
  const schedule = getSchedule(employeeId, dateStr);
  return schedule ? schedule.type : '';
}

function getDaySchedules(dateStr: string): any[] {
  return schedules.value
    .filter(s => s.date === dateStr)
    .map(s => {
      const employee = employeeStore.employees.value.find(e => e.id === s.employeeId);
      return {
        ...s,
        employeeName: employee?.name || ''
      };
    });
}

function editSchedule(employee: any, day: any): void {
  const existingSchedule = getSchedule(employee.id, day.date);

  editingSchedule.value = {
    employeeId: employee.id,
    employeeName: employee.name,
    date: day.date,
    startTime: existingSchedule?.startTime || '09:00',
    endTime: existingSchedule?.endTime || '17:00',
    type: existingSchedule?.type || 'work',
    notes: existingSchedule?.notes || ''
  };

  showEditModal.value = true;
}

function saveSchedule(): void {
  const index = schedules.value.findIndex(
    s => s.employeeId === editingSchedule.value.employeeId && s.date === editingSchedule.value.date
  );

  const scheduleData = {
    employeeId: editingSchedule.value.employeeId,
    date: editingSchedule.value.date,
    startTime: editingSchedule.value.startTime,
    endTime: editingSchedule.value.endTime,
    type: editingSchedule.value.type,
    notes: editingSchedule.value.notes
  };

  if (index !== -1) {
    schedules.value[index] = scheduleData;
  } else {
    schedules.value.push(scheduleData);
  }

  closeModal();
}

function deleteSchedule(): void {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce planning ?')) {
    const index = schedules.value.findIndex(
      s => s.employeeId === editingSchedule.value.employeeId && s.date === editingSchedule.value.date
    );

    if (index !== -1) {
      schedules.value.splice(index, 1);
    }

    closeModal();
  }
}

function closeModal(): void {
  showEditModal.value = false;
  editingSchedule.value = {};
}

onMounted(() => {
  HeadBuilder.apply({
    title: 'Planning - Toké',
    css: [dashboardCss, planningCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });

  employeeStore.initialize();
});
</script>