<template>
  <div>
    <div v-if="schedules.length === 0" class="content">
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>Aucun emploi du temps</h3>
        <p>Commencez par créer votre premier emploi du temps planifié</p>
      </div>
    </div>

    <div v-else class="schedules-grid">
      <div
        v-for="schedule in schedules"
        :key="schedule.guid"
        class="schedule-card"
        :class="{ 'schedule-expired': isExpired(schedule.valid_to) }"
      >
        <div class="schedule-card-header">
          <div>
            <h3 class="schedule-name">{{ schedule.name }}</h3>
            <div class="schedule-meta">
              <span class="schedule-date-range">
                📅 {{ formatDate(schedule.valid_from) }} → {{ formatDate(schedule.valid_to) }}
              </span>
              <span class="schedule-status" :class="getStatusClass(schedule)">
                {{ getStatus(schedule) }}
              </span>
              <span class="schedule-employees">
                👥 {{ getAssignedEmployeesCount(schedule.guid!) }} employé(s)
              </span>
            </div>
          </div>
          <div class="schedule-actions">
            <button class="btn-icon-action" @click="$emit('edit', schedule)" title="Modifier">
              ✏️
            </button>
            <button class="btn-icon-action" @click="$emit('duplicate', schedule)" title="Dupliquer">
              📋
            </button>
            <button class="btn-icon-action" @click="confirmDelete(schedule)"
                    title="Supprimer">
              🗑️
            </button>
          </div>
        </div>

        <!-- Tolérance globale (calculée depuis les périodes) -->
        <div class="schedule-global-tolerance">
          <span class="tolerance-label">Tolérance commune :</span>
          <span class="tolerance-value-global">⏱️ {{ getMostCommonTolerance(schedule) }} minutes</span>
        </div>

        <!-- Preview des jours -->
        <div class="schedule-preview">
          <div
            v-for="day in daysOfWeek"
            :key="day.value"
            class="day-preview"
            :class="{ 'day-off': !isDayActive(schedule, day.value) }"
          >
            <span class="day-label">{{ day.short }}</span>

            <template v-if="isDayActive(schedule, day.value)">
              <div class="day-periods">
                <div
                  v-for="(period, index) in schedule.definition[day.value]"
                  :key="index"
                  class="period-summary"
                >
                  <span class="day-hours">
                    {{ period.work[0] }} - {{ period.work[1] }}
                  </span>
                  <span
                    v-if="period.pause"
                    class="day-pause"
                    :title="`Pause: ${period.pause[0]} - ${period.pause[1]}`"
                  >
                    ☕
                  </span>
                  <span
                    v-if="hasCustomTolerance(schedule, period)"
                    class="day-tolerance-custom"
                    :title="`Tolérance: ${period.tolerance}min`"
                  >
                    ⏱️ {{ period.tolerance }}min
                  </span>
                </div>
              </div>
            </template>

            <span v-else class="day-off-label">Repos</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="closeDeleteConfirm">
      <div class="modal modal-small" @click.stop>
        <div class="modal-header">
          <h2>⚠️ Confirmer la suppression</h2>
          <button class="btn-close" @click="closeDeleteConfirm">×</button>
        </div>

        <div class="modal-body">
          <p class="confirm-message">
            Êtes-vous sûr de vouloir supprimer l'emploi de temps
            <strong>{{ scheduleToDelete?.name }}</strong> ?
          </p>
          <p class="confirm-warning">
            ⚠️ Cette action est irréversible
          </p>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeDeleteConfirm">
            Annuler
          </button>
          <button class="btn btn-danger" @click="handleDelete">
            🗑️ Supprimer définitivement
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import "../../assets/css/toke-schedule-21.css"

interface Period {
  work: [string, string];
  pause: [string, string] | null;
  tolerance: number;
}

interface Definition {
  Mon: Period[];
  Tue: Period[];
  Wed: Period[];
  Thu: Period[];
  Fri: Period[];
  Sat: Period[];
  Sun: Period[];
}

interface Schedule {
  guid?: string;
  name: string;
  valid_from: string;
  valid_to: string;
  definition: Definition;
}

interface Employee {
  id: number;
  name: string;
  role: string;
  assignedScheduleGuid: string | null;
}

interface DayOfWeek {
  label: string;
  short: string;
  value: keyof Definition;
}

const props = defineProps<{
  schedules: Schedule[];
  employees: Employee[];
}>();

const emit = defineEmits<{
  edit: [schedule: Schedule];
  duplicate: [schedule: Schedule];
  deleteSchedule: [guid: string];
}>();

// États pour la confirmation de suppression
const showDeleteConfirm = ref(false);
const scheduleToDelete = ref<Schedule | null>(null);

const daysOfWeek: DayOfWeek[] = [
  { label: 'Lundi', short: 'Lun', value: 'Mon' },
  { label: 'Mardi', short: 'Mar', value: 'Tue' },
  { label: 'Mercredi', short: 'Mer', value: 'Wed' },
  { label: 'Jeudi', short: 'Jeu', value: 'Thu' },
  { label: 'Vendredi', short: 'Ven', value: 'Fri' },
  { label: 'Samedi', short: 'Sam', value: 'Sat' },
  { label: 'Dimanche', short: 'Dim', value: 'Sun' }
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  };
  return date.toLocaleDateString('fr-FR', options);
}

function isExpired(endDate: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return endDate < today;
}

function getStatus(schedule: Schedule): string {
  const today = new Date().toISOString().split('T')[0];

  if (schedule.valid_to < today) {
    return '⏹️ Terminé';
  }

  if (schedule.valid_from > today) {
    return '⏳ À venir';
  }

  return '✅ En cours';
}

function getStatusClass(schedule: Schedule): string {
  const today = new Date().toISOString().split('T')[0];

  if (schedule.valid_to < today) {
    return 'status-expired';
  }

  if (schedule.valid_from > today) {
    return 'status-upcoming';
  }

  return 'status-active';
}

function getAssignedEmployeesCount(scheduleGuid: string): number {
  return props.employees.filter(e => e.assignedScheduleGuid === scheduleGuid).length;
}

function isDayActive(schedule: Schedule, day: keyof Definition): boolean {
  return schedule.definition[day] && schedule.definition[day].length > 0;
}

function getMostCommonTolerance(schedule: Schedule): number {
  const tolerances: number[] = [];

  daysOfWeek.forEach(day => {
    if (schedule.definition[day.value]) {
      schedule.definition[day.value].forEach(period => {
        tolerances.push(period.tolerance);
      });
    }
  });

  if (tolerances.length === 0) return 0;

  // Trouver la tolérance la plus fréquente
  const frequencyMap: Record<number, number> = {};
  tolerances.forEach(t => {
    frequencyMap[t] = (frequencyMap[t] || 0) + 1;
  });

  let maxFreq = 0;
  let mostCommon = 0;
  Object.entries(frequencyMap).forEach(([tolerance, freq]) => {
    if (freq > maxFreq) {
      maxFreq = freq;
      mostCommon = parseInt(tolerance);
    }
  });

  return mostCommon;
}

function hasCustomTolerance(schedule: Schedule, period: Period): boolean {
  const commonTolerance = getMostCommonTolerance(schedule);
  return period.tolerance !== commonTolerance;
}

// Gestion de la suppression
function confirmDelete(schedule: Schedule) {
  scheduleToDelete.value = schedule;
  showDeleteConfirm.value = true;
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false;
  scheduleToDelete.value = null;
}

function handleDelete() {
  if (scheduleToDelete.value) {
    emit('deleteSchedule', scheduleToDelete.value.guid!);
    closeDeleteConfirm();
  }
}
</script>

<style scoped>
.day-periods {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.period-summary {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
}

.day-pause {
  font-size: 0.7rem;
  cursor: help;
}

.day-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.day-hours {
  font-size: 0.75rem;
  white-space: nowrap;
}

.day-tolerance-custom {
  font-size: 0.7rem;
  color: #f59e0b;
  font-weight: 600;
}
</style>


