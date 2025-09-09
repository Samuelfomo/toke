<template>
  <div class="page-container">
    <main class="main-content">
      <h2 class="page-title">
        Quel module souhaitez-vous gérer?
      </h2>

      <div class="cards-grid">
        <div
          v-for="card in contentCards"
          :key="card.icon"
          class="card"
        >
          <div class="card-icon">
            <component :is="card.icon" stroke={2} :class="card.color" class="w-6 h-6 flex-shrink-0" />
          </div>
          <div class="card-label">{{ card.label }}</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IconFlag, IconLanguage, IconUsersGroup } from '@tabler/icons-vue'

// ✅ Import du CSS
import "../assets/css/toke-module-07.css"

const contentCards = ref([
  { icon: IconFlag, label: "Country", color: "text-green-600" },
  { icon: IconLanguage, label: "Lexicon", color: "text-blue-600", route: '/lexicon', roles: ['PARTNER', 'MANAGER'] },
  { icon: IconUsersGroup, label: "User", color: "text-purple-600" },
])
</script>
