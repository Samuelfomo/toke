<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 class="text-sm font-bold text-slate-900">Vérifications avant génération</h2>
        <p class="mt-1 text-xs leading-5 text-slate-500">Chaque point doit être validé pour produire un planning
          exploitable.</p>
      </div>
      <div class="flex h-9 w-9 items-center justify-center rounded-xl"
           :class="allReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
        <IconCircleCheck v-if="allReady" :size="20"/>
        <IconAlertTriangle v-else :size="20"/>
      </div>
    </div>
    <div class="divide-y divide-slate-100">
      <button v-for="item in items" :key="item.id" type="button"
              class="group flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
              @click="$emit('open', item.routeName)">
        <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
             :class="item.ready ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">
          <IconCheck v-if="item.ready" :size="15" stroke-width="2.2"/>
          <IconAlertCircle v-else :size="15" stroke-width="2.2"/>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-slate-800">{{ item.label }}</p>
            <span class="shrink-0 text-[11px] font-semibold"
                  :class="item.ready ? 'text-emerald-600' : 'text-amber-700'">{{
                item.ready ? 'Validé' : item.actionLabel
              }}</span>
          </div>
          <p class="mt-1 text-xs leading-5 text-slate-500">{{ item.description }}</p>
        </div>
        <IconChevronRight :size="17"
                          class="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"/>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {IconAlertCircle, IconAlertTriangle, IconCheck, IconChevronRight, IconCircleCheck} from '@tabler/icons-vue'
import type {PlanningReadinessItem} from '../planningSuggestion.type'

const props = defineProps<{ items: PlanningReadinessItem[] }>()
defineEmits<{ open: [routeName: string] }>()
const allReady = computed(() => props.items.every((item) => item.ready))
</script>
