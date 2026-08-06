# Lots 1 à 3 — Modèle journalier, overview et construction tenant

Ce paquet cumulatif introduit la source de vérité `AttendanceDay` pour un
couple distinct `employé × journée métier`, son agrégation `overview` et les
adaptateurs nécessaires pour construire ces journées depuis le projet tenant.

## Responsabilités

- `attendance-day.types.ts` définit le contrat métier intermédiaire.
- `attendance-day.ts` classe une journée sans accès à Sequelize, sans `Date` et
  sans conversion de fuseau.
- `attendance-day.test.ts` verrouille les règles validées avant la création de
  l'endpoint `GET /attendance/statistics/overview`.
- `attendance-overview.types.ts` définit le DTO HTTP exact de l'overview.
- `attendance-overview.ts` agrège exclusivement des objets `AttendanceDay`.
- `attendance-overview.test.ts` protège les formules, dénominateurs, valeurs
  nulles, couvertures de données et invariants d'unicité.
- `business-calendar.ts` traite les dates civiles, les journées en cours et les
  gardes qui se terminent le lendemain.
- `attendance-activity.ts` regroupe toutes les sessions d'un employé pour une
  même date de début métier et contrôle les pauses et durées.
- `attendance-day.service.ts` produit exactement une journée par
  `employé × date`, y compris lorsqu'aucun pointage n'existe.
- `legacy-attendance-session.repository.ts` adapte `WorkSessions` et
  `TimeEntries` au contrat métier.
- `legacy-attendance-schedule.repository.ts` résout uniquement les plannings
  que les données actuelles permettent de prouver.
- les fichiers `toke-*.datasource.ts` raccordent les repositories aux classes
  existantes dans `src/tenant/class`.
- `docs/attendance-overview.contract.md` documente l'interprétation métier du
  contrat.

## Limite volontaire du lot 3

Le projet conserve un offset de rotation mutable et des snapshots modifiables.
Sans leurs journaux, leur état passé n'est pas reconstructible avec certitude.
Le repository retourne alors `HISTORICAL_SCHEDULE_UNAVAILABLE`; il ne produit
jamais un faux `REST_DAY` ou un faux `ABSENT`.

Les fichiers critiques pour compléter ensuite l'historique sont :

- `RotationAssignmentLog.ts` et son modèle/structure DB ;
- `RotationGroupTemplateLog.ts` et son modèle/structure DB ;
- `ScheduleAssignmentsLog.ts` et son modèle/structure DB.

L'appartenance historique aux groupes reste également limitée : le JSON actuel
contient `joined_at` et `active`, mais aucune date de sortie. Cette limite est
donc traitée comme donnée non prouvée lorsqu'elle affecte le résultat.

Ce lot ne crée encore ni contrôleur ni route HTTP. La route existante
`src/tenant/routes/attendance.stat.route.ts` reste inchangée.

## Vérification locale

```bash
npx --yes tsx --test domain/*.test.ts application/*.test.ts infrastructure/legacy/*.test.ts
npx --yes -p typescript -p @types/node tsc -p tsconfig.json
```

## Invariants importants

- `ABSENT` n'existe que pour une journée de travail valide et terminée.
- `PENDING`, `REST_DAY` et `UNDETERMINED` n'entrent jamais dans le taux.
- Une présence sur repos garde le statut `REST_DAY` et ajoute
  `PRESENCE_ON_REST_DAY`.
- Une présence sans planning garde le statut `UNDETERMINED` et ajoute
  `PRESENCE_WITHOUT_SCHEDULE`.
- `rateEligible` est faux pendant une journée encore en cours, même si une
  présence est déjà visible.
- `netMinutes` n'est calculé que si les durées brute et de pause sont connues.
- Une garde appartient à la date métier de sa première entrée.
- Une session `CLOSED` sans fin est incomplète, pas ouverte.
- Aucun site n'intervient dans la résolution d'une présence attendue.
