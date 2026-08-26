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

function section(section: AttendancePdfReportPlanSection['section'], reason: string): AttendancePdfReportPlanSection {
  return { section, reason };
}

export function resolveAttendancePdfEmployeeDetailsMode(input: {
  request: AttendancePdfExportRequest;
  presentationLevel: AttendancePdfPresentationLevel;
}): AttendancePdfEmployeeDetailMode {
  const { request, presentationLevel } = input;
  if (request.mode !== 'full_report') return 'none';
  if (request.employeeDetails) return request.employeeDetails;
  if (presentationLevel === 'simplified') return 'none';
  if (presentationLevel === 'optimized') return 'attention_only';
  return 'all';
}

/**
 * Normalise uniquement les options de rendu. Les données statistiques restent les mêmes.
 * Pour un rapport complet, le niveau de présentation fournit un comportement par défaut
 * pour les fiches individuelles, que le manager peut toujours surcharger explicitement.
 */
export function normalizeAttendancePdfExportRequest(
  request: AttendancePdfExportRequest,
): AttendancePdfExportRequest {
  if (request.mode !== 'full_report') return request;
  const presentationLevel = request.presentationLevel ?? DEFAULT_ATTENDANCE_PDF_PRESENTATION_LEVEL_BY_MODE.full_report;
  const employeeDetails = resolveAttendancePdfEmployeeDetailsMode({ request, presentationLevel });
  return { ...request, employeeDetails };
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
      sections.push(section('executive_summary', 'Donne immédiatement le contexte, la qualité, les 5 KPI et les principaux éléments à examiner.'));
      if (level !== 'simplified') {
        sections.push(section('trend', "Ajoute l'évolution quotidienne et les valeurs exactes sans dépendre d'un tooltip."));
        sections.push(section('issues', "Ajoute les éléments à examiner selon le niveau de détail choisi."));
      }
      notes.push(level === 'simplified'
        ? 'La synthèse simplifiée tient volontairement sur le premier niveau de lecture et n’imprime pas le détail des occurrences.'
        : 'La synthèse de période reste sans vue équipe exhaustive ; utiliser Rapport complet pour obtenir le tableau des collaborateurs.');
      break;
    }
    case 'full_report': {
      if (level === 'simplified') {
        sections = [
          section('executive_summary', 'Ouvre le rapport par la synthèse KPI sans dupliquer la répartition ni les principaux éléments à examiner.'),
          section('team', "Présente immédiatement l'équipe et sa durée nette enregistrée, sans classement de performance."),
          section('trend', "Documente ensuite l'évolution de la période et la durée nette enregistrée de chaque journée."),
        ];
        if (effectiveEmployeeDetails !== 'none') {
          sections.push(section('employee_details', effectiveEmployeeDetails === 'all'
            ? 'Ajoute les fiches de tous les collaborateurs demandées explicitement.'
            : 'Ajoute les fiches des collaborateurs ayant des éléments à examiner demandées explicitement.'));
        }
        sections.push(section('issues', 'Termine le rapport par les éléments à examiner.'));
      } else {
        sections = [
          section('executive_summary', 'Ouvre le rapport de référence par la lecture décisionnelle globale.'),
          section('trend', "Documente l'évolution de la période."),
          section('issues', 'Documente les éléments à examiner et leur détail disponible.'),
          section('team', "Présente l'ensemble de l'équipe sans classement de performance."),
        ];
        if (effectiveEmployeeDetails !== 'none') {
          sections.push(section('employee_details', effectiveEmployeeDetails === 'all'
            ? 'Ajoute les fiches de tous les collaborateurs car le rapport détaillé les demande.'
            : 'Ajoute uniquement les fiches des collaborateurs ayant des éléments à examiner.'));
        }
      }
      notes.push(`Détails individuels résolus : ${effectiveEmployeeDetails}.`);
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
      sections.push(section('employee_details', "La fiche individuelle se suffit à elle-même et n'affiche pas les KPI de toute l'équipe."));
      notes.push('Le profil de présentation choisit la profondeur de la fiche sans changer les valeurs métier du collaborateur.');
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
  return (['period_summary', 'full_report', 'current_analysis', 'issues_only', 'employee_sheet'] as const).map((mode) => {
    const profile = getAttendancePdfExportProfile(mode);
    return {
      mode,
      label: profile.label,
      description: profile.description,
      defaultPresentationLevel: DEFAULT_ATTENDANCE_PDF_PRESENTATION_LEVEL_BY_MODE[mode],
      availablePresentationLevels: ATTENDANCE_PDF_PRESENTATION_LEVELS,
      requiresAnalysisContext: mode === 'current_analysis',
      requiresEmployeeGuid: mode === 'employee_sheet',
      supportsEmployeeDetailSelection: mode === 'full_report',
    };
  });
}
