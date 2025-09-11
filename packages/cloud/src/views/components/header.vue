<template>
  <header class="dashboard-header">
    <div class="header-content">
      <div class="logo-section">
        <div class="logo">
          <img :src="toke" alt="logo"/>
        </div>
      </div>
      <div class="header-actions">
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
  <nav class="main-navigation">
    <div class="nav-container">
      <a
        href="/dashboard"
        class="nav-tab"
        :class="{ active: activeTab === '/dashboard' }"
        @click="setActiveTab('/dashboard')">
        <svg class="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span class="tab-label">Aujourd'hui</span>
      </a>
      <a
        href="#"
        class="nav-tab"
        :class="{ active: activeTab === '/equipe' }"
        @click="setActiveTab('/equipe')">
        <svg class="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        <span class="tab-label">Équipe</span>
      </a>
      <a
        href="#"
        class="nav-tab"
        :class="{ active: activeTab === '/analytics' }"
        @click="setActiveTab('/analytics')">
        <svg class="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
        <span class="tab-label">Analytics</span>
      </a>
      <a
        href="/module"
        class="nav-tab"
        :class="{ active: activeTab === '/module' }"
        @click="setActiveTab('/module')">
        <svg class="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        <span class="tab-label">Paramètres</span>
      </a>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import toke from '../../../public/images/toke.svg'

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