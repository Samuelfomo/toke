<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div v-if="open" class="fixed inset-0 z-[120] flex justify-end bg-slate-950/45 backdrop-blur-[2px]"
           @mousedown.self="$emit('close')">
        <Transition name="drawer-slide" appear>
          <aside class="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl shadow-slate-950/20">
            <header class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
              <div class="min-w-0">
                <div v-if="eyebrow" class="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                  {{ eyebrow }}
                </div>
                <h2 class="text-lg font-bold tracking-tight text-slate-900">{{ title }}</h2>
                <p v-if="description" class="mt-1 max-w-xl text-xs leading-5 text-slate-500">{{ description }}</p>
              </div>
              <button type="button"
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                      @click="$emit('close')">
                <IconX :size="18"/>
              </button>
            </header>

            <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              <slot/>
            </div>

            <footer v-if="$slots.footer" class="shrink-0 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-7">
              <slot name="footer"/>
            </footer>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {IconX} from '@tabler/icons-vue'

defineProps<{ open: boolean; eyebrow?: string; title: string; description?: string }>()
defineEmits<{ close: [] }>()
</script>

<style scoped>
.drawer-fade-enter-active, .drawer-fade-leave-active {
  transition: opacity .18s ease
}

.drawer-fade-enter-from, .drawer-fade-leave-to {
  opacity: 0
}

.drawer-slide-enter-active, .drawer-slide-leave-active {
  transition: transform .24s ease
}

.drawer-slide-enter-from, .drawer-slide-leave-to {
  transform: translateX(100%)
}
</style>
