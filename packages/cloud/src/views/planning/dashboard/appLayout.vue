<template>
  <div class="min-h-screen flex flex-col bg-gradient-to-br from-[#9cbdf6] via-[#f5f9ff] to-[#dbcdef]">
<!--  <div class="min-h-screen flex flex-col bg-gradient-to-tr from-[#E1EFF7] via-[#E1EFF7] to-[#E3B9F0]">-->

    <div class="sticky top-0 z-50 top-header">
      <Header />
    </div>

    <div class="flex flex-1 mx-auto">

      <AppSidebar>
        <template #help-text>
          <slot name="sidebar-help" />
        </template>
      </AppSidebar>

      <main class="flex-1 flex flex-col overflow-y-auto">
        <RouterView />
        <!--        <slot />-->
      </main>

    </div>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from './appSidebar.vue'
import {SIDEBAR_WIDTH} from '../composables/Navigation'
import Header from "@/views/components/header.vue";
import Footer from "@/views/components/footer.vue";
</script>