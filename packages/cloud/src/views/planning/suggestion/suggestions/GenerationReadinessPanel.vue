<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <header class="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3.5">
      <div>
        <p class="text-sm font-bold text-slate-900">Vérification avant calcul</p>
        <p class="mt-1 text-xs leading-5 text-slate-500">
          La génération reste bloquée tant qu’un prérequis obligatoire manque.
        </p>
      </div>
      <div
        class="rounded-xl px-3 py-2 text-right"
        :class="allReady ? 'bg-emerald-50' : 'bg-amber-50'"
      >
        <p class="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Prêt</p>
        <p
          class="mt-0.5 text-base font-bold"
          :class="allReady ? 'text-emerald-700' : 'text-amber-700'"
        >
          {{ percent }} %
        </p>
      </div>
    </header>

    <div v-if="loading" class="space-y-2 p-4">
      <div v-for="index in 4" :key="index" class="h-14 animate-pulse rounded-xl bg-slate-100" />
    </div>

    <div v-else class="divide-y divide-slate-100">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="group flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
        @click="$emit('open', item.routeName)"
      >
        <span
          class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          :class="item.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
        >
          <IconCheck v-if="item.ready" :size="15" stroke-width="2.4" />
          <IconAlertCircle v-else :size="15" stroke-width="2.2" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center justify-between gap-3">
            <span class="text-xs font-bold text-slate-800">{{ item.label }}</span>
            <span
              class="shrink-0 text-xs font-bold"
              :class="item.ready ? 'text-emerald-700' : 'text-amber-700'"
            >
              {{ item.ready ? 'Validé' : item.actionLabel }}
            </span>
          </span>
          <span class="mt-1 block text-xs leading-5 text-slate-500">
            {{ item.description }}
          </span>
        </span>
        <IconChevronRight :size="16" class="mt-1 shrink-0 text-slate-300 group-hover:text-slate-500" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconAlertCircle, IconCheck, IconChevronRight } from '@tabler/icons-vue'
import type { PlanningReadinessItem } from '../planningSuggestion.type'

const props = defineProps<{
  items: PlanningReadinessItem[]
  loading?: boolean
  percent?: number
}>()

defineEmits<{ open: [routeName: string] }>()

const allReady = computed(() => props.items.length > 0 && props.items.every((item) => item.ready))
</script>
