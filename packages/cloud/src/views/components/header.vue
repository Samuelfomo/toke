<template>
  <!-- HEADER -->
  <header class="bg-white border-b border-gray-200 h-16 sticky top-0 z-[100]">
    <div class="max-w-[1600px] mx-auto px-6 h-full flex items-center justify-between">

      <!-- Logo -->
      <div class="flex items-center gap-4">
        <div class="w-[60px] h-[60px] rounded-lg flex items-center justify-center font-bold">
          <img :src="toke" alt="logo" class="w-full h-full object-contain" />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-6">

        <!-- User Profile -->
        <div class="relative" ref="userMenuRef">
          <button
              class="flex items-center gap-3 px-4 py-2 bg-white/15 border border-white/20 rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-sm hover:bg-[rgba(198,207,223,0.82)] hover:-translate-y-0.5"
              @click.stop="toggleUserMenu"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-blue-800 text-white flex items-center justify-center font-semibold text-sm">
                {{ userStore.userInitials }}
              </div>
            </div>
          </button>

          <!-- Dropdown -->
          <transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-2"
          >
            <div
                v-if="showUserMenu"
                class="absolute top-[calc(100%+0.5rem)] right-0 bg-white rounded-xl shadow-2xl overflow-hidden z-[60] border border-gray-200 min-w-[250px]"
                v-click-outside="closeUserMenu"
                @click.stop
            >
              <div class="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-track-gray-50 scrollbar-thumb-gray-300">

                <a href="/profile" class="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 no-underline transition-all duration-150 cursor-pointer font-medium hover:bg-gray-50 hover:text-blue-400 hover:pl-5 group">
                  <svg class="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors duration-150 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  Mon Profil
                </a>

                <a href="/setting" class="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 no-underline transition-all duration-150 cursor-pointer font-medium hover:bg-gray-50 hover:text-blue-400 hover:pl-5 group">
                  <svg class="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors duration-150 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Paramètres du Compte
                </a>

                <a href="/help" class="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 no-underline transition-all duration-150 cursor-pointer font-medium hover:bg-gray-50 hover:text-blue-400 hover:pl-5 group">
                  <svg class="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors duration-150 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Aide & Support
                </a>

                <div class="h-px bg-gray-100 my-2" />

                <a
                    @click.prevent="logout"
                    class="flex items-center gap-3 px-4 py-3 text-sm text-red-500 no-underline transition-all duration-150 cursor-pointer font-medium border-t border-gray-100 mt-2 hover:bg-red-50 hover:text-red-700 hover:pl-5 group"
                    href="#"
                >
                  <svg class="w-5 h-5 text-red-400 group-hover:text-red-700 transition-colors duration-150 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3h4a3 3 0 013 3v1"/>
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

  <!-- NAVIGATION -->
  <nav class="bg-white border-b border-gray-200 sticky top-16 z-[99]">
    <div class="max-w-full mx-auto container flex gap-6 relative" ref="navContainerRef">

      <RouterLink
          v-for="(module, index) in modules"
          :key="index"
          :to="module.path"
          class="relative flex items-center gap-2 px-6 py-4 border-b-[3px] border-transparent text-gray-500 text-base font-medium cursor-pointer transition-all duration-200 no-underline hover:text-blue-600 hover:bg-blue-600/5"
          active-class="!text-blue-600 !border-b-blue-500 bg-blue-600/5 font-semibold"
          :class="{
          'text-blue-700 font-semibold [&_.tab-icon]:text-blue-700 [&_.tab-label]:text-blue-700': module.path === '/memoList' && memoStore.hasUnreadMemos
        }"
          @click="setActiveTab(module.path)"
      >
        <component :is="module.icon" class="tab-icon w-5 h-5" />
        <span class="tab-label whitespace-nowrap max-md:hidden">{{ module.title }}</span>

        <!-- Badge non lus -->
        <span
            v-if="module.path === '/memoList' && memoStore.hasUnreadMemos"
            class="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1.5 bg-red-500 text-white text-[0.62rem] font-bold leading-[18px] text-center rounded-full whitespace-nowrap shadow-md shadow-red-400/45 pointer-events-none animate-[badge-pop_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
            :title="`${memoStore.unreadMemosCount} mémo(s) non lu(s)`"
        >
          {{ memoStore.unreadMemosCount > 99 ? '99+' : memoStore.unreadMemosCount }}
        </span>
      </RouterLink>

      <!-- Indicateur d'onglet actif -->
      <div
          class="absolute bottom-0 h-[3px] bg-blue-400 transition-all duration-300 ease-in-out"
          :style="indicatorStyle"
      />
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useMemoStore } from '@/stores/memoStore'
import toke from '../../../public/images/toke.svg'
import { IconMapPin, IconEdit, IconBrandDaysCounter, IconCalendarWeek, IconUsers, IconSettings } from '@tabler/icons-vue'
import dashboardCss from "@/assets/css/toke-dMain-04.css?url"
import { useRouter } from 'vue-router'
import HeadBuilder from "@/utils/HeadBuilder"

const router = useRouter()

interface Props {
  notificationCount?: number
}

withDefaults(defineProps<Props>(), {
  notificationCount: 0
})

const userStore = useUserStore()
const memoStore = useMemoStore()

const userMenuRef = ref<HTMLElement | null>(null)
const navContainerRef = ref<HTMLElement | null>(null)

const modules = ref([
  { title: "Statistiques", icon: IconBrandDaysCounter, path: "/dashboard" },
  { title: "Equipe",       icon: IconUsers,            path: "/equipe"    },
  { title: "Sites",        icon: IconMapPin,           path: "/sites"     },
  { title: "Memos",        icon: IconEdit,             path: "/memoList"  },
  { title: "Planning",     icon: IconCalendarWeek,     path: "/planning"  },
  { title: "Parametres",   icon: IconSettings,         path: "/setting"   },
])

const showUserMenu    = ref(false)
const indicatorStyle  = ref({})

const getActiveTab = (path: string) => {
  if (path.startsWith('/sites'))     return '/sites'
  if (path.startsWith('/equipe'))    return '/equipe'
  if (path.startsWith('/dashboard')) return '/dashboard'
  if (path.startsWith('/setting'))   return '/setting'
  if (path.startsWith('/planning'))  return '/planning'
  return path
}

const activeTab = ref(getActiveTab(window.location.pathname))

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const closeUserMenu = () => {
  showUserMenu.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  if (userMenuRef.value && !userMenuRef.value.contains(target)) {
    showUserMenu.value = false
  }
}

const logout = () => {
  userStore.logout()
  router.push('/')
}

const updateIndicator = () => {
  nextTick(() => {
    if (!navContainerRef.value) return
    const activeLink = navContainerRef.value.querySelector('.router-link-active') as HTMLElement
    if (activeLink) {
      const containerRect = navContainerRef.value.getBoundingClientRect()
      const linkRect      = activeLink.getBoundingClientRect()
      indicatorStyle.value = {
        width:     `${linkRect.width}px`,
        transform: `translateX(${linkRect.left - containerRect.left}px)`,
      }
    }
  })
}

const setActiveTab = (path: string) => {
  activeTab.value = getActiveTab(path)
  updateIndicator()
}

router.afterEach((to) => {
  activeTab.value = getActiveTab(to.path)
  updateIndicator()
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  updateIndicator()
  window.addEventListener('resize', updateIndicator)

  HeadBuilder.apply({
    title: 'Toké',
    css: [dashboardCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })

  const managerGuid = userStore.user?.guid
  if (managerGuid) {
    memoStore.startPolling(managerGuid)
  } else {
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
  window.removeEventListener('resize', updateIndicator)
  memoStore.stopPolling()
})
</script>

<style>
/* Badge pop — keyframe personnalisée non couverte par Tailwind de base */
@keyframes badge-pop {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
</style>