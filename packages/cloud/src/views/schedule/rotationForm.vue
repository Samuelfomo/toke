<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal modal-large" @click.stop>
      <div class="modal-header">
        <h2>{{ isEditMode ? 'Modifier la rotation' : 'Créer une rotation' }}</h2>
        <button class="btn-close" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <!-- Informations de base -->
        <div class="form-section">
          <h3 class="section-title">Informations de la rotation</h3>

          <div class="form-group">
            <label class="form-label">Nom de la rotation *</label>
            <input
              type="text"
              class="form-input"
              v-model="form.name"
              placeholder="Ex: Rotation équipe matin/soir, Planning hebdomadaire..."
            />
            <p v-if="errors.name" class="error-message">{{ errors.name }}</p>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Durée du cycle *</label>
              <input
                type="number"
                min="1"
                class="form-input"
                v-model.number="form.cycle_length"
                placeholder="Ex: 2"
              />
              <p v-if="errors.cycle_length" class="error-message">{{ errors.cycle_length }}</p>
            </div>

            <div class="form-group">
              <label class="form-label">Unité du cycle *</label>
              <select class="form-input" v-model="form.cycle_unit">
                <option value="day">Jour(s)</option>
                <option value="week">Semaine(s)</option>
                <option value="month">Mois</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Date de début *</label>
            <input
              type="date"
              class="form-input"
              v-model="form.start_date"
            />
            <p v-if="errors.start_date" class="error-message">{{ errors.start_date }}</p>
          </div>
        </div>

        <!-- Sélection des templates -->
        <div class="form-section">
          <h3 class="section-title">Templates d'horaires du cycle</h3>
          <p class="form-hint" style="margin-bottom: var(--space-md);">
            Sélectionnez les emplois du temps qui alterneront dans cette rotation.
            L'ordre de sélection définit l'ordre du cycle.
          </p>

          <div class="schedules-selector">
            <div
              v-for="template in templates"
              :key="template.guid"
              class="schedule-selector-item"
              :class="{
                'selected': isTemplateSelected(template.guid),
                'ordered': isTemplateSelected(template.guid)
              }"
              @click="toggleTemplate(template.guid)"
            >
              <div class="schedule-selector-content">
                <div class="schedule-order-badge" v-if="isTemplateSelected(template.guid)">
                  {{ getTemplateOrder(template.guid) }}
                </div>
                <span class="schedule-selector-name">{{ template.name }}</span>
                <div class="schedule-selector-check">✓</div>
              </div>
            </div>
          </div>

          <div class="group-info-badge">
            <span class="group-info-text">
              {{ form.cycle_templates.length }} template(s) sélectionné(s)
            </span>
          </div>
          <p v-if="errors.cycle_templates" class="error-message">{{ errors.cycle_templates }}</p>
        </div>

        <!-- Prévisualisation du cycle -->
        <div class="form-section" v-if="form.cycle_templates.length > 0">
          <h3 class="section-title">Prévisualisation du cycle</h3>
          <div class="cycle-preview">
            <div
              v-for="(templateGuid, index) in form.cycle_templates"
              :key="index"
              class="cycle-step"
            >
              <div class="cycle-step-number">{{ index + 1 }}</div>
              <div class="cycle-step-name">{{ getTemplateName(templateGuid) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">
          Annuler
        </button>
        <button class="btn btn-primary" @click="handleSave" :disabled="isSaving">
          {{ isSaving ? 'Enregistrement...' : (isEditMode ? 'Enregistrer' : 'Créer la rotation') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import "../../assets/css/toke-schedule-21.css";

interface ScheduleTemplate {
  guid: string;
  name: string;
}

interface RotationInput {
  guid?: string;
  name?: string;
  cycle_length?: number;
  cycle_unit?: 'day' | 'week' | 'month';
  start_date?: string;
  cycle_templates?: ScheduleTemplate[];
}

const props = defineProps<{
  rotation?: RotationInput | null;
  templates: ScheduleTemplate[];
  isEditMode: boolean;
}>();

const emit = defineEmits<{
  save: [payload: {
    name: string;
    cycle_length: number;
    cycle_unit: 'day' | 'week' | 'month';
    cycle_templates: string[];
    start_date: string;
  }];
  close: [];
}>();

const isSaving = ref(false);
const errors = reactive<Record<string, string>>({});

const form = reactive({
  name: '',
  cycle_length: 1,
  cycle_unit: 'week' as 'day' | 'week' | 'month',
  start_date: '',
  cycle_templates: [] as string[],
});

// Initialisation du formulaire
watch(
  () => props.rotation,
  (rotation) => {
    if (!rotation) {
      // Mode création - initialiser avec des valeurs par défaut
      form.name = '';
      form.cycle_length = 1;
      form.cycle_unit = 'week';
      form.start_date = new Date().toISOString().split('T')[0];
      form.cycle_templates = [];
    } else {
      // Mode édition - charger les données existantes
      form.name = rotation.name ?? '';
      form.cycle_length = rotation.cycle_length ?? 1;
      form.cycle_unit = rotation.cycle_unit ?? 'week';
      form.start_date = rotation.start_date
        ? rotation.start_date.slice(0, 10)
        : '';
      form.cycle_templates = rotation.cycle_templates?.map(t => t.guid) ?? [];
    }
  },
  { immediate: true }
);

function isTemplateSelected(guid: string): boolean {
  return form.cycle_templates.includes(guid);
}

function getTemplateOrder(guid: string): number {
  return form.cycle_templates.indexOf(guid) + 1;
}

function getTemplateName(guid: string): string {
  const template = props.templates.find(t => t.guid === guid);
  return template?.name ?? 'Inconnu';
}

function toggleTemplate(guid: string) {
  const index = form.cycle_templates.indexOf(guid);
  if (index > -1) {
    // Retirer le template
    form.cycle_templates.splice(index, 1);
  } else {
    // Ajouter le template
    form.cycle_templates.push(guid);
  }

  // Effacer l'erreur si elle existe
  if (errors.cycle_templates) {
    delete errors.cycle_templates;
  }
}

function validate(): boolean {
  // Réinitialiser les erreurs
  Object.keys(errors).forEach(k => delete errors[k]);

  let isValid = true;

  if (!form.name.trim()) {
    errors.name = 'Le nom de la rotation est obligatoire';
    isValid = false;
  }

  if (!form.cycle_length || form.cycle_length < 1) {
    errors.cycle_length = 'La durée du cycle doit être supérieure à 0';
    isValid = false;
  }

  if (!form.start_date) {
    errors.start_date = 'La date de début est obligatoire';
    isValid = false;
  }

  if (form.cycle_templates.length === 0) {
    errors.cycle_templates = 'Veuillez sélectionner au moins un template d\'horaire';
    isValid = false;
  }

  return isValid;
}

async function handleSave() {
  if (!validate()) {
    return;
  }

  isSaving.value = true;

  try {
    const payload = {
      name: form.name,
      cycle_length: form.cycle_length,
      cycle_unit: form.cycle_unit,
      cycle_templates: form.cycle_templates,
      start_date: form.start_date,
    };

    emit('save', payload);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
/* =========================
   OVERLAY (glass + blur)
========================= */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 15, 25, 0.55);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 1000;
}

/* =========================
   MODAL CARD
========================= */
.modal {
  width: 100%;
  max-width: 900px;
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  border-radius: 20px;
  background: white;
  box-shadow:
      0 25px 60px rgba(0, 0, 0, 0.25),
      0 8px 20px rgba(0, 0, 0, 0.12);

  animation: modalEnter 0.25s ease;
}

@keyframes modalEnter {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* =========================
   HEADER
========================= */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-light, #e9ecef);
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
}

/* Close */
.btn-close {
  font-size: 1.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.6;
  transition: 0.2s;
}

.btn-close:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* =========================
   BODY
========================= */
.modal-body {
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Sections */
.form-section {
  padding: 1.5rem;
  border-radius: 16px;
  background: var(--bg-secondary, #f8fafc);
}

.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
}

/* =========================
   FORM
========================= */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary, #6c757d);
}

/* Inputs modernisés */
.form-input {
  height: 44px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--border-medium, #dee2e6);
  background: white;
  font-size: 0.9rem;
  transition: all 0.15s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary, #004aad);
  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.15);
}

.form-input:hover {
  border-color: #cfd4da;
}

/* Hint */
.form-hint {
  font-size: 0.85rem;
  opacity: 0.7;
}

/* =========================
   TEMPLATE CARDS
========================= */
.schedules-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}

.schedule-selector-item {
  cursor: pointer;
  border-radius: 14px;
  border: 1px solid var(--border-light, #e0e0e0);
  background: white;
  padding: 0.9rem;
  transition: all 0.15s ease;
  position: relative;
}

.schedule-selector-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
}

/* Selected */
.schedule-selector-item.selected {
  border-color: var(--color-primary, #004aad);
  background: rgba(0, 74, 173, 0.05);
}

.schedule-selector-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.schedule-selector-check {
  opacity: 0;
  font-weight: bold;
}

.schedule-selector-item.selected .schedule-selector-check {
  opacity: 1;
  color: var(--color-primary, #004aad);
}

/* Badge count */
.group-info-badge {
  margin-top: 1rem;
  font-size: 0.85rem;
  opacity: 0.8;
}

/* =========================
   PREVIEW
========================= */
.cycle-preview {
  background: white;
  border-radius: 14px;
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.cycle-step {
  padding: 0.4rem 0.8rem;
  background: var(--bg-secondary, #f1f3f5);
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* =========================
   FOOTER (sticky)
========================= */
.modal-footer {
  padding: 1.25rem 2rem;
  border-top: 1px solid var(--border-light, #e9ecef);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: white;
}

/* Buttons modernisés */
.btn {
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: 0.15s ease;
}

.btn-primary {
  background: var(--color-primary, #004aad);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0, 74, 173, 0.25);
}

.btn-secondary {
  background: #f1f3f5;
}

.btn-secondary:hover {
  background: #e9ecef;
}

/* Errors */
.error-message {
  color: #dc3545;
  font-size: 0.8rem;
}

/* Disabled */
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

</style>

<!--<template>-->
<!--  <div class="modal-overlay" @click="$emit('close')">-->
<!--    <div class="modal modal-large" @click.stop>-->
<!--      <div class="modal-header">-->
<!--        <h2>{{ isEditMode ? 'Modifier la rotation' : 'Créer une rotation' }}</h2>-->
<!--        <button class="btn-close" @click="$emit('close')">×</button>-->
<!--      </div>-->

<!--      <div class="modal-body">-->
<!--        &lt;!&ndash; Informations de base &ndash;&gt;-->
<!--        <div class="form-section">-->
<!--          <h3 class="section-title">Informations de la rotation</h3>-->

<!--          <div class="form-group">-->
<!--            <label class="form-label">Nom de la rotation *</label>-->
<!--            <input-->
<!--              type="text"-->
<!--              class="form-input"-->
<!--              v-model="localRotation.name"-->
<!--              placeholder="Ex: Rotation équipe matin/soir, Planning hebdomadaire..."-->
<!--            />-->
<!--          </div>-->

<!--          <div class="form-row">-->
<!--            <div class="form-group">-->
<!--              <label class="form-label">Type de période *</label>-->
<!--              <select class="form-input" v-model="localRotation.periodType">-->
<!--                <option value="day">Jour</option>-->
<!--                <option value="week">Semaine</option>-->
<!--                <option value="month">Mois</option>-->
<!--              </select>-->
<!--            </div>-->

<!--            <div class="form-group">-->
<!--              <label class="form-label">Date de début *</label>-->
<!--              <input-->
<!--                type="date"-->
<!--                class="form-input"-->
<!--                v-model="localRotation.startDate"-->
<!--              />-->
<!--            </div>-->
<!--          </div>-->

<!--          <div class="form-group">-->
<!--            <label class="form-label form-label-checkbox">-->
<!--              <input-->
<!--                type="checkbox"-->
<!--                class="form-checkbox"-->
<!--                v-model="localRotation.isActive"-->
<!--              />-->
<!--              <span>Rotation active</span>-->
<!--            </label>-->
<!--            <p class="form-hint">-->
<!--              Une rotation active sera automatiquement appliquée aux employés selon le planning défini-->
<!--            </p>-->
<!--          </div>-->
<!--        </div>-->

<!--        &lt;!&ndash; Sélection des horaires &ndash;&gt;-->
<!--        <div class="form-section">-->
<!--          <h3 class="section-title">Horaires de rotation</h3>-->
<!--          <p class="form-hint" style="margin-bottom: var(&#45;&#45;space-md);">-->
<!--            Sélectionnez les emplois du temps qui alterneront dans cette rotation-->
<!--          </p>-->

<!--          <div class="schedules-selector">-->
<!--            <div-->
<!--              v-for="schedule in schedules"-->
<!--              :key="schedule.id"-->
<!--              class="schedule-selector-item"-->
<!--              :class="{ 'selected': localRotation.scheduleIds.includes(schedule.id) }"-->
<!--              @click="toggleSchedule(schedule.id)"-->
<!--            >-->
<!--              <div class="schedule-selector-content">-->
<!--                <span class="schedule-selector-name">{{ schedule.name }}</span>-->
<!--                <div class="schedule-selector-check">✓</div>-->
<!--              </div>-->
<!--            </div>-->
<!--          </div>-->

<!--          <div class="group-info-badge">-->
<!--            <span class="group-info-text">-->
<!--              {{ localRotation.scheduleIds.length }} horaire(s) sélectionné(s)-->
<!--            </span>-->
<!--          </div>-->
<!--        </div>-->

<!--        &lt;!&ndash; Sélection des employés &ndash;&gt;-->
<!--        <div class="form-section">-->
<!--          <h3 class="section-title">Employés participants</h3>-->
<!--          <p class="form-hint" style="margin-bottom: var(&#45;&#45;space-md);">-->
<!--            Sélectionnez les employés qui feront partie de cette rotation-->
<!--          </p>-->

<!--          <div class="members-selector">-->
<!--            <div-->
<!--              v-for="employee in employees"-->
<!--              :key="employee.id"-->
<!--              class="member-selector-item"-->
<!--              :class="{-->
<!--                'selected': localRotation.employeeIds.includes(employee.id),-->
<!--                'inactive': !employee.isActive-->
<!--              }"-->
<!--              @click="toggleEmployee(employee.id)"-->
<!--            >-->
<!--              <div class="member-selector-avatar">{{ getInitials(employee.name) }}</div>-->
<!--              <div class="member-selector-info">-->
<!--                <span class="member-selector-name">{{ employee.name }}</span>-->
<!--                <div class="member-selector-details">-->
<!--                  <span class="member-selector-role">{{ employee.role }}</span>-->
<!--                  <div class="member-selector-status">-->
<!--                    <div class="status-dot" :class="{ active: employee.isActive }"></div>-->
<!--                    <span>{{ employee.isActive ? 'Actif' : 'Inactif' }}</span>-->
<!--                  </div>-->
<!--                </div>-->
<!--              </div>-->
<!--              <div class="member-selector-check">✓</div>-->
<!--            </div>-->
<!--          </div>-->

<!--          <div class="group-info-badge">-->
<!--            <span class="group-info-text">-->
<!--              {{ localRotation.employeeIds.length }} employé(s) sélectionné(s)-->
<!--            </span>-->
<!--          </div>-->
<!--        </div>-->
<!--      </div>-->

<!--      <div class="modal-footer">-->
<!--        <button class="btn btn-secondary" @click="$emit('close')">-->
<!--          Annuler-->
<!--        </button>-->
<!--        <button class="btn btn-primary" @click="handleSave">-->
<!--          {{ isEditMode ? 'Enregistrer' : 'Créer la rotation' }}-->
<!--        </button>-->
<!--      </div>-->
<!--    </div>-->
<!--  </div>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import { ref, watch } from 'vue';-->
<!--import "../../assets/css/toke-schedule-21.css"-->

<!--interface Schedule {-->
<!--  id: number;-->
<!--  name: string;-->
<!--}-->

<!--interface Employee {-->
<!--  id: number;-->
<!--  name: string;-->
<!--  role: string;-->
<!--  isActive?: boolean;-->
<!--}-->

<!--interface Rotation {-->
<!--  id: number;-->
<!--  name: string;-->
<!--  scheduleIds: number[];-->
<!--  employeeIds: number[];-->
<!--  periodType: 'day' | 'week' | 'month';-->
<!--  startDate: string;-->
<!--  isActive: boolean;-->
<!--  assignedDate?: string;-->
<!--}-->

<!--const props = defineProps<{-->
<!--  rotation: Rotation;-->
<!--  isEditMode: boolean;-->
<!--  schedules: Schedule[];-->
<!--  employees: Employee[];-->
<!--}>();-->

<!--const emit = defineEmits<{-->
<!--  save: [rotation: Rotation];-->
<!--  close: [];-->
<!--}>();-->

<!--const localRotation = ref<Rotation>(JSON.parse(JSON.stringify(props.rotation)));-->

<!--watch(() => props.rotation, (newRotation) => {-->
<!--  localRotation.value = JSON.parse(JSON.stringify(newRotation));-->
<!--}, { deep: true });-->

<!--function toggleSchedule(scheduleId: number) {-->
<!--  const index = localRotation.value.scheduleIds.indexOf(scheduleId);-->
<!--  if (index > -1) {-->
<!--    localRotation.value.scheduleIds.splice(index, 1);-->
<!--  } else {-->
<!--    localRotation.value.scheduleIds.push(scheduleId);-->
<!--  }-->
<!--}-->

<!--function toggleEmployee(employeeId: number) {-->
<!--  const index = localRotation.value.employeeIds.indexOf(employeeId);-->
<!--  if (index > -1) {-->
<!--    localRotation.value.employeeIds.splice(index, 1);-->
<!--  } else {-->
<!--    localRotation.value.employeeIds.push(employeeId);-->
<!--  }-->
<!--}-->

<!--function getInitials(name: string): string {-->
<!--  return name-->
<!--    .split(' ')-->
<!--    .map(n => n[0])-->
<!--    .join('')-->
<!--    .toUpperCase();-->
<!--}-->

<!--function handleSave() {-->
<!--  if (!localRotation.value.name.trim()) {-->
<!--    alert('Veuillez saisir un nom pour la rotation');-->
<!--    return;-->
<!--  }-->

<!--  if (localRotation.value.scheduleIds.length === 0) {-->
<!--    alert('Veuillez sélectionner au moins un horaire');-->
<!--    return;-->
<!--  }-->

<!--  if (localRotation.value.employeeIds.length === 0) {-->
<!--    alert('Veuillez sélectionner au moins un employé');-->
<!--    return;-->
<!--  }-->

<!--  if (!localRotation.value.startDate) {-->
<!--    alert('Veuillez sélectionner une date de début');-->
<!--    return;-->
<!--  }-->

<!--  emit('save', localRotation.value);-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--/**-->
<!-- * ===== TOKÉ DESIGN SYSTEM - SCHEDULE-21.CSS =====-->
<!-- * Version: 1.0-->
<!-- * Component: Groups View-->
<!-- *-->
<!-- * Hérite des variables de main.css-->
<!-- * Vue d'affichage des groupes avec liste des membres-->
<!-- */-->

<!--/* ===== LAYOUT PRINCIPAL ===== */-->

<!--.content {-->
<!--  padding: var(&#45;&#45;space-xl) 0;-->
<!--}-->

<!--/* ===== GROUPS HEADER ===== */-->

<!--.groups-header {-->
<!--  display: flex;-->
<!--  justify-content: space-between;-->
<!--  align-items: flex-start;-->
<!--  margin-bottom: var(&#45;&#45;space-2xl);-->
<!--  padding-bottom: var(&#45;&#45;space-lg);-->
<!--  border-bottom: 1px solid var(&#45;&#45;border-light);-->
<!--}-->

<!--.page-title {-->
<!--  font-size: var(&#45;&#45;font-size-h2);-->
<!--  font-weight: var(&#45;&#45;font-weight-bold);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--  margin-bottom: var(&#45;&#45;space-xs);-->
<!--}-->

<!--.page-subtitle {-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--}-->

<!--@media (max-width: 768px) {-->
<!--  .groups-header {-->
<!--    flex-direction: column;-->
<!--    gap: var(&#45;&#45;space-md);-->
<!--  }-->

<!--  .groups-header .btn {-->
<!--    width: 100%;-->
<!--  }-->
<!--}-->

<!--/* ===== EMPTY STATE ===== */-->

<!--.empty-state {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  padding: var(&#45;&#45;space-4xl) var(&#45;&#45;space-md);-->
<!--  text-align: center;-->
<!--}-->

<!--.empty-icon {-->
<!--  font-size: 64px;-->
<!--  margin-bottom: var(&#45;&#45;space-lg);-->
<!--  opacity: 0.5;-->
<!--}-->

<!--.empty-state h3 {-->
<!--  font-size: var(&#45;&#45;font-size-h4);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--  margin-bottom: var(&#45;&#45;space-sm);-->
<!--}-->

<!--.empty-state p {-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--  max-width: 400px;-->
<!--}-->

<!--/* ===== GROUPS GRID ===== */-->

<!--.groups-grid,-->
<!--.rotations-grid {-->
<!--  display: grid;-->
<!--  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));-->
<!--  gap: var(&#45;&#45;space-lg);-->
<!--  padding: var(&#45;&#45;space-lg) 0;-->
<!--}-->

<!--@media (max-width: 768px) {-->
<!--  .groups-grid,-->
<!--  .rotations-grid {-->
<!--    grid-template-columns: 1fr;-->
<!--    gap: var(&#45;&#45;space-md);-->
<!--  }-->
<!--}-->

<!--/* ===== GROUP CARD ===== */-->

<!--.group-card,-->
<!--.rotation-card {-->
<!--  background-color: var(&#45;&#45;bg-card);-->
<!--  border: 1px solid var(&#45;&#45;border-light);-->
<!--  border-radius: var(&#45;&#45;border-radius-lg);-->
<!--  padding: var(&#45;&#45;space-lg);-->
<!--  box-shadow: var(&#45;&#45;shadow);-->
<!--  transition: box-shadow var(&#45;&#45;transition-base), transform var(&#45;&#45;transition-base);-->
<!--}-->

<!--.group-card:hover,-->
<!--.rotation-card:hover {-->
<!--  box-shadow: var(&#45;&#45;shadow-lg);-->
<!--  transform: translateY(-2px);-->
<!--}-->

<!--/* ===== GROUP CARD HEADER ===== */-->

<!--.group-card-header,-->
<!--.rotation-card-header {-->
<!--  display: flex;-->
<!--  justify-content: space-between;-->
<!--  align-items: flex-start;-->
<!--  margin-bottom: var(&#45;&#45;space-lg);-->
<!--  padding-bottom: var(&#45;&#45;space-md);-->
<!--  border-bottom: 1px solid var(&#45;&#45;border-light);-->
<!--}-->

<!--.group-name,-->
<!--.rotation-name {-->
<!--  font-size: var(&#45;&#45;font-size-h5);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--  margin-bottom: var(&#45;&#45;space-xs);-->
<!--}-->

<!--.group-meta,-->
<!--.rotation-meta {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-xs);-->
<!--}-->

<!--.group-created-date,-->
<!--.group-member-count,-->
<!--.rotation-date {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-xs);-->
<!--}-->

<!--/* ===== GROUP ACTIONS ===== */-->

<!--.group-actions {-->
<!--  display: flex;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--}-->

<!--.btn-icon-action {-->
<!--  width: 40px;-->
<!--  height: 40px;-->
<!--  min-width: 44px;-->
<!--  min-height: 44px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background-color: var(&#45;&#45;bg-secondary);-->
<!--  border: 1px solid var(&#45;&#45;border-medium);-->
<!--  border-radius: var(&#45;&#45;border-radius);-->
<!--  font-size: var(&#45;&#45;font-size-body-lg);-->
<!--  cursor: pointer;-->
<!--  transition: background-color var(&#45;&#45;transition-fast), border-color var(&#45;&#45;transition-fast);-->
<!--  padding: 0;-->
<!--}-->

<!--.btn-icon-action:hover {-->
<!--  background-color: var(&#45;&#45;color-primary);-->
<!--  border-color: var(&#45;&#45;color-primary);-->
<!--}-->

<!--.btn-icon-action.btn-icon-danger:hover {-->
<!--  background-color: var(&#45;&#45;color-error);-->
<!--  border-color: var(&#45;&#45;color-error);-->
<!--}-->

<!--.btn-icon-action:active {-->
<!--  transform: scale(0.95);-->
<!--}-->

<!--.btn-icon-action:focus-visible {-->
<!--  outline: 2px solid var(&#45;&#45;color-primary);-->
<!--  outline-offset: 2px;-->
<!--}-->

<!--/* ===== GROUP MEMBERS LIST ===== */-->

<!--.group-members-list {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--  margin-bottom: var(&#45;&#45;space-lg);-->
<!--  max-height: 320px;-->
<!--  overflow-y: auto;-->
<!--  padding-right: var(&#45;&#45;space-xs);-->
<!--}-->

<!--/* ===== GROUP MEMBERS SUMMARY (NOUVEAU) ===== */-->

<!--.group-members-summary {-->
<!--  margin-bottom: var(&#45;&#45;space-lg);-->
<!--  padding: var(&#45;&#45;space-lg) 0;-->
<!--}-->

<!--.members-count-card {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-lg);-->
<!--  padding: var(&#45;&#45;space-xl);-->
<!--  background: linear-gradient(135deg, rgba(0, 74, 173, 0.05) 0%, rgba(0, 74, 173, 0.02) 100%);-->
<!--  border: 2px solid rgba(0, 74, 173, 0.15);-->
<!--  border-radius: var(&#45;&#45;border-radius-lg);-->
<!--  transition: all var(&#45;&#45;transition-base);-->
<!--}-->

<!--.members-count-card:hover {-->
<!--  background: linear-gradient(135deg, rgba(0, 74, 173, 0.08) 0%, rgba(0, 74, 173, 0.04) 100%);-->
<!--  border-color: rgba(0, 74, 173, 0.25);-->
<!--  transform: translateY(-2px);-->
<!--}-->

<!--.members-count-icon {-->
<!--  font-size: 48px;-->
<!--  line-height: 1;-->
<!--  opacity: 0.8;-->
<!--}-->

<!--.members-count-info {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-xs);-->
<!--}-->

<!--.members-count-number {-->
<!--  font-size: var(&#45;&#45;font-size-h2);-->
<!--  font-weight: var(&#45;&#45;font-weight-bold);-->
<!--  color: var(&#45;&#45;color-primary);-->
<!--  line-height: 1;-->
<!--}-->

<!--.members-count-label {-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--}-->

<!--/* Scrollbar personnalisée */-->
<!--.group-members-list::-webkit-scrollbar {-->
<!--  width: 6px;-->
<!--}-->

<!--.group-members-list::-webkit-scrollbar-track {-->
<!--  background: var(&#45;&#45;bg-secondary);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm);-->
<!--}-->

<!--.group-members-list::-webkit-scrollbar-thumb {-->
<!--  background: var(&#45;&#45;border-dark);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm);-->
<!--}-->

<!--.group-members-list::-webkit-scrollbar-thumb:hover {-->
<!--  background: var(&#45;&#45;text-secondary);-->
<!--}-->

<!--/* ===== GROUP MEMBER ITEM ===== */-->

<!--.group-member-item {-->
<!--  display: flex;-->
<!--  justify-content: space-between;-->
<!--  align-items: center;-->
<!--  padding: var(&#45;&#45;space-sm) var(&#45;&#45;space-md);-->
<!--  background-color: var(&#45;&#45;bg-secondary);-->
<!--  border: 1px solid var(&#45;&#45;border-light);-->
<!--  border-radius: var(&#45;&#45;border-radius);-->
<!--  transition: background-color var(&#45;&#45;transition-fast), border-color var(&#45;&#45;transition-fast);-->
<!--}-->

<!--.group-member-item:hover {-->
<!--  background-color: var(&#45;&#45;bg-primary);-->
<!--  border-color: var(&#45;&#45;border-medium);-->
<!--}-->

<!--.group-member-info {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-md);-->
<!--  flex: 1;-->
<!--}-->

<!--/* ===== GROUP MEMBER AVATAR ===== */-->

<!--.group-member-avatar {-->
<!--  width: 40px;-->
<!--  height: 40px;-->
<!--  min-width: 40px;-->
<!--  min-height: 40px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background-color: var(&#45;&#45;color-primary);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold);-->
<!--  border-radius: 50%;-->
<!--}-->

<!--/* ===== GROUP MEMBER DETAILS ===== */-->

<!--.group-member-details {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-xs);-->
<!--}-->

<!--.group-member-name {-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--}-->

<!--.group-member-role {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--}-->

<!--/* ===== GROUP MEMBER STATUS ===== */-->

<!--.group-member-status {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--}-->

<!--.status-dot {-->
<!--  width: 8px;-->
<!--  height: 8px;-->
<!--  min-width: 8px;-->
<!--  min-height: 8px;-->
<!--  border-radius: 50%;-->
<!--  background-color: var(&#45;&#45;text-disabled);-->
<!--  transition: background-color var(&#45;&#45;transition-fast);-->
<!--}-->

<!--.status-dot.active {-->
<!--  background-color: var(&#45;&#45;color-success);-->
<!--  box-shadow: 0 0 8px rgba(40, 167, 69, 0.4);-->
<!--}-->

<!--.status-text {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--}-->

<!--.status-text.active {-->
<!--  color: var(&#45;&#45;color-success);-->
<!--}-->

<!--/* ===== GROUP ACTIONS BAR ===== */-->

<!--.group-actions-bar {-->
<!--  display: flex;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--  padding-top: var(&#45;&#45;space-md);-->
<!--  border-top: 1px solid var(&#45;&#45;border-light);-->
<!--}-->

<!--.btn-action-compact {-->
<!--  flex: 1;-->
<!--  height: var(&#45;&#45;btn-height-sm);-->
<!--  min-height: 44px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--  padding: 0 var(&#45;&#45;btn-padding-x-sm);-->
<!--  background-color: var(&#45;&#45;bg-primary);-->
<!--  border: 1px solid var(&#45;&#45;border-medium);-->
<!--  border-radius: var(&#45;&#45;border-radius);-->
<!--  font-size: var(&#45;&#45;font-size-btn-sm);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--  cursor: pointer;-->
<!--  transition: all var(&#45;&#45;transition-fast);-->
<!--}-->

<!--.btn-action-compact:hover {-->
<!--  background-color: var(&#45;&#45;color-primary);-->
<!--  border-color: var(&#45;&#45;color-primary);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--}-->

<!--.btn-action-compact.btn-action-edit {-->
<!--  background-color: var(&#45;&#45;bg-secondary);-->
<!--}-->

<!--.btn-action-compact.btn-action-edit:hover {-->
<!--  background-color: var(&#45;&#45;color-primary);-->
<!--  border-color: var(&#45;&#45;color-primary);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--}-->

<!--.btn-action-compact:active {-->
<!--  transform: scale(0.98);-->
<!--}-->

<!--.btn-action-compact:focus-visible {-->
<!--  outline: 2px solid var(&#45;&#45;color-primary);-->
<!--  outline-offset: 2px;-->
<!--}-->

<!--/* ===== RESPONSIVE ADJUSTMENTS ===== */-->

<!--@media (max-width: 768px) {-->
<!--  .group-card {-->
<!--    padding: var(&#45;&#45;space-md);-->
<!--  }-->

<!--  .group-card-header {-->
<!--    flex-direction: column;-->
<!--    gap: var(&#45;&#45;space-md);-->
<!--  }-->

<!--  .group-actions {-->
<!--    width: 100%;-->
<!--    justify-content: flex-end;-->
<!--  }-->

<!--  .group-members-list {-->
<!--    max-height: 240px;-->
<!--  }-->

<!--  .group-member-info {-->
<!--    gap: var(&#45;&#45;space-sm);-->
<!--  }-->

<!--  .group-member-avatar {-->
<!--    width: 36px;-->
<!--    height: 36px;-->
<!--    min-width: 36px;-->
<!--    min-height: 36px;-->
<!--    font-size: var(&#45;&#45;font-size-caption);-->
<!--  }-->
<!--}-->

<!--/* ===== ANIMATIONS ===== */-->

<!--@keyframes fadeIn {-->
<!--  from {-->
<!--    opacity: 0;-->
<!--    transform: translateY(10px);-->
<!--  }-->
<!--  to {-->
<!--    opacity: 1;-->
<!--    transform: translateY(0);-->
<!--  }-->
<!--}-->

<!--.group-card {-->
<!--  animation: fadeIn var(&#45;&#45;transition-base) ease-out;-->
<!--}-->

<!--/* ===== MODAL OVERLAY ===== */-->

<!--.modal-overlay {-->
<!--  position: fixed;-->
<!--  top: 0;-->
<!--  left: 0;-->
<!--  right: 0;-->
<!--  bottom: 0;-->
<!--  background-color: rgba(0, 0, 0, 0.5);-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  z-index: 1000;-->
<!--  padding: var(&#45;&#45;space-md);-->
<!--  animation: fadeIn var(&#45;&#45;transition-base) ease-out;-->
<!--}-->

<!--/* ===== MODAL ===== */-->

<!--.modal {-->
<!--  background-color: var(&#45;&#45;bg-card);-->
<!--  border-radius: var(&#45;&#45;border-radius-lg);-->
<!--  box-shadow: var(&#45;&#45;shadow-xl);-->
<!--  width: 100%;-->
<!--  max-width: 600px;-->
<!--  max-height: 90vh;-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  animation: slideUp var(&#45;&#45;transition-slow) ease-out;-->
<!--}-->

<!--.modal-members {-->
<!--  max-width: 500px;-->
<!--}-->

<!--.modal-delete {-->
<!--  max-width: 520px;-->
<!--}-->

<!--.modal-large {-->
<!--  max-width: 700px;-->
<!--}-->

<!--@keyframes slideUp {-->
<!--  from {-->
<!--    opacity: 0;-->
<!--    transform: translateY(20px);-->
<!--  }-->
<!--  to {-->
<!--    opacity: 1;-->
<!--    transform: translateY(0);-->
<!--  }-->
<!--}-->

<!--/* ===== DELETE MODAL STYLES ===== */-->

<!--.modal-header-danger {-->
<!--  background-color: rgba(220, 53, 69, 0.05);-->
<!--  border-bottom-color: rgba(220, 53, 69, 0.2);-->
<!--}-->

<!--.modal-header-danger h2 {-->
<!--  color: var(&#45;&#45;color-error);-->
<!--}-->

<!--.delete-confirmation-content {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  align-items: center;-->
<!--  text-align: center;-->
<!--  gap: var(&#45;&#45;space-lg);-->
<!--}-->

<!--.delete-icon {-->
<!--  font-size: 64px;-->
<!--  line-height: 1;-->
<!--  animation: pulse 2s ease-in-out infinite;-->
<!--}-->

<!--@keyframes pulse {-->
<!--  0%, 100% {-->
<!--    transform: scale(1);-->
<!--    opacity: 1;-->
<!--  }-->
<!--  50% {-->
<!--    transform: scale(1.1);-->
<!--    opacity: 0.8;-->
<!--  }-->
<!--}-->

<!--.delete-message {-->
<!--  font-size: var(&#45;&#45;font-size-body-lg);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--  line-height: var(&#45;&#45;line-height-body-lg);-->
<!--}-->

<!--.delete-message strong {-->
<!--  color: var(&#45;&#45;color-error);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold);-->
<!--}-->

<!--.delete-details {-->
<!--  width: 100%;-->
<!--  padding: var(&#45;&#45;space-lg);-->
<!--  background-color: var(&#45;&#45;bg-secondary);-->
<!--  border-radius: var(&#45;&#45;border-radius);-->
<!--  text-align: left;-->
<!--}-->

<!--.delete-details p {-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--  margin-bottom: var(&#45;&#45;space-md);-->
<!--}-->

<!--.delete-list {-->
<!--  list-style: none;-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--}-->

<!--.delete-list li {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--  padding-left: var(&#45;&#45;space-md);-->
<!--  position: relative;-->
<!--}-->

<!--.delete-list li::before {-->
<!--  content: '';-->
<!--  position: absolute;-->
<!--  left: 0;-->
<!--  top: 50%;-->
<!--  transform: translateY(-50%);-->
<!--  width: 4px;-->
<!--  height: 4px;-->
<!--  background-color: var(&#45;&#45;color-error);-->
<!--  border-radius: 50%;-->
<!--}-->

<!--.btn-danger-solid {-->
<!--  background-color: var(&#45;&#45;color-error);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--  border: none;-->
<!--}-->

<!--.btn-danger-solid:hover {-->
<!--  background-color: #c82333;-->
<!--  box-shadow: var(&#45;&#45;shadow-lg);-->
<!--}-->

<!--.btn-danger-solid:active {-->
<!--  transform: scale(0.98);-->
<!--}-->

<!--/* ===== MODAL HEADER ===== */-->

<!--.modal-header {-->
<!--  display: flex;-->
<!--  justify-content: space-between;-->
<!--  align-items: center;-->
<!--  padding: var(&#45;&#45;space-lg) var(&#45;&#45;space-xl);-->
<!--  border-bottom: 1px solid var(&#45;&#45;border-light);-->
<!--}-->

<!--.modal-header h2 {-->
<!--  font-size: var(&#45;&#45;font-size-h4);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--  margin: 0;-->
<!--}-->

<!--.btn-close {-->
<!--  width: 44px;-->
<!--  height: 44px;-->
<!--  min-width: 44px;-->
<!--  min-height: 44px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background-color: transparent;-->
<!--  border: none;-->
<!--  border-radius: var(&#45;&#45;border-radius);-->
<!--  font-size: 32px;-->
<!--  line-height: 1;-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--  cursor: pointer;-->
<!--  transition: all var(&#45;&#45;transition-fast);-->
<!--  padding: 0;-->
<!--}-->

<!--.btn-close:hover {-->
<!--  background-color: var(&#45;&#45;bg-secondary);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--}-->

<!--.btn-close:focus-visible {-->
<!--  outline: 2px solid var(&#45;&#45;color-primary);-->
<!--  outline-offset: 2px;-->
<!--}-->

<!--/* ===== MODAL BODY ===== */-->

<!--.modal-body {-->
<!--  padding: var(&#45;&#45;space-xl);-->
<!--  overflow-y: auto;-->
<!--  flex: 1;-->
<!--}-->

<!--/* Scrollbar personnalisée pour le modal body */-->
<!--.modal-body::-webkit-scrollbar {-->
<!--  width: 8px;-->
<!--}-->

<!--.modal-body::-webkit-scrollbar-track {-->
<!--  background: var(&#45;&#45;bg-secondary);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm);-->
<!--}-->

<!--.modal-body::-webkit-scrollbar-thumb {-->
<!--  background: var(&#45;&#45;border-dark);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm);-->
<!--}-->

<!--.modal-body::-webkit-scrollbar-thumb:hover {-->
<!--  background: var(&#45;&#45;text-secondary);-->
<!--}-->

<!--/* ===== FORM SECTION ===== */-->

<!--.form-section,-->
<!--.assignment-form-section {-->
<!--  margin-bottom: var(&#45;&#45;space-2xl);-->
<!--}-->

<!--.form-section:last-child,-->
<!--.assignment-form-section:last-child {-->
<!--  margin-bottom: 0;-->
<!--}-->

<!--.section-title {-->
<!--  font-size: var(&#45;&#45;font-size-h6);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--  margin-bottom: var(&#45;&#45;space-md);-->
<!--}-->

<!--.form-hint {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--  line-height: var(&#45;&#45;line-height-body-sm);-->
<!--}-->

<!--/* ===== FORM GROUP ===== */-->

<!--.form-group {-->
<!--  margin-bottom: var(&#45;&#45;space-lg);-->
<!--}-->

<!--.form-group:last-child {-->
<!--  margin-bottom: 0;-->
<!--}-->

<!--.form-label {-->
<!--  display: block;-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--  margin-bottom: var(&#45;&#45;space-sm);-->
<!--}-->

<!--.form-input {-->
<!--  width: 100%;-->
<!--  height: var(&#45;&#45;input-height);-->
<!--  min-height: 44px;-->
<!--  padding: 0 var(&#45;&#45;input-padding-x);-->
<!--  font-family: var(&#45;&#45;font-primary);-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--  background-color: var(&#45;&#45;bg-primary);-->
<!--  border: var(&#45;&#45;input-border-width) solid var(&#45;&#45;border-medium);-->
<!--  border-radius: var(&#45;&#45;border-radius);-->
<!--  transition: all var(&#45;&#45;transition-fast);-->
<!--}-->

<!--.form-input::placeholder {-->
<!--  color: var(&#45;&#45;text-muted);-->
<!--}-->

<!--.form-input:hover {-->
<!--  border-color: var(&#45;&#45;border-dark);-->
<!--}-->

<!--.form-input:focus {-->
<!--  outline: none;-->
<!--  border-color: var(&#45;&#45;color-primary);-->
<!--  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);-->
<!--}-->

<!--.form-input:focus-visible {-->
<!--  outline: 2px solid var(&#45;&#45;color-primary);-->
<!--  outline-offset: 2px;-->
<!--}-->

<!--/* ===== FORM ROW ===== */-->

<!--.form-row {-->
<!--  display: grid;-->
<!--  grid-template-columns: 1fr 1fr;-->
<!--  gap: var(&#45;&#45;space-md);-->
<!--}-->

<!--@media (max-width: 768px) {-->
<!--  .form-row {-->
<!--    grid-template-columns: 1fr;-->
<!--  }-->
<!--}-->

<!--/* ===== FORM SELECT ===== */-->

<!--select.form-input {-->
<!--  cursor: pointer;-->
<!--  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23212529' d='M6 9L1 4h10z'/%3E%3C/svg%3E");-->
<!--  background-repeat: no-repeat;-->
<!--  background-position: right var(&#45;&#45;space-md) center;-->
<!--  padding-right: var(&#45;&#45;space-2xl);-->
<!--}-->

<!--/* ===== FORM CHECKBOX ===== */-->

<!--.form-label-checkbox {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--  cursor: pointer;-->
<!--  margin-bottom: 0;-->
<!--}-->

<!--.form-checkbox {-->
<!--  width: 20px;-->
<!--  height: 20px;-->
<!--  min-width: 20px;-->
<!--  min-height: 20px;-->
<!--  cursor: pointer;-->
<!--  accent-color: var(&#45;&#45;color-primary);-->
<!--}-->

<!--.form-label-checkbox span {-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--}-->

<!--/* ===== SCHEDULES SELECTOR ===== */-->

<!--.schedules-selector {-->
<!--  display: grid;-->
<!--  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--  margin-bottom: var(&#45;&#45;space-md);-->
<!--}-->

<!--.schedule-selector-item {-->
<!--  padding: var(&#45;&#45;space-md);-->
<!--  background-color: var(&#45;&#45;bg-secondary);-->
<!--  border: 2px solid var(&#45;&#45;border-light);-->
<!--  border-radius: var(&#45;&#45;border-radius);-->
<!--  cursor: pointer;-->
<!--  transition: all var(&#45;&#45;transition-fast);-->
<!--}-->

<!--.schedule-selector-item:hover {-->
<!--  background-color: var(&#45;&#45;bg-primary);-->
<!--  border-color: var(&#45;&#45;border-medium);-->
<!--  transform: translateY(-2px);-->
<!--}-->

<!--.schedule-selector-item.selected {-->
<!--  background-color: rgba(0, 74, 173, 0.05);-->
<!--  border-color: var(&#45;&#45;color-primary);-->
<!--}-->

<!--.schedule-selector-content {-->
<!--  display: flex;-->
<!--  justify-content: space-between;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--}-->

<!--.schedule-selector-name {-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--  flex: 1;-->
<!--}-->

<!--.schedule-selector-check {-->
<!--  width: 20px;-->
<!--  height: 20px;-->
<!--  min-width: 20px;-->
<!--  min-height: 20px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background-color: var(&#45;&#45;bg-primary);-->
<!--  border: 2px solid var(&#45;&#45;border-medium);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  font-weight: var(&#45;&#45;font-weight-bold);-->
<!--  transition: all var(&#45;&#45;transition-fast);-->
<!--}-->

<!--.schedule-selector-item.selected .schedule-selector-check {-->
<!--  background-color: var(&#45;&#45;color-primary);-->
<!--  border-color: var(&#45;&#45;color-primary);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--}-->

<!--/* ===== MEMBERS SELECTOR ===== */-->

<!--.members-selector {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--  max-height: 400px;-->
<!--  overflow-y: auto;-->
<!--  padding: var(&#45;&#45;space-xs);-->
<!--  margin: 0 calc(-1 * var(&#45;&#45;space-xs));-->
<!--}-->

<!--/* Scrollbar personnalisée pour members-selector */-->
<!--.members-selector::-webkit-scrollbar {-->
<!--  width: 8px;-->
<!--}-->

<!--.members-selector::-webkit-scrollbar-track {-->
<!--  background: var(&#45;&#45;bg-secondary);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm);-->
<!--}-->

<!--.members-selector::-webkit-scrollbar-thumb {-->
<!--  background: var(&#45;&#45;border-dark);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm);-->
<!--}-->

<!--.members-selector::-webkit-scrollbar-thumb:hover {-->
<!--  background: var(&#45;&#45;text-secondary);-->
<!--}-->

<!--/* ===== MEMBER SELECTOR ITEM ===== */-->

<!--.member-selector-item {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-md);-->
<!--  padding: var(&#45;&#45;space-md);-->
<!--  background-color: var(&#45;&#45;bg-secondary);-->
<!--  border: 2px solid var(&#45;&#45;border-light);-->
<!--  border-radius: var(&#45;&#45;border-radius);-->
<!--  cursor: pointer;-->
<!--  transition: all var(&#45;&#45;transition-fast);-->
<!--  position: relative;-->
<!--}-->

<!--.member-selector-item:hover {-->
<!--  background-color: var(&#45;&#45;bg-primary);-->
<!--  border-color: var(&#45;&#45;border-medium);-->
<!--  transform: translateX(4px);-->
<!--}-->

<!--.member-selector-item.selected {-->
<!--  background-color: rgba(0, 74, 173, 0.05);-->
<!--  border-color: var(&#45;&#45;color-primary);-->
<!--}-->

<!--.member-selector-item.selected:hover {-->
<!--  background-color: rgba(0, 74, 173, 0.1);-->
<!--}-->

<!--.member-selector-item.inactive {-->
<!--  opacity: 0.6;-->
<!--}-->

<!--.member-selector-item.inactive:hover {-->
<!--  opacity: 0.8;-->
<!--}-->

<!--/* ===== MEMBER SELECTOR AVATAR ===== */-->

<!--.member-selector-avatar {-->
<!--  width: 48px;-->
<!--  height: 48px;-->
<!--  min-width: 48px;-->
<!--  min-height: 48px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background-color: var(&#45;&#45;color-primary);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold);-->
<!--  border-radius: 50%;-->
<!--}-->

<!--/* ===== MEMBER SELECTOR INFO ===== */-->

<!--.member-selector-info {-->
<!--  flex: 1;-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-xs);-->
<!--}-->

<!--.member-selector-name {-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--}-->

<!--.member-selector-details {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-md);-->
<!--}-->

<!--.member-selector-role {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--}-->

<!--.member-selector-status {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-xs);-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--}-->

<!--/* ===== MEMBER SELECTOR CHECK ===== */-->

<!--.member-selector-check {-->
<!--  width: 24px;-->
<!--  height: 24px;-->
<!--  min-width: 24px;-->
<!--  min-height: 24px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background-color: var(&#45;&#45;bg-primary);-->
<!--  border: 2px solid var(&#45;&#45;border-medium);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  font-weight: var(&#45;&#45;font-weight-bold);-->
<!--  transition: all var(&#45;&#45;transition-fast);-->
<!--}-->

<!--.member-selector-item.selected .member-selector-check {-->
<!--  background-color: var(&#45;&#45;color-primary);-->
<!--  border-color: var(&#45;&#45;color-primary);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--}-->

<!--/* ===== GROUP INFO BADGE ===== */-->

<!--.group-info-badge {-->
<!--  margin-top: var(&#45;&#45;space-md);-->
<!--  padding: var(&#45;&#45;space-sm) var(&#45;&#45;space-md);-->
<!--  background-color: rgba(0, 74, 173, 0.1);-->
<!--  border: 1px solid rgba(0, 74, 173, 0.2);-->
<!--  border-radius: var(&#45;&#45;border-radius);-->
<!--  text-align: center;-->
<!--}-->

<!--.group-info-text {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--  color: var(&#45;&#45;color-primary);-->
<!--}-->

<!--/* ===== MODAL FOOTER ===== */-->

<!--.modal-footer {-->
<!--  display: flex;-->
<!--  justify-content: flex-end;-->
<!--  gap: var(&#45;&#45;space-md);-->
<!--  padding: var(&#45;&#45;space-lg) var(&#45;&#45;space-xl);-->
<!--  border-top: 1px solid var(&#45;&#45;border-light);-->
<!--}-->

<!--/* ===== BUTTONS ===== */-->

<!--.btn {-->
<!--  height: var(&#45;&#45;btn-height);-->
<!--  min-height: 44px;-->
<!--  padding: 0 var(&#45;&#45;btn-padding-x);-->
<!--  font-family: var(&#45;&#45;font-primary);-->
<!--  font-size: var(&#45;&#45;font-size-btn);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--  border: none;-->
<!--  border-radius: var(&#45;&#45;border-radius);-->
<!--  cursor: pointer;-->
<!--  transition: all var(&#45;&#45;transition-fast);-->
<!--  display: inline-flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--}-->

<!--.btn:active {-->
<!--  transform: scale(0.98);-->
<!--}-->

<!--.btn:focus-visible {-->
<!--  outline: 2px solid var(&#45;&#45;color-primary);-->
<!--  outline-offset: 2px;-->
<!--}-->

<!--.btn-primary {-->
<!--  background-color: var(&#45;&#45;color-primary);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--}-->

<!--.btn-primary:hover {-->
<!--  background-color: #003a8c;-->
<!--  box-shadow: var(&#45;&#45;shadow);-->
<!--}-->

<!--.btn-secondary {-->
<!--  background-color: var(&#45;&#45;bg-secondary);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--  border: 1px solid var(&#45;&#45;border-medium);-->
<!--}-->

<!--.btn-secondary:hover {-->
<!--  background-color: var(&#45;&#45;bg-primary);-->
<!--  border-color: var(&#45;&#45;border-dark);-->
<!--}-->

<!--/* ===== RESPONSIVE MODAL ===== */-->

<!--@media (max-width: 768px) {-->
<!--  .modal {-->
<!--    max-width: 100%;-->
<!--    max-height: 100vh;-->
<!--    border-radius: 0;-->
<!--  }-->

<!--  .modal-header {-->
<!--    padding: var(&#45;&#45;space-md) var(&#45;&#45;space-lg);-->
<!--  }-->

<!--  .modal-header h2 {-->
<!--    font-size: var(&#45;&#45;font-size-h5);-->
<!--  }-->

<!--  .modal-body {-->
<!--    padding: var(&#45;&#45;space-lg);-->
<!--  }-->

<!--  .modal-footer {-->
<!--    padding: var(&#45;&#45;space-md) var(&#45;&#45;space-lg);-->
<!--    flex-direction: column-reverse;-->
<!--  }-->

<!--  .modal-footer .btn {-->
<!--    width: 100%;-->
<!--  }-->

<!--  .members-selector {-->
<!--    max-height: 300px;-->
<!--  }-->

<!--  .member-selector-avatar {-->
<!--    width: 40px;-->
<!--    height: 40px;-->
<!--    min-width: 40px;-->
<!--    min-height: 40px;-->
<!--    font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  }-->

<!--  .member-selector-details {-->
<!--    flex-direction: column;-->
<!--    align-items: flex-start;-->
<!--    gap: var(&#45;&#45;space-xs);-->
<!--  }-->
<!--}-->

<!--/* ===== ASSIGNMENT FORM STYLES ===== */-->

<!--.assignment-form-grid {-->
<!--  display: grid;-->
<!--  grid-template-columns: 1fr;-->
<!--  gap: var(&#45;&#45;space-md);-->
<!--  max-height: 400px;-->
<!--  overflow-y: auto;-->
<!--  padding: var(&#45;&#45;space-xs);-->
<!--  margin: 0 calc(-1 * var(&#45;&#45;space-xs));-->
<!--}-->

<!--.assignment-form-grid::-webkit-scrollbar {-->
<!--  width: 8px;-->
<!--}-->

<!--.assignment-form-grid::-webkit-scrollbar-track {-->
<!--  background: var(&#45;&#45;bg-secondary);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm);-->
<!--}-->

<!--.assignment-form-grid::-webkit-scrollbar-thumb {-->
<!--  background: var(&#45;&#45;border-dark);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm);-->
<!--}-->

<!--.assignment-form-card {-->
<!--  padding: var(&#45;&#45;space-lg);-->
<!--  background-color: var(&#45;&#45;bg-secondary);-->
<!--  border: 2px solid var(&#45;&#45;border-light);-->
<!--  border-radius: var(&#45;&#45;border-radius-lg);-->
<!--  cursor: pointer;-->
<!--  transition: all var(&#45;&#45;transition-fast);-->
<!--  position: relative;-->
<!--}-->

<!--.assignment-form-card:hover {-->
<!--  background-color: var(&#45;&#45;bg-primary);-->
<!--  border-color: var(&#45;&#45;border-medium);-->
<!--  transform: translateX(4px);-->
<!--}-->

<!--.assignment-form-card.selected {-->
<!--  background-color: rgba(0, 74, 173, 0.05);-->
<!--  border-color: var(&#45;&#45;color-primary);-->
<!--  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);-->
<!--}-->

<!--.assignment-rotation-header {-->
<!--  display: flex;-->
<!--  justify-content: space-between;-->
<!--  align-items: center;-->
<!--  margin-bottom: var(&#45;&#45;space-md);-->
<!--}-->

<!--.assignment-rotation-name {-->
<!--  font-size: var(&#45;&#45;font-size-h6);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--  margin: 0;-->
<!--}-->

<!--.assignment-check-icon {-->
<!--  width: 24px;-->
<!--  height: 24px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background-color: var(&#45;&#45;bg-primary);-->
<!--  border: 2px solid var(&#45;&#45;border-medium);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  font-weight: var(&#45;&#45;font-weight-bold);-->
<!--  transition: all var(&#45;&#45;transition-fast);-->
<!--}-->

<!--.assignment-form-card.selected .assignment-check-icon {-->
<!--  background-color: var(&#45;&#45;color-primary);-->
<!--  border-color: var(&#45;&#45;color-primary);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--}-->

<!--.assignment-rotation-details {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--  margin-bottom: var(&#45;&#45;space-sm);-->
<!--}-->

<!--.assignment-rotation-schedules {-->
<!--  display: flex;-->
<!--  flex-wrap: wrap;-->
<!--  gap: var(&#45;&#45;space-xs);-->
<!--  margin-top: var(&#45;&#45;space-md);-->
<!--}-->

<!--.assignment-schedule-tag {-->
<!--  padding: var(&#45;&#45;space-xs) var(&#45;&#45;space-sm);-->
<!--  background-color: rgba(0, 74, 173, 0.1);-->
<!--  color: var(&#45;&#45;color-primary);-->
<!--  font-size: var(&#45;&#45;font-size-caption);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm);-->
<!--}-->

<!--/* ===== MODAL MEMBERS VIEW ===== */-->

<!--.empty-state-small {-->
<!--  padding: var(&#45;&#45;space-2xl);-->
<!--  text-align: center;-->
<!--}-->

<!--.empty-state-small p {-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--}-->

<!--.members-list-modal {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--}-->

<!--.member-item-modal {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-md);-->
<!--  padding: var(&#45;&#45;space-md);-->
<!--  background-color: var(&#45;&#45;bg-secondary);-->
<!--  border: 1px solid var(&#45;&#45;border-light);-->
<!--  border-radius: var(&#45;&#45;border-radius);-->
<!--  transition: all var(&#45;&#45;transition-fast);-->
<!--}-->

<!--.member-item-modal:hover {-->
<!--  background-color: var(&#45;&#45;bg-primary);-->
<!--  border-color: var(&#45;&#45;border-medium);-->
<!--  transform: translateX(4px);-->
<!--}-->

<!--.member-avatar-modal {-->
<!--  width: 48px;-->
<!--  height: 48px;-->
<!--  min-width: 48px;-->
<!--  min-height: 48px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background-color: var(&#45;&#45;color-primary);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold);-->
<!--  border-radius: 50%;-->
<!--}-->

<!--.member-info-modal {-->
<!--  flex: 1;-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-xs);-->
<!--}-->

<!--.member-name-modal {-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--}-->

<!--.member-role-modal {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--}-->

<!--.member-status-modal {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--}-->

<!--/* ===== ROTATION SPECIFIC STYLES ===== */-->

<!--.rotation-period-badge {-->
<!--  display: inline-flex;-->
<!--  align-items: center;-->
<!--  padding: var(&#45;&#45;space-xs) var(&#45;&#45;space-sm);-->
<!--  background-color: rgba(0, 74, 173, 0.1);-->
<!--  color: var(&#45;&#45;color-primary);-->
<!--  font-size: var(&#45;&#45;font-size-caption);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm);-->
<!--  text-transform: uppercase;-->
<!--  letter-spacing: 0.5px;-->
<!--}-->

<!--.rotation-status {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  align-items: flex-end;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--}-->

<!--.rotation-count {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-xs);-->
<!--  padding: var(&#45;&#45;space-xs) var(&#45;&#45;space-sm);-->
<!--  background-color: var(&#45;&#45;bg-secondary);-->
<!--  border-radius: var(&#45;&#45;border-radius-sm);-->
<!--}-->

<!--.rotation-icon {-->
<!--  font-size: var(&#45;&#45;font-size-body-lg);-->
<!--}-->

<!--.rotation-number {-->
<!--  font-size: var(&#45;&#45;font-size-body);-->
<!--  font-weight: var(&#45;&#45;font-weight-bold);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--}-->

<!--.rotation-active-dot {-->
<!--  width: 12px;-->
<!--  height: 12px;-->
<!--  border-radius: 50%;-->
<!--  background-color: var(&#45;&#45;text-disabled);-->
<!--  transition: background-color var(&#45;&#45;transition-fast);-->
<!--}-->

<!--.rotation-active-dot.active {-->
<!--  background-color: var(&#45;&#45;color-success);-->
<!--  box-shadow: 0 0 8px rgba(40, 167, 69, 0.4);-->
<!--}-->

<!--/* ===== ROTATION POSITIONS ===== */-->

<!--.rotation-positions {-->
<!--  display: flex;-->
<!--  flex-wrap: wrap;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--  margin-bottom: var(&#45;&#45;space-md);-->
<!--  padding: var(&#45;&#45;space-md) 0;-->
<!--  border-bottom: 1px solid var(&#45;&#45;border-light);-->
<!--}-->

<!--.position-badge {-->
<!--  padding: var(&#45;&#45;space-xs) var(&#45;&#45;space-md);-->
<!--  background-color: var(&#45;&#45;bg-secondary);-->
<!--  border: 1px solid var(&#45;&#45;border-light);-->
<!--  border-radius: var(&#45;&#45;border-radius);-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--  transition: all var(&#45;&#45;transition-fast);-->
<!--}-->

<!--.position-badge:hover {-->
<!--  background-color: var(&#45;&#45;bg-primary);-->
<!--  border-color: var(&#45;&#45;color-primary);-->
<!--  color: var(&#45;&#45;color-primary);-->
<!--}-->

<!--/* ===== ROTATION PARTICIPANTS ===== */-->

<!--.rotation-participants-compact {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-md);-->
<!--  margin-bottom: var(&#45;&#45;space-lg);-->
<!--  padding: var(&#45;&#45;space-md);-->
<!--  background-color: var(&#45;&#45;bg-secondary);-->
<!--  border-radius: var(&#45;&#45;border-radius);-->
<!--}-->

<!--.participants-label {-->
<!--  font-size: var(&#45;&#45;font-size-body-sm);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium);-->
<!--  color: var(&#45;&#45;text-secondary);-->
<!--  white-space: nowrap;-->
<!--}-->

<!--.participants-avatars {-->
<!--  display: flex;-->
<!--  flex-wrap: wrap;-->
<!--  gap: var(&#45;&#45;space-xs);-->
<!--}-->

<!--.participant-avatar-small {-->
<!--  width: 32px;-->
<!--  height: 32px;-->
<!--  min-width: 32px;-->
<!--  min-height: 32px;-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  background-color: var(&#45;&#45;color-primary);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--  font-size: var(&#45;&#45;font-size-caption);-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold);-->
<!--  border-radius: 50%;-->
<!--  cursor: pointer;-->
<!--  transition: transform var(&#45;&#45;transition-fast);-->
<!--}-->

<!--.participant-avatar-small:hover {-->
<!--  transform: scale(1.1);-->
<!--  box-shadow: var(&#45;&#45;shadow);-->
<!--}-->

<!--/* ===== ROTATION ACTIONS BAR ===== */-->

<!--.rotation-actions-bar {-->
<!--  display: flex;-->
<!--  gap: var(&#45;&#45;space-sm);-->
<!--  padding-top: var(&#45;&#45;space-md);-->
<!--  border-top: 1px solid var(&#45;&#45;border-light);-->
<!--}-->

<!--.rotation-actions-bar .btn-action-compact {-->
<!--  flex: 1;-->
<!--}-->

<!--.btn-danger {-->
<!--  background-color: var(&#45;&#45;bg-primary);-->
<!--  border-color: var(&#45;&#45;border-medium);-->
<!--  color: var(&#45;&#45;text-primary);-->
<!--}-->

<!--.btn-danger:hover {-->
<!--  background-color: var(&#45;&#45;color-error);-->
<!--  border-color: var(&#45;&#45;color-error);-->
<!--  color: var(&#45;&#45;bg-primary);-->
<!--}-->

<!--/* ===== ACCESSIBILITY ===== */-->

<!--/* Assurer que tous les boutons ont une taille minimale de 44px */-->
<!--.btn-icon-action,-->
<!--.btn-action-compact,-->
<!--.btn,-->
<!--.btn-close {-->
<!--  min-width: 44px;-->
<!--  min-height: 44px;-->
<!--}-->

<!--/* Focus visible pour la navigation au clavier */-->
<!--.btn-icon-action:focus-visible,-->
<!--.btn-action-compact:focus-visible,-->
<!--.btn:focus-visible,-->
<!--.btn-close:focus-visible,-->
<!--.form-input:focus-visible {-->
<!--  outline: 2px solid var(&#45;&#45;color-primary);-->
<!--  outline-offset: 2px;-->
<!--}-->

<!--/* Réduire les animations pour les utilisateurs qui préfèrent moins de mouvement */-->
<!--@media (prefers-reduced-motion: reduce) {-->
<!--  * {-->
<!--    animation-duration: 0.01ms !important;-->
<!--    animation-iteration-count: 1 !important;-->
<!--    transition-duration: 0.01ms !important;-->
<!--  }-->
<!--}-->
<!--</style>-->