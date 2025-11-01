<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal-container">
      <div class="modal-header">
        <h2>Créer un nouvel employé</h2>
        <button class="close-btn" @click="closeModal">&times;</button>
      </div>

      <form class="employee-form" @submit.prevent="submitForm">
        <div class="form-group">
          <label>Nom complet</label>
          <input type="text" v-model="form.name" required placeholder="Ex : Jean Dupont" />
        </div>

        <div class="form-group">
          <label>Email</label>
          <input type="email" v-model="form.email" required placeholder="exemple@entreprise.com" />
        </div>

        <div class="form-group">
          <label>Téléphone</label>
          <input type="text" v-model="form.phone" placeholder="+33 6 12 34 56 78" />
        </div>

        <div class="form-group">
          <label>Poste</label>
          <input type="text" v-model="form.position" required placeholder="Ex : Développeur Frontend" />
        </div>

        <div class="form-group">
          <label>Site de travail</label>
          <select v-model="form.siteId" required>
            <option value="">Sélectionner un site</option>
            <option v-for="site in availableSites" :key="site.id" :value="site.id">
              {{ site.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Photo (URL)</label>
          <input type="text" v-model="form.avatar" placeholder="https://..." />
        </div>

        <div class="form-group">
          <label>Département</label>
          <input type="text" v-model="form.department" placeholder="Ex : Informatique" />
        </div>

        <div class="form-group">
          <label>Statut initial</label>
          <select v-model="form.status" required>
            <option value="present">Présent</option>
            <option value="absent">Absent</option>
            <option value="late">En retard</option>
            <option value="info">Information</option>
          </select>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn cancel" @click="closeModal">Annuler</button>
          <button type="submit" class="btn submit">Enregistrer</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

interface EmployeeForm {
  name: string
  email: string
  phone: string
  position: string
  siteId: string | number
  avatar: string
  department: string
  status: string
}

interface Employee {
  id: number
  managerId: number
  name: string
  email: string
  phone: string
  position: string
  siteId: string | number
  avatar: string
  department: string
  status: string
  punctualityScore: number
  punctualityDetails: { onTime: number; totalDays: number }
  initials: string
}

export default defineComponent({
  name: 'EmployeeModal',
  props: {
    managerId: { type: Number, required: true },
    availableSites: {
      type: Array as () => Array<{ id: number; name: string }>,
      default: () => []
    }
  },
  data() {
    return {
      form: {
        name: '',
        email: '',
        phone: '',
        position: '',
        siteId: '',
        avatar: '',
        department: '',
        status: 'present'
      }
    }
  },
  methods: {
    closeModal() {
      this.$emit('close')
    },
    submitForm() {
      const newEmployee = {
        id: Date.now(),
        managerId: this.managerId,
        ...this.form,
        punctualityScore: 100,
        punctualityDetails: { onTime: 0, totalDays: 0 },
        initials: this.getInitials(this.form.name)
      }
      this.$emit('employee-added', newEmployee)
      this.closeModal()
    },
    getInitials(name: string) {
      return name.split(' ').map(n => n[0]?.toUpperCase() || '').join('').slice(0, 2)
    }
  }
})
</script>
