<template>
  <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
    <button
        type="button"
        class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        :disabled="loading || cancelDisabled"
        @click="$emit('cancel')"
    >
      {{ cancelLabel }}
    </button>

    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
      <slot name="secondary"/>
      <button
          type="button"
          class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          :disabled="loading || disabled"
          @click="$emit('submit')"
      >
        <IconLoader2 v-if="loading" :size="17" class="animate-spin"/>
        <IconCheck v-else :size="17"/>
        {{ loading ? loadingLabel : submitLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {IconCheck, IconLoader2} from '@tabler/icons-vue'

withDefaults(defineProps<{
  submitLabel?: string
  loadingLabel?: string
  cancelLabel?: string
  loading?: boolean
  disabled?: boolean
  cancelDisabled?: boolean
}>(), {
  submitLabel: 'Enregistrer',
  loadingLabel: 'Enregistrement…',
  cancelLabel: 'Annuler',
  loading: false,
  disabled: false,
  cancelDisabled: false,
})

defineEmits<{
  cancel: []
  submit: []
}>()
</script>
