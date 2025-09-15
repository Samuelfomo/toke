<template>
  <div>
    <!-- Utilisation du composant header réutilisable -->
<!--    <Header-->
<!--      :user-name="currentUser.name"-->
<!--      :company-name="currentUser.company"-->
<!--      :notification-count="notificationCount"-->
<!--    />-->

    <div class="page-container">
      <a href="/dashboard" @click.prevent="goBack" class="back-arrow-link">
        <IconArrowLeft />
      </a>

      <main class="main-content">
        <h2 class="page-title">
          Quel module souhaitez-vous gérer?
        </h2>

        <div class="cards-grid">
          <div
            v-for="card in contentCards"
            :key="card.label"
            class="card"
            @click="handleCardClick(card)"
            :class="{ 'card-clickable': card.route }"
          >
            <div class="card-icon">
              <component
                :is="card.icon"
                :stroke-width="2"
                :class="card.color"
                class="icon-size"
              />
            </div>
            <div class="card-label">{{ card.label }}</div>

            <!-- Badge optionnel pour indiquer les rôles requis -->
            <div v-if="card.roles" class="card-roles">
              <span
                v-for="role in card.roles"
                :key="role"
                class="role-badge"
              >
                {{ role }}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router'
import { IconFlag, IconLanguage, IconLicense, IconUsersGroup, IconArrowLeft } from '@tabler/icons-vue'
import Header from '../views/components/header.vue' // Import du composant header
import moduleCss from "../assets/css/toke-module-07.css?url"
import HeadBuilder from '@/utils/HeadBuilder';

const router = useRouter()

// Données pour le header
const currentUser = ref({
  name: 'Danielle',
  company: 'IMEDIATIS'
})

const notificationCount = ref(0) // Aucune notification sur cette page

// Fonction pour revenir à la page précédente
const goBack = () => {
  router.back()
}

const contentCards = ref([
  {
    icon: IconFlag,
    label: "Country",
    color: "text-green-600",
    route: ''
  },
  {
    icon: IconLanguage,
    label: "Lexicon",
    color: "text-blue-600",
    route: '',
    roles: ''
  },
  {
    icon: IconUsersGroup,
    label: "User",
    color: "text-purple-600",
    route: '/users'
  },
  {
    icon: IconLicense,
    label: "License",
    color: "text-yellow-600",
    route: ''
  },
])

// Fonction pour gérer le clic sur une carte
const handleCardClick = (card: any) => {
  if (card.route) {
    router.push(card.route)
    console.log(`Navigation vers: ${card.route}`)
  } else {
    console.log(`Module ${card.label} cliqué - aucune route définie`)
  }
}
onMounted(() => {
  HeadBuilder.apply({
    title: `module- Toké`,
    css: [moduleCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})

</script>