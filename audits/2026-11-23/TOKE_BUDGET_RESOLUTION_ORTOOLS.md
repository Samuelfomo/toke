# TOKE — Budget de résolution OR-Tools

Six résolutions CP-SAT sur deux fixtures v3 identiques entre budgets, chacune sur 14 jours. Le scénario dense compte 13 collaborateurs et 12 besoins récurrents. Le scénario léger couvre un binôme fixe, un autre fixe et un tournant. Chaque cas a été exécuté une fois par budget avec huit workers. Les temps totaux ci-dessous couvrent le worker, construction et restitution incluses.

| Cas | Budget | Temps total | Statut | Couverture | Objectif / borne (minimisation) |
|---|---:|---:|---|---|---:|
| Dense | 8 s | 8,064 s | FEASIBLE | 66/66, 100 % | 520 / 70 |
| Dense | 12 s | 12,109 s | FEASIBLE | 66/66, 100 % | 520 / 70 |
| Dense | 19 s | 19,071 s | FEASIBLE | 66/66, 100 % | 520 / 70 |
| Léger | 8 s | 0,020 s | OPTIMAL | 4/4, 100 % | 0 / 0 |
| Léger | 12 s | 0,015 s | OPTIMAL | 4/4, 100 % | 0 / 0 |
| Léger | 19 s | 0,016 s | OPTIMAL | 4/4, 100 % | 0 / 0 |

## Décision

8 s est le candidat pour un essai au Plateau. Il économise environ 11 s sur une fenêtre comparable au cas dense, à couverture et objectif égaux sur ces fixtures. La qualité sous 8 s sur les données réelles reste à vérifier. Le défaut reste 19 s.

La variable d’environnement API `PLANNING_ORTOOLS_SEARCH_SECONDS` règle le plafond CP-SAT par fenêtre. Le client ajoute une seconde pour respecter la marge du contrat worker existant. Le réglage est commun aux générations OR-Tools servies par le processus API. Il ne modifie ni les contraintes, ni les workers, ni le délai de transport.

Un résultat `FEASIBLE` reste accepté. Un statut CP-SAT `UNKNOWN` renvoie `PLANNING_SOLVER_NO_FEASIBLE_SOLUTION` avec la fenêtre et le budget. La génération s’arrête sans repli GREEDY et ne persiste aucune suggestion. Le traitement d’`INFEASIBLE` conserve son diagnostic.

## Fichiers et vérifications

- `packages/api/src/utils/solver/ortools.planning.solver.ts`, `planning.solver.ts` et `planning.solver.factory.ts`.
- `packages/api/verification/planning-fixed-alternation-http.test.mjs`.
- Test HTTP ciblé avec réponse simulée réussi. Il couvre l’absence de réglage, le transport des budgets de 8 et 12 s, l’acceptation de `FEASIBLE`, le refus d’un réglage invalide et le traitement de `UNKNOWN`.

Aucune modification de la configuration du Plateau ni aucun déploiement.
