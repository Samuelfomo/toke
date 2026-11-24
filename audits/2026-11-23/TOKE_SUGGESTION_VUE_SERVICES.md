# TOKE — Vue Services des suggestions de planning

Le glisser-déposer permet de déplacer un collaborateur vers un autre service le même jour. Les cibles compatibles sont mises en évidence. Le dépôt utilise la même opération de sauvegarde que l’éditeur par clic. La grille est actualisée après confirmation de l’API. Si l’API refuse, l’affectation initiale reste affichée et le motif du refus est présenté.

Les lignes **En repos** et **Non programmé** distinguent les repos explicites des journées sans affectation. Les deux lignes permettent l’édition par clic et le glisser-déposer sur un brouillon.

## Fichiers modifiés

- `packages/cloud/src/views/planning/suggestion/suggestions/ScheduleSuggestionPreview.vue`
- `packages/cloud/src/views/planning/suggestion/suggestions/SuggestionCellEditor.vue`
- `packages/cloud/src/views/planning/suggestion/suggestions/suggestionServiceCells.ts`
- `packages/cloud/verification/suggestion-service-cells.test.mjs`

## Vérifications

- Contrôle TypeScript frontend réussi.
- Deux tests ciblés réussis sur la distinction repos/non programmé et les cibles compatibles.
- Scénario Chrome réussi avec une API simulée pour le déplacement entre services, le refus d’un doublon, l’affectation depuis un repos, le refus de sauvegarde, la modification par clic et le rechargement. La persistance réelle en base n’a pas été testée.

Aucun déploiement effectué.
