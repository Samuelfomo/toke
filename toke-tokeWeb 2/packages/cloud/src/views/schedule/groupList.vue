<template>
  <div>
    <!-- État vide -->
    <div v-if="groups.length === 0" class="content">
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>Aucun groupe</h3>
        <p>Créez votre premier groupe pour organiser vos employés</p>
        <button class="btn btn-primary" @click="showCreateModal" style="margin-top: var(--space-lg);">
          ➕ Créer un groupe
        </button>
      </div>
    </div>

    <!-- Grille des groupes -->
    <div v-else class="groups-grid">
      <div
        v-for="group in groups"
        :key="group.id"
        class="group-card"
      >
        <div class="group-card-header">
          <div>
            <h3 class="group-name">{{ group.name }}</h3>
            <div class="group-meta">
              <span class="group-created-date">
                📅 Créé le {{ formatDateFull(group.createdAt) }}
              </span>
            </div>
          </div>
          <div class="group-actions">
            <button class="btn-icon-action" @click="editGroup(group)" title="Modifier">
              ✏️
            </button>
            <button class="btn-icon-action btn-icon-danger" @click="confirmDelete(group)" title="Supprimer">
              🗑️
            </button>
          </div>
        </div>

        <!-- Affichage simplifié : nombre de membres uniquement -->
        <div class="group-members-summary">
          <div class="members-count-card">
            <div class="members-count-icon">👥</div>
            <div class="members-count-info">
              <span class="members-count-number">{{ group.memberIds.length }}</span>
              <span class="members-count-label">membre{{ group.memberIds.length > 1 ? 's' : '' }}</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="group-actions-bar">
          <button class="btn-action-compact" @click="viewMembers(group)">
            👁️ Voir les membres
          </button>
          <button class="btn-action-compact btn-action-edit" @click="editGroup(group)">
            ✏️ Modifier
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de visualisation des membres -->
    <div v-if="showMembersModal" class="modal-overlay" @click="closeMembersModal">
      <div class="modal modal-members" @click.stop>
        <div class="modal-header">
          <h2>Membres du groupe "{{ selectedGroup?.name }}"</h2>
          <button class="btn-close" @click="closeMembersModal">×</button>
        </div>

        <div class="modal-body">
          <div v-if="selectedGroup && selectedGroup.memberIds.length === 0" class="empty-state-small">
            <p>Aucun membre dans ce groupe</p>
          </div>

          <div v-else class="members-list-modal">
            <div
              v-for="memberId in selectedGroup?.memberIds"
              :key="memberId"
              class="member-item-modal"
            >
              <div class="member-avatar-modal">{{ getEmployeeInitials(memberId) }}</div>
              <div class="member-info-modal">
                <span class="member-name-modal">{{ getEmployeeName(memberId) }}</span>
                <span class="member-role-modal">{{ getEmployeeRole(memberId) }}</span>
              </div>
              <div class="member-status-modal">
                <div class="status-dot" :class="{ active: isEmployeeActive(memberId) }"></div>
                <span class="status-text" :class="{ active: isEmployeeActive(memberId) }">
                  {{ isEmployeeActive(memberId) ? 'Actif' : 'Inactif' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeMembersModal">
            Fermer
          </button>
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
            Êtes-vous sûr de vouloir supprimer le groupe
            <strong>"{{ groupToDelete?.name }}"</strong> ?
          </p>
          <p class="confirm-warning">
            Cette action est irréversible et affectera
            <strong>{{ groupToDelete?.memberIds.length }} membre(s)</strong>.
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
import "../../assets/css/toke-groupList-22.css"

interface Employee {
  id: number;
  name: string;
  role: string;
  isActive?: boolean;
}

interface Group {
  id: number;
  name: string;
  memberIds: number[];
  createdAt: string;
}

const props = defineProps<{
  groups: Group[];
  employees: Employee[];
}>();

const emit = defineEmits<{
  'create-group': [];
  'edit-group': [group: Group];
  'delete-group': [id: number];
}>();

// État pour la modal de visualisation des membres
const showMembersModal = ref(false);
const selectedGroup = ref<Group | null>(null);

// État pour la modal de suppression
const showDeleteConfirm = ref(false);
const groupToDelete = ref<Group | null>(null);

// Fonctions utilitaires
function getEmployeeName(employeeId: number): string {
  const employee = props.employees.find(e => e.id === employeeId);
  return employee ? employee.name : 'Inconnu';
}

function getEmployeeRole(employeeId: number): string {
  const employee = props.employees.find(e => e.id === employeeId);
  return employee ? employee.role : '';
}

function getEmployeeInitials(employeeId: number): string {
  const name = getEmployeeName(employeeId);
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

function isEmployeeActive(employeeId: number): boolean {
  const employee = props.employees.find(e => e.id === employeeId);
  return employee?.isActive ?? false;
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

// Actions
function showCreateModal() {
  emit('create-group');
}

function editGroup(group: Group) {
  emit('edit-group', group);
}

// Gestion de la suppression
function confirmDelete(group: Group) {
  groupToDelete.value = group;
  showDeleteConfirm.value = true;
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false;
  groupToDelete.value = null;
}

function handleDelete() {
  if (groupToDelete.value) {
    emit('delete-group', groupToDelete.value.id);
    closeDeleteConfirm();
  }
}

// Visualisation des membres
function viewMembers(group: Group) {
  selectedGroup.value = group;
  showMembersModal.value = true;
}

function closeMembersModal() {
  showMembersModal.value = false;
  selectedGroup.value = null;
}
</script>

