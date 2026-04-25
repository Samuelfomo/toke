<template>
  <div class="min-h-screen flex flex-col bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7]">
    <!-- Header -->
    <div class="top-header">
      <Header />
    </div>

    <!-- Main Container -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Sidebar avec liste des mémos -->
      <div class="w-[420px] flex flex-col bg-white border-r border-gray-200 flex-shrink-0">
        <!-- En-tête de la sidebar -->
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h1 class="text-xl font-bold text-gray-900">Mémos</h1>
              <p class="text-xs text-gray-500 mt-0.5">Gérez tous les mémos</p>
            </div>
            <button
                @click="naviguerCreerMemo"
                class="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
            >
              <span class="text-base leading-none">+</span>
              <span>Nouveau</span>
            </button>
          </div>

          <!-- Recherche -->
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" stroke-width="2"/>
              <path stroke-linecap="round" stroke-width="2" d="M21 21l-4.35-4.35"/>
            </svg>
            <input
                v-model="recherche"
                type="text"
                placeholder="Rechercher un mémo..."
                class="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <!-- Filtres compacts -->
        <div class="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div class="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <!-- Filtre Type -->
            <select
                v-model="filtres.type"
                class="text-xs px-2 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous types</option>
              <option v-for="t in memoTypes.slice(1)" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>

            <!-- Filtre Statut -->
            <select
                v-model="filtres.statut"
                class="text-xs px-2 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous statuts</option>
              <option v-for="s in memoStatuts" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>

            <!-- Filtre Employé -->
            <select
                v-model="filtres.employeId"
                class="text-xs px-2 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous employés</option>
              <option v-for="emp in employesFiltreOptions" :key="emp.guid" :value="emp.guid">{{ emp.nom }}</option>
            </select>

            <!-- Bouton reset -->
            <button
                v-if="hasActiveFiltres"
                @click="reinitialiserFiltres"
                class="text-xs px-2 py-1.5 text-gray-600 hover:text-gray-900 flex-shrink-0"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Liste des mémos -->
        <div class="flex-1 overflow-y-auto">
          <!-- Chargement -->
          <div v-if="memoStore.isLoading" class="flex flex-col items-center justify-center py-12 gap-3">
            <div class="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p class="text-xs text-gray-500">Chargement...</p>
          </div>

          <!-- Liste vide -->
          <div v-else-if="memosFiltres.length === 0" class="flex flex-col items-center justify-center py-12 gap-2">
            <span class="text-4xl">📝</span>
            <p class="text-sm font-medium text-gray-700">Aucun mémo trouvé</p>
            <p class="text-xs text-gray-500">{{ hasActiveFiltres ? 'Modifiez vos filtres' : 'Créez votre premier mémo' }}</p>
          </div>

          <!-- Mémos -->
          <div v-else class="divide-y divide-gray-100">
            <div
                v-for="memo in memosFiltres"
                :key="memo.guid"
                @click="selectionnerMemo(memo)"
                :class="[
                  'px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors',
                  memoSelectionne?.guid === memo.guid ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                ]"
            >
              <!-- En-tête de la carte -->
              <div class="flex items-start gap-3 mb-2">
                <!-- Icône type -->
                <div :class="['w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base', typeIconBg(memo.type)]">
                  {{ getTypeIcon(memo.type) }}
                </div>

                <!-- Info principale -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="text-sm font-semibold text-gray-900 truncate flex-1">{{ memo.titre }}</h3>
                    <span :class="['px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0', statusBadgeClass(memo.statut)]">
                      {{ getStatusLabel(memo.statut) }}
                    </span>
                  </div>

                  <!-- Interlocuteur -->
                  <div class="flex items-center gap-2 text-xs text-gray-600 mb-1">
                    <div class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span v-if="memo.autoGenerated" class="text-xs">🤖</span>
                      <span v-else class="text-[10px] font-semibold">{{ initials(memo.interlocuteurNom) }}</span>
                    </div>
                    <span class="truncate">{{ memo.autoGenerated ? 'System' : (memo.interlocuteurNom || '—') }}</span>
                  </div>

                  <!-- Date et messages -->
                  <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>{{ formatDateCompact(memo.dateCreation) }}</span>
                    <div class="flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                      </svg>
                      <span>{{ memo.messagesCount }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer de la sidebar avec compteur -->
        <div class="px-4 py-2 border-t border-gray-200 bg-gray-50/50">
          <p class="text-xs text-gray-500 text-center">
            {{ memosFiltres.length }} mémo{{ memosFiltres.length > 1 ? 's' : '' }}
          </p>
        </div>
      </div>

      <!-- Zone de détail du mémo (à droite) -->
      <div class="flex-1 flex flex-col bg-white relative">
        <!-- État vide : aucun mémo sélectionné -->
        <div v-if="!memoSelectionne" class="flex-1 flex items-center justify-center">
          <div class="text-center max-w-md px-6">
            <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">Sélectionnez un mémo</h2>
            <p class="text-sm text-gray-500 mb-6">Choisissez un mémo dans la liste pour voir ses détails et continuer la conversation.</p>
            <button
                @click="naviguerCreerMemo"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <span class="text-lg leading-none">+</span>
              <span>Créer un nouveau mémo</span>
            </button>
          </div>
        </div>

        <!-- Détail du mémo sélectionné -->
        <div v-else class="flex-1 flex flex-col">
          <!-- Input fichier caché -->
          <input
              type="file"
              ref="fileInput"
              @change="ajouterFichiers"
              multiple
              accept=".txt,.pdf,.jpg,.jpeg,.png,.mp3,.wav,.webm,.ogg"
              class="hidden"
          />

          <!-- Header du mémo -->
          <div class="px-6 py-4 border-b border-gray-200 bg-white">
            <div class="flex items-start justify-between gap-4">
              <!-- Info mémo -->
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h2 class="text-lg font-bold text-gray-900">{{ interlocuteurNom }}</h2>
                  <span :class="['px-2.5 py-1 rounded-full text-xs font-semibold', statusBadgeClass(memoSelectionne.statut)]">
                    {{ getStatusLabel(memoSelectionne.statut) }}
                  </span>
                </div>
                <div class="flex items-center gap-4 text-sm text-gray-600">
                  <span class="flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                    </svg>
                    {{ getTypeLabel(memoSelectionne.type) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                      <line x1="16" y1="2" x2="16" y2="6" stroke-width="2"/>
                      <line x1="8" y1="2" x2="8" y2="6" stroke-width="2"/>
                      <line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/>
                    </svg>
                    {{ formatDate(memoSelectionne.dateCreation) }}
                  </span>
                  <span>ID: {{ memoSelectionne.guid.slice(-8) }}</span>
                </div>
              </div>

              <!-- Actions header -->
              <div class="flex items-center gap-2">
                <button
                    v-if="peutAgir"
                    @click="showValidationPanel = !showValidationPanel"
                    :class="[
                      'p-2 rounded-lg transition-colors',
                      showValidationPanel ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                    ]"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Zone de conversation -->
          <div class="flex-1 flex overflow-hidden">
            <!-- Messages -->
            <div class="flex-1 overflow-y-auto px-6 py-4">
              <div v-if="isLoadingMemo" class="flex items-center justify-center py-12">
                <div class="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>

              <div v-else class="space-y-4">
                <!-- Messages de la conversation -->
                <div
                    v-for="(message, index) in chatMessages"
                    :key="index"
                    :class="[
                      'flex gap-3',
                      message.isFromManager ? 'justify-end' : 'justify-start'
                    ]"
                >
                  <!-- Avatar (gauche pour employé) -->
                  <div v-if="!message.isFromManager" class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span class="text-xs font-semibold text-gray-600">{{ initials(interlocuteurNom) }}</span>
                  </div>

                  <!-- Bulle de message -->
                  <div :class="[
                    'max-w-[70%] rounded-2xl px-4 py-3',
                    message.isFromManager
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                  ]">
                    <!-- Contenu texte -->
                    <p v-if="message.contenu" class="text-sm whitespace-pre-wrap">{{ message.contenu }}</p>

                    <!-- Fichiers attachés -->
                    <div v-if="message.fichiers.length > 0" class="space-y-2" :class="{ 'mt-2': message.contenu }">
                      <div
                          v-for="fichier in message.fichiers"
                          :key="fichier.id"
                          class="flex items-center gap-2 p-2 rounded-lg bg-white/10"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                        </svg>
                        <span class="text-xs truncate flex-1">{{ fichier.nom }}</span>
                      </div>
                    </div>

                    <!-- Horodatage -->
                    <p class="text-xs mt-2 opacity-70">{{ formatTime(message.dateEnvoi) }}</p>
                  </div>

                  <!-- Avatar (droite pour manager) -->
                  <div v-if="message.isFromManager" class="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
                    <span class="text-xs font-semibold text-white">{{ userInitials }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Panneau de validation (droite) -->
            <transition name="slide">
              <div v-if="peutAgir && showValidationPanel" class="w-80 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
                <div class="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 class="font-semibold text-gray-900">Actions</h3>
                  <button @click="showValidationPanel = false" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>

                <div class="flex-1 p-4 space-y-4 overflow-y-auto">
                  <!-- Info -->
                  <div class="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <svg class="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="text-xs text-blue-800">Vous pouvez répondre avant de prendre une décision.</p>
                  </div>

                  <!-- Boutons d'action -->
                  <div class="space-y-2">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Décision</h4>

                    <button
                        @click="approuverMemo"
                        :disabled="isProcessing"
                        class="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition-all"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                      <div class="text-left flex-1">
                        <div class="text-sm font-semibold">Approuver</div>
                        <div class="text-xs opacity-90">Marquer comme validé</div>
                      </div>
                    </button>

                    <button
                        @click="rejeterMemo"
                        :disabled="isProcessing"
                        class="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 transition-all"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                      <div class="text-left flex-1">
                        <div class="text-sm font-semibold">Rejeter</div>
                        <div class="text-xs opacity-90">Refuser la demande</div>
                      </div>
                    </button>

                    <button
                        @click="revoquerMemo"
                        :disabled="isProcessing"
                        class="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 transition-all"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                      </svg>
                      <div class="text-left flex-1">
                        <div class="text-sm font-semibold">Révoquer</div>
                        <div class="text-xs opacity-90">Annuler définitivement</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- Zone d'input (bas) -->
          <div v-if="peutRepondre" class="px-6 py-4 border-t border-gray-200 bg-white">
            <!-- Fichiers attachés -->
            <div v-if="fichiers.length > 0" class="mb-3 flex flex-wrap gap-2">
              <div
                  v-for="(file, index) in fichiers"
                  :key="index"
                  class="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm"
              >
                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
                <span class="text-gray-700">{{ file.name }}</span>
                <button @click="supprimerFichier(index)" class="text-gray-400 hover:text-red-600">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Input -->
            <div class="flex items-end gap-2">
              <div class="flex-1 flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white">
                <input
                    v-model="reponseContenu"
                    type="text"
                    placeholder="Écrire une réponse..."
                    class="flex-1 outline-none text-sm"
                    @keydown.enter="envoyerReponse"
                />
                <button
                    @click="fileInput?.click()"
                    class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                  </svg>
                </button>
              </div>
              <button
                  @click="envoyerReponse"
                  :disabled="!reponseContenu.trim() && fichiers.length === 0"
                  class="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import router from '@/router';
import { useUserStore } from '@/stores/userStore';
import { useMemoStore, type Memo, type MemoContent } from '@/stores/memoStore';
import Header from '@/views/components/header.vue';
import HeadBuilder from '@/utils/HeadBuilder';
import MemoService, { MessageContent } from '@/service/MemoService';

// ══════════════════════════════════════════════════════════════
// STORES & STATE
// ══════════════════════════════════════════════════════════════

const userStore = useUserStore();
const memoStore = useMemoStore();
const managerGuid = computed(() => userStore.user?.guid ?? '');
const userInitials = computed(() => userStore.userInitials || '?');

// Filtres et recherche
const recherche = ref('');
const filtres = ref({ employeId: '', type: '', statut: '' });

// Mémo sélectionné
const memoSelectionne = ref<Memo | null>(null);
const isLoadingMemo = ref(false);
const showValidationPanel = ref(false);

// Réponse
const reponseContenu = ref('');
const fichiers = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const isProcessing = ref(false);

// ══════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════

const memoTypes = [
  { value: '', label: 'Tous les types' },
  { value: 'delay_justification', label: 'Retard' },
  { value: 'absence_justification', label: 'Absence' },
  { value: 'session_closure', label: 'Clôture' },
  { value: 'correction_request', label: 'Correction' },
  { value: 'auto_generated', label: 'Auto' },
];

const memoStatuts = [
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvé' },
  { value: 'rejected', label: 'Rejeté' },
];

// ══════════════════════════════════════════════════════════════
// COMPUTED
// ══════════════════════════════════════════════════════════════

const employesFiltreOptions = computed(() => {
  const map = new Map<string, { guid: string; nom: string }>();
  for (const memo of memoStore.memos) {
    if (memo.destinataireId && memo.destinataireId !== managerGuid.value && memo.destinataireNom && memo.destinataireNom !== 'N/A') {
      map.set(memo.destinataireId, { guid: memo.destinataireId, nom: memo.destinataireNom });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom));
});

const getInterlocuteur = (memo: any) => {
  const destNom = memo.destinataireNom && memo.destinataireNom !== 'N/A' ? memo.destinataireNom : null;
  const creatNom = memo.createurNom || null;

  if (memo.autoGenerated) return {
    nom: destNom ?? creatNom ?? '—',
    code: memo.destinataireCode !== 'N/A' ? memo.destinataireCode : memo.createurCode,
    departement: memo.destinataireDepartement !== 'N/A' ? memo.destinataireDepartement : memo.createurDepartement,
  };
  return {
    nom: destNom ?? '—',
    code: memo.destinataireCode !== 'N/A' ? memo.destinataireCode : '',
    departement: memo.destinataireDepartement !== 'N/A' ? memo.destinataireDepartement : '',
  };
};

const memosFiltres = computed(() => {
  let result = [...memoStore.memos];

  if (filtres.value.employeId) {
    result = result.filter(m => m.destinataireId === filtres.value.employeId);
  }
  if (filtres.value.type) {
    result = result.filter(m => m.type === filtres.value.type);
  }
  if (filtres.value.statut) {
    result = result.filter(m => {
      if (filtres.value.statut === 'pending') return m.statut === 'pending' || m.statut === 'submitted';
      return m.statut === filtres.value.statut;
    });
  }
  if (recherche.value.trim()) {
    const q = recherche.value.toLowerCase();
    result = result.filter(m =>
        m.titre?.toLowerCase().includes(q) ||
        m.destinataireNom?.toLowerCase().includes(q) ||
        m.contenu?.toLowerCase().includes(q)
    );
  }

  result.sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());

  return result.map(m => {
    const interlocuteur = getInterlocuteur(m);
    return { ...m, interlocuteurNom: interlocuteur.nom, interlocuteurCode: interlocuteur.code, interlocuteurDepartement: interlocuteur.departement };
  });
});

const hasActiveFiltres = computed(() =>
    !!filtres.value.type || !!filtres.value.employeId || !!filtres.value.statut || !!recherche.value
);

// Détail du mémo sélectionné
const interlocuteurNom = computed(() => {
  if (!memoSelectionne.value) return '';
  if (memoSelectionne.value.autoGenerated) return 'System';
  return memoSelectionne.value.createurId === managerGuid.value
      ? memoSelectionne.value.destinataireNom
      : memoSelectionne.value.createurNom;
});

const peutAgir = computed(() =>
    !!memoSelectionne.value && (memoSelectionne.value.statut === 'pending' || memoSelectionne.value.statut === 'submitted')
);

const peutRepondre = computed(() => !!memoSelectionne.value);

interface AttachedFile {
  id: string;
  nom: string;
  type: 'text' | 'image' | 'pdf' | 'audio';
  url: string;
  dateAjout: Date;
}

interface ConversationMessage {
  contenu: string;
  fichiers: AttachedFile[];
  dateEnvoi: Date;
  isFromManager: boolean;
  type: 'initial' | 'response' | 'validation';
}

const chatMessages = computed<ConversationMessage[]>(() => {
  if (!memoSelectionne.value?.memoContent) return [];

  return memoSelectionne.value.memoContent.map((content: MemoContent) => {
    const isFromManager = content.user === managerGuid.value;

    let texte = '';
    const fichiers: AttachedFile[] = [];

    if (content.message && Array.isArray(content.message)) {
      content.message.forEach((msg: { type: string; content: string }) => {
        if (msg.type === 'text') {
          texte = msg.content;
        } else if (msg.type === 'link') {
          const url = msg.content;
          const filename = url.split('/').pop() || 'fichier';
          let fileType: 'text' | 'image' | 'pdf' | 'audio' = 'text';

          if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) fileType = 'image';
          else if (url.match(/\.pdf$/i)) fileType = 'pdf';
          else if (url.match(/\.(mp3|m4a|wav|ogg|webm)$/i)) fileType = 'audio';

          fichiers.push({
            id: `${content.created_at}-${url}`,
            nom: filename,
            type: fileType,
            url: url,
            dateAjout: new Date(content.created_at)
          });
        }
      });
    }

    return {
      contenu: texte,
      fichiers,
      dateEnvoi: new Date(content.created_at),
      isFromManager,
      type: content.type
    };
  });
});

// ══════════════════════════════════════════════════════════════
// METHODS
// ══════════════════════════════════════════════════════════════

const reinitialiserFiltres = () => {
  filtres.value = { employeId: '', type: '', statut: '' };
  recherche.value = '';
};

const naviguerCreerMemo = () => router.push('/memoNew');

const selectionnerMemo = async (memo: Memo) => {
  isLoadingMemo.value = true;
  memoStore.markMemoAsRead(memo.guid);

  // Charger le mémo complet
  await memoStore.refreshMemo(managerGuid.value, memo.guid);
  memoSelectionne.value = memoStore.getMemoByGuid(memo.guid) || memo;

  isLoadingMemo.value = false;
  showValidationPanel.value = false;
};

const chargerMemos = async () => {
  try {
    const managerId = userStore.user?.guid;
    if (!managerId) return;
    await memoStore.loadMemos(managerId);
  } catch (error) {
    console.error('Erreur chargement mémos:', error);
  }
};

const ajouterFichiers = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files) return;
  fichiers.value = [...fichiers.value, ...Array.from(target.files)];
  target.value = '';
};

const supprimerFichier = (index: number) => {
  fichiers.value.splice(index, 1);
};

const envoyerReponse = async () => {
  if (!memoSelectionne.value || (!reponseContenu.value.trim() && fichiers.value.length === 0)) return;

  try {
    isProcessing.value = true;

    let uploadedFiles: any[] = [];
    if (fichiers.value.length > 0) {
      uploadedFiles = await MemoService.uploadMultipleFiles(fichiers.value);
    }

    const messageContent = MemoService.buildMessageContent(reponseContenu.value, uploadedFiles);

    await MemoService.sendReply(memoSelectionne.value.guid, {
      user: managerGuid.value,
      message: messageContent
    });

    await memoStore.refreshMemo(managerGuid.value, memoSelectionne.value.guid);
    memoSelectionne.value = memoStore.getMemoByGuid(memoSelectionne.value.guid) || memoSelectionne.value;

    reponseContenu.value = '';
    fichiers.value = [];

  } catch (error) {
    console.error('Erreur envoi réponse:', error);
    alert('Erreur lors de l\'envoi de la réponse');
  } finally {
    isProcessing.value = false;
  }
};

const approuverMemo = async () => {
  if (!memoSelectionne.value) return;

  try {
    isProcessing.value = true;

    // Envoyer une réponse si du contenu est présent
    if (reponseContenu.value.trim() || fichiers.value.length > 0) {
      await envoyerReponse();
    }

    await MemoService.validateMemo(memoSelectionne.value.guid, managerGuid.value);
    await memoStore.refreshMemo(managerGuid.value, memoSelectionne.value.guid);
    memoSelectionne.value = memoStore.getMemoByGuid(memoSelectionne.value.guid) || null;

    showValidationPanel.value = false;
  } catch (error) {
    console.error('Erreur approbation:', error);
    alert('Erreur lors de l\'approbation');
  } finally {
    isProcessing.value = false;
  }
};

const rejeterMemo = async () => {
  if (!memoSelectionne.value) return;

  try {
    isProcessing.value = true;

    if (reponseContenu.value.trim() || fichiers.value.length > 0) {
      await envoyerReponse();
    }

    await MemoService.rejetMemo(memoSelectionne.value.guid, managerGuid.value);
    await memoStore.refreshMemo(managerGuid.value, memoSelectionne.value.guid);
    memoSelectionne.value = memoStore.getMemoByGuid(memoSelectionne.value.guid) || null;

    showValidationPanel.value = false;
  } catch (error) {
    console.error('Erreur rejet:', error);
    alert('Erreur lors du rejet');
  } finally {
    isProcessing.value = false;
  }
};

const revoquerMemo = async () => {
  if (!memoSelectionne.value) return;

  if (!confirm('Êtes-vous sûr de vouloir révoquer ce mémo ?')) return;

  try {
    isProcessing.value = true;

    // TODO: Implémenter l'endpoint de révocation
    // await MemoService.revokeMemo(memoSelectionne.value.guid, managerGuid.value);

    await memoStore.refreshMemo(managerGuid.value, memoSelectionne.value.guid);
    memoSelectionne.value = null;
    showValidationPanel.value = false;
  } catch (error) {
    console.error('Erreur révocation:', error);
    alert('Erreur lors de la révocation');
  } finally {
    isProcessing.value = false;
  }
};

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

const initials = (name?: string): string => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

const formatDateCompact = (date: Date | string): string => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins}min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const formatTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const getTypeIcon = (type: string): string => ({
  delay_justification: '⏱',
  absence_justification: '🏥',
  absence_notification: '📢',
  session_closure: '🔒',
  auto_generated: '🤖',
  correction_request: '✏️',
}[type] ?? '📝');

const getTypeLabel = (type: string): string => ({
  delay_justification: 'Retard',
  absence_justification: 'Absence',
  absence_notification: 'Notification',
  session_closure: 'Clôture',
  auto_generated: 'Auto',
  correction_request: 'Correction',
}[type] ?? type);

const getStatusLabel = (status: string): string => ({
  pending: 'En attente',
  submitted: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
}[status] ?? status);

const typeIconBg = (type: string): string => ({
  delay_justification: 'bg-blue-50 text-blue-600',
  absence_justification: 'bg-yellow-50 text-yellow-600',
  session_closure: 'bg-red-50 text-red-600',
  auto_generated: 'bg-purple-50 text-purple-600',
  correction_request: 'bg-red-50 text-red-600',
  absence_notification: 'bg-orange-50 text-orange-600',
}[type] ?? 'bg-gray-50 text-gray-600');

const statusBadgeClass = (status: string): string => ({
  pending: 'bg-orange-100 text-orange-700',
  submitted: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}[status] ?? 'bg-gray-100 text-gray-600');

// ══════════════════════════════════════════════════════════════
// LIFECYCLE
// ══════════════════════════════════════════════════════════════

onMounted(async () => {
  HeadBuilder.apply({
    title: 'Mémos - Toké',
    css: [],
    meta: { viewport: 'width=device-width, initial-scale=1.0' }
  });
  await chargerMemos();
  memoStore.markAllMemosAsRead();
});
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Transition pour le panneau de validation */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>