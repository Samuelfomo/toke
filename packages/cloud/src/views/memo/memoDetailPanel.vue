<template>
  <div class="flex flex-col gap-3">

    <!-- Infos -->
    <div class="bg-white shadow-sm p-4 flex-shrink-0">
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Détails du mémo</h3>

      <div class="flex flex-col gap-3">
        <!-- Type -->
        <div>
          <span class="text-xs text-gray-400 block mb-1">TYPE DE MÉMO</span>
          <span :class="['px-2.5 py-1 rounded-full text-xs font-medium', typeBadgeClass(memo.type)]">
            {{ getTypeLabel(memo.type) }}
          </span>
        </div>

        <!-- Statut -->
        <div>
          <span class="text-xs text-gray-400 block mb-1">STATUT</span>
          <span :class="['px-2.5 py-1 rounded-full text-xs font-semibold', statusBadgeClass(memo.statut)]">
            {{ getStatusLabel(memo.statut) }}
          </span>
        </div>

        <!-- Créé le -->
        <div>
          <span class="text-xs text-gray-400 block mb-0.5">CRÉÉ LE</span>
          <span class="text-xs text-gray-700">{{ formatDate(memo.dateCreation) }}</span>
        </div>

        <!-- Dernier message -->
        <div v-if="memo.dateModification && !Number.isNaN(memo.dateModification.getTime())">
          <span class="text-xs text-gray-400 block mb-0.5">DERNIER MESSAGE</span>
          <span class="text-xs text-gray-700">{{ formatDate(memo.dateModification) }}</span>
        </div>

        <!-- Messages -->
        <div>
          <span class="text-xs text-gray-400 block mb-0.5">MESSAGES</span>
          <span class="text-xs text-gray-700">{{ memo.messagesCount }} message{{ memo.messagesCount > 1 ? 's' : '' }}</span>
        </div>
      </div>
    </div>

    <!-- Pointages directement concernés par ce mémo -->
    <section v-if="linkedEntryGuids.length" class="bg-white shadow-sm p-4 flex-shrink-0" aria-label="Pointages concernés">
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pointages concernés</h3>
      <p class="text-xs text-gray-600 mb-3">{{ linkedEntryGuids.length }} pointage{{ linkedEntryGuids.length > 1 ? 's' : '' }} associé{{ linkedEntryGuids.length > 1 ? 's' : '' }} à ce mémo.</p>
      <div class="flex flex-col gap-2">
        <button v-for="(guid, index) in linkedEntryGuids" :key="guid" type="button" @click="openLinkedEntry(guid)"
          class="w-full text-left rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-[#004AAD] hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#004AAD]">
          Voir le pointage {{ linkedEntryGuids.length > 1 ? index + 1 : '' }}
        </button>
      </div>
    </section>

    <!-- Actions -->
    <div v-if="!readOnly && showActionsPanel" class="bg-white shadow-sm p-4 flex-shrink-0">
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</h3>

      <p v-if="writeError" role="alert" class="mb-2 text-sm text-red-700">{{ writeError }}</p>
      <div v-if="memo.capabilities?.edit || memo.capabilities?.submit" class="mb-2 flex flex-wrap gap-2">
        <button v-if="memo.capabilities?.edit" type="button" :disabled="isProcessing"
                class="rounded-lg border px-3 py-2 text-sm" @click="$emit('modifier')">Modifier</button>
        <button v-if="memo.capabilities?.submit" type="button" :disabled="isProcessing"
                class="rounded-lg bg-[#004aad] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                @click="$emit('soumettre')">Soumettre</button>
      </div>

      <div class="flex flex-col gap-2">
        <!-- Approuver -->
        <button
          v-if="memo.capabilities?.validate"
          @click="$emit('approuver')"
          :disabled="isProcessing"
          class="flex items-center gap-3 w-full px-3 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white rounded-xl transition-colors"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <div class="text-left flex-1">
            <div class="text-sm font-semibold">Approuver</div>
            <div class="text-xs opacity-80">Le mémo sera marqué comme validé</div>
          </div>
          <div v-if="isProcessing && actionType === 'approve'" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0"></div>
        </button>

        <!-- Rejeter -->
        <button
          v-if="memo.capabilities?.reject"
          @click="$emit('rejeter')"
          :disabled="isProcessing"
          class="flex items-center gap-3 w-full px-3 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-xl transition-colors"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          <div class="text-left flex-1">
            <div class="text-sm font-semibold">Rejeter</div>
            <div class="text-xs opacity-80">Ajoutez une réponse pour expliquer</div>
          </div>
          <div v-if="isProcessing && actionType === 'reject'" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0"></div>
        </button>

        <!-- Révoquer -->
        <button
          v-if="memo.capabilities?.revoke"
          @click="$emit('revoquer')"
          :disabled="isProcessing"
          class="flex items-center gap-3 w-full px-3 py-3 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-white rounded-xl transition-colors"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
          </svg>
          <div class="text-left flex-1">
            <div class="text-sm font-semibold">Révoquer</div>
            <div class="text-xs opacity-80">Annuler ce mémo en attente</div>
          </div>
          <div v-if="isProcessing && actionType === 'revoke'" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0"></div>
        </button>
      </div>
    </div>

    <!-- Participants -->
    <div class="bg-white shadow-sm p-4 flex-shrink-0">
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Informations</h3>

      <!-- Employé (target) -->
      <div class="mb-3">
        <span class="text-xs text-gray-400 block mb-1.5">EMPLOYÉ</span>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span class="text-xs font-semibold text-blue-700">{{ initials(memo.destinataireNom) }}</span>
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-gray-800 truncate">{{ memo.destinataireNom || '—' }}</div>
            <div class="text-xs text-gray-400 truncate">{{ [memo.destinataireCode, memo.destinataireDepartement].filter(value => value && value !== 'N/A').join(' · ') }}</div>
          </div>
        </div>
      </div>

      <!-- Créé par (author) -->
      <div>
        <span class="text-xs text-gray-400 block mb-1.5">CRÉÉ PAR</span>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <span v-if="memo.autoGenerated" class="text-sm">🤖</span>
            <span v-else class="text-xs font-semibold text-gray-600">{{ initials(memo.createurNom) }}</span>
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-gray-800 truncate">
              {{ memo.autoGenerated ? 'Système' : memo.createurNom }}
            </div>
            <div v-if="memo.autoGenerated && memo.createurId" class="text-xs text-gray-500">Auteur enregistré · {{ memo.createurNom }}</div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Memo } from '@/stores/memoStore';

const router = useRouter();

const props = defineProps<{
  readOnly?: boolean;
  memo: Memo;
  writeError?: string;
  isProcessing: boolean;
  actionType: 'approve' | 'reject' | 'revoke' | null;
}>();

defineEmits<{
  approuver: [];
  rejeter: [];
  revoquer: [];
  modifier: [];
  soumettre: [];
}>();

// Les GUID servent uniquement à la navigation ; ils ne sont jamais affichés.
const linkedEntryGuids = computed(() => Array.from(new Set(
  (props.memo.entriesAffectees ?? []).map((value: unknown) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'guid' in value) return String((value as {guid: unknown}).guid ?? '');
    return '';
  }).filter((guid: string) => guid.length > 0)
)));

function openLinkedEntry(guid: string) {
  const date = props.memo.dateIncident;
  const isValidDate = date instanceof Date && !Number.isNaN(date.getTime());
  const localDate = isValidDate
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : null;
  void router.push({ name: 'Pointages', query: {
    entry: guid,
    ...(localDate ? { start_date: localDate, end_date: localDate } : {}),
  }});
}

const showActionsPanel = computed(() => Boolean(props.writeError || props.memo.capabilities?.edit ||
  props.memo.capabilities?.submit || props.memo.capabilities?.validate || props.memo.capabilities?.reject ||
  props.memo.capabilities?.revoke));

// ── Helpers ────────────────────────────────────
const initials = (name?: string) => {
  if (!name || name === 'N/A') return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const formatDate = (date: Date | string) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const getTypeLabel = (type: string) => ({
  delay_justification: 'Retard',
  absence_justification: 'Absence',
  correction_request: 'Correction',
  session_closure: 'Clôture',
  auto_generated: 'Auto',
  absence_notification: 'Notification',
}[type] ?? type);

const getStatusLabel = (status: string) => ({
  pending: 'En attente', submitted: 'En attente',
  approved: 'Approuvé', rejected: 'Rejeté', revoked: 'Révoqué',
}[status] ?? status);

const typeBadgeClass = (type: string) => ({
  delay_justification: 'bg-blue-50 text-blue-700',
  absence_justification: 'bg-yellow-50 text-yellow-700',
  correction_request: 'bg-red-50 text-red-700',
  session_closure: 'bg-gray-100 text-gray-600',
  auto_generated: 'bg-purple-50 text-purple-700',
  absence_notification: 'bg-orange-50 text-orange-700',
}[type] ?? 'bg-gray-100 text-gray-600');

const statusBadgeClass = (status: string) => ({
  pending: 'bg-orange-50 text-orange-600',
  submitted: 'bg-orange-50 text-orange-600',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
  revoked: 'bg-gray-100 text-gray-500',
}[status] ?? 'bg-gray-100 text-gray-600');
</script>
