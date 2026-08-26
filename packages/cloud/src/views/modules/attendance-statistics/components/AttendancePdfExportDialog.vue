<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useAccessibleDialog } from '../composables/useAccessibleDialog.js';
import type { AttendanceIssue, AttendanceOverview } from '../types/attendance-statistics.types.js';
import type { AttendanceAnalysisContext } from '../utils/attendance-analysis-context.js';
import { ATTENDANCE_ISSUE_PRESENTATION } from '../utils/attendance-status.js';
import { ATTENDANCE_PDF_PRESENTATION_PROFILES } from '../pdf/config/attendance-pdf-presentation-levels.js';
import {
  buildAttendancePdfExportRequestFromDraft,
  createAttendancePdfExportDraft,
  getAttendancePdfExportModeAvailability,
  type AttendancePdfExportDraft,
} from '../pdf/integration/attendance-pdf-ui.js';
import {
  previewAttendancePdfExport,
  type AttendanceJsPdfLoader,
} from '../pdf/integration/attendance-pdf-runtime.js';
import { buildAttendancePdfExportPreflight } from '../pdf/report/attendance-pdf-preflight.js';
import type {
  AttendancePdfExportMode,
  AttendancePdfPresentationContext,
  AttendancePdfPresentationLevel,
} from '../pdf/types/attendance-pdf.types.js';

interface Props {
  open: boolean;
  overview: AttendanceOverview | null;
  analysisContext?: AttendanceAnalysisContext | null;
  presentationContext?: AttendancePdfPresentationContext;
  initialMode?: AttendancePdfExportMode;
  initialEmployeeGuid?: string | null;
  initialIssue?: AttendanceIssue | null;
  loadJsPdf?: AttendanceJsPdfLoader;
}

const props = withDefaults(defineProps<Props>(), {
  analysisContext: null,
  initialMode: 'period_summary',
  initialEmployeeGuid: null,
  initialIssue: null,
});

const emit = defineEmits<{
  close: [];
  previewed: [filename: string];
}>();

const dialogRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLElement | null>(null);
const exporting = ref(false);
const exportError = ref<string | null>(null);
const draft = ref<AttendancePdfExportDraft>(createAttendancePdfExportDraft({ mode: props.initialMode }));
const isOpen = computed(() => props.open && props.overview !== null);

useAccessibleDialog({
  open: isOpen,
  dialogRef,
  initialFocusRef: closeButtonRef,
  close: () => emit('close'),
});

const modeAvailability = computed(() =>
  props.overview
    ? getAttendancePdfExportModeAvailability({
        overview: props.overview,
        analysisContext: props.analysisContext,
      })
    : [],
);

const presentationLevels = computed(() =>
  (['simplified', 'optimized', 'detailed'] as const).map(
    (level) => ATTENDANCE_PDF_PRESENTATION_PROFILES[level],
  ),
);

const employees = computed(() =>
  [...(props.overview?.employees ?? [])].sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName, 'fr', { sensitivity: 'base' }),
  ),
);

const issueOptions = computed(() => props.overview?.issues ?? []);

function resetDraft(): void {
  draft.value = createAttendancePdfExportDraft({
    mode: props.initialMode,
    ...(props.initialEmployeeGuid ? { employeeGuid: props.initialEmployeeGuid } : {}),
    ...(props.initialIssue ? { issue: props.initialIssue } : {}),
  });
  exportError.value = null;
}

watch(
  () => [props.open, props.initialMode, props.initialEmployeeGuid, props.initialIssue] as const,
  ([open]) => {
    if (open) resetDraft();
  },
);

function selectMode(mode: AttendancePdfExportMode): void {
  const availability = modeAvailability.value.find((item) => item.choice.mode === mode);
  if (availability?.disabled) return;
  draft.value = createAttendancePdfExportDraft({
    mode,
    ...(mode === 'employee_sheet' && props.initialEmployeeGuid
      ? { employeeGuid: props.initialEmployeeGuid }
      : {}),
    ...(mode === 'issues_only' && props.initialIssue ? { issue: props.initialIssue } : {}),
  });
  exportError.value = null;
}

function selectPresentationLevel(level: AttendancePdfPresentationLevel): void {
  draft.value = {
    ...draft.value,
    presentationLevel: level,
    ...(draft.value.mode === 'full_report'
      ? {
          employeeDetails: level === 'simplified'
            ? 'none' as const
            : level === 'optimized'
              ? 'attention_only' as const
              : 'all' as const,
        }
      : {}),
  };
}

const requestResult = computed(() => {
  if (!props.overview) return { request: null, error: 'Aucun snapshot de statistiques à exporter.' };
  try {
    const request = buildAttendancePdfExportRequestFromDraft({
      draft: draft.value,
      overview: props.overview,
      analysisContext: props.analysisContext,
      ...(props.presentationContext ? { presentationContext: props.presentationContext } : {}),
    });
    return { request, error: null };
  } catch (error) {
    return {
      request: null,
      error: error instanceof Error ? error.message : "Impossible de préparer cet export.",
    };
  }
});

const preflight = computed(() => {
  if (!requestResult.value.request) return null;
  try {
    return buildAttendancePdfExportPreflight(requestResult.value.request);
  } catch {
    return null;
  }
});

const canExport = computed(() => Boolean(requestResult.value.request && preflight.value && !exporting.value));

async function previewPdf(): Promise<void> {
  const request = requestResult.value.request;
  if (!request || !canExport.value) return;
  exporting.value = true;
  exportError.value = null;
  try {
    const report = await previewAttendancePdfExport({
      request,
      ...(props.loadJsPdf ? { loader: props.loadJsPdf } : {}),
    });
    emit('previewed', report.filename);
    emit('close');
  } catch (error) {
    exportError.value = error instanceof Error
      ? error.message
      : "L’ouverture de l’aperçu PDF a échoué.";
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open && overview" class="fixed inset-0 z-[80]" role="presentation">
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]"
        aria-label="Fermer les options d’export"
        tabindex="-1"
        @click="emit('close')"
      />

      <section
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-pdf-export-title"
        aria-describedby="attendance-pdf-export-description"
        tabindex="-1"
        class="absolute left-1/2 top-1/2 flex max-h-[92vh] w-[min(96vw,72rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none"
      >
        <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Reporting PDF</p>
            <h2 id="attendance-pdf-export-title" class="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Exporter les statistiques</h2>
            <p id="attendance-pdf-export-description" class="mt-1 max-w-3xl text-sm text-slate-500">
              Choisissez séparément le périmètre du rapport et sa profondeur de présentation. Les chiffres restent ceux du snapshot API chargé.
            </p>
          </div>
          <button
            ref="closeButtonRef"
            type="button"
            class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Fermer"
            @click="emit('close')"
          ><span aria-hidden="true">×</span></button>
        </header>

        <div class="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <fieldset>
            <legend class="text-sm font-bold text-slate-950">1. Périmètre d’export</legend>
            <div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <button
                v-for="item in modeAvailability"
                :key="item.choice.mode"
                type="button"
                class="min-h-28 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                :class="[
                  draft.mode === item.choice.mode ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-indigo-300',
                  item.disabled ? 'cursor-not-allowed opacity-50 hover:border-slate-200' : '',
                ]"
                :disabled="item.disabled"
                :aria-pressed="draft.mode === item.choice.mode"
                :title="item.disabledReason ?? undefined"
                @click="selectMode(item.choice.mode)"
              >
                <span class="block font-bold text-slate-950">{{ item.choice.label }}</span>
                <span class="mt-1 block text-xs leading-5 text-slate-500">{{ item.choice.description }}</span>
                <span v-if="item.disabledReason" class="mt-2 block text-xs font-semibold text-amber-700">{{ item.disabledReason }}</span>
              </button>
            </div>
          </fieldset>

          <fieldset class="mt-6 border-t border-slate-100 pt-5">
            <legend class="text-sm font-bold text-slate-950">2. Niveau de présentation</legend>
            <div class="mt-3 grid gap-3 sm:grid-cols-3">
              <button
                v-for="item in presentationLevels"
                :key="item.level"
                type="button"
                class="rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                :class="draft.presentationLevel === item.level ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300'"
                :aria-pressed="draft.presentationLevel === item.level"
                @click="selectPresentationLevel(item.level)"
              >
                <span class="font-bold text-slate-950">{{ item.label }}</span>
                <span class="mt-1 block text-xs leading-5 text-slate-500">{{ item.description }}</span>
              </button>
            </div>
          </fieldset>

          <div v-if="draft.mode === 'full_report'" class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label for="attendance-pdf-employee-details" class="text-sm font-bold text-slate-900">Fiches individuelles dans le rapport complet</label>
            <select id="attendance-pdf-employee-details" v-model="draft.employeeDetails" class="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="none">Aucune fiche individuelle</option>
              <option value="attention_only">Uniquement les collaborateurs avec éléments à examiner</option>
              <option value="all">Tous les collaborateurs</option>
            </select>
          </div>

          <div v-if="draft.mode === 'employee_sheet'" class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label for="attendance-pdf-employee" class="text-sm font-bold text-slate-900">Collaborateur</label>
            <select id="attendance-pdf-employee" v-model="draft.employeeGuid" class="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option :value="null">Sélectionner un collaborateur</option>
              <option v-for="employee in employees" :key="employee.employeeGuid" :value="employee.employeeGuid">{{ employee.employeeName }}</option>
            </select>
          </div>

          <div v-if="draft.mode === 'issues_only'" class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label for="attendance-pdf-issue" class="text-sm font-bold text-slate-900">Type d’élément (optionnel)</label>
            <select id="attendance-pdf-issue" v-model="draft.issue" class="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option :value="null">Tous les éléments à examiner</option>
              <option v-for="summary in issueOptions" :key="summary.issue" :value="summary.issue">{{ ATTENDANCE_ISSUE_PRESENTATION[summary.issue].label }} · {{ summary.count }}</option>
            </select>
          </div>

          <section v-if="preflight" class="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4" aria-labelledby="attendance-pdf-preflight-title">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.13em] text-indigo-700">Pré-contrôle</p>
                <h3 id="attendance-pdf-preflight-title" class="mt-1 font-bold text-slate-950">Contenu réellement prévu</h3>
              </div>
              <span class="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">{{ preflight.plan.presentationLabel }}</span>
            </div>
            <dl class="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-lg bg-white px-3 py-2"><dt class="text-xs text-slate-500">Période</dt><dd class="font-bold text-slate-900">{{ preflight.volume.periodDays }} jours</dd></div>
              <div class="rounded-lg bg-white px-3 py-2"><dt class="text-xs text-slate-500">Équipe / sélection</dt><dd class="font-bold text-slate-900">{{ preflight.plan.sections.some((item) => item.section === 'team') ? `${preflight.volume.teamRows} lignes` : 'Non incluse' }}</dd></div>
              <div class="rounded-lg bg-white px-3 py-2"><dt class="text-xs text-slate-500">Occurrences détaillées</dt><dd class="font-bold text-slate-900">{{ preflight.volume.issueOccurrenceRowsRendered }}</dd></div>
              <div class="rounded-lg bg-white px-3 py-2"><dt class="text-xs text-slate-500">Fiches individuelles</dt><dd class="font-bold text-slate-900">{{ preflight.volume.employeeDetailCount }}</dd></div>
            </dl>
            <ul v-if="preflight.notices.length || preflight.contract.validation.warnings.length" class="mt-3 space-y-1.5 text-xs leading-5 text-slate-700">
              <li v-for="notice in preflight.notices" :key="notice.code" :class="notice.level === 'warning' ? 'font-semibold text-amber-800' : ''">• {{ notice.message }}</li>
              <li v-for="warning in preflight.contract.validation.warnings" :key="warning.code" class="text-slate-600">• {{ warning.message }}</li>
            </ul>
          </section>

          <p v-if="requestResult.error" class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900" role="status">{{ requestResult.error }}</p>
          <p v-if="exportError" class="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900" role="alert">{{ exportError }}</p>
        </div>

        <footer class="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p class="text-xs text-slate-500">Le PDF présente le snapshot actuellement chargé ; il ne modifie aucune donnée de pointage.</p>
          <div class="flex gap-2">
            <button type="button" class="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" @click="emit('close')">Annuler</button>
            <button type="button" class="min-h-11 rounded-xl bg-indigo-700 px-5 text-sm font-bold text-white hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!canExport" @click="previewPdf">
              {{ exporting ? 'Préparation…' : 'Aperçu PDF ↗' }}
            </button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
