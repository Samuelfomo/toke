# Détail des suggestions de planning

## Changements

La route `planning-suggestion-preview` charge le composant actif
`ScheduleSuggestionPreview.vue`. Les captures historiques de la liste et
du détail dans `audits/image/` montrent que les cartes d’alertes et de garde
repoussaient la grille sous le premier écran. Le détail utilise maintenant
l’en-tête compact du parcours et présente la grille en premier.

- Vue Collaborateurs par défaut, acronymes distinctifs et lexique nominatif.
  Le tableau affiche sept jours, du lundi au dimanche, avec les suites de garde
  après la période. La vue Services regroupe toutes les personnes affectées
  et peut afficher un besoin encore vacant. Sur mobile, le défilement
  horizontal est limité au tableau et la première colonne reste accessible.
- L’édition ponctuelle réutilise `SuggestionCellEditor.vue` et la sauvegarde
  existante. Elle actualise les deux vues puis recharge les diagnostics.
  L’éditeur groupé est accessible depuis l’en-tête ou depuis la cellule,
  avec le collaborateur et la date présélectionnés. La régénération et le rejet
  restent disponibles pour les brouillons.
- Les détails de couverture, d’équité et de garde sont accessibles en panneau.
  La notification d’alertes distingue les anomalies critiques des avertissements.
  Une alerte datée ouvre la semaine et place le focus sur la cellule si
  l’alerte identifie un collaborateur ou un service.
- La publication appelle `approval-preview` avec la date demandée.
  Une date de remplacement est proposée à l’utilisateur. Un clic la
  sélectionne et relance la vérification. Seul le bouton de confirmation
  appelle `approve` avec la date vérifiée. Modifier la date annule le résultat
  de la vérification précédente.
- Le contrat de planning prévoit un modèle horaire par personne et par jour.
  Tous les créneaux horaires de ce modèle apparaissent dans la cellule.
  La prise en charge de plusieurs modèles distincts sur une même journée
  demanderait une évolution du contrat backend.

## Équipes de garde hebdomadaires

La section d’origine affichait les dates, le mode de sélection, le nom et
les initiales de chaque membre. La refonte avait conservé les dates, le mode
et les noms dans le panneau, sous forme de texte. Le panneau affiche
désormais la composition en liste compacte, avec les mêmes acronymes
distinctifs que la grille, le nombre de membres et le signalement des
collaborateurs introuvables. « Voir la semaine » ferme le panneau et place
le focus sur la semaine correspondante. Les équipes proviennent directement
de `diagnostics.guardPools`, dans l’ordre fourni pour chaque équipe.

## Ajustements ergonomiques

Le détail affiche un contrôle segmenté Collaborateurs / Services, les filtres
ouverts et les commandes « Précédent » et « Suivant » autour du numéro et des
dates de la semaine. La pagination conserve les semaines calculées à partir
de la période. La légende nominative s’adapte à la largeur et présente tous
les collaborateurs, même si un filtre réduit les lignes visibles.

Les noms étaient déjà rendus dans les en-têtes de ligne de la vue Services.
Le code ne prévoyait aucun repli si le premier libellé fourni était vide.
La première colonne garde une largeur réservée et le texte se met à la ligne.
Un libellé vide est remplacé par le nom du modèle horaire ou le motif de
l’affectation lorsque cette information existe. L’ordre de déploiement et
la procédure de retour arrière figurent ci-dessous.

## Vérification

- `npm run type-check --workspace=@toke/cloud` — réussi.
- `node packages/api/verification/tenant-isolation/build-cloud-isolated.mjs` —
  réussi avec une URL fictive. Vite signale des bundles partagés volumineux.
- Chrome sur une fixture locale, sans appel à la production — sept jours,
  acronymes en doublon, largeurs 1280 et 390 px, affectations multiples dans
  la vue Services, créneaux multiples, sauvegarde et synchronisation, lien
  d’alerte avec déplacement du focus, ouverture de l’éditeur groupé, et
  publication après choix explicite de la date proposée. Réussi.

- Complément gardes — contrôle TypeScript et test Chrome ciblé réussis. Le
  scénario couvre deux semaines, deux modes de sélection, des acronymes en
  doublon, un collaborateur introuvable et la navigation avec transfert du focus.

- Ajustements ergonomiques — TypeScript et Chrome réussis sur une fixture
  de cinq semaines. Contrôle des segments, filtres, bornes de pagination,
  légende complète, libellé de service vide à 1280 et 390 px, navigation
  depuis les gardes et ouverture de la prévalidation.

- Acronymes — le calcul trie tous les éléments de la suggestion par GUID
  avant d’attribuer les initiales et, en cas de collision, un suffixe
  numérique libre. La grille, les deux vues, la légende et le panneau des
  gardes utilisent le même index. Test ciblé réussi sur huit noms, dont des
  homonymes et des accents encodés différemment. Les huit acronymes sont
  uniques et restent associés aux mêmes GUID après deux réordonnancements.

## Mise en production et retour arrière

1. Faire valider la mise en ligne et vérifier en préproduction que le BFF et
   l’API tenant exposent `POST /local/schedule-suggestion/:guid/approval-preview`
   et acceptent `effective_from` sur `approve`. Le déploiement backend est
   décrit dans [le rapport du 18 novembre](../2026-11-18/TOKE_APPROVAL_PREVIEW.md).
2. Dans un checkout de la version approuvée, installer avec `npm ci`.
   Utiliser une version compatible avec Vite 7, par exemple Node 22.12+,
   et les variables Cloud de production habituelles. Vérifier que `VITE_URL`
   pointe vers le BFF attendu, avec le préfixe `/local`.
3. Exécuter `npm run build --workspace=@toke/shared`, puis
   `npm run build --workspace=@toke/cloud`. Le paquet Cloud fournit
   `packages/cloud/dist/index.html` et ses ressources.
4. Identifier la racine réellement servie et la procédure de mise en ligne
   statique de l’instance. Le dépôt ne versionne pas cette cible. Sauvegarder
   la version statique servie, puis basculer l’ensemble du dossier `dist`
   par le mécanisme de publication de l’hébergeur. Aucune migration pour le
   Cloud et aucun redémarrage PM2 requis pour une bascule statique seule.
5. Vérifier, avec une organisation de recette, l’accès au détail, la navigation
   par semaine, le passage d’une vue à l’autre, l’édition et le diagnostic
   d’une date bloquée. Tester la confirmation de publication uniquement en recette.
6. En cas de retour arrière, réactiver l’ensemble de l’artefact statique
   précédent via le même mécanisme, puis vérifier que la page et ses
   ressources sont servies. Le retour arrière du Cloud ne nécessite pas
   de restaurer les données.

Aucun déploiement exécuté.
