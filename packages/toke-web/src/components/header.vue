<template>
  <header class="bg-gradient-to-r from-slate-50 via-gray-50 to-blue-50 shadow-lg w-full z-40 backdrop-blur-sm border-b border-white/20">
    <div class="max-w-7xl ml-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-end h-16">

        <!-- Search Bar - Responsive -->
        <div class="flex-1 max-w-[16rem] mx-4 lg:mx-8">
          <div class="relative">
            <div class="flex items-center bg-[#283a52] hover:bg-[#283a52]-500 rounded-2xl px-4 py-3 transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm">
              <svg class="h-6 w-5 text-white mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Rechercher..."
                  class="flex-1 bg-transparent border-none outline-none text-white placeholder-blue-100 text-sm font-medium"
                  @keyup.enter="handleSearch"
              >
              <div v-if="searchQuery" class="ml-2">
                <button @click="clearSearch" class="text-blue-100 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right section - Notifications & User Profile -->
        <div class="flex items-center space-x-4">

          <!-- Notifications -->
          <div class="relative">
            <button
                @click="toggleNotifications"
                class="p-2 bg-white/60 rounded-xl hover:bg-white/80 transition-all duration-200 relative group backdrop-blur-sm border border-white/30"
            >
              <svg class="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5V3z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              </svg>
              <!-- Notification badge -->
              <span class="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                <span class="text-[10px] text-white font-medium">3</span>
              </span>
            </button>

            <!-- Notifications Dropdown -->
            <transition name="dropdown">
              <div v-if="showNotifications" class="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-white/20 py-1 z-50">
                <div class="px-4 py-3 border-b border-gray-100">
                  <h3 class="text-sm font-semibold text-gray-900">Notifications</h3>
                </div>
                <div class="max-h-64 overflow-y-auto">
                  <div class="px-4 py-3 hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                    <div class="flex items-start space-x-3">
                      <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        </div>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-900">Nouveau message reçu</p>
                        <p class="text-xs text-gray-500 mt-1">Il y a 5 minutes</p>
                      </div>
                    </div>
                  </div>
                  <div class="px-4 py-3 text-center">
                    <a href="#" class="text-sm text-blue-600 hover:text-blue-800 font-medium">Voir toutes les notifications</a>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- User Profile Menu -->
          <div class="relative">
            <button
                @click="toggleUserMenu"
                class="flex items-center space-x-3 p-2 bg-white/60 rounded-xl hover:bg-white/80 transition-all duration-200 group backdrop-blur-sm border border-white/30"
            >
              <img :src="userAvatar" alt="Avatar" class="w-8 h-8 rounded-full border-2 border-white shadow-sm">
              <div class="hidden sm:block text-left">
                <p class="text-sm font-medium text-gray-700 group-hover:text-gray-900">{{ user.name }}</p>
                <p class="text-xs text-gray-500">{{ user.role }}</p>
              </div>
              <svg class="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-transform group-hover:rotate-180 duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <!-- User Dropdown Menu -->
            <transition name="dropdown">
              <div v-if="showUserMenu" class="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-white/20 py-1 z-50">
                <div class="px-4 py-3 border-b border-gray-100">
                  <div class="flex items-center space-x-3">
                    <img :src="userAvatar" alt="Avatar" class="w-10 h-10 rounded-full">
                    <div>
                      <p class="text-sm font-semibold text-gray-900">{{ user.name }}</p>
                      <p class="text-xs text-gray-500">{{ user.email }}</p>
                    </div>
                  </div>
                </div>

                <div class="py-1">
                  <a href="#" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50/50 transition-colors">
                    <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    Mon Profil
                  </a>
                  <a href="#" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50/50 transition-colors">
                    <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Paramètres
                  </a>
                  <a href="#" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50/50 transition-colors">
                    <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Aide
                  </a>
                </div>

                <div class="border-t border-gray-100 py-1">
                  <button
                      @click="logout"
                      class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50/50 transition-colors"
                  >
                    <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    Déconnexion
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from "vue-router";

const router = useRouter();

// Search functionality
const searchQuery = ref('');

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    console.log('Recherche:', searchQuery.value);
    // Implémentez votre logique de recherche ici
  }
};

const clearSearch = () => {
  searchQuery.value = '';
};

// User data
const user = ref({
  name: "Danielle Myrtille",
  email: "Danymyrtille@gmail.com",
  role: "Administrateur",
  balance: 12850.75,
  expenses: 3420.50,
  savings: 5600.25
});

// Menu states
const showNotifications = ref(false);
const showUserMenu = ref(false);

// User avatar - remplacez par votre image
const userAvatar = "data:image/svg+xml,%3csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100' height='100' fill='%234F46E5'/%3e%3ctext x='50' y='50' font-size='50' fill='white' text-anchor='middle' dy='0.1em'%3eM%3c/text%3e%3c/svg%3e";

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value;
  if (showUserMenu.value) showUserMenu.value = false;
};

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
  if (showNotifications.value) showNotifications.value = false;
};

const logout = async () => {
  await router.push('/');
};

// Close dropdowns when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Element;
  if (!target.closest('.relative')) {
    showNotifications.value = false;
    showUserMenu.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
/* Animation pour les hover effects */
@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.group:hover .shimmer {
  animation: shimmer 1.5s ease-in-out infinite;
}
</style>