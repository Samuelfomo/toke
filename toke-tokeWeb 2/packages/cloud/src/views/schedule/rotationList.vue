<template>
  <div>
    <!-- État vide -->
    <div v-if="rotations.length === 0" class="content">
      <div class="empty-state">
        <div class="empty-icon">🔄</div>
        <h3>Aucune rotation</h3>
        <p>
          Créez votre premier planning de rotation pour alterner automatiquement les horaires
        </p>
      </div>
    </div>

    <!-- Liste des rotations -->
    <div v-else class="rotations-grid">
      <div
        v-for="rotation in rotations"
        :key="rotation.guid"
        class="rotation-card"
      >
        <!-- Header -->
        <div class="rotation-card-header">
          <div>
            <h3 class="rotation-name">{{ rotation.name }}</h3>

            <div class="rotation-meta">
              <span class="rotation-period-badge">
                Cycle : {{ rotation.cycle_length }}
                {{ getUnitLabel(rotation.cycle_unit) }}
              </span>

              <span class="rotation-date">
                Débute le {{ formatDate(rotation.start_date) }}
              </span>
            </div>
          </div>

          <div class="rotation-status">
            <div class="rotation-count">
              <span class="rotation-icon">📅</span>
              <span class="rotation-number">
                {{ rotation.cycle_templates.length }}
              </span>
            </div>

            <div
              class="rotation-active-dot"
              :class="{ active: rotation.active }"
              :title="rotation.active ? 'Active' : 'Inactive'"
            />
          </div>
        </div>

        <!-- Templates utilisés -->
        <div class="rotation-positions">
          <div
            v-for="(template, index) in rotation.cycle_templates"
            :key="template.guid"
            class="position-badge"
          >
            <span class="position-number">{{ index + 1 }}</span>
            {{ template.name }}
          </div>
        </div>

<!--        &lt;!&ndash; Informations supplémentaires &ndash;&gt;-->
<!--        <div class="rotation-info-summary">-->
<!--          <div class="rotation-info-item">-->
<!--            <span class="rotation-info-label">Tenant:</span>-->
<!--            <span class="rotation-info-value">{{ rotation.tenant }}</span>-->
<!--          </div>-->
<!--          <div class="rotation-info-item">-->
<!--            <span class="rotation-info-label">GUID:</span>-->
<!--            <span class="rotation-info-value rotation-guid">{{ formatGuid(rotation.guid) }}</span>-->
<!--          </div>-->
<!--        </div>-->

        <!-- Actions -->
        <div class="rotation-actions-bar">
          <button
            class="btn-action-compact"
            @click="$emit('view-calendar', rotation)"
            title="Voir le calendrier de cette rotation"
          >
            📅 Calendrier
          </button>

          <button
            class="btn-action-compact btn-action-edit"
            @click="$emit('edit', rotation)"
            title="Modifier cette rotation"
          >
            ✏️ Modifier
          </button>

          <button
            class="btn-action-compact btn-danger"
            @click="confirmDelete(rotation)"
            title="Supprimer cette rotation"
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
              Êtes-vous sûr de vouloir supprimer la rotation
              <strong>{{ rotationToDelete?.name }}</strong> ?
            </p>

            <div class="delete-details" v-if="rotationToDelete">
              <p><strong>Détails de la rotation :</strong></p>
              <ul class="delete-list">
                <li>Cycle: {{ rotationToDelete.cycle_length }} {{ getUnitLabel(rotationToDelete.cycle_unit) }}</li>
                <li>Date de début: {{ formatDate(rotationToDelete.start_date) }}</li>
                <li>Nombre de templates: {{ rotationToDelete.cycle_templates.length }}</li>
                <li>Statut: {{ rotationToDelete.active ? 'Active' : 'Inactive' }}</li>
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

/* =======================
   Interfaces métier
======================= */

interface ScheduleTemplate {
  guid: string;
  tenant: string;
  name: string;
  valid_from: string;
  valid_to: string | null;
  definition: any;
  is_default: boolean;
}

interface RotationGroup {
  guid: string;
  tenant: string;
  name: string;
  cycle_length: number;
  cycle_unit: "day" | "week" | "month";
  start_date: string;
  active: boolean;
  cycle_templates: ScheduleTemplate[];
}

/* =======================
   Props & emits
======================= */

const props = defineProps<{
  rotations: RotationGroup[];
}>();

const emit = defineEmits<{
  edit: [rotation: RotationGroup];
  "view-calendar": [rotation: RotationGroup];
  deleteRotation: [guid: string];
}>();

/* =======================
   Suppression
======================= */

const rotationToDelete = ref<RotationGroup | null>(null);
const showDeleteConfirm = ref(false);

function confirmDelete(rotation: RotationGroup) {
  rotationToDelete.value = rotation;
  showDeleteConfirm.value = true;
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false;
  rotationToDelete.value = null;
}

function handleDelete() {
  if (!rotationToDelete.value) return;
  emit("deleteRotation", rotationToDelete.value.guid);
  closeDeleteConfirm();
}

/* =======================
   Helpers
======================= */

function getUnitLabel(unit: "day" | "week" | "month"): string {
  return {
    day: "jour(s)",
    week: "semaine(s)",
    month: "mois",
  }[unit];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// function formatGuid(guid: string): string {
//   // Afficher seulement les 8 premiers caractères pour la lisibilité
//   return guid.length > 8 ? `${guid.substring(0, 8)}...` : guid;
// }
</script>

<style scoped>
/* ===== CONTENT & EMPTY STATE ===== */

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

/* ===== ROTATIONS GRID ===== */

.rotations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-lg, 1.5rem);
  padding: var(--space-lg, 1.5rem) 0;
}

@media (max-width: 768px) {
  .rotations-grid {
    grid-template-columns: 1fr;
    gap: var(--space-md, 1rem);
  }
}

/* ===== ROTATION CARD ===== */

.rotation-card {
  background-color: var(--bg-card, #ffffff);
  border: 1px solid var(--border-light, #e5e7eb);
  border-radius: var(--border-radius-lg, 12px);
  padding: var(--space-lg, 1.5rem);
  box-shadow: var(--shadow, 0 1px 3px rgba(0, 0, 0, 0.1));
  transition: box-shadow var(--transition-base, 0.2s ease), transform var(--transition-base, 0.2s ease);
  animation: fadeIn 0.3s ease-out;
}

.rotation-card:hover {
  box-shadow: var(--shadow-lg, 0 4px 6px rgba(0, 0, 0, 0.1));
  transform: translateY(-2px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== ROTATION CARD HEADER ===== */

.rotation-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-lg, 1.5rem);
  padding-bottom: var(--space-md, 1rem);
  border-bottom: 1px solid var(--border-light, #e5e7eb);
}

.rotation-name {
  font-size: var(--font-size-h5, 1.25rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--text-primary, #1f2937);
  margin-bottom: var(--space-xs, 0.25rem);
}

.rotation-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 0.25rem);
}

.rotation-period-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-xs, 0.25rem) var(--space-sm, 0.5rem);
  background-color: rgba(0, 74, 173, 0.1);
  color: var(--color-primary, #004aad);
  font-size: var(--font-size-caption, 0.75rem);
  font-weight: var(--font-weight-semibold, 600);
  border-radius: var(--border-radius-sm, 4px);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: fit-content;
}

.rotation-date {
  font-size: var(--font-size-body-sm, 0.875rem);
  color: var(--text-secondary, #6b7280);
  display: flex;
  align-items: center;
  gap: var(--space-xs, 0.25rem);
}

/* ===== ROTATION STATUS ===== */

.rotation-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-sm, 0.5rem);
}

.rotation-count {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 0.25rem);
  padding: var(--space-xs, 0.25rem) var(--space-sm, 0.5rem);
  background-color: var(--bg-secondary, #f9fafb);
  border-radius: var(--border-radius-sm, 4px);
}

.rotation-icon {
  font-size: var(--font-size-body-lg, 1.125rem);
}

.rotation-number {
  font-size: var(--font-size-body, 1rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--text-primary, #1f2937);
}

.rotation-active-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--text-disabled, #d1d5db);
  transition: background-color var(--transition-fast, 0.15s ease);
}

.rotation-active-dot.active {
  background-color: var(--color-success, #10b981);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

/* ===== ROTATION POSITIONS (TEMPLATES) ===== */

.rotation-positions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm, 0.5rem);
  margin-bottom: var(--space-md, 1rem);
  padding: var(--space-md, 1rem) 0;
  border-bottom: 1px solid var(--border-light, #e5e7eb);
}

.position-badge {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 0.25rem);
  padding: var(--space-xs, 0.25rem) var(--space-md, 1rem);
  background-color: var(--bg-secondary, #f9fafb);
  border: 1px solid var(--border-light, #e5e7eb);
  border-radius: var(--border-radius, 8px);
  font-size: var(--font-size-body-sm, 0.875rem);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-primary, #1f2937);
  transition: all var(--transition-fast, 0.15s ease);
}

.position-badge:hover {
  background-color: var(--bg-primary, #ffffff);
  border-color: var(--color-primary, #004aad);
  color: var(--color-primary, #004aad);
}

.position-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: var(--color-primary, #004aad);
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: var(--font-weight-bold, 700);
}

/* ===== ROTATION INFO SUMMARY ===== */

.rotation-info-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 0.25rem);
  padding: var(--space-sm, 0.5rem) 0;
  margin-bottom: var(--space-md, 1rem);
}

.rotation-info-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm, 0.5rem);
  font-size: var(--font-size-body-sm, 0.875rem);
}

.rotation-info-label {
  color: var(--text-secondary, #6b7280);
  font-weight: var(--font-weight-medium, 500);
}

.rotation-info-value {
  color: var(--text-primary, #1f2937);
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.8125rem;
}

.rotation-guid {
  color: var(--text-muted, #9ca3af);
  font-size: 0.75rem;
}

/* ===== ROTATION ACTIONS BAR ===== */

.rotation-actions-bar {
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

/* ===== MODAL OVERLAY ===== */

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

/* ===== MODAL ===== */

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

/* ===== MODAL HEADER ===== */

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

.btn-close:focus-visible {
  outline: 2px solid var(--color-primary, #004aad);
  outline-offset: 2px;
}

/* ===== MODAL BODY ===== */

.modal-body {
  padding: var(--space-xl, 2rem);
  overflow-y: auto;
  flex: 1;
}

/* ===== DELETE CONFIRMATION ===== */

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

/* ===== MODAL FOOTER ===== */

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md, 1rem);
  padding: var(--space-lg, 1.5rem) var(--space-xl, 2rem);
  border-top: 1px solid var(--border-light, #e5e7eb);
}

/* ===== BUTTONS ===== */

.btn {
  height: var(--btn-height, 40px);
  min-height: 44px;
  padding: 0 var(--btn-padding-x, 1.5rem);
  /* ===== font-family: var(--font-primary, system-ui); ===== */

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

.btn:focus-visible {
  outline: 2px solid var(--color-primary, #004aad);
  outline-offset: 2px;
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

.btn-danger-solid:active {
  transform: scale(0.98);
}

/* ===== RESPONSIVE ===== */

@media (max-width: 768px) {
  .rotation-card {
    padding: var(--space-md, 1rem);
  }

  .rotation-card-header {
    flex-direction: column;
    gap: var(--space-md, 1rem);
  }

  .rotation-status {
    align-items: flex-start;
    flex-direction: row;
    gap: var(--space-md, 1rem);
  }

  .modal {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-header {
    padding: var(--space-md, 1rem) var(--space-lg, 1.5rem);
  }

  .modal-header h2 {
    font-size: var(--font-size-h5, 1.25rem);
  }

  .modal-body {
    padding: var(--space-lg, 1.5rem);
  }

  .modal-footer {
    padding: var(--space-md, 1rem) var(--space-lg, 1.5rem);
    flex-direction: column-reverse;
  }

  .modal-footer .btn {
    width: 100%;
  }
}

/* ===== ACCESSIBILITY ===== */

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>

<!--<template>-->
<!--  <div>-->
<!--    &lt;!&ndash; État vide &ndash;&gt;-->
<!--    <div v-if="rotations.length === 0" class="content">-->
<!--      <div class="empty-state">-->
<!--        <div class="empty-icon">🔄</div>-->
<!--        <h3>Aucune rotation</h3>-->
<!--        <p>-->
<!--          Créez votre premier planning de rotation pour alterner automatiquement les horaires-->
<!--        </p>-->
<!--      </div>-->
<!--    </div>-->

<!--    &lt;!&ndash; Liste des rotations &ndash;&gt;-->
<!--    <div v-else class="rotations-grid">-->
<!--      <div-->
<!--        v-for="rotation in rotations"-->
<!--        :key="rotation.guid"-->
<!--        class="rotation-card"-->
<!--      >-->
<!--        &lt;!&ndash; Header &ndash;&gt;-->
<!--        <div class="rotation-card-header">-->
<!--          <div>-->
<!--            <h3 class="rotation-name">{{ rotation.name }}</h3>-->

<!--            <div class="rotation-meta">-->
<!--              <span class="rotation-period-badge">-->
<!--                Cycle : {{ rotation.cycle_length }}-->
<!--                {{ getUnitLabel(rotation.cycle_unit) }}-->
<!--              </span>-->

<!--              <span class="rotation-date">-->
<!--                Débute le {{ formatDate(rotation.start_date) }}-->
<!--              </span>-->
<!--            </div>-->
<!--          </div>-->

<!--          <div class="rotation-status">-->
<!--            <div class="rotation-count">-->
<!--              <span class="rotation-icon">📅</span>-->
<!--              <span class="rotation-number">-->
<!--                {{ rotation.cycle_templates.length }}-->
<!--              </span>-->
<!--            </div>-->

<!--            <div-->
<!--              class="rotation-active-dot"-->
<!--              :class="{ active: rotation.active }"-->
<!--              :title="rotation.active ? 'Active' : 'Inactive'"-->
<!--            />-->
<!--          </div>-->
<!--        </div>-->

<!--        &lt;!&ndash; Templates utilisés &ndash;&gt;-->
<!--        <div class="rotation-positions">-->
<!--          <div-->
<!--            v-for="tpl in rotation.cycle_templates"-->
<!--            :key="tpl.guid"-->
<!--            class="position-badge"-->
<!--          >-->
<!--            {{ tpl.name }}-->
<!--          </div>-->
<!--        </div>-->

<!--        &lt;!&ndash; Actions &ndash;&gt;-->
<!--        <div class="rotation-actions-bar">-->
<!--          <button-->
<!--            class="btn-action-compact"-->
<!--            @click="$emit('view-calendar', rotation)"-->
<!--          >-->
<!--            📅 Calendrier-->
<!--          </button>-->

<!--          <button-->
<!--            class="btn-action-compact"-->
<!--            @click="$emit('edit', rotation)"-->
<!--          >-->
<!--            ✏️ Modifier-->
<!--          </button>-->

<!--          <button-->
<!--            class="btn-action-compact btn-danger"-->
<!--            @click="confirmDelete(rotation)"-->
<!--            title="Supprimer la rotation"-->
<!--          >-->
<!--            🗑️ Supprimer-->
<!--          </button>-->
<!--        </div>-->
<!--      </div>-->
<!--    </div>-->

<!--    &lt;!&ndash; Modal confirmation suppression &ndash;&gt;-->
<!--    <div-->
<!--      v-if="showDeleteConfirm"-->
<!--      class="modal-overlay"-->
<!--      @click="closeDeleteConfirm"-->
<!--    >-->
<!--      <div class="modal modal-small" @click.stop>-->
<!--        <div class="modal-header">-->
<!--          <h2>⚠️ Confirmer la suppression</h2>-->
<!--          <button class="btn-close" @click="closeDeleteConfirm">×</button>-->
<!--        </div>-->

<!--        <div class="modal-body">-->
<!--          <p class="confirm-message">-->
<!--            Supprimer la rotation-->
<!--            <strong>{{ rotationToDelete?.name }}</strong> ?-->
<!--          </p>-->
<!--          <p class="confirm-warning">-->
<!--            ⚠️ Cette action est irréversible-->
<!--          </p>-->
<!--        </div>-->

<!--        <div class="modal-footer">-->
<!--          <button class="btn btn-secondary" @click="closeDeleteConfirm">-->
<!--            Annuler-->
<!--          </button>-->
<!--          <button class="btn btn-danger" @click="handleDelete">-->
<!--            🗑️ Supprimer-->
<!--          </button>-->
<!--        </div>-->
<!--      </div>-->
<!--    </div>-->
<!--  </div>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import "../../assets/css/toke-schedule-21.css";-->
<!--import { ref } from "vue";-->

<!--/* =======================-->
<!--   Interfaces métier-->
<!--======================= */-->

<!--interface ScheduleTemplate {-->
<!--  guid: string;-->
<!--  name: string;-->
<!--}-->

<!--interface RotationGroup {-->
<!--  guid: string;-->
<!--  name: string;-->
<!--  cycle_length: number;-->
<!--  cycle_unit: "day" | "week" | "month";-->
<!--  start_date: string;-->
<!--  active: boolean;-->
<!--  cycle_templates: ScheduleTemplate[];-->
<!--}-->

<!--/* =======================-->
<!--   Props & emits-->
<!--======================= */-->

<!--const props = defineProps<{-->
<!--  rotations: RotationGroup[];-->
<!--}>();-->

<!--const emit = defineEmits<{-->
<!--  edit: [rotation: RotationGroup];-->
<!--  "view-calendar": [rotation: RotationGroup];-->
<!--  deleteRotation: [guid: string];-->
<!--}>();-->

<!--/* =======================-->
<!--   Suppression-->
<!--======================= */-->

<!--const rotationToDelete = ref<RotationGroup | null>(null);-->
<!--const showDeleteConfirm = ref(false);-->

<!--function confirmDelete(rotation: RotationGroup) {-->
<!--  rotationToDelete.value = rotation;-->
<!--  showDeleteConfirm.value = true;-->
<!--}-->

<!--function closeDeleteConfirm() {-->
<!--  showDeleteConfirm.value = false;-->
<!--  rotationToDelete.value = null;-->
<!--}-->

<!--function handleDelete() {-->
<!--  if (!rotationToDelete.value) return;-->
<!--  emit("deleteRotation", rotationToDelete.value.guid);-->
<!--  closeDeleteConfirm();-->
<!--}-->

<!--/* =======================-->
<!--   Helpers-->
<!--======================= */-->

<!--function getUnitLabel(unit: "day" | "week" | "month"): string {-->
<!--  return {-->
<!--    day: "jour(s)",-->
<!--    week: "semaine(s)",-->
<!--    month: "mois",-->
<!--  }[unit];-->
<!--}-->

<!--function formatDate(dateString: string): string {-->
<!--  return new Date(dateString).toLocaleDateString("fr-FR", {-->
<!--    day: "numeric",-->
<!--    month: "short",-->
<!--    year: "numeric",-->
<!--  });-->
<!--}-->
<!--</script>-->