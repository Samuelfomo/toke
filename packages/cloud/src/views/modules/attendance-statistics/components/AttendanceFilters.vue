<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type {
  AttendanceStatisticsFilters,
  BusinessDate,
} from '../types/attendance-statistics.types.js';
import type {
  AttendanceFiltersSubmission,
  AttendancePeriodPreset,
  AttendanceSiteOption,
} from '../types/attendance-statistics.ui.types.js';
import { validateAttendanceStatisticsFilters } from '../utils/business-date.js';
import { getAttendancePeriodForPreset } from '../utils/attendance-period.js';

interface Props {
  modelValue: AttendanceStatisticsFilters;
  businessToday: BusinessDate;
  siteOptions?: readonly AttendanceSiteOption[];
  activePreset?: AttendancePeriodPreset;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  siteOptions: () => [],
  activePreset: 'current_month',
  disabled: false,
});

const emit = defineEmits<{
  apply: [submission: AttendanceFiltersSubmission];
  reset: [];
}>();

const draft = ref<AttendanceStatisticsFilters>({ ...props.modelValue });
const selectedPreset = ref<AttendancePeriodPreset>(props.activePreset);
const validationMessage = ref<string | null>(null);

const activeSites = computed(() => props.siteOptions.filter((site) => site.active !== false));

const presets: ReadonlyArray<{ value: AttendancePeriodPreset; label: string }> = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'current_week', label: 'Cette semaine' },
  { value: 'current_month', label: 'Ce mois' },
  { value: 'previous_month', label: 'Mois précédent' },
  { value: 'custom', label: 'Personnalisée' },
];

watch(
  () => props.modelValue,
  (value) => {
    draft.value = { ...value };
  },
  { deep: true },
);

watch(
  () => props.activePreset,
  (value) => {
    selectedPreset.value = value;
  },
);

function choosePreset(preset: AttendancePeriodPreset): void {
  selectedPreset.value = preset;
  validationMessage.value = null;
  if (preset === 'custom') return;

  const period = getAttendancePeriodForPreset(preset, props.businessToday, {
    startDate: draft.value.startDate,
    endDate: draft.value.endDate,
  });
  draft.value = {
    ...draft.value,
    startDate: period.startDate,
    endDate: period.endDate,
  };
}

function markCustomPeriod(): void {
  selectedPreset.value = 'custom';
  validationMessage.value = null;
}

function submit(): void {
  const validation = validateAttendanceStatisticsFilters(draft.value, props.businessToday);
  if (!validation.ok) {
    validationMessage.value = validation.error.message;
    return;
  }
  validationMessage.value = null;
  emit('apply', { filters: { ...draft.value }, preset: selectedPreset.value });
}
</script>

<template>
  <section
    aria-labelledby="attendance-filters-title"
    class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
  >
    <div class="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 id="attendance-filters-title" class="text-base font-bold text-slate-950">
          Période et périmètre
        </h2>
        <p id="attendance-filter-help" class="mt-1 text-sm text-slate-500">
          Les dates sont envoyées à l'API au format métier YYYY-MM-DD.
        </p>
      </div>
    </div>

    <div class="mb-5 flex flex-wrap gap-2" role="group" aria-label="Périodes rapides">
      <button
        v-for="preset in presets"
        :key="preset.value"
        type="button"
        class="rounded-full border px-3.5 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        :class="
          selectedPreset === preset.value
            ? 'border-indigo-600 bg-indigo-600 text-white'
            : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
        "
        :disabled="disabled"
        :aria-pressed="selectedPreset === preset.value"
        @click="choosePreset(preset.value)"
      >
        {{ preset.label }}
      </button>
    </div>

    <form class="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-end" @submit.prevent="submit">
      <label class="block">
        <span class="mb-1.5 block text-sm font-semibold text-slate-700">Date de début</span>
        <input
          id="attendance-start-date"
          v-model="draft.startDate"
          type="date"
          :max="businessToday"
          :disabled="disabled"
          :aria-invalid="validationMessage ? true : undefined"
          aria-describedby="attendance-filter-help attendance-filter-error"
          class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
          @change="markCustomPeriod"
        />
      </label>

      <label class="block">
        <span class="mb-1.5 block text-sm font-semibold text-slate-700">Date de fin</span>
        <input
          id="attendance-end-date"
          v-model="draft.endDate"
          type="date"
          :min="draft.startDate"
          :max="businessToday"
          :disabled="disabled"
          :aria-invalid="validationMessage ? true : undefined"
          aria-describedby="attendance-filter-help attendance-filter-error"
          class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
          @change="markCustomPeriod"
        />
      </label>

      <label v-if="activeSites.length > 0" class="block">
        <span class="mb-1.5 block text-sm font-semibold text-slate-700">Site</span>
        <select
          v-model="draft.siteGuid"
          :disabled="disabled"
          class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option :value="null">Tous les sites</option>
          <option v-for="site in activeSites" :key="site.guid" :value="site.guid">
            {{ site.name }}
          </option>
        </select>
      </label>

      <div class="flex gap-2 lg:justify-end">
        <button
          type="button"
          class="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="disabled"
          @click="emit('reset')"
        >
          Réinitialiser
        </button>
        <button
          type="submit"
          class="min-h-11 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="disabled"
        >
          Appliquer
        </button>
      </div>
    </form>

    <p v-if="validationMessage" id="attendance-filter-error" class="mt-3 text-sm font-medium text-rose-700" role="alert">
      {{ validationMessage }}
    </p>
  </section>
</template>
