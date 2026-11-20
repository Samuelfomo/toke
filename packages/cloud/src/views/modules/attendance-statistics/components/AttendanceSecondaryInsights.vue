<script setup lang="ts">
import { computed } from 'vue';

import type { AttendanceOverview } from '../types/attendance-statistics.types.js';
import { formatDurationMinutes } from '../utils/duration.js';

interface Props {
  overview: AttendanceOverview;
}

const props = defineProps<Props>();

const metrics = computed(() => props.overview.summary.durations);
const recordedDurationAvailable = computed(() => metrics.value.daysWithKnownNetDuration > 0);
const attributedDurationAvailable = computed(
  () => metrics.value.occurrencesWithKnownAttributedWorkDuration > 0,
);

const recordedDurationLabel = computed(() =>
  recordedDurationAvailable.value
    ? formatDurationMinutes(metrics.value.netMinutes, { emptyLabel: 'Non disponible' })
    : 'Non disponible',
);

const attributedDurationLabel = computed(() =>
  attributedDurationAvailable.value
    ? formatDurationMinutes(metrics.value.attributedWorkMinutes, { emptyLabel: 'Non disponible' })
    : 'Non disponible',
);

function plural(value: number): string {
  return value === 1 ? '' : 's';
}
</script>

<template>
  <section
    class="rounded-lg border border-slate-200 bg-white p-4 shadow-md sm:p-5"
    aria-labelledby="attendance-secondary-insights-title"
  >
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Information descriptive</p>
      <h2 id="attendance-secondary-insights-title" class="mt-1 text-base font-bold text-slate-950">
        Durées observées sur la période
      </h2>
      <p class="mt-1 max-w-4xl text-sm leading-6 text-slate-500">
        Ces valeurs décrivent l’activité enregistrée. Elles ne constituent pas un indicateur de performance et ne sont pas comparées directement au total planifié lorsque les périmètres calculables diffèrent.
      </p>
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <article class="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Durée nette enregistrée</p>
        <p class="mt-2 text-2xl font-bold tabular-nums text-slate-950">{{ recordedDurationLabel }}</p>
        <p class="mt-2 text-xs leading-5 text-slate-500">
          {{ metrics.daysWithKnownNetDuration }} journée{{ plural(metrics.daysWithKnownNetDuration) }} avec une durée nette calculable.
          <template v-if="metrics.daysWithMissingDuration > 0">
            {{ metrics.daysWithMissingDuration }} journée{{ plural(metrics.daysWithMissingDuration) }} reste{{ metrics.daysWithMissingDuration > 1 ? 'nt' : '' }} sans durée complète.
          </template>
        </p>
      </article>

      <article class="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.1em] text-indigo-700">Durée attribuée aux rotations</p>
        <p class="mt-2 text-2xl font-bold tabular-nums text-slate-950">{{ attributedDurationLabel }}</p>
        <p class="mt-2 text-xs leading-5 text-slate-600">
          <template v-if="attributedDurationAvailable">
            {{ metrics.occurrencesWithKnownAttributedWorkDuration }} occurrence{{ plural(metrics.occurrencesWithKnownAttributedWorkDuration) }} de planning dispose{{ metrics.occurrencesWithKnownAttributedWorkDuration > 1 ? 'nt' : '' }} d’une durée attribuable de façon fiable.
          </template>
          <template v-else>
            Aucune durée ne peut encore être attribuée de façon fiable à une occurrence de planning sur ce périmètre.
          </template>
        </p>
      </article>
    </div>

    <p
      v-if="metrics.daysWithKnownExpectedWorkDuration !== metrics.occurrencesWithKnownAttributedWorkDuration"
      class="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs leading-5 text-amber-900"
    >
      Le planning fournit une durée prévue pour {{ metrics.daysWithKnownExpectedWorkDuration }} journée{{ plural(metrics.daysWithKnownExpectedWorkDuration) }}, tandis que l’activité n’est attribuable de façon fiable que sur {{ metrics.occurrencesWithKnownAttributedWorkDuration }} occurrence{{ plural(metrics.occurrencesWithKnownAttributedWorkDuration) }}. Les deux totaux ne sont donc pas mis en ratio ici.
    </p>
  </section>
</template>
