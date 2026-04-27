<template>
  <div class="flex flex-col min-h-0 h-full gap-2">

    <!-- Filtres compacts -->
    <div class="bg-white rounded-2xl shadow-sm p-4 flex-shrink-0">

      <!-- Recherche -->
      <div class="relative mb-2">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" stroke-width="2"/>
          <path stroke-linecap="round" stroke-width="2" d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          :value="recherche"
          @input="$emit('update:recherche', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Rechercher un mémo..."
          class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Type + Statut -->
      <div class="grid grid-cols-2 gap-2 mb-2">
        <div class="relative">
          <select
            :value="filtres.type"
            @change="$emit('update:filtres', { ...filtres, type: ($event.target as HTMLSelectElement).value })"
            class="w-full appearance-none pl-2 pr-6 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">Tous les types</option>
            <option v-for="t in memoTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
          <svg class="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        <div class="relative">
          <select
            :value="filtres.statut"
            @change="$emit('update:filtres', { ...filtres, statut: ($event.target as HTMLSelectElement).value })"
            class="w-full appearance-none pl-2 pr-6 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">Tous les statuts</option>
            <option v-for="s in memoStatuts" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
          <svg class="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>

      <!-- Employé + Tri + Reset -->
      <div class="flex gap-5">
        <div class="relative flex-1">
          <select
            :value="filtres.employeId"
            @change="$emit('update:filtres', { ...filtres, employeId: ($event.target as HTMLSelectElement).value })"
            class="w-full appearance-none pl-2 pr-6 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">Tous les employés</option>
            <option v-for="emp in employesOptions" :key="emp.guid" :value="emp.guid">{{ emp.nom }}</option>
          </select>
          <svg class="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        <div class="flex justify-end items-center">
          <button
              @click="$emit('reinitialiser')"
              class="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
              title="Réinitialiser"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>

      </div>
    </div>

    <!-- Liste -->
    <div class="flex-1 flex flex-col min-h-0 overflow-hidden">

      <!-- Header liste -->
      <div class="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 flex-shrink-0">
        <span class="text-xs font-medium text-gray-500">{{ memos.length }} mémo{{ memos.length > 1 ? 's' : '' }}</span>
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-gray-400">Trier :</span>
          <div class="relative">
            <select
              :value="tri"
              @change="$emit('update:tri', ($event.target as HTMLSelectElement).value)"
              class="appearance-none pl-2 pr-5 py-1 border border-gray-200 rounded-md text-xs text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="recent">Plus récent</option>
              <option value="oldest">Plus ancien</option>
              <option value="name">Nom</option>
            </select>
            <svg class="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- État loading -->
      <div v-if="isLoading" class="flex-1 flex items-center justify-center">
        <div class="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>

      <!-- État vide -->
      <div v-else-if="memos.length === 0" class="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 py-8">
        <span class="text-4xl">📝</span>
        <p class="text-xs text-center px-4">Aucun mémo ne correspond à vos critères</p>
      </div>

      <!-- Items -->
<!--      <div v-else class="flex-1 overflow-y-auto space-y-2 bg-gray-50">-->
        <div v-else class="flex-1 overflow-y-auto space-y-2 bg-gray-50 max-h-[460px]">
        <div
          v-for="memo in memosPagines"
          :key="memo.guid"
          @click="$emit('select', memo)"
          :class="[
            'flex items-start gap-3 px-3 py-3 cursor-pointer border-y border-white transition-colors rounded-md',
            selectedGuid === memo.guid
              ? 'bg-blue-50 border-l-2 border-l-blue-500'
              : 'hover:bg-blue-50 border-l-2 border-l-transparent bg-white'
          ]"
        >
          <!-- Icône type -->
          <div :class="['w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base mt-0.5', typeIconBg(memo.type)]">
            {{ getTypeIcon(memo.type) }}
          </div>

          <!-- Contenu -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-1 mb-0.5">
              <span class="text-xs font-semibold text-gray-900 truncate leading-tight">{{ memo.titre }}</span>
              <span class="text-xs text-gray-400 flex-shrink-0">{{ formatHeure(memo.dateCreation) }}</span>
            </div>
            <div class="flex items-center gap-1.5 mb-1">
              <span class="text-xs text-gray-600 truncate">
                {{ memo.autoGenerated ? 'System' : (memo.interlocuteurNom || '—') }}
              </span>
              <span v-if="memo.interlocuteurCode" class="text-xs text-gray-400 truncate">· {{ memo.interlocuteurCode }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span :class="['px-1.5 py-0.5 rounded-full text-xs font-medium', statusBadgeClass(memo.statut)]">
                {{ getStatusLabel(memo.statut) }}
              </span>
              <div class="flex items-center gap-0.5 text-gray-400">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                <span class="text-xs">{{ memo.messagesCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination footer -->
      <div v-if="totalPages > 1" class="border-t border-gray-100 px-3 py-2 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-1">
          <button @click="currentPage--" :disabled="currentPage === 1"
            class="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <template v-for="page in paginationPages" :key="page">
            <button v-if="page !== '...'" @click="currentPage = +page"
              :class="['w-6 h-6 rounded text-xs font-medium transition-colors',
                currentPage === +page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100']">
              {{ page }}
            </button>
            <span v-else class="w-6 h-6 flex items-center justify-center text-gray-400 text-xs">…</span>
          </template>
          <button @click="currentPage++" :disabled="currentPage === totalPages"
            class="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        <div class="relative">
          <select v-model="perPage"
            class="appearance-none pl-2 pr-5 py-0.5 border border-gray-200 rounded text-xs text-gray-600 bg-white focus:outline-none cursor-pointer">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
          <svg class="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface MemoItem {
  guid: string;
  titre: string;
  type: string;
  statut: string;
  dateCreation: Date;
  interlocuteurNom?: string;
  interlocuteurCode?: string;
  autoGenerated: boolean;
  messagesCount: number;
  [key: string]: any;
}

const props = defineProps<{
  memos: MemoItem[];
  isLoading: boolean;
  error: string;
  selectedGuid: string;
  filtres: { employeId: string; type: string; statut: string };
  recherche: string;
  tri: string;
  memoTypes: { value: string; label: string }[];
  memoStatuts: { value: string; label: string }[];
  employesOptions: { guid: string; nom: string }[];
}>();

defineEmits<{
  select: [memo: MemoItem];
  nouveau: [];
  'update:filtres': [v: { employeId: string; type: string; statut: string }];
  'update:recherche': [v: string];
  'update:tri': [v: string];
  reinitialiser: [];
}>();

// ── Pagination ─────────────────────────────────
const currentPage = ref(1);
// const perPage = ref(10);
const perPage = ref(5);

watch([perPage, () => props.memos.length], () => { currentPage.value = 1; });

const totalPages = computed(() => Math.max(1, Math.ceil(props.memos.length / perPage.value)));

const memosPagines = computed(() => {
  const start = (currentPage.value - 1) * perPage.value;
  return props.memos.slice(start, start + perPage.value);
});

const paginationPages = computed(() => {
  const total = totalPages.value;
  const cur = currentPage.value;
  const pages: (number | '...')[] = [];
  if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); return pages; }
  pages.push(1);
  if (cur > 3) pages.push('...');
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
  if (cur < total - 2) pages.push('...');
  pages.push(total);
  return pages;
});

// ── Helpers ────────────────────────────────────
const formatHeure = (date: Date | string) => {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const mois = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
  return `${d.getDate()} ${mois[d.getMonth()]}`;
};

const getTypeIcon = (type: string) => ({
  delay_justification: '⏱', absence_justification: '🏥',
  absence_notification: '📢', session_closure: '🔒',
  auto_generated: '🤖', correction_request: '✏️',
}[type] ?? '📝');

const typeIconBg = (type: string) => ({
  delay_justification: 'bg-blue-50 text-blue-600',
  absence_justification: 'bg-yellow-50 text-yellow-600',
  session_closure: 'bg-gray-100 text-gray-600',
  auto_generated: 'bg-purple-50 text-purple-600',
  correction_request: 'bg-red-50 text-red-600',
  absence_notification: 'bg-orange-50 text-orange-600',
}[type] ?? 'bg-gray-50 text-gray-600');

const getStatusLabel = (status: string) => ({
  pending: 'En attente', submitted: 'En attente',
  approved: 'Approuvé', rejected: 'Rejeté', revoked: 'Révoqué',
}[status] ?? status);

const statusBadgeClass = (status: string) => ({
  pending: 'bg-orange-50 text-orange-600',
  submitted: 'bg-orange-50 text-orange-600',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
  revoked: 'bg-gray-100 text-gray-500',
}[status] ?? 'bg-gray-100 text-gray-600');
</script>
