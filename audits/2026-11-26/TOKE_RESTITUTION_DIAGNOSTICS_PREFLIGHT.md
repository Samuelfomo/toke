# TOKE — Restitution des diagnostics de prévalidation

La génération et la régénération présentent les diagnostics `PLANNING_PREFLIGHT_INFEASIBLE` dans le composant d’alerte
de planning existant. Le résumé affiche la période, la population, les besoins, la capacité maximale et le déficit
fournis par l’API. Les détails par jour et les avertissements secondaires sont repliés par défaut. Les avertissements
des suggestions générées rejoignent le résumé existant avec une gravité non bloquante. Les noms des services sont
résolus depuis les besoins existants. Le formulaire de génération réutilise ceux qu’il a déjà chargés.

Les liens vers les besoins, les profils et les règles ouvrent un nouvel onglet pour préserver le brouillon et les
paramètres de génération. Le responsable peut relancer le calcul après correction. Les recommandations sont affichées
comme des pistes à revérifier. Le contrat actuel de prévalidation renvoie des recommandations textuelles et les
confirmations existantes sont conservées. Aucun recalcul des contraintes côté Cloud.

## Fichiers

- `packages/cloud/src/views/planning/suggestion/suggestions/GenerateSuggestionModal.vue`
- `packages/cloud/src/views/planning/suggestion/suggestions/ScheduleSuggestionPreview.vue`
- `packages/cloud/src/views/planning/suggestion/suggestions/SuggestionPreflightAlert.vue`
- `packages/cloud/src/views/planning/suggestion/suggestions/preflightDiagnostics.ts`
- `packages/cloud/src/views/planning/suggestion/suggestions/suggestionAlerts.ts` et
  `packages/cloud/src/views/planning/suggestion/planningSuggestion.type.ts`
- `packages/cloud/verification/suggestion-preflight-diagnostics.test.mjs`

## Vérifications et déploiement

Trois tests ciblés vérifient la lecture des capacités et recommandations, la séparation des avertissements, les anciens
diagnostics et le maintien du traitement des erreurs génériques. Le contrôle TypeScript Cloud et les trois tests
passent. Les tests n’utilisent pas de données de production.

Après autorisation, construire depuis la racine avec `npm run build --workspace=@toke/shared`, puis
`npm run build --workspace=@toke/cloud`. Conserver l’artefact statique actuellement servi et publier ensemble
`packages/cloud/dist/index.html` et ses ressources par le processus Cloud existant. Vérifier la génération et la
régénération sur une fixture bloquée, l’ouverture des détails et les raccourcis. Pour revenir en arrière, restaurer
l’artefact statique précédent dans son ensemble.

Aucune migration ni aucun déploiement.
