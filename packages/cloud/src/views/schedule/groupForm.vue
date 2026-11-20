<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>{{ isEditMode ? 'Modifier le groupe' : 'Créer un groupe' }}</h2>
        <button class="btn-close" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <!-- Informations du groupe -->
        <div class="form-section">
          <h3 class="section-title">Informations du groupe</h3>

          <div class="form-group">
            <label class="form-label">Nom du groupe *</label>
            <input
              type="text"
              class="form-input"
              v-model="localGroup.name"
              placeholder="Ex: Équipe Marketing, Développeurs, Service Client..."
            />
          </div>
        </div>

        <!-- Sélection des membres -->
        <div class="form-section">
          <h3 class="section-title">Membres du groupe</h3>
          <p class="form-hint" style="margin-bottom: var(--space-md);">
            Sélectionnez les employés qui feront partie de ce groupe
          </p>

          <div class="members-selector">
            <div
              v-for="employee in employees"
              :key="employee.id"
              class="member-selector-item"
              :class="{
                'selected': localGroup.memberIds.includes(employee.id),
                'inactive': !employee.isActive
              }"
              @click="toggleMember(employee.id)"
            >
              <div class="member-selector-avatar">{{ getInitials(employee.name) }}</div>
              <div class="member-selector-info">
                <span class="member-selector-name">{{ employee.name }}</span>
                <div class="member-selector-details">
                  <span class="member-selector-role">{{ employee.role }}</span>
                  <div class="member-selector-status">
                    <div class="status-dot" :class="{ active: employee.isActive }"></div>
                    <span>{{ employee.isActive ? 'Actif' : 'Inactif' }}</span>
                  </div>
                </div>
              </div>
              <div class="member-selector-check">✓</div>
            </div>
          </div>

          <div class="group-info-badge">
            <span class="group-info-text">
              {{ localGroup.memberIds.length }} membre(s) sélectionné(s)
            </span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">
          Annuler
        </button>
        <button class="btn btn-primary" @click="handleSave">
          {{ isEditMode ? 'Enregistrer' : 'Créer le groupe' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import "../../assets/css/toke-schedule-21.css"
import "../../assets/css/toke-groupForm-23.css"

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
  group: Group;
  isEditMode: boolean;
  employees: Employee[];
}>();

const emit = defineEmits<{
  save: [group: Group];
  close: [];
}>();

const localGroup = ref<Group>(JSON.parse(JSON.stringify(props.group)));

watch(() => props.group, (newGroup) => {
  localGroup.value = JSON.parse(JSON.stringify(newGroup));
}, { deep: true });

function toggleMember(employeeId: number) {
  const index = localGroup.value.memberIds.indexOf(employeeId);
  if (index > -1) {
    localGroup.value.memberIds.splice(index, 1);
  } else {
    localGroup.value.memberIds.push(employeeId);
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

function handleSave() {
  if (!localGroup.value.name.trim()) {
    alert('Veuillez saisir un nom pour le groupe');
    return;
  }

  if (localGroup.value.memberIds.length === 0) {
    alert('Veuillez sélectionner au moins un membre pour le groupe');
    return;
  }

  emit('save', localGroup.value);
}
</script>

