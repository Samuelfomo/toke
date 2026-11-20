<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal modal-large" @click.stop>
      <div class="modal-header">
        <h2>📅 Calendrier de rotation - {{ rotation?.name }}</h2>
        <button class="btn-close" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <div class="calendar-info">
          <div class="calendar-summary">
            <div class="summary-item">
              <span class="summary-label">Période :</span>
              <span class="summary-value">{{ getPeriodLabel(rotation?.periodType) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Emplois du temps :</span>
              <span class="summary-value">
                {{ rotation?.scheduleIds.map(id => getScheduleName(id)).join(', ') }}
              </span>
            </div>
          </div>
        </div>

        <div class="rotation-calendar">
          <div
            v-for="(period, index) in periods"
            :key="index"
            class="calendar-period"
          >
            <div class="period-header">
              <span class="period-title">Période {{ index + 1 }}</span>
              <span class="period-dates">{{ period.startDate }} → {{ period.endDate }}</span>
            </div>
            <div class="period-assignments-compact">
              <div
                v-for="assignment in period.assignments"
                :key="assignment.employeeId"
                class="compact-assignment"
              >
                <div class="compact-employee">
                  <div class="compact-avatar">{{ getEmployeeInitials(assignment.employeeId) }}</div>
                  <span class="compact-name">{{ getEmployeeName(assignment.employeeId) }}</span>
                </div>
                <div class="compact-arrow">→</div>
                <div class="compact-position">
                  {{ assignment.scheduleName }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-primary" @click="$emit('close')">
          Fermer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import "../../assets/css/toke-schedule-21.css"

interface Schedule {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  name: string;
}

interface Rotation {
  id: number;
  name: string;
  scheduleIds: number[];
  employeeIds: number[];
  periodType: 'day' | 'week' | 'month';
  startDate: string;
  isActive: boolean;
}

const props = defineProps<{
  rotation: Rotation | null;
  schedules: Schedule[];
  employees: Employee[];
}>();

defineEmits<{
  close: [];
}>();

const periods = computed(() => {
  if (!props.rotation) return [];

  const result = [];
  const startDate = new Date(props.rotation.startDate);

  let periodDays = 1;
  if (props.rotation.periodType === 'week') periodDays = 7;
  if (props.rotation.periodType === 'month') periodDays = 30;

  for (let i = 0; i < 8; i++) {
    const periodStart = new Date(startDate);
    periodStart.setDate(periodStart.getDate() + (i * periodDays));

    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + periodDays - 1);

    const rotationOffset = i % props.rotation.scheduleIds.length;
    const assignments = props.rotation.employeeIds.map((empId, index) => {
      const scheduleIndex = (index + rotationOffset) % props.rotation!.scheduleIds.length;
      const scheduleId = props.rotation!.scheduleIds[scheduleIndex];

      return {
        employeeId: empId,
        scheduleName: getScheduleName(scheduleId)
      };
    });

    result.push({
      startDate: periodStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      endDate: periodEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      assignments
    });
  }

  return result;
});

function getScheduleName(scheduleId: number): string {
  const schedule = props.schedules.find(s => s.id === scheduleId);
  return schedule ? schedule.name : 'Inconnu';
}

function getEmployeeName(employeeId: number): string {
  const employee = props.employees.find(e => e.id === employeeId);
  return employee ? employee.name : 'Inconnu';
}

function getEmployeeInitials(employeeId: number): string {
  const name = getEmployeeName(employeeId);
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

function getPeriodLabel(periodType: 'day' | 'week' | 'month' | undefined): string {
  if (!periodType) return '';
  const labels = {
    day: 'Jour',
    week: 'Semaine',
    month: 'Mois'
  };
  return labels[periodType];
}
</script>

<style scoped>

</style>