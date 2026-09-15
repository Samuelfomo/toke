# Contrat métier — `GET /attendance/statistics/overview`

## Principe

La réponse est fondée sur une matrice exhaustive :

```text
membres actuels de l’équipe × dates de la période
```

Chaque cellule est classée une seule fois par `createAttendanceDay`.

## Statuts journaliers

| Statut | Définition | Entre dans le taux ? |
|---|---|---:|
| `PRESENT` | Présence sur journée travaillée, arrivée dans la tolérance | Oui, seulement si la journée attendue est terminée |
| `LATE` | Présence sur journée travaillée, arrivée au-delà de la tolérance | Oui, seulement si la journée attendue est terminée |
| `ABSENT` | Aucune activité sur journée travaillée valide et terminée | Oui |
| `PENDING` | Journée travaillée encore en cours, sans activité finalisée | Non |
| `REST_DAY` | Aucun travail attendu | Non |
| `UNDETERMINED` | Planning manquant ou invalide | Non |

## Issues

| Issue | Signification | Action recommandée |
|---|---|---|
| `PRESENCE_ON_REST_DAY` | Activité enregistrée un jour de repos | Vérifier planning, heures supplémentaires ou erreur de pointage |
| `PRESENCE_WITHOUT_SCHEDULE` | Activité enregistrée sans planning exploitable | Corriger le planning avant toute comparaison de performance |
| `MISSING_SCHEDULE` | Aucun planning résolu | Corriger les assignations ou le planning par défaut |
| `INVALID_SCHEDULE` | Planning résolu mais blocs invalides | Corriger la structure du template |
| `OPEN_SESSION` | Une session est encore ouverte | Fermer ou corriger la session |
| `INCOMPLETE_SESSION` | Session non ouverte mais sans sortie complète | Corriger les données de session |
| `MISSING_DURATION` | Activité finalisée sans durée exploitable | Réparer la durée ; ne pas interpréter comme 0 minute |

## Formules

### Jours de travail attendus éligibles

```text
employeeWorkingDaysExpected = PRESENT éligibles + LATE éligibles + ABSENT
```

Les journées courantes non terminées, les repos et les plannings indéterminés sont exclus.

### Taux de présence

```text
attendanceRate = (PRESENT éligibles + LATE éligibles)
                 / employeeWorkingDaysExpected × 100
```

Valeur `null` si le dénominateur vaut zéro.

### Ponctualité

```text
punctualityRate = PRESENT éligibles
                  / (PRESENT éligibles + LATE éligibles) × 100
```

Valeur `null` si aucune présence éligible n’existe.

### Taux d’absence

```text
absenceRate = ABSENT éligibles
              / employeeWorkingDaysExpected × 100
```

Le dénominateur est identique à celui du taux de présence. Ainsi, lorsque toutes les journées éligibles sont classées PRESENT, LATE ou ABSENT : `attendanceRate + absenceRate = 100`.

### Taux de retard

```text
lateRate = LATE éligibles
           / (PRESENT éligibles + LATE éligibles) × 100
```

Le dénominateur est identique à celui de la ponctualité. Ainsi, lorsqu’une présence éligible est classée PRESENT ou LATE : `punctualityRate + lateRate = 100`.

### Taux de journées à examiner

```text
employeeDaysAnalyzed   = nombre total de journées-employé analysées
employeeDaysWithIssues = nombre de journées-employé avec au moins une issue
issueRate              = employeeDaysWithIssues / employeeDaysAnalyzed × 100
```

Une journée-employé ne compte qu’une seule fois au numérateur, même si plusieurs issues sont détectées le même jour. `issueCount` reste le volume total des issues et peut donc être supérieur à `employeeDaysWithIssues`.

### Durées

```text
grossMinutes = somme des durées brutes connues
pauseMinutes = somme des pauses connues
netMinutes   = somme des durées nettes connues
```

Une durée manquante n’est jamais remplacée par zéro dans le détail. Les compteurs de couverture précisent le nombre de journées dont les durées sont connues. Les durées décrivent toute activité enregistrée, y compris sur repos ou sans planning ; elles ne constituent donc pas à elles seules une mesure de conformité au planning.

## Structure de réponse

```ts
interface AttendanceOverview {
  generatedAt: string;
  period: {
    startDate: string;
    endDate: string;
    dayCount: number;
  };
  scope: {
    managerGuid: string;
    siteGuid: string | null;
    teamSize: number;
    employees: Array<{ guid: string; name: string }>;
  };
  summary: {
    statusTotals: Record<AttendanceStatus, number>;
    rates: AttendanceRateMetrics;
    durations: AttendanceDurationMetrics;
    issueCount: number;
  };
  daily: AttendanceDailyOverview[];
  employees: AttendanceEmployeeOverview[];
  issues: AttendanceIssueSummary[];
  dataQuality: AttendanceDataQuality;
}
```

Les occurrences détaillées d’une issue sont limitées aux 100 premières entrées ; le compteur `count` reste calculé sur l’ensemble de la période.

## Risques d’interprétation

1. Un taux élevé n’implique pas que les durées sont complètes.
2. Une présence sur repos n’améliore pas le taux de présence.
3. Un planning manquant ne doit pas devenir une absence.
4. Une journée en cours ne doit pas fausser le taux.
5. Le filtre site porte sur les sessions observées ; il ne modifie pas le planning attendu de l’employé.
6. La réponse décrit l’équipe actuelle, pas une reconstitution historique du périmètre d’équipe.
7. Les sessions traversant minuit sont rattachées à la journée de démarrage tant qu’aucune règle métier différente n’est validée.

8. Les taux d'absence et de retard portent sur des journées-éligibles ; le taux d'éléments à examiner porte sur les journées-employé analysées, et non sur les employés distincts.
