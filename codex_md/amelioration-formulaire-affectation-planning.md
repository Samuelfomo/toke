# Détails et confirmation d'une affectation de planning

## Problème

L'aperçu du modèle affichait les jours concernés avec uniquement le premier créneau du premier jour travaillé. Cette présentation pouvait laisser croire que toutes les journées avaient les mêmes horaires. Le récapitulatif ne reprenait que le nom du modèle et n'était présent qu'en création.

## Ajustements

### Cible sélectionnée

Une fiche courte reprend le nom, le matricule et le département disponibles pour un employé, ou l'effectif disponible pour un groupe. Les informations viennent des données déjà chargées. Le nom de la cible reste disponible en édition grâce à l'affectation existante si la liste des cibles ne le fournit pas.

### Détail du modèle

Un composant partagé présente les sept journées du lundi au dimanche, avec tous leurs créneaux, leurs pauses et leurs tolérances en minutes. Une fin le lendemain est explicitée ; le décalage explicite `end_day_offset` est prioritaire, sinon un horaire de fin antérieur à l'horaire de début indique un passage au lendemain.

La distinction du module de modèles horaires est conservée : tableau vide = « Repos », valeur `null` = « Fermé », jour absent = « Non configuré ». La description du modèle est affichée lorsqu'elle est disponible. Un modèle indisponible est signalé, sans inventer ses horaires.

### Vérification avant enregistrement

Le récapitulatif indique la cible, le modèle, les dates, le motif éventuel, le statut en édition et reprend le détail hebdomadaire complet. Une phrase décrit l'action et précise explicitement l'absence de date de fin. En création, trois liens permettent de revenir directement à la cible, au modèle ou à la période. En édition, le récapitulatif apparaît sous les champs avant l'enregistrement.

La cohérence entre début et fin est maintenant vérifiée avant de quitter l'étape Période, en plus de la validation existante avant enregistrement.

## Fichiers concernés

- `packages/cloud/src/views/planning/schedule_assignment/scheduleAssignmentForm.vue` : informations de cible, aperçu détaillé, récapitulatif en création et édition, navigation de correction, validation de période.
- `packages/cloud/src/views/planning/schedule_assignment/components/ScheduleTemplatePreview.vue` : présentation commune des journées du modèle.
- `codex_md/amelioration-formulaire-affectation-planning.md` : documentation.

## Périmètre

Aucun endpoint ou format d'enregistrement n'est modifié. Le détail décrit le modèle hebdomadaire choisi ; il ne constitue pas un calcul des conflits avec d'autres affectations ni une simulation des exceptions sur toute la période.

## Vérifications

- `npm run type-check --workspace=@toke/cloud` : réussi.
- Rendu Vue côté serveur du composant : vérification des journées, créneaux multiples, pauses, tolérances, fins nocturnes et décalages explicites, repos, fermeture et journées non configurées.
- Exécution de la validation de période : fin antérieure refusée, même jour accepté.
- `git diff --check` : réussi.
- Vérification visuelle dans le navigateur non réalisée.
