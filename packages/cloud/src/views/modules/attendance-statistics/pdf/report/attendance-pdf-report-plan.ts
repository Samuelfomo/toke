import {
  ATTENDANCE_PDF_PRESENTATION_LEVELS,
  type AttendancePdfEmployeeDetailMode,
  type AttendancePdfExportChoice,
  type AttendancePdfExportRequest,
  type AttendancePdfPresentationLevel,
  type AttendancePdfReportContract,
  type AttendancePdfReportPlan,
  type AttendancePdfReportPlanSection,
} from '../types/attendance-pdf.types.js';
import { DEFAULT_ATTENDANCE_PDF_PRESENTATION_LEVEL_BY_MODE } from '../config/attendance-pdf-presentation-levels.js';
import { getAttendancePdfExportProfile } from '../config/attendance-pdf-profiles.js';

function section(sectionId: AttendancePdfReportPlanSection['section'], reason: string): AttendancePdfReportPlanSection {
  return { section: sectionId, reason };
}

export function resolveAttendancePdfEmployeeDetailsMode(input: {
  request: AttendancePdfExportRequest;
  presentationLevel: AttendancePdfPresentationLevel;
}): AttendancePdfEmployeeDetailMode {
  const { request } = input;
  if (request.mode !== 'full_report' && request.mode !== 'hr_complete') return 'none';
  return request.employeeDetails ?? 'none';
}

/**
 * Normalise uniquement les options de rendu. Les profils principaux ne déclenchent
 * plus automatiquement de fiches individuelles : celles-ci restent un choix explicite.
 */
export function normalizeAttendancePdfExportRequest(
  request: AttendancePdfExportRequest,
): AttendancePdfExportRequest {
  if (request.mode !== 'full_report' && request.mode !== 'hr_complete') return request;
  return { ...request, employeeDetails: request.employeeDetails ?? 'none' };
}

export function buildAttendancePdfReportPlan(contract: AttendancePdfReportContract): AttendancePdfReportPlan {
  const mode = contract.request.mode;
  const level = contract.presentationProfile.level;
  const notes: string[] = [];
  let sections: AttendancePdfReportPlanSection[] = [];
  const effectiveEmployeeDetails = resolveAttendancePdfEmployeeDetailsMode({
    request: contract.request,
    presentationLevel: level,
  });

  switch (mode) {
    case 'period_summary': {
      sections = [
        section('executive_summary', "Donne en quelques secondes l'état global de l'équipe avec les KPI décisionnels."),
        section('team', 'Présente ensuite une ligne compacte par collaborateur pour identifier rapidement les situations qui méritent une attention.'),
      ];
      notes.push('Profil Direction : aucune courbe, aucune occurrence détaillée et aucune fiche individuelle. La cible est une lecture en 2 à 5 minutes.');
      break;
    }
    case 'full_report': {
      sections = [
        section('executive_summary', 'Pose la situation globale avant toute analyse opérationnelle.'),
        section('team', "Compare l'équipe sur les indicateurs nécessaires au pilotage sans classement de performance."),
        section('trend', "Montre quand les écarts apparaissent et comment ils évoluent sur la période."),
        section('issues', 'Présente les catégories et occurrences limitées utiles au suivi du manager.'),
      ];
      if (effectiveEmployeeDetails !== 'none') {
        sections.push(section('employee_details', 'Ajoute uniquement les fiches individuelles explicitement demandées.'));
      }
      notes.push('Profil Pilotage : l’objectif est de localiser et suivre les écarts, sans transformer le rapport en investigation exhaustive.');
      break;
    }
    case 'hr_complete': {
      sections = [
        section('executive_summary', 'Donne les indicateurs de référence nécessaires pour situer les constats RH.'),
        section('team', "Présente une vue équipe enrichie pour comparer les résultats et leurs volumes sous-jacents."),
        section('trend', "Documente l'évolution de la période afin de replacer les écarts dans le temps."),
        section('issues', 'Décrit les éléments à examiner avec une profondeur supérieure au rapport de pilotage.'),
      ];
      if (effectiveEmployeeDetails !== 'none') {
        sections.push(section('employee_details', 'Ajoute les fiches ciblées demandées explicitement pour approfondir certains collaborateurs.'));
      }
      notes.push('Profil RH complet : explique les résultats et les situations à examiner, sans concaténer automatiquement toutes les fiches individuelles.');
      break;
    }
    case 'current_analysis': {
      sections.push(section('analysis_context', "Explique précisément le contexte sélectionné dans le dashboard sans réafficher les KPI globaux de toute l'équipe."));
      sections.push(section('team', 'Liste uniquement les collaborateurs correspondant au contexte d’analyse courant.'));
      notes.push("La synthèse globale de période est volontairement exclue afin de ne pas mélanger le périmètre analysé avec les chiffres de toute l'équipe.");
      if (contract.selection.issue) {
        notes.push("Le type d'élément sélectionné reste affiché dans le contexte ; le détail global du type n'est pas dupliqué si d'autres filtres de date/statut sont actifs.");
      }
      break;
    }
    case 'issues_only': {
      sections.push(section('issues', 'Rapport opérationnel centré uniquement sur les éléments à examiner du périmètre demandé.'));
      notes.push("La synthèse globale n'est pas reproduite : ce mode sert à traiter les éléments signalés, pas à refaire le rapport de période.");
      break;
    }
    case 'employee_sheet': {
      sections.push(section('employee_details', "L'investigation individuelle se suffit à elle-même et n'affiche pas les KPI de toute l'équipe."));
      notes.push("Profil Investigation : détail journalier complet du collaborateur sélectionné à partir des seules données disponibles dans le snapshot API.");
      break;
    }
  }

  return {
    mode,
    modeLabel: contract.profile.label,
    presentationLevel: level,
    presentationLabel: contract.presentationProfile.label,
    sections,
    effectiveEmployeeDetails,
    notes,
  };
}

export function getAttendancePdfExportChoices(): AttendancePdfExportChoice[] {
  return (['period_summary', 'full_report', 'hr_complete', 'current_analysis', 'issues_only', 'employee_sheet'] as const).map((mode) => {
    const profile = getAttendancePdfExportProfile(mode);
    const isPrimaryReport = mode === 'period_summary' || mode === 'full_report' || mode === 'hr_complete';
    return {
      mode,
      label: profile.label,
      description: profile.description,
      defaultPresentationLevel: DEFAULT_ATTENDANCE_PDF_PRESENTATION_LEVEL_BY_MODE[mode],
      availablePresentationLevels: isPrimaryReport || mode === 'employee_sheet'
        ? [DEFAULT_ATTENDANCE_PDF_PRESENTATION_LEVEL_BY_MODE[mode]]
        : ATTENDANCE_PDF_PRESENTATION_LEVELS,
      requiresAnalysisContext: mode === 'current_analysis',
      requiresEmployeeGuid: mode === 'employee_sheet',
      supportsEmployeeDetailSelection: mode === 'hr_complete',
    };
  });
}
