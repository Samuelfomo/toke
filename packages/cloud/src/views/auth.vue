<template>
  <AuthForm
    page-title="Connexion - Toké"
    :css-file="authCss"
    welcome-message="Authentification"
    submit-button-text="Envoyer"
    :loading="loading" loading-text="Connexion..."
    :secondary-action-link="{ url: '/otp', text: 'J\'ai un jeton valide' }"
    redirect-to="/otp"
    @submit="handleLogin"
    @field-change="onFieldChange"
  >
    <template #fields="{ formData, updateField }">
      <div class="auth-field">
        <input
          :id="emailId"
          :value="formData.email"
          @input="updateField('email', ($event.target as HTMLInputElement).value)"
          type="email"
          placeholder="Renseigner votre email"
          class="auth-input"
          :class="{ 'input-error': emailError }" required
        />
        <p v-if="emailError" class="error-message">{{ emailError }}</p>
      </div>
    </template>

  </AuthForm>
</template>


<script setup lang="ts">
import { computed, ref } from 'vue';
import AuthForm from './components/auth/authForm.vue'
import authCss from '../assets/css/toke-auth-01.css?url'
import authCtrl from '../ctrl/auth';
import router from '@/router';

// ID unique pour l'email
const emailId = computed(() => `email-${Math.random().toString(36).substr(2, 9)}`)
// Initialisation de la donnée 'email' pour être tenue à jour par onFieldChange

const email = ref<string>("");
const loading = ref<boolean>(false);
const emailError = ref<string>("");

// État pour les notifications (si vous avez un composant qui l'utilise)
const notification = ref({
  open: false,
  message: "",
  severity: "info" as "success" | "error" | "warning" | "info"
});


// --- Fonctions de Contrôle et d'Affichage ---

/**
 * Affiche une notification.
 */
const showNotification = (message: string, severity: "success" | "error" | "warning" | "info") => {
  notification.value = { open: true, message, severity };
};

/**
 * Valide l'email en utilisant votre contrôle personnalisé.
 */
const isEmailValid = (): boolean => {
  if (!email.value) return false;
  // Utilisation de votre fonction de validation
  const validation = authCtrl.validateEmail(email.value);
  return validation.isValid;
};


// --- Gestion des Événements du Formulaire ---

/**
 * Gestion des changements de champs provenant de AuthForm.
 * Met à jour la variable 'email' et réinitialise l'erreur d'email.
 */
const onFieldChange = (fieldName: string, value: any) => {
  // console.log(`Champ ${fieldName} modifié:`, value) // Décommenter si besoin de debug
  if (fieldName === 'email') {
    email.value = value;
    if (emailError.value) {
      emailError.value = ""; // Réinitialiser l'erreur dès que l'utilisateur commence à taper
    }
  }
};

/**
 * Logique de soumission principale.
 * Elle est appelée par handleLogin après l'événement @submit.
 */
const handleSubmit = async () => {
  // 1. Contrôle Email côté client (si souhaité, en plus du contrôle authCtrl.validateEmail dans isEmailValid)
  if (!isEmailValid()) {
    emailError.value = "Format d'email invalide.";
    showNotification("Veuillez renseigner une adresse email valide.", "error");
    return;
  }

  emailError.value = ""; // Reset de l'erreur
  loading.value = true;

  try {
    // 2. Appel de l'API avec votre logique (authCtrl.requestLogin)
    const response = await authCtrl.requestLogin(email.value);

    if (response && response.success) {
      // Succès : Afficher la notification et rediriger
      showNotification(
        response.message || "Un email contenant un code vous a été envoyé !",
        "success"
      );

      // Délai pour laisser le temps à l'utilisateur de voir le succès avant la redirection
      await new Promise((resolve) => setTimeout(resolve, 1000));
      loading.value = false;
      router.push("/otp");
      return;

    } else {
      // Échec de l'API
      loading.value = false;

      // Logique spécifique de vérification d'email côté serveur
      if (response.error && response.error.includes("Email invalide")) {
        emailError.value = response.error;
        showNotification("Veuillez corriger l'adresse email", "error");
      } else {
        // Afficher l'erreur générale
        showNotification(
          authCtrl.formatResponseMessage(response),
          "error"
        );
      }
    }
  } catch (error) {
    // Erreur réseau/générale
    loading.value = false;
    console.error("Erreur réseau :", error);
    showNotification(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
      "error"
    );
  }
};


/**
 * Gestion de la soumission du formulaire (appelée par @submit du template).
 * Assure que 'email' est bien dans le formData avant de lancer handleSubmit.
 */
const handleLogin = (formData: any) => {
  // console.log('Données de connexion:', formData) // Décommenter si besoin de debug

  // Mettre à jour l'état 'email' à partir de formData si ce n'est pas déjà fait
  if (formData.email !== undefined) {
    email.value = formData.email;
  }

  // Lancer la logique de soumission et de vérification
  handleSubmit();
}

// Fonction inutile, laissée pour le cas où vous auriez besoin d'un composant notification
// const handleCloseNotification = () => {
//   notification.value.open = false;
// };

</script>
<style scoped>
/* Style d'erreur pour l'email */
.input-error {
  border-color: red !important;
  box-shadow: 0 0 0 0.2rem rgba(255, 0, 0, 0.25);
}

.error-message {
  color: red;
  font-size: 0.8em;
  margin-top: 5px;
}
</style>