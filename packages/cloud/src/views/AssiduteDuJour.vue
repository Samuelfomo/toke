<template>
  <div class="modal-overlay-wrapper">
    <a href="/dashboard" @click.prevent="goBack" class="back-arrow-link">
      <IconArrowLeft />
    </a>

    <div class="modal-attendance-card">
      <div class="modal-profile-summary">
        <div class="modal-header">
          <div class="modal-avatar">{{ employee.initials || employee.name.substring(0, 2) }}</div>
          <h3 class="modal-employee-name">{{ employee.name }}</h3>
        </div>
        <span :class="['modal-status-badge', 'status-' + employee.status]">
            {{ employee.statusText }}
          </span>
      </div>

      <div class="modal-info-grid">
        <!-- ======= EMPLOYÉ PRÉSENT OU EN RETARD ======= -->
        <div v-if="employee.status === 'present' || employee.status === 'late'" class="modal-info-item modal-arrival-time">
          <IconClock class="modal-info-icon" />
          <div>
            <span class="modal-info-label">Heure d'arrivée</span>
            <span class="modal-info-value">{{ employee.checkInTime || employee.time || 'Non spécifiée' }}</span>
          </div>
        </div>

        <!-- ======= EMPLOYÉ EN RETARD ======= -->
        <div v-if="employee.status === 'late'" class="modal-info-item modal-late-detail">
          <IconAlertTriangle class="modal-info-icon" />
          <div>
            <span class="modal-info-label">Durée du retard</span>
            <span class="modal-info-value modal-info-value-warning">{{ employee.lateDuration || employee.lateTime || 'N/A' }}</span>
          </div>
        </div>

        <!-- MOTIF DU RETARD -->
        <div v-if="employee.status === 'late' && employee.motif" class="modal-info-item modal-location-detail">
          <IconNote class="modal-info-icon" />
          <div>
            <span class="modal-info-label">Motif du retard</span>
            <span class="modal-info-value">{{ employee.motif }}</span>
          </div>
        </div>

        <!-- ======= EMPLOYÉ ABSENT ======= -->
        <div v-if="employee.status === 'absent'" class="modal-info-item modal-absence-detail">
          <IconCalendarOff class="modal-info-icon" />
          <div>
            <span class="modal-info-label">Motif de l'absence</span>
            <span class="modal-info-value modal-info-value-critical">
                {{ employee.absenceReason || employee.absenceType || 'Non justifiée' }}
              </span>
          </div>
        </div>

        <!-- ======= EMPLOYÉ EN FORMATION/CONGÉ ======= -->
        <div v-if="employee.status === 'info' && employee.location" class="modal-info-item modal-location-detail">
          <IconMapPin class="modal-info-icon" />
          <div>
            <span class="modal-info-label">Détails</span>
            <span class="modal-info-value">{{ employee.location }}</span>
          </div>
        </div>
      </div>

      <hr class="modal-separator" />

      <div class="modal-quick-actions">
        <!-- N'afficher "Justifier l'absence" QUE si l'absence n'est pas justifiée -->
        <button v-if="employee.status === 'absent' && !employee.isJustified"
                class="modal-action-btn modal-action-justify"
                @click="handleAction('justify')">
          <IconNote class="modal-btn-icon" /> Justifier l'absence
        </button>

        <!-- Afficher "Valider le retard" seulement si pas encore validé -->
        <button v-if="employee.status === 'late' && !employee.isValidated"
                class="modal-action-btn modal-action-validate"
                @click="handleAction('validate')">
          <IconCheck class="modal-btn-icon" /> Valider le retard
        </button>

        <!-- Bouton Mémo toujours disponible -->
        <button class="modal-action-btn modal-action-memo"
                @click="handleAction('memo')">
          <IconMessage class="modal-btn-icon" /> Envoyer un mémo
        </button>

        <!-- Avertir seulement pour les retards et absences non justifiées -->
        <button v-if="(employee.status === 'late' && !employee.isValidated) || (employee.status === 'absent' && !employee.isJustified)"
                class="modal-action-btn modal-action-warn"
                @click="handleAction('warn')">
          <IconAlertOctagon class="modal-btn-icon" /> Avertir l'employé
        </button>
      </div>

      <button @click="viewFullProfile" class="modal-full-profile-link">
        <IconUserCircle class="modal-link-icon" /> Voir le profil complet
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref } from 'vue';
import { useRouter } from 'vue-router';
import "../assets/css/toke-AssiduteJ-09.css";
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
  IconAlertOctagon
} from '@tabler/icons-vue';

interface Employee {
  id: number;
  name: string;
  status: 'absent' | 'late' | 'present' | 'info';
  statusText: string;
  time?: string;
  checkInTime?: string;
  lateTime?: string;
  lateDuration?: string;
  absenceType?: string;
  absenceReason?: string;
  motif?: string;
  isJustified?: boolean;
  isValidated?: boolean;
  initials?: string;
  location?: string;
  matricule?: string;
  email?: string;
  position?: string;
}

const router = useRouter();
const loading = ref(false);

const props = defineProps<{
  employee: Employee
}>();

const emit = defineEmits<{
  close: []
}>();

const viewFullProfile = () => {
  router.push({
    name: 'employee-full-profile',
    params: { employeeId: props.employee.id },
  });
};

const goBack = () => {
  emit('close');
};

const handleAction = (actionType: 'justify' | 'validate' | 'memo' | 'warn') => {
  switch (actionType) {
    case 'justify':
      alert(`Justification de l'absence pour ${props.employee.name} en cours...`);
      // Émettre un événement pour mettre à jour l'employé
      // emit('action-justified', props.employee.id);
      break;
    case 'validate':
      alert(`Retard de ${props.employee.name} validé !`);
      // emit('action-validated', props.employee.id);
      break;
    case 'memo':
      alert(`Ouverture de la fenêtre de mémo pour ${props.employee.name}...`);
      // router.push({ name: 'memo', params: { employeeId: props.employee.id } });
      break;
    case 'warn':
      alert(`Avertissement formel généré pour ${props.employee.name}.`);
      break;
  }
};
</script>

<style scoped>
</style>