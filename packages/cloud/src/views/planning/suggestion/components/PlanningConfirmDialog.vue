<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="open"
           class="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
           @mousedown.self="$emit('cancel')">
        <div class="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
          <div class="px-6 pt-6">
            <div class="flex justify-between items-center">
              <h3 class="text-2xl font-semibold text-slate-900">{{ title }}</h3>
              <div
                  class="flex h-11 w-11 items-center justify-center rounded-2xl"
                   :class="danger ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'"
              >
                <IconAlertTriangle v-if="danger" :size="22"/>
                <IconCircleCheck v-else :size="22"/>
              </div>
            </div>

            <p class="mt-2 text-sm leading-6 text-slate-500">{{ description }}</p>
            <div
                v-if="important" class="mt-4 rounded-xl border px-3 py-3 text-xs font-medium leading-5"
                 :class="danger ? 'border-red-100 bg-red-50 text-red-700' : 'border-indigo-100 bg-indigo-50 text-indigo-700'"
            >
              {{ important }}
            </div>
          </div>
          <div class="mt-6 flex items-center justify-end gap-2 bg-slate-50 px-6 py-4">
            <button type="button"
                    class="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    :disabled="loading" @click="$emit('cancel')">Annuler
            </button>
            <button type="button"
                    class="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                    :class="danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'"
                    :disabled="loading" @click="$emit('confirm')">
              <IconLoader2 v-if="loading" :size="15" class="animate-spin"/>
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {IconAlertTriangle, IconCircleCheck, IconLoader2} from '@tabler/icons-vue'

withDefaults(defineProps<{
  open: boolean;
  title: string;
  description: string;
  important?: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean
}>(), {danger: false, loading: false})
defineEmits<{ cancel: []; confirm: [] }>()
</script>

<style scoped>
.confirm-fade-enter-active, .confirm-fade-leave-active {
  transition: opacity .16s ease
}

.confirm-fade-enter-from, .confirm-fade-leave-to {
  opacity: 0
}
</style>
