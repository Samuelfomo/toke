<!-- Schedule.vue - VERSION CORRIGÉE -->
<template>
  <div class="schedule-container">
    <!-- Header Component -->
    <div class="top-header">
      <Header />
    </div>

    <!-- Loader -->
    <div v-if="isLoading" class="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-black to-blue-600/20 bg-opacity-20 z-50">
      <svg aria-hidden="true" role="status" class="w-40 h-40 text-gray-200 animate-spin dark:text-gray-600"
           xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#006FFF"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 6l0 -3" />
        <path d="M16.25 7.75l2.15 -2.15" />
        <path d="M18 12l3 0" />
        <path d="M16.25 16.25l2.15 2.15" />
        <path d="M12 18l0 3" />
        <path d="M7.75 16.25l-2.15 2.15" />
        <path d="M6 12l-3 0" />
        <path d="M7.75 7.75l-2.15 -2.15" />
      </svg>
      <p class="mt-4 font-bold text-yellow-200 text-xl animate-pulse">Chargement...</p>
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
            :class="{ 'active': activeTab === 'schedule-assignments' }"
            @click="activeTab = 'schedule-assignments'"
          >
            <div class="vertical-nav-icon"><IconCalendarUser class="w-10" /></div>
            <div class="vertical-nav-content">
              <span class="vertical-nav-label">Assigner un emplois de temps</span>
              <span class="vertical-nav-badge">{{ scheduleAssignments.length }}</span>
            </div>
          </button>
          <button
            class="vertical-nav-item"
            :class="{ 'active': activeTab === 'rotation-assignments' }"
            @click="activeTab = 'rotation-assignments'"
          >
            <span class="vertical-nav-icon">👥</span>
            <div class="vertical-nav-content">
              <span class="vertical-nav-label">Assigner une rotation</span>
              <span class="vertical-nav-badge">{{ rotationAssignments.length }}</span>
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
              @click="openScheduleAssignModal"
              v-if="activeTab === 'schedule-assignments'"
            >
              <span class="btn-icon">+</span>
              Assigner un emplois de temps
            </button>
            <button
              class="btn btn-primary"
              @click="openRotationAssignModal"
              v-if="activeTab === 'rotation-assignments'"
            >
              <span class="btn-icon">+</span>
              Assigner une rotation
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

          <!-- Assignations emplois du temps -->
          <ScheduleAssignList
            v-if="activeTab === 'schedule-assignments'"
            :assignments="scheduleAssignments"
            @edit="editScheduleAssignment"
            @deleteAssignment="deleteScheduleAssignment"
          />

          <!-- Assignations rotations -->
          <RotationAssignList
            v-if="activeTab === 'rotation-assignments'"
            :assignments="rotationAssignments"
            @edit="editRotationAssignment"
            @deleteAssignment="deleteRotationAssignment"
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
      @save="saveRotation as any"
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

    <!-- Modal Assignment Form (Ancien) -->
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

    <!-- Modal assignation emploi du temps -->
    <ScheduleAssignForm
      v-if="showScheduleAssignModal"
      :assignment="currentScheduleAssignment"
      :users="users"
      :groups="groups"
      :templates="schedules"
      :current-user-guid="currentUserGuid"
      :is-edit-mode="isEditModeScheduleAssign"
      @save="saveScheduleAssignment"
      @close="closeScheduleAssignModal"
    />

    <!-- Modal assignation rotation -->
    <RotationAssignForm
      v-if="showRotationAssignModal"
      :assignment="currentRotationAssignment"
      :users="users"
      :groups="groups"
      :rotations="rotations"
      :current-user-guid="currentUserGuid"
      :is-edit-mode="isEditModeRotationAssign"
      @save="saveRotationAssignment"
      @close="closeRotationAssignModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import ScheduleList from '../schedule/scheduleList.vue'
import ScheduleForm from '../schedule/scheduleForm.vue';
import RotationList from '../schedule/rotationList.vue';
import RotationForm from '../schedule/rotationForm.vue';
import AssignmentForm from '../schedule/assignmentForm.vue';
import ScheduleCalendar from '../schedule/scheduleCalendar.vue';
import ScheduleAssignList from '@/views/schedule/scheduleAssignList.vue';
import RotationAssignList from '@/views/schedule/rotationAssignList.vue';
import RotationAssignForm from '@/views/schedule/rotationAssignForm.vue';
import ScheduleAssignForm from '@/views/schedule/scheduleAssignForm.vue';
import Header from '@/views/components/header.vue';
import { useUserStore } from '@/stores/userStore';
import "../../assets/css/toke-schedule-21.css"
import "../../assets/css/toke-dMain-04.css"
import footerCss from "../../assets/css/toke-footer-24.css?url"
import HeadBuilder from '@/utils/HeadBuilder';
import scheduleService from '@/service/ScheduleService';
import { IconCalendarUser } from '@tabler/icons-vue';
import Rotationservice, { type RotationGroup, type RotationPayload } from '@/service/rotationservice';

import ScheduleAssignmentService, { type ScheduleAssignment, type ScheduleAssignmentPayload } from '@/service/scheduleAssignmentService';
import RotationAssignmentService, { type RotationAssignment, type RotationAssignmentPayload } from '@/service/rotationAssignmentService';
import { useTeamStore } from '@/stores/teamStore';
import GroupService, { type Group } from '@/service/GroupService';


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

const userStore = useUserStore()
const teamStore = useTeamStore()
const currentUserGuid = computed(() => userStore.user?.guid || '');
const isLoading = ref(false);

// State
const activeTab = ref<'schedules' | 'rotations' | 'schedule-assignments' | 'rotation-assignments'>('schedules');
const searchQuery = ref('');
const showModal = ref(false);
const isEditMode = ref(false);
// const editingScheduleGuid = ref<string | null>(null);

const showRotationModal = ref(false);
const isEditModeRotation = ref(false);
// const editingRotationGuid = ref<string | null>(null);

const showCalendarModal = ref(false);
const selectedRotation = ref(null);

const showAssignmentModal = ref(false);
const isEditModeAssignment = ref(false);
const currentAssignment = ref(null);

// States pour les assignations d'emplois du temps
const showScheduleAssignModal = ref(false);
const isEditModeScheduleAssign = ref(false);
const currentScheduleAssignment = ref<ScheduleAssignment | null>(null);

// States pour les assignations de rotations
const showRotationAssignModal = ref(false);
const isEditModeRotationAssign = ref(false);
const currentRotationAssignment = ref<RotationAssignment | null>(null);

// Data
const schedules = ref<SessionTemplate[]>([]);
const rotations = ref<RotationGroup[]>([]);
const employees = ref<Employee[]>([]);
const currentSchedule = ref<SessionTemplate | null>(null);
const currentRotation = ref<RotationGroup | null>(null);

// Nouvelles données pour les assignations
const scheduleAssignments = ref<ScheduleAssignment[]>([]);
const rotationAssignments = ref<RotationAssignment[]>([]);
const users = computed(() => teamStore.employees || []);
const groups = ref<Group[]>([]);

// Schedule Management
const openCreateModal = () => {
  currentSchedule.value = null;
  isEditMode.value = false;
  showModal.value = true;
};

const editSchedule = (schedule: SessionTemplate) => {
  currentSchedule.value = { ...schedule };
  isEditMode.value = true;
  showModal.value = true;
};

const duplicateSchedule = (schedule: SessionTemplate) => {
  currentSchedule.value = {
    ...schedule,
    name: `${schedule.name} (copie)`,
    guid: undefined,
  };
  isEditMode.value = false;
  showModal.value = true;
};

const saveSchedule = async (scheduleData: SessionTemplate) => {
  try {
    if (isEditMode.value && currentSchedule.value?.guid) {
      const response = await scheduleService.updateSchedule(
        currentSchedule.value.guid,
        scheduleData
      );

      if (response.success) {
        const index = schedules.value.findIndex((s) => s.guid === currentSchedule.value!.guid);
        if (index !== -1) {
          schedules.value[index] = response.data.session_template;
        }
        console.log('✅ Emploi du temps mis à jour');
      }
    } else {
      const response = await scheduleService.createSchedule(scheduleData);

      if (response.success) {
        schedules.value.push(response.data.session_template);
        console.log('✅ Emploi du temps créé');
      }
    }

    closeModal();
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
  }
};

const deleteSchedule = async (guid: string) => {
  try {
    const response = await scheduleService.deleteSchedule(guid);

    if (response.success) {
      schedules.value = schedules.value.filter((s) => s.guid !== guid);
      console.log('✅ Emploi du temps supprimé');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
  }
};

const closeModal = () => {
  showModal.value = false;
  currentSchedule.value = null;
  isEditMode.value = false;
};

// Rotation Management
const openRotationModal = () => {
  currentRotation.value = null;
  isEditModeRotation.value = false;
  showRotationModal.value = true;
};

const editRotation = (rotation: RotationGroup) => {
  currentRotation.value = { ...rotation };
  isEditModeRotation.value = true;
  showRotationModal.value = true;
};

const saveRotation = async (rotationData: RotationPayload) => {
  try {
    if (isEditModeRotation.value && currentRotation.value?.guid) {
      const response = await Rotationservice.updateRotation(
        currentRotation.value.guid,
        rotationData
      );

      if (response.success) {
        const index = rotations.value.findIndex((r) => r.guid === currentRotation.value!.guid);
        if (index !== -1) {
          rotations.value[index] = response.data.rotation_group;
        }
        console.log('✅ Rotation mise à jour');
      }
    } else {
      const response = await Rotationservice.createRotation(rotationData);

      if (response.success) {
        rotations.value.push(response.data.rotation_group);
        console.log('✅ Rotation créée');
      }
    }

    closeRotationModal();
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de la rotation:', error);
  }
};

const deleteRotation = async (guid: string) => {
  try {
    const response = await Rotationservice.deleteRotation(guid);

    if (response.success) {
      rotations.value = rotations.value.filter((r) => r.guid !== guid);
      console.log('✅ Rotation supprimée');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de la rotation:', error);
  }
};

const closeRotationModal = () => {
  showRotationModal.value = false;
  currentRotation.value = null;
  isEditModeRotation.value = false;
};

// Calendar Modal
const viewRotationCalendar = (rotation: any) => {
  selectedRotation.value = rotation;
  showCalendarModal.value = true;
};

const closeCalendarModal = () => {
  showCalendarModal.value = false;
  selectedRotation.value = null;
};

// // Assignment Modal (Ancien)
// const openAssignmentModal = () => {
//   currentAssignment.value = null;
//   isEditModeAssignment.value = false;
//   showAssignmentModal.value = true;
// };

const saveAssignment = async (assignmentData: any) => {
  console.log('💾 Sauvegarde de l\'assignation:', assignmentData);
  closeAssignmentModal();
};

const closeAssignmentModal = () => {
  showAssignmentModal.value = false;
  currentAssignment.value = null;
  isEditModeAssignment.value = false;
};

// ============================================
// GESTION DES ASSIGNATIONS D'EMPLOIS DU TEMPS
// ============================================

const openScheduleAssignModal = () => {
  currentScheduleAssignment.value = null;
  isEditModeScheduleAssign.value = false;
  showScheduleAssignModal.value = true;
};

const editScheduleAssignment = (assignment: ScheduleAssignment) => {
  currentScheduleAssignment.value = { ...assignment };
  isEditModeScheduleAssign.value = true;
  showScheduleAssignModal.value = true;
};

const saveScheduleAssignment = async (payload: ScheduleAssignmentPayload) => {
  try {
    if (isEditModeScheduleAssign.value && currentScheduleAssignment.value?.guid) {
      // Mise à jour
      const response = await ScheduleAssignmentService.updateAssignment(
        currentScheduleAssignment.value.guid,
        payload
      );

      if (response.success) {
        const index = scheduleAssignments.value.findIndex(
          (a) => a.guid === currentScheduleAssignment.value!.guid
        );
        if (index !== -1) {
          scheduleAssignments.value[index] = response.data.schedule_assignment;
        }
        console.log('✅ Assignation emploi du temps mise à jour');
      }
    } else {
      // Création
      const response = await ScheduleAssignmentService.createAssignment(payload);

      if (response.success) {
        scheduleAssignments.value.push(response.data.schedule_assignments);
        console.log('✅ Assignation emploi du temps créée');
      }
    }

    closeScheduleAssignModal();
    await loadScheduleAssignments(); // Recharger la liste
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de l\'assignation emploi du temps:', error);
  }
};

const deleteScheduleAssignment = async (guid: string) => {
  try {
    const response = await ScheduleAssignmentService.deleteAssignment(guid);

    if (response.success) {
      scheduleAssignments.value = scheduleAssignments.value.filter((a) => a.guid !== guid);
      console.log('✅ Assignation emploi du temps supprimée');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de l\'assignation emploi du temps:', error);
  }
};

const closeScheduleAssignModal = () => {
  showScheduleAssignModal.value = false;
  currentScheduleAssignment.value = null;
  isEditModeScheduleAssign.value = false;
};

// ============================================
// GESTION DES ASSIGNATIONS DE ROTATIONS
// ============================================

const openRotationAssignModal = () => {
  currentRotationAssignment.value = null;
  isEditModeRotationAssign.value = false;
  showRotationAssignModal.value = true;
};

const editRotationAssignment = (assignment: RotationAssignment) => {
  currentRotationAssignment.value = { ...assignment };
  isEditModeRotationAssign.value = true;
  showRotationAssignModal.value = true;
};

const saveRotationAssignment = async (payload: RotationAssignmentPayload) => {
  try {
    if (isEditModeRotationAssign.value && currentRotationAssignment.value?.guid) {
      // Mise à jour
      const response = await RotationAssignmentService.updateAssignment(
        currentRotationAssignment.value.guid,
        payload
      );

      if (response.success) {
        const index = rotationAssignments.value.findIndex(
          (a) => a.guid === currentRotationAssignment.value!.guid
        );
        if (index !== -1) {
          rotationAssignments.value[index] = response.data.rotation_assignment;
        }
        console.log('✅ Assignation rotation mise à jour');
      }
    } else {
      // Création
      const response = await RotationAssignmentService.createAssignment(payload);

      if (response.success) {
        rotationAssignments.value.push(response.data.rotation_assignment);
        console.log('✅ Assignation rotation créée');
      }
    }

    closeRotationAssignModal();
    await loadRotationAssignments(); // Recharger la liste
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de l\'assignation rotation:', error);
  }
};

const deleteRotationAssignment = async (guid: string) => {
  try {
    const response = await RotationAssignmentService.deleteAssignment(guid);

    if (response.success) {
      rotationAssignments.value = rotationAssignments.value.filter((a) => a.guid !== guid);
      console.log('✅ Assignation rotation supprimée');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de l\'assignation rotation:', error);
  }
};

const closeRotationAssignModal = () => {
  showRotationAssignModal.value = false;
  currentRotationAssignment.value = null;
  isEditModeRotationAssign.value = false;
};

// ============================================
// CHARGEMENT DES DONNÉES
// ============================================

const loadSchedule = async () => {
  try {
    const response = await scheduleService.listSchedule();
    if (response.success) {
      schedules.value = response.data.templates.items || [];
      console.log('📋 Emplois du temps chargés:', schedules.value.length);
    }
  } catch (error) {
    console.error('Erreur chargement emplois du temps:', error);
  }
};

const loadRotations = async () => {
  try {
    const response = await Rotationservice.listRotations();
    if (response.success) {
      rotations.value = response.data.rotation_groups.items || [];
      console.log('📋 Rotations chargées:', rotations.value.length);
    }
  } catch (error) {
    console.error('Erreur chargement rotations:', error);
  }
};

const loadScheduleAssignments = async () => {
  try {
    const response = await ScheduleAssignmentService.listAssignments(currentUserGuid.value);
    if (response.success) {
      scheduleAssignments.value = response.data.schedule_assignments.items || [];
      console.log('📋 Assignations emplois du temps chargées:', scheduleAssignments.value.length, response.data );
    }
  } catch (error) {
    console.error('Erreur chargement assignations emplois du temps:', error);
  }
}

const loadRotationAssignments = async () => {
  try {
    const response = await RotationAssignmentService.listAssignments(currentUserGuid.value);
    if (response.success) {
      rotationAssignments.value = response.data.rotation_assignments.items || [];
      console.log('📋 Assignations rotations chargées:', rotationAssignments.value.length);
    }
  } catch (error) {
    console.error('Erreur chargement assignations rotations:', error);
  }
}

const loadManagerGroups = async () => {
  try {
    const response = await GroupService.listGroups(currentUserGuid.value);
    if (response.success) {
      groups.value = response.data.groups.items || [];
      console.log('📋 Groupes chargés:', groups.value.length);
    }
  } catch (error) {
    console.error('Erreur chargement groupes:', error);
  }
}

// Lifecycle
onMounted(async () => {
  HeadBuilder.apply({
    title: 'Emplois du temps - Toké',
    css: [footerCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });
  try {
    isLoading.value = true
    await loadSchedule();
    await loadRotations();

    await loadScheduleAssignments();
    await loadRotationAssignments();

    await loadManagerGroups();

    await teamStore.loadTeam(userStore.user?.guid!)
  }
  catch (error: any) {
    console.error('error is occurred')
  }finally {
    isLoading.value = false
  }


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

<!--&lt;!&ndash; Schedule.vue - VERSION MISE À JOUR &ndash;&gt;-->
<!--<template>-->
<!--  <div class="schedule-container">-->
<!--    &lt;!&ndash; Header Component &ndash;&gt;-->
<!--    <div class="top-header">-->
<!--      <Header />-->
<!--    </div>-->

<!--    <div class="schedule-layout">-->
<!--      &lt;!&ndash; Sidebar Navigation &ndash;&gt;-->
<!--      <aside class="vertical-sidebar">-->
<!--        <nav class="vertical-nav">-->
<!--          <button-->
<!--            class="vertical-nav-item"-->
<!--            :class="{ 'active': activeTab === 'schedules' }"-->
<!--            @click="activeTab = 'schedules'"-->
<!--          >-->
<!--            <span class="vertical-nav-icon">📅</span>-->
<!--            <div class="vertical-nav-content">-->
<!--              <span class="vertical-nav-label">Emplois du temps</span>-->
<!--              <span class="vertical-nav-badge">{{ schedules.length }}</span>-->
<!--            </div>-->
<!--          </button>-->
<!--          <button-->
<!--            class="vertical-nav-item"-->
<!--            :class="{ 'active': activeTab === 'rotations' }"-->
<!--            @click="activeTab = 'rotations'"-->
<!--          >-->
<!--            <span class="vertical-nav-icon">🔄</span>-->
<!--            <div class="vertical-nav-content">-->
<!--              <span class="vertical-nav-label">Rotations</span>-->
<!--              <span class="vertical-nav-badge">{{ rotations.length }}</span>-->
<!--            </div>-->
<!--          </button>-->
<!--          <button-->
<!--            class="vertical-nav-item"-->
<!--            :class="{ 'active': activeTab === 'assignments-schedule' }"-->
<!--            @click="activeTab = 'assignments-schedule'"-->
<!--          >-->
<!--            <div class="vertical-nav-icon"><IconCalendarUser class="w-10" /></div>-->
<!--            <div class="vertical-nav-content">-->
<!--              <span class="vertical-nav-label">Assigner un emplois de temps</span>-->
<!--              <span class="vertical-nav-badge">{{ scheduleAssignments.length }}</span>-->
<!--            </div>-->
<!--          </button>-->
<!--          <button-->
<!--            class="vertical-nav-item"-->
<!--            :class="{ 'active': activeTab === 'assignments-rotation' }"-->
<!--            @click="activeTab = 'assignments-rotation'"-->
<!--          >-->
<!--            <span class="vertical-nav-icon">👥</span>-->
<!--            <div class="vertical-nav-content">-->
<!--              <span class="vertical-nav-label">Assigner une rotation</span>-->
<!--              <span class="vertical-nav-badge">{{ rotationAssignments.length }}</span>-->
<!--            </div>-->
<!--          </button>-->
<!--        </nav>-->
<!--      </aside>-->

<!--      &lt;!&ndash; Main Content Area &ndash;&gt;-->
<!--      <main class="main-content-area">-->
<!--        &lt;!&ndash; Page Actions &ndash;&gt;-->
<!--        <header class="content-header">-->
<!--          <div class="header-actions">-->
<!--            <button-->
<!--              class="btn btn-primary"-->
<!--              @click="openCreateModal"-->
<!--              v-if="activeTab === 'schedules'"-->
<!--            >-->
<!--              <span class="btn-icon">+</span>-->
<!--              Créer un emploi du temps-->
<!--            </button>-->
<!--            <button-->
<!--              class="btn btn-primary"-->
<!--              @click="openRotationModal"-->
<!--              v-if="activeTab === 'rotations'"-->
<!--            >-->
<!--              <span class="btn-icon">+</span>-->
<!--              Créer une rotation-->
<!--            </button>-->
<!--            <button-->
<!--              class="btn btn-primary"-->
<!--              @click="openAssignmentModal"-->
<!--              v-if="activeTab === 'assignments-schedule'"-->
<!--            >-->
<!--              <span class="btn-icon">+</span>-->
<!--              Assigner un emplois de temps-->
<!--            </button>-->
<!--            <button-->
<!--              class="btn btn-primary"-->
<!--              @click="openAssigneModal"-->
<!--              v-if="activeTab === 'assignments-rotation'"-->
<!--            >-->
<!--              <span class="btn-icon">+</span>-->
<!--              Assigner une rotation-->
<!--            </button>-->

<!--            <div class="search-container">-->
<!--              <input-->
<!--                type="text"-->
<!--                class="search-input"-->
<!--                placeholder="🔍 Rechercher..."-->
<!--                v-model="searchQuery"-->
<!--              />-->
<!--            </div>-->
<!--          </div>-->
<!--        </header>-->

<!--        &lt;!&ndash; Content &ndash;&gt;-->
<!--        <div class="content-wrapper">-->
<!--          &lt;!&ndash; Content: Emplois du temps &ndash;&gt;-->
<!--          <ScheduleList-->
<!--            v-if="activeTab === 'schedules'"-->
<!--            :schedules="schedules"-->
<!--            :employees="employees"-->
<!--            @edit="editSchedule"-->
<!--            @duplicate="duplicateSchedule"-->
<!--            @deleteSchedule="deleteSchedule"-->
<!--          />-->

<!--          &lt;!&ndash; Content: Rotations &ndash;&gt;-->
<!--          <RotationList-->
<!--            v-if="activeTab === 'rotations'"-->
<!--            :rotations="rotations"-->
<!--            @edit="editRotation as any"-->
<!--            @view-calendar="viewRotationCalendar as any"-->
<!--            @deleteRotation="deleteRotation"-->
<!--          />-->

<!--          &lt;!&ndash; Assignations emplois du temps &ndash;&gt;-->
<!--          <ScheduleAssignList-->
<!--            v-if="activeTab === 'assignments-schedule'"-->
<!--            :assignments="scheduleAssignments"-->
<!--            @edit="editScheduleAssignment"-->
<!--            @deleteAssignment="deleteScheduleAssignment"-->
<!--          />-->

<!--          &lt;!&ndash; Assignations rotations &ndash;&gt;-->
<!--          <RotationAssignList-->
<!--            v-if="activeTab === 'assignments-rotation'"-->
<!--            :assignments="rotationAssignments"-->
<!--            @edit="editRotationAssignment"-->
<!--            @deleteAssignment="deleteRotationAssignment"-->
<!--          />-->
<!--        </div>-->
<!--      </main>-->
<!--    </div>-->

<!--    &lt;!&ndash; Modal Schedule Form &ndash;&gt;-->
<!--    <ScheduleForm-->
<!--      v-if="showModal"-->
<!--      :template="currentSchedule"-->
<!--      :is-edit-mode="isEditMode"-->
<!--      @save="saveSchedule"-->
<!--      @close="closeModal"-->
<!--    />-->

<!--    &lt;!&ndash; Modal Rotation Form &ndash;&gt;-->
<!--    <RotationForm-->
<!--      v-if="showRotationModal"-->
<!--      :rotation="currentRotation"-->
<!--      :is-edit-mode="isEditModeRotation"-->
<!--      :templates="schedules as any"-->
<!--      @save="saveRotation as any"-->
<!--      @close="closeRotationModal"-->
<!--    />-->

<!--    &lt;!&ndash; Modal Calendar &ndash;&gt;-->
<!--    <ScheduleCalendar-->
<!--      v-if="showCalendarModal"-->
<!--      :rotation="selectedRotation as any"-->
<!--      :schedules="schedules as any"-->
<!--      :employees="employees"-->
<!--      @close="closeCalendarModal"-->
<!--    />-->

<!--    &lt;!&ndash; Modal Assignment Form &ndash;&gt;-->
<!--    <AssignmentForm-->
<!--      v-if="showAssignmentModal"-->
<!--      :assignment="currentAssignment"-->
<!--      :is-edit-mode="isEditModeAssignment"-->
<!--      :rotations="rotations as any"-->
<!--      :schedules="schedules as any"-->
<!--      :employees="employees"-->
<!--      @save="saveAssignment"-->
<!--      @close="closeAssignmentModal"-->
<!--    />-->

<!--    &lt;!&ndash; Modal assignation emploi du temps &ndash;&gt;-->
<!--    <ScheduleAssignForm-->
<!--      v-if="showScheduleAssignModal"-->
<!--      :assignment="currentScheduleAssignment"-->
<!--      :users="users"-->
<!--      :groups="groups"-->
<!--      :templates="schedules"-->
<!--      :current-user-guid="currentUserGuid"-->
<!--      :is-edit-mode="isEditModeScheduleAssign"-->
<!--      @save="saveScheduleAssignment"-->
<!--      @close="closeScheduleAssignModal"-->
<!--    />-->

<!--    &lt;!&ndash; Modal assignation rotation &ndash;&gt;-->
<!--    <RotationAssignForm-->
<!--      v-if="showRotationAssignModal"-->
<!--      :assignment="currentRotationAssignment"-->
<!--      :users="users"-->
<!--      :groups="groups"-->
<!--      :rotations="rotations"-->
<!--      :current-user-guid="currentUserGuid"-->
<!--      :is-edit-mode="isEditModeRotationAssign"-->
<!--      @save="saveRotationAssignment"-->
<!--      @close="closeRotationAssignModal"-->
<!--    />-->
<!--  </div>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import { ref, computed, onMounted } from 'vue';-->
<!--import ScheduleList from '../schedule/scheduleList.vue'-->
<!--import ScheduleForm from '../schedule/scheduleForm.vue';-->
<!--import RotationList from '../schedule/rotationList.vue';-->
<!--import RotationForm from '../schedule/rotationForm.vue';-->
<!--import AssignmentForm from '../schedule/assignmentForm.vue';-->
<!--import ScheduleCalendar from '../schedule/scheduleCalendar.vue';-->
<!--import ScheduleAssignList from '@/views/schedule/scheduleAssignList.vue';-->
<!--import RotationAssignForm from '@/views/schedule/rotationAssignForm.vue';-->
<!--import ScheduleAssignForm from '@/views/schedule/scheduleAssignForm.vue';-->
<!--import Header from '@/views/components/header.vue';-->
<!--import { useUserStore } from '@/stores/userStore';-->
<!--import "../../assets/css/toke-schedule-21.css"-->
<!--import "../../assets/css/toke-dMain-04.css"-->
<!--import footerCss from "../../assets/css/toke-footer-24.css?url"-->
<!--import HeadBuilder from '@/utils/HeadBuilder';-->
<!--import scheduleService from '@/service/ScheduleService';-->
<!--import { IconCalendarUser } from '@tabler/icons-vue';-->
<!--import Rotationservice, { type RotationGroup, type RotationPayload } from '@/service/rotationservice';-->

<!--import ScheduleAssignmentService, { ScheduleAssignment } from '@/service/scheduleAssignmentService';-->
<!--import RotationAssignmentService, { RotationAssignment } from '@/service/rotationAssignmentService';-->
<!--import { useTeamStore } from '@/stores/teamStore';-->
<!--import GroupService, { Group } from '@/service/GroupService';-->


<!--// Types-->
<!--interface Period {-->
<!--  work: [string, string];-->
<!--  pause: [string, string] | null;-->
<!--  tolerance: number;-->
<!--}-->

<!--interface Definition {-->
<!--  Mon: Period[];-->
<!--  Tue: Period[];-->
<!--  Wed: Period[];-->
<!--  Thu: Period[];-->
<!--  Fri: Period[];-->
<!--  Sat: Period[];-->
<!--  Sun: Period[];-->
<!--}-->

<!--interface SessionTemplate {-->
<!--  guid?: string;-->
<!--  name: string;-->
<!--  valid_from: string;-->
<!--  valid_to: string;-->
<!--  definition: Definition;-->
<!--}-->

<!--interface Employee {-->
<!--  id: number;-->
<!--  name: string;-->
<!--  role: string;-->
<!--  assignedScheduleGuid: string | null;-->
<!--  isActive?: boolean;-->
<!--  groupId?: number | null;-->
<!--}-->

<!--const userStore = useUserStore()-->
<!--const teamStore = useTeamStore()-->
<!--const currentUserGuid = computed(() => userStore.user?.guid || '');-->

<!--// State-->
<!--const activeTab = ref<'schedules' | 'rotations' | 'assignments-schedule' | 'assignments-rotation'>('schedules');-->
<!--const searchQuery = ref('');-->
<!--const showModal = ref(false);-->
<!--const isEditMode = ref(false);-->
<!--const editingScheduleGuid = ref<string | null>(null);-->

<!--const showRotationModal = ref(false);-->
<!--const isEditModeRotation = ref(false);-->
<!--const editingRotationGuid = ref<string | null>(null);-->

<!--const showCalendarModal = ref(false);-->
<!--const selectedRotation = ref<RotationGroup | null>(null);-->

<!--const showAssignmentModal = ref(false);-->
<!--const isEditModeAssignment = ref(false);-->
<!--const editingAssignmentId = ref<number | null>(null);-->

<!--// États pour assignations emplois du temps-->
<!--const scheduleAssignments = ref<ScheduleAssignment[]>([]);-->
<!--const showScheduleAssignModal = ref(false);-->
<!--const isEditModeScheduleAssign = ref(false);-->
<!--const currentScheduleAssignment = ref<ScheduleAssignment | null>(null);-->

<!--// États pour assignations rotations-->
<!--const rotationAssignments = ref<RotationAssignment[]>([]);-->
<!--const showRotationAssignModal = ref(false);-->
<!--const isEditModeRotationAssign = ref(false);-->
<!--const currentRotationAssignment = ref<RotationAssignment | null>(null);-->

<!--// Data-->
<!--const schedules = ref<SessionTemplate[]>([]);-->
<!--const rotations = ref<RotationGroup[]>([]);-->
<!--const groups = ref<Group[]>([]);-->
<!--const employees = ref<Employee[]>([-->
<!--  { id: 1, name: 'Jean Dupont', role: 'Développeur', assignedScheduleGuid: null, isActive: true, groupId: 1 },-->
<!--  { id: 2, name: 'Marie Martin', role: 'Designer', assignedScheduleGuid: null, isActive: true, groupId: 1 },-->
<!--  { id: 3, name: 'Pierre Durand', role: 'Manager', assignedScheduleGuid: null, isActive: true, groupId: null },-->
<!--  { id: 4, name: 'Sophie Bernard', role: 'Développeur', assignedScheduleGuid: null, isActive: true, groupId: 2 }-->
<!--]);-->

<!--const users = computed(() => teamStore.employees)-->


<!--const currentSchedule = ref<SessionTemplate>(getEmptyTemplate());-->
<!--const currentRotation = ref<RotationGroup | null>(null);-->
<!--const currentAssignment = ref<any>(null);-->

<!--// Helper Functions-->
<!--function getEmptyTemplate(): SessionTemplate {-->
<!--  return {-->
<!--    name: '',-->
<!--    valid_from: '',-->
<!--    valid_to: '',-->
<!--    definition: {-->
<!--      Mon: [],-->
<!--      Tue: [],-->
<!--      Wed: [],-->
<!--      Thu: [],-->
<!--      Fri: [],-->
<!--      Sat: [],-->
<!--      Sun: []-->
<!--    }-->
<!--  };-->
<!--}-->

<!--// ==================== SCHEDULE CRUD ====================-->
<!--function openCreateModal() {-->
<!--  isEditMode.value = false;-->
<!--  currentSchedule.value = getEmptyTemplate();-->
<!--  showModal.value = true;-->
<!--}-->

<!--function editSchedule(schedule: SessionTemplate) {-->
<!--  isEditMode.value = true;-->
<!--  editingScheduleGuid.value = schedule.guid || null;-->
<!--  currentSchedule.value = JSON.parse(JSON.stringify(schedule));-->
<!--  showModal.value = true;-->
<!--}-->

<!--function duplicateSchedule(schedule: SessionTemplate) {-->
<!--  const duplicated = JSON.parse(JSON.stringify(schedule));-->
<!--  duplicated.name = `${schedule.name} (copie)`;-->
<!--  delete duplicated.guid;-->

<!--  const today = new Date();-->
<!--  const nextMonth = new Date(today.setMonth(today.getMonth() + 1));-->
<!--  duplicated.valid_from = nextMonth.toISOString().split('T')[0];-->

<!--  const endDate = new Date(nextMonth);-->
<!--  endDate.setFullYear(endDate.getFullYear() + 1);-->
<!--  duplicated.valid_to = endDate.toISOString().split('T')[0];-->

<!--  isEditMode.value = false;-->
<!--  currentSchedule.value = duplicated;-->
<!--  showModal.value = true;-->
<!--}-->

<!--function closeModal() {-->
<!--  showModal.value = false;-->
<!--  currentSchedule.value = getEmptyTemplate();-->
<!--  editingScheduleGuid.value = null;-->
<!--}-->

<!--const saveSchedule = async (payload: SessionTemplate) => {-->
<!--  if (isEditMode.value && editingScheduleGuid.value) {-->
<!--    try {-->
<!--      const edit = await scheduleService.updateSchedule(editingScheduleGuid.value, payload);-->
<!--      if (edit.success) {-->
<!--        const index = schedules.value.findIndex(s => s.guid === editingScheduleGuid.value);-->
<!--        if (index !== -1) {-->
<!--          schedules.value[index] = {-->
<!--            ...payload,-->
<!--            guid: editingScheduleGuid.value-->
<!--          };-->
<!--        }-->
<!--        console.log('✅ Emploi du temps mis à jour');-->
<!--      }-->
<!--    } catch (error: any) {-->
<!--      console.error('Erreur de sauvegarde:', error);-->
<!--    }-->
<!--  } else {-->
<!--    try {-->
<!--      const save = await scheduleService.createSchedule(payload)-->
<!--      if (save.success) {-->
<!--        const newSchedule: SessionTemplate = {-->
<!--          ...payload,-->
<!--          guid: save.data.guid-->
<!--        };-->
<!--        schedules.value.push(newSchedule);-->
<!--        console.log('✅ Emploi du temps créé');-->
<!--      }-->
<!--    } catch (error: any) {-->
<!--      console.error('Erreur de sauvegarde:', error);-->
<!--    }-->
<!--  }-->
<!--  closeModal();-->
<!--}-->

<!--async function deleteSchedule(guid: string) {-->
<!--  if (!confirm('Êtes-vous sûr de vouloir supprimer cet emploi du temps ?')) {-->
<!--    return;-->
<!--  }-->

<!--  schedules.value = schedules.value.filter(s => s.guid !== guid);-->

<!--  // Retirer l'assignation des employés-->
<!--  employees.value.forEach(emp => {-->
<!--    if (emp.assignedScheduleGuid === guid) {-->
<!--      emp.assignedScheduleGuid = null;-->
<!--    }-->
<!--  });-->

<!--  console.log('🗑️ Emploi du temps supprimé');-->
<!--}-->

<!--// ==================== ROTATION CRUD ====================-->
<!--function openRotationModal() {-->
<!--  isEditModeRotation.value = false;-->
<!--  currentRotation.value = null;-->
<!--  showRotationModal.value = true;-->
<!--}-->

<!--function editRotation(rotation: RotationGroup) {-->
<!--  isEditModeRotation.value = true;-->
<!--  editingRotationGuid.value = rotation.guid;-->
<!--  currentRotation.value = JSON.parse(JSON.stringify(rotation));-->
<!--  showRotationModal.value = true;-->
<!--}-->

<!--function closeRotationModal() {-->
<!--  showRotationModal.value = false;-->
<!--  currentRotation.value = null;-->
<!--  editingRotationGuid.value = null;-->
<!--}-->

<!--async function saveRotation(payload: RotationPayload) {-->
<!--  if (isEditModeRotation.value && editingRotationGuid.value) {-->
<!--    // Mode édition-->
<!--    try {-->
<!--      const response = await Rotationservice.updateRotation(editingRotationGuid.value, payload);-->

<!--      if (response.success) {-->
<!--        const index = rotations.value.findIndex(r => r.guid === editingRotationGuid.value);-->
<!--        if (index !== -1) {-->
<!--          rotations.value[index] = response.data.rotation_group;-->
<!--        }-->
<!--        console.log('✅ Rotation mise à jour');-->
<!--      }-->
<!--    } catch (error: any) {-->
<!--      console.error('Erreur de mise à jour de la rotation:', error);-->
<!--      alert('Erreur lors de la mise à jour de la rotation');-->
<!--    }-->
<!--  } else {-->
<!--    // Mode création-->
<!--    try {-->
<!--      const response = await Rotationservice.createRotation(payload);-->

<!--      if (response.success) {-->
<!--        rotations.value.push(response.data.rotation_group);-->
<!--        console.log('✅ Rotation créée:', response.data.rotation_group);-->
<!--      }-->
<!--    } catch (error: any) {-->
<!--      console.error('Erreur de création de la rotation:', error);-->
<!--      alert('Erreur lors de la création de la rotation');-->
<!--    }-->
<!--  }-->

<!--  closeRotationModal();-->
<!--}-->

<!--async function deleteRotation(guid: string) {-->
<!--  if (!confirm('Êtes-vous sûr de vouloir supprimer cette rotation ?')) {-->
<!--    return;-->
<!--  }-->

<!--  try {-->
<!--    const response = await Rotationservice.deleteRotation(guid);-->

<!--    if (response.success) {-->
<!--      rotations.value = rotations.value.filter(r => r.guid !== guid);-->
<!--      console.log('🗑️ Rotation supprimée');-->
<!--    }-->
<!--  } catch (error: any) {-->
<!--    console.error('Erreur de suppression:', error);-->
<!--    alert('Erreur lors de la suppression de la rotation');-->
<!--  }-->
<!--}-->

<!--function viewRotationCalendar(rotation: RotationGroup) {-->
<!--  selectedRotation.value = rotation;-->
<!--  showCalendarModal.value = true;-->
<!--}-->

<!--function closeCalendarModal() {-->
<!--  showCalendarModal.value = false;-->
<!--  selectedRotation.value = null;-->
<!--}-->

<!--// ==================== ASSIGNMENT FUNCTIONS ====================-->
<!--function openAssignmentModal() {-->
<!--  isEditModeAssignment.value = false;-->
<!--  currentAssignment.value = null;-->
<!--  showAssignmentModal.value = true;-->
<!--}-->

<!--function closeAssignmentModal() {-->
<!--  showAssignmentModal.value = false;-->
<!--  currentAssignment.value = null;-->
<!--  editingAssignmentId.value = null;-->
<!--}-->

<!--function saveAssignment(assignment: any) {-->
<!--  closeAssignmentModal();-->
<!--}-->

<!--function handleSaveAssignment(data: any) {-->
<!--  // TODO: Implémenter l'assignation d'employés aux rotations-->
<!--  console.log('Assignation:', data);-->
<!--}-->

<!--function handleDeleteAssignment(data: any) {-->
<!--  // TODO: Implémenter la suppression d'assignation-->
<!--  console.log('Suppression assignation:', data);-->
<!--}-->

<!--// Ouvrir le formulaire-->
<!--function openScheduleAssignModal() {-->
<!--  isEditModeScheduleAssign.value = false;-->
<!--  currentScheduleAssignment.value = null;-->
<!--  showScheduleAssignModal.value = true;-->
<!--}-->

<!--// Sauvegarder-->
<!--async function saveScheduleAssignment(payload: any) {-->
<!--  try {-->
<!--    const response = await ScheduleAssignmentService.createAssignment(payload);-->
<!--    if (response.success) {-->
<!--      scheduleAssignments.value.push(response.data.schedule_assignments);-->
<!--      closeScheduleAssignModal();-->
<!--      console.log('✅ Assignation créée');-->
<!--    }-->
<!--  } catch (error) {-->
<!--    console.error('Erreur création assignation:', error);-->
<!--    alert('Erreur lors de la création de l\'assignation');-->
<!--  }-->
<!--}-->

<!--// Supprimer-->
<!--async function deleteScheduleAssignment(guid: string) {-->
<!--  if (!confirm('Confirmer la suppression ?')) return;-->

<!--  try {-->
<!--    const response = await ScheduleAssignmentService.deleteAssignment(guid);-->
<!--    if (response.success) {-->
<!--      scheduleAssignments.value = scheduleAssignments.value.filter(a => a.guid !== guid);-->
<!--      console.log('🗑️ Assignation supprimée');-->
<!--    }-->
<!--  } catch (error) {-->
<!--    console.error('Erreur suppression:', error);-->
<!--  }-->
<!--}-->

<!--// Fermer le modal-->
<!--function closeScheduleAssignModal() {-->
<!--  showScheduleAssignModal.value = false;-->
<!--  currentScheduleAssignment.value = null;-->
<!--}-->


<!--// Ouvrir le formulaire-->
<!--function openRotationAssignModal() {-->
<!--  isEditModeRotationAssign.value = false;-->
<!--  currentRotationAssignment.value = null;-->
<!--  showRotationAssignModal.value = true;-->
<!--}-->

<!--// Sauvegarder-->
<!--async function saveRotationAssignment(payload: any) {-->
<!--  try {-->
<!--    const response = await RotationAssignmentService.createAssignment(payload);-->
<!--    if (response.success) {-->
<!--      rotationAssignments.value.push(response.data.rotation_assignment);-->
<!--      closeRotationAssignModal();-->
<!--      console.log('✅ Assignation rotation créée');-->
<!--    }-->
<!--  } catch (error) {-->
<!--    console.error('Erreur création assignation rotation:', error);-->
<!--    alert('Erreur lors de la création de l\'assignation');-->
<!--  }-->
<!--}-->

<!--// Supprimer-->
<!--async function deleteRotationAssignment(guid: string) {-->
<!--  if (!confirm('Confirmer la suppression ?')) return;-->

<!--  try {-->
<!--    const response = await RotationAssignmentService.deleteAssignment(guid);-->
<!--    if (response.success) {-->
<!--      rotationAssignments.value = rotationAssignments.value.filter(a => a.guid !== guid);-->
<!--      console.log('🗑️ Assignation rotation supprimée');-->
<!--    }-->
<!--  } catch (error) {-->
<!--    console.error('Erreur suppression:', error);-->
<!--  }-->
<!--}-->

<!--// Fermer le modal-->
<!--function closeRotationAssignModal() {-->
<!--  showRotationAssignModal.value = false;-->
<!--  currentRotationAssignment.value = null;-->
<!--}-->

<!--// ==================== LOADERS ====================-->
<!--const loadSchedule = async () => {-->
<!--  try {-->
<!--    const scheduleData: any = await scheduleService.listSchedule();-->

<!--    if (scheduleData.success) {-->
<!--      const scheduleResponse: any = scheduleData.data.templates;-->
<!--      schedules.value = scheduleResponse.items;-->
<!--      console.log('📅 Emplois du temps chargés:', schedules.value.length);-->
<!--    }-->
<!--  } catch (error) {-->
<!--    console.error('Erreur de chargement des emplois du temps:', error);-->
<!--  }-->
<!--}-->

<!--const loadRotations = async () => {-->
<!--  try {-->
<!--    const rotationData = await Rotationservice.listRotations();-->

<!--    if (rotationData.success) {-->
<!--      rotations.value = rotationData.data.rotation_groups.items || [];-->
<!--      console.log('🔄 Rotations chargées:', rotations.value.length);-->
<!--    }-->
<!--  } catch (error) {-->
<!--    console.error('Erreur de chargement des rotations:', error);-->
<!--  }-->
<!--}-->

<!--const loadScheduleAssignments = async () => {-->
<!--  try {-->
<!--    const response = await ScheduleAssignmentService.listAssignments(currentUserGuid.value);-->
<!--    if (response.success) {-->
<!--      scheduleAssignments.value = response.data.schedule_assignments.items || [];-->
<!--      console.log('📋 Assignations emplois du temps chargées:', scheduleAssignments.value.length);-->
<!--    }-->
<!--  } catch (error) {-->
<!--    console.error('Erreur chargement assignations emplois du temps:', error);-->
<!--  }-->
<!--}-->

<!--const loadRotationAssignments = async () => {-->
<!--  try {-->
<!--    const response = await RotationAssignmentService.listAssignments(currentUserGuid.value);-->
<!--    if (response.success) {-->
<!--      rotationAssignments.value = response.data.rotation_assignments.items || [];-->
<!--      console.log('📋 Assignations rotations chargées:', rotationAssignments.value.length);-->
<!--    }-->
<!--  } catch (error) {-->
<!--    console.error('Erreur chargement assignations rotations:', error);-->
<!--  }-->
<!--}-->

<!--const loadManagerGroups = async () => {-->
<!--  try {-->
<!--    const response = await GroupService.listGroups(currentUserGuid.value);-->
<!--    if (response.success) {-->
<!--      groups.value = response.data.groups || [];-->
<!--      console.log('📋 Groupes chargés:', rotationAssignments.value.length);-->
<!--    }-->
<!--  } catch (error) {-->
<!--    console.error('Erreur chargement groupes:', error);-->
<!--  }-->
<!--}-->

<!--// Lifecycle-->
<!--onMounted(async () => {-->
<!--  HeadBuilder.apply({-->
<!--    title: 'Emplois du temps - Toké',-->
<!--    css: [footerCss],-->
<!--    meta: { viewport: "width=device-width, initial-scale=1.0" }-->
<!--  });-->

<!--  await loadSchedule();-->
<!--  await loadRotations();-->

<!--  await loadScheduleAssignments();-->
<!--  await loadRotationAssignments();-->

<!--  await loadManagerGroups();-->

<!--  await teamStore.loadTeam(userStore.user?.guid!)-->
<!--});-->
<!--</script>-->

<!--<style scoped>-->
<!--/* Container principal */-->
<!--.schedule-container {-->
<!--  min-height: 100vh;-->
<!--  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--}-->

<!--/* Top Header - Sticky */-->
<!--.top-header {-->
<!--  position: sticky;-->
<!--  top: 0;-->
<!--  background-color: white;-->
<!--  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);-->
<!--  z-index: 1000;-->
<!--  margin-bottom: var(&#45;&#45;space-lg, 1.5rem);-->
<!--}-->

<!--/* Layout avec sidebar + content */-->
<!--.schedule-layout {-->
<!--  display: flex;-->
<!--  flex: 1;-->
<!--  max-width: 1400px;-->
<!--  margin: 0 auto;-->
<!--  width: 100%;-->
<!--  gap: var(&#45;&#45;space-lg, 1.5rem);-->
<!--  padding: 0 var(&#45;&#45;space-lg, 1.5rem) var(&#45;&#45;space-lg, 1.5rem);-->
<!--}-->

<!--/* Sidebar verticale */-->
<!--.vertical-sidebar {-->
<!--  width: 280px;-->
<!--  min-width: 280px;-->
<!--  background-color: white;-->
<!--  border-radius: var(&#45;&#45;border-radius-lg, 12px);-->
<!--  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);-->
<!--  padding: var(&#45;&#45;space-lg, 1.5rem);-->
<!--  overflow-y: auto;-->
<!--  flex-shrink: 0;-->
<!--  height: fit-content;-->
<!--  max-height: calc(100vh - 120px);-->
<!--}-->

<!--.vertical-nav {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: var(&#45;&#45;space-xs, 0.5rem);-->
<!--}-->

<!--.vertical-nav-item {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  gap: var(&#45;&#45;space-md, 1rem);-->
<!--  padding: var(&#45;&#45;space-md, 1rem);-->
<!--  background: transparent;-->
<!--  border: none;-->
<!--  border-radius: var(&#45;&#45;border-radius, 8px);-->
<!--  cursor: pointer;-->
<!--  transition: all var(&#45;&#45;transition-base, 0.2s ease);-->
<!--  text-align: left;-->
<!--  position: relative;-->
<!--}-->

<!--.vertical-nav-item::before {-->
<!--  content: '';-->
<!--  position: absolute;-->
<!--  left: 0;-->
<!--  top: 50%;-->
<!--  transform: translateY(-50%);-->
<!--  width: 4px;-->
<!--  height: 0;-->
<!--  background: linear-gradient(180deg, var(&#45;&#45;color-primary, #004aad) 0%, #0066cc 100%);-->
<!--  border-radius: 0 4px 4px 0;-->
<!--  transition: height var(&#45;&#45;transition-base, 0.2s ease);-->
<!--}-->

<!--.vertical-nav-item:hover {-->
<!--  background-color: var(&#45;&#45;bg-secondary, #f9fafb);-->
<!--}-->

<!--.vertical-nav-item.active {-->
<!--  background-color: rgba(0, 74, 173, 0.08);-->
<!--  color: var(&#45;&#45;color-primary, #004aad);-->
<!--}-->

<!--.vertical-nav-item.active::before {-->
<!--  height: 100%;-->
<!--}-->

<!--.vertical-nav-icon {-->
<!--  font-size: 24px;-->
<!--  flex-shrink: 0;-->
<!--}-->

<!--.vertical-nav-content {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  gap: 4px;-->
<!--  flex: 1;-->
<!--}-->

<!--.vertical-nav-label {-->
<!--  font-size: var(&#45;&#45;font-size-body, 14px);-->
<!--  font-weight: var(&#45;&#45;font-weight-medium, 500);-->
<!--  color: var(&#45;&#45;text-primary, #1f2937);-->
<!--}-->

<!--.vertical-nav-item.active .vertical-nav-label {-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold, 600);-->
<!--  color: var(&#45;&#45;color-primary, #004aad);-->
<!--}-->

<!--.vertical-nav-badge {-->
<!--  display: inline-block;-->
<!--  padding: 2px 8px;-->
<!--  background-color: var(&#45;&#45;bg-secondary, #e5e7eb);-->
<!--  color: var(&#45;&#45;text-secondary, #6b7280);-->
<!--  border-radius: 12px;-->
<!--  font-size: 11px;-->
<!--  font-weight: var(&#45;&#45;font-weight-semibold, 600);-->
<!--  width: fit-content;-->
<!--}-->

<!--.vertical-nav-item.active .vertical-nav-badge {-->
<!--  background-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  color: white;-->
<!--}-->

<!--/* Main content area */-->
<!--.main-content-area {-->
<!--  flex: 1;-->
<!--  min-width: 0;-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  background-color: white;-->
<!--  border-radius: var(&#45;&#45;border-radius-lg, 12px);-->
<!--  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);-->
<!--  height: fit-content;-->
<!--  max-height: calc(100vh - 120px);-->
<!--}-->

<!--.content-header {-->
<!--  background-color: white;-->
<!--  padding: var(&#45;&#45;space-lg, 1.5rem) var(&#45;&#45;space-xl, 2rem);-->
<!--  border-bottom: 1px solid var(&#45;&#45;border-light, #e5e7eb);-->
<!--  border-radius: var(&#45;&#45;border-radius-lg, 12px) var(&#45;&#45;border-radius-lg, 12px) 0 0;-->
<!--  flex-shrink: 0;-->
<!--}-->

<!--.header-actions {-->
<!--  display: flex;-->
<!--  gap: var(&#45;&#45;space-md, 1rem);-->
<!--  align-items: center;-->
<!--}-->

<!--.search-container {-->
<!--  margin-left: auto;-->
<!--  flex-shrink: 0;-->
<!--}-->

<!--.search-input {-->
<!--  width: 300px;-->
<!--  height: var(&#45;&#45;btn-height, 40px);-->
<!--  padding: 0 var(&#45;&#45;space-lg, 1.5rem);-->
<!--  border: 2px solid var(&#45;&#45;border-light, #e0e0e0);-->
<!--  border-radius: var(&#45;&#45;border-radius, 8px);-->
<!--  font-size: var(&#45;&#45;font-size-body, 14px);-->
<!--  background-color: var(&#45;&#45;bg-secondary, #f9fafb);-->
<!--  transition: all var(&#45;&#45;transition-base, 0.2s ease);-->
<!--}-->

<!--.search-input:focus {-->
<!--  outline: none;-->
<!--  border-color: var(&#45;&#45;color-primary, #004aad);-->
<!--  background-color: white;-->
<!--  box-shadow: 0 0 0 4px rgba(0, 74, 173, 0.1);-->
<!--}-->

<!--.search-input::placeholder {-->
<!--  color: var(&#45;&#45;text-muted, #6b7280);-->
<!--}-->

<!--/* Content wrapper */-->
<!--.content-wrapper {-->
<!--  flex: 1;-->
<!--  overflow-y: auto;-->
<!--  padding: var(&#45;&#45;space-xl, 2rem);-->
<!--  background-color: var(&#45;&#45;bg-secondary, #f8f9fa);-->
<!--  border-radius: 0 0 var(&#45;&#45;border-radius-lg, 12px) var(&#45;&#45;border-radius-lg, 12px);-->
<!--}-->

<!--/* Responsive */-->
<!--@media (max-width: 1024px) {-->
<!--  .vertical-sidebar {-->
<!--    width: 240px;-->
<!--  }-->
<!--}-->

<!--@media (max-width: 768px) {-->
<!--  .schedule-layout {-->
<!--    flex-direction: column;-->
<!--  }-->

<!--  .vertical-sidebar {-->
<!--    width: 100%;-->
<!--    border-right: none;-->
<!--    border-bottom: 1px solid var(&#45;&#45;border-light, #e5e7eb);-->
<!--    padding: var(&#45;&#45;space-md, 1rem);-->
<!--  }-->

<!--  .vertical-nav {-->
<!--    flex-direction: row;-->
<!--    overflow-x: auto;-->
<!--    gap: var(&#45;&#45;space-sm, 0.75rem);-->
<!--  }-->

<!--  .vertical-nav-item {-->
<!--    flex-direction: column;-->
<!--    min-width: 100px;-->
<!--    text-align: center;-->
<!--    padding: var(&#45;&#45;space-sm, 0.75rem);-->
<!--  }-->

<!--  .vertical-nav-item::before {-->
<!--    display: none;-->
<!--  }-->

<!--  .vertical-nav-content {-->
<!--    align-items: center;-->
<!--  }-->

<!--  .search-input {-->
<!--    width: 100%;-->
<!--  }-->

<!--  .header-actions {-->
<!--    flex-wrap: wrap;-->
<!--  }-->

<!--  .search-container {-->
<!--    order: -1;-->
<!--    width: 100%;-->
<!--    margin: 0 0 var(&#45;&#45;space-md, 1rem) 0;-->
<!--  }-->

<!--  .content-wrapper {-->
<!--    padding: var(&#45;&#45;space-md, 1rem);-->
<!--  }-->
<!--}-->
<!--</style>-->