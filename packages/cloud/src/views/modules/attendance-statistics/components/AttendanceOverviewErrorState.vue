<script setup lang="ts">
interface Props {
  message: string;
}

defineProps<Props>();

defineEmits<{
  retry: [];
}>();
</script>

<template>
  <section class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center sm:p-8" role="alert">
    <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-6 w-6" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
    </div>
    <h2 class="mt-4 text-lg font-bold text-rose-950">Impossible de charger les statistiques</h2>
    <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-rose-800">{{ message }}</p>
    <button
      type="button"
      class="mt-5 min-h-11 rounded-xl bg-rose-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-700 focus:ring-offset-2"
      @click="$emit('retry')"
    >
      Réessayer
    </button>
  </section>
</template>
