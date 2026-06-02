<template>
  <RouterLink
      :to="{ name: item.routeName }"
      class="nav-item group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer no-underline"
      :class="[
      isActive
        ? '!bg-gradient-to-br from-blue-500 to-blue-600 !text-white shadow-lg shadow-blue-600/20'
        : 'text-slate-400 hover:!bg-white/20 hover:text-white',
    ]"
  >
    <!-- Icon wrapper -->
    <span
        class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-200"
        :class="[
        isActive ? 'bg-white/20 text-white' : 'text-slate-400 group-hover:text-slate-200',
      ]"
    >
      <component :is="iconComponent" :size="18" stroke-width="1.75" />
    </span>

    <!-- Labels -->
    <span class="flex flex-col min-w-0 leading-none">
      <span
          class="text-[13px] font-semibold truncate transition-colors duration-200"
          :class="isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'"
      >
        {{ item.label }}
      </span>
      <span
          class="text-[10.5px] truncate mt-0.5 transition-colors duration-200"
          :class="isActive ? 'text-violet-200' : 'text-slate-500 group-hover:text-slate-400'"
      >
        {{ item.sublabel }}
      </span>
    </span>

    <!-- Active indicator pill -->
    <span
        v-if="isActive"
        class="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 flex-shrink-0"
    />
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  IconShieldCheck,
  IconCalendarEvent,
  IconRefresh,
  IconCalendarStats,
  IconArrowsLeftRight,
  IconCalendarSmile
} from '@tabler/icons-vue'
import type { NavItem } from '../composables/navigation.type'

const ICON_MAP: Record<string, unknown> = {
  IconShieldCheck,
  IconCalendarEvent,
  IconRefresh,
  IconCalendarStats,
  IconArrowsLeftRight,
  IconCalendarSmile
}

const props = defineProps<{
  item: NavItem
  isActive: boolean
}>()

const iconComponent = computed(() => ICON_MAP[props.item.icon] ?? IconCalendarEvent)
</script>