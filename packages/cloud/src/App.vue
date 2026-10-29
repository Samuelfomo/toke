<template>
  <div id="app">
    <ActiveContextBar/>
    <router-view v-slot="{ Component }">
      <Suspense>
        <template #default>
          <div>
            <component :is="Component"/>
          </div>
        </template>

        <template #fallback>
          <div>Chargement...</div>
        </template>
      </Suspense>
    </router-view>
  </div>
</template>
<script setup lang="ts">
import ActiveContextBar from '@/views/integrator/components/ActiveContextBar.vue'
</script>

<!--<template>-->
<!--  <div id="app">-->
<!--    <router-view v-slot="{ Component }">-->
<!--      <Suspense>-->
<!--        <template #default>-->
<!--          <div>-->
<!--            <component :is="Component" />-->
<!--          </div>-->
<!--        </template>-->

<!--        <template #fallback>-->
<!--          <div>Chargement...</div>-->
<!--        </template>-->
<!--      </Suspense>-->
<!--    </router-view>-->
<!--  </div>-->
<!--</template>-->