<template>
  <Teleport to="body">
    <Transition name="planning-modal-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:p-4"
      >
        <section
          ref="container"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          class="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl outline-none sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl"
          :class="sizeClass"
        >
          <header class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
            <div class="min-w-0">
              <p v-if="eyebrow" class="text-xs font-bold uppercase tracking-wide text-blue-700">
                {{ eyebrow }}
              </p>
              <h2 :id="titleId" class="mt-1 text-xl font-bold tracking-tight text-slate-900">
                {{ title }}
              </h2>
              <p v-if="description" class="mt-1 text-sm leading-6 text-slate-600">
                {{ description }}
              </p>
            </div>
            <button
              type="button"
              aria-label="Fermer"
              :disabled="loading"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              @click="requestClose"
            >
              <IconX :size="20" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
            <slot name="footer" :request-close="requestClose" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>

  <UnsavedChangesDialog
    :open="showDiscardDialog"
    @cancel="cancelDiscard"
    @confirm="confirmDiscard"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconX } from '@tabler/icons-vue'
import { useBodyScrollLock } from '@/views/planning/composables/useBodyScrollLock'
import { useFocusTrap } from '@/views/planning/composables/useFocusTrap'
import { useUnsavedChanges } from '@/views/planning/composables/useUnsavedChanges'
import UnsavedChangesDialog from './UnsavedChangesDialog.vue'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  eyebrow?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  loading?: boolean
  dirty?: boolean
}>(), {
  size: 'lg',
  loading: false,
  dirty: false,
})

const emit = defineEmits<{ close: [] }>()
const active = computed(() => props.open)
const titleId = `planning-modal-title-${Math.random().toString(36).slice(2, 9)}`
const sizeClass = computed(() => ({
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  full: 'sm:h-[calc(100dvh-2rem)] sm:max-w-[calc(100vw-2rem)]',
})[props.size])

useBodyScrollLock(active)
const { container } = useFocusTrap(active)
const { showDiscardDialog, requestAction, confirmDiscard, cancelDiscard } = useUnsavedChanges({
  dirty: computed(() => props.dirty),
  active,
  saving: computed(() => props.loading),
})

function requestClose(): void {
  requestAction(() => emit('close'))
}
</script>

<style scoped>
.planning-modal-fade-enter-active,
.planning-modal-fade-leave-active {
  transition: opacity 0.16s ease;
}

.planning-modal-fade-enter-from,
.planning-modal-fade-leave-to {
  opacity: 0;
}
</style>
