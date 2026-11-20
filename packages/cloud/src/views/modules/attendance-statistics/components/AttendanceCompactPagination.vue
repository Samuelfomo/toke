<script setup lang="ts">
interface Props {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Pagination',
});
const emit = defineEmits<{ 'update:page': [page: number] }>();

function setPage(page: number): void {
  emit('update:page', Math.min(props.pageCount, Math.max(1, Math.trunc(page))));
}
</script>

<template>
  <nav
    v-if="pageCount > 1"
    class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-3"
    :aria-label="label"
  >
    <p class="text-xs text-slate-500" aria-live="polite">
      Éléments {{ from }}–{{ to }} sur {{ total }}
    </p>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="page <= 1"
        @click="setPage(page - 1)"
      >
        Précédent
      </button>
      <span class="min-w-[88px] text-center text-sm font-semibold text-slate-700" aria-current="page">
        {{ page }} / {{ pageCount }}
      </span>
      <button
        type="button"
        class="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="page >= pageCount"
        @click="setPage(page + 1)"
      >
        Suivant
      </button>
    </div>
  </nav>
</template>
