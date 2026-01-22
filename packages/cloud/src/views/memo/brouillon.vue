<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

import {
  IconSearch,
  IconDotsVertical,
  IconSend,
  IconPaperclip,
  IconMicrophone,
  IconCheck,
  IconX,
  IconClock,
  IconUsers,
  IconArchive
} from '@tabler/icons-vue'

/* =======================
   TYPES
======================= */
interface Employee {
  id: string
  nom: string
  code: string
  avatar?: string
  departement: string
  memosNonLus: number
  dernierMemo?: {
    date: Date
    apercu: string
  }
}

interface Message {
  id: string
  contenu: string
  type: 'initial' | 'response' | 'validation'
  dateEnvoi: Date
  isFromManager: boolean
  fichiers?: Array<{ nom: string; type: string }>
  statut?: 'approved' | 'rejected'
}

/* =======================
   DONNÉES
======================= */
const employes = ref<Employee[]>([
  {
    id: '1',
    nom: 'Jean Dupont',
    code: 'EMP001',
    departement: 'Production',
    memosNonLus: 3,
    dernierMemo: {
      date: new Date(Date.now() - 1000 * 60 * 30),
      apercu: 'Justification de retard ce matin...'
    }
  },
  {
    id: '2',
    nom: 'Marie Martin',
    code: 'EMP002',
    departement: 'Logistique',
    memosNonLus: 1,
    dernierMemo: {
      date: new Date(Date.now() - 1000 * 60 * 120),
      apercu: "Demande d'absence pour raisons..."
    }
  }
])

const messages = ref<Message[]>([
  {
    id: '1',
    contenu: "Bonjour, je vous écris pour justifier mon retard de ce matin...",
    type: 'initial',
    dateEnvoi: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isFromManager: false,
    fichiers: [{ nom: 'justificatif_sncf.pdf', type: 'pdf' }]
  },
  {
    id: '2',
    contenu: "Merci pour votre justificatif. Pouvez-vous confirmer l'heure ?",
    type: 'response',
    dateEnvoi: new Date(Date.now() - 1000 * 60 * 60),
    isFromManager: true
  }
])

/* =======================
   ÉTATS
======================= */
const employeSelectionne = ref<Employee | null>(employes.value[0])
const searchTerm = ref('')
const filtreStatut = ref<'all' | 'pending'>('all')
const reponse = ref('')
const sidebarCollapsed = ref(false)
const messagesEndRef = ref<HTMLElement | null>(null)

/* =======================
   COMPUTED
======================= */
const totalMemosEnAttente = computed(() =>
    employes.value.reduce((sum, emp) => sum + emp.memosNonLus, 0)
)

const employesFiltres = computed(() =>
    employes.value
        .filter(emp =>
            emp.nom.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
            emp.code.toLowerCase().includes(searchTerm.value.toLowerCase())
        )
        .filter(emp => filtreStatut.value === 'pending' ? emp.memosNonLus > 0 : true)
)

/* =======================
   MÉTHODES
======================= */
const scrollToBottom = async () => {
  await nextTick()
  messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
}

watch(messages, scrollToBottom)

const formatTemps = (date: Date) => {
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (minutes < 60) return `Il y a ${minutes}min`
  if (hours < 24) return `Il y a ${hours}h`
  return date.toLocaleDateString('fr-FR')
}

const formatHeure = (date: Date) =>
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const getInitiales = (nom: string) =>
    nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

const envoyerMessage = () => {
  if (!reponse.value.trim()) return

  messages.value.push({
    id: Date.now().toString(),
    contenu: reponse.value,
    type: 'response',
    dateEnvoi: new Date(),
    isFromManager: true
  })

  reponse.value = ''
}
</script>

<template>
  <div class="flex h-screen bg-gray-50">
    <!-- SIDEBAR -->
    <div :class="[sidebarCollapsed ? 'w-20' : 'w-96', 'bg-white border-r flex flex-col transition-all']">

      <!-- HEADER -->
      <div class="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div v-if="!sidebarCollapsed">
          <div class="flex justify-between mb-3">
            <h1 class="text-xl font-bold">Mémos</h1>
            <IconDotsVertical class="cursor-pointer" @click="sidebarCollapsed = true" />
          </div>

          <div class="bg-white/10 rounded-lg p-3 mb-3 flex justify-between">
            <div class="flex gap-2 items-center">
              <IconClock size="18" /> En attente
            </div>
            <span class="text-xl font-bold">{{ totalMemosEnAttente }}</span>
          </div>

          <div class="relative">
            <IconSearch class="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" size="18"/>
            <input v-model="searchTerm"
                   placeholder="Rechercher un employé..."
                   class="w-full pl-9 pr-3 py-2 rounded-lg bg-white/10 outline-none" />
          </div>
        </div>

        <IconUsers v-else class="mx-auto cursor-pointer" size="26" @click="sidebarCollapsed=false"/>
      </div>

      <!-- LISTE EMPLOYÉS -->
      <div class="flex-1 overflow-y-auto">
        <div v-for="emp in employesFiltres" :key="emp.id"
             @click="employeSelectionne = emp"
             class="p-4 border-b hover:bg-gray-50 cursor-pointer">

          <div class="flex gap-3 items-center">
            <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
              {{ getInitiales(emp.nom) }}
            </div>
            <div v-if="!sidebarCollapsed">
              <p class="font-semibold">{{ emp.nom }}</p>
              <p class="text-xs text-gray-500">{{ emp.code }} • {{ emp.departement }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CONVERSATION -->
    <div class="flex-1 flex flex-col" v-if="employeSelectionne">

      <!-- HEADER CHAT -->
      <div class="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div>
          <h2 class="font-semibold text-lg">{{ employeSelectionne.nom }}</h2>
          <p class="text-sm text-gray-500">{{ employeSelectionne.code }} • {{ employeSelectionne.departement }}</p>
        </div>
        <IconArchive class="cursor-pointer"/>
      </div>

      <!-- MESSAGES -->
      <div class="flex-1 overflow-y-auto p-6 space-y-4">
        <div v-for="msg in messages" :key="msg.id" class="flex"
             :class="msg.isFromManager ? 'justify-end' : 'justify-start'">

          <div class="max-w-xl p-4 rounded-2xl"
               :class="msg.isFromManager ? 'bg-blue-600 text-white' : 'bg-white border'">
            <p>{{ msg.contenu }}</p>
            <span class="text-xs opacity-60 block mt-1">{{ formatHeure(msg.dateEnvoi) }}</span>
          </div>
        </div>
        <div ref="messagesEndRef"></div>
      </div>

      <!-- INPUT -->
      <div class="p-4 border-t bg-white flex gap-3 items-center">
        <IconPaperclip class="text-gray-500 cursor-pointer"/>
        <IconMicrophone class="text-gray-500 cursor-pointer"/>

        <textarea v-model="reponse"
                  placeholder="Écrivez votre réponse..."
                  @keydown.enter.prevent="envoyerMessage"
                  class="flex-1 border rounded-xl p-3 resize-none"></textarea>

        <button @click="envoyerMessage"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl">
          <IconSend/>
        </button>
      </div>
    </div>
  </div>
</template>
