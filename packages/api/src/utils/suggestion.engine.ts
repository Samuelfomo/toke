// ─────────────────────────────────────────────────────────────────────────────
// suggestion.engine.ts — V1.5
//
// Moteur de suggestion de planning.
// Principe : maintenir la couverture historique par créneau,
//            faire tourner équitablement les employés,
//            protéger les habitudes fortes.
//
// Pur TypeScript — aucune dépendance Express ou Sequelize.
// ─────────────────────────────────────────────────────────────────────────────

export const HISTORY_WEEKS        = 8
const STRONG_HABIT_THRESHOLD      = 0.75  // 6/8 semaines → habitude forte
const DAY_KEYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as const
type DayKey    = (typeof DAY_KEYS)[number]

// ── Types publics ─────────────────────────────────────────────────────────────

export interface HistoricalAssignment {
  userGuid:     string
  startDate:    string   // YYYY-MM-DD
  endDate:      string   // YYYY-MM-DD
  templateGuid: string
  templateName: string
  definition:   Record<string, any>  // { Mon: [...] | null, ... }
}

export interface TargetEmployee {
  guid: string
  name: string
  code: string
}

export interface DayReason {
  templateName: string
  templateGuid: string | null
  confidence:   number     // 0–100
  factors:      string[]
}

export interface EmployeeSuggestionResult {
  userGuid: string
  schedule: Record<string, string | null>      // { 'YYYY-MM-DD': templateGuid|null }
  reasons:  Record<string, DayReason | null>
}

export interface EngineResult {
  items:           EmployeeSuggestionResult[]
  conformityScore: number   // 0–100
}

// ── Helpers date ──────────────────────────────────────────────────────────────

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function isoToDayKey(iso: string): DayKey {
  const map: DayKey[] = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return map[new Date(iso + 'T00:00:00').getDay()]
}

function periodDates(from: string, to: string): string[] {
  const dates: string[] = []
  let cur = from
  while (cur <= to) { dates.push(cur); cur = addDays(cur, 1) }
  return dates
}

/** Vrai si iso est dans [start, end] */
function covers(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end
}

/** Template actif pour un employé à une date donnée. Null si repos. */
function getTemplateOnDate(
  assignments: HistoricalAssignment[],
  userGuid:    string,
  iso:         string,
): { templateGuid: string; templateName: string; hasWork: boolean } | null {
  for (const a of assignments) {
    if (a.userGuid !== userGuid) continue
    if (!covers(iso, a.startDate, a.endDate)) continue
    const dayKey  = isoToDayKey(iso)
    const blocks  = a.definition[dayKey]
    const hasWork = Array.isArray(blocks) && blocks.length > 0
    return { templateGuid: a.templateGuid, templateName: a.templateName, hasWork }
  }
  return null
}

// ── Étape 1 : Couverture cible par (dayKey × templateGuid) ───────────────────
// Pour chaque (lundi, matin) : combien de personnes y étaient en moyenne
// sur les N semaines passées ?

interface SlotCoverage {
  templateGuid: string
  templateName: string
  targetCount:  number   // médiane arrondie
}

function computeHistoricalCoverage(
  assignments:  HistoricalAssignment[],
  employees:    TargetEmployee[],
  periodFrom:   string,
  historyWeeks: number,
): Map<DayKey, SlotCoverage[]> {
  // Pour chaque (dayKey, templateGuid), collecter le nombre de personnes
  // par semaine historique
  const weekCounts = new Map<string, number[]>()  // key = `${dayKey}::${templateGuid}`

  for (let w = 0; w < historyWeeks; w++) {
    const weekStart = addDays(periodFrom, -(w + 1) * 7)
    const weekEnd   = addDays(weekStart, 6)
    const weekDates = periodDates(weekStart, weekEnd)

    // Compter par (dayKey, templateGuid) ce que les employés faisaient cette semaine
    const weekSlotCount = new Map<string, number>()

    for (const iso of weekDates) {
      const dk = isoToDayKey(iso)
      for (const emp of employees) {
        const match = getTemplateOnDate(assignments, emp.guid, iso)
        if (!match || !match.hasWork) continue
        const k = `${dk}::${match.templateGuid}::${match.templateName}`
        weekSlotCount.set(k, (weekSlotCount.get(k) ?? 0) + 1)
      }
    }

    // Ajouter les comptes de cette semaine dans les séries
    for (const [k, count] of weekSlotCount.entries()) {
      if (!weekCounts.has(k)) weekCounts.set(k, [])
      weekCounts.get(k)!.push(count)
    }
  }

  // Calculer la médiane pour chaque slot
  const result = new Map<DayKey, SlotCoverage[]>()

  for (const [k, counts] of weekCounts.entries()) {
    const [dk, templateGuid, templateName] = k.split('::')
    const dayKey = dk as DayKey

    const sorted      = [...counts].sort((a, b) => a - b)
    const mid         = Math.floor(sorted.length / 2)
    const median      = sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid]
    const targetCount = Math.max(1, median)

    if (!result.has(dayKey)) result.set(dayKey, [])
    result.get(dayKey)!.push({ templateGuid, templateName, targetCount })
  }

  return result
}

// ── Étape 2 : Habitudes fortes par employé ───────────────────────────────────
// Un employé a une habitude forte sur (dayKey, templateGuid) si il y était
// dans >= STRONG_HABIT_THRESHOLD des semaines historiques

interface StrongHabit {
  userGuid:     string
  dayKey:       DayKey
  templateGuid: string
  templateName: string
  frequency:    number  // 0–1
}

function detectStrongHabits(
  assignments:  HistoricalAssignment[],
  employees:    TargetEmployee[],
  periodFrom:   string,
  historyWeeks: number,
): StrongHabit[] {
  const habits: StrongHabit[] = []

  for (const emp of employees) {
    // Pour chaque dayKey, compter les occurrences de chaque template
    const counts = new Map<string, { templateName: string; count: number }>()

    for (let w = 0; w < historyWeeks; w++) {
      const weekStart = addDays(periodFrom, -(w + 1) * 7)
      const weekDates = periodDates(weekStart, addDays(weekStart, 6))

      for (const iso of weekDates) {
        const dk    = isoToDayKey(iso)
        const match = getTemplateOnDate(assignments, emp.guid, iso)
        if (!match || !match.hasWork) continue
        const k = `${dk}::${match.templateGuid}`
        if (!counts.has(k)) counts.set(k, { templateName: match.templateName, count: 0 })
        counts.get(k)!.count++
      }
    }

    // Un dayKey apparaît 1 fois par semaine → max possible = historyWeeks
    for (const [k, { templateName, count }] of counts.entries()) {
      const [dk, templateGuid] = k.split('::')
      const frequency = count / historyWeeks
      if (frequency >= STRONG_HABIT_THRESHOLD) {
        habits.push({
          userGuid:     emp.guid,
          dayKey:       dk as DayKey,
          templateGuid,
          templateName,
          frequency,
        })
      }
    }
  }

  return habits
}

// ── Étape 3 : Score de rotation ──────────────────────────────────────────────
// Pour un employé sur un (dayKey, templateGuid), calculer quand il a fait
// ce créneau pour la dernière fois. Plus c'est loin, plus le score est élevé.

function computeRotationScore(
  assignments:  HistoricalAssignment[],
  userGuid:     string,
  templateGuid: string,
  dayKey:       DayKey,
  periodFrom:   string,
  historyWeeks: number,
): number {
  let lastOccurrence = -1   // semaines depuis la dernière occurrence, -1 = jamais

  for (let w = 0; w < historyWeeks; w++) {
    const weekStart = addDays(periodFrom, -(w + 1) * 7)
    const weekDates = periodDates(weekStart, addDays(weekStart, 6))

    for (const iso of weekDates) {
      if (isoToDayKey(iso) !== dayKey) continue
      const match = getTemplateOnDate(assignments, userGuid, iso)
      if (match?.templateGuid === templateGuid && match.hasWork) {
        if (lastOccurrence === -1) lastOccurrence = w + 1
        break
      }
    }
    if (lastOccurrence !== -1) break
  }

  // Jamais fait → score max (1.0), fait il y a 1 semaine → score bas (1/N)
  if (lastOccurrence === -1) return 1.0
  return lastOccurrence / historyWeeks
}

// ── Moteur principal ──────────────────────────────────────────────────────────

export function generateSuggestion(
  employees:    TargetEmployee[],
  assignments:  HistoricalAssignment[],
  periodFrom:   string,
  periodTo:     string,
  historyWeeks: number = HISTORY_WEEKS,
): EngineResult {

  // Pré-calculs
  const coverage   = computeHistoricalCoverage(assignments, employees, periodFrom, historyWeeks)
  const habits     = detectStrongHabits(assignments, employees, periodFrom, historyWeeks)

  // Résultats par employé — initialisés à repos partout
  const schedules  = new Map<string, Record<string, string | null>>()
  const reasons    = new Map<string, Record<string, DayReason | null>>()

  for (const emp of employees) {
    schedules.set(emp.guid, {})
    reasons.set(emp.guid, {})
  }

  const dates = periodDates(periodFrom, periodTo)

  // Tracker des assignations déjà faites pour chaque date
  // (un employé ne peut être affecté qu'à un seul template par jour)
  const assignedOnDate = new Map<string, Set<string>>()  // iso → Set<userGuid>
  for (const iso of dates) assignedOnDate.set(iso, new Set())

  // ── Passe 1 : placer les habitudes fortes ─────────────────────────────────
  for (const iso of dates) {
    const dk = isoToDayKey(iso)

    for (const emp of employees) {
      const habit = habits.find(h => h.userGuid === emp.guid && h.dayKey === dk)
      if (!habit) continue

      // Vérifier que ce slot existe dans la couverture historique
      const slots = coverage.get(dk) ?? []
      const slot  = slots.find(s => s.templateGuid === habit.templateGuid)
      if (!slot) continue

      // Placer l'employé sur son habitude forte
      schedules.get(emp.guid)![iso] = habit.templateGuid
      reasons.get(emp.guid)![iso]   = {
        templateGuid: habit.templateGuid,
        templateName: habit.templateName,
        confidence:   Math.round(habit.frequency * 100),
        factors:      [
          `Habitude forte : ${Math.round(habit.frequency * historyWeeks)}/${historyWeeks} semaines`,
          'Priorité maximale — position conservée',
        ],
      }
      assignedOnDate.get(iso)!.add(emp.guid)
    }
  }

  // ── Passe 2 : remplir les créneaux par rotation équitable ────────────────
  for (const iso of dates) {
    const dk    = isoToDayKey(iso)
    const slots = coverage.get(dk) ?? []

    for (const slot of slots) {
      // Compter combien d'employés sont déjà sur ce slot (via habitudes fortes)
      const alreadyOnSlot = employees.filter(
        emp => schedules.get(emp.guid)?.[iso] === slot.templateGuid
      ).length

      const needed = slot.targetCount - alreadyOnSlot
      if (needed <= 0) continue

      // Employés disponibles : non encore assignés ce jour
      const available = employees.filter(emp => !assignedOnDate.get(iso)!.has(emp.guid))
      if (available.length === 0) continue

      // Classer par score de rotation décroissant
      const ranked = available
        .map(emp => ({
          emp,
          score: computeRotationScore(assignments, emp.guid, slot.templateGuid, dk, periodFrom, historyWeeks),
        }))
        .sort((a, b) => b.score - a.score)

      // Sélectionner les N premiers
      const toAssign = ranked.slice(0, needed)

      for (const { emp, score } of toAssign) {
        schedules.get(emp.guid)![iso] = slot.templateGuid
        reasons.get(emp.guid)![iso]   = {
          templateGuid: slot.templateGuid,
          templateName: slot.templateName,
          confidence:   Math.round(score * 100),
          factors: [
            `Couverture cible : ${slot.targetCount} personne(s) sur ce créneau`,
            score === 1.0
              ? 'Jamais effectué ce créneau récemment — priorité rotation maximale'
              : `Dernier passage il y a ~${Math.round(score * historyWeeks)} semaine(s)`,
          ],
        }
        assignedOnDate.get(iso)!.add(emp.guid)
      }
    }
  }

  // ── Passe 3 : marquer repos les employés non assignés ─────────────────────
  for (const iso of dates) {
    for (const emp of employees) {
      if (schedules.get(emp.guid)![iso] === undefined) {
        schedules.get(emp.guid)![iso] = null
        reasons.get(emp.guid)![iso]   = {
          templateGuid: null,
          templateName: 'Repos',
          confidence:   60,
          factors:      ['Couverture cible atteinte — repos proposé ce jour'],
        }
      }
    }
  }

  // ── Score de conformité global ────────────────────────────────────────────
  // = % de jours où l'employé est sur son créneau habituel (ou repos habituel)
  let total = 0; let matches = 0

  for (const iso of dates) {
    const dk = isoToDayKey(iso)
    for (const emp of employees) {
      total++
      const proposed = schedules.get(emp.guid)?.[iso] ?? null

      // Chercher ce que l'employé faisait habituellement ce dayKey
      const lastMatch = getTemplateOnDate(
        assignments.filter(a => {
          // Trouver un assignment qui correspond à ce dayKey dans l'historique
          const refDate = addDays(periodFrom, -7)
          return covers(refDate, a.startDate, a.endDate) && a.userGuid === emp.guid
        }),
        emp.guid,
        addDays(periodFrom, -7 + (DAY_KEYS.indexOf(dk) + 1)),
      )

      const expectedGuid = lastMatch?.hasWork ? lastMatch.templateGuid : null
      if (proposed === expectedGuid) matches++
    }
  }

  const conformityScore = total > 0 ? Math.round((matches / total) * 100) : 0

  // ── Assembler les résultats ────────────────────────────────────────────────
  const items: EmployeeSuggestionResult[] = employees.map(emp => ({
    userGuid: emp.guid,
    schedule: schedules.get(emp.guid) ?? {},
    reasons:  reasons.get(emp.guid)  ?? {},
  }))

  return { items, conformityScore }
}

// // ─────────────────────────────────────────────────────────────────────────────
// // suggestion.engine.ts
// //
// // Moteur de génération de suggestion de planning.
// // Pur TypeScript — aucune dépendance Express ou Sequelize.
// // Entrée  : historique des assignments + liste des employés cibles
// // Sortie  : SuggestionResult par employé (schedule + reasons)
// // ─────────────────────────────────────────────────────────────────────────────
//
// export const HISTORY_WEEKS = 8;
// export const WEIGHT_HABIT = 0.7;
// export const WEIGHT_EQUITY = 0.3;
//
// const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
// type DayKey = (typeof DAY_KEYS)[number];
//
// // ── Types internes ────────────────────────────────────────────────────────────
//
// export interface HistoricalAssignment {
//   userGuid: string;
//   startDate: string; // YYYY-MM-DD
//   endDate: string; // YYYY-MM-DD (2099-12-31 si ouvert)
//   templateGuid: string;
//   templateName: string;
//   definition: Record<string, any>; // { Mon: [...], Tue: null, Wed: [], ... }
// }
//
// export interface TargetEmployee {
//   guid: string;
//   name: string;
//   code: string;
// }
//
// export interface DayReason {
//   templateName: string;
//   templateGuid: string | null;
//   confidence: number; // 0–100
//   factors: string[];
// }
//
// export interface EmployeeSuggestionResult {
//   userGuid: string;
//   schedule: Record<string, string | null>; // { Mon: templateGuid|null, ... }
//   reasons: Record<string, DayReason | null>; // { Mon: DayReason|null, ... }
// }
//
// export interface EngineResult {
//   items: EmployeeSuggestionResult[];
//   conformityScore: number; // 0–100 moyenne des confidences
// }
//
// // ── Helpers date ──────────────────────────────────────────────────────────────
//
// function addDays(dateStr: string, n: number): string {
//   const d = new Date(dateStr + 'T00:00:00');
//   d.setDate(d.getDate() + n);
//   return d.toISOString().split('T')[0];
// }
//
// function diffDays(a: string, b: string): number {
//   return Math.round(
//     (new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000,
//   );
// }
//
// /** Retourne le dayKey (Mon, Tue, ...) pour une date ISO */
// function isoToDayKey(iso: string): DayKey {
//   const jsDay = new Date(iso + 'T00:00:00').getDay(); // 0=Sun … 6=Sat
//   const map: DayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//   return map[jsDay];
// }
//
// /** Liste toutes les dates ISO entre from et to inclus */
// function periodDates(from: string, to: string): string[] {
//   const dates: string[] = [];
//   let cur = from;
//   while (cur <= to) {
//     dates.push(cur);
//     cur = addDays(cur, 1);
//   }
//   return dates;
// }
//
// /**
//  * Retourne le templateGuid actif pour un employé à une date donnée
//  * dans l'historique, ou null si repos.
//  */
// function getTemplateOnDate(
//   assignments: HistoricalAssignment[],
//   userGuid: string,
//   iso: string,
// ): { templateGuid: string; templateName: string; hasWork: boolean } | null {
//   const userAssignments = assignments.filter((a) => a.userGuid === userGuid);
//
//   for (const a of userAssignments) {
//     if (iso >= a.startDate && iso <= a.endDate) {
//       const dayKey = isoToDayKey(iso);
//       const blocks = a.definition[dayKey];
//       // null = férié, [] = repos, [...] = travail
//       const hasWork = blocks !== null && Array.isArray(blocks) && blocks.length > 0;
//       return {
//         templateGuid: a.templateGuid,
//         templateName: a.templateName,
//         hasWork,
//       };
//     }
//   }
//   return null;
// }
//
// // ── Scoring par fréquence ─────────────────────────────────────────────────────
//
// interface FrequencyMap {
//   // templateGuid → { count, templateName }
//   [templateGuid: string]: { count: number; templateName: string };
// }
//
// /**
//  * Pour un employé et un dayKey donné, compte la fréquence de chaque template
//  * sur les N semaines d'historique précédant periodFrom.
//  */
// function buildFrequencyMap(
//   assignments: HistoricalAssignment[],
//   userGuid: string,
//   dayKey: DayKey,
//   periodFrom: string,
//   historyWeeks: number,
// ): { freqMap: FrequencyMap; restCount: number; totalObs: number } {
//   const historyFrom = addDays(periodFrom, -historyWeeks * 7);
//   const historyTo = addDays(periodFrom, -1);
//
//   const freqMap: FrequencyMap = {};
//   let restCount = 0;
//   let totalObs = 0;
//
//   // Parcourir chaque semaine de l'historique, trouver le jour correspondant au dayKey
//   let cur = historyFrom;
//   while (cur <= historyTo) {
//     if (isoToDayKey(cur) === dayKey) {
//       totalObs++;
//       const match = getTemplateOnDate(assignments, userGuid, cur);
//       if (!match || !match.hasWork) {
//         restCount++;
//       } else {
//         if (!freqMap[match.templateGuid]) {
//           freqMap[match.templateGuid] = { count: 0, templateName: match.templateName };
//         }
//         freqMap[match.templateGuid].count++;
//       }
//     }
//     cur = addDays(cur, 1);
//   }
//
//   return { freqMap, restCount, totalObs };
// }
//
// // ── Score équité ──────────────────────────────────────────────────────────────
//
// /**
//  * Compte combien de fois un template a déjà été proposé pour cet employé
//  * dans la suggestion courante (pour pénaliser les répétitions excessives).
//  */
// function countTemplateInSuggestion(
//   schedule: Record<string, string | null>,
//   templateGuid: string,
// ): number {
//   return Object.values(schedule).filter((g) => g === templateGuid).length;
// }
//
// // ── Moteur principal ──────────────────────────────────────────────────────────
//
// export function generateSuggestion(
//   employees: TargetEmployee[],
//   assignments: HistoricalAssignment[],
//   periodFrom: string,
//   periodTo: string,
//   historyWeeks: number = HISTORY_WEEKS,
// ): EngineResult {
//   const allConfidences: number[] = [];
//   const items: EmployeeSuggestionResult[] = [];
//
//   for (const emp of employees) {
//     const schedule: Record<string, string | null> = {};
//     const reasons: Record<string, DayReason | null> = {};
//
//     const dates = periodDates(periodFrom, periodTo);
//
//     for (const iso of dates) {
//       const dayKey = isoToDayKey(iso);
//
//       const { freqMap, restCount, totalObs } = buildFrequencyMap(
//         assignments,
//         emp.guid,
//         dayKey,
//         periodFrom,
//         historyWeeks,
//       );
//
//       // Cas : aucun historique pour cet employé ce jour
//       if (totalObs === 0) {
//         schedule[iso] = null;
//         reasons[iso] = {
//           templateGuid: null,
//           templateName: 'Repos',
//           confidence: 0,
//           factors: ['Aucun historique disponible pour ce jour'],
//         };
//         allConfidences.push(0);
//         continue;
//       }
//
//       // Trouver le template le plus fréquent (score habitude)
//       let bestGuid: string | null = null;
//       let bestName: string = 'Repos';
//       let bestHabitScore: number = restCount / totalObs; // score repos par défaut
//       let bestIsRest: boolean = true;
//
//       for (const [tGuid, { count, templateName }] of Object.entries(freqMap)) {
//         const habitScore = count / totalObs;
//         if (habitScore > bestHabitScore) {
//           bestHabitScore = habitScore;
//           bestGuid = tGuid;
//           bestName = templateName;
//           bestIsRest = false;
//         }
//       }
//
//       // Score équité : pénaliser si déjà trop présent dans la suggestion courante
//       let equityScore = 1.0;
//       if (bestGuid) {
//         const alreadyCount = countTemplateInSuggestion(schedule, bestGuid);
//         const totalDays = diffDays(periodFrom, periodTo) + 1;
//         // Pénalité progressive si le template dépasse 60% des jours suggérés
//         const ratio = alreadyCount / Math.max(totalDays, 1);
//         if (ratio > 0.6) equityScore = Math.max(0, 1 - (ratio - 0.6) * 2.5);
//       }
//
//       // Score final
//       const finalScore = WEIGHT_HABIT * bestHabitScore + WEIGHT_EQUITY * equityScore;
//       const confidence = Math.round(finalScore * 100);
//
//       // Facteurs explicatifs
//       const factors: string[] = [];
//       if (totalObs > 0) {
//         const freq = bestIsRest ? restCount : (freqMap[bestGuid!]?.count ?? 0);
//         factors.push(`Historique : ${freq}/${totalObs} occurrences sur ${historyWeeks} semaines`);
//       }
//       if (equityScore < 1) {
//         factors.push('Légère pénalité équité (template déjà fréquent sur la période)');
//       }
//       if (bestIsRest) {
//         factors.push("Repos proposé (majoritaire dans l'historique)");
//       }
//
//       schedule[iso] = bestGuid;
//       reasons[iso] = {
//         templateGuid: bestGuid,
//         templateName: bestName,
//         confidence,
//         factors,
//       };
//       allConfidences.push(confidence);
//     }
//
//     items.push({ userGuid: emp.guid, schedule, reasons });
//   }
//
//   // Conformité globale = moyenne des confidences non nulles
//   const nonZero = allConfidences.filter((c) => c > 0);
//   const conformityScore =
//     nonZero.length > 0 ? Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length) : 0;
//
//   return { items, conformityScore };
// }
