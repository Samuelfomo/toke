<template>
  <div id="app">
    <router-view v-slot="{ Component }">
      <Suspense>
        <template #default>
          <component :is="Component" />
        </template>
        <template #fallback>
          <div>Chargement...</div>
        </template>
      </Suspense>
    </router-view>
  </div>
</template>
