# Correction du menu Mémos de la fiche employé

## Cause

Le menu appelait `router.push` avec le nom `employeeMemosView`, absent du routeur. Le module Mémos existe sous la route nommée `memoList` (`/memoList`). L'erreur empêchait toute navigation.

## Fichiers modifiés

- `packages/cloud/src/views/profileCard.vue` : le menu utilise désormais `memoList` et transmet `employeeGuid` et `employeeName` dans les paramètres de requête.
- `packages/cloud/src/views/memo/memosView.vue` : le filtre employé est synchronisé avec `employeeGuid`, dès l'ouverture et lors d'un changement de ces paramètres. L'employé figure dans les options même si aucun mémo ne le concerne dans la liste chargée.
- `codex_md/correction-navigation-memos-employe.md` : cette documentation.

## Comportement

Depuis `/profileCard/7173056141612204`, cliquer sur « Mémos » ouvre `/memoList?employeeGuid=7173056141612204&employeeName=…` avec le filtre de cet employé préselectionné. Le filtrage existant porte sur le destinataire du mémo. Le filtre reste modifiable et réinitialisable.

L'accès général à `/memoList` conserve la liste générale. Le paramètre `action=create`, déjà utilisé pour envoyer un mémo à un employé, ne déclenche pas ce filtre. Aucun changement de route, d'API ou de droits d'accès n'est nécessaire.

## Vérifications

- Exécution de la fonction de navigation avec un routeur simulé et vérification de l'existence de la route cible.
- Exécution de la synchronisation du filtre : arrivée depuis une fiche, changement d'employé, création et retour à la liste générale.
- `npm run type-check --workspace=@toke/cloud` : réussi.
- `git diff --check` : réussi.
- Vérification visuelle dans le navigateur non réalisée.
