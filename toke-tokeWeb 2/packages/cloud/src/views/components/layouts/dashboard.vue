<template>
  <div @mouseover="view = false"
       @mouseleave="view = true"
       class=" sidebar z-50 h-screen bg-[#283a52] text-white w-16 fixed left-0 top-0 lg:flex hidden flex-col justify-between transition-all duration-300 ease-in-out hover:w-64 group overflow-hidden"
  >
    <!-- Section Logo -->
    <div
        @click="router.push('/home')"
        class="logo-section p-4 flex items-center border-b border-[#87D04C] cursor-pointer"
    >
      <!--      <svg-->
      <!--          v-show="view"-->
      <!--          class="w-8 h-8 text-blue-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"-->
      <!--          stroke="#87D04C" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">-->
      <!--        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>-->
      <!--        <path d="M12 5l0 14"/>-->
      <!--        <path d="M5 12l14 0"/>-->
      <!--      </svg>-->
      <h1 v-show="view" class="text-white font-semibold text-center text-xl">PCA</h1>
      <div class="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center items-center w-full">
        <h1 class="text-white font-semibold text-center text-3xl">PRICERA</h1>
      </div>
    </div>

    <!-- Section Menus Principaux -->
    <div class="menu-section flex-grow">
      <!--    <div class="menu-section flex-grow overflow-y-auto">-->
      <ul class="py-4 space-y-2">
        <li v-for="(item, index) in filteredMenus" :key="index" class="px-3 cursor-pointer transition-transform hover:scale-110 duration-500" @click="router.push(item.route)">
          <a  class="flex items-center p-2 rounded-md hover:bg-gray-700 transition-colors duration-200">
            <!-- Icône toujours visible -->
            <component :is="item.icon" stroke={1} class="w-6 h-6 flex-shrink-0" />
            <!-- Texte visible uniquement au survol -->
            <span class="ml-4 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {{ item.label }}
            </span>
          </a>
        </li>
      </ul>
    </div>

    <!-- Section Configuration -->
    <div class="config-section">
      <ul class="py-4 space-y-2 ">
        <li v-for="(item, index) in configItems" :key="index" class="px-3 cursor-pointer transition hover:scale-110 duration-500" @click="router.push(item.route)">
          <a  class="flex items-center p-2 rounded-md hover:bg-gray-700 transition-colors duration-200">
            <!-- Icône toujours visible -->
            <component :is="item.icon" stroke={1} class="w-6 h-6 flex-shrink-0" />
            <!-- Texte visible uniquement au survol -->
            <span class="ml-4 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {{ item.label }}
            </span>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed} from 'vue';
import {useRouter} from "vue-router";
import { IconShoppingCart } from '@tabler/icons-vue';
import { IconHome } from '@tabler/icons-vue';
import { IconPlanet } from '@tabler/icons-vue';
import { IconBuildingFactory2 } from '@tabler/icons-vue';
import { IconLanguage } from '@tabler/icons-vue';
import { IconFlag } from '@tabler/icons-vue';
import { IconUsersGroup } from '@tabler/icons-vue';
import { IconClipboardText } from '@tabler/icons-vue';
import { IconCalendarDot } from '@tabler/icons-vue';
import { IconSettings } from '@tabler/icons-vue';
import { IconLogout } from '@tabler/icons-vue';


const router = useRouter();

const view = ref(true);

const menuItems = [
  {label: 'Menu', icon: IconHome, route: '/home', roles: ['PARTNER', 'MANAGER']},
  {label: 'Products', icon: IconShoppingCart, route: '/product', roles: ['MANAGER',]},
  {label: 'Survey', icon: IconCalendarDot, route: '/survey',  roles: ['MANAGER']},
  {label: 'Universe', icon: IconPlanet, route: '/universe', roles: ['PARTNER', 'MANAGER']},
  {label: 'Sector', icon: IconBuildingFactory2, route: '#', roles: ['PARTNER', 'MANAGER']},
  {label: 'Lexicon', icon: IconLanguage, route: '/lexicon', roles: ['PARTNER', 'MANAGER']},
  {label: 'Country', icon: IconFlag, route: '#', roles: ['PARTNER', 'MANAGER']},
  {label: 'User', icon: IconUsersGroup, route: '#', roles: ['PARTNER', 'MANAGER']},
];

const configItems = [
  {label: 'Documents', icon: IconClipboardText, route: '#', roles: ['PARTNER', 'MANAGER']},
  {label: 'Paramètres', icon: IconSettings, route: '#'},
  {label: 'Déconnexion', icon: IconLogout, route: '/'},
];

const filteredMenus = computed(() => {
  // return menuItems.filter(menu => menu.roles.includes(''));
  return menuItems;
});

</script>

<style>
.sidebar {
  overflow-x: hidden;
}
</style>
