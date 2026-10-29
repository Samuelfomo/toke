<template>
  <div class="min-h-screen bg-[#f4f7fb] text-slate-800 lg:flex">
    <IntegratorSidebar/>
    <div class="min-w-0 flex-1">
      <IntegratorHeader :title="String(route.meta.pageTitle || 'Console intégrateur')"/>
      <main class="mx-auto w-full max-w-[1450px] px-5 py-7 lg:px-9 lg:py-9">
        <RouterView/>
      </main>
    </div>
  </div>
</template>
<script setup lang="ts">
import {useRoute} from 'vue-router';
import IntegratorSidebar from '../components/IntegratorSidebar.vue';
import IntegratorHeader from '../components/IntegratorHeader.vue';

const route = useRoute()
</script>
