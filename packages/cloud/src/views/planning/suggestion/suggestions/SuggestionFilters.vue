<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div class="relative w-full xl:max-w-sm">
        <IconSearch :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          :value="search"
          type="search"
          class="search-control"
          placeholder="Rechercher un collaborateur…"
          @input="onSearchInput"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="filter in filters"
          :key="filter.key"
          type="button"
          class="filter-chip"
          :class="filter.active ? 'active' : ''"
          @click="filter.toggle()"
        >
          <component :is="filter.icon" :size="14" />
          {{ filter.label }}
          <span class="rounded-full bg-black/5 px-1.5 py-0.5 text-xs">{{ filter.count }}</span>
        </button>
        <button
          v-if="hasActiveFilters"
          type="button"
          class="rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
          @click="$emit('reset')"
        >
          Réinitialiser
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  IconAlertCircle,
  IconEditCircle,
  IconMoonStars,
  IconSearch,
} from '@tabler/icons-vue'

const props = defineProps<{
  search: string
  manualOnly: boolean
  guardOnly: boolean
  unassignedOnly: boolean
  manualCount: number
  guardCount: number
  unassignedCount: number
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:manualOnly': [value: boolean]
  'update:guardOnly': [value: boolean]
  'update:unassignedOnly': [value: boolean]
  reset: []
}>()

function onSearchInput(event: Event): void {
  emit('update:search', (event.target as HTMLInputElement).value)
}

const filters = computed(() => [
  {
    key: 'manual',
    label: 'Modifications manuelles',
    active: props.manualOnly,
    count: props.manualCount,
    icon: IconEditCircle,
    toggle: () => emit('update:manualOnly', !props.manualOnly),
  },
  {
    key: 'guard',
    label: 'Gardes',
    active: props.guardOnly,
    count: props.guardCount,
    icon: IconMoonStars,
    toggle: () => emit('update:guardOnly', !props.guardOnly),
  },
  {
    key: 'unassigned',
    label: 'Non affectés',
    active: props.unassignedOnly,
    count: props.unassignedCount,
    icon: IconAlertCircle,
    toggle: () => emit('update:unassignedOnly', !props.unassignedOnly),
  },
])

const hasActiveFilters = computed(
  () => Boolean(props.search || props.manualOnly || props.guardOnly || props.unassignedOnly),
)
</script>

<style scoped>
.search-control {
  min-height: 42px;
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  padding: 0.65rem 0.75rem 0.65rem 2.25rem;
  font-size: 0.8rem;
  color: #334155;
  outline: none;
}
.search-control:focus { border-color: #60a5fa; box-shadow: 0 0 0 3px #dbeafe; }
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.58rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
}
.filter-chip:hover { background: #f8fafc; }
.filter-chip.active { border-color: #bfdbfe; background: #eff6ff; color: #1d4ed8; }
</style>
