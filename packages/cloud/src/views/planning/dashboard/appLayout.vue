<template>
  <div class="min-h-screen flex flex-col bg-gradient-to-br from-[#9cbdf6] via-[#f5f9ff] to-[#dbcdef]">

    <div class="sticky top-0 z-50 top-header">
      <Header />
    </div>

    <div class="flex flex-1 mx-auto">

      <AppSidebar>
        <template #help-text>
          <slot name="sidebar-help" />
        </template>
      </AppSidebar>

      <main class="flex-1 flex flex-col overflow-y-auto lg:min-w-[1222px]">
        <RouterView />
      </main>

    </div>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from './appSidebar.vue'
import Header from "@/views/components/header.vue";
</script>