<template>
  <LoginForm
    :show-password="true"
    submit-button-text="Envoyer"
    welcome-message="Authentifiez-vous"
    :show-back-link="false"
    @submit="handleLogin"
  />
</template>

<script setup lang="ts">
import { onMounted } from "vue"
import HeadBuilder from "../utils/HeadBuilder"
import LoginForm from "./components/auth/authForm.vue"
import authCss from "../assets/css/toke-auth-01.css?url"

// Quand le composant est monté, on met à jour <head>
onMounted(() => {
  HeadBuilder.apply({
    title: "Connexion - Bienvenue",
    css: [authCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})


// Gestion de la soumission du formulaire
const handleLogin = async (formData: any) => {
  console.log('Données de connexion:', formData)
  // Ici, vous pouvez ajouter votre logique d'authentification
  // Par exemple: appel API, redirection, etc.
}
</script>