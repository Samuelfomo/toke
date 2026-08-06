<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div
          v-if="open"
          class="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      >
        <section
            ref="container"
            role="alertdialog"
            aria-modal="true"
            :aria-labelledby="titleId"
            :aria-describedby="descriptionId"
            tabindex="-1"
            class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl outline-none"
        >
          <div class="px-5 pt-5 sm:px-6 sm:pt-6">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h2 :id="titleId" class="text-xl font-bold tracking-tight text-slate-900">
                  {{ title }}
                </h2>
                <p :id="descriptionId" class="mt-2 text-sm leading-6 text-slate-600">
                  {{ description }}
                </p>
              </div>
              <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  :class="danger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'"
              >
                <IconAlertTriangle v-if="danger" :size="22"/>
                <IconCircleCheck v-else :size="22"/>
              </div>
            </div>

            <div
                v-if="important"
                class="mt-4 rounded-xl border px-3 py-3 text-xs font-medium leading-5"
                :class="danger ? 'border-red-100 bg-red-50 text-red-700' : 'border-blue-100 bg-blue-50 text-blue-700'"
            >
              {{ important }}
            </div>
          </div>

          <footer class="mt-6 flex flex-col-reverse gap-2 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
                type="button"
                class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 sm:w-auto"
                :disabled="loading"
                @click="$emit('cancel')"
            >
              {{ cancelLabel }}
            </button>
            <button
                type="button"
                class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto"
                :class="danger
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
                : 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500'"
                :disabled="loading"
                @click="$emit('confirm')"
            >
              <IconLoader2 v-if="loading" :size="17" class="animate-spin"/>
              {{ confirmLabel }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {IconAlertTriangle, IconCircleCheck, IconLoader2} from '@tabler/icons-vue'
import {useBodyScrollLock} from '@/views/planning/composables/useBodyScrollLock'
import {useFocusTrap} from '@/views/planning/composables/useFocusTrap'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description: string
  important?: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
}>(), {
  important: '',
  cancelLabel: 'Annuler',
  danger: false,
  loading: false,
})

defineEmits<{
  cancel: []
  confirm: []
}>()

const uid = Math.random().toString(36).slice(2, 9)
const titleId = `planning-confirm-title-${uid}`
const descriptionId = `planning-confirm-description-${uid}`
const active = computed(() => props.open)

useBodyScrollLock(active)
const {container} = useFocusTrap(active)
</script>

<style scoped>
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.16s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}
</style>
