# TOKE — Service de 10 h 30 et binôme fixe

Le contrat OR-Tools v3 est activé par `fixed_alternation_policy.limited_service_template_guid`. Cette option désigne un des deux modèles fixes par son GUID. L’API de configuration et le solveur vérifient que le premier bloc commence à 10 h 30 pour ce GUID et à 8 h pour l’autre modèle. Les libellés des modèles ne déterminent pas leur rôle.

OR-Tools limite ce service à une personne par date et à une date par personne et par semaine civile pour les profils fixes et tournants. Les décisions verrouillées consomment le même quota. Le binôme conserve l’alternance des repos et travaille à 8 h pendant ses jours travaillés du week-end. La préférence de permutation quotidienne n’est plus utilisée. Les semaines du calcul commencent le lundi, les fenêtres partagent les dates déjà validées et la réponse reste limitée à la période demandée.

Une incompatibilité liée à la nouvelle règle produit `FIXED_ALTERNATION_LIMITED_SERVICE_CONFLICT` avec les règles et dates impliquées. Un moteur sans le contrat v3 ou un binôme incomplet bloque la génération sous cette configuration. Les configurations sans le nouveau champ conservent leur comportement historique.

## Fichiers

- `packages/api/src/tenant/routes/planning.suggestion.config.route.ts`
- `packages/api/src/utils/planning.fixed.alternation.ts`, `planning.horizon.ts`, `schedule.suggestion.generation.service.ts`
- `packages/api/src/utils/solver/planning.solver.ts`, `ortools.planning.solver.ts`
- `packages/planning-ortools/app/main.py`, `schemas.py`, `solver.py`
- `packages/planning-ortools/tests/test_fixed_alternation.py`
- `packages/api/verification/planning-fixed-alternation-http.test.mjs`

## Vérifications

- 17 tests CP-SAT réussis. Les fixtures couvrent quatre semaines, le passage de décembre à janvier, les profils fixes et tournants, les services tiers et les conflits de verrou quotidiens, hebdomadaires et du week-end.
- 2 tests d’intégration HTTP/OR-Tools et PostgreSQL réussis. La génération v3 est vérifiée sur quatre fenêtres avec projection de la période, phases de repos et décisions verrouillées.
- Contrôle TypeScript API et `git diff --check` réussis.

## Activation

Après déploiement autorisé du worker, de l’API puis du frontend, ouvrir **Alternance des horaires fixes → Service à limiter** dans la configuration du Plateau. Le formulaire réutilise les modèles chargés, propose uniquement le modèle du binôme qui commence à 10 h 30 avec une référence complémentaire à 8 h et affiche les plages par jour. La sélection reste explicite et enregistre le GUID associé. **Aucun service limité** retire le réglage via une valeur `null`, que l’API convertit en champ absent dans la politique stockée. Les anciens clients qui omettent le champ conservent la sélection existante.

## Finalisation du formulaire

- `packages/cloud/src/views/planning/suggestion/configuration/PlanningConfigForm.vue`, `fixedAlternationForm.ts`, `planningConfig.steps.ts`
- `packages/cloud/src/views/planning/suggestion/planningSuggestion.type.ts`
- `packages/api/src/utils/planning.fixed.alternation.ts`
- `packages/cloud/verification/fixed-alternation-form.test.mjs` et `packages/api/src/utils/test/planning.fixed.alternation.test.ts`

Neuf tests ciblés réussis. Le parcours sélection, sérialisation et rechargement a été vérifié sur des fixtures, ainsi que l’effacement explicite et la compatibilité historique. Contrôle TypeScript frontend réussi. Aucune migration ni aucun déploiement effectués.
