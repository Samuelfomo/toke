# Redirection du menu Planning de la fiche employé

## Problème

Le menu Planning ouvrait l'ancienne page `employeeSchedulesView`. Celle-ci appelait les services individuels d'affectations, notamment `/rotation-assignments/user/:guid`, qui renvoyait une erreur 404.

## Correction

Le menu ouvre désormais la page existante « Plannings publiés », route `schedule-assignment`, à l'adresse `/planning/schedule-assignment`, avec les paramètres de requête `employeeGuid` et `employeeName`.

La page lit l'identifiant dès l'ouverture et lors de son changement dans l'URL. Elle active le mode Employé et renseigne son filtre existant. Celui-ci sélectionne déjà les affectations directes de l'employé et les affectations de ses groupes, puis limite les membres affichés à cet employé.

L'employé reste présent dans le sélecteur même si aucune affectation n'est disponible sur la période. Le nom transmis sert alors de libellé, avec l'identifiant comme valeur de secours.

Les filtres restent modifiables. La période et le statut conservent leurs valeurs habituelles. L'absence de planning ne provoque aucun retour automatique à la liste de tous les employés.

## Appels réseau

Le clic depuis la fiche effectue uniquement une navigation. Il ne passe plus par `employeeSchedulesView` et ne déclenche donc plus ses appels individuels. La page « Plannings publiés » conserve son chargement habituel des données. La lecture du paramètre employé ne lance aucune requête supplémentaire.

L'ancienne route reste disponible pour les éventuels autres accès ; elle n'est pas modifiée dans cette correction.

## Fichiers concernés

- `packages/cloud/src/views/profileCard.vue` : destination du menu Planning et paramètres transmis.
- `packages/cloud/src/views/planning/schedule_assignment/scheduleAssignmentList.vue` : lecture du paramètre employé, présélection réactive et maintien de l'option sans affectation.
- `codex_md/correction-navigation-planning-employe.md` : documentation.

## Vérifications

- Exécution de la navigation avec un routeur simulé et vérification de l'existence de la route cible.
- Vérification de la présélection et du libellé sans planning.
- Vérification du filtrage des affectations directes et de groupe, du changement d'employé et du retrait du paramètre.
- `npm run type-check --workspace=@toke/cloud` : réussi.
- `git diff --check` : réussi.
- Vérification visuelle dans le navigateur non réalisée.
