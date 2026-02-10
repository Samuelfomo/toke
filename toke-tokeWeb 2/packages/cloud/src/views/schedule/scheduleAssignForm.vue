<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal modal-large" @click.stop>
      <div class="modal-header">
        <h2>{{ isEditMode ? 'Modifier l\'assignation' : 'Assigner un emploi du temps' }}</h2>
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
          <p class="form-hint">Choisissez l'employé qui recevra cet emploi du temps</p>

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
          <p class="form-hint">Choisissez le groupe qui recevra cet emploi du temps</p>

          <div class="target-selector">
            <div
              v-for="group in groups"
              :key="group.guid"
              class="target-selector-item"
              :class="{ selected: form.groups === group.guid }"
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

        <!-- Sélection de l'emploi du temps -->
        <div class="form-section">
          <h3 class="section-title">Emploi du temps</h3>
          <p class="form-hint">Sélectionnez le template d'horaire à assigner</p>

          <div class="schedule-selector">
            <div
              v-for="template in templates"
              :key="template.guid"
              class="schedule-selector-item"
              :class="{ selected: form.session_template === template.guid }"
              @click="selectTemplate(template.guid!)"
            >
              <div class="schedule-selector-header">
                <span class="schedule-selector-name">{{ template.name }}</span>
                <div class="schedule-selector-check">✓</div>
              </div>
              <div class="schedule-selector-dates">
                Valide du {{ formatDate(template.valid_from) }}
                <span v-if="template.valid_to">au {{ formatDate(template.valid_to) }}</span>
                <span v-else>indéfiniment</span>
              </div>
            </div>
          </div>

          <p v-if="errors.session_template" class="error-message">{{ errors.session_template }}</p>
        </div>

        <!-- Période d'assignation -->
        <div class="form-section">
          <h3 class="section-title">Période d'assignation</h3>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date de début *</label>
              <input
                type="date"
                class="form-input"
                v-model="form.start_date"
              />
              <p v-if="errors.start_date" class="error-message">{{ errors.start_date }}</p>
            </div>

            <div class="form-group">
              <label class="form-label">Date de fin *</label>
              <input
                type="date"
                class="form-input"
                v-model="form.end_date"
              />
              <p v-if="errors.end_date" class="error-message">{{ errors.end_date }}</p>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Raison (optionnelle)</label>
            <textarea
              class="form-textarea"
              v-model="form.reason"
              rows="3"
              placeholder="Ex: Changement d'équipe, remplacement temporaire..."
            ></textarea>
          </div>
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
              <span class="summary-label">Emploi du temps:</span>
              <span class="summary-value">{{ getTemplateName() }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Période:</span>
              <span class="summary-value">
                Du {{ formatDate(form.start_date) }} au {{ formatDate(form.end_date) }}
              </span>
            </div>
            <div class="summary-item" v-if="form.reason">
              <span class="summary-label">Raison:</span>
              <span class="summary-value">{{ form.reason }}</span>
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
import { ScheduleAssignment } from '@/service/scheduleAssignmentService';

interface Template {
  guid?: string;
  name: string;
  valid_from: string;
  valid_to: string | null;
}

const props = defineProps<{
  assignment?: ScheduleAssignment | null;
  users: TeamEmployee[];
  groups: Group[];
  templates: Template[];
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
  user: '',           // GUID de l'utilisateur (vide si groupe)
  groups: '',         // GUID du groupe (vide si utilisateur)
  session_template: '', // GUID du template
  start_date: '',
  end_date: '',
  created_by: props.currentUserGuid,
  reason: ''
});

// Initialisation du formulaire en mode édition
watch(() => props.assignment, (assignment) => {
  if (assignment) {
    if (assignment.user) {
      assignmentType.value = 'user';
      form.user = assignment.user.guid;
      form.groups = '';
    } else if (assignment.group) {
      assignmentType.value = 'group';
      form.groups = assignment.group.guid!;
      form.user = '';
    }

    form.session_template = assignment.session_template.guid;
    form.start_date = assignment.start_date;
    form.end_date = assignment.end_date;
    form.reason = assignment.reason || '';
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
  form.groups = '';
  userSearch.value = '';
  delete errors.target;
};

const selectUser = (guid: string) => {
  form.user = guid;
  form.groups = ''; // S'assurer que groups est vide
  delete errors.target;
};

const selectGroup = (guid: string) => {
  form.groups = guid;
  form.user = ''; // S'assurer que user est vide
  delete errors.target;
};

const selectTemplate = (guid: string) => {
  form.session_template = guid;
  delete errors.session_template;
};

const isFormValid = computed(() => {
  return (
    (form.user || form.groups) &&
    form.session_template &&
    form.start_date &&
    form.end_date
  );
});

const getTargetName = (): string => {
  if (assignmentType.value === 'user' && form.user) {
    const user = props.users.find(u => u.guid === form.user);
    return user ? `${user.firstName} ${user.lastName}` : '';
  } else if (assignmentType.value === 'group' && form.groups) {
    const group = props.groups.find(g => g.guid === form.groups);
    return group ? group.name : '';
  }
  return '';
};

const getTemplateName = (): string => {
  const template = props.templates.find(t => t.guid === form.session_template);
  return template ? template.name : '';
};

const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
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
  if (!form.user && !form.groups) {
    newErrors.target = 'Veuillez sélectionner un utilisateur ou un groupe';
  }

  if (!form.session_template) {
    newErrors.session_template = 'Veuillez sélectionner un emploi du temps';
  }

  if (!form.start_date) {
    newErrors.start_date = 'La date de début est obligatoire';
  }

  if (!form.end_date) {
    newErrors.end_date = 'La date de fin est obligatoire';
  }

  if (form.start_date && form.end_date && new Date(form.start_date) > new Date(form.end_date)) {
    newErrors.end_date = 'La date de fin doit être après la date de début';
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
      session_template: form.session_template,
      start_date: form.start_date,
      end_date: form.end_date,
      created_by: form.created_by
    };

    // Ajouter user OU groups (exclusif)
    if (assignmentType.value === 'user' && form.user) {
      payload.user = form.user;
    } else if (assignmentType.value === 'group' && form.groups) {
      payload.groups = form.groups;
    }

    // Ajouter la raison si présente
    if (form.reason) {
      payload.reason = form.reason;
    }

    console.log('📤 Payload envoyé1:', payload);
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

.schedule-selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 0.5rem);
}

.schedule-selector-item {
  padding: var(--space-md, 1rem);
  background-color: var(--bg-secondary, #f9fafb);
  border: 2px solid var(--border-light, #e5e7eb);
  border-radius: var(--border-radius, 8px);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.schedule-selector-item:hover {
  background-color: var(--bg-primary, #ffffff);
  border-color: var(--border-medium, #d1d5db);
}

.schedule-selector-item.selected {
  background-color: rgba(0, 74, 173, 0.05);
  border-color: var(--color-primary, #004aad);
}

.schedule-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xs, 0.25rem);
}

.schedule-selector-name {
  font-size: var(--font-size-body, 1rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #1f2937);
}

.schedule-selector-check {
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

.schedule-selector-item.selected .schedule-selector-check {
  background-color: var(--color-primary, #004aad);
  border-color: var(--color-primary, #004aad);
  color: white;
}

.schedule-selector-dates {
  font-size: var(--font-size-body-sm, 0.875rem);
  color: var(--text-secondary, #6b7280);
}

.form-textarea {
  width: 100%;
  padding: var(--space-sm, 0.5rem) var(--space-md, 1rem);
  font-family: var(--font-primary, system-ui),serif;
  font-size: var(--font-size-body, 1rem);
  color: var(--text-primary, #1f2937);
  background-color: var(--bg-primary, #ffffff);
  border: 2px solid var(--border-medium, #d1d5db);
  border-radius: var(--border-radius, 8px);
  transition: all var(--transition-fast, 0.15s ease);
  resize: vertical;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary, #004aad);
  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);
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
<!--        <h2>{{ isEditMode ? 'Modifier l\'assignation' : 'Assigner un emploi du temps' }}</h2>-->
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
<!--          <p class="form-hint">Choisissez l'employé qui recevra cet emploi du temps</p>-->

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
<!--          <p class="form-hint">Choisissez le groupe qui recevra cet emploi du temps</p>-->

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

<!--        &lt;!&ndash; Sélection de l'emploi du temps &ndash;&gt;-->
<!--        <div class="form-section">-->
<!--          <h3 class="section-title">Emploi du temps</h3>-->
<!--          <p class="form-hint">Sélectionnez le template d'horaire à assigner</p>-->

<!--          <div class="schedule-selector">-->
<!--            <div-->
<!--              v-for="template in templates"-->
<!--              :key="template.guid"-->
<!--              class="schedule-selector-item"-->
<!--              :class="{ selected: form.session_template === template.guid }"-->
<!--              @click="selectTemplate(template.guid!)"-->
<!--            >-->
<!--              <div class="schedule-selector-header">-->
<!--                <span class="schedule-selector-name">{{ template.name }}</span>-->
<!--                <div class="schedule-selector-check">✓</div>-->
<!--              </div>-->
<!--              <div class="schedule-selector-dates">-->
<!--                Valide du {{ formatDate(template.valid_from) }}-->
<!--                <span v-if="template.valid_to">au {{ formatDate(template.valid_to) }}</span>-->
<!--                <span v-else>indéfiniment</span>-->
<!--              </div>-->
<!--            </div>-->
<!--          </div>-->

<!--          <p v-if="errors.session_template" class="error-message">{{ errors.session_template }}</p>-->
<!--        </div>-->

<!--        &lt;!&ndash; Période d'assignation &ndash;&gt;-->
<!--        <div class="form-section">-->
<!--          <h3 class="section-title">Période d'assignation</h3>-->

<!--          <div class="form-row">-->
<!--            <div class="form-group">-->
<!--              <label class="form-label">Date de début *</label>-->
<!--              <input-->
<!--                type="date"-->
<!--                class="form-input"-->
<!--                v-model="form.start_date"-->
<!--              />-->
<!--              <p v-if="errors.start_date" class="error-message">{{ errors.start_date }}</p>-->
<!--            </div>-->

<!--            <div class="form-group">-->
<!--              <label class="form-label">Date de fin *</label>-->
<!--              <input-->
<!--                type="date"-->
<!--                class="form-input"-->
<!--                v-model="form.end_date"-->
<!--              />-->
<!--              <p v-if="errors.end_date" class="error-message">{{ errors.end_date }}</p>-->
<!--            </div>-->
<!--          </div>-->

<!--          <div class="form-group">-->
<!--            <label class="form-label">Raison (optionnelle)</label>-->
<!--            <textarea-->
<!--              class="form-textarea"-->
<!--              v-model="form.reason"-->
<!--              rows="3"-->
<!--              placeholder="Ex: Changement d'équipe, remplacement temporaire..."-->
<!--            ></textarea>-->
<!--          </div>-->
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
<!--              <span class="summary-label">Emploi du temps:</span>-->
<!--              <span class="summary-value">{{ getTemplateName() }}</span>-->
<!--            </div>-->
<!--            <div class="summary-item">-->
<!--              <span class="summary-label">Période:</span>-->
<!--              <span class="summary-value">-->
<!--                Du {{ formatDate(form.start_date) }} au {{ formatDate(form.end_date) }}-->
<!--              </span>-->
<!--            </div>-->
<!--            <div class="summary-item" v-if="form.reason">-->
<!--              <span class="summary-label">Raison:</span>-->
<!--              <span class="summary-value">{{ form.reason }}</span>-->
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

<!--interface Template {-->
<!--  guid?: string;-->
<!--  name: string;-->
<!--  valid_from: string;-->
<!--  valid_to: string | null;-->
<!--}-->

<!--interface Assignment {-->
<!--  guid?: string;-->
<!--  user?: User;-->
<!--  group?: Group;-->
<!--  session_template: Template;-->
<!--  start_date: string;-->
<!--  end_date: string;-->
<!--  reason?: string;-->
<!--}-->

<!--const props = defineProps<{-->
<!--  assignment?: Assignment | null;-->
<!--  users: TeamEmployee[];-->
<!--  // users: User[];-->
<!--  groups: Group[];-->
<!--  templates: Template[];-->
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
<!--  session_template: '',-->
<!--  start_date: '',-->
<!--  end_date: '',-->
<!--  reason: '',-->
<!--});-->

<!--// Initialisation-->
<!--watch(-->
<!--  () => props.assignment,-->
<!--  (assignment) => {-->
<!--    if (!assignment) {-->
<!--      // Mode création-->
<!--      const today = new Date();-->
<!--      form.start_date = today.toISOString().split('T')[0];-->

<!--      const oneYearLater = new Date(today);-->
<!--      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);-->
<!--      form.end_date = oneYearLater.toISOString().split('T')[0];-->

<!--      form.target = '';-->
<!--      form.session_template = '';-->
<!--      form.reason = '';-->
<!--    } else {-->
<!--      // Mode édition-->
<!--      if (assignment.user) {-->
<!--        assignmentType.value = 'user';-->
<!--        form.target = assignment.user.guid;-->
<!--      } else if (assignment.group) {-->
<!--        assignmentType.value = 'group';-->
<!--        form.target = assignment.group.guid!;-->
<!--      }-->

<!--      form.session_template = assignment.session_template.guid!;-->
<!--      form.start_date = assignment.start_date.split('T')[0];-->
<!--      form.end_date = assignment.end_date.split('T')[0];-->
<!--      form.reason = assignment.reason || '';-->
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
<!--  return form.target && form.session_template && form.start_date && form.end_date;-->
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

<!--function selectTemplate(guid: string) {-->
<!--  form.session_template = guid;-->
<!--  delete errors.session_template;-->
<!--}-->

<!--function getInitials(firstName: string, lastName: string): string {-->
<!--  return `${firstName[0]}${lastName[0]}`.toUpperCase();-->
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

<!--function getTemplateName(): string {-->
<!--  const template = props.templates.find(t => t.guid === form.session_template);-->
<!--  return template ? template.name : '';-->
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

<!--  if (!form.session_template) {-->
<!--    errors.session_template = 'Veuillez sélectionner un emploi du temps';-->
<!--    isValid = false;-->
<!--  }-->

<!--  if (!form.start_date) {-->
<!--    errors.start_date = 'La date de début est obligatoire';-->
<!--    isValid = false;-->
<!--  }-->

<!--  if (!form.end_date) {-->
<!--    errors.end_date = 'La date de fin est obligatoire';-->
<!--    isValid = false;-->
<!--  }-->

<!--  if (form.start_date && form.end_date && form.start_date > form.end_date) {-->
<!--    errors.end_date = 'La date de fin doit être après la date de début';-->
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
<!--      session_template: form.session_template,-->
<!--      start_date: form.start_date,-->
<!--      end_date: form.end_date,-->
<!--      created_by: props.currentUserGuid,-->
<!--    };-->

<!--    // Ajouter user OU groups (exclusif)-->
<!--    if (assignmentType.value === 'user') {-->
<!--      payload.user = form.target;-->
<!--    } else {-->
<!--      payload.groups = form.target;-->
<!--    }-->

<!--    // Ajouter la raison si présente-->
<!--    if (form.reason.trim()) {-->
<!--      payload.reason = form.reason.trim();-->
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

<!--.schedule-selector {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-sm, 0.5rem);-->
<!--}-->

<!--.schedule-selector-item {-->
<!--  padding: var(&#45;&#45;space-md, 1rem);-->
<!--  background-color: var(&#45;&#45;bg-secondary, #f9fafb);-->
<!--  border: 2px solid var(&#45;&#45;border-light, #e5e7eb);-->
<!--  border-radius: var(&#45;&#45;border-radius, 8px);-->
<!--  cursor: pointer;-->
<!--  transition: all var(&#45;&#45;transition-fast, 0.15s ease);-->
<!--}-->

<!--.schedule-selector-item:hover {-->
<!--  background-color: var(&#45;&#45;bg-primary, #ffffff);-->
<!--  border-color: var(&#45;&#45;border-medium, #d1d5db);-->
<!--}-->

<!--.schedule-selector-item.selected {-->
<!--  background-color: rgba(0, 74, 173, 0.05);-->
<!--  border-color: var(&#45;&#45;color-primary, #004aad);-->
<!--}-->

<!--.schedule-selector-header {-->
<!--  display: flex;-->
<!--  justify-content: space-between;-->
<!--  align-items: center;-->
<!--  margin-bottom: var(&#45;&#45;space-xs, 0.25rem);-->
<!--}-->

<!--.schedule-selector-name {-->
<!--  font-size: var(&#45;&#45;font-size-body, 1rem);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold, 600);-->
<!--  color: var(&#45;&#45;text-primary, #1f2937);-->
<!--}-->

<!--.schedule-selector-check {-->
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

<!--.schedule-selector-item.selected .schedule-selector-check {-->
<!--  background-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  border-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  color: white;-->
<!--}-->

<!--.schedule-selector-dates {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm, 0.875rem);-->
<!--  color: var(&#45;&#45;text-secondary, #6b7280);-->
<!--}-->

<!--.form-textarea {-->
<!--  width: 100%;-->
<!--  padding: var(&#45;&#45;space-sm, 0.5rem) var(&#45;&#45;space-md, 1rem);-->
<!--  font-family: var(&#45;&#45;font-primary, system-ui);-->
<!--  font-size: var(&#45;&#45;font-size-body, 1rem);-->
<!--  color: var(&#45;&#45;text-primary, #1f2937);-->
<!--  background-color: var(&#45;&#45;bg-primary, #ffffff);-->
<!--  border: 2px solid var(&#45;&#45;border-medium, #d1d5db);-->
<!--  border-radius: var(&#45;&#45;border-radius, 8px);-->
<!--  transition: all var(&#45;&#45;transition-fast, 0.15s ease);-->
<!--  resize: vertical;-->
<!--}-->

<!--.form-textarea:focus {-->
<!--  outline: none;-->
<!--  border-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);-->
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