<template>
  <div
    class="sticky bottom-3 z-40 rounded-2xl border bg-white/95 p-3 shadow-[0_18px_55px_rgba(15,23,42,.20)] backdrop-blur sm:p-4"
    :class="canApprove ? 'border-emerald-200' : 'border-amber-200'"
  >
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-start gap-3">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          :class="canApprove ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
        >
          <IconCircleCheck v-if="canApprove" :size="19" />
          <IconAlertTriangle v-else :size="19" />
        </div>
        <div>
          <p class="text-sm font-bold text-slate-900">
            {{ canApprove ? 'La proposition peut être publiée' : 'Publication actuellement bloquée' }}
          </p>
          <p class="mt-1 text-xs leading-5 text-slate-500">
            {{ canApprove
              ? 'Publier créera les affectations officielles après votre confirmation.'
              : blocker }}
          </p>
        </div>
      </div>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="danger-button"
          :disabled="loading"
          @click="$emit('reject')"
        >
          <IconX :size="16" />
          Rejeter
        </button>
        <button
          type="button"
          class="primary-button"
          :disabled="loading || !canApprove"
          :title="blocker || 'Valider et publier'"
          @click="$emit('approve')"
        >
          <IconLoader2 v-if="loading" :size="16" class="animate-spin" />
          <IconCircleCheck v-else :size="16" />
          Valider et publier
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconLoader2,
  IconX,
} from '@tabler/icons-vue'

withDefaults(
  defineProps<{
    canApprove: boolean
    blocker?: string
    loading?: boolean
  }>(),
  { blocker: '', loading: false },
)

defineEmits<{ approve: []; reject: [] }>()
</script>

<style scoped>
.primary-button,
.danger-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 0.75rem;
  padding: 0.65rem 1rem;
  font-size: 0.75rem;
  font-weight: 800;
}
.primary-button { background: #1d4ed8; color: white; }
.primary-button:hover:not(:disabled) { background: #1e40af; }
.danger-button { border: 1px solid #fecaca; background: white; color: #dc2626; }
.danger-button:hover:not(:disabled) { background: #fef2f2; }
.primary-button:disabled,
.danger-button:disabled { cursor: not-allowed; opacity: 0.55; }
</style>
