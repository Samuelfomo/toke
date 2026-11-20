<template>
  <div class="flex min-h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm">
    <RouterLink
        :to="{ name: 'planning-menu' }"
        class="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 no-underline transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        aria-label="Ouvrir le menu des outils de planification"
    >
      <IconLayoutGrid :size="18"/>
      <span>Menu</span>
    </RouterLink>

    <div class="min-w-0 flex-1">
      <p class="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
        Gestion des plannings
      </p>
      <p class="truncate text-sm font-bold text-slate-800">
        {{ pageTitle }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import {IconLayoutGrid} from '@tabler/icons-vue'

const route = useRoute()

const pageTitle = computed(() => {
  const title = route.meta.title
  return typeof title === 'string' && title.trim()
      ? title
      : 'Outils de planification'
})
</script>
