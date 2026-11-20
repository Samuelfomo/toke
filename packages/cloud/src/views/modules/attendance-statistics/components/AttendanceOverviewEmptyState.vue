<script setup lang="ts">
interface Props {
  managerName?: string;
}

withDefaults(defineProps<Props>(), {
  managerName: '',
});
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
    <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-7 w-7" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6M22 11h-6" />
      </svg>
    </div>
    <h2 class="mt-4 text-xl font-bold text-slate-950">Aucun collaborateur dans ce périmètre</h2>
    <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
      Aucun collaborateur n'appartient actuellement à l'équipe{{ managerName ? ` de ${managerName}` : '' }} pour les filtres sélectionnés.
    </p>
  </section>
</template>
