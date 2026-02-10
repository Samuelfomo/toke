<template>
  <div>
    <!-- État vide -->
    <div v-if="assignments.length === 0" class="content">
      <div class="empty-state">
        <div class="empty-icon">🔄</div>
        <h3>Aucune assignation de rotation</h3>
        <p>
          Créez votre première assignation pour attribuer une rotation à un utilisateur ou un groupe
        </p>
      </div>
    </div>

    <!-- Liste des assignations -->
    <div v-else class="assignments-grid">
      <div
        v-for="assignment in assignments"
        :key="assignment.guid"
        class="assignment-card"
      >
        <!-- Header -->
        <div class="assignment-card-header">
          <div>
            <h3 class="assignment-title">
              <span v-if="assignment.user">
                👤 {{ assignment.user.first_name }} {{ assignment.user.last_name }}
              </span>
              <span v-else-if="assignment.group">
                🏢 {{ assignment.group.name }}
              </span>
            </h3>

            <div class="assignment-meta">
              <span class="assignment-rotation">{{ assignment.rotation_group.name }}</span>
              <span class="assignment-offset">
                Position {{ assignment.offset }} dans le cycle
              </span>
              <span class="assignment-cycle">
                Cycle: {{ assignment.rotation_group.cycle_length }}
                {{ getUnitLabel(assignment.rotation_group.cycle_unit) }}
              </span>
            </div>
          </div>

          <div class="assignment-status">
            <div class="rotation-badge">
              🔄 {{ assignment.rotation_group.cycle_templates.length }} templates
            </div>
          </div>
        </div>

        <!-- Détails utilisateur/groupe -->
        <div class="assignment-target-info">
          <div v-if="assignment.user" class="target-details">
            <div class="target-avatar">
              {{ getInitials(assignment.user.first_name, assignment.user.last_name) }}
            </div>
            <div class="target-info">
              <span class="target-name">{{ assignment.user.first_name }} {{ assignment.user.last_name }}</span>
              <span class="target-meta">{{ assignment.user.job_title }} - {{ assignment.user.department }}</span>
              <span class="target-contact">📧 {{ assignment.user.email }}</span>
            </div>
          </div>

          <div v-else-if="assignment.group" class="target-details">
            <div class="target-avatar group-avatar">🏢</div>
            <div class="target-info">
              <span class="target-name">{{ assignment.group.name }}</span>
              <span class="target-meta" v-if="assignment.group.manager">
                Manager: {{ assignment.group.manager.first_name }} {{ assignment.group.manager.last_name }}
              </span>
              <span class="target-meta">
                {{ assignment.group.members.count }} membre(s)
              </span>
            </div>
          </div>
        </div>

        <!-- Détails de la rotation -->
        <div class="rotation-details">
          <div class="rotation-header">
            <span class="rotation-icon">🔄</span>
            <span class="rotation-title">Détails de la rotation</span>
          </div>

          <div class="rotation-info-grid">
            <div class="info-item">
              <span class="info-label">Nom:</span>
              <span class="info-value">{{ assignment.rotation_group.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Début:</span>
              <span class="info-value">{{ formatDate(assignment.rotation_group.start_date) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Position initiale:</span>
              <span class="info-value offset-highlight">{{ assignment.offset }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Templates:</span>
              <span class="info-value">{{ assignment.rotation_group.cycle_templates.length }}</span>
            </div>
          </div>

          <!-- Template à la position offset -->
          <div class="current-template" v-if="getCurrentTemplate(assignment)">
            <div class="template-badge">
              📋 Template actuel (Position {{ assignment.offset }})
            </div>
            <div class="template-name">
              {{ getCurrentTemplate(assignment)?.name }}
            </div>
          </div>
        </div>

        <!-- Informations additionnelles -->
        <div class="assignment-info">
          <div class="info-item">
            <span class="info-label">Assigné par:</span>
            <span class="info-value">
              {{ assignment.assigned_by.first_name }} {{ assignment.assigned_by.last_name }}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Date d'assignation:</span>
            <span class="info-value">{{ formatDate(assignment.assigned_at) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">GUID:</span>
            <span class="info-value info-guid">{{ formatGuid(assignment.guid) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="assignment-actions-bar">
          <button
            class="btn-action-compact"
            @click="$emit('view-details', assignment)"
            title="Voir les détails"
          >
            👁️ Détails
          </button>

          <button
            class="btn-action-compact btn-action-edit"
            @click="$emit('edit', assignment)"
            title="Modifier cette assignation"
          >
            ✏️ Modifier
          </button>

          <button
            class="btn-action-compact btn-danger"
            @click="confirmDelete(assignment)"
            title="Supprimer cette assignation"
          >
            🗑️ Supprimer
          </button>
        </div>
      </div>
    </div>

    <!-- Modal confirmation suppression -->
    <div
      v-if="showDeleteConfirm"
      class="modal-overlay"
      @click="closeDeleteConfirm"
    >
      <div class="modal modal-delete" @click.stop>
        <div class="modal-header modal-header-danger">
          <h2>⚠️ Confirmer la suppression</h2>
          <button class="btn-close" @click="closeDeleteConfirm">×</button>
        </div>

        <div class="modal-body">
          <div class="delete-confirmation-content">
            <div class="delete-icon">🗑️</div>

            <p class="delete-message">
              Supprimer l'assignation de rotation
              <strong v-if="assignmentToDelete?.user">
                de {{ assignmentToDelete.user.first_name }} {{ assignmentToDelete.user.last_name }}
              </strong>
              <strong v-else-if="assignmentToDelete?.group">
                du groupe {{ assignmentToDelete.group.name }}
              </strong>
              ?
            </p>

            <div class="delete-details" v-if="assignmentToDelete">
              <p><strong>Détails de l'assignation :</strong></p>
              <ul class="delete-list">
                <li>Rotation: {{ assignmentToDelete.rotation_group.name }}</li>
                <li>Position initiale: {{ assignmentToDelete.offset }}</li>
                <li>Cycle: {{ assignmentToDelete.rotation_group.cycle_length }} {{ getUnitLabel(assignmentToDelete.rotation_group.cycle_unit) }}</li>
                <li>Templates: {{ assignmentToDelete.rotation_group.cycle_templates.length }}</li>
                <li>Assignée le: {{ formatDate(assignmentToDelete.assigned_at) }}</li>
              </ul>
            </div>

            <p class="confirm-warning">
              ⚠️ Cette action est irréversible
            </p>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeDeleteConfirm">
            Annuler
          </button>
          <button class="btn btn-danger-solid" @click="handleDelete">
            🗑️ Supprimer définitivement
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import "../../assets/css/toke-schedule-21.css";
import { ref } from "vue";
import { RotationAssignment } from '@/service/rotationAssignmentService';

/* =======================
   Interfaces
======================= */

interface Template {
  guid: string;
  name: string;
}

/* =======================
   Props & emits
======================= */

const props = defineProps<{
  assignments: RotationAssignment[];
}>();

const emit = defineEmits<{
  edit: [assignment: RotationAssignment];
  "view-details": [assignment: RotationAssignment];
  deleteAssignment: [guid: string];
}>();

/* =======================
   Suppression
======================= */

const assignmentToDelete = ref<RotationAssignment | null>(null);
const showDeleteConfirm = ref(false);

function confirmDelete(assignment: RotationAssignment) {
  assignmentToDelete.value = assignment;
  showDeleteConfirm.value = true;
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false;
  assignmentToDelete.value = null;
}

function handleDelete() {
  if (!assignmentToDelete.value) return;
  emit("deleteAssignment", assignmentToDelete.value.guid);
  closeDeleteConfirm();
}

/* =======================
   Helpers
======================= */

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatGuid(guid: string): string {
  return guid.length > 8 ? `${guid.substring(0, 8)}...` : guid;
}

function getUnitLabel(unit: 'day' | 'week' | 'month'): string {
  const labels: Record<string, string> = {
    day: 'jour(s)',
    week: 'semaine(s)',
    month: 'mois'
  };
  return labels[unit] || unit;
}

function getCurrentTemplate(assignment: RotationAssignment): Template | undefined {
  return assignment.rotation_group.cycle_templates[assignment.offset];
}
</script>

<style scoped>
/* Content & Empty State */
.content {
  padding: var(--space-xl, 2rem) 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-4xl, 4rem) var(--space-md, 1rem);
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: var(--space-lg, 1.5rem);
  opacity: 0.5;
}

.empty-state h3 {
  font-size: var(--font-size-h4, 1.5rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #1f2937);
  margin-bottom: var(--space-sm, 0.5rem);
}

.empty-state p {
  font-size: var(--font-size-body, 1rem);
  color: var(--text-secondary, #6b7280);
  max-width: 400px;
}

/* Assignments Grid */
.assignments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: var(--space-lg, 1.5rem);
  padding: var(--space-xs, 0.25rem);
}

.assignment-card {
  background-color: var(--bg-card, #ffffff);
  border: 1px solid var(--border-light, #e5e7eb);
  border-radius: var(--border-radius-lg, 12px);
  padding: var(--space-lg, 1.5rem);
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
  transition: all var(--transition-base, 0.2s ease);
  display: flex;
  flex-direction: column;
  gap: var(--space-md, 1rem);
}

.assignment-card:hover {
  box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
  transform: translateY(-2px);
}

/* Card Header */
.assignment-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-md, 1rem);
  padding-bottom: var(--space-md, 1rem);
  border-bottom: 1px solid var(--border-light, #e5e7eb);
}

.assignment-title {
  font-size: var(--font-size-h5, 1.25rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #1f2937);
  margin: 0 0 var(--space-xs, 0.25rem) 0;
}

.assignment-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 0.25rem);
}

.assignment-rotation {
  font-size: var(--font-size-body, 1rem);
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-primary, #004aad);
}

.assignment-offset,
.assignment-cycle {
  font-size: var(--font-size-body-sm, 0.875rem);
  color: var(--text-secondary, #6b7280);
}

.assignment-status {
  flex-shrink: 0;
}

.rotation-badge {
  display: inline-flex;
  padding: 6px 12px;
  background-color: rgba(0, 74, 173, 0.1);
  color: var(--color-primary, #004aad);
  font-size: var(--font-size-caption, 0.75rem);
  font-weight: var(--font-weight-semibold, 600);
  border-radius: var(--border-radius, 8px);
  white-space: nowrap;
}

/* Target Info */
.assignment-target-info {
  padding: var(--space-md, 1rem);
  background-color: var(--bg-secondary, #f9fafb);
  border-radius: var(--border-radius, 8px);
}

.target-details {
  display: flex;
  align-items: center;
  gap: var(--space-md, 1rem);
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

.target-contact {
  font-size: var(--font-size-caption, 0.75rem);
  color: var(--text-muted, #9ca3af);
}

/* Rotation Details */
.rotation-details {
  padding: var(--space-md, 1rem);
  background-color: rgba(0, 74, 173, 0.03);
  border: 1px solid rgba(0, 74, 173, 0.1);
  border-radius: var(--border-radius, 8px);
}

.rotation-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm, 0.5rem);
  margin-bottom: var(--space-md, 1rem);
}

.rotation-icon {
  font-size: 20px;
}

.rotation-title {
  font-size: var(--font-size-body, 1rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #1f2937);
}

.rotation-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm, 0.5rem);
  margin-bottom: var(--space-md, 1rem);
}

.current-template {
  margin-top: var(--space-md, 1rem);
  padding-top: var(--space-md, 1rem);
  border-top: 1px solid rgba(0, 74, 173, 0.1);
}

.template-badge {
  display: inline-flex;
  padding: 4px 8px;
  background-color: var(--color-primary, #004aad);
  color: white;
  font-size: var(--font-size-caption, 0.75rem);
  font-weight: var(--font-weight-semibold, 600);
  border-radius: var(--border-radius-sm, 4px);
  margin-bottom: var(--space-xs, 0.25rem);
}

.template-name {
  font-size: var(--font-size-body, 1rem);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-primary, #1f2937);
}

/* Assignment Info */
.assignment-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 0.25rem);
  padding-top: var(--space-md, 1rem);
  border-top: 1px solid var(--border-light, #e5e7eb);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-body-sm, 0.875rem);
}

.info-label {
  color: var(--text-secondary, #6b7280);
  font-weight: var(--font-weight-medium, 500);
}

.info-value {
  color: var(--text-primary, #1f2937);
  font-weight: var(--font-weight-medium, 500);
}

.info-guid {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: var(--font-size-caption, 0.75rem);
  color: var(--text-muted, #9ca3af);
}

.offset-highlight {
  display: inline-flex;
  padding: 2px 8px;
  background-color: var(--color-primary, #004aad);
  color: white;
  border-radius: var(--border-radius-sm, 4px);
  font-weight: var(--font-weight-semibold, 600);
}

/* Actions */
.assignment-actions-bar {
  display: flex;
  gap: var(--space-sm, 0.5rem);
  padding-top: var(--space-md, 1rem);
  border-top: 1px solid var(--border-light, #e5e7eb);
}

.btn-action-compact {
  flex: 1;
  height: var(--btn-height-sm, 36px);
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm, 0.5rem);
  padding: 0 var(--btn-padding-x-sm, 0.75rem);
  background-color: var(--bg-primary, #ffffff);
  border: 1px solid var(--border-medium, #d1d5db);
  border-radius: var(--border-radius, 8px);
  font-size: var(--font-size-btn-sm, 0.875rem);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-primary, #1f2937);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
}

.btn-action-compact:hover {
  background-color: var(--color-primary, #004aad);
  border-color: var(--color-primary, #004aad);
  color: var(--bg-primary, #ffffff);
}

.btn-action-compact.btn-action-edit {
  background-color: var(--bg-secondary, #f9fafb);
}

.btn-action-compact.btn-action-edit:hover {
  background-color: var(--color-primary, #004aad);
  border-color: var(--color-primary, #004aad);
  color: var(--bg-primary, #ffffff);
}

.btn-action-compact.btn-danger:hover {
  background-color: var(--color-error, #dc3545);
  border-color: var(--color-error, #dc3545);
  color: var(--bg-primary, #ffffff);
}

.btn-action-compact:active {
  transform: scale(0.98);
}

.btn-action-compact:focus-visible {
  outline: 2px solid var(--color-primary, #004aad);
  outline-offset: 2px;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-md, 1rem);
  animation: fadeIn 0.2s ease-out;
}

.modal {
  background-color: var(--bg-card, #ffffff);
  border-radius: var(--border-radius-lg, 12px);
  box-shadow: var(--shadow-xl, 0 20px 25px rgba(0, 0, 0, 0.15));
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

.modal-delete {
  max-width: 520px;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg, 1.5rem) var(--space-xl, 2rem);
  border-bottom: 1px solid var(--border-light, #e5e7eb);
}

.modal-header-danger {
  background-color: rgba(220, 53, 69, 0.05);
  border-bottom-color: rgba(220, 53, 69, 0.2);
}

.modal-header h2 {
  font-size: var(--font-size-h4, 1.5rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #1f2937);
  margin: 0;
}

.modal-header-danger h2 {
  color: var(--color-error, #dc3545);
}

.btn-close {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: none;
  border-radius: var(--border-radius, 8px);
  font-size: 32px;
  line-height: 1;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  padding: 0;
}

.btn-close:hover {
  background-color: var(--bg-secondary, #f9fafb);
  color: var(--text-primary, #1f2937);
}

.modal-body {
  padding: var(--space-xl, 2rem);
  overflow-y: auto;
  flex: 1;
}

.delete-confirmation-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-lg, 1.5rem);
}

.delete-icon {
  font-size: 64px;
  line-height: 1;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.delete-message {
  font-size: var(--font-size-body-lg, 1.125rem);
  color: var(--text-primary, #1f2937);
  line-height: var(--line-height-body-lg, 1.75);
}

.delete-message strong {
  color: var(--color-error, #dc3545);
  font-weight: var(--font-weight-semibold, 600);
}

.delete-details {
  width: 100%;
  padding: var(--space-lg, 1.5rem);
  background-color: var(--bg-secondary, #f9fafb);
  border-radius: var(--border-radius, 8px);
  text-align: left;
}

.delete-details p {
  font-size: var(--font-size-body, 1rem);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-primary, #1f2937);
  margin-bottom: var(--space-md, 1rem);
}

.delete-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 0.5rem);
  padding: 0;
  margin: 0;
}

.delete-list li {
  font-size: var(--font-size-body-sm, 0.875rem);
  color: var(--text-secondary, #6b7280);
  padding-left: var(--space-md, 1rem);
  position: relative;
}

.delete-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 4px;
  background-color: var(--color-error, #dc3545);
  border-radius: 50%;
}

.confirm-warning {
  font-size: var(--font-size-body, 1rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-error, #dc3545);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md, 1rem);
  padding: var(--space-lg, 1.5rem) var(--space-xl, 2rem);
  border-top: 1px solid var(--border-light, #e5e7eb);
}

.btn {
  height: var(--btn-height, 40px);
  min-height: 44px;
  padding: 0 var(--btn-padding-x, 1.5rem);
  font-family: var(--font-primary, system-ui),serif;
  font-size: var(--font-size-btn, 1rem);
  font-weight: var(--font-weight-medium, 500);
  border: none;
  border-radius: var(--border-radius, 8px);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm, 0.5rem);
}

.btn:active {
  transform: scale(0.98);
}

.btn-secondary {
  background-color: var(--bg-secondary, #f9fafb);
  color: var(--text-primary, #1f2937);
  border: 1px solid var(--border-medium, #d1d5db);
}

.btn-secondary:hover {
  background-color: var(--bg-primary, #ffffff);
  border-color: var(--border-dark, #9ca3af);
}

.btn-danger-solid {
  background-color: var(--color-error, #dc3545);
  color: var(--bg-primary, #ffffff);
  border: none;
}

.btn-danger-solid:hover {
  background-color: #c82333;
  box-shadow: var(--shadow-lg, 0 4px 6px rgba(0, 0, 0, 0.1));
}

/* Responsive */
@media (max-width: 768px) {
  .assignments-grid {
    grid-template-columns: 1fr;
  }

  .assignment-card {
    padding: var(--space-md, 1rem);
  }

  .modal {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-footer {
    flex-direction: column-reverse;
  }

  .modal-footer .btn {
    width: 100%;
  }
}
</style>