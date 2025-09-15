<template>
  <header class="dashboard-header">
    <div class="header-content">
      <div class="logo-section">
        <div class="logo">
          <img :src="toke" alt="logo"/>
        </div>
      </div>
      <div class="header-actions">
        <button @click="goBack" class="back-btn">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Retour
        </button>
        <button class="notification-btn" :class="{ 'has-alerts': notificationCount > 0 }">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5v-8a3 3 0 10-6 0v8z"></path>
          </svg>
          <span v-if="notificationCount > 0" class="alert-badge">{{ notificationCount }}</span>
        </button>
        <div class="profile-menu">
          <div class="avatar">{{ userInitial }}</div>
          <div class="user-info">
            <span class="user-name">{{ userName }}</span>
            <span class="company-name">{{ companyName }}</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import toke from '../../../public/images/toke.svg'
import router from '@/router';

// Props pour personnaliser le header
interface Props {
  userName?: string
  companyName?: string
  notificationCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  userName: 'Danielle',
  companyName: 'IMEDIATIS',
  notificationCount: 0
})

// Variable réactive pour suivre l'onglet actif
const activeTab = ref('/dashboard'); // Initialise avec l'onglet par défaut

// Méthode pour définir l'onglet actif
const setActiveTab = (path: string) => {
  activeTab.value = path;
};

// Computed pour récupérer la première lettre du nom d'utilisateur
const userInitial = computed(() => {
  return props.userName.charAt(0).toUpperCase()
})
const goBack = () => {
  router.push('/dashboard')
}

</script>

<style scoped>
.dashboard-header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.logo-section .logo img {
  height: 40px;
  width: auto;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.notification-btn {
  position: relative;
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.notification-btn:hover {
  background-color: #f3f4f6;
}

.notification-btn .icon {
  width: 20px;
  height: 20px;
  color: #6b7280;
}

.notification-btn.has-alerts .icon {
  color: #dc2626;
}

.alert-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #dc2626;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  min-width: 1.25rem;
  text-align: center;
}

.profile-menu {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 40px;
  height: 40px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  color: #111827;
  font-size: 0.875rem;
}

.company-name {
  color: #6b7280;
  font-size: 0.75rem;
}
</style>