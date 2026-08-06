<template>
  <div
      class="planning-shell flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7 text-slate-900"
  >

    <header class="relative z-50 shrink-0">
      <Header />
    </header>

    <!-- Navigation compacte conservée sur mobile -->
    <PlanningMobileBar class="md:hidden" />

    <main
        id="planning-main-content"
        tabindex="-1"
        class="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain focus:outline-none mx-auto lg:min-w-[1200px]"
    >
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import Header from '@/views/components/header.vue'
import PlanningMobileBar from './PlanningMobileBar.vue'
</script>