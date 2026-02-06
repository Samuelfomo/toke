<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal modal-large" @click.stop>
      <div class="modal-header">
        <h2>{{ isEditMode ? '✏️ Modifier l\'assignation' : '➕ Créer une assignation' }}</h2>
        <button class="btn-close" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <!-- Sélection des employés -->
        <div class="form-section">
          <h3 class="section-title">👥 Sélection des employés</h3>

          <div class="form-group">
            <label class="form-label">Employés * ({{ selectedEmployees.length }} sélectionné(s))</label>

            <!-- Liste déroulante multiple -->
            <div class="multi-select-wrapper">
              <div class="multi-select-header" @click="toggleDropdown">
                <div class="selected-employees-display">
                  <span v-if="selectedEmployees.length === 0" class="placeholder">
                    -- Sélectionnez un ou plusieurs employés --
                  </span>
                  <div v-else class="selected-employees-tags">
                    <span
                      v-for="empId in selectedEmployees"
                      :key="empId"
                      class="employee-tag"
                    >
                      {{ getEmployeeName(empId) }}
                      <button
                        type="button"
                        class="tag-remove"
                        @click.stop="removeEmployee(empId)"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                </div>
                <div class="dropdown-arrow">▼</div>
              </div>

              <div v-if="dropdownOpen" class="multi-select-dropdown">
                <label
                  v-for="employee in employees"
                  :key="employee.id"
                  class="dropdown-option"
                  :class="{ 'selected': isEmployeeSelected(employee.id) }"
                >
                  <input
                    type="checkbox"
                    :checked="isEmployeeSelected(employee.id)"
                    @change="toggleEmployee(employee.id)"
                    class="option-checkbox"
                  />
                  <div class="option-avatar">{{ getEmployeeInitials(employee.name) }}</div>
                  <div class="option-info">
                    <div class="option-name">{{ employee.name }}</div>
                    <div class="option-role">{{ employee.role }}</div>
                  </div>
                  <div class="option-check">✓</div>
                </label>
              </div>
            </div>

            <p v-if="selectedEmployees.length === 0" class="form-hint error">
              ⚠️ Vous devez sélectionner au moins un employé
            </p>
            <p v-else class="form-hint success">
              ✅ {{ selectedEmployees.length }} employé(s) sélectionné(s)
            </p>
          </div>
        </div>

        <!-- Type d'assignation -->
        <div class="form-section">
          <h3 class="section-title">📋 Type d'assignation</h3>

          <div class="assignment-type-selector">
            <label
              class="assignment-type-card"
              :class="{ 'selected': formData.assignmentType === 'schedule', 'disabled': isEditMode }"
            >
              <input
                v-model="formData.assignmentType"
                type="radio"
                value="schedule"
                class="assignment-type-radio"
                :disabled="isEditMode"
              />
              <div class="assignment-type-icon">📅</div>
              <div class="assignment-type-info">
                <div class="assignment-type-name">Emploi du temps fixe</div>
                <div class="assignment-type-description">
                  Assigner un emploi du temps permanent aux employés
                </div>
              </div>
              <div class="assignment-type-check">✓</div>
            </label>

            <label
              class="assignment-type-card"
              :class="{ 'selected': formData.assignmentType === 'rotation', 'disabled': isEditMode }"
            >
              <input
                v-model="formData.assignmentType"
                type="radio"
                value="rotation"
                class="assignment-type-radio"
                :disabled="isEditMode"
              />
              <div class="assignment-type-icon">🔄</div>
              <div class="assignment-type-info">
                <div class="assignment-type-name">Rotation</div>
                <div class="assignment-type-description">
                  Alterner entre plusieurs emplois du temps
                </div>
              </div>
              <div class="assignment-type-check">✓</div>
            </label>
          </div>
          <p v-if="isEditMode" class="form-hint">
            ℹ️ Le type d'assignation ne peut pas être modifié après création
          </p>
        </div>

        <!-- Emploi du temps fixe -->
        <div v-if="formData.assignmentType === 'schedule'" class="form-section">
          <h3 class="section-title">📅 Emploi du temps</h3>

          <div v-if="schedules.length === 0" class="alert-empty">
            <div class="alert-icon">⚠️</div>
            <p>Aucun emploi du temps disponible</p>
          </div>

          <div v-else class="form-group">
            <label class="form-label">Sélectionnez un emploi du temps *</label>
            <select
              v-model="formData.scheduleId"
              class="form-input"
              required
              :disabled="isEditMode"
            >
              <option :value="null">-- Sélectionnez un emploi du temps --</option>
              <option
                v-for="schedule in schedules"
                :key="schedule.id"
                :value="schedule.id"
              >
                {{ schedule.name }}
              </option>
            </select>
            <p v-if="isEditMode" class="form-hint">
              ℹ️ L'emploi du temps ne peut pas être modifié après création. Pour changer d'emploi du temps, créez une nouvelle assignation.
            </p>

            <!-- Aperçu de l'emploi du temps sélectionné -->
            <div v-if="selectedSchedule" class="preview-box">
              <div class="preview-header">
                <span class="preview-title">📋 {{ selectedSchedule.name }}</span>
              </div>
              <div class="preview-details">
                <div class="preview-detail-item">
                  <span class="preview-label">Type:</span>
                  <span class="preview-value">Horaire fixe</span>
                </div>
                <div class="preview-detail-item">
                  <span class="preview-label">Status:</span>
                  <span class="preview-value">Actif</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Rotation -->
        <div v-if="formData.assignmentType === 'rotation'" class="form-section">
          <h3 class="section-title">🔄 Rotation</h3>

          <div v-if="rotations.length === 0" class="alert-empty">
            <div class="alert-icon">⚠️</div>
            <p>Aucune rotation disponible</p>
          </div>

          <div v-else class="form-group">
            <label class="form-label">Sélectionnez une rotation *</label>
            <select
              v-model="formData.rotationId"
              class="form-input"
              required
              :disabled="isEditMode"
            >
              <option :value="null">-- Sélectionnez une rotation --</option>
              <option
                v-for="rotation in rotations"
                :key="rotation.id"
                :value="rotation.id"
              >
                {{ rotation.name }} - {{ getPeriodLabel(rotation.periodType) }}
                {{ rotation.isActive ? '✅' : '⏸️' }}
              </option>
            </select>
            <p v-if="isEditMode" class="form-hint">
              ℹ️ La rotation ne peut pas être modifiée après création. Pour changer de rotation, créez une nouvelle assignation.
            </p>

            <!-- Aperçu de la rotation sélectionnée -->
            <div v-if="selectedRotation" class="preview-box">
              <div class="preview-header">
                <span class="preview-title">🔄 {{ selectedRotation.name }}</span>
                <span
                  class="preview-badge"
                  :class="selectedRotation.isActive ? 'active' : 'inactive'"
                >
                  {{ selectedRotation.isActive ? '✅ Active' : '⏸️ Inactive' }}
                </span>
              </div>
              <div class="preview-details">
                <div class="preview-detail-item">
                  <span class="preview-label">Type:</span>
                  <span class="preview-value">{{ getPeriodLabel(selectedRotation.periodType) }}</span>
                </div>
                <div class="preview-detail-item">
                  <span class="preview-label">Horaires:</span>
                  <span class="preview-value">{{ selectedRotation.scheduleIds.length }} emplois du temps</span>
                </div>
                <div class="preview-detail-item">
                  <span class="preview-label">Début:</span>
                  <span class="preview-value">{{ formatDate(selectedRotation.startDate) }}</span>
                </div>
                <div class="preview-detail-item">
                  <span class="preview-label">Employés actuels:</span>
                  <span class="preview-value">{{ selectedRotation.employeeIds.length }} participants</span>
                </div>
              </div>

              <!-- Liste des emplois du temps de la rotation -->
              <div class="preview-schedules">
                <h4 class="preview-subtitle">📋 Emplois du temps de cette rotation</h4>
                <div class="schedules-chips">
                  <div
                    v-for="scheduleId in selectedRotation.scheduleIds"
                    :key="scheduleId"
                    class="schedule-chip"
                  >
                    {{ getScheduleName(scheduleId) }}
                  </div>
                </div>
                <p class="preview-note">
                  ℹ️ Ces emplois du temps alternent automatiquement selon le cycle défini
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Date d'assignation -->
        <div class="form-section">
          <h3 class="section-title">📆 Date d'assignation</h3>
          <div class="form-group">
            <label class="form-label">Date de début *</label>
            <input
              v-model="formData.assignedDate"
              type="date"
              class="form-input"
              required
            />
            <p class="form-hint">
              📌 L'assignation {{ isEditMode ? 'est effective' : 'prendra effet' }} à partir de cette date
            </p>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-section">
          <h3 class="section-title">📝 Notes (optionnel)</h3>
          <div class="form-group">
            <textarea
              v-model="formData.notes"
              class="form-textarea"
              rows="3"
              placeholder="Ajoutez des notes ou commentaires..."
            ></textarea>
          </div>
        </div>

        <!-- Résumé en mode édition -->
        <div v-if="isEditMode" class="form-section info-section">
          <h3 class="section-title">ℹ️ Éléments modifiables</h3>
          <div class="info-box">
            <p><strong>✅ Vous pouvez modifier :</strong></p>
            <ul>
              <li>La liste des employés assignés</li>
              <li>La date d'assignation</li>
              <li>Les notes</li>
            </ul>
            <p><strong>❌ Vous ne pouvez pas modifier :</strong></p>
            <ul>
              <li>Le type d'assignation (Emploi du temps fixe / Rotation)</li>
              <li>L'emploi du temps ou la rotation sélectionnée</li>
            </ul>
            <p class="info-note">💡 Pour changer l'emploi du temps ou la rotation, supprimez cette assignation et créez-en une nouvelle.</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">
          Annuler
        </button>
        <button
          class="btn btn-primary"
          @click="handleSubmit"
          :disabled="!isFormValid"
        >
          💾 {{ isEditMode ? 'Mettre à jour' : 'Créer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import "../../assets/css/toke-schedule-21.css"
import "../../assets/css/toke-assignmentForm-24.css"


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
}

interface Assignment {
  id?: number;
  employeeIds: number[];
  assignmentType: 'schedule' | 'rotation';
  scheduleId?: number | null;
  rotationId?: number | null;
  assignedDate?: string;
  notes?: string;
}

const props = defineProps<{
  assignment?: Assignment;
  isEditMode: boolean;
  schedules: Schedule[];
  employees: Employee[];
  rotations: Rotation[];
}>();

const emit = defineEmits<{
  save: [assignment: Assignment];
  close: [];
}>();

// Initialiser la date du jour au format YYYY-MM-DD
const today = new Date().toISOString().split('T')[0];

// Liste des employés sélectionnés
const selectedEmployees = ref<number[]>([]);
const dropdownOpen = ref(false);

const formData = ref<Assignment>({
  employeeIds: [],
  assignmentType: 'schedule',
  scheduleId: null,
  rotationId: null,
  assignedDate: today,
  notes: ''
});

// Initialiser avec les données d'édition si présentes
if (props.assignment && props.isEditMode) {
  formData.value = {
    ...props.assignment,
    assignedDate: props.assignment.assignedDate || today
  };
  selectedEmployees.value = [...(props.assignment.employeeIds || [])];
}

watch(() => props.assignment, (newAssignment) => {
  if (newAssignment && props.isEditMode) {
    formData.value = {
      ...newAssignment,
      assignedDate: newAssignment.assignedDate || today
    };
    selectedEmployees.value = [...(newAssignment.employeeIds || [])];
  }
}, { deep: true });

const selectedSchedule = computed(() => {
  if (!formData.value.scheduleId) return null;
  return props.schedules.find(s => s.id === formData.value.scheduleId);
});

const selectedRotation = computed(() => {
  if (!formData.value.rotationId) return null;
  return props.rotations.find(r => r.id === formData.value.rotationId);
});

const isFormValid = computed(() => {
  if (selectedEmployees.value.length === 0) return false;
  if (!formData.value.assignedDate) return false;

  if (formData.value.assignmentType === 'schedule') {
    return formData.value.scheduleId !== null;
  } else {
    return formData.value.rotationId !== null;
  }
});

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value;
}

function closeDropdown(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.multi-select-wrapper')) {
    dropdownOpen.value = false;
  }
}

function isEmployeeSelected(employeeId: number): boolean {
  return selectedEmployees.value.includes(employeeId);
}

function toggleEmployee(employeeId: number): void {
  const index = selectedEmployees.value.indexOf(employeeId);
  if (index > -1) {
    selectedEmployees.value.splice(index, 1);
  } else {
    selectedEmployees.value.push(employeeId);
  }
}

function removeEmployee(employeeId: number): void {
  const index = selectedEmployees.value.indexOf(employeeId);
  if (index > -1) {
    selectedEmployees.value.splice(index, 1);
  }
}

function getEmployeeName(employeeId: number): string {
  const employee = props.employees.find(e => e.id === employeeId);
  return employee ? employee.name : 'Inconnu';
}

function getEmployeeInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

function getScheduleName(scheduleId: number): string {
  const schedule = props.schedules.find(s => s.id === scheduleId);
  return schedule ? schedule.name : 'Inconnu';
}

function getPeriodLabel(periodType: 'day' | 'week' | 'month'): string {
  const labels = {
    day: 'Journalière',
    week: 'Hebdomadaire',
    month: 'Mensuelle'
  };
  return labels[periodType];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function handleSubmit() {
  if (!isFormValid.value) {
    alert('Veuillez remplir tous les champs obligatoires');
    return;
  }

  const cleanedData = {
    ...formData.value,
    employeeIds: selectedEmployees.value
  };

  if (cleanedData.assignmentType === 'schedule') {
    delete cleanedData.rotationId;
  } else {
    delete cleanedData.scheduleId;
  }

  emit('save', cleanedData);
}

onMounted(() => {
  document.addEventListener('click', closeDropdown);
});

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown);
});
</script>

