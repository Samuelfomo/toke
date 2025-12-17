<template>
  <div class="modal-overlay-wrapper">
    <a href="/dashboard" @click.prevent="goBack" class="back-arrow-link">
      <IconArrowLeft />
    </a>

    <div class="modal-attendance-card">
      <div class="modal-profile-summary">
        <div class="modal-header">
          <div v-if="employee.avatar"
               class="modal-avatar"
               :style="{ backgroundImage: `url(${employee.avatar})` }">
          </div>
          <div v-else class="modal-avatar">
            {{ employee.initials || getInitials(employee.name) }}
          </div>
          <div>
            <h3 class="modal-employee-name">{{ employee.name }}</h3>
            <p v-if="employee.location" class="modal-employee-department">
              {{ employee.location }}
            </p>
          </div>
        </div>
        <span :class="['modal-status-badge', 'status-' + employee.status]">
          {{ employee.statusText }}
        </span>
      </div>

      <div class="modal-info-grid">
        <!-- ======= EMPLOYÉ PRÉSENT OU EN RETARD ======= -->
        <div v-if="employee.status === 'present' || employee.status === 'late'"
             class="modal-info-item modal-arrival-time">
          <IconClock class="modal-info-icon" />
          <div>
            <span class="modal-info-label">Heure d'arrivée</span>
            <span class="modal-info-value">
              {{ formatTime(employee.checkInTime || employee.time) }}
            </span>
          </div>
        </div>

        <!-- ======= EMPLOYÉ EN RETARD ======= -->
        <div v-if="employee.status === 'late'"
             class="modal-info-item modal-late-detail">
          <IconAlertTriangle class="modal-info-icon" />
          <div>
            <span class="modal-info-label">Durée du retard</span>
            <span class="modal-info-value modal-info-value-warning">
              {{ employee.lateDuration || 'N/A' }}
            </span>
          </div>
        </div>

        <!-- MOTIF DU RETARD -->
        <div v-if="employee.status === 'late' && employee.motif"
             class="modal-info-item modal-location-detail">
          <IconNote class="modal-info-icon" />
          <div>
            <span class="modal-info-label">Motif du retard</span>
            <span class="modal-info-value">{{ employee.motif }}</span>
          </div>
        </div>

        <!-- ======= EMPLOYÉ ABSENT ======= -->
        <div v-if="employee.status === 'absent'"
             class="modal-info-item modal-absence-detail">
          <IconCalendarOff class="modal-info-icon" />
          <div>
            <span class="modal-info-label">Statut de l'absence</span>
            <span class="modal-info-value modal-info-value-critical">
              {{ employee.absenceReason || 'Non justifiée' }}
            </span>
          </div>
        </div>

        <!-- Justification si disponible -->
        <div v-if="employee.status === 'absent' && employee.isJustified && employee.motif"
             class="modal-info-item modal-location-detail">
          <IconNote class="modal-info-icon" />
          <div>
            <span class="modal-info-label">Motif</span>
            <span class="modal-info-value">{{ employee.motif }}</span>
          </div>
        </div>

        <!-- ======= JOUR DE REPOS ======= -->
        <div v-if="employee.status === 'off-day'"
             class="modal-info-item modal-location-detail">
          <IconCalendarOff class="modal-info-icon" />
          <div>
            <span class="modal-info-label">Information</span>
            <span class="modal-info-value">
              Employé en jour de repos planifié
            </span>
          </div>
        </div>

        <!-- ======= EMPLOYÉ EN FORMATION/CONGÉ ======= -->
        <div v-if="employee.status === 'info' && employee.location"
             class="modal-info-item modal-location-detail">
          <IconMapPin class="modal-info-icon" />
          <div>
            <span class="modal-info-label">Détails</span>
            <span class="modal-info-value">{{ employee.location }}</span>
          </div>
        </div>

        <!-- Informations de contact -->
        <div v-if="employee.email" class="modal-info-item">
          <IconMail class="modal-info-icon" />
          <div>
            <span class="modal-info-label">Email</span>
            <span class="modal-info-value">{{ employee.email }}</span>
          </div>
        </div>

        <div v-if="employee.matricule" class="modal-info-item">
          <IconAlertOctagon class="modal-info-icon" />
          <div>
            <span class="modal-info-label">Matricule</span>
            <span class="modal-info-value">{{ employee.matricule }}</span>
          </div>
        </div>
      </div>

      <hr class="modal-separator" />

      <div class="modal-quick-actions">
        <!-- N'afficher "Justifier l'absence" QUE si l'absence n'est pas justifiée -->
        <button v-if="employee.status === 'absent' && !employee.isJustified"
                class="modal-action-btn modal-action-justify"
                :disabled="actionLoading"
                @click="handleAction('justify')">
          <IconNote class="modal-btn-icon" />
          {{ actionLoading ? 'Traitement...' : 'Justifier l\'absence' }}
        </button>

        <!-- Afficher "Valider le retard" seulement si pas encore validé -->
        <button v-if="employee.status === 'late' && !employee.isValidated"
                class="modal-action-btn modal-action-validate"
                :disabled="actionLoading"
                @click="handleAction('validate')">
          <IconCheck class="modal-btn-icon" />
          {{ actionLoading ? 'Validation...' : 'Valider le retard' }}
        </button>

        <!-- Bouton Mémo toujours disponible -->
        <button class="modal-action-btn modal-action-memo"
                :disabled="actionLoading"
                @click="handleAction('memo')">
          <IconMessage class="modal-btn-icon" /> Envoyer un mémo
        </button>

        <!-- Avertir seulement pour les retards et absences non justifiées -->
        <button v-if="(employee.status === 'late' && !employee.isValidated) ||
                       (employee.status === 'absent' && !employee.isJustified)"
                class="modal-action-btn modal-action-warn"
                :disabled="actionLoading"
                @click="handleAction('warn')">
          <IconAlertOctagon class="modal-btn-icon" /> Avertir l'employé
        </button>
      </div>

      <button @click="viewFullProfile" class="modal-full-profile-link">
        <IconUserCircle class="modal-link-icon" /> Voir le profil complet
      </button>

      <!-- Indicateur de chargement -->
      <div v-if="actionLoading" class="modal-loading-overlay">
        <div class="spinner"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import "../assets/css/toke-AssiduteJ-09.css"
import {
  IconArrowLeft,
  IconClock,
  IconAlertTriangle,
  IconMapPin,
  IconCalendarOff,
  IconCheck,
  IconNote,
  IconUserCircle,
  IconMessage,
  IconAlertOctagon,
  IconMail,
  // IconIdCard
} from '@tabler/icons-vue'

interface Employee {
  id: string
  name: string
  status: 'absent' | 'late' | 'present' | 'info' | 'off-day'
  statusText: string
  time?: string
  checkInTime?: string
  lateTime?: string
  lateDuration?: string
  absenceType?: string
  absenceReason?: string
  motif?: string
  isJustified?: boolean
  isValidated?: boolean
  initials?: string
  location?: string
  matricule?: string
  email?: string
  position?: string
  avatar?: string
}

const router = useRouter()
const actionLoading = ref(false)

const props = defineProps<{
  employee: Employee
}>()

const emit = defineEmits<{
  close: []
  actionCompleted: [action: string, employeeId: string]
}>()

const getInitials = (name: string): string => {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

const formatTime = (time?: string): string => {
  if (!time) return 'Non spécifiée'

  try {
    const date = new Date(time)
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return time
  }
}

const viewFullProfile = () => {
  router.push({
    name: 'employee-full-profile',
    params: { employeeId: props.employee.id }
  })
}

const goBack = () => {
  emit('close')
}

const handleAction = async (actionType: 'justify' | 'validate' | 'memo' | 'warn') => {
  actionLoading.value = true

  try {
    // Simuler un délai d'API
    await new Promise(resolve => setTimeout(resolve, 1000))

    switch (actionType) {
      case 'justify':
        console.log(`Justification de l'absence pour ${props.employee.name}`)
        // TODO: Appeler l'API pour justifier l'absence
        // await AbsenceService.justify(props.employee.id, justificationData)
        break

      case 'validate':
        console.log(`Validation du retard pour ${props.employee.name}`)
        // TODO: Appeler l'API pour valider le retard
        // await AttendanceService.validateLate(props.employee.id)
        break

      case 'memo':
        console.log(`Ouverture du mémo pour ${props.employee.name}`)
        router.push({
          name: 'memo',
          params: { employeeId: props.employee.id }
        })
        break

      case 'warn':
        console.log(`Avertissement pour ${props.employee.name}`)
        // TODO: Appeler l'API pour envoyer un avertissement
        // await WarningService.send(props.employee.id)
        break
    }

    // Émettre l'événement pour rafraîchir les données si nécessaire
    emit('actionCompleted', actionType, props.employee.id)

    // Fermer le modal après l'action (sauf pour le mémo qui navigue)
    if (actionType !== 'memo') {
      setTimeout(() => {
        emit('close')
      }, 500)
    }
  } catch (error) {
    console.error('Erreur lors de l\'action:', error)
    alert('Une erreur est survenue. Veuillez réessayer.')
  } finally {
    actionLoading.value = false
  }
}
</script>

<style scoped>
.modal-employee-department {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

.modal-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
  background: #3b82f6;
  color: white;
  background-size: cover;
  background-position: center;
}

.modal-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  z-index: 10;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-info-value-warning {
  color: #d97706;
  font-weight: 600;
}

.modal-info-value-critical {
  color: #dc2626;
  font-weight: 600;
}

.status-off-day {
  background: #dbeafe;
  color: #1e40af;
}

.modal-attendance-card {
  position: relative;
}
</style>

<!--<template>-->
<!--  <div class="modal-overlay-wrapper">-->
<!--    <a href="/dashboard" @click.prevent="goBack" class="back-arrow-link">-->
<!--      <IconArrowLeft />-->
<!--    </a>-->

<!--    <div class="modal-attendance-card">-->
<!--      <div class="modal-profile-summary">-->
<!--        <div class="modal-header">-->
<!--          <div class="modal-avatar">{{ employee.initials || employee.name.substring(0, 2) }}</div>-->
<!--          <h3 class="modal-employee-name">{{ employee.name }}</h3>-->
<!--        </div>-->
<!--        <span :class="['modal-status-badge', 'status-' + employee.status]">-->
<!--            {{ employee.statusText }}-->
<!--          </span>-->
<!--      </div>-->

<!--      <div class="modal-info-grid">-->
<!--        &lt;!&ndash; ======= EMPLOYÉ PRÉSENT OU EN RETARD ======= &ndash;&gt;-->
<!--        <div v-if="employee.status === 'present' || employee.status === 'late'" class="modal-info-item modal-arrival-time">-->
<!--          <IconClock class="modal-info-icon" />-->
<!--          <div>-->
<!--            <span class="modal-info-label">Heure d'arrivée</span>-->
<!--            <span class="modal-info-value">{{ employee.checkInTime || employee.time || 'Non spécifiée' }}</span>-->
<!--          </div>-->
<!--        </div>-->

<!--        &lt;!&ndash; ======= EMPLOYÉ EN RETARD ======= &ndash;&gt;-->
<!--        <div v-if="employee.status === 'late'" class="modal-info-item modal-late-detail">-->
<!--          <IconAlertTriangle class="modal-info-icon" />-->
<!--          <div>-->
<!--            <span class="modal-info-label">Durée du retard</span>-->
<!--            <span class="modal-info-value modal-info-value-warning">{{ employee.lateDuration || employee.lateTime || 'N/A' }}</span>-->
<!--          </div>-->
<!--        </div>-->

<!--        &lt;!&ndash; MOTIF DU RETARD &ndash;&gt;-->
<!--        <div v-if="employee.status === 'late' && employee.motif" class="modal-info-item modal-location-detail">-->
<!--          <IconNote class="modal-info-icon" />-->
<!--          <div>-->
<!--            <span class="modal-info-label">Motif du retard</span>-->
<!--            <span class="modal-info-value">{{ employee.motif }}</span>-->
<!--          </div>-->
<!--        </div>-->

<!--        &lt;!&ndash; ======= EMPLOYÉ ABSENT ======= &ndash;&gt;-->
<!--        <div v-if="employee.status === 'absent'" class="modal-info-item modal-absence-detail">-->
<!--          <IconCalendarOff class="modal-info-icon" />-->
<!--          <div>-->
<!--            <span class="modal-info-label">Motif de l'absence</span>-->
<!--            <span class="modal-info-value modal-info-value-critical">-->
<!--                {{ employee.absenceReason || employee.absenceType || 'Non justifiée' }}-->
<!--              </span>-->
<!--          </div>-->
<!--        </div>-->

<!--        &lt;!&ndash; ======= EMPLOYÉ EN FORMATION/CONGÉ ======= &ndash;&gt;-->
<!--        <div v-if="employee.status === 'info' && employee.location" class="modal-info-item modal-location-detail">-->
<!--          <IconMapPin class="modal-info-icon" />-->
<!--          <div>-->
<!--            <span class="modal-info-label">Détails</span>-->
<!--            <span class="modal-info-value">{{ employee.location }}</span>-->
<!--          </div>-->
<!--        </div>-->
<!--      </div>-->

<!--      <hr class="modal-separator" />-->

<!--      <div class="modal-quick-actions">-->
<!--        &lt;!&ndash; N'afficher "Justifier l'absence" QUE si l'absence n'est pas justifiée &ndash;&gt;-->
<!--        <button v-if="employee.status === 'absent' && !employee.isJustified"-->
<!--                class="modal-action-btn modal-action-justify"-->
<!--                @click="handleAction('justify')">-->
<!--          <IconNote class="modal-btn-icon" /> Justifier l'absence-->
<!--        </button>-->

<!--        &lt;!&ndash; Afficher "Valider le retard" seulement si pas encore validé &ndash;&gt;-->
<!--        <button v-if="employee.status === 'late' && !employee.isValidated"-->
<!--                class="modal-action-btn modal-action-validate"-->
<!--                @click="handleAction('validate')">-->
<!--          <IconCheck class="modal-btn-icon" /> Valider le retard-->
<!--        </button>-->

<!--        &lt;!&ndash; Bouton Mémo toujours disponible &ndash;&gt;-->
<!--        <button class="modal-action-btn modal-action-memo"-->
<!--                @click="handleAction('memo')">-->
<!--          <IconMessage class="modal-btn-icon" /> Envoyer un mémo-->
<!--        </button>-->

<!--        &lt;!&ndash; Avertir seulement pour les retards et absences non justifiées &ndash;&gt;-->
<!--        <button v-if="(employee.status === 'late' && !employee.isValidated) || (employee.status === 'absent' && !employee.isJustified)"-->
<!--                class="modal-action-btn modal-action-warn"-->
<!--                @click="handleAction('warn')">-->
<!--          <IconAlertOctagon class="modal-btn-icon" /> Avertir l'employé-->
<!--        </button>-->
<!--      </div>-->

<!--      <button @click="viewFullProfile" class="modal-full-profile-link">-->
<!--        <IconUserCircle class="modal-link-icon" /> Voir le profil complet-->
<!--      </button>-->
<!--    </div>-->
<!--  </div>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import { defineProps, ref } from 'vue';-->
<!--import { useRouter } from 'vue-router';-->
<!--import "../assets/css/toke-AssiduteJ-09.css";-->
<!--import {-->
<!--  IconArrowLeft,-->
<!--  IconClock,-->
<!--  IconAlertTriangle,-->
<!--  IconMapPin,-->
<!--  IconCalendarOff,-->
<!--  IconCheck,-->
<!--  IconNote,-->
<!--  IconUserCircle,-->
<!--  IconMessage,-->
<!--  IconAlertOctagon-->
<!--} from '@tabler/icons-vue';-->

<!--interface Employee {-->
<!--  id: number;-->
<!--  name: string;-->
<!--  status: 'absent' | 'late' | 'present' | 'info';-->
<!--  statusText: string;-->
<!--  time?: string;-->
<!--  checkInTime?: string;-->
<!--  lateTime?: string;-->
<!--  lateDuration?: string;-->
<!--  absenceType?: string;-->
<!--  absenceReason?: string;-->
<!--  motif?: string;-->
<!--  isJustified?: boolean;-->
<!--  isValidated?: boolean;-->
<!--  initials?: string;-->
<!--  location?: string;-->
<!--  matricule?: string;-->
<!--  email?: string;-->
<!--  position?: string;-->
<!--}-->

<!--const router = useRouter();-->
<!--const loading = ref(false);-->

<!--const props = defineProps<{-->
<!--  employee: Employee-->
<!--}>();-->

<!--const emit = defineEmits<{-->
<!--  close: []-->
<!--}>();-->

<!--const viewFullProfile = () => {-->
<!--  router.push({-->
<!--    name: 'employee-full-profile',-->
<!--    params: { employeeId: props.employee.id },-->
<!--  });-->
<!--};-->

<!--const goBack = () => {-->
<!--  emit('close');-->
<!--};-->

<!--const handleAction = (actionType: 'justify' | 'validate' | 'memo' | 'warn') => {-->
<!--  switch (actionType) {-->
<!--    case 'justify':-->
<!--      alert(`Justification de l'absence pour ${props.employee.name} en cours...`);-->
<!--      // Émettre un événement pour mettre à jour l'employé-->
<!--      // emit('action-justified', props.employee.id);-->
<!--      break;-->
<!--    case 'validate':-->
<!--      alert(`Retard de ${props.employee.name} validé !`);-->
<!--      // emit('action-validated', props.employee.id);-->
<!--      break;-->
<!--    case 'memo':-->
<!--      alert(`Ouverture de la fenêtre de mémo pour ${props.employee.name}...`);-->
<!--      // router.push({ name: 'memo', params: { employeeId: props.employee.id } });-->
<!--      break;-->
<!--    case 'warn':-->
<!--      alert(`Avertissement formel généré pour ${props.employee.name}.`);-->
<!--      break;-->
<!--  }-->
<!--};-->
<!--</script>-->

<!--<style scoped>-->
<!--</style>-->