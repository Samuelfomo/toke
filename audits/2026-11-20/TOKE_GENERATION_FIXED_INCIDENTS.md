# TOKE — Incidents de génération FIXED

## Diagnostic

- A. Sur PostgreSQL, la création d’un deuxième brouillon pour le même responsable et la même période déclenche l’index `unique_manager_draft_suggestion_period`. Sequelize renvoie exactement `Validation error`. Le test reproduit ce mécanisme. Les journaux de la requête de production manquent pour confirmer qu’il s’agit de cette collision.
- B. L’API transmet la politique lorsque `/health` annonce la version 1. Une réponse de calcul réussie sans `fixedAlternationEvaluation` déclenchait l’erreur signalée. Un proxy local reproduit cette absence. Le serveur OR-Tools du dépôt renvoie l’évaluation attendue. La réponse brute de production reste nécessaire pour identifier où ce champ a disparu.

## Corrections

L’exclusion ponctuelle retire la personne du calcul. Une paire incomplète produit `NOT_APPLICABLE` avec le motif et les GUID manquants. Le profil fixe restant et la politique enregistrée sont conservés.

En cas d’évaluation manquante malgré la capacité annoncée, l’API relance une fois l’ensemble du calcul OR-Tools sans extension, avec prévalidation et verrouillages. Le diagnostic indique `PENDING_SOLVER_SUPPORT`, `SOLVER_ACK_MISSING` et `applied: false`. Une évaluation présente mais invalide reste une erreur de protocole. Une prise en charge effective exige une évaluation conforme.

Les écritures de l’en-tête et des lignes partagent une transaction. Un brouillon en double renvoie `SUGGESTION_DRAFT_ALREADY_EXISTS` (409). Les autres validations Sequelize remontent l’étape et les noms des champs.

## Fichiers

Sous `packages/api/src/` :

- `utils/schedule.suggestion.generation.service.ts`, `utils/planning.fixed.alternation.ts`, `utils/planning.preflight.validation.service.ts`, `utils/suggestion.engine.ts`
- `utils/solver/ortools.planning.solver.ts`, `utils/solver/planning.solver.ts`, `utils/solver/planning.solver.factory.ts`
- `tenant/class/ScheduleSuggestion.ts`, `tenant/class/ScheduleSuggestionItem.ts`, `tenant/model/ScheduleSuggestionModel.ts`, `tenant/model/ScheduleSuggestionItemModel.ts`
- `utils/test/planning.fixed.alternation.test.ts`, `utils/test/planning.preflight.validation.service.test.ts`

Sous `packages/api/verification/` : `planning-fixed-alternation-http.test.mjs`, `planning-suggestion-persistence.fixture.cjs`.

## Vérifications

- TypeScript API conforme. Contrôles Node ciblés, 14/14. Résolutions Python existantes, 12/12.
- Deux tests d’intégration passent avec Uvicorn/CP-SAT et PostgreSQL temporaires. Ils couvrent la paire complète, chaque exclusion, les deux exclusions, les requêtes historiques, les fenêtres, un repos manuel verrouillé, l’absence ou l’invalidité de l’évaluation, la persistance JSONB et le retour arrière transactionnel. Le verrou manuel est testé dans le calcul partagé, avec des données d’entrée de test.

## Mise en production et retour arrière

Après autorisation, construire une version isolée avec les scripts du dépôt depuis sa racine :

```sh
npm run build --workspace=@toke/shared
npm run build --workspace=@toke/api
npm run autoReload:tenant
```

Conserver l’artefact API précédent. Vérifier sur l’URL OR-Tools réellement configurée la cohérence entre la capacité de `/health` et l’évaluation de `/solve`, puis contrôler les diagnostics d’une génération avec et sans exclusion sur un environnement de vérification. Une répétition de `PLANNING_FIXED_ALTERNATION_ACK_MISSING` indique que l’alternance reste indisponible sur le trajet HTTP concerné. Pour revenir en arrière, restaurer l’artefact précédent et relancer `npm run autoReload:tenant`. Aucune migration.
