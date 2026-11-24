# Synthèse horaire du planning standard

## Périmètre et calcul

Le bouton **Synthèse horaire** ouvre un panneau intégré aux filtres, replié à l’ouverture de l’écran. Les trois modes lisent le même périmètre. Le nombre de collaborateurs correspond à l’ensemble filtré, y compris les lignes au-delà de la limite d’affichage du mode détaillé. Une modification de date est prise en compte après **Rechercher**.

- Le planning et la synthèse partagent la résolution des modèles, des remplacements manuels, des repos et des suites de garde. La recherche avancée filtre désormais aussi les lignes du planning et de la synthèse. Elle porte sur le nom ou le code en mode Employé et sur le nom du groupe en mode Groupe.
- Les heures sont calculées à partir des plages planifiées, pauses déduites. Une minute couverte par plusieurs plages effectives est comptée une seule fois. Les repos sans plage comptent pour zéro. Une suite de garde effective peut coexister avec un repos sur le jour civil suivant.
- Les bornes sont inclusives par jour civil. Une plage traversant minuit est répartie entre les deux dates. Seule la portion située dans la période est comptée. Les heures sont des durées d’horaires civils saisis dans les modèles. Pour un modèle historique stocké en un seul bloc de nuit, la grille détaillée peut omettre le report du lendemain même si la synthèse l’inclut.
- Sous le statut **Tous**, les archives restent visibles dans la grille. Les totaux reposent sur la résolution des seules affectations actives. Sous **Inactif uniquement**, les collaborateurs concernés restent listés à zéro.
- Le panneau affiche un état indisponible si le chargement échoue ou si un modèle actif du périmètre est introuvable.

## Contrat API

La route existante `GET /schedule-assignments/:manager/list` passe par le BFF et renvoie la collection du gestionnaire, avec les modèles embarqués ou leurs références, les membres de groupes, les statuts et les métadonnées d’ajustement. L’écran réutilise son chargement des modèles et des couleurs. Le client demande une borne basse remontant à la veille. La route actuelle renvoie la collection du gestionnaire et la sélection des dates est effectuée côté Cloud. Aucun changement de schéma, d’endpoint, de migration ou de nombre de requêtes.

## Convention métier à confirmer

Les modèles historiques peuvent découper une garde en deux plages, par exemple `16:00–23:59` et `00:00–08:00`. Le calcul respecte l’heure de fin saisie, ce qui donne **15 h 59** dans cet exemple, hors pauses. Confirmer avec le métier si `23:59` représente une fin littérale ou une convention pour minuit. La synthèse n’applique pas les éventuels crédits forfaitaires du moteur de suggestions.

## Fichiers

- `packages/cloud/src/views/planning/schedule_assignment/scheduleAssignmentList.vue` raccorde le panneau, les filtres et la résolution des affectations.
- `packages/cloud/src/views/planning/schedule_assignment/components/PlanningHoursSummary.vue` affiche les totaux et réutilise les acronymes et les avatars du planning optimisé.
- `packages/cloud/src/views/planning/schedule_assignment/plannedHours.ts` calcule les minutes nettes dans la période.
- `packages/cloud/verification/planned-hours.test.mjs` couvre les pauses, le repos, les chevauchements et les gardes aux bornes.

## Déploiement Cloud

1. Depuis un checkout de la révision à livrer, utiliser Node 22.12 ou supérieur, installer les dépendances avec `npm ci` et fournir les variables Cloud de production habituelles.
2. Exécuter `npm run build --workspace=@toke/shared`, puis `node --import tsx --test packages/cloud/verification/planned-hours.test.mjs` et `npm run build --workspace=@toke/cloud`.
3. Publier `packages/cloud/dist/` via le déploiement statique Cloud habituel, en conservant la configuration du routage SPA et l’artefact précédent pour le retour arrière.
4. Sur un compte gestionnaire, contrôler le panneau replié au départ, la cohérence des trois modes et un changement de période avec une garde. En cas de régression, republier l’artefact Cloud précédent.

## Vérification

- Quatre tests de calcul et build Cloud réussi sous Node 22.
- Scénario Chrome sur données simulées à 320 px et 1 280 px. Ouverture et fermeture, changement de période après validation, sélection employé et groupe, recherche par code, statut, pause de nuit, suite technique issue de la veille, remplacement par un repos et cohérence des trois modes. Le scénario vérifie également l’absence de requête d’affectations lors d’un changement de filtre ou de mode.
