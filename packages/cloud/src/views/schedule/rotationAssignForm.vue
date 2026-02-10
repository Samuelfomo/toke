<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal modal-large" @click.stop>
      <div class="modal-header">
        <h2>{{ isEditMode ? 'Modifier l\'assignation' : 'Assigner une rotation' }}</h2>
        <button class="btn-close" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <!-- Type d'assignation -->
        <div class="form-section">
          <h3 class="section-title">Type d'assignation</h3>

          <div class="assignment-type-selector">
            <label class="radio-card" :class="{ active: assignmentType === 'user' }">
              <input
                type="radio"
                value="user"
                v-model="assignmentType"
                @change="resetTarget"
              />
              <div class="radio-card-content">
                <span class="radio-card-icon">👤</span>
                <span class="radio-card-label">Utilisateur</span>
              </div>
            </label>

            <label class="radio-card" :class="{ active: assignmentType === 'group' }">
              <input
                type="radio"
                value="group"
                v-model="assignmentType"
                @change="resetTarget"
              />
              <div class="radio-card-content">
                <span class="radio-card-icon">🏢</span>
                <span class="radio-card-label">Groupe</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Sélection de l'utilisateur -->
        <div class="form-section" v-if="assignmentType === 'user'">
          <h3 class="section-title">Sélectionner un utilisateur</h3>
          <p class="form-hint">Choisissez l'employé qui recevra cette rotation</p>

          <div class="search-box">
            <input
              type="text"
              class="form-input"
              v-model="userSearch"
              placeholder="🔍 Rechercher un employé..."
            />
          </div>

          <div class="target-selector">
            <div
              v-for="user in filteredUsers"
              :key="user.guid"
              class="target-selector-item"
              :class="{ selected: form.user === user.guid }"
              @click="selectUser(user.guid)"
            >
              <div class="target-avatar">{{ getInitials(user.firstName, user.lastName) }}</div>
              <div class="target-info">
                <span class="target-name">{{ user.firstName }} {{ user.lastName }}</span>
                <span class="target-meta">{{ user.jobTitle }} - {{ user.department }}</span>
                <span class="target-code">Code: {{ user.employeeCode }}</span>
              </div>
              <div class="target-check">✓</div>
            </div>
          </div>

          <p v-if="errors.target" class="error-message">{{ errors.target }}</p>
        </div>

        <!-- Sélection du groupe -->
        <div class="form-section" v-if="assignmentType === 'group'">
          <h3 class="section-title">Sélectionner un groupe</h3>
          <p class="form-hint">Choisissez le groupe qui recevra cette rotation</p>

          <div class="target-selector">
            <div
              v-for="group in groups"
              :key="group.guid"
              class="target-selector-item"
              :class="{ selected: form.group === group.guid }"
              @click="selectGroup(group.guid!)"
            >
              <div class="target-avatar group-avatar">🏢</div>
              <div class="target-info">
                <span class="target-name">{{ group.name }}</span>
                <span class="target-meta" v-if="group.manager">
                  Manager: {{ group.manager.first_name }} {{ group.manager.last_name }}
                </span>
                <span class="target-meta">{{ group.members.count }} membre(s)</span>
              </div>
              <div class="target-check">✓</div>
            </div>
          </div>

          <p v-if="errors.target" class="error-message">{{ errors.target }}</p>
        </div>

        <!-- Sélection de la rotation -->
        <div class="form-section">
          <h3 class="section-title">Rotation</h3>
          <p class="form-hint">Sélectionnez la rotation à assigner</p>

          <div class="rotation-selector">
            <div
              v-for="rotation in rotations"
              :key="rotation.guid"
              class="rotation-selector-item"
              :class="{ selected: form.rotation_group === rotation.guid }"
              @click="selectRotation(rotation.guid)"
            >
              <div class="rotation-selector-header">
                <span class="rotation-selector-name">{{ rotation.name }}</span>
                <div class="rotation-selector-check">✓</div>
              </div>
              <div class="rotation-selector-meta">
                <span class="rotation-badge">
                  Cycle: {{ rotation.cycle_length }} {{ getUnitLabel(rotation.cycle_unit) }}
                </span>
                <span class="rotation-templates-count">
                  {{ rotation.cycle_templates.length }} template(s)
                </span>
              </div>
              <div class="rotation-selector-dates">
                Débute le {{ formatDate(rotation.start_date) }}
              </div>
            </div>
          </div>

          <p v-if="errors.rotation_group" class="error-message">{{ errors.rotation_group }}</p>
        </div>

        <!-- Offset dans le cycle -->
        <div class="form-section" v-if="form.rotation_group">
          <h3 class="section-title">Position dans le cycle</h3>
          <p class="form-hint">
            Définissez à quelle étape du cycle de rotation l'utilisateur/groupe démarre
          </p>

          <div class="offset-selector">
            <div
              v-for="(template, index) in getSelectedRotationTemplates()"
              :key="index"
              class="offset-option"
              :class="{ selected: form.offset === index }"
              @click="selectOffset(index)"
            >
              <div class="offset-number">{{ index }}</div>
              <div class="offset-info">
                <span class="offset-label">Position {{ index }}</span>
                <span class="offset-template">{{ template.name }}</span>
              </div>
              <div class="offset-check">✓</div>
            </div>
          </div>

          <p v-if="errors.offset" class="error-message">{{ errors.offset }}</p>
        </div>

        <!-- Résumé -->
        <div class="form-section" v-if="isFormValid">
          <h3 class="section-title">Résumé de l'assignation</h3>
          <div class="assignment-summary">
            <div class="summary-item">
              <span class="summary-label">{{ assignmentType === 'user' ? 'Employé' : 'Groupe' }}:</span>
              <span class="summary-value">{{ getTargetName() }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Rotation:</span>
              <span class="summary-value">{{ getRotationName() }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Position initiale:</span>
              <span class="summary-value">{{ form.offset }} - {{ getCurrentTemplateName() }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">
          Annuler
        </button>
        <button class="btn btn-primary" @click="handleSave" :disabled="isSaving">
          {{ isSaving ? 'Enregistrement...' : (isEditMode ? 'Mettre à jour' : 'Créer l\'assignation') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue';
import "../../assets/css/toke-schedule-21.css";
import { TeamEmployee } from '@/stores/teamStore';
import { Group } from '@/service/GroupService';
import { RotationAssignment } from '@/service/rotationAssignmentService';

interface Template {
  guid: string;
  name: string;
}

interface Rotation {
  guid: string;
  name: string;
  cycle_length: number;
  cycle_unit: 'day' | 'week' | 'month';
  start_date: string;
  active: boolean;
  cycle_templates: Template[];
}

const props = defineProps<{
  assignment?: RotationAssignment | null;
  users: TeamEmployee[];
  groups: Group[];
  rotations: Rotation[];
  currentUserGuid: string; // GUID de l'utilisateur connecté
  isEditMode: boolean;
}>();

const emit = defineEmits<{
  save: [payload: any];
  close: [];
}>();

const isSaving = ref(false);
const assignmentType = ref<'user' | 'group'>('user');
const userSearch = ref('');
const errors = reactive<Record<string, string>>({});

// IMPORTANT: Structure corrigée pour correspondre à l'API
const form = reactive({
  user: '',              // GUID de l'utilisateur (vide si groupe)
  group: '',            // GUID du groupe (vide si utilisateur)
  assigned_by: props.currentUserGuid,  // GUID de l'assignateur
  rotation_group: '',    // GUID de la rotation
  offset: 0              // Position dans le cycle
});

// Initialisation du formulaire en mode édition
watch(() => props.assignment, (assignment) => {
  if (assignment) {
    if (assignment.user) {
      assignmentType.value = 'user';
      form.user = assignment.user.guid;
      form.group = '';
    } else if (assignment.group) {
      assignmentType.value = 'group';
      form.group = assignment.group.guid!;
      form.user = '';
    }

    form.rotation_group = assignment.rotation_group.guid;
    form.offset = assignment.offset;
  }
}, { immediate: true });

const filteredUsers = computed(() => {
  if (!userSearch.value) return props.users;

  const search = userSearch.value.toLowerCase();
  return props.users.filter(user =>
    user.firstName.toLowerCase().includes(search) ||
    user.lastName.toLowerCase().includes(search) ||
    user.employeeCode.toLowerCase().includes(search) ||
    user.department.toLowerCase().includes(search)
  );
});

const resetTarget = () => {
  form.user = '';
  form.group = '';
  userSearch.value = '';
  delete errors.target;
};

const selectUser = (guid: string) => {
  form.user = guid;
  form.group = ''; // S'assurer que groups est vide
  delete errors.target;
};

const selectGroup = (guid: string) => {
  form.group = guid;
  form.user = ''; // S'assurer que user est vide
  delete errors.target;
};

const selectRotation = (guid: string) => {
  form.rotation_group = guid;
  form.offset = 0; // Réinitialiser l'offset
  delete errors.rotation_group;
};

const selectOffset = (offset: number) => {
  form.offset = offset;
  delete errors.offset;
};

const getSelectedRotationTemplates = () => {
  const rotation = props.rotations.find(r => r.guid === form.rotation_group);
  return rotation?.cycle_templates || [];
};

const isFormValid = computed(() => {
  return (
    (form.user || form.group) &&
    form.rotation_group &&
    form.offset !== undefined
  );
});

const getTargetName = (): string => {
  if (assignmentType.value === 'user' && form.user) {
    const user = props.users.find(u => u.guid === form.user);
    return user ? `${user.firstName} ${user.lastName}` : '';
  } else if (assignmentType.value === 'group' && form.group) {
    const group = props.groups.find(g => g.guid === form.group);
    return group ? group.name : '';
  }
  return '';
};

const getRotationName = (): string => {
  const rotation = props.rotations.find(r => r.guid === form.rotation_group);
  return rotation ? rotation.name : '';
};

const getCurrentTemplateName = (): string => {
  const templates = getSelectedRotationTemplates();
  return templates[form.offset]?.name || '';
};

const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
};

const getUnitLabel = (unit: 'day' | 'week' | 'month'): string => {
  const labels: Record<string, string> = {
    day: 'jour(s)',
    week: 'semaine(s)',
    month: 'mois'
  };
  return labels[unit] || unit;
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};

  // Validation de la cible (user OU groups, mais pas les deux)
  if (!form.user && !form.group) {
    newErrors.target = 'Veuillez sélectionner un utilisateur ou un groupe';
  }

  if (!form.rotation_group) {
    newErrors.rotation_group = 'Veuillez sélectionner une rotation';
  }

  if (form.offset === undefined || form.offset === null) {
    newErrors.offset = 'Veuillez sélectionner une position dans le cycle';
  }

  Object.assign(errors, newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleSave = async () => {
  if (!validateForm()) {
    console.error('❌ Formulaire invalide');
    return;
  }

  isSaving.value = true;

  try {
    // Construire le payload selon la structure attendue par l'API
    const payload: any = {
      assigned_by: form.assigned_by,
      rotation_group: form.rotation_group,
      offset: form.offset
    };

    // Ajouter user OU groups (exclusif)
    if (assignmentType.value === 'user' && form.user) {
      payload.user = form.user;
    } else if (assignmentType.value === 'group' && form.group) {
      payload.group = form.group;
    }

    console.log('📤 Payload envoyé:', payload);
    emit('save', payload);
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.assignment-type-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md, 1rem);
  margin-bottom: var(--space-lg, 1.5rem);
}

.radio-card {
  position: relative;
  display: block;
  cursor: pointer;
}

.radio-card input[type="radio"] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.radio-card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm, 0.5rem);
  padding: var(--space-xl, 2rem);
  background-color: var(--bg-secondary, #f9fafb);
  border: 2px solid var(--border-light, #e5e7eb);
  border-radius: var(--border-radius-lg, 12px);
  transition: all var(--transition-base, 0.2s ease);
}

.radio-card:hover .radio-card-content {
  background-color: var(--bg-primary, #ffffff);
  border-color: var(--border-medium, #d1d5db);
}

.radio-card.active .radio-card-content {
  background-color: rgba(0, 74, 173, 0.05);
  border-color: var(--color-primary, #004aad);
  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);
}

.radio-card-icon {
  font-size: 48px;
  line-height: 1;
}

.radio-card-label {
  font-size: var(--font-size-body, 1rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #1f2937);
}

.search-box {
  margin-bottom: var(--space-md, 1rem);
}

.target-selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 0.5rem);
  max-height: 400px;
  overflow-y: auto;
  padding: var(--space-xs, 0.25rem);
}

.target-selector-item {
  display: flex;
  align-items: center;
  gap: var(--space-md, 1rem);
  padding: var(--space-md, 1rem);
  background-color: var(--bg-secondary, #f9fafb);
  border: 2px solid var(--border-light, #e5e7eb);
  border-radius: var(--border-radius, 8px);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.target-selector-item:hover {
  background-color: var(--bg-primary, #ffffff);
  border-color: var(--border-medium, #d1d5db);
  transform: translateX(4px);
}

.target-selector-item.selected {
  background-color: rgba(0, 74, 173, 0.05);
  border-color: var(--color-primary, #004aad);
  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);
}

.target-avatar {
  width: 48px;
  height: 48px;
  min-width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary, #004aad);
  color: white;
  border-radius: 50%;
  font-size: var(--font-size-body, 1rem);
  font-weight: var(--font-weight-bold, 700);
}

.group-avatar {
  font-size: 24px;
  background-color: var(--color-success, #10b981);
}

.target-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.target-name {
  font-size: var(--font-size-body, 1rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #1f2937);
}

.target-meta {
  font-size: var(--font-size-body-sm, 0.875rem);
  color: var(--text-secondary, #6b7280);
}

.target-code {
  font-size: var(--font-size-caption, 0.75rem);
  color: var(--text-muted, #9ca3af);
  font-family: 'Monaco', 'Courier New', monospace;
}

.target-check {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-primary, #ffffff);
  border: 2px solid var(--border-medium, #d1d5db);
  border-radius: var(--border-radius-sm, 4px);
  color: transparent;
  font-size: var(--font-size-body, 1rem);
  font-weight: var(--font-weight-bold, 700);
  transition: all var(--transition-fast, 0.15s ease);
}

.target-selector-item.selected .target-check {
  background-color: var(--color-primary, #004aad);
  border-color: var(--color-primary, #004aad);
  color: white;
}

/* Rotation selector */
.rotation-selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 0.5rem);
}

.rotation-selector-item {
  padding: var(--space-md, 1rem);
  background-color: var(--bg-secondary, #f9fafb);
  border: 2px solid var(--border-light, #e5e7eb);
  border-radius: var(--border-radius, 8px);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.rotation-selector-item:hover {
  background-color: var(--bg-primary, #ffffff);
  border-color: var(--border-medium, #d1d5db);
}

.rotation-selector-item.selected {
  background-color: rgba(0, 74, 173, 0.05);
  border-color: var(--color-primary, #004aad);
}

.rotation-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xs, 0.25rem);
}

.rotation-selector-name {
  font-size: var(--font-size-body, 1rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #1f2937);
}

.rotation-selector-check {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-primary, #ffffff);
  border: 2px solid var(--border-medium, #d1d5db);
  border-radius: var(--border-radius-sm, 4px);
  color: transparent;
  font-size: 14px;
  font-weight: var(--font-weight-bold, 700);
}

.rotation-selector-item.selected .rotation-selector-check {
  background-color: var(--color-primary, #004aad);
  border-color: var(--color-primary, #004aad);
  color: white;
}

.rotation-selector-meta {
  display: flex;
  gap: var(--space-md, 1rem);
  margin-bottom: var(--space-xs, 0.25rem);
}

.rotation-badge {
  display: inline-flex;
  padding: 2px 8px;
  background-color: rgba(0, 74, 173, 0.1);
  color: var(--color-primary, #004aad);
  font-size: var(--font-size-caption, 0.75rem);
  font-weight: var(--font-weight-semibold, 600);
  border-radius: var(--border-radius-sm, 4px);
}

.rotation-templates-count {
  font-size: var(--font-size-body-sm, 0.875rem);
  color: var(--text-secondary, #6b7280);
}

.rotation-selector-dates {
  font-size: var(--font-size-body-sm, 0.875rem);
  color: var(--text-secondary, #6b7280);
}

/* Offset selector */
.offset-selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 0.5rem);
}

.offset-option {
  display: flex;
  align-items: center;
  gap: var(--space-md, 1rem);
  padding: var(--space-md, 1rem);
  background-color: var(--bg-secondary, #f9fafb);
  border: 2px solid var(--border-light, #e5e7eb);
  border-radius: var(--border-radius, 8px);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.offset-option:hover {
  background-color: var(--bg-primary, #ffffff);
  border-color: var(--border-medium, #d1d5db);
}

.offset-option.selected {
  background-color: rgba(0, 74, 173, 0.05);
  border-color: var(--color-primary, #004aad);
  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);
}

.offset-number {
  width: 48px;
  height: 48px;
  min-width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary, #004aad);
  color: white;
  border-radius: 50%;
  font-size: var(--font-size-h6, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
}

.offset-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.offset-label {
  font-size: var(--font-size-body, 1rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #1f2937);
}

.offset-template {
  font-size: var(--font-size-body-sm, 0.875rem);
  color: var(--text-secondary, #6b7280);
}

.offset-check {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-primary, #ffffff);
  border: 2px solid var(--border-medium, #d1d5db);
  border-radius: var(--border-radius-sm, 4px);
  color: transparent;
  font-size: var(--font-size-body, 1rem);
  font-weight: var(--font-weight-bold, 700);
  transition: all var(--transition-fast, 0.15s ease);
}

.offset-option.selected .offset-check {
  background-color: var(--color-primary, #004aad);
  border-color: var(--color-primary, #004aad);
  color: white;
}

.assignment-summary {
  padding: var(--space-lg, 1.5rem);
  background-color: var(--bg-secondary, #f9fafb);
  border-radius: var(--border-radius, 8px);
  display: flex;
  flex-direction: column;
  gap: var(--space-md, 1rem);
}

.summary-item {
  display: flex;
  gap: var(--space-sm, 0.5rem);
}

.summary-label {
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-secondary, #6b7280);
  min-width: 140px;
}

.summary-value {
  color: var(--text-primary, #1f2937);
}

.error-message {
  color: var(--color-error, #dc3545);
  font-size: var(--font-size-body-sm, 0.875rem);
  margin-top: var(--space-xs, 0.25rem);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>


<!--<template>-->
<!--  <div class="modal-overlay" @click="$emit('close')">-->
<!--    <div class="modal modal-large" @click.stop>-->
<!--      <div class="modal-header">-->
<!--        <h2>{{ isEditMode ? 'Modifier l\'assignation' : 'Assigner une rotation' }}</h2>-->
<!--        <button class="btn-close" @click="$emit('close')">×</button>-->
<!--      </div>-->

<!--      <div class="modal-body">-->
<!--        &lt;!&ndash; Type d'assignation &ndash;&gt;-->
<!--        <div class="form-section">-->
<!--          <h3 class="section-title">Type d'assignation</h3>-->

<!--          <div class="assignment-type-selector">-->
<!--            <label class="radio-card" :class="{ active: assignmentType === 'user' }">-->
<!--              <input-->
<!--                type="radio"-->
<!--                value="user"-->
<!--                v-model="assignmentType"-->
<!--                @change="resetTarget"-->
<!--              />-->
<!--              <div class="radio-card-content">-->
<!--                <span class="radio-card-icon">👤</span>-->
<!--                <span class="radio-card-label">Utilisateur</span>-->
<!--              </div>-->
<!--            </label>-->

<!--            <label class="radio-card" :class="{ active: assignmentType === 'group' }">-->
<!--              <input-->
<!--                type="radio"-->
<!--                value="group"-->
<!--                v-model="assignmentType"-->
<!--                @change="resetTarget"-->
<!--              />-->
<!--              <div class="radio-card-content">-->
<!--                <span class="radio-card-icon">🏢</span>-->
<!--                <span class="radio-card-label">Groupe</span>-->
<!--              </div>-->
<!--            </label>-->
<!--          </div>-->
<!--        </div>-->

<!--        &lt;!&ndash; Sélection de l'utilisateur &ndash;&gt;-->
<!--        <div class="form-section" v-if="assignmentType === 'user'">-->
<!--          <h3 class="section-title">Sélectionner un utilisateur</h3>-->
<!--          <p class="form-hint">Choisissez l'employé qui recevra cette rotation</p>-->

<!--          <div class="search-box">-->
<!--            <input-->
<!--              type="text"-->
<!--              class="form-input"-->
<!--              v-model="userSearch"-->
<!--              placeholder="🔍 Rechercher un employé..."-->
<!--            />-->
<!--          </div>-->

<!--          <div class="target-selector">-->
<!--            <div-->
<!--              v-for="user in filteredUsers"-->
<!--              :key="user.guid"-->
<!--              class="target-selector-item"-->
<!--              :class="{ selected: form.target === user.guid }"-->
<!--              @click="selectUser(user.guid)"-->
<!--            >-->
<!--              <div class="target-avatar">{{ getInitials(user.firstName, user.lastName) }}</div>-->
<!--              <div class="target-info">-->
<!--                <span class="target-name">{{ user.firstName }} {{ user.lastName }}</span>-->
<!--                <span class="target-meta">{{ user.jobTitle }} - {{ user.department }}</span>-->
<!--                <span class="target-code">Code: {{ user.employeeCode }}</span>-->
<!--              </div>-->
<!--              <div class="target-check">✓</div>-->
<!--            </div>-->
<!--          </div>-->

<!--          <p v-if="errors.target" class="error-message">{{ errors.target }}</p>-->
<!--        </div>-->

<!--        &lt;!&ndash; Sélection du groupe &ndash;&gt;-->
<!--        <div class="form-section" v-if="assignmentType === 'group'">-->
<!--          <h3 class="section-title">Sélectionner un groupe</h3>-->
<!--          <p class="form-hint">Choisissez le groupe qui recevra cette rotation</p>-->

<!--          <div class="target-selector">-->
<!--            <div-->
<!--              v-for="group in groups"-->
<!--              :key="group.guid"-->
<!--              class="target-selector-item"-->
<!--              :class="{ selected: form.target === group.guid }"-->
<!--              @click="selectGroup(group.guid!)"-->
<!--            >-->
<!--              <div class="target-avatar group-avatar">🏢</div>-->
<!--              <div class="target-info">-->
<!--                <span class="target-name">{{ group.name }}</span>-->
<!--                <span class="target-meta" v-if="group.manager">-->
<!--                  Manager: {{ group.manager.first_name }} {{ group.manager.last_name }}-->
<!--                </span>-->
<!--                <span class="target-meta">{{ group.members.count }} membre(s)</span>-->
<!--              </div>-->
<!--              <div class="target-check">✓</div>-->
<!--            </div>-->
<!--          </div>-->

<!--          <p v-if="errors.target" class="error-message">{{ errors.target }}</p>-->
<!--        </div>-->

<!--        &lt;!&ndash; Sélection de la rotation &ndash;&gt;-->
<!--        <div class="form-section">-->
<!--          <h3 class="section-title">Rotation</h3>-->
<!--          <p class="form-hint">Sélectionnez la rotation à assigner</p>-->

<!--          <div class="rotation-selector">-->
<!--            <div-->
<!--              v-for="rotation in rotations"-->
<!--              :key="rotation.guid"-->
<!--              class="rotation-selector-item"-->
<!--              :class="{ selected: form.rotation_group === rotation.guid }"-->
<!--              @click="selectRotation(rotation.guid)"-->
<!--            >-->
<!--              <div class="rotation-selector-header">-->
<!--                <span class="rotation-selector-name">{{ rotation.name }}</span>-->
<!--                <div class="rotation-selector-check">✓</div>-->
<!--              </div>-->
<!--              <div class="rotation-selector-meta">-->
<!--                <span class="rotation-badge">-->
<!--                  Cycle: {{ rotation.cycle_length }} {{ getUnitLabel(rotation.cycle_unit) }}-->
<!--                </span>-->
<!--                <span class="rotation-templates-count">-->
<!--                  {{ rotation.cycle_templates.length }} template(s)-->
<!--                </span>-->
<!--              </div>-->
<!--              <div class="rotation-selector-dates">-->
<!--                Débute le {{ formatDate(rotation.start_date) }}-->
<!--              </div>-->
<!--            </div>-->
<!--          </div>-->

<!--          <p v-if="errors.rotation_group" class="error-message">{{ errors.rotation_group }}</p>-->
<!--        </div>-->

<!--        &lt;!&ndash; Offset dans le cycle &ndash;&gt;-->
<!--        <div class="form-section" v-if="form.rotation_group">-->
<!--          <h3 class="section-title">Position dans le cycle</h3>-->
<!--          <p class="form-hint">-->
<!--            Définissez à quelle étape du cycle de rotation l'utilisateur/groupe démarre-->
<!--          </p>-->

<!--          <div class="offset-selector">-->
<!--            <div-->
<!--              v-for="(template, index) in getSelectedRotationTemplates()"-->
<!--              :key="index"-->
<!--              class="offset-option"-->
<!--              :class="{ selected: form.offset === index }"-->
<!--              @click="selectOffset(index)"-->
<!--            >-->
<!--              <div class="offset-number">{{ index }}</div>-->
<!--              <div class="offset-info">-->
<!--                <span class="offset-label">Position {{ index }}</span>-->
<!--                <span class="offset-template">{{ template.name }}</span>-->
<!--              </div>-->
<!--              <div class="offset-check">✓</div>-->
<!--            </div>-->
<!--          </div>-->

<!--          <p v-if="errors.offset" class="error-message">{{ errors.offset }}</p>-->
<!--        </div>-->

<!--        &lt;!&ndash; Résumé &ndash;&gt;-->
<!--        <div class="form-section" v-if="isFormValid">-->
<!--          <h3 class="section-title">Résumé de l'assignation</h3>-->
<!--          <div class="assignment-summary">-->
<!--            <div class="summary-item">-->
<!--              <span class="summary-label">{{ assignmentType === 'user' ? 'Employé' : 'Groupe' }}:</span>-->
<!--              <span class="summary-value">{{ getTargetName() }}</span>-->
<!--            </div>-->
<!--            <div class="summary-item">-->
<!--              <span class="summary-label">Rotation:</span>-->
<!--              <span class="summary-value">{{ getRotationName() }}</span>-->
<!--            </div>-->
<!--            <div class="summary-item">-->
<!--              <span class="summary-label">Position initiale:</span>-->
<!--              <span class="summary-value">{{ form.offset }} - {{ getCurrentTemplateName() }}</span>-->
<!--            </div>-->
<!--          </div>-->
<!--        </div>-->
<!--      </div>-->

<!--      <div class="modal-footer">-->
<!--        <button class="btn btn-secondary" @click="$emit('close')">-->
<!--          Annuler-->
<!--        </button>-->
<!--        <button class="btn btn-primary" @click="handleSave" :disabled="isSaving">-->
<!--          {{ isSaving ? 'Enregistrement...' : (isEditMode ? 'Mettre à jour' : 'Créer l\'assignation') }}-->
<!--        </button>-->
<!--      </div>-->
<!--    </div>-->
<!--  </div>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import { ref, computed, watch, reactive } from 'vue';-->
<!--import "../../assets/css/toke-schedule-21.css";-->
<!--import { TeamEmployee } from '@/stores/teamStore';-->
<!--import { Group, User } from '@/service/GroupService';-->
<!--import { RotationAssignment } from '@/service/rotationAssignmentService';-->

<!--// interface User {-->
<!--//   guid: string;-->
<!--//   first_name: string;-->
<!--//   last_name: string;-->
<!--//   email: string;-->
<!--//   phone_number: string;-->
<!--//   employee_code: string;-->
<!--//   department: string;-->
<!--//   job_title: string;-->
<!--//   active: boolean;-->
<!--// }-->
<!--//-->
<!--// interface Group {-->
<!--//   guid: string;-->
<!--//   name: string;-->
<!--//   manager?: {-->
<!--//     guid: string;-->
<!--//     first_name: string;-->
<!--//     last_name: string;-->
<!--//   };-->
<!--//   members: {-->
<!--//     count: number;-->
<!--//     items: any[];-->
<!--//   };-->
<!--// }-->

<!--interface Template {-->
<!--  guid: string;-->
<!--  name: string;-->
<!--}-->

<!--interface Rotation {-->
<!--  guid: string;-->
<!--  name: string;-->
<!--  cycle_length: number;-->
<!--  cycle_unit: 'day' | 'week' | 'month';-->
<!--  start_date: string;-->
<!--  active: boolean;-->
<!--  cycle_templates: Template[];-->
<!--}-->

<!--interface Assignment {-->
<!--  guid?: string;-->
<!--  user?: User;-->
<!--  group?: Group;-->
<!--  rotation_group: Rotation;-->
<!--  offset: number;-->
<!--}-->

<!--const props = defineProps<{-->
<!--  assignment?: RotationAssignment | null;-->
<!--  // users: User[];-->
<!--  users: TeamEmployee[];-->
<!--  groups: Group[];-->
<!--  rotations: Rotation[];-->
<!--  currentUserGuid: string; // GUID de l'utilisateur connecté-->
<!--  isEditMode: boolean;-->
<!--}>();-->

<!--const emit = defineEmits<{-->
<!--  save: [payload: any];-->
<!--  close: [];-->
<!--}>();-->

<!--const isSaving = ref(false);-->
<!--const assignmentType = ref<'user' | 'group'>('user');-->
<!--const userSearch = ref('');-->
<!--const errors = reactive<Record<string, string>>({});-->

<!--const form = reactive({-->
<!--  target: '',              // GUID de l'user ou du group-->
<!--  rotation_group: '',-->
<!--  offset: 0,-->
<!--});-->

<!--// Initialisation-->
<!--watch(-->
<!--  () => props.assignment,-->
<!--  (assignment) => {-->
<!--    if (!assignment) {-->
<!--      // Mode création-->
<!--      form.target = '';-->
<!--      form.rotation_group = '';-->
<!--      form.offset = 0;-->
<!--    } else {-->
<!--      // Mode édition-->
<!--      if (assignment.user) {-->
<!--        assignmentType.value = 'user';-->
<!--        form.target = assignment.user.guid;-->
<!--      } else if (assignment.group) {-->
<!--        assignmentType.value = 'group';-->
<!--        form.target = assignment.group.guid!;-->
<!--      }-->

<!--      form.rotation_group = assignment.rotation_group.guid;-->
<!--      form.offset = assignment.offset;-->
<!--    }-->
<!--  },-->
<!--  { immediate: true }-->
<!--);-->

<!--const filteredUsers = computed(() => {-->
<!--  if (!userSearch.value) return props.users;-->

<!--  const search = userSearch.value.toLowerCase();-->
<!--  return props.users.filter(user =>-->
<!--    `${user.firstName} ${user.lastName}`.toLowerCase().includes(search) ||-->
<!--    user.employeeCode.toLowerCase().includes(search) ||-->
<!--    user.email.toLowerCase().includes(search) ||-->
<!--    user.department.toLowerCase().includes(search)-->
<!--  );-->
<!--});-->

<!--const isFormValid = computed(() => {-->
<!--  return form.target && form.rotation_group && form.offset !== null;-->
<!--});-->

<!--function resetTarget() {-->
<!--  form.target = '';-->
<!--  delete errors.target;-->
<!--}-->

<!--function selectUser(guid: string) {-->
<!--  form.target = guid;-->
<!--  delete errors.target;-->
<!--}-->

<!--function selectGroup(guid: string) {-->
<!--  form.target = guid;-->
<!--  delete errors.target;-->
<!--}-->

<!--function selectRotation(guid: string) {-->
<!--  form.rotation_group = guid;-->
<!--  form.offset = 0; // Reset offset quand on change de rotation-->
<!--  delete errors.rotation_group;-->
<!--}-->

<!--function selectOffset(offset: number) {-->
<!--  form.offset = offset;-->
<!--  delete errors.offset;-->
<!--}-->

<!--function getInitials(firstName: string, lastName: string): string {-->
<!--  return `${firstName[0]}${lastName[0]}`.toUpperCase();-->
<!--}-->

<!--function getUnitLabel(unit: 'day' | 'week' | 'month'): string {-->
<!--  return {-->
<!--    day: 'jour(s)',-->
<!--    week: 'semaine(s)',-->
<!--    month: 'mois',-->
<!--  }[unit];-->
<!--}-->

<!--function getSelectedRotationTemplates(): Template[] {-->
<!--  const rotation = props.rotations.find(r => r.guid === form.rotation_group);-->
<!--  return rotation?.cycle_templates || [];-->
<!--}-->

<!--function getTargetName(): string {-->
<!--  if (assignmentType.value === 'user') {-->
<!--    const user = props.users.find(u => u.guid === form.target);-->
<!--    return user ? `${user.firstName} ${user.lastName}` : '';-->
<!--  } else {-->
<!--    const group = props.groups.find(g => g.guid === form.target);-->
<!--    return group ? group.name : '';-->
<!--  }-->
<!--}-->

<!--function getRotationName(): string {-->
<!--  const rotation = props.rotations.find(r => r.guid === form.rotation_group);-->
<!--  return rotation ? rotation.name : '';-->
<!--}-->

<!--function getCurrentTemplateName(): string {-->
<!--  const templates = getSelectedRotationTemplates();-->
<!--  return templates[form.offset]?.name || '';-->
<!--}-->

<!--function formatDate(dateString: string): string {-->
<!--  if (!dateString) return '';-->
<!--  const date = new Date(dateString);-->
<!--  return date.toLocaleDateString('fr-FR', {-->
<!--    day: 'numeric',-->
<!--    month: 'short',-->
<!--    year: 'numeric',-->
<!--  });-->
<!--}-->

<!--function validate(): boolean {-->
<!--  Object.keys(errors).forEach(k => delete errors[k]);-->

<!--  let isValid = true;-->

<!--  if (!form.target) {-->
<!--    errors.target = assignmentType.value === 'user'-->
<!--      ? 'Veuillez sélectionner un utilisateur'-->
<!--      : 'Veuillez sélectionner un groupe';-->
<!--    isValid = false;-->
<!--  }-->

<!--  if (!form.rotation_group) {-->
<!--    errors.rotation_group = 'Veuillez sélectionner une rotation';-->
<!--    isValid = false;-->
<!--  }-->

<!--  if (form.offset === null || form.offset === undefined) {-->
<!--    errors.offset = 'Veuillez sélectionner une position dans le cycle';-->
<!--    isValid = false;-->
<!--  }-->

<!--  return isValid;-->
<!--}-->

<!--async function handleSave() {-->
<!--  if (!validate()) {-->
<!--    return;-->
<!--  }-->

<!--  isSaving.value = true;-->

<!--  try {-->
<!--    const payload: any = {-->
<!--      assigned_by: props.currentUserGuid,-->
<!--      rotation_group: form.rotation_group,-->
<!--      offset: form.offset,-->
<!--    };-->

<!--    // Ajouter user OU groups (exclusif)-->
<!--    if (assignmentType.value === 'user') {-->
<!--      payload.user = form.target;-->
<!--    } else {-->
<!--      payload.groups = form.target;-->
<!--    }-->

<!--    emit('save', payload);-->
<!--  } catch (error) {-->
<!--    console.error('Erreur lors de la sauvegarde:', error);-->
<!--  } finally {-->
<!--    isSaving.value = false;-->
<!--  }-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--/* Réutilisation des styles du formulaire d'assignation de schedule */-->
<!--.assignment-type-selector {-->
<!--  display: grid;-->
<!--  grid-template-columns: 1fr 1fr;-->
<!--  gap: var(&#45;&#45;space-md, 1rem);-->
<!--  margin-bottom: var(&#45;&#45;space-lg, 1.5rem);-->
<!--}-->

<!--.radio-card {-->
<!--  position: relative;-->
<!--  display: block;-->
<!--  cursor: pointer;-->
<!--}-->

<!--.radio-card input[type="radio"] {-->
<!--  position: absolute;-->
<!--  opacity: 0;-->
<!--  pointer-events: none;-->
<!--}-->

<!--.radio-card-content {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-sm, 0.5rem);-->
<!--  padding: var(&#45;&#45;space-xl, 2rem);-->
<!--  background-color: var(&#45;&#45;bg-secondary, #f9fafb);-->
<!--  border: 2px solid var(&#45;&#45;border-light, #e5e7eb);-->
<!--  border-radius: var(&#45;&#45;border-radius-lg, 12px);-->
<!--  transition: all var(&#45;&#45;transition-base, 0.2s ease);-->
<!--}-->

<!--.radio-card:hover .radio-card-content {-->
<!--  background-color: var(&#45;&#45;bg-primary, #ffffff);-->
<!--  border-color: var(&#45;&#45;border-medium, #d1d5db);-->
<!--}-->

<!--.radio-card.active .radio-card-content {-->
<!--  background-color: rgba(0, 74, 173, 0.05);-->
<!--  border-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);-->
<!--}-->

<!--.radio-card-icon {-->
<!--  font-size: 48px;-->
<!--  line-height: 1;-->
<!--}-->

<!--.radio-card-label {-->
<!--  font-size: var(&#45;&#45;font-size-body, 1rem);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold, 600);-->
<!--  color: var(&#45;&#45;text-primary, #1f2937);-->
<!--}-->

<!--.search-box {-->
<!--  margin-bottom: var(&#45;&#45;space-md, 1rem);-->
<!--}-->

<!--.target-selector {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-sm, 0.5rem);-->
<!--  max-height: 400px;-->
<!--  overflow-y: auto;-->
<!--  padding: var(&#45;&#45;space-xs, 0.25rem);-->
<!--}-->

<!--.target-selector-item {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-md, 1rem);-->
<!--  padding: var(&#45;&#45;space-md, 1rem);-->
<!--  background-color: var(&#45;&#45;bg-secondary, #f9fafb);-->
<!--  border: 2px solid var(&#45;&#45;border-light, #e5e7eb);-->
<!--  border-radius: var(&#45;&#45;border-radius, 8px);-->
<!--  cursor: pointer;-->
<!--  transition: all var(&#45;&#45;transition-fast, 0.15s ease);-->
<!--}-->

<!--.target-selector-item:hover {-->
<!--  background-color: var(&#45;&#45;bg-primary, #ffffff);-->
<!--  border-color: var(&#45;&#45;border-medium, #d1d5db);-->
<!--  transform: translateX(4px);-->
<!--}-->

<!--.target-selector-item.selected {-->
<!--  background-color: rgba(0, 74, 173, 0.05);-->
<!--  border-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);-->
<!--}-->

<!--.target-avatar {-->
<!--  width: 48px;-->
<!--  height: 48px;-->
<!--  min-width: 48px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  color: white;-->
<!--  border-radius: 50%;-->
<!--  font-size: var(&#45;&#45;font-size-body, 1rem);-->
<!--  font-weight: var(&#45;&#45;font-weight-bold, 700);-->
<!--}-->

<!--.group-avatar {-->
<!--  font-size: 24px;-->
<!--  background-color: var(&#45;&#45;color-success, #10b981);-->
<!--}-->

<!--.target-info {-->
<!--  flex: 1;-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: 4px;-->
<!--}-->

<!--.target-name {-->
<!--  font-size: var(&#45;&#45;font-size-body, 1rem);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold, 600);-->
<!--  color: var(&#45;&#45;text-primary, #1f2937);-->
<!--}-->

<!--.target-meta {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm, 0.875rem);-->
<!--  color: var(&#45;&#45;text-secondary, #6b7280);-->
<!--}-->

<!--.target-code {-->
<!--  font-size: var(&#45;&#45;font-size-caption, 0.75rem);-->
<!--  color: var(&#45;&#45;text-muted, #9ca3af);-->
<!--  font-family: 'Monaco', 'Courier New', monospace;-->
<!--}-->

<!--.target-check {-->
<!--  width: 24px;-->
<!--  height: 24px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background-color: var(&#45;&#45;bg-primary, #ffffff);-->
<!--  border: 2px solid var(&#45;&#45;border-medium, #d1d5db);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm, 4px);-->
<!--  color: transparent;-->
<!--  font-size: var(&#45;&#45;font-size-body, 1rem);-->
<!--  font-weight: var(&#45;&#45;font-weight-bold, 700);-->
<!--  transition: all var(&#45;&#45;transition-fast, 0.15s ease);-->
<!--}-->

<!--.target-selector-item.selected .target-check {-->
<!--  background-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  border-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  color: white;-->
<!--}-->

<!--/* Rotation selector */-->
<!--.rotation-selector {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-sm, 0.5rem);-->
<!--}-->

<!--.rotation-selector-item {-->
<!--  padding: var(&#45;&#45;space-md, 1rem);-->
<!--  background-color: var(&#45;&#45;bg-secondary, #f9fafb);-->
<!--  border: 2px solid var(&#45;&#45;border-light, #e5e7eb);-->
<!--  border-radius: var(&#45;&#45;border-radius, 8px);-->
<!--  cursor: pointer;-->
<!--  transition: all var(&#45;&#45;transition-fast, 0.15s ease);-->
<!--}-->

<!--.rotation-selector-item:hover {-->
<!--  background-color: var(&#45;&#45;bg-primary, #ffffff);-->
<!--  border-color: var(&#45;&#45;border-medium, #d1d5db);-->
<!--}-->

<!--.rotation-selector-item.selected {-->
<!--  background-color: rgba(0, 74, 173, 0.05);-->
<!--  border-color: var(&#45;&#45;color-primary, #004aad);-->
<!--}-->

<!--.rotation-selector-header {-->
<!--  display: flex;-->
<!--  justify-content: space-between;-->
<!--  align-items: center;-->
<!--  margin-bottom: var(&#45;&#45;space-xs, 0.25rem);-->
<!--}-->

<!--.rotation-selector-name {-->
<!--  font-size: var(&#45;&#45;font-size-body, 1rem);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold, 600);-->
<!--  color: var(&#45;&#45;text-primary, #1f2937);-->
<!--}-->

<!--.rotation-selector-check {-->
<!--  width: 20px;-->
<!--  height: 20px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background-color: var(&#45;&#45;bg-primary, #ffffff);-->
<!--  border: 2px solid var(&#45;&#45;border-medium, #d1d5db);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm, 4px);-->
<!--  color: transparent;-->
<!--  font-size: 14px;-->
<!--  font-weight: var(&#45;&#45;font-weight-bold, 700);-->
<!--}-->

<!--.rotation-selector-item.selected .rotation-selector-check {-->
<!--  background-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  border-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  color: white;-->
<!--}-->

<!--.rotation-selector-meta {-->
<!--  display: flex;-->
<!--  gap: var(&#45;&#45;space-md, 1rem);-->
<!--  margin-bottom: var(&#45;&#45;space-xs, 0.25rem);-->
<!--}-->

<!--.rotation-badge {-->
<!--  display: inline-flex;-->
<!--  padding: 2px 8px;-->
<!--  background-color: rgba(0, 74, 173, 0.1);-->
<!--  color: var(&#45;&#45;color-primary, #004aad);-->
<!--  font-size: var(&#45;&#45;font-size-caption, 0.75rem);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold, 600);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm, 4px);-->
<!--}-->

<!--.rotation-templates-count {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm, 0.875rem);-->
<!--  color: var(&#45;&#45;text-secondary, #6b7280);-->
<!--}-->

<!--.rotation-selector-dates {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm, 0.875rem);-->
<!--  color: var(&#45;&#45;text-secondary, #6b7280);-->
<!--}-->

<!--/* Offset selector */-->
<!--.offset-selector {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-sm, 0.5rem);-->
<!--}-->

<!--.offset-option {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-md, 1rem);-->
<!--  padding: var(&#45;&#45;space-md, 1rem);-->
<!--  background-color: var(&#45;&#45;bg-secondary, #f9fafb);-->
<!--  border: 2px solid var(&#45;&#45;border-light, #e5e7eb);-->
<!--  border-radius: var(&#45;&#45;border-radius, 8px);-->
<!--  cursor: pointer;-->
<!--  transition: all var(&#45;&#45;transition-fast, 0.15s ease);-->
<!--}-->

<!--.offset-option:hover {-->
<!--  background-color: var(&#45;&#45;bg-primary, #ffffff);-->
<!--  border-color: var(&#45;&#45;border-medium, #d1d5db);-->
<!--}-->

<!--.offset-option.selected {-->
<!--  background-color: rgba(0, 74, 173, 0.05);-->
<!--  border-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);-->
<!--}-->

<!--.offset-number {-->
<!--  width: 48px;-->
<!--  height: 48px;-->
<!--  min-width: 48px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  color: white;-->
<!--  border-radius: 50%;-->
<!--  font-size: var(&#45;&#45;font-size-h6, 1.125rem);-->
<!--  font-weight: var(&#45;&#45;font-weight-bold, 700);-->
<!--}-->

<!--.offset-info {-->
<!--  flex: 1;-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: 4px;-->
<!--}-->

<!--.offset-label {-->
<!--  font-size: var(&#45;&#45;font-size-body, 1rem);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold, 600);-->
<!--  color: var(&#45;&#45;text-primary, #1f2937);-->
<!--}-->

<!--.offset-template {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm, 0.875rem);-->
<!--  color: var(&#45;&#45;text-secondary, #6b7280);-->
<!--}-->

<!--.offset-check {-->
<!--  width: 24px;-->
<!--  height: 24px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background-color: var(&#45;&#45;bg-primary, #ffffff);-->
<!--  border: 2px solid var(&#45;&#45;border-medium, #d1d5db);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm, 4px);-->
<!--  color: transparent;-->
<!--  font-size: var(&#45;&#45;font-size-body, 1rem);-->
<!--  font-weight: var(&#45;&#45;font-weight-bold, 700);-->
<!--  transition: all var(&#45;&#45;transition-fast, 0.15s ease);-->
<!--}-->

<!--.offset-option.selected .offset-check {-->
<!--  background-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  border-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  color: white;-->
<!--}-->

<!--.assignment-summary {-->
<!--  padding: var(&#45;&#45;space-lg, 1.5rem);-->
<!--  background-color: var(&#45;&#45;bg-secondary, #f9fafb);-->
<!--  border-radius: var(&#45;&#45;border-radius, 8px);-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-md, 1rem);-->
<!--}-->

<!--.summary-item {-->
<!--  display: flex;-->
<!--  gap: var(&#45;&#45;space-sm, 0.5rem);-->
<!--}-->

<!--.summary-label {-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold, 600);-->
<!--  color: var(&#45;&#45;text-secondary, #6b7280);-->
<!--  min-width: 140px;-->
<!--}-->

<!--.summary-value {-->
<!--  color: var(&#45;&#45;text-primary, #1f2937);-->
<!--}-->

<!--.error-message {-->
<!--  color: var(&#45;&#45;color-error, #dc3545);-->
<!--  font-size: var(&#45;&#45;font-size-body-sm, 0.875rem);-->
<!--  margin-top: var(&#45;&#45;space-xs, 0.25rem);-->
<!--}-->

<!--.btn:disabled {-->
<!--  opacity: 0.6;-->
<!--  cursor: not-allowed;-->
<!--}-->
<!--</style>-->