# Contrat — `GET /attendance/statistics/overview`

## Intention métier

Répondre à la question : **quelle est la situation globale de présence de
l'équipe sur la période ?**

Cet endpoint ne retourne ni les sessions détaillées, ni les événements bruts,
ni une conformité par site. Le site du QR code appartient à l'activité
enregistrée et ne permet pas de définir une population attendue sur ce site.

## Réponse HTTP

Le contrôleur conserve l'enveloppe commune de l'API :

```json
{
  "success": true,
  "message": "Attendance statistics overview retrieved successfully",
  "data": {}
}
```

La propriété `data` respecte l'interface `AttendanceStatisticsOverview`.

## Définitions des taux

```text
employee_working_days_expected
= present_employee_days + late_employee_days + absent_employee_days

attendance_rate
= (present_employee_days + late_employee_days)
  / employee_working_days_expected × 100

absence_rate
= absent_employee_days / employee_working_days_expected × 100

punctuality_rate
= present_employee_days
  / (present_employee_days + late_employee_days) × 100
```

Règles :

- seuls les jours de travail valides et terminés entrent dans les deux premiers
  dénominateurs ;
- `PENDING`, `REST_DAY` et `UNDETERMINED` sont exclus ;
- les présences encore en cours de journée restent visibles dans
  `recorded_activity`, mais n'entrent pas encore dans les taux ;
- un dénominateur nul produit `null`, jamais `0` ;
- les pourcentages sont arrondis à deux décimales ;
- la moyenne du retard porte uniquement sur les journées classées `LATE` et
  vaut `null` lorsqu'aucun retard n'existe.

## Interprétation du statut de présence

| Statut | Signification |
|---|---|
| `COMPUTABLE` | Le dénominateur existe et tous les plannings évalués sont résolus. |
| `PARTIAL` | Le dénominateur existe, mais certaines journées ont un planning non résolu. |
| `NOT_COMPUTABLE` | Aucun jour de travail attendu et finalisé ne fournit de dénominateur. |

`unavailability_reason` explique toujours un statut `NOT_COMPUTABLE`.

Un taux `PARTIAL` reste mathématiquement calculé sur les seules journées
résolues et finalisées. Il ne doit pas être présenté comme représentatif de
toute la population sans afficher la couverture des plannings.

## Qualité de résolution du planning

Les journées non résolues sont exclues des taux et réparties par cause :

| Cause | Signification | Action manager |
|---|---|---|
| `MISSING_SCHEDULE` | Aucune affectation exploitable n'est trouvée. | Affecter ou vérifier le planning. |
| `INVALID_SCHEDULE` | Le snapshot est vide, mal formé ou incohérent. | Corriger le template ou l'affectation. |
| `HISTORICAL_SCHEDULE_UNAVAILABLE` | L'état applicable à cette date ne peut pas être prouvé avec les données courantes. | Consulter/restaurer l'historique des affectations. |
| `AMBIGUOUS_SCHEDULE` | Deux affectations ont la même priorité. | Corriger le conflit d'affectations. |

`resolved_employee_days + unresolved_employee_days` doit toujours être égal à
`employee_days_evaluated`.

## Durées

Les champs `known_*_minutes` additionnent uniquement les journées actives dont
les sessions sont finalisées et dont les durées brute et de pause sont connues.

- avec une couverture `COMPLETE`, ils représentent toute l'activité ;
- avec une couverture `PARTIAL`, ils représentent seulement la partie connue ;
- avec une couverture `UNAVAILABLE`, ils valent `null` ;
- sans activité, ils valent `0` et la couverture est `NOT_APPLICABLE`.

Cette convention empêche une somme partielle d'être présentée comme le total
réel de la période.

## Invariants exigés du service appelant

1. Fournir exactement un objet `AttendanceDay` par couple `employé × date`.
2. Inclure les journées sans pointage, sinon les absences seraient invisibles.
3. Résoudre le planning applicable à la date analysée.
4. Regrouper toutes les sessions quotidiennes avant l'agrégation.
5. Ne jamais filtrer l'overview par site en l'absence d'affectation employé-site.
