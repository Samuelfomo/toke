<template>
  <div class="employee-form-overlay" @click="closeForm">
    <div class="employee-form-container" @click.stop>
      <div class="form-header">
        <div class="header-content">
          <div class="header-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z">
              </path>
            </svg>
          </div>
          <div>
            <h2 class="form-title">{{ isEditing ? 'Modifier un employé' : 'Nouvel employé' }}</h2>
            <p class="form-subtitle">Remplissez tous les champs pour créer le profil</p>
          </div>
        </div>
        <button @click="closeForm" class="close-button">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="employee-form">
        <!-- Photo de profil -->
        <div class="form-section">
          <h3 class="section-title">Photo de profil</h3>
          <div class="photo-upload-area">
            <div class="avatar-preview" :class="{ 'has-image': formData.avatar }">
              <img v-if="formData.avatar" :src="formData.avatar" alt="Avatar preview">
              <div v-else class="avatar-placeholder">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z">
                  </path>
                </svg>
              </div>
            </div>
            <div class="upload-actions">
              <label class="upload-button">
                <input type="file" @change="handleFileUpload" accept="image/*" hidden>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12">
                  </path>
                </svg>
                Téléverser une photo
              </label>
              <button v-if="formData.avatar" type="button" @click="removePhoto" class="remove-button">
                Supprimer
              </button>
            </div>
          </div>
        </div>

        <!-- Informations personnelles -->
        <div class="form-section">
          <h3 class="section-title">
            <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z">
              </path>
            </svg>
            Informations personnelles
          </h3>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label required">Prénom</label>
              <input
                v-model="formData.firstName"
                type="text"
                class="form-input"
                :class="{ 'error': errors.firstName }"
                placeholder="Jean"
                required
              >
              <span v-if="errors.firstName" class="error-message">{{ errors.firstName }}</span>
            </div>

            <div class="form-group">
              <label class="form-label required">Nom</label>
              <input
                v-model="formData.lastName"
                type="text"
                class="form-input"
                :class="{ 'error': errors.lastName }"
                placeholder="Tientcheu"
                required
              >
              <span v-if="errors.lastName" class="error-message">{{ errors.lastName }}</span>
            </div>

            <div class="form-group">
              <label class="form-label required">Email</label>
              <input
                v-model="formData.email"
                type="email"
                class="form-input"
                :class="{ 'error': errors.email }"
                placeholder="jean.tientcheu@company.com"
                required
              >
              <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
            </div>

            <div class="form-group">
              <label class="form-label required">Téléphone</label>
              <input
                v-model="formData.phone"
                type="tel"
                class="form-input"
                :class="{ 'error': errors.phone }"
                placeholder="+237 6 93 46  94 62"
                required
              >
              <span v-if="errors.phone" class="error-message">{{ errors.phone }}</span>
            </div>

            <div class="form-group">
              <label class="form-label required">Date de naissance</label>
              <input
                v-model="formData.birthDate"
                type="date"
                class="form-input"
                :class="{ 'error': errors.birthDate }"
                required
              >
              <span v-if="errors.birthDate" class="error-message">{{ errors.birthDate }}</span>
            </div>

            <div class="form-group">
              <label class="form-label required">Genre</label>
              <select v-model="formData.gender" class="form-select" :class="{ 'error': errors.gender }" required>
                <option value="">Sélectionner</option>
                <option value="male">Masculin</option>
                <option value="female">Feminin</option>
              </select>
              <span v-if="errors.gender" class="error-message">{{ errors.gender }}</span>
            </div>
          </div>
        </div>

        <!-- Adresse -->
        <div class="form-section">
          <h3 class="section-title">
            <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z">
              </path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            Adresse
          </h3>
          <div class="form-grid">

            <div class="form-group">
              <label class="form-label required">Ville</label>
              <input
                v-model="formData.address.city"
                type="text"
                class="form-input"
                placeholder="Douala"
                required
              >
            </div>

            <div class="form-group full-width">
              <label class="form-label required">Pays</label>
              <select v-model="formData.address.country" class="form-select" required>
                <option value="">Sélectionner un pays</option>
                <option value="FR">Cameroun</option>
                <option value="BE">Congo</option>
                <option value="CH">Cote d'ivoire</option>
                <option value="CA">RDC</option>
                <option value="LU">Tchad</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Informations professionnelles -->
        <div class="form-section">
          <h3 class="section-title">
            <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z">
              </path>
            </svg>
            Informations professionnelles
          </h3>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label required">Matricule</label>
              <input
                v-model="formData.employeeId"
                type="text"
                class="form-input"
                :class="{ 'error': errors.employeeId }"
                placeholder="EMP-2024-001"
                required
              >
              <span v-if="errors.employeeId" class="error-message">{{ errors.employeeId }}</span>
            </div>

            <div class="form-group">
              <label class="form-label required">Poste</label>
              <input
                v-model="formData.position"
                type="text"
                class="form-input"
                :class="{ 'error': errors.position }"
                placeholder="Développeur Full Stack"
                required
              >
              <span v-if="errors.position" class="error-message">{{ errors.position }}</span>
            </div>

            <div class="form-group">
              <label class="form-label required">Département</label>
              <input
                v-model="formData.phone"
                type="tel"
                class="form-input"
                :class="{ 'error': errors.phone }"
                placeholder="Informatique"
                required
              >
              <span v-if="errors.phone" class="error-message">{{ errors.phone }}</span>
            </div>

            <div class="form-group">
              <label class="form-label required">Site de travail</label>
              <select v-model="formData.siteId" class="form-select" :class="{ 'error': errors.siteId }" required>
                <option value="">Sélectionner un site</option>
                <option v-for="site in sites" :key="site.id" :value="site.id">
                  {{ site.name }}
                </option>
              </select>
              <span v-if="errors.siteId" class="error-message">{{ errors.siteId }}</span>
            </div>

            <div class="form-group">
              <label class="form-label required">Type de contrat</label>
              <select v-model="formData.contractType" class="form-select" required>
                <option value="">Sélectionner</option>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="Alternance">Alternance</option>
                <option value="Stage">Stage</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label required">Date d'entrée</label>
              <input
                v-model="formData.hireDate"
                type="date"
                class="form-input"
                :class="{ 'error': errors.hireDate }"
                required
              >
              <span v-if="errors.hireDate" class="error-message">{{ errors.hireDate }}</span>
            </div>

            <div class="form-group">
              <label class="form-label">Manager</label>
              <select v-model="formData.managerId" class="form-select">
                <option value="">Aucun manager</option>
                <option v-for="manager in managers" :key="manager.id" :value="manager.id">
                  {{ manager.name }}
                </option>
              </select>
            </div>
          </div>
        </div>
        <!-- Actions -->
        <div class="form-actions">
          <button type="button" @click="closeForm" class="btn-cancel">
            Annuler
          </button>
          <button type="submit" class="btn-submit" :disabled="isSubmitting">
            <span v-if="!isSubmitting">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              {{ isEditing ? 'Mettre à jour' : 'Créer l\'employé' }}
            </span>
            <span v-else class="loading-spinner">
              <svg class="spinner" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Enregistrement...
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import "../assets/css/employeeForm-toke-15.css"
interface Props {
  employee?: any;
  sites?: any[];
  managers?: any[];
}

const props = withDefaults(defineProps<Props>(), {
  sites: () => [
    { id: 1, name: 'Total Makepe' },
    { id: 2, name: 'Total Bedi' },
    { id: 3, name: 'Total Akwa' }
  ],
  managers: () => [
    { id: 1, name: 'Danielle - Manager IT' },
    { id: 2, name: 'Pierre - Manager RH' }
  ]
});

const emit = defineEmits(['close', 'submit']);

const isEditing = computed(() => !!props.employee);
const isSubmitting = ref(false);

const formData = reactive({
  avatar: props.employee?.avatar || '',
  firstName: props.employee?.firstName || '',
  lastName: props.employee?.lastName || '',
  email: props.employee?.email || '',
  phone: props.employee?.phone || '',
  birthDate: props.employee?.birthDate || '',
  gender: props.employee?.gender || '',
  address: {
    street: props.employee?.address?.street || '',
    zipCode: props.employee?.address?.zipCode || '',
    city: props.employee?.address?.city || '',
    country: props.employee?.address?.country || 'FR'
  },
  employeeId: props.employee?.employeeId || '',
  position: props.employee?.position || '',
  department: props.employee?.department || '',
  siteId: props.employee?.siteId || '',
  contractType: props.employee?.contractType || '',
  hireDate: props.employee?.hireDate || '',
  managerId: props.employee?.managerId || '',
  salary: props.employee?.salary || '',
  workSchedule: {
    startTime: props.employee?.workSchedule?.startTime || '09:00',
    endTime: props.employee?.workSchedule?.endTime || '17:00',
    workDays: props.employee?.workSchedule?.workDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  },
  bankInfo: {
    iban: props.employee?.bankInfo?.iban || '',
    bic: props.employee?.bankInfo?.bic || '',
    bankName: props.employee?.bankInfo?.bankName || ''
  },
  emergencyContact: {
    name: props.employee?.emergencyContact?.name || '',
    relationship: props.employee?.emergencyContact?.relationship || '',
    phone: props.employee?.emergencyContact?.phone || ''
  },
  skills: props.employee?.skills || '',
  notes: props.employee?.notes || ''
});

const errors = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthDate: '',
  gender: '',
  employeeId: '',
  position: '',
  department: '',
  siteId: '',
  hireDate: ''
});

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      formData.avatar = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};

const removePhoto = () => {
  formData.avatar = '';
};

const validateForm = (): boolean => {
  let isValid = true;

  // Reset errors
  Object.keys(errors).forEach(key => {
    errors[key as keyof typeof errors] = '';
  });

  // Validate required fields
  if (!formData.firstName.trim()) {
    errors.firstName = 'Le prénom est requis';
    isValid = false;
  }

  if (!formData.lastName.trim()) {
    errors.lastName = 'Le nom est requis';
    isValid = false;
  }

  if (!formData.email.trim()) {
    errors.email = 'L\'email est requis';
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Email invalide';
    isValid = false;
  }

  if (!formData.phone.trim()) {
    errors.phone = 'Le téléphone est requis';
    isValid = false;
  }

  if (!formData.employeeId.trim()) {
    errors.employeeId = 'Le matricule est requis';
    isValid = false;
  }

  if (!formData.position.trim()) {
    errors.position = 'Le poste est requis';
    isValid = false;
  }

  return isValid;
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    emit('submit', {
      ...formData,
      id: props.employee?.id || Date.now(),
      name: `${formData.firstName} ${formData.lastName}`,
      initials: `${formData.firstName[0]}${formData.lastName[0]}`.toUpperCase()
    });

    closeForm();
  } catch (error) {
    console.error('Error submitting form:', error);
  } finally {
    isSubmitting.value = false;
  }
};

const closeForm = () => {
  emit('close');
};
</script>