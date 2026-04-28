<template>
<!--  <aside-->
<!--      class="app-sidebar fixed inset-y-0 left-0 z-40 flex flex-col"-->
<!--      :style="{ width: SIDEBAR_WIDTH }"-->
<!--  >-->
    <aside
        class="app-sidebar sticky top-0 self-start h-screen left-0 z-40 flex flex-col flex-shrink-0"
        :style="{ width: SIDEBAR_WIDTH }"
    >
    <!-- Background with subtle gradient -->
    <div class="absolute inset-0 bg-black/90 pointer-events-none" />
    <div
        class="absolute inset-0 bg-gradient-to-b from-blue-950/70 via-transparent to-blue-950/50 pointer-events-none"
    />
    <!-- Right border -->
    <div class="absolute inset-y-0 right-0 w-px bg-white/5 pointer-events-none" />

    <!-- ── LOGO ── -->
    <div class="relative flex-shrink-0 px-5 py-5 flex items-center gap-3 bg-white/5">
      <div
          class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40"
      >
        <IconClockHour4 :size="20" class="text-white" />
      </div>
      <div class="flex flex-col leading-none">
        <span class="text-[15px] font-bold text-white tracking-tight">TimeFlow</span>
        <span class="text-[10px] text-slate-500 mt-0.5">Gestion des plannings</span>
      </div>
    </div>

    <!-- ── NAVIGATION ── -->
    <nav class="relative flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-5 scrollbar-thin">
      <div v-for="group in NAV_GROUPS" :key="group.id" class="space-y-0.5">
        <!-- Group label -->
        <p class="px-3 mb-2 text-[9.5px] font-bold tracking-widest uppercase text-slate-600 select-none">
          {{ group.label }}
        </p>

        <!-- Nav items -->
        <AppSidebarNavItem
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            :is-active="isActive(item.routeName)"
        />
      </div>
    </nav>

    <!-- ── HELP CARD ── -->
    <div class="relative flex-shrink-0 py-3">
      <AppSidebarHelpCard>
        <slot name="help-text">
          <!-- Modules inject their own help text via this slot -->
        </slot>
      </AppSidebarHelpCard>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { IconClockHour4 } from '@tabler/icons-vue'
import { useNavigation } from '@/views/planning/composables/useNavigation'
import AppSidebarNavItem from './appSidebarNavItem.vue'
import AppSidebarHelpCard from './appSidebarHelpCard.vue'
import {SIDEBAR_WIDTH} from '../composables/Navigation'

// ── Navigation ─────────────────────────────────────────────────────────────
const { NAV_GROUPS, isActive } = useNavigation()
</script>

<style scoped>
.app-sidebar {
  /* Scrollbar styling for the nav */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 3px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 99px;
}
</style>