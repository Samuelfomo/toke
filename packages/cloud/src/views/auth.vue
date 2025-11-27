<template>
  <AuthForm
    ref="authFormRef"
    page-title="Connexion Employé - Toké"
    :css-file="authCss"
    welcome-message="Authentification"
    submit-button-text="Se connecter"
    loading-text="Connexion en cours..."
    :default-fields="loginFields"
    :validation="validateLogin"
    :back-link="{ url: '/tenant-selection', text: 'Changer de tenant' }"
    @submit="handleLogin"
  >
    <template #fields="{ formData = {}, updateField, errors = {} }">
      <div class="login-fields">
        <div class="form-group">
          <label for="customer_code" class="form-label">
            <span class="label-icon">🏷️</span>
            Code client
          </label>

          <input
            id="customer_code"
            :value="formData.customer_code || ''"
            type="text"
            class="form-input"
            placeholder="Ex : CLT-20455"
            autocomplete="off"
            :class="{ 'error': errors.customer_code }"
            @input="updateField('customer_code', ($event.target as HTMLInputElement).value)"
            @blur="handleCustomerCodeBlur(formData.customer_code, updateField)" />
          <span v-if="errors.customer_code" class="error-message">
            {{ errors.customer_code }}
          </span>
        </div>
        <div class="form-group">
          <label for="email" class="form-label">
            <span class="label-icon">📧</span>
            Adresse email
          </label>

          <input
            id="email"
            :value="formData.email || ''"
            type="email"
            class="form-input"
            placeholder="votre.email@entreprise.com"
            autocomplete="email"
            :class="{ 'error': errors.email }"
            @input="updateField('email', ($event.target as HTMLInputElement).value)"
            @blur="handleEmailBlur(formData.email, updateField)"
          />

          <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
        </div>

      </div>
    </template>

    <template #footer>
      <div class="login-footer">
        <small class="copyright">
          Copyright Imediatis 2025 - Tous droits réservés
        </small>
      </div>
    </template>
  </AuthForm>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AuthForm from './components/auth/authForm.vue';
import authCss from '../assets/css/toke-auth-01.css?url';
import authCtrl from '../ctrl/authCtrl';
import router from '@/router';

// Référence au composant AuthForm
const authFormRef = ref<any>(null);

// ---------------------
// DEFAULT FIELDS POUR AuthForm
// ---------------------
const loginFields = ref([
  { name: 'email', value: '' },
  { name: 'customer_code', value: '' }
] as any);

// ---------------------
// VALIDATION GLOBALE
// ---------------------
const validateLogin = (formData: any = {}) => {
  const emailValidationResult = authCtrl.validateEmail(formData.email || '');
  const customerCodeValidationResult = authCtrl.validateCustomerCode(formData.customer_code || '');

  return emailValidationResult.isValid && customerCodeValidationResult.isValid;
};

// ---------------------
// VALIDATION EMAIL AU BLUR
// ---------------------
const handleEmailBlur = (email: string, updateField: Function) => {
  if (!email || email.trim() === '') return;

  const validation = authCtrl.validateEmail(email);
  if (!validation.isValid) {
    // Utiliser la méthode exposée du composant AuthForm pour définir l'erreur
    if (authFormRef.value) {
      authFormRef.value.setFieldError('email', authCtrl.getUserFriendlyErrorMessage(validation.errors));
    }
  }
};

// ---------------------
// VALIDATION CODE CLIENT AU BLUR
// ---------------------
const handleCustomerCodeBlur = (customerCode: string, updateField: Function) => {
  if (!customerCode || customerCode.trim() === '') return;

  const validation = authCtrl.validateCustomerCode(customerCode);
  if (!validation.isValid) {
    // Utiliser la méthode exposée du composant AuthForm pour définir l'erreur
    if (authFormRef.value) {
      authFormRef.value.setFieldError('customer_code', authCtrl.getUserFriendlyErrorMessage(validation.errors));
    }
  }
};

// ---------------------
// SOUMISSION DU FORMULAIRE
// ---------------------
const handleLogin = async (formData: any) => {
  try {
    // console.log('🚀 Début de la soumission du formulaire:', formData);

    // Validation locale avant envoi
    const emailValidation = authCtrl.validateEmail(formData.email);
    if (!emailValidation.isValid) {
      const errorMsg = authCtrl.getUserFriendlyErrorMessage(emailValidation.errors);
      if (authFormRef.value) {
        authFormRef.value.setFieldError('email', errorMsg);
      }
      throw new Error(errorMsg);
    }

    const customerCodeValidation = authCtrl.validateCustomerCode(formData.customer_code);
    if (!customerCodeValidation.isValid) {
      const errorMsg = authCtrl.getUserFriendlyErrorMessage(customerCodeValidation.errors);
      if (authFormRef.value) {
        authFormRef.value.setFieldError('customer_code', errorMsg);
      }
      throw new Error(errorMsg);
    }

    // console.log('✅ Validation réussie, appel à l\'API...');

    // Appel au contrôleur pour gérer la connexion
    const response = await authCtrl.requestLogin({
      email: formData.email,
      customer_code: formData.customer_code
    });

    // console.log('📡 Réponse de l\'API:', response);

    if (response && response.success) {
      // console.log('✨ Connexion réussie!');

      // Afficher un message de succès
      if (authFormRef.value) {
        authFormRef.value.setGlobalSuccess(response.message || 'Code OTP envoyé avec succès! Redirection...');
      }

      // Stocker l'email pour la vérification OTP
      sessionStorage.setItem('login_email', authCtrl.sanitizeEmail(formData.email));
      sessionStorage.setItem('customer_code', formData.customer_code);

      // Redirection vers la page OTP après un court délai
      setTimeout(() => {
        router.push('/otp');
      }, 2000);

      return response;
    } else {
      // console.error('❌ Échec de la connexion:', response);

      // Afficher l'erreur globale
      const errorMessage = authCtrl.formatResponseMessage(response);
      if (authFormRef.value) {
        authFormRef.value.setGlobalError(errorMessage);
      }

      throw new Error(errorMessage);
    }

  } catch (error: any) {
    // console.error('💥 Erreur lors de la connexion:', error);

    // Afficher l'erreur à l'utilisateur
    if (authFormRef.value && !error.field) {
      authFormRef.value.setGlobalError(
        error.message || 'Une erreur est survenue lors de la connexion. Veuillez réessayer.'
      );
    }

    // Re-throw pour que AuthForm gère aussi l'état isSubmitting
    throw error;
  }
};
</script>

<style scoped>
.login-fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 14px;
  color: #333;
}

.label-icon {
  font-size: 18px;
}

.form-input {
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.form-input.error {
  border-color: #f44336;
}

.form-input.error:focus {
  box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.1);
}

.error-message {
  color: #f44336;
  font-size: 12px;
  margin-top: 4px;
}

.login-footer {
  margin-top: 24px;
  text-align: center;
}

.copyright {
  color: #666;
  font-size: 12px;
}
</style>