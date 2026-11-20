# Liste des suggestions de planning

La route `planning-suggestion-list` charge `ScheduleSuggestionList.vue`.
Elle présente des cartes cliquables en trois colonnes sur ordinateur, deux
sur tablette et une sur mobile. Les vues Toutes, À vérifier, Publiées et
Archives affichent leurs effectifs indépendamment de la recherche. L’action
de création ouvre le formulaire existant et Actualiser recharge la liste.

Le client lit les pages de 50 de l’API jusqu’à recevoir une page incomplète,
puis affiche jusqu’à 12 cartes par page. L’API renvoie la taille de chaque page,
donc le client calcule les compteurs après chargement complet. Les pages sont
dédoublonnées par GUID. Une erreur de chargement est signalée et, après une
actualisation échouée, la dernière liste complète reste consultable.
Une édition concurrente du catalogue peut déplacer un résultat pendant la
collecte par offset. Actualiser relance la lecture.

Une carte utilise l’effectif des éléments présents ou
`diagnostics.generationScope.includedEmployeeCount`. L’effectif des anciens
enregistrements sans ces données est indiqué comme non renseigné.
L’indicateur d’alertes repose sur les violations et les écarts de couverture
fournis, en évitant de recompter un écart de couverture déjà signalé.
L’absence de diagnostic laisse l’indicateur masqué.

## Vérifications

- `npm run type-check --workspace=@toke/cloud` — réussi.
- Chrome avec 63 suggestions fictives — deux pages API, recherche dans les
  archives au-delà du premier lot, compteurs, pagination de cartes, liens de
  détail, métadonnées disponibles ou absentes et grille 3/2/1 à
  1280, 800 et 390 px. Réussi.

## Déploiement et retour arrière

1. Après validation, préparer la révision approuvée dans un checkout séparé
   avec Node compatible Vite 7 et la configuration Cloud de production.
2. Exécuter `npm ci`, `npm run build --workspace=@toke/shared` puis
   `npm run build --workspace=@toke/cloud`. Vérifier
   `packages/cloud/dist/index.html` et ses ressources.
3. Identifier la racine statique servie, qui n’est pas versionnée dans ce
   dépôt. Sauvegarder l’artefact en service et basculer l’ensemble de
   `packages/cloud/dist` selon la procédure de l’hébergeur.
4. Contrôler la liste, les filtres, l’ouverture du détail et du formulaire
   de création. En cas de retour arrière, restaurer l’artefact statique
   complet précédent via le même mécanisme et vérifier ses ressources.

Aucune migration ni bascule de service backend requise. Aucun déploiement exécuté.
