<template>
  <div>
    <div v-if="rotations.length === 0" class="content">
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <h3>Aucune rotation</h3>
        <p>Créez d'abord des rotations pour les assigner</p>
      </div>
    </div>

    <div v-else class="content">
      <div class="rotations-assignments-list">
        <div
          v-for="rotation in rotations"
          :key="rotation.id"
          class="rotation-assignment-card"
        >
          <div class="rotation-assignment-header">
            <div class="rotation-assignment-info">
              <h3 class="rotation-assignment-name">{{ rotation.name }}</h3>
              <div class="rotation-assignment-meta">
                <span class="assignment-date">
                  📅 Assignée le {{ formatDateFull(rotation.assignedDate || rotation.startDate) }}
                </span>
                <span class="assignment-count">
                  👥 {{ rotation.employeeIds.length }} personne(s) assignée(s)
                </span>
              </div>
            </div>
            <div class="rotation-assignment-status">
              <div class="rotation-active-dot" :class="{ active: rotation.isActive }"></div>
              <span class="status-label">{{ rotation.isActive ? 'Active' : 'Inactive' }}</span>
            </div>
          </div>

          <div class="rotation-assignment-schedules">
            <span class="schedules-label">Emplois du temps :</span>
            <div class="schedules-badges">
              <span
                v-for="scheduleId in rotation.scheduleIds"
                :key="scheduleId"
                class="schedule-mini-badge"
              >
                {{ getScheduleName(scheduleId) }}
              </span>
            </div>
          </div>

          <div class="rotation-assignment-employees">
            <span class="employees-label">Employés participants :</span>
            <div class="employees-chips">
              <div
                v-for="empId in rotation.employeeIds"
                :key="empId"
                class="employee-chip-compact"
              >
                <div class="employee-chip-avatar">{{ getEmployeeInitials(empId) }}</div>
                <span class="employee-chip-name">{{ getEmployeeName(empId) }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="rotation-assignment-actions">
            <button
              class="btn btn-sm btn-secondary"
              @click="openAssignmentForm(rotation)"
              title="Modifier l'assignation"
            >
              ✏️ Modifier
            </button>
            <button
              class="btn btn-sm btn-danger"
              @click="confirmDelete(rotation)"
              title="Supprimer l'assignation"
            >
              🗑️ Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de formulaire d'assignation -->
    <AssignmentForm
      v-if="showAssignmentForm"
      :assignment="selectedAssignment"
      :isEditMode="isEditMode"
      :schedules="schedules"
      :employees="employees"
      :rotations="rotations"
      @save="handleSaveAssignment"
      @close="closeAssignmentForm"
    />

    <!-- Modal de confirmation de suppression -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="closeDeleteConfirm">
      <div class="modal modal-small" @click.stop>
        <div class="modal-header">
          <h2>⚠️ Confirmer la suppression</h2>
          <button class="btn-close" @click="closeDeleteConfirm">×</button>
        </div>

        <div class="modal-body">
          <p class="confirm-message">
            Êtes-vous sûr de vouloir supprimer l'assignation de la rotation
            <strong>{{ rotationToDelete?.name }}</strong> ?
          </p>
          <p class="confirm-warning">
            ⚠️ Cette action est irréversible et affectera
            <strong>{{ rotationToDelete?.employeeIds.length }} employé(s)</strong>.
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
import AssignmentForm from '../schedule/assignmentForm.vue';
import "../../assets/css/toke-assignmentList-25.css"

interface Schedule {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  role: string;
}

interface Rotation {
  id: number;
  name: string;
  scheduleIds: number[];
  employeeIds: number[];
  periodType: 'day' | 'week' | 'month';
  startDate: string;
  isActive: boolean;
  assignedDate?: string;
}

const props = defineProps<{
  rotations: Rotation[];
  schedules: Schedule[];
  employees: Employee[];
}>();

const emit = defineEmits<{
  saveAssignment: [assignment: any];
  deleteAssignment: [rotationId: number];
  openAssignmentForm: [];
}>();

// États pour le formulaire d'assignation
const showAssignmentForm = ref(false);
const selectedAssignment = ref<any>(null);
const isEditMode = ref(false);

// États pour la confirmation de suppression
const showDeleteConfirm = ref(false);
const rotationToDelete = ref<Rotation | null>(null);

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

function formatDateFull(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  };
  return date.toLocaleDateString('fr-FR', options);
}

// Convertir une date au format YYYY-MM-DD pour l'input date
function toInputDateFormat(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Gestion du formulaire d'assignation
function openAssignmentForm(rotation?: Rotation) {
  if (rotation) {
    // Mode édition - préparer les données exactement comme elles sont stockées
    isEditMode.value = true;
    selectedAssignment.value = {
      id: rotation.id,
      employeeIds: [...rotation.employeeIds],
      assignmentType: 'rotation',
      rotationId: rotation.id,
      scheduleId: null,
      // Utiliser la date d'assignation existante ou la date de début
      assignedDate: toInputDateFormat(rotation.assignedDate || rotation.startDate),
      notes: ''
    };
    showAssignmentForm.value = true;
  } else {
    // Mode création - émettre l'événement pour que le composant parent ouvre le formulaire
    emit('openAssignmentForm');
  }
}

function closeAssignmentForm() {
  showAssignmentForm.value = false;
  selectedAssignment.value = null;
  isEditMode.value = false;
}

function handleSaveAssignment(assignment: any) {
  emit('saveAssignment', assignment);
  closeAssignmentForm();
}

// Gestion de la suppression
function confirmDelete(rotation: Rotation) {
  rotationToDelete.value = rotation;
  showDeleteConfirm.value = true;
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false;
  rotationToDelete.value = null;
}

function handleDelete() {
  if (rotationToDelete.value) {
    emit('deleteAssignment', rotationToDelete.value.id);
    closeDeleteConfirm();
  }
}
</script>
