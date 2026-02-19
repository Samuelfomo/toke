<template>
  <div class="settings-page">
    <div class="settings-container">
      <!-- Bouton de retour -->
      <button @click="goBack" class="back-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Retour
      </button>

      <!-- Contenu Mon Profil -->
      <div v-if="activeTab === 'profile'" class="tab-content">
        <div class="profile-section">
          <div class="avatars-section">
            <div class="avatar-container">
              <div class="avatars" :style="avatarStyle">
                <span v-if="!userAvatar">{{ userStore.userInitials }}</span>
              </div>
              <div class="avatar-overlay">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>

            <div class="photo-actions">
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                @change="handleFileUpload"
                style="display: none"
              />
              <input
                ref="cameraInput"
                type="file"
                accept="image/*"
                capture="user"
                @change="handleFileUpload"
                style="display: none"
              />
              <button type="button" class="btn-secondary" @click="fileInput?.click()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Importer une photo
              </button>
              <button type="button" class="btn-secondary" @click="cameraInput?.click()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Prendre une photo
              </button>
              <button
                v-if="userAvatar"
                type="button"
                class="btn-danger"
                @click="removePhoto"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Supprimer
              </button>
            </div>
          </div>

          <form @submit.prevent="saveManagerInfo" class="form">
            <div class="form-row">
              <div class="form-group">
                <label>Prénom</label>
                <input
                  v-model="lastName"
                  type="text"
                  :disabled="!isEditingManager"
                />
              </div>
              <div class="form-group">
                <label>Nom</label>
                <input
                  v-model="userStore.user!.first_name"
                  type="text"
                  :disabled="!isEditingManager"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Email</label>
                <input
                  v-model="userStore.user!.email"
                  type="email"
                  :disabled="!isEditingManager"
                />
              </div>
              <div class="form-group">
                <label>Téléphone</label>
                <input
                  v-model="userStore.user!.phone_number"
                  type="tel"
                  :disabled="!isEditingManager"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Poste</label>
                <input
                  v-model="userStore.jobTitle"
                  type="text"
                  :disabled="!isEditingManager"
                />
              </div>
              <div class="form-group">
                <label>Date d'embauche</label>
                <input
                  v-model="hireDate"
                  type="date"
                  :disabled="!isEditingManager"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Matricule</label>
                <input
                  v-model="userStore.employeeCode"
                  type="text"
                  :disabled="!isEditingManager"
                />
              </div>
              <div class="form-group">
                <label>Département</label>
                <input
                  v-model="userStore.department"
                  type="text"
                  :disabled="!isEditingManager"
                />
              </div>
            </div>

            <div class="form-actions">
              <button
                v-if="!isEditingManager"
                type="button"
                class="btn-primary"
                @click="isEditingManager = true"
              >
                Modifier
              </button>
              <template v-else>
                <button type="submit" class="btn-primary">
                  Enregistrer
                </button>
                <button
                  type="button"
                  class="btn-secondary"
                  @click="cancelManagerEdit"
                >
                  Annuler
                </button>
              </template>
            </div>
          </form>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import dashboardCss from "../assets/css/toke-dMain-04.css?url"
import HeadBuilder from '@/utils/HeadBuilder';
import UserService from '../service/UserService';
import type { Status } from '@/utils/interfaces/team.interface';
import profileCss from '../assets/css/toke-profile-16.css?url';
import Footer from '@/views/components/footer.vue';

const router = useRouter();
const userStore = useUserStore();

const activeTab = ref('profile');
const isEditingManager = ref(false);
const editingMemberId = ref<string | null>(null);
const activeEmployeeMenu = ref<number | null>(null);
const userAvatar = ref<string | null>(null);
const hireDate = ref('');

// Références pour les inputs file
const fileInput = ref<HTMLInputElement | null>(null);
const cameraInput = ref<HTMLInputElement | null>(null);

// Données de l'équipe depuis l'API
const teamEmployees = ref<Status[]>([]);
const teamBackup = ref<Record<string, any>>({});

const lastName = computed({
  get: () => userStore.user?.last_name ?? '',
  set: v => {
    if (userStore.user) userStore.user.last_name = v
  }
});

const avatarStyle = computed(() => {
  if (userAvatar.value) {
    return {
      backgroundImage: `url(${userAvatar.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    };
  }
  return {};
});

const currentUser = computed(() => ({
  name: userStore.fullName || 'Manager',
  company: userStore.tenantName || 'N/A'
}));

const notificationCount = ref(2);

// Transformer les données des membres de l'équipe
const teamMembers = computed(() => {
  return teamEmployees.value.map(emp => {
    const firstName = emp.employee.first_name || ''
    const lastName = emp.employee.last_name || ''
    const fullName = `${firstName} ${lastName}`.trim()
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

    return {
      id: emp.employee.guid,
      firstName: firstName,
      lastName: lastName,
      name: fullName,
      initials: initials,
      email: emp.employee.email || '',
      phone: emp.employee.phone_number || 'Non renseigné',
      position: emp.employee.job_title || 'Non renseigné',
      department: emp.employee.department || ''
    }
  })
});

const goBack = () => {
  router.back();
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      userAvatar.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};

const removePhoto = () => {
  userAvatar.value = null;
  if (fileInput.value) fileInput.value.value = '';
  if (cameraInput.value) cameraInput.value.value = '';
};

const saveManagerInfo = () => {
  console.log('Sauvegarde des informations du manager');
  console.log('Date d\'embauche:', hireDate.value);
  isEditingManager.value = false;
  alert('Informations sauvegardées avec succès!');
};

const cancelManagerEdit = () => {
  isEditingManager.value = false;
};

const addTeamMember = () => {
  alert('Fonctionnalité d\'ajout de membre à implémenter');
};

const editTeamMember = (member: any) => {
  teamBackup.value[member.id] = { ...member };
  editingMemberId.value = member.id;
};

const saveTeamMember = async (memberId: string) => {
  console.log('Sauvegarde du membre:', teamMembers.value.find(m => m.id === memberId));
  editingMemberId.value = null;
  delete teamBackup.value[memberId];
  alert('Membre mis à jour avec succès!');
};

const cancelTeamMemberEdit = () => {
  const member = teamMembers.value.find(m => m.id === editingMemberId.value);
  if (member && editingMemberId.value && teamBackup.value[editingMemberId.value]) {
    Object.assign(member, teamBackup.value[editingMemberId.value]);
  }
  editingMemberId.value = null;
};

const deleteTeamMember = async (memberId: string) => {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce membre?')) {
    await loadTeamData();
    alert('Membre supprimé avec succès!');
  }
};

const closeMenuOnClickOutside = (event: MouseEvent) => {
  if (activeEmployeeMenu.value !== null) {
    const target = event.target as HTMLElement
    if (!target.closest('.employee-menu')) {
      activeEmployeeMenu.value = null
    }
  }
};

// Si vous devez transformer les données
const loadTeamData = async () => {
  try {
    // const response = await UserService.listAttendance(userStore.user?.guid!);
    // if (response.data?.data) {
    //   // // Adapter selon la structure réelle de EmployeeAttendance
    //   // teamEmployees.value = response.data.data.employees.map(emp => ({
    //   //   employee: emp.employee, // ou la structure appropriée
    //   //   // autres propriétés si nécessaire
    //   // })) || [];
    // }
  } catch (error) {
    console.error('Erreur lors du chargement des données de l\'équipe:', error);
  }
};

onMounted(async () => {
  document.addEventListener('click', closeMenuOnClickOutside)
  HeadBuilder.apply({
    title: 'Profile - Toké',
    css: [dashboardCss, profileCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })

  await loadTeamData();
});
</script>

