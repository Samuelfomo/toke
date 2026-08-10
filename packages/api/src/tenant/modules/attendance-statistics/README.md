# Attendance Statistics — lots 1 à 4

Ce dossier contient le nouveau noyau de statistiques de pointage du tenant.

## Flux

```text
HTTP query
  → validation stricte de période
  → service d’orchestration
  → adaptateur tenant
  → planning + activités agrégées
  → AttendanceDay
  → AttendanceOverview
  → réponse API
```

## Invariants

- Une cellule de la matrice correspond à un seul `employé × journée métier`.
- `ABSENT` est impossible sans planning de travail valide et journée terminée.
- `PENDING`, `REST_DAY` et `UNDETERMINED` sont exclus du taux.
- Une présence un jour de repos reste `REST_DAY` et génère une issue.
- Une présence sans planning reste `UNDETERMINED` et génère une issue.
- Une durée inconnue reste `null` dans le détail.
- Le périmètre organisationnel est l’équipe actuelle du manager, sans sous-équipe ajoutée implicitement.
- Le contrôleur ne réalise aucun calcul métier.

## Endpoint

Après montage du routeur :

```http
GET /attendance/statistics/overview
```

## Vérification

```bash
npm run test:core
```

La recette finale doit être exécutée sur les données réelles du tenant avant migration du frontend ou du PDF.
