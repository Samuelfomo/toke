<template>
  <div class="overlay" @click="closeForm" aria-label="Fermer">
    <Transition name="slide-up" appear>
      <div class="form-panel" @click.stop>

        <!-- Header -->
        <div class="panel-header">
          <div class="header-left">
            <div class="header-badge">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
              </svg>
            </div>
            <div>
              <h2 class="panel-title">{{ isEditing ? 'Modifier l\'employé' : 'Nouvel employé' }}</h2>
              <p class="panel-subtitle">{{ isEditing ? 'Mettez à jour les informations du profil' : 'Remplissez les champs pour créer le profil' }}</p>
            </div>
          </div>
          <button @click="closeForm" class="close-btn" aria-label="Fermer">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="form-body">

          <!-- Avatar Section -->
          <div class="avatar-section">
            <div class="avatar-ring">
              <div class="avatar-circle" :class="{ 'has-img': formData.avatar }">
                <img v-if="formData.avatar" :src="formData.avatar" alt="Avatar" class="avatar-img"/>
                <div v-else class="avatar-icon">
                  <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
              </div>
            </div>
            <div class="avatar-meta">
              <p class="avatar-name">{{ formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}`.trim() : 'Nouveau profil' }}</p>
              <div class="avatar-actions">
                <label class="btn-upload">
                  <input type="file" @change="handleFileUpload" accept="image/*" hidden/>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                  Choisir une photo
                </label>
                <button v-if="formData.avatar" type="button" @click="removePhoto" class="btn-remove-photo">
                  Supprimer
                </button>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="section-divider">
            <span class="divider-label">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              Informations personnelles
            </span>
          </div>

          <!-- Personal Info Grid -->
          <div class="fields-grid">
            <div class="field-group">
              <label class="field-label">Prénom <span class="req">*</span></label>
              <div class="input-wrap" :class="{ 'has-error': errors.firstName }">
                <input v-model="formData.firstName" type="text" class="field-input" placeholder="Jean"/>
              </div>
              <p v-if="errors.firstName" class="field-error">{{ errors.firstName }}</p>
            </div>

            <div class="field-group">
              <label class="field-label">Nom <span class="req">*</span></label>
              <div class="input-wrap" :class="{ 'has-error': errors.lastName }">
                <input v-model="formData.lastName" type="text" class="field-input" placeholder="Tientcheu"/>
              </div>
              <p v-if="errors.lastName" class="field-error">{{ errors.lastName }}</p>
            </div>

            <div class="field-group">
              <label class="field-label">Adresse email <span class="req">*</span></label>
              <div class="input-wrap" :class="{ 'has-error': errors.email }">
                <span class="input-icon">
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </span>
                <input v-model="formData.email" type="email" class="field-input has-icon" placeholder="jean.tientcheu@company.com"/>
              </div>
              <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
            </div>

            <div class="field-group">
              <label class="field-label">Numéro WhatsApp <span class="req">*</span></label>
              <div class="input-wrap" :class="{ 'has-error': errors.phone }">
                <span class="input-icon">
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                </span>
                <input v-model="formData.phone" type="tel" class="field-input has-icon" placeholder="+237 6 93 46 94 62"/>
              </div>
              <p v-if="errors.phone" class="field-error">{{ errors.phone }}</p>
            </div>
          </div>

          <!-- Divider -->
          <div class="section-divider">
            <span class="divider-label">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              Informations professionnelles
            </span>
          </div>

          <!-- Professional Info Grid -->
          <div class="fields-grid">
            <div class="field-group">
              <label class="field-label">Code employé <span class="req">*</span></label>
              <div class="input-wrap" :class="{ 'has-error': errors.employeeId }">
                <span class="input-icon">
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0"/>
                  </svg>
                </span>
                <input v-model="formData.employeeId" type="text" class="field-input has-icon" placeholder="EMP-2024-001"/>
              </div>
              <p v-if="errors.employeeId" class="field-error">{{ errors.employeeId }}</p>
            </div>

            <div class="field-group">
              <label class="field-label">Poste <span class="req">*</span></label>
              <div class="input-wrap" :class="{ 'has-error': errors.position }">
                <input v-model="formData.position" type="text" class="field-input" placeholder="Développeur Full Stack"/>
              </div>
              <p v-if="errors.position" class="field-error">{{ errors.position }}</p>
            </div>

            <div class="field-group">
              <label class="field-label">Département <span class="req">*</span></label>
              <div class="input-wrap">
                <input v-model="formData.department" type="text" class="field-input" placeholder="Informatique"/>
              </div>
            </div>

            <div class="field-group">
              <label class="field-label">Date d'embauche <span class="req">*</span></label>
              <div class="input-wrap" :class="{ 'has-error': errors.hireDate }">
                <span class="input-icon">
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </span>
                <input v-model="formData.hireDate" type="date" class="field-input has-icon"/>
              </div>
              <p v-if="errors.hireDate" class="field-error">{{ errors.hireDate }}</p>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="form-footer">
            <button type="button" @click="closeForm" class="btn-cancel">
              Annuler
            </button>
            <button type="submit" class="btn-submit" :disabled="isSubmitting">
              <template v-if="!isSubmitting">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
                {{ isEditing ? 'Mettre à jour' : 'Créer l\'employé' }}
              </template>
              <template v-else>
                <svg class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="40 20" fill="none"/>
                </svg>
                Enregistrement…
              </template>
            </button>
          </div>

        </form>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';

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

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', data: any): void
}>();

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
    country: props.employee?.address?.country || 'CM'
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
  bankInfo: { iban: '', bic: '', bankName: '' },
  emergencyContact: { name: '', relationship: '', phone: '' },
  skills: props.employee?.skills || '',
  notes: props.employee?.notes || ''
});

const errors = reactive({
  firstName: '', lastName: '', email: '', phone: '',
  birthDate: '', gender: '', employeeId: '', position: '',
  department: '', siteId: '', hireDate: ''
});

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => { formData.avatar = e.target?.result as string; };
    reader.readAsDataURL(file);
  }
};

const removePhoto = () => { formData.avatar = ''; };

const validateForm = (): boolean => {
  let valid = true;
  Object.keys(errors).forEach(k => errors[k as keyof typeof errors] = '');

  if (!formData.firstName.trim()) { errors.firstName = 'Le prénom est requis'; valid = false; }
  if (!formData.lastName.trim()) { errors.lastName = 'Le nom est requis'; valid = false; }
  if (!formData.email.trim()) { errors.email = "L'email est requis"; valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { errors.email = 'Email invalide'; valid = false; }
  if (!formData.phone.trim()) { errors.phone = 'Le téléphone est requis'; valid = false; }
  if (!formData.employeeId.trim()) { errors.employeeId = 'Le matricule est requis'; valid = false; }
  if (!formData.position.trim()) { errors.position = 'Le poste est requis'; valid = false; }

  return valid;
};

const handleSubmit = async () => {
  if (!validateForm()) return;
  isSubmitting.value = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    emit('submit', {
      ...formData,
      id: props.employee?.id || Date.now(),
      name: `${formData.firstName} ${formData.lastName}`,
      initials: `${formData.firstName[0]}${formData.lastName[0]}`.toUpperCase()
    });
    closeForm();
  } catch (e) {
    console.error('Erreur soumission:', e);
  } finally {
    isSubmitting.value = false;
  }
};

const closeForm = () => {
  console.log('🚪 EmployeeForm → close émis');
  emit('close');
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

/* ─── Overlay ──────────────────────────────────────────────────────── */
.overlay {
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 999;
  padding: 20px;
  font-family: 'Sora', sans-serif;
}

/* ─── Panel ────────────────────────────────────────────────────────── */
.form-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Header ───────────────────────────────────────────────────────── */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
}

.header-left { display: flex; align-items: center; gap: 14px; }

.header-badge {
  width: 42px; height: 42px;
  border-radius: 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  display: flex; align-items: center; justify-content: center;
  color: #004AAD;
  flex-shrink: 0;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.3px;
}

.panel-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.close-btn {
  width: 34px; height: 34px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #94a3b8;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.close-btn:hover {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #ef4444;
}

/* ─── Form Body ────────────────────────────────────────────────────── */
.form-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  background: #ffffff;
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
}

/* ─── Avatar ───────────────────────────────────────────────────────── */
.avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.avatar-ring {
  padding: 3px;
  border-radius: 50%;
  background: linear-gradient(135deg, #93c5fd, #004aad);
  flex-shrink: 0;
}

.avatar-circle {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: #e2e8f0;
  border: 2px solid #ffffff;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  color: #94a3b8;
}

.avatar-img { width: 100%; height: 100%; object-fit: cover; }

.avatar-meta { flex: 1; }

.avatar-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 8px;
}

.avatar-actions { display: flex; gap: 8px; align-items: center; }

.btn-upload {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  font-family: 'Sora', sans-serif;
  color: #004AAD;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-upload:hover {
  background: #dbeafe;
  border-color: #93c5fd;
}

.btn-remove-photo {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  font-family: 'Sora', sans-serif;
  color: #ef4444;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-remove-photo:hover {
  background: #fee2e2;
}

/* ─── Section Divider ──────────────────────────────────────────────── */
.section-divider {
  display: flex;
  align-items: center;
  gap: 12px;
}
.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}
.divider-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  white-space: nowrap;
}

/* ─── Fields Grid ──────────────────────────────────────────────────── */
.fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.field-group { display: flex; flex-direction: column; gap: 5px; }

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  letter-spacing: 0.02em;
}

.req { color: #004AAD; }

.input-wrap {
  position: relative;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.input-wrap:focus-within {
  border-color: #004AAD;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
.input-wrap.has-error {
  border-color: #f87171;
}
.input-wrap.has-error:focus-within {
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.1);
}

.input-icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
  display: flex; align-items: center;
}

.field-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  font-family: 'Sora', sans-serif;
  color: #111827;
  background: transparent;
  border: none;
  outline: none;
  border-radius: 8px;
}
.field-input.has-icon { padding-left: 34px; }
.field-input::placeholder { color: #9ca3af; }

.field-input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.5;
}

.field-error {
  font-size: 11px;
  color: #ef4444;
  font-weight: 500;
}

/* ─── Footer ───────────────────────────────────────────────────────── */
.form-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  margin-top: 4px;
}

.btn-cancel {
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  color: #64748b;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-cancel:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #374151;
}

.btn-submit {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 22px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  color: #ffffff;
  background: #004AAD;
  border: 1px solid #2563eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-submit:hover:not(:disabled) {
  background: #004AAD;
}
.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Transitions ──────────────────────────────────────────────────── */
.slide-up-enter-active { animation: slideUp 0.25s cubic-bezier(0.34, 1.2, 0.64, 1); }
.slide-up-leave-active { animation: slideUp 0.18s ease reverse; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ─── Responsive ───────────────────────────────────────────────────── */
@media (max-width: 540px) {
  .fields-grid { grid-template-columns: 1fr; }
  .avatar-section { flex-direction: column; text-align: center; }
  .avatar-actions { justify-content: center; }
  .form-footer { flex-direction: column-reverse; }
  .btn-cancel, .btn-submit { width: 100%; justify-content: center; }
  .panel-header, .form-body { padding-left: 18px; padding-right: 18px; }
}
</style>