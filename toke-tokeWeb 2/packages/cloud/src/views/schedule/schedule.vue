<!-- Schedule.vue - VERSION MISE À JOUR -->
<template>
  <div class="schedule-container">
    <!-- Header Component -->
    <div class="top-header">
      <Header />
    </div>

    <div class="schedule-layout">
      <!-- Sidebar Navigation -->
      <aside class="vertical-sidebar">
        <nav class="vertical-nav">
          <button
            class="vertical-nav-item"
            :class="{ 'active': activeTab === 'schedules' }"
            @click="activeTab = 'schedules'"
          >
            <span class="vertical-nav-icon">📅</span>
            <div class="vertical-nav-content">
              <span class="vertical-nav-label">Emplois du temps</span>
              <span class="vertical-nav-badge">{{ schedules.length }}</span>
            </div>
          </button>
          <button
            class="vertical-nav-item"
            :class="{ 'active': activeTab === 'rotations' }"
            @click="activeTab = 'rotations'"
          >
            <span class="vertical-nav-icon">🔄</span>
            <div class="vertical-nav-content">
              <span class="vertical-nav-label">Rotations</span>
              <span class="vertical-nav-badge">{{ rotations.length }}</span>
            </div>
          </button>
          <button
            class="vertical-nav-item"
            :class="{ 'active': activeTab === 'assignments' }"
            @click="activeTab = 'assignments'"
          >
            <div class="vertical-nav-icon"><IconCalendarUser class="w-10" /></div>
            <div class="vertical-nav-content">
              <span class="vertical-nav-label">Assigner un emplois de temps</span>
              <span class="vertical-nav-badge">{{ rotations.length }}</span>
            </div>
          </button>
          <button
            class="vertical-nav-item"
            :class="{ 'active': activeTab === 'groups' }"
            @click="activeTab = 'groups'"
          >
            <span class="vertical-nav-icon">👥</span>
            <div class="vertical-nav-content">
              <span class="vertical-nav-label">Assigner une rotation</span>
              <span class="vertical-nav-badge">{{ groups.length }}</span>
            </div>
          </button>
        </nav>
      </aside>

      <!-- Main Content Area -->
      <main class="main-content-area">
        <!-- Page Actions -->
        <header class="content-header">
          <div class="header-actions">
            <button
              class="btn btn-primary"
              @click="openCreateModal"
              v-if="activeTab === 'schedules'"
            >
              <span class="btn-icon">+</span>
              Créer un emploi du temps
            </button>
            <button
              class="btn btn-primary"
              @click="openRotationModal"
              v-if="activeTab === 'rotations'"
            >
              <span class="btn-icon">+</span>
              Créer une rotation
            </button>
            <button
              class="btn btn-primary"
              @click="openAssignmentModal"
              v-if="activeTab === 'assignments'"
            >
              <span class="btn-icon">+</span>
              Assigner une rotation
            </button>
            <button
              class="btn btn-primary"
              @click="openGroupModal"
              v-if="activeTab === 'groups'"
            >
              <span class="btn-icon">+</span>
              Créer un groupe
            </button>

            <div class="search-container">
              <input
                type="text"
                class="search-input"
                placeholder="🔍 Rechercher..."
                v-model="searchQuery"
              />
            </div>
          </div>
        </header>

        <!-- Content -->
        <div class="content-wrapper">
          <!-- Content: Emplois du temps -->
          <ScheduleList
            v-if="activeTab === 'schedules'"
            :schedules="schedules"
            :employees="employees"
            @edit="editSchedule"
            @duplicate="duplicateSchedule"
            @deleteSchedule="deleteSchedule"
          />

          <!-- Content: Rotations -->
          <RotationList
            v-if="activeTab === 'rotations'"
            :rotations="rotations"
            @edit="editRotation as any"
            @view-calendar="viewRotationCalendar as any"
            @deleteRotation="deleteRotation"
          />

          <!-- Content: Assignations -->
          <AssignmentList
            v-if="activeTab === 'assignments'"
            :rotations="rotations as any"
            :schedules="schedules as any"
            :employees="employees"
            @save-assignment="handleSaveAssignment"
            @delete-assignment="handleDeleteAssignment"
          />

          <!-- Content: Groupes -->
          <GroupList
            v-if="activeTab === 'groups'"
            :groups="filteredGroups"
            :employees="employees"
            @create-group="openGroupModal"
            @edit-group="editGroup"
            @delete-group="deleteGroup"
          />
        </div>
      </main>
    </div>

    <!-- Modal Schedule Form -->
    <ScheduleForm
      v-if="showModal"
      :template="currentSchedule"
      :is-edit-mode="isEditMode"
      @save="saveSchedule"
      @close="closeModal"
    />

    <!-- Modal Rotation Form -->
    <RotationForm
      v-if="showRotationModal"
      :rotation="currentRotation"
      :is-edit-mode="isEditModeRotation"
      :templates="schedules as any"
      @save="saveRotation"
      @close="closeRotationModal"
    />

    <!-- Modal Calendar -->
    <ScheduleCalendar
      v-if="showCalendarModal"
      :rotation="selectedRotation as any"
      :schedules="schedules as any"
      :employees="employees"
      @close="closeCalendarModal"
    />

    <!-- Modal Assignment Form -->
    <AssignmentForm
      v-if="showAssignmentModal"
      :assignment="currentAssignment"
      :is-edit-mode="isEditModeAssignment"
      :rotations="rotations as any"
      :schedules="schedules as any"
      :employees="employees"
      @save="saveAssignment"
      @close="closeAssignmentModal"
    />

    <!-- Modal Group Form -->
    <GroupForm
      v-if="showGroupModal"
      :group="currentGroup"
      :is-edit-mode="isEditModeGroup"
      :employees="employees"
      @save="saveGroup"
      @close="closeGroupModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import ScheduleList from '../schedule/scheduleList.vue'
import ScheduleForm from '../schedule/scheduleForm.vue';
import RotationList from '../schedule/rotationList.vue';
import RotationForm from '../schedule/rotationForm.vue';
import AssignmentList from '../schedule/assignmentList.vue';
import AssignmentForm from '../schedule/assignmentForm.vue';
import GroupList from '../schedule/groupList.vue';
import GroupForm from '../schedule/groupForm.vue';
import ScheduleCalendar from '../schedule/scheduleCalendar.vue';
import Header from '@/views/components/header.vue';
import { useUserStore } from '@/stores/userStore';
import "../../assets/css/toke-schedule-21.css"
import "../../assets/css/toke-dMain-04.css"
import footerCss from "../../assets/css/toke-footer-24.css?url"
import HeadBuilder from '@/utils/HeadBuilder';
import scheduleService from '@/service/ScheduleService';
import { IconCalendarUser } from '@tabler/icons-vue';
import Rotationservice, { type RotationGroup, type RotationPayload } from '@/service/rotationservice';

// Types
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

interface SessionTemplate {
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
  isActive?: boolean;
  groupId?: number | null;
}

interface Group {
  id: number;
  name: string;
  memberIds: number[];
  createdAt: string;
}

const userStore = useUserStore()

// State
const activeTab = ref<'schedules' | 'rotations' | 'assignments' | 'groups'>('schedules');
const searchQuery = ref('');
const showModal = ref(false);
const isEditMode = ref(false);
const editingScheduleGuid = ref<string | null>(null);

const showRotationModal = ref(false);
const isEditModeRotation = ref(false);
const editingRotationGuid = ref<string | null>(null);

const showCalendarModal = ref(false);
const selectedRotation = ref<RotationGroup | null>(null);

const showAssignmentModal = ref(false);
const isEditModeAssignment = ref(false);
const editingAssignmentId = ref<number | null>(null);

const showGroupModal = ref(false);
const isEditModeGroup = ref(false);
const editingGroupId = ref<number | null>(null);

// Data
const schedules = ref<SessionTemplate[]>([]);
const rotations = ref<RotationGroup[]>([]);
const employees = ref<Employee[]>([
  { id: 1, name: 'Jean Dupont', role: 'Développeur', assignedScheduleGuid: null, isActive: true, groupId: 1 },
  { id: 2, name: 'Marie Martin', role: 'Designer', assignedScheduleGuid: null, isActive: true, groupId: 1 },
  { id: 3, name: 'Pierre Durand', role: 'Manager', assignedScheduleGuid: null, isActive: true, groupId: null },
  { id: 4, name: 'Sophie Bernard', role: 'Développeur', assignedScheduleGuid: null, isActive: true, groupId: 2 }
]);

const groups = ref<Group[]>([
  { id: 1, name: 'Équipe Développement', memberIds: [1, 2], createdAt: '2025-01-01' },
  { id: 2, name: 'Équipe Nuit', memberIds: [4], createdAt: '2025-01-15' }
]);

const currentSchedule = ref<SessionTemplate>(getEmptyTemplate());
const currentRotation = ref<RotationGroup | null>(null);
const currentAssignment = ref<any>(null);
const currentGroup = ref<Group>(getEmptyGroup());

// Computed

const filteredGroups = computed(() => {
  if (!searchQuery.value) return groups.value;
  return groups.value.filter(g =>
    g.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// Helper Functions
function getEmptyTemplate(): SessionTemplate {
  return {
    name: '',
    valid_from: '',
    valid_to: '',
    definition: {
      Mon: [],
      Tue: [],
      Wed: [],
      Thu: [],
      Fri: [],
      Sat: [],
      Sun: []
    }
  };
}

function getEmptyGroup(): Group {
  return {
    id: 0,
    name: '',
    memberIds: [],
    createdAt: ''
  };
}

// ==================== SCHEDULE CRUD ====================
function openCreateModal() {
  isEditMode.value = false;
  currentSchedule.value = getEmptyTemplate();
  showModal.value = true;
}

function editSchedule(schedule: SessionTemplate) {
  isEditMode.value = true;
  editingScheduleGuid.value = schedule.guid || null;
  currentSchedule.value = JSON.parse(JSON.stringify(schedule));
  showModal.value = true;
}

function duplicateSchedule(schedule: SessionTemplate) {
  const duplicated = JSON.parse(JSON.stringify(schedule));
  duplicated.name = `${schedule.name} (copie)`;
  delete duplicated.guid;

  const today = new Date();
  const nextMonth = new Date(today.setMonth(today.getMonth() + 1));
  duplicated.valid_from = nextMonth.toISOString().split('T')[0];

  const endDate = new Date(nextMonth);
  endDate.setFullYear(endDate.getFullYear() + 1);
  duplicated.valid_to = endDate.toISOString().split('T')[0];

  isEditMode.value = false;
  currentSchedule.value = duplicated;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  currentSchedule.value = getEmptyTemplate();
  editingScheduleGuid.value = null;
}

const saveSchedule = async (payload: SessionTemplate) => {
  if (isEditMode.value && editingScheduleGuid.value) {
    try {
      const edit = await scheduleService.updateSchedule(editingScheduleGuid.value, payload);
      if (edit.success) {
        const index = schedules.value.findIndex(s => s.guid === editingScheduleGuid.value);
        if (index !== -1) {
          schedules.value[index] = {
            ...payload,
            guid: editingScheduleGuid.value
          };
        }
        console.log('✅ Emploi du temps mis à jour');
      }
    } catch (error: any) {
      console.error('Erreur de sauvegarde:', error);
    }
  } else {
    try {
      const save = await scheduleService.createSchedule(payload)
      if (save.success) {
        const newSchedule: SessionTemplate = {
          ...payload,
          guid: save.data.guid
        };
        schedules.value.push(newSchedule);
        console.log('✅ Emploi du temps créé');
      }
    } catch (error: any) {
      console.error('Erreur de sauvegarde:', error);
    }
  }
  closeModal();
}

async function deleteSchedule(guid: string) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet emploi du temps ?')) {
    return;
  }

  schedules.value = schedules.value.filter(s => s.guid !== guid);

  // Retirer l'assignation des employés
  employees.value.forEach(emp => {
    if (emp.assignedScheduleGuid === guid) {
      emp.assignedScheduleGuid = null;
    }
  });

  console.log('🗑️ Emploi du temps supprimé');
}

// ==================== ROTATION CRUD ====================
function openRotationModal() {
  isEditModeRotation.value = false;
  currentRotation.value = null;
  showRotationModal.value = true;
}

function editRotation(rotation: RotationGroup) {
  isEditModeRotation.value = true;
  editingRotationGuid.value = rotation.guid;
  currentRotation.value = JSON.parse(JSON.stringify(rotation));
  showRotationModal.value = true;
}

function closeRotationModal() {
  showRotationModal.value = false;
  currentRotation.value = null;
  editingRotationGuid.value = null;
}

async function saveRotation(payload: RotationPayload) {
  if (isEditModeRotation.value && editingRotationGuid.value) {
    // Mode édition
    try {
      const response = await Rotationservice.updateRotation(editingRotationGuid.value, payload);

      if (response.success) {
        const index = rotations.value.findIndex(r => r.guid === editingRotationGuid.value);
        if (index !== -1) {
          rotations.value[index] = response.data.rotation_group;
        }
        console.log('✅ Rotation mise à jour');
      }
    } catch (error: any) {
      console.error('Erreur de mise à jour de la rotation:', error);
      alert('Erreur lors de la mise à jour de la rotation');
    }
  } else {
    // Mode création
    try {
      const response = await Rotationservice.createRotation(payload);

      if (response.success) {
        rotations.value.push(response.data.rotation_group);
        console.log('✅ Rotation créée:', response.data.rotation_group);
      }
    } catch (error: any) {
      console.error('Erreur de création de la rotation:', error);
      alert('Erreur lors de la création de la rotation');
    }
  }

  closeRotationModal();
}

async function deleteRotation(guid: string) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette rotation ?')) {
    return;
  }

  try {
    const response = await Rotationservice.deleteRotation(guid);

    if (response.success) {
      rotations.value = rotations.value.filter(r => r.guid !== guid);
      console.log('🗑️ Rotation supprimée');
    }
  } catch (error: any) {
    console.error('Erreur de suppression:', error);
    alert('Erreur lors de la suppression de la rotation');
  }
}

function viewRotationCalendar(rotation: RotationGroup) {
  selectedRotation.value = rotation;
  showCalendarModal.value = true;
}

function closeCalendarModal() {
  showCalendarModal.value = false;
  selectedRotation.value = null;
}

// ==================== ASSIGNMENT FUNCTIONS ====================
function openAssignmentModal() {
  isEditModeAssignment.value = false;
  currentAssignment.value = null;
  showAssignmentModal.value = true;
}

function closeAssignmentModal() {
  showAssignmentModal.value = false;
  currentAssignment.value = null;
  editingAssignmentId.value = null;
}

function saveAssignment(assignment: any) {
  closeAssignmentModal();
}

function handleSaveAssignment(data: any) {
  // TODO: Implémenter l'assignation d'employés aux rotations
  console.log('Assignation:', data);
}

function handleDeleteAssignment(data: any) {
  // TODO: Implémenter la suppression d'assignation
  console.log('Suppression assignation:', data);
}

// ==================== GROUP FUNCTIONS ====================
function openGroupModal() {
  isEditModeGroup.value = false;
  currentGroup.value = getEmptyGroup();
  showGroupModal.value = true;
}

function editGroup(group: Group) {
  isEditModeGroup.value = true;
  editingGroupId.value = group.id;
  currentGroup.value = JSON.parse(JSON.stringify(group));
  showGroupModal.value = true;
}

function closeGroupModal() {
  showGroupModal.value = false;
  currentGroup.value = getEmptyGroup();
  editingGroupId.value = null;
}

function saveGroup(group: Group) {
  if (isEditModeGroup.value && editingGroupId.value) {
    const index = groups.value.findIndex(g => g.id === editingGroupId.value);
    if (index !== -1) {
      groups.value[index] = { ...group, id: editingGroupId.value };
    }
  } else {
    const newGroup: Group = {
      ...group,
      id: Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    groups.value.push(newGroup);
  }
  closeGroupModal();
}

function deleteGroup(id: number) {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) {
    groups.value = groups.value.filter(g => g.id !== id);
    employees.value.forEach(emp => {
      if (emp.groupId === id) {
        emp.groupId = null;
      }
    });
  }
}

// ==================== LOADERS ====================
const loadSchedule = async () => {
  try {
    const scheduleData: any = await scheduleService.listSchedule();

    if (scheduleData.success) {
      const scheduleResponse: any = scheduleData.data.templates;
      schedules.value = scheduleResponse.items;
      console.log('📅 Emplois du temps chargés:', schedules.value.length);
    }
  } catch (error) {
    console.error('Erreur de chargement des emplois du temps:', error);
  }
}

const loadRotations = async () => {
  try {
    const rotationData = await Rotationservice.listRotations();

    if (rotationData.success) {
      rotations.value = rotationData.data.rotation_groups.items || [];
      console.log('🔄 Rotations chargées:', rotations.value.length);
    }
  } catch (error) {
    console.error('Erreur de chargement des rotations:', error);
  }
}

// Lifecycle
onMounted(async () => {
  HeadBuilder.apply({
    title: 'Emplois du temps - Toké',
    css: [footerCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });

  await loadSchedule();
  await loadRotations();
});
</script>

<style scoped>
/* Container principal */
.schedule-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
  display: flex;
  flex-direction: column;
}

/* Top Header - Sticky */
.top-header {
  position: sticky;
  top: 0;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  margin-bottom: var(--space-lg, 1.5rem);
}

/* Layout avec sidebar + content */
.schedule-layout {
  display: flex;
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  gap: var(--space-lg, 1.5rem);
  padding: 0 var(--space-lg, 1.5rem) var(--space-lg, 1.5rem);
}

/* Sidebar verticale */
.vertical-sidebar {
  width: 280px;
  min-width: 280px;
  background-color: white;
  border-radius: var(--border-radius-lg, 12px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: var(--space-lg, 1.5rem);
  overflow-y: auto;
  flex-shrink: 0;
  height: fit-content;
  max-height: calc(100vh - 120px);
}

.vertical-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 0.5rem);
}

.vertical-nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-md, 1rem);
  padding: var(--space-md, 1rem);
  background: transparent;
  border: none;
  border-radius: var(--border-radius, 8px);
  cursor: pointer;
  transition: all var(--transition-base, 0.2s ease);
  text-align: left;
  position: relative;
}

.vertical-nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 0;
  background: linear-gradient(180deg, var(--color-primary, #004aad) 0%, #0066cc 100%);
  border-radius: 0 4px 4px 0;
  transition: height var(--transition-base, 0.2s ease);
}

.vertical-nav-item:hover {
  background-color: var(--bg-secondary, #f9fafb);
}

.vertical-nav-item.active {
  background-color: rgba(0, 74, 173, 0.08);
  color: var(--color-primary, #004aad);
}

.vertical-nav-item.active::before {
  height: 100%;
}

.vertical-nav-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.vertical-nav-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.vertical-nav-label {
  font-size: var(--font-size-body, 14px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-primary, #1f2937);
}

.vertical-nav-item.active .vertical-nav-label {
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-primary, #004aad);
}

.vertical-nav-badge {
  display: inline-block;
  padding: 2px 8px;
  background-color: var(--bg-secondary, #e5e7eb);
  color: var(--text-secondary, #6b7280);
  border-radius: 12px;
  font-size: 11px;
  font-weight: var(--font-weight-semibold, 600);
  width: fit-content;
}

.vertical-nav-item.active .vertical-nav-badge {
  background-color: var(--color-primary, #004aad);
  color: white;
}

/* Main content area */
.main-content-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: var(--border-radius-lg, 12px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  height: fit-content;
  max-height: calc(100vh - 120px);
}

.content-header {
  background-color: white;
  padding: var(--space-lg, 1.5rem) var(--space-xl, 2rem);
  border-bottom: 1px solid var(--border-light, #e5e7eb);
  border-radius: var(--border-radius-lg, 12px) var(--border-radius-lg, 12px) 0 0;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: var(--space-md, 1rem);
  align-items: center;
}

.search-container {
  margin-left: auto;
  flex-shrink: 0;
}

.search-input {
  width: 300px;
  height: var(--btn-height, 40px);
  padding: 0 var(--space-lg, 1.5rem);
  border: 2px solid var(--border-light, #e0e0e0);
  border-radius: var(--border-radius, 8px);
  font-size: var(--font-size-body, 14px);
  background-color: var(--bg-secondary, #f9fafb);
  transition: all var(--transition-base, 0.2s ease);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary, #004aad);
  background-color: white;
  box-shadow: 0 0 0 4px rgba(0, 74, 173, 0.1);
}

.search-input::placeholder {
  color: var(--text-muted, #6b7280);
}

/* Content wrapper */
.content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-xl, 2rem);
  background-color: var(--bg-secondary, #f8f9fa);
  border-radius: 0 0 var(--border-radius-lg, 12px) var(--border-radius-lg, 12px);
}

/* Responsive */
@media (max-width: 1024px) {
  .vertical-sidebar {
    width: 240px;
  }
}

@media (max-width: 768px) {
  .schedule-layout {
    flex-direction: column;
  }

  .vertical-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-light, #e5e7eb);
    padding: var(--space-md, 1rem);
  }

  .vertical-nav {
    flex-direction: row;
    overflow-x: auto;
    gap: var(--space-sm, 0.75rem);
  }

  .vertical-nav-item {
    flex-direction: column;
    min-width: 100px;
    text-align: center;
    padding: var(--space-sm, 0.75rem);
  }

  .vertical-nav-item::before {
    display: none;
  }

  .vertical-nav-content {
    align-items: center;
  }

  .search-input {
    width: 100%;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .search-container {
    order: -1;
    width: 100%;
    margin: 0 0 var(--space-md, 1rem) 0;
  }

  .content-wrapper {
    padding: var(--space-md, 1rem);
  }
}
</style>