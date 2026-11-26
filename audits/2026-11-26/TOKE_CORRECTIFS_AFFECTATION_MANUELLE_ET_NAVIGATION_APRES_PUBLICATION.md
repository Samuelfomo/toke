# TOKE — Affectation manuelle et navigation après publication

## Causes et corrections

- Le client HTTP lève une exception lorsque l’API refuse une écriture. Le service Cloud renvoyait cette exception comme
  une réponse, et le formulaire assimilait l’absence de drapeau d’échec à un succès. Il fermait alors le formulaire et
  rechargeait la grille malgré l’échec. Le BFF restitue désormais le diagnostic API dans l’enveloppe standard, et le
  formulaire exige un succès explicite.
- La route tenant de modification validait le GUID du modèle et acceptait une date de fin nulle, puis ignorait ces deux
  valeurs. Elle enregistre désormais le nouveau modèle via le mécanisme existant de snapshot et de journalisation. Une
  valeur nulle efface la date de fin. La nouvelle version enregistrée correspond à celle du journal.
- La redirection après publication ne portait aucune date. Elle transmet désormais les bornes de la suggestion via
  `date_from` et `date_to`, même si la prise d’effet intervient en cours de période. La page initialise ses deux filtres
  et charge automatiquement les affectations publiées par le service habituel. Le chargement conserve le jour précédent
  pour les continuations de garde. Sans période valide en URL, l’ouverture habituelle sur la semaine courante est
  conservée.

## Fichiers

- Cloud · `service/ScheduleAssignment.ts`, `schedule_assignment/scheduleAssignmentForm.vue`,
  `schedule_assignment/scheduleAssignmentList.vue`, `suggestion/suggestions/ScheduleSuggestionPreview.vue`.
- BFF · `services/schedule.assignment.service.ts`.
- API tenant · `routes/schedule.assignments.route.ts`, `class/ScheduleAssignments.ts`,
  `model/ScheduleAssignmentsModel.ts`.
- Vérifications · `packages/api/verification/schedule-manual-assignment.test.cjs`,
  `packages/cloud/verification/schedule-assignment-navigation.test.cjs`.

## Vérifications ciblées

- Cinq tests passent. Le flux BFF et les handlers API créent, modifient et relisent une affectation avec un adaptateur
  de persistence en mémoire. Le test vérifie aussi le refus d’un modèle introuvable. Les tests Cloud couvrent le refus
  d’écriture, la publication avec une prise d’effet partielle, les dates invalides ou absentes et le chargement des
  affectations persistées.
- Contrôles TypeScript Cloud, BFF et API réussis. La vérification utilise des fixtures locales et des services simulés.
  La recette avec un navigateur et PostgreSQL reste à effectuer sur l’environnement de validation.

## Déploiement et retour arrière

Après approbation, préparer un artefact depuis une révision contenant ces correctifs. Conserver les artefacts précédents
de l’API tenant, du BFF et du Cloud. Depuis la racine, construire avec les scripts des workspaces, dans cet ordre :

```sh
npm run build --workspace=@toke/shared
npm run build --workspace=@toke/api
npm run build --workspace=@toke/backend
npm run build --workspace=@toke/cloud
```

Promouvoir les artefacts de l’API tenant et du BFF, puis recharger les processus PM2 déclarés dans
`ecosystem.config.cjs` :

```sh
npm run reloadAuto:tenant --workspace=@toke/api
npm run reloadAuto:backend --workspace=@toke/backend
```

Publier ensuite `packages/cloud/dist/` en un bloc via le circuit Cloud en vigueur. Vérifier sur un compte manager de
recette la création, l’ajustement ponctuel et la visibilité après rechargement. Publier une suggestion de test à prise
d’effet différée et vérifier que la grille charge la période complète. Vérifier aussi l’ouverture sans dates.

Pour revenir en arrière, rétablir l’artefact Cloud précédent, puis les artefacts API et BFF précédents et recharger les
deux processus avec les mêmes scripts. Les affectations déjà enregistrées restent en base.

Aucune migration nécessaire. Aucun déploiement effectué.
