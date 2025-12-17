<template>
  <div class="settings-page">
    <Header
      :user-name="currentUser.name"
      :company-name="currentUser.company"
      :notification-count="notificationCount"
    />

    <div class="settings-container">
      <div class="settings-header">
        <!--      <h1>Paramètres</h1>-->
        <!--      <p>Gérez les paramètres de votre compte et de votre entreprise</p>-->
      </div>

      <div class="settings-content">
        <!-- Navigation des onglets -->
        <div class="tabs-navigation">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab-button', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.label }}</span>
          </button>
        </div>

        <!-- Contenu des onglets -->
        <div class="tab-content">
          <!-- Onglet: Informations de l'entreprise -->
          <div v-if="activeTab === 'company'" class="tab-panel">
            <h2>Informations de l'entreprise</h2>
            <form @submit.prevent="saveCompanyInfo" class="settings-form">
              <div class="form-group">
                <label>Nom de l'entreprise</label>
                <input v-model="userStore.tenantName" type="text" placeholder="Nom de l'entreprise">
              </div>
              <div class="form-group">
                <label>Email professionnel</label>
                <input v-model="userStore.user!.email" type="email" placeholder="contact@entreprise.com">
              </div>
              <div class="form-group">
                <label>Téléphone</label>
                <input v-model="userStore.user!.phone_number" type="tel" placeholder="+237 6XX XXX XXX">
              </div>
              <div class="form-group">
                <label>Adresse</label>
                <textarea v-model="companyInfo.address" rows="3" placeholder="Adresse complète"></textarea>
              </div>
              <div class="form-group">
                <label>Secteur d'activité</label>
                <select v-model="userStore.department">
<!--                  <option value="">Sélectionner...</option>-->
<!--                  <option value="restaurant">Restaurant</option>-->
<!--                  <option value="hotel">Hôtel</option>-->
<!--                  <option value="cafe">Café</option>-->
<!--                  <option value="autre">Autre</option>-->
                </select>
              </div>
              <button type="submit" class="btn-primary">Enregistrer les modifications</button>
            </form>
          </div>

          <!-- Onglet: Inviter un manager -->
          <div v-if="activeTab === 'invite'" class="tab-panel">
            <h2>Inviter un manager</h2>
            <p class="tab-description">Invitez d'autres managers à rejoindre votre équipe</p>

            <form @submit.prevent="sendInvitation" class="settings-form">
              <div class="form-group">
                <label>Email du manager</label>
                <input v-model="invitation.email" type="email" placeholder="manager@exemple.com" required>
              </div>
              <div class="form-group">
                <label>Nom complet</label>
                <input v-model="invitation.name" type="text" placeholder="Nom du manager" required>
              </div>
              <div class="form-group">
                <label>Rôle</label>
                <select v-model="invitation.role" required>
<!--                  <option value="">Sélectionner un rôle...</option>-->
<!--                  <option value="manager">Manager</option>-->
<!--                  <option value="admin">Administrateur</option>-->
<!--                  <option value="supervisor">Superviseur</option>-->
                </select>
              </div>
              <button type="submit" class="btn-primary">Envoyer l'invitation</button>
            </form>

            <div class="invitations-list" v-if="invitationsList.length > 0">
              <h3>Invitations envoyées</h3>
              <div v-for="inv in invitationsList" :key="inv.id" class="invitation-item">
                <div class="invitation-info">
                  <strong>{{ inv.name }}</strong>
                  <span>{{ inv.email }}</span>
                </div>
                <span :class="['invitation-status', inv.status]">{{ inv.status }}</span>
              </div>
            </div>
          </div>

          <!-- Onglet: Historique de paiements -->
          <div v-if="activeTab === 'payments'" class="tab-panel">
            <h2>Historique de paiements</h2>
            <p class="tab-description">Consultez l'historique de vos transactions</p>

            <div class="payments-filter">
              <select v-model="paymentFilter">
                <option value="all">Tous les paiements</option>
                <option value="completed">Complétés</option>
                <option value="pending">En attente</option>
                <option value="failed">Échoués</option>
              </select>
            </div>

            <div class="payments-list">
              <div v-for="payment in filteredPayments" :key="payment.id" class="payment-item">
                <div class="payment-date">
                  <strong>{{ payment.date }}</strong>
                  <span>{{ payment.time }}</span>
                </div>
                <div class="payment-details">
                  <div class="payment-description">{{ payment.description }}</div>
                  <div class="payment-method">{{ payment.method }}</div>
                </div>
                <div class="payment-amount">
                  <strong>{{ payment.amount }} FCFA</strong>
                  <span :class="['payment-status', payment.status]">{{ payment.statusLabel }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Onglet: Sécurité -->
          <div v-if="activeTab === 'security'" class="tab-panel">
            <h2>Paramètres de sécurité</h2>

            <div class="security-section">
              <h3>Changer le mot de passe</h3>
              <form @submit.prevent="changePassword" class="settings-form">
                <div class="form-group">
                  <label>Mot de passe actuel</label>
                  <input v-model="security.currentPassword" type="password" placeholder="••••••••">
                </div>
                <div class="form-group">
                  <label>Nouveau mot de passe</label>
                  <input v-model="security.newPassword" type="password" placeholder="••••••••">
                </div>
                <div class="form-group">
                  <label>Confirmer le nouveau mot de passe</label>
                  <input v-model="security.confirmPassword" type="password" placeholder="••••••••">
                </div>
                <button type="submit" class="btn-primary">Mettre à jour le mot de passe</button>
              </form>
            </div>

            <div class="security-section">
              <h3>Authentification à deux facteurs</h3>
              <div class="security-option">
                <div class="option-info">
                  <strong>Activer l'authentification à deux facteurs (2FA)</strong>
                  <p>Ajoutez une couche de sécurité supplémentaire à votre compte</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="security.twoFactorEnabled">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="security-section">
              <h3>Sessions actives</h3>
              <div v-for="session in activeSessions" :key="session.id" class="session-item">
                <div class="session-info">
                  <strong>{{ session.device }}</strong>
                  <span>{{ session.location }} • {{ session.lastActive }}</span>
                </div>
                <button @click="revokeSession(session.id)" class="btn-secondary">Révoquer</button>
              </div>
            </div>
          </div>

          <!-- Onglet: Suppression du compte -->
          <div v-if="activeTab === 'delete'" class="tab-panel">
            <h2>Suppression du compte</h2>
            <div class="danger-zone">
              <div class="warning-box">
                <span class="warning-icon">⚠️</span>
                <div>
                  <strong>Attention : Cette action est irréversible</strong>
                  <p>La suppression de votre compte entraînera la perte définitive de toutes vos données, y compris les informations de l'entreprise, l'historique des paiements et les accès des managers.</p>
                </div>
              </div>

              <form @submit.prevent="deleteAccount" class="delete-form">
                <div class="form-group">
                  <label>Pour confirmer, tapez "SUPPRIMER" ci-dessous</label>
                  <input v-model="deleteConfirmation" type="text" placeholder="SUPPRIMER">
                </div>
                <div class="form-group">
                  <label>Mot de passe</label>
                  <input v-model="deletePassword" type="password" placeholder="Votre mot de passe">
                </div>
                <button
                  type="submit"
                  class="btn-danger"
                  :disabled="deleteConfirmation !== 'SUPPRIMER'"
                >
                  Supprimer définitivement mon compte
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import settingCss from "../assets/css/toke-setting-17.css?url"
import HeadBuilder from '@/utils/HeadBuilder';
import { useUserStore } from '@/composables/userStore';
import dashboardCss from "../assets/css/toke-dMain-04.css?url"
import Header from '@/views/components/header.vue';

// Stores (uniquement pour les infos utilisateur)
const userStore = useUserStore()

// User data
const currentUser = computed(() => ({
  name: userStore.fullName || 'Manager',
  company: userStore.tenantName || 'N/A'
}))
const notificationCount = ref(2)
const activeEmployeeMenu = ref<number | null>(null)

interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface CompanyInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  sector: string;
}

interface Invitation {
  email: string;
  name: string;
  role: string;
}

interface InvitationItem {
  id: number;
  name: string;
  email: string;
  status: string;
}

interface Payment {
  id: number;
  date: string;
  time: string;
  description: string;
  method: string;
  amount: string;
  status: string;
  statusLabel: string;
}

interface Security {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  twoFactorEnabled: boolean;
}

interface Session {
  id: number;
  device: string;
  location: string;
  lastActive: string;
}

const activeTab = ref<string>('company');

const tabs = ref<Tab[]>([
  { id: 'company', label: 'Entreprise', icon: '🏢' },
  { id: 'invite', label: 'Inviter', icon: '👥' },
  { id: 'payments', label: 'Paiements', icon: '💳' },
  { id: 'security', label: 'Sécurité', icon: '🔒' },
  { id: 'delete', label: 'Suppression', icon: '🗑️' }
]);

const companyInfo = ref<CompanyInfo>({
  name: 'Restaurant Le Gourmet',
  email: 'contact@legourmet.cm',
  phone: '+237 699 123 456',
  address: 'Douala, Cameroun',
  sector: 'restaurant'
});

const invitation = ref<Invitation>({
  email: '',
  name: '',
  role: ''
});

const invitationsList = ref<InvitationItem[]>([
  { id: 1, name: 'Marie Dupont', email: 'marie@example.com', status: 'en attente' },
  { id: 2, name: 'Jean Martin', email: 'jean@example.com', status: 'acceptée' }
]);

const paymentFilter = ref<string>('all');

const payments = ref<Payment[]>([
  { id: 1, date: '15 Déc 2025', time: '14:30', description: 'Abonnement mensuel', method: 'Mobile Money', amount: '15000', status: 'completed', statusLabel: 'Complété' },
  { id: 2, date: '15 Nov 2025', time: '09:15', description: 'Abonnement mensuel', method: 'Mobile Money', amount: '15000', status: 'completed', statusLabel: 'Complété' },
  { id: 3, date: '15 Oct 2025', time: '16:45', description: 'Abonnement mensuel', method: 'Carte bancaire', amount: '15000', status: 'completed', statusLabel: 'Complété' }
]);

const security = ref<Security>({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  twoFactorEnabled: false
});

const activeSessions = ref<Session[]>([
  { id: 1, device: 'Chrome sur Windows', location: 'Douala, CM', lastActive: 'Maintenant' },
  { id: 2, device: 'Safari sur iPhone', location: 'Douala, CM', lastActive: 'Il y a 2 heures' }
]);

const deleteConfirmation = ref<string>('');
const deletePassword = ref<string>('');

const filteredPayments = computed(() => {
  if (paymentFilter.value === 'all') {
    return payments.value;
  }
  return payments.value.filter(p => p.status === paymentFilter.value);
});

const saveCompanyInfo = () => {
  alert('Informations de l\'entreprise enregistrées !');
};

const sendInvitation = () => {
  alert(`Invitation envoyée à ${invitation.value.email}`);
  invitation.value = { email: '', name: '', role: '' };
};

const changePassword = () => {
  if (security.value.newPassword !== security.value.confirmPassword) {
    alert('Les mots de passe ne correspondent pas');
    return;
  }
  alert('Mot de passe mis à jour avec succès !');
  security.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: security.value.twoFactorEnabled
  };
};

const revokeSession = (sessionId: number) => {
  if (confirm('Êtes-vous sûr de vouloir révoquer cette session ?')) {
    activeSessions.value = activeSessions.value.filter(s => s.id !== sessionId);
  }
};

const deleteAccount = () => {
  if (deleteConfirmation.value === 'SUPPRIMER' && deletePassword.value) {
    if (confirm('Êtes-vous absolument sûr de vouloir supprimer votre compte ?')) {
      alert('Compte supprimé. Redirection...');
    }
  }
};

const closeMenuOnClickOutside = (event: MouseEvent) => {
  if (activeEmployeeMenu.value !== null) {
    const target = event.target as HTMLElement
    if (!target.closest('.employee-menu')) {
      activeEmployeeMenu.value = null
    }
  }
}

// Lifecycle
onMounted(async () => {
  document.addEventListener('click', closeMenuOnClickOutside)
  HeadBuilder.apply({
    title: 'Setting - Toké',
    css: [dashboardCss, settingCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background-color: rgba(195, 207, 226, 0.53);
}

.settings-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
</style>