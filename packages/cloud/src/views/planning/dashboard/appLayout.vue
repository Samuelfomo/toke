<template>
  <div class="min-h-screen flex flex-col bg-gradient-to-tr from-[#E1EFF7] via-[#E1EFF7] to-[#E3B9F0]">

    <div class="sticky top-0 z-50">
      <Header />
    </div>

    <div class="flex flex-1 container">

      <AppSidebar>
        <template #help-text>
          <slot name="sidebar-help" />
        </template>
      </AppSidebar>

      <main class="flex-1 flex flex-col overflow-y-auto">
        <slot />
      </main>

    </div>
  </div>
</template>

<!--<template>-->

<!--  <div class="min-h-screen flex flex-col bg-gradient-to-tr from-[#E1EFF7] via-[#E1EFF7] to-[#E3B9F0]">-->
<!--    <div class="top-header">-->
<!--      <Header />-->
<!--    </div>-->
<!--  <div class="app-layout flex min-h-[60vh]">-->
<!--    &lt;!&ndash; ── Sidebar ── &ndash;&gt;-->
<!--    <AppSidebar>-->
<!--      <template #help-text>-->
<!--        <slot name="sidebar-help" />-->
<!--      </template>-->
<!--    </AppSidebar>-->

<!--    &lt;!&ndash; ── Main content area ── &ndash;&gt;-->
<!--    <main-->
<!--        class="flex-1 flex flex-col overflow-hidden"-->
<!--        :style="{ marginLeft: SIDEBAR_WIDTH }"-->
<!--    >-->
<!--      <slot />-->
<!--    </main>-->
<!--  </div>-->

<!--    <Footer />-->
<!--  </div>-->
<!--</template>-->

<script setup lang="ts">
import AppSidebar from './appSidebar.vue'
import {SIDEBAR_WIDTH} from '../composables/Navigation'
import Header from "@/views/components/header.vue";
import Footer from "@/views/components/footer.vue";
</script>