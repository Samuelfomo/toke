<template>
  <AuthForm
    ref="authFormRef"
    @submit="handleLogin"
    page-title="Connexion Employé - Toké"
    :css-file="authCss"
    welcome-message="Authentification"
    submit-button-text="Se connecter"
    loading-text="Connexion en cours..."
    success-text="Connexion réussie !"
    :default-fields="loginFields"
    :validation="validateLogin"
    :back-link="{ url: '/tenant-selection', text: 'Changer de tenant' }"
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
            class="auth-input"
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
            class="auth-input"
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
import authCss from "../assets/css/toke-auth-01.css?url";
import authCtrl from '../ctrl/authCtrl';
import router from '@/router';

const authFormRef = ref<any>(null);

const loginFields = ref([
  { name: 'email', value: '' },
  { name: 'customer_code', value: '' }
] as any);

const validateLogin = (formData: any = {}) => {
  const emailValidationResult = authCtrl.validateEmail(formData.email || '');
  const customerCodeValidationResult = authCtrl.validateCustomerCode(formData.customer_code || '');
  return emailValidationResult.isValid && customerCodeValidationResult.isValid;
};

const handleEmailBlur = (email: string, updateField: Function) => {
  if (!email || email.trim() === '') return;
  const validation = authCtrl.validateEmail(email);
  if (!validation.isValid && authFormRef.value) {
    authFormRef.value.setFieldError('email', authCtrl.getUserFriendlyErrorMessage(validation.errors));
  }
};

const handleCustomerCodeBlur = (customerCode: string, updateField: Function) => {
  if (!customerCode || customerCode.trim() === '') return;
  const validation = authCtrl.validateCustomerCode(customerCode);
  if (!validation.isValid && authFormRef.value) {
    authFormRef.value.setFieldError('customer_code', authCtrl.getUserFriendlyErrorMessage(validation.errors));
  }
};

// ✅ MODIFICATION : Appel API immédiat et signalement des erreurs rapide
const handleLogin = async (formData: any) => {
  console.log('🎯 handleLogin appelé avec:', formData);

  try {
    // Validation locale
    const emailValidation = authCtrl.validateEmail(formData.email);
    if (!emailValidation.isValid) {
      const errorMsg = authCtrl.getUserFriendlyErrorMessage(emailValidation.errors);
      if (authFormRef.value) {
        authFormRef.value.setFieldError('email', errorMsg);
        authFormRef.value.setGlobalError(errorMsg);
      }
      return; // ✅ Sortir immédiatement
    }

    const customerCodeValidation = authCtrl.validateCustomerCode(formData.customer_code);
    if (!customerCodeValidation.isValid) {
      const errorMsg = authCtrl.getUserFriendlyErrorMessage(customerCodeValidation.errors);
      if (authFormRef.value) {
        authFormRef.value.setFieldError('customer_code', errorMsg);
        authFormRef.value.setGlobalError(errorMsg);
      }
      return; // ✅ Sortir immédiatement
    }

    console.log('📡 Appel à l\'API...');

    // ✅ Appel au contrôleur - on attend la réponse
    const response = await authCtrl.requestLogin({
      email: formData.email,
      customer_code: formData.customer_code
    });

    console.log('✅ Réponse reçue:', response);

    if (response && response.success) {
      // ✅ Succès - Afficher le message
      if (authFormRef.value) {
        authFormRef.value.setGlobalSuccess(response.message || 'Code OTP envoyé avec succès!');
      }

      // ✅ Attendre que AuthForm finisse son animation (2s loader + 2s succès)
      setTimeout(() => {
        router.push({ path: '/otp', query: { email: formData.email } });
      }, 4500);

    } else {
      // ✅ Erreur - Signaler immédiatement
      const errorMessage = authCtrl.formatResponseMessage(response);
      if (authFormRef.value) {
        authFormRef.value.setGlobalError(errorMessage);
      }
      console.error('❌ Erreur:', errorMessage);
    }

  } catch (error: any) {
    console.error('💥 Erreur capturée:', error);

    // ✅ Signaler l'erreur immédiatement
    if (authFormRef.value && !error.field) {
      authFormRef.value.setGlobalError(
        error.message || 'Une erreur est survenue lors de la connexion. Veuillez réessayer.'
      );
    }
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