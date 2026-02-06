<template>
  <div class="settings-app-container">
    <!-- Top Header - Sticky -->
    <div class="top-header">
      <Header
        :user-name="currentUser.name"
        :company-name="currentUser.company"
        :notification-count="notificationCount"
      />
    </div>

    <div class="settings-layout">
      <!-- Sidebar Navigation -->
      <aside class="settings-sidebar">
        <nav class="settings-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['nav-settings-item', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id"
          >
            <span class="nav-settings-icon">{{ tab.icon }}</span>
            <div class="nav-settings-content">
              <span class="nav-settings-label">{{ tab.label }}</span>
            </div>
          </button>
        </nav>
      </aside>

      <!-- Main Content Area -->
      <main class="settings-main-content">
        <div class="settings-content-wrapper">
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
                </select>
              </div>
              <button type="submit" class="btn-primary">Enregistrer les modifications</button>
            </form>
          </div>

          <!-- Onglet: Inviter un manager -->
          <div v-if="activeTab === 'invite'" class="tab-panel">
            <h2>Inviter un manager</h2>
            <p class="tab-description">
              Vous pouvez inviter un manager soit en sélectionnant un membre existant,
              soit en envoyant un code d'invitation via WhatsApp.
            </p>

            <div class="form-group">
              <label>Méthode d'invitation</label>
              <div class="invite-methods">
                <label>
                  <input type="radio" value="member" v-model="inviteMethod" />
                  Sélectionner un membre de l'équipe
                </label>
                <label>
                  <input type="radio" value="whatsapp" v-model="inviteMethod" />
                  Envoyer un code via WhatsApp
                </label>
              </div>
            </div>

            <form
              v-if="inviteMethod === 'member'"
              @submit.prevent="sendInvitationToMember"
              class="settings-form"
            >
              <div class="form-group">
                <label>Membre de l'équipe</label>
                <select v-model="invitation.memberId" required>
                  <option value="">Sélectionner un membre...</option>
                  <option
                    v-for="member in teamMembers"
                    :key="member.id"
                    :value="member.id"
                  >
                    {{ member.name }} ({{ member.email }})
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Rôle</label>
                <select v-model="invitation.role" required>
                  <option value="">Sélectionner un rôle...</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrateur</option>
                  <option value="supervisor">Superviseur</option>
                </select>
              </div>

              <button type="submit" class="btn-primary">
                Inviter le manager
              </button>
            </form>

            <form
              v-if="inviteMethod === 'whatsapp'"
              @submit.prevent="generateWhatsappCode"
              class="settings-form"
            >
              <div class="form-group">
                <label>Numéro WhatsApp</label>
                <input
                  v-model="invitation.phone"
                  type="tel"
                  placeholder="+225 07 00 00 00"
                  required
                />
              </div>

              <div class="form-group">
                <label>Nom du manager (optionnel)</label>
                <input
                  v-model="invitation.name"
                  type="text"
                  placeholder="Nom du manager"
                />
              </div>

              <button type="submit" class="btn-primary">
                Générer et envoyer le code
              </button>
            </form>

            <div class="invitations-list" v-if="invitationsList.length > 0">
              <h3>Invitations envoyées</h3>
              <div
                v-for="inv in invitationsList"
                :key="inv.id"
                class="invitation-item"
              >
                <div class="invitation-info">
                  <strong>{{ inv.name || '—' }}</strong>
                  <span v-if="inv.email">{{ inv.email }}</span>
                  <span v-if="inv.phone">{{ inv.phone }}</span>
                </div>
                <span :class="['invitation-status', inv.status]">
                  {{ inv.status }}
                </span>
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
      </main>
    </div>

    <!-- Footer -->
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import Header from '@/views/components/header.vue';
import Footer from '@/views/components/footer.vue';
import "../assets/css/toke-setting-17.css"
import footerCss from "../assets/css/toke-footer-24.css?url"
import HeadBuilder from '@/utils/HeadBuilder';

const userStore = useUserStore();

const currentUser = computed(() => ({
  name: userStore.fullName || 'Manager',
  company: userStore.tenantName || 'N/A'
}));
const notificationCount = ref(2);

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

interface TeamMember {
  id: number;
  name: string;
  email: string;
}

interface InvitationForm {
  memberId?: number | '';
  role?: string;
  phone?: string;
  name?: string;
}

interface InvitationItem {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  code?: string;
  status: string;
  type: 'member' | 'whatsapp';
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

const inviteMethod = ref<'member' | 'whatsapp'>('member');

const teamMembers = ref<TeamMember[]>([
  { id: 1, name: 'Jean Dupont', email: 'jean@exemple.com' },
  { id: 2, name: 'Marie Kouassi', email: 'marie@exemple.com' }
]);

const invitation = ref<InvitationForm>({
  memberId: '',
  role: '',
  phone: '',
  name: ''
});

const invitationsList = ref<InvitationItem[]>([]);

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

const sendInvitationToMember = () => {
  const member = teamMembers.value.find(m => m.id === invitation.value.memberId);
  if (!member || !invitation.value.role) return;

  invitationsList.value.push({
    id: Date.now(),
    name: member.name,
    email: member.email,
    role: invitation.value.role,
    status: 'envoyée',
    type: 'member'
  });

  invitation.value.memberId = '';
  invitation.value.role = '';
};

const generateWhatsappCode = () => {
  if (!invitation.value.phone) return;

  const code = generateCode();

  invitationsList.value.push({
    id: Date.now(),
    name: invitation.value.name || 'Invitation WhatsApp',
    phone: invitation.value.phone,
    code,
    status: 'envoyée',
    type: 'whatsapp'
  });

  const message = `Bonjour, voici votre code d'invitation manager : ${code}`;
  const whatsappUrl = `https://wa.me/${formatPhone(invitation.value.phone)}?text=${encodeURIComponent(message)}`;

  window.open(whatsappUrl, '_blank');

  invitation.value.phone = '';
  invitation.value.name = '';
};

const generateCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const formatPhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Lifecycle
onMounted(() => {
  HeadBuilder.apply({
    title: 'Paramètres - Toké',
    css: [footerCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });
});
</script>