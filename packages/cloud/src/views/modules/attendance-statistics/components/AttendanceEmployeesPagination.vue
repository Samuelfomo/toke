<script setup lang="ts">
interface Props {
  page: number;
  pageCount: number;
  pageSize: number;
  from: number;
  to: number;
  total: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:page': [page: number];
  'update:page-size': [pageSize: number];
}>();

function setPage(page: number): void {
  emit('update:page', Math.min(props.pageCount, Math.max(1, page)));
}

function updatePageSize(event: Event): void {
  emit('update:page-size', Number((event.target as HTMLSelectElement).value));
}
</script>

<template>
  <nav class="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" aria-label="Pagination des employés">
    <p class="text-sm text-slate-600" aria-live="polite">
      <template v-if="total > 0">Éléments {{ from }}–{{ to }} sur {{ total }}</template>
      <template v-else>Aucun employé</template>
    </p>

    <div class="flex flex-wrap items-center gap-2">
      <label class="flex items-center gap-2 text-sm text-slate-600">
        Par page
        <select
          :value="pageSize"
          class="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800"
          @change="updatePageSize"
        >
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
      </label>

      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="page <= 1"
        aria-label="Page précédente"
        @click="setPage(page - 1)"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <span class="min-w-[90px] text-center text-sm font-semibold text-slate-700">Page {{ page }} / {{ pageCount }}</span>
      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="page >= pageCount"
        aria-label="Page suivante"
        @click="setPage(page + 1)"
      >
        <span aria-hidden="true">›</span>
      </button>
    </div>
  </nav>
</template>
