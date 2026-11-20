<template>
  <Teleport to="body">
    <Transition name="planning-dialog-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[190] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      >
        <section
          ref="container"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="descriptionId"
          tabindex="-1"
          class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/25 outline-none"
        >
          <div class="p-5 sm:p-6">
            <div class="flex items-start gap-4">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <IconAlertTriangle :size="22" />
              </div>
              <div class="min-w-0">
                <h2 :id="titleId" class="text-lg font-bold tracking-tight text-slate-900">
                  {{ title }}
                </h2>
                <p :id="descriptionId" class="mt-2 text-sm leading-6 text-slate-600">
                  {{ description }}
                </p>
              </div>
            </div>
          </div>

          <footer class="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:w-auto"
              @click="$emit('cancel')"
            >
              Continuer la modification
            </button>
            <button
              type="button"
              class="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:w-auto"
              @click="$emit('confirm')"
            >
              Abandonner les modifications
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconAlertTriangle } from '@tabler/icons-vue'
import { useBodyScrollLock } from '@/views/planning/composables/useBodyScrollLock'
import { useFocusTrap } from '@/views/planning/composables/useFocusTrap'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  description?: string
}>(), {
  title: 'Abandonner les modifications ?',
  description: 'Les informations saisies depuis le dernier enregistrement seront définitivement perdues.',
})

defineEmits<{
  cancel: []
  confirm: []
}>()

const uid = Math.random().toString(36).slice(2, 9)
const titleId = `unsaved-title-${uid}`
const descriptionId = `unsaved-description-${uid}`
const active = computed(() => props.open)

useBodyScrollLock(active)
const { container } = useFocusTrap(active)
</script>

<style scoped>
.planning-dialog-fade-enter-active,
.planning-dialog-fade-leave-active {
  transition: opacity 0.16s ease;
}

.planning-dialog-fade-enter-from,
.planning-dialog-fade-leave-to {
  opacity: 0;
}
</style>
