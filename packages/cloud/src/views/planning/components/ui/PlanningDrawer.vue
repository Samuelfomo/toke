<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div
          v-if="open"
          class="fixed inset-0 z-[120] flex items-end justify-end bg-slate-950/45 backdrop-blur-[2px] sm:items-stretch"
      >
        <Transition name="drawer-slide" appear>
          <aside
              ref="container"
              role="dialog"
              aria-modal="true"
              :aria-labelledby="titleId"
              tabindex="-1"
              class="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-slate-950/20 outline-none sm:h-full sm:max-h-full sm:rounded-none sm:rounded-l-2xl"
              :class="widthClass"
          >
            <header
                class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7 sm:py-5">
              <div class="min-w-0">
                <div v-if="eyebrow" class="mb-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                  {{ eyebrow }}
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <h2 :id="titleId" class="text-xl font-bold tracking-tight text-slate-900">
                    {{ title }}
                  </h2>
                  <span
                      v-if="dirty"
                      class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800"
                  >
                    Non enregistré
                  </span>
                </div>
                <p v-if="description" class="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  {{ description }}
                </p>
              </div>
              <button
                  type="button"
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="loading"
                  aria-label="Fermer"
                  @click="requestClose"
              >
                <IconX :size="20"/>
              </button>
            </header>

            <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              <slot/>
            </div>

            <footer v-if="$slots.footer" class="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
              <slot name="footer" :request-close="requestClose"/>
            </footer>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>

  <UnsavedChangesDialog
      :open="showDiscardDialog"
      :title="discardTitle"
      :description="discardDescription"
      @cancel="cancelDiscard"
      @confirm="confirmDiscard"
  />
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {IconX} from '@tabler/icons-vue'
import {useBodyScrollLock} from '@/views/planning/composables/useBodyScrollLock'
import {useFocusTrap} from '@/views/planning/composables/useFocusTrap'
import {useUnsavedChanges} from '@/views/planning/composables/useUnsavedChanges'
import UnsavedChangesDialog from './UnsavedChangesDialog.vue'

const props = withDefaults(defineProps<{
  open: boolean
  eyebrow?: string
  title: string
  description?: string
  loading?: boolean
  dirty?: boolean
  width?: 'md' | 'lg' | 'xl' | '2xl' | 'full'
  discardTitle?: string
  discardDescription?: string
}>(), {
  loading: false,
  dirty: false,
  width: '2xl',
  discardTitle: 'Abandonner les modifications ?',
  discardDescription: 'Les informations saisies depuis le dernier enregistrement seront définitivement perdues.',
})

const emit = defineEmits<{ close: [] }>()
const titleId = `planning-drawer-title-${Math.random().toString(36).slice(2, 9)}`
const active = computed(() => props.open)
const widthClass = computed(() => ({
  md: 'sm:max-w-md',
  lg: 'sm:max-w-xl',
  xl: 'sm:max-w-3xl',
  '2xl': 'sm:max-w-4xl',
  full: 'sm:max-w-none',
})[props.width])

useBodyScrollLock(active)
const {container} = useFocusTrap(active)
const {
  showDiscardDialog,
  requestAction,
  confirmDiscard,
  cancelDiscard,
} = useUnsavedChanges({
  dirty: computed(() => props.dirty),
  active,
  saving: computed(() => props.loading),
})

function requestClose(): void {
  requestAction(() => emit('close'))
}
</script>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.18s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.24s ease;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .drawer-slide-enter-from,
  .drawer-slide-leave-to {
    transform: translateX(100%);
  }
}
</style>
