# TOKE — Repos obligatoire de l’alternance fixe

Pour le seul binôme configuré, le contrat solveur v2 impose le repos samedi ou dimanche et le travail les six autres jours d’une semaine complète. La semaine de l’ancre, la première personne se repose le samedi et la seconde le dimanche. Le choix s’inverse chaque lundi. Une fenêtre partielle impose uniquement les dates qu’elle contient. L’alternance des horaires reste une préférence.

Une décision manuelle compatible est conservée. Si un verrou, un modèle, une règle de repos ou la couverture rend le calcul impossible, le solveur conserve ses contraintes et renvoie un diagnostic. Le code `FIXED_ALTERNATION_WEEKEND_REST_CONFLICT` indique les dates et collaborateurs impliqués lorsque le solveur relie le conflit à la règle d’alternance. Par exemple, inverser le repos du samedi au dimanche peut entraîner sept jours travaillés consécutifs entre deux semaines. Si un plafond applicable de six jours les interdit, ce planning est impossible.

L’API exige la capacité v2 pour cette option et bloque si le moteur est incompatible ou omet son évaluation. `KEEP_PROFILE` conserve le protocole v1. Le worker annonce les deux capacités, ce qui permet de livrer le worker avant l’API puis le frontend. Aucune migration.

## Fichiers modifiés

- `packages/planning-ortools/app/solver.py`, `schemas.py`, `main.py`
- `packages/planning-ortools/tests/test_fixed_alternation.py`
- `packages/api/src/utils/planning.fixed.alternation.ts`, `schedule.suggestion.generation.service.ts`
- `packages/api/src/utils/solver/planning.solver.ts`, `ortools.planning.solver.ts`
- `packages/api/verification/planning-fixed-alternation-http.test.mjs`
- `packages/cloud/src/views/planning/suggestion/configuration/PlanningConfigForm.vue`
- `audits/2026-11-20/TOKE_REPOS_ALTERNANCE_FIXED.md`

## Résultat des quatre semaines indépendantes

| Semaine du | Aïcha | Camille |
|---|---|---|
| 28/12/2026 | Sam. 02/01 | Dim. 03/01 |
| 04/01/2027 | Dim. 10/01 | Sam. 09/01 |
| 11/01/2027 | Sam. 16/01 | Dim. 17/01 |
| 18/01/2027 | Dim. 24/01 | Sam. 23/01 |

## Vérifications

- CP-SAT : 15 tests réussis, dont la comparaison du troisième profil fixe avec le résultat historique, le passage d’année, deux semaines partielles, les conflits de couverture, de modèle et de verrou, ainsi qu’un plafond de travail consécutif applicable.
- HTTP/PostgreSQL : 2 tests réussis. Le calcul partagé avec la régénération a été appelé avec des verrous compatibles et incompatibles. Les tests couvrent aussi les fenêtres chevauchantes, une ancienne capacité et une réponse sans évaluation. La route de régénération et ses écritures n’ont pas été exécutées de bout en bout.
- Contrôles TypeScript API et frontend réussis. Contrôle des espaces Git réussi.
