<script setup lang="ts">
import { computed, ref } from 'vue';

import type {
  AttendanceDecisionKpiSegment,
  AttendanceDecisionKpiViewModel,
} from '../utils/attendance-kpis.js';
import { formatPercentage } from '../utils/percentage.js';

interface Props {
  card: AttendanceDecisionKpiViewModel;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  detail: [payload: { id: AttendanceDecisionKpiViewModel['id']; segment: AttendanceDecisionKpiSegment }];
}>();

const primaryValue = computed(() => formatPercentage(props.card.primaryRate));
const secondaryValue = computed(() => formatPercentage(props.card.secondaryRate));
const maxTrendTotal = computed(() => Math.max(1, ...props.card.trend.map((item) => item.primary + item.secondary)));
const activeTrendDate = ref<string | null>(null);
const activeTrendIndex = computed(() => {
  const index = props.card.trend.findIndex((point) => point.date === activeTrendDate.value);
  return index < 0 ? Math.max(0, props.card.trend.length - 1) : index;
});
const activeTrend = computed(() => props.card.trend[activeTrendIndex.value] ?? null);

const palette = computed(() => {
  if (props.card.id === 'attendance_rate') {
    return {
      primaryFill: 'fill-blue-600',
      secondaryFill: 'fill-red-500',
      primaryBar: 'bg-blue-600',
      secondaryBar: 'bg-red-500',
      attention: 'bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-500',
    } as const;
  }

  if (props.card.id === 'adoption_rate') return {
    primaryFill: 'fill-indigo-600', secondaryFill: 'fill-amber-400',
    primaryBar: 'bg-indigo-600', secondaryBar: 'bg-amber-400',
    attention: 'bg-amber-50 text-amber-800 hover:bg-amber-100 focus-visible:ring-amber-500',
  } as const;

  if (props.card.id === 'issue_rate') return {
    primaryFill: 'fill-emerald-500', secondaryFill: 'fill-red-500',
    primaryBar: 'bg-emerald-500', secondaryBar: 'bg-red-500',
    attention: 'bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-500',
  } as const;

  return {
    primaryFill: 'fill-emerald-500',
    secondaryFill: 'fill-orange-400',
    primaryBar: 'bg-emerald-500',
    secondaryBar: 'bg-orange-400',
    attention: 'bg-orange-50 text-orange-700 hover:bg-orange-100 focus-visible:ring-orange-500',
  } as const;
});

function trendPrimaryLabel(value: number): string {
  if (props.card.id === 'attendance_rate') {
    return `${value} rotation${value > 1 ? 's' : ''} couverte${value > 1 ? 's' : ''}`;
  }

  if (props.card.id === 'adoption_rate') return `${value} opération${value > 1 ? 's' : ''} complète${value > 1 ? 's' : ''}`;
  if (props.card.id === 'issue_rate') return `${value} journée${value > 1 ? 's' : ''} sans signal`;
  return `${value} rotation${value > 1 ? 's' : ''} à l’heure`;
}

function trendSecondaryLabel(value: number): string {
  if (props.card.id === 'attendance_rate') {
    return `${value} rotation${value > 1 ? 's' : ''} non couverte${value > 1 ? 's' : ''}`;
  }

  if (props.card.id === 'adoption_rate') return `${value} opération${value > 1 ? 's' : ''} incomplète${value > 1 ? 's' : ''}`;
  if (props.card.id === 'issue_rate') return `${value} journée${value > 1 ? 's' : ''} à examiner`;
  return `${value} retard${value > 1 ? 's' : ''}`;
}

function pointOnCircle(angle: number, radius = 52): { x: number; y: number } {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: 60 + radius * Math.cos(radians), y: 60 + radius * Math.sin(radians) };
}

function sectorPath(startAngle: number, endAngle: number): string {
  if (endAngle - startAngle >= 359.999) {
    return 'M 60 8 A 52 52 0 1 1 59.999 8 Z';
  }

  const start = pointOnCircle(startAngle);
  const end = pointOnCircle(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M 60 60 L ${start.x.toFixed(3)} ${start.y.toFixed(3)} A 52 52 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)} Z`;
}

const primaryAngle = computed(() => Math.max(0, Math.min(360, (props.card.primaryRate ?? 0) * 3.6)));
const primaryPath = computed(() => sectorPath(0, primaryAngle.value));
const secondaryPath = computed(() => sectorPath(primaryAngle.value, 360));

function labelRadius(angleSize: number): number {
  // Garder les libellés entiers dans le disque, même près du bord d'un secteur.
  return angleSize < 72 ? 20 : 24;
}

const primaryLabelPoint = computed(() =>
  pointOnCircle(Math.max(1, primaryAngle.value / 2), labelRadius(primaryAngle.value)),
);
const secondaryAngleSize = computed(() => Math.max(0, 360 - primaryAngle.value));
const secondaryLabelPoint = computed(() =>
  pointOnCircle(
    primaryAngle.value + Math.max(1, secondaryAngleSize.value / 2),
    labelRadius(secondaryAngleSize.value),
  ),
);

const primaryCompactLabel = computed(() => primaryAngle.value < 72);
const secondaryCompactLabel = computed(() => secondaryAngleSize.value < 72);

function trendHeight(value: number): string {
  return `${Math.max(value > 0 ? 2 : 0, Math.round((value / maxTrendTotal.value) * 64))}px`;
}

function selectTrendIndex(index: number): void {
  activeTrendDate.value = props.card.trend[index]?.date ?? null;
}

function openDetail(segment: AttendanceDecisionKpiSegment): void {
  if (!props.card.available) return;
  emit('detail', { id: props.card.id, segment });
}
</script>

<template>
  <article class="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">{{ card.eyebrow }}</p>
        <h3 class="mt-1.5 text-xl font-extrabold tracking-normal text-slate-950">{{ card.title }}</h3>
      </div>
      <p class="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
        {{ card.available ? `Base : ${card.denominatorCount}` : 'À définir' }}
      </p>
    </div>

    <div class="mt-5 flex flex-col">
      <div class="relative mx-auto aspect-square w-full max-w-[280px]">
        <div v-if="!card.available" class="flex h-full w-full flex-col items-center justify-center rounded-full border-[18px] border-slate-200 bg-slate-50 text-center" :aria-label="`${card.title} : taux non défini`">
          <span class="text-3xl font-extrabold text-slate-600">N/D</span>
          <span class="mt-1 text-xs font-semibold text-slate-500">Aucune donnée évaluable</span>
        </div>
        <svg
          v-else
          viewBox="0 0 120 120"
          class="h-full w-full drop-shadow-sm"
          role="img"
          :aria-label="`${card.title}. ${card.primaryLabel} ${primaryValue}, ${card.secondaryLabel} ${secondaryValue}.`"
        >
          <path
            :d="secondaryPath"
            :class="['cursor-pointer transition hover:opacity-90 focus:outline-none', palette.secondaryFill]"
            tabindex="0"
            role="button"
            :aria-label="`${card.secondaryLabel} ${secondaryValue}. ${card.secondaryCount} occurrence(s). Voir le détail.`"
            @click="openDetail('secondary')"
            @keydown.enter.prevent="openDetail('secondary')"
            @keydown.space.prevent="openDetail('secondary')"
          />
          <path
            :d="primaryPath"
            :class="['cursor-pointer transition hover:opacity-90 focus:outline-none', palette.primaryFill]"
            tabindex="0"
            role="button"
            :aria-label="`${card.primaryLabel} ${primaryValue}. ${card.primaryCount} occurrence(s). Voir le détail.`"
            @click="openDetail('primary')"
            @keydown.enter.prevent="openDetail('primary')"
            @keydown.space.prevent="openDetail('primary')"
          />
          <circle cx="60" cy="60" r="52" fill="none" stroke="white" stroke-width="1.2" pointer-events="none" />
        </svg>

        <button
          v-if="card.available"
          type="button"
          class="absolute -translate-x-1/2 -translate-y-1/2 text-center text-white drop-shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          :class="primaryCompactLabel ? 'w-[72px]' : 'w-[106px]'"
          :style="{ left: `${(primaryLabelPoint.x / 120) * 100}%`, top: `${(primaryLabelPoint.y / 120) * 100}%` }"
          @click="openDetail('primary')"
        >
          <span :class="['block font-bold leading-tight', primaryCompactLabel ? 'text-[10px]' : 'text-xs']">{{ card.primaryLabel }}</span>
          <span :class="['mt-0.5 block font-extrabold leading-none', primaryCompactLabel ? 'text-base' : 'text-2xl']">{{ primaryValue }}</span>
          <span :class="['mt-1 block font-semibold leading-none opacity-95', primaryCompactLabel ? 'text-[9px]' : 'text-[11px]']">
            {{ card.primaryCount }} {{ card.id === 'adoption_rate' ? 'opération' : card.id === 'issue_rate' ? 'journée' : 'rotation' }}{{ card.primaryCount === 1 ? '' : 's' }}
          </span>
        </button>

        <button
          v-if="card.available"
          type="button"
          class="absolute -translate-x-1/2 -translate-y-1/2 text-center text-white drop-shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          :class="secondaryCompactLabel ? 'w-[72px]' : 'w-[106px]'"
          :style="{ left: `${(secondaryLabelPoint.x / 120) * 100}%`, top: `${(secondaryLabelPoint.y / 120) * 100}%` }"
          @click="openDetail('secondary')"
        >
          <span :class="['block font-bold leading-tight', secondaryCompactLabel ? 'text-[10px]' : 'text-xs']">{{ card.secondaryLabel }}</span>
          <span :class="['mt-0.5 block font-extrabold leading-none', secondaryCompactLabel ? 'text-base' : 'text-2xl']">{{ secondaryValue }}</span>
          <span :class="['mt-1 block font-semibold leading-none opacity-95', secondaryCompactLabel ? 'text-[9px]' : 'text-[11px]']">
            {{ card.secondaryCount }} {{ card.id === 'adoption_rate' ? 'opération' : card.id === 'issue_rate' ? 'journée' : 'rotation' }}{{ card.secondaryCount === 1 ? '' : 's' }}
          </span>
        </button>
      </div>

      <div v-if="card.available" class="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-700" aria-label="Légende du diagramme">
        <span class="inline-flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full" :class="palette.primaryBar" aria-hidden="true" />{{ card.primaryLabel }}</span>
        <span class="inline-flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full" :class="palette.secondaryBar" aria-hidden="true" />{{ card.secondaryLabel }}</span>
      </div>
      <p class="mt-4 text-center text-xs leading-5 text-slate-600">{{ card.explanation }}</p>

      <div class="mt-5 min-w-0 border-t border-slate-100 pt-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-slate-800">Évolution de la période</p>
            <p class="mt-0.5 text-xs text-slate-500">Toute la période est visible ; chaque bande représente une journée analysée.</p>
          </div>
          <button
            v-if="card.available"
            type="button"
            class="shrink-0 text-xs font-extrabold text-indigo-700 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            @click="openDetail('primary')"
          >
            Détail →
          </button>
        </div>

        <div v-if="card.trend.length > 0" class="mt-4 min-w-0">
          <div class="w-full" role="group" :aria-label="`Évolution journalière : ${card.title}`">
            <div class="flex h-16 w-full items-end overflow-hidden rounded-sm bg-slate-50">
              <div
                v-for="point in card.trend"
                :key="point.date"
                class="flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-end border-r border-white/40"
                :class="activeTrend?.date === point.date ? 'ring-2 ring-inset ring-indigo-700' : ''"
                :title="`${point.date} : ${trendPrimaryLabel(point.primary)}, ${trendSecondaryLabel(point.secondary)} sur ${point.primary + point.secondary} ${card.denominatorLabel}`"
                @mouseenter="activeTrendDate = point.date"
                @click="activeTrendDate = point.date"
              >
                <span class="block" :class="palette.secondaryBar" :style="{ height: trendHeight(point.secondary) }" />
                <span class="block" :class="palette.primaryBar" :style="{ height: trendHeight(point.primary) }" />
              </div>
            </div>
          </div>
          <div class="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-800" aria-live="polite">
            <template v-if="activeTrend">{{ activeTrend.date }} · {{ trendPrimaryLabel(activeTrend.primary) }} · {{ trendSecondaryLabel(activeTrend.secondary) }} sur {{ activeTrend.primary + activeTrend.secondary }} {{ card.denominatorLabel }}</template>
          </div>
          <input
            type="range"
            class="mt-2 w-full accent-indigo-600"
            min="0"
            :max="card.trend.length - 1"
            :value="activeTrendIndex"
            :aria-label="`Choisir une journée pour ${card.title}`"
            :aria-valuetext="activeTrend?.date"
            @input="selectTrendIndex(Number(($event.target as HTMLInputElement).value))"
          >
          <div class="flex justify-between text-[10px] text-slate-500">
            <span>{{ card.trend[0]?.date }}</span>
            <span>{{ card.trend[card.trend.length - 1]?.date }}</span>
          </div>
        </div>

        <p v-else class="mt-4 text-xs leading-5 text-slate-500">Évolution non disponible pour cette période.</p>

        <p v-if="card.available" class="mt-4 text-xs leading-5 text-slate-500">
          Dénominateur : {{ card.denominatorCount }} {{ card.denominatorLabel }}.
        </p>

        <button
          v-if="card.available && card.attention"
          type="button"
          :class="['mt-4 w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2', palette.attention]"
          @click="openDetail('secondary')"
        >
          {{ card.attention }}
        </button>
      </div>
    </div>
  </article>
</template>
