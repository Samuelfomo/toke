<template>
  <div class="settings-page">
<!--    <Header-->
<!--      :user-name="currentUser.name"-->
<!--      :company-name="currentUser.company"-->
<!--      :notification-count="notificationCount"-->
<!--    />-->

    <div class="settings-container">
      <!-- Contenu Mon Profil -->
      <div v-if="activeTab === 'profile'" class="tab-content">
        <div class="profile-section">
          <div class="avatars-section">
            <div class="avatars">
              {{ userStore.userInitials }}
            </div>
            <button class="btn-secondary">Changer la photo</button>
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

            <div class="form-group">
              <label>Poste</label>
              <input
                v-model="userStore.jobTitle"
                type="text"
                :disabled="!isEditingManager"
              />
            </div>

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
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/composables/userStore';
import dashboardCss from "../assets/css/toke-dMain-04.css?url"
import HeadBuilder from '@/utils/HeadBuilder';
import UserService from '../service/UserService';
import type { Status } from '@/utils/interfaces/team.interface';
import profileCss from '../assets/css/toke-profile-16.css?url';
const userStore = useUserStore()

const activeTab = ref('profile');
const isEditingManager = ref(false);
const editingMemberId = ref<string | null>(null);
const activeEmployeeMenu = ref<number | null>(null)

// Données de l'équipe depuis l'API
const teamEmployees = ref<Status[]>([]);
const teamBackup = ref<Record<string, any>>({});

const lastName = computed({
  get: () => userStore.user?.last_name ?? '',
  set: v => {
    if (userStore.user) userStore.user.last_name = v
  }
})

const currentUser = computed(() => ({
  name: userStore.fullName || 'Manager',
  company: userStore.tenantName || 'N/A'
}))
const notificationCount = ref(2)

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
})

// const handleFileUpload = (event: Event) => {
//   const target = event.target as HTMLInputElement;
//   const file = target.files?.[0];
//
//   if (file) {
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       formData.avatar = e.target?.result as string;
//     };
//     reader.readAsDataURL(file);
//   }
// };
//
// const removePhoto = () => {
//   formData.avatar = '';
// };

const saveManagerInfo = () => {
  console.log('Sauvegarde des informations du manager');
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
  // TODO: Implémenter l'appel API pour sauvegarder les modifications
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
    // TODO: Implémenter l'appel API pour supprimer le membre
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
}

const loadTeamData = async () => {
  try {
    const response = await UserService.listAttendance(userStore.user?.guid!);
    if (response.data?.data) {
      teamEmployees.value = response.data.data.statuses || [];
    }
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
})
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background-color: rgba(195, 207, 226, 0.53);
}

.settings-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.no-employees {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  gap: 1rem;
}

.no-employees .icon-lg {
  width: 64px;
  height: 64px;
  color: #9ca3af;
}

.no-employees p {
  font-size: 1.125rem;
  margin: 0;
}

.icon-calendar::before {
  content: '📅';
}
</style>