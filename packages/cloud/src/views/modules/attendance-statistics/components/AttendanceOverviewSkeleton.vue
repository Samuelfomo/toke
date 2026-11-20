<template>
  <div class="space-y-5" aria-busy="true" aria-label="Chargement des statistiques">
    <div class="h-32 animate-pulse rounded-2xl bg-slate-100" />
    <div class="h-44 animate-pulse rounded-2xl bg-slate-100" />
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <div v-for="index in 6" :key="index" class="h-48 animate-pulse rounded-2xl bg-slate-100" />
    </div>
    <div class="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
      <div class="h-80 animate-pulse rounded-2xl bg-slate-100" />
      <div class="h-80 animate-pulse rounded-2xl bg-slate-100" />
    </div>
    <div class="h-72 animate-pulse rounded-2xl bg-slate-100" />
  </div>
</template>
