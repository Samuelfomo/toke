<template>
  <header class="dashboard-header">
    <div class="header-content">
      <div class="logo-section">
        <div class="logo">
          <img :src="toke" alt="logo"/>
        </div>
      </div>
      <div class="header-actions">
        <!-- Notifications -->
        <!--        <div class="action-item notifications-container" ref="notificationsRef">-->
        <!--          <button-->
        <!--            class="notification-btn"-->
        <!--            :class="{ 'has-alerts': memos.length > 0 }"-->
        <!--            @click.stop="toggleNotifications">-->
        <!--            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
        <!--              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>-->
        <!--            </svg>-->
        <!--            <span v-if="memos.length > 0" class="alert-badge">{{ memos.length }}</span>-->
        <!--          </button>-->

        <!--          <transition name="dropdown">-->
        <!--            <div v-if="showNotifications" class="dropdown-menu notification-dropdown">-->
        <!--              <div class="dropdown-header">-->
        <!--                <h3>Mémos reçus</h3>-->
        <!--                <span class="notification-count">{{ memos.length }} nouveau(x)</span>-->
        <!--              </div>-->
        <!--              <div class="dropdown-body">-->
        <!--                <div class="notification-list" v-if="memos.length > 0">-->
        <!--                  <div-->
        <!--                    v-for="memo in memos"-->
        <!--                    :key="memo.id"-->
        <!--                    class="notification-item"-->
        <!--                    @click="openMemo(memo)">-->
        <!--                    <div class="notification-icon" :class="getPriorityClass(memo.priority)">-->
        <!--                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">-->
        <!--                        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>-->
        <!--                        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/>-->
        <!--                      </svg>-->
        <!--                    </div>-->
        <!--                    <div class="notification-content">-->
        <!--                      <p class="notification-title">{{ memo.subject }}</p>-->
        <!--                      <p class="notification-sender">De: {{ memo.senderName }}</p>-->
        <!--                      <p class="notification-time">{{ formatTime(memo.createdAt) }}</p>-->
        <!--                    </div>-->
        <!--                    <div v-if="!memo.isRead" class="unread-indicator"></div>-->
        <!--                  </div>-->
        <!--                </div>-->
        <!--                <div v-else class="empty-state">-->
        <!--                  <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
        <!--                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>-->
        <!--                  </svg>-->
        <!--                  <p>Aucun mémo pour le moment</p>-->
        <!--                </div>-->
        <!--              </div>-->
        <!--              <div class="dropdown-footer" v-if="memos.length > 0">-->
        <!--                <a href="/memos" class="view-all-link">Voir tous les mémos</a>-->
        <!--              </div>-->
        <!--            </div>-->
        <!--          </transition>-->
        <!--        </div>-->

        <!-- User Profile -->
        <div class="action-item user-profile-container" ref="userMenuRef">
          <button
              class="user-profile-btn"
              @click.stop="toggleUserMenu"
          >
            <div class="profile-menu-content">
              <div class="avatar">{{ userStore.userInitials }}</div>
              <!--              <div class="user-info">-->
              <!--                <span class="user-name">{{ userStore.fullName }}</span>-->
              <!--                <span class="company-name">{{ userStore.tenantName }}</span>-->
              <!--              </div>-->
            </div>
          </button>
          <transition name="dropdown">
            <div v-if="showUserMenu" class="dropdown-menu user-dropdown" v-click-outside="closeUserMenu" @click.stop>
              <div class="dropdown-body">
                <a href="/profile" class="dropdown-link">
                  <svg class="link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  Mon Profil
                </a>
                <a href="/setting" class="dropdown-link">
                  <svg class="link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  Paramètres du Compte
                </a>
                <a href="/help" class="dropdown-link">
                  <svg class="link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Aide & Support
                </a>
                <div class="dropdown-divider"></div>
                <a @click.prevent="logout" class="dropdown-link logout-link" href="#">
                  <svg class="link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Déconnexion
                </a>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </header>

  <nav class="main-navigation">
    <div class="nav-container" ref="navContainerRef">
      <RouterLink v-for="(module, index) in modules" :key="index"
                  :to="module.path"
                  class="nav-tab"
                  :class="{
          active: activeTab === module.path,
          'has-unread': module.path === '/memoList' && memoStore.hasUnreadMemos
        }"
                  @click="setActiveTab(module.path)">
        <component :is="module.icon" class="tab-icon" />
        <span class="tab-label">{{module.title}}</span>
        <span
            v-if="module.path === '/memoList' && memoStore.hasUnreadMemos"
            class="unread-badge"
            :title="`${memoStore.unreadMemosCount} mémo(s) non lu(s)`"
        >
          {{ memoStore.unreadMemosCount > 99 ? '99+' : memoStore.unreadMemosCount }}
        </span>
      </RouterLink>
      <div class="active-tab-indicator" :style="indicatorStyle"></div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useMemoStore } from '@/stores/memoStore'
import toke from '../../../public/images/toke.svg'
import { IconMapPin, IconEdit, IconBrandDaysCounter, IconCalendarWeek, IconUsers, IconSettings} from '@tabler/icons-vue';

import dashboardCss from "@/assets/css/toke-dMain-04.css?url"

import { useRouter } from 'vue-router'
import HeadBuilder from "@/utils/HeadBuilder";
const router = useRouter()


interface Memo {
  id: number
  subject: string
  senderName: string
  createdAt: string
  isRead: boolean
  priority: 'high' | 'medium' | 'low'
}

interface Props {
  notificationCount?: number
}

withDefaults(defineProps<Props>(), {
  notificationCount: 0
})

const userStore = useUserStore()
const memoStore = useMemoStore()

const notificationsRef = ref<HTMLElement | null>(null)
const userMenuRef = ref<HTMLElement | null>(null)
const modules = ref([
  {
    title: "Statistiques",
    icon: IconBrandDaysCounter,
    path: "/dashboard",
  },
  {
    title: "Equipe",
    icon: IconUsers,
    path: "/equipe",
  },
  // {
  //   title: "Analystics",
  //   icon: "",
  //   path: "#",
  // },
  {
    title: "Sites",
    icon: IconMapPin,
    path: "/sites",
  },
  {
    title: "Memos",
    icon: IconEdit,
    path: "/memoList",
  },
  {
    title: "Planning",
    icon: IconCalendarWeek,
    path: "/schedule",
  },
  {
    title: "Parametres",
    icon: IconSettings,
    path: "/setting",
  },
])

// Menu states
const showNotifications = ref(false)
const showUserMenu = ref(false)

// Memos - À remplacer par un appel API réel
const memos = ref<Memo[]>([
  {
    id: 1,
    subject: 'Réunion d\'équipe - Urgent',
    senderName: 'Jean Dupont',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    isRead: false,
    priority: 'high'
  },
  {
    id: 2,
    subject: 'Rapport mensuel à valider',
    senderName: 'Marie Martin',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    isRead: false,
    priority: 'medium'
  },
  {
    id: 3,
    subject: 'Mise à jour du projet',
    senderName: 'Pierre Bernard',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    isRead: true,
    priority: 'low'
  }
])

const getActiveTab = (path: string) => {
  if (path.startsWith('/sites')) return '/sites'
  if (path.startsWith('/equipe')) return '/equipe'
  if (path.startsWith('/dashboard')) return '/dashboard'
  if (path.startsWith('/setting')) return '/setting'
  return path
}
const activeTab = ref(getActiveTab(window.location.pathname))

// Navigation
// const activeTab = ref(window.location.pathname || '/dashboard')
const navContainerRef = ref<HTMLElement | null>(null)
const indicatorStyle = ref({})

// Directive personnalisée pour détecter les clics en dehors
const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
  showUserMenu.value = false
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
  showNotifications.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node

  if (
      notificationsRef.value &&
      !notificationsRef.value.contains(target)
  ) {
    showNotifications.value = false
  }

  if (
      userMenuRef.value &&
      !userMenuRef.value.contains(target)
  ) {
    showUserMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)

  // Démarrer le polling dès que le guid du manager est disponible
  const managerGuid = userStore.user?.guid
  if (managerGuid) {
    memoStore.startPolling(managerGuid)
  } else {
    // Attendre que le user soit chargé si pas encore disponible
    const unwatch = watch(
        () => userStore.user?.guid,
        (guid) => {
          if (guid) {
            memoStore.startPolling(guid)
            unwatch()
          }
        }
    )
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  memoStore.stopPolling()
})

const openMemo = (memo: Memo) => {
  memo.isRead = true
}

const logout = () => {
  userStore.logout()
  router.push('/')
  console.log('Déconnexion')
}


const closeUserMenu = () => {
  showUserMenu.value = false
}



const getPriorityClass = (priority: string) => {
  return {
    'priority-high': priority === 'high',
    'priority-medium': priority === 'medium',
    'priority-low': priority === 'low'
  }
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours}h`
  return `Il y a ${days}j`
}

const updateIndicator = () => {
  nextTick(() => {
    if (!navContainerRef.value) return
    const activeLink = navContainerRef.value.querySelector('.nav-tab.active') as HTMLElement
    if (activeLink) {
      const containerRect = navContainerRef.value.getBoundingClientRect()
      const linkRect = activeLink.getBoundingClientRect()
      indicatorStyle.value = {
        width: `${linkRect.width}px`,
        transform: `translateX(${linkRect.left - containerRect.left}px)`
      }
    }
  })
}

// const setActiveTab = (path: string, event: MouseEvent) => {
//   activeTab.value = path
//   updateIndicator()
// }

const setActiveTab = (path: string) => {
  activeTab.value = getActiveTab(path)
  updateIndicator()
}

router.afterEach((to) => {
  activeTab.value = getActiveTab(to.path)
  updateIndicator()
})


onMounted(() => {
  updateIndicator()
  window.addEventListener('resize', updateIndicator)
  HeadBuilder.apply({
    title: 'Toké',
    css: [dashboardCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIndicator)
})
</script>

<style scoped>
/* Positionnement de base pour l'onglet (nécessaire pour le badge) */
.nav-tab {
  position: relative;
}

/* Notification Button */
.notification-btn {
  position: relative;
  padding: 0.625rem;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
}

.action-item {
  position: relative;
}
.notification-btn:hover {
  background: rgba(198, 207, 223, 0.82);
  transform: translateY(-2px);
}

.notification-btn.has-alerts {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}


/* User Profile Button */
.user-profile-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
}

.user-profile-btn:hover {
  background: rgba(198, 207, 223, 0.82);
  transform: translateY(-2px);
}

.profile-menu-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Dropdown Menu Base */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  z-index: 60;
  border: 1px solid #e2e8f0;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-header {
  padding: 1rem;
  border-bottom: 1px solid #edf2f7;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to bottom, #f7fafc, white);
}

.dropdown-header h3 {
  font-size: 1rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
}

.notification-count {
  font-size: 0.75rem;
  color: #718096;
  background: #e2e8f0;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-weight: 600;
}

.dropdown-body {
  max-height: 400px;
  overflow-y: auto;
}

/* Scrollbar personnalisée */
.dropdown-body::-webkit-scrollbar {
  width: 6px;
}

.dropdown-body::-webkit-scrollbar-track {
  background: #f7fafc;
}

.dropdown-body::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.dropdown-body::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* Notification Dropdown */
.notification-dropdown {
  width: 360px;
}

.notification-list {
  padding: 0.25rem 0;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  transition: all 0.15s;
  cursor: pointer;
  border-left: 3px solid transparent;
  position: relative;
}

.notification-item:hover {
  background: #f7fafc;
  border-left-color: #4299e1;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  color: #2d3748;
  font-size: 0.875rem;
  margin: 0 0 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-sender {
  font-size: 0.75rem;
  color: #718096;
  margin: 0 0 0.125rem;
}

.notification-time {
  font-size: 0.7rem;
  color: #a0aec0;
  margin: 0;
}

.unread-indicator {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  background: #4299e1;
  border-radius: 50%;
}

/* Empty State */
.empty-state {
  padding: 3rem 2rem;
  text-align: center;
  color: #a0aec0;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
  opacity: 0.5;
}

.empty-state p {
  font-size: 0.875rem;
  margin: 0;
}

/* Dropdown Footer */
.dropdown-footer {
  padding: 0.75rem 1rem;
  text-align: center;
  border-top: 1px solid #edf2f7;
  background: #f7fafc;
}

.view-all-link {
  font-size: 0.875rem;
  color: #4299e1;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.15s;
}

.view-all-link:hover {
  color: #3182ce;
  text-decoration: underline;
}

/* User Dropdown */
.user-dropdown {
  width: 280px;
}

.dropdown-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #2d3748;
  text-decoration: none;
  transition: all 0.15s;
  cursor: pointer;
  font-weight: 500;
}

.dropdown-link:hover {
  background: #f7fafc;
  color: #4299e1;
  padding-left: 1.25rem;
}

.link-icon {
  width: 20px;
  height: 20px;
  color: #718096;
  transition: color 0.15s;
}

.dropdown-link:hover .link-icon {
  color: #4299e1;
}

.dropdown-divider {
  height: 1px;
  background: #edf2f7;
  margin: 0.5rem 0;
}

.logout-link {
  color: #e53e3e;
  border-top: 1px solid #edf2f7;
  margin-top: 0.5rem;
}

.logout-link:hover {
  background: #fff5f5;
  color: #c53030;
}

.logout-link:hover .link-icon {
  color: #c53030;
}

/* Responsive */
@media (max-width: 768px) {
  .user-info,
  .company-name {
    display: none;
  }

  .notification-dropdown,
  .user-dropdown {
    right: -1rem;
  }

  .nav-container {
    gap: 1rem;
  }

  .tab-label {
    display: none;
  }
}

/* ─── Onglet Memos avec mémos non lus ─────────────────────────────── */

/* Pas de background : seulement le texte/icône devient bleu */
.nav-tab.has-unread {
  color: #1d4ed8;
  font-weight: 600;
}

.nav-tab.has-unread .tab-icon {
  color: #1d4ed8;
}

.nav-tab.has-unread .tab-label {
  color: #1d4ed8;
}

/* Badge rouge — en haut à droite de l'onglet Memos */
.unread-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #ef4444;
  color: #ffffff;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  border-radius: 9px;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(239, 68, 68, 0.45);
  pointer-events: none;
  animation: badge-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes badge-pop {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
</style>