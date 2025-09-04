<template>
  <AuthForm
    page-title="Connexion - Toké"
    :css-file="authCss"
    welcome-message="Authentification"
    submit-button-text="Envoyer"
    loading-text="Connexion..."
    :secondary-action-link="{ url: '/otp', text: 'J\'ai un jeton valide' }" redirect-to="/otp"
    @submit="handleLogin"
    @field-change="onFieldChange"
  >
    <!-- Champs personnalisés -->
    <template #fields="{ formData, updateField }">
      <div class="auth-field">
        <input
          :id="emailId"
          :value="formData.email"
          @input="updateField('email', ($event.target as HTMLInputElement).value)"
          type="email"
          placeholder="Renseigner votre email"
          class="auth-input"
          required
        />
      </div>
    </template>
  </AuthForm>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AuthForm from './components/auth/authForm.vue'
import authCss from '../assets/css/toke-auth-01.css?url'

// ID unique pour l'email
const emailId = computed(() => `email-${Math.random().toString(36).substr(2, 9)}`)

// Gestion de la soumission
const handleLogin = (formData: any) => {
  console.log('Données de connexion:', formData)
  // Ici vous pouvez ajouter votre logique d'authentification
}

// Gestion des changements de champs
const onFieldChange = (fieldName: string, value: any) => {
  console.log(`Champ ${fieldName} modifié:`, value)
}
</script>
