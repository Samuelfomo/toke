<template>
  <aside class="space-y-4">
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Résumé permanent
          </p>
          <h2 class="mt-1 text-base font-bold text-slate-900">
            {{ name || 'Configuration sans nom' }}
          </h2>
        </div>
        <span
          class="rounded-full px-2.5 py-1 text-xs font-bold uppercase"
          :class="active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'"
        >
          {{ active ? 'Active' : 'Inactive' }}
        </span>
      </div>

      <dl class="mt-5 space-y-3">
        <div v-for="item in items" :key="item.label" class="rounded-xl bg-slate-50 px-3.5 py-3">
          <dt class="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
            {{ item.label }}
          </dt>
          <dd class="mt-1 text-sm font-semibold leading-5 text-slate-800">
            {{ item.value }}
          </dd>
        </div>
      </dl>
    </section>

    <section
      class="rounded-2xl border p-4"
      :class="errorCount ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'"
    >
      <div class="flex items-start gap-3">
        <component
          :is="errorCount ? IconAlertTriangle : IconCircleCheck"
          :size="20"
          class="mt-0.5 shrink-0"
          :class="errorCount ? 'text-red-600' : 'text-emerald-600'"
        />
        <div>
          <p class="text-sm font-bold" :class="errorCount ? 'text-red-900' : 'text-emerald-900'">
            {{ errorCount ? `${errorCount} point(s) à corriger` : 'Configuration cohérente' }}
          </p>
          <p class="mt-1 text-xs leading-5" :class="errorCount ? 'text-red-700' : 'text-emerald-700'">
            {{ errorCount
              ? 'Ouvrez les étapes signalées avant d’enregistrer.'
              : 'La validation complète sera exécutée lors de l’enregistrement.' }}
          </p>
        </div>
      </div>
    </section>

    <p
      v-if="dirty"
      class="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-semibold leading-5 text-amber-800"
    >
      Des modifications ne sont pas encore enregistrées.
    </p>
  </aside>
</template>

<script setup lang="ts">
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-vue'

interface SummaryItem {
  label: string
  value: string
}

withDefaults(
  defineProps<{
    name: string
    active: boolean
    items: SummaryItem[]
    dirty?: boolean
    errorCount?: number
  }>(),
  {
    dirty: false,
    errorCount: 0,
  },
)
</script>
