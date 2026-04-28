<template>
  <div class="flex flex-col gap-3 h-full overflow-y-auto">

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
        <div v-if="memo.dateModification">
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

    <!-- Actions -->
    <div v-if="showActionsPanel" class="bg-white shadow-sm p-4 flex-shrink-0">
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</h3>

      <!-- Info -->
      <div class="flex items-start gap-2 bg-blue-50 rounded-lg p-2.5 mb-3">
        <svg class="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-xs text-blue-700">Vous pouvez répondre à ce mémo avant ou sans prendre une décision.</p>
      </div>

      <div class="flex flex-col gap-2">
        <!-- Approuver -->
        <button
          v-if="peutApprouverRejeter"
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
          v-if="peutApprouverRejeter"
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
          v-if="peutRevoquer"
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
            <div class="text-xs text-gray-400 truncate">{{ memo.destinataireCode }} · {{ memo.destinataireDepartement }}</div>
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
              {{ memo.autoGenerated ? 'System' : (memo.createurNom || '—') }}
              <span class="text-xs text-gray-400 font-normal ml-1">
                {{ memo.autoGenerated ? '' : '(Employé)' }}
              </span>
            </div>
            <div v-if="!memo.autoGenerated" class="text-xs text-gray-400 truncate">{{ memo.createurCode }}</div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Memo } from '@/stores/memoStore';

const props = defineProps<{
  memo: Memo;
  managerGuid: string;
  isProcessing: boolean;
  actionType: 'approve' | 'reject' | 'revoke' | null;
}>();

defineEmits<{
  approuver: [];
  rejeter: [];
  revoquer: [];
}>();

// ── Règles d'affichage des boutons ──────────────
// pending + au moins un message de l'employé (target_user) → Approuver + Rejeter + Révoquer
// pending seulement → Révoquer uniquement
// submitted → Approuver + Rejeter

const isPending = computed(() =>
  props.memo.statut === 'pending' || props.memo.statut === 'submitted'
);

/**
 * Au moins un message du target_user dans memoContent.
 * memoContent[0] est le message initial — si l'auteur du content
 * correspond au destinataire du mémo, l'employé a répondu.
 */
const employeARepondu = computed(() => {
  if (!props.memo.memoContent || props.memo.memoContent.length === 0) return false;
  // On cherche un content dont l'user n'est pas le manager (= c'est l'employé)
  // Le champ content.user contient l'email ; on vérifie juste qu'il y a plus d'un message
  // ou que le premier message vient du destinataire
  return props.memo.memoContent.length > 1 || props.memo.statut === 'submitted';
});

const peutApprouverRejeter = computed(() =>
  isPending.value && employeARepondu.value
);

const peutRevoquer = computed(() => isPending.value);

const showActionsPanel = computed(() => peutApprouverRejeter.value || peutRevoquer.value);

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
