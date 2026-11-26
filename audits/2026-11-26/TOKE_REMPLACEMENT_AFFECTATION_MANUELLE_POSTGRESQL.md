# TOKE — Remplacement confirmé des affectations manuelles

## Cause

Le service d’ajustement identifie la contrainte PostgreSQL `exclude_overlapping_active_schedule_assignments`. L’insertion directe d’une affectation active qui recouvre une affectation active du même périmètre déclenche `23P01`. La plage demandée va du 27 novembre 2026 à l’infini car `end_date` vaut `null`. Elle recouvre une affectation existante de la même cible dès que celle-ci reste active le 27 novembre ou commence après cette date. Les dates de fin renseignées sont inclusives.

Le scénario et le code PostgreSQL ont été reproduits sur une base jetable. Le DDL de la contrainte de production et la ligne précise en conflit ne sont pas disponibles dans le dépôt. Pour confirmer sa définition exacte sur l’environnement concerné, cette requête de lecture retourne le DDL à partir du catalogue :

```sql
SELECT conrelid::regclass AS relation, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'x'
  AND conname = 'exclude_overlapping_active_schedule_assignments';
```

## Correctif

Le POST existant répond `409 SCHEDULE_ASSIGNMENT_OVERLAP` avec les modèles et périodes touchés, la portion remplacée, les portions conservées et une empreinte de confirmation. Le formulaire affiche ces éléments et propose « Confirmer le remplacement ». La confirmation est transmise dans `replacement_confirmation` au même endpoint. En cas de modification concurrente, le serveur recalcule les impacts et demande une nouvelle confirmation ou invite à relancer la vérification.

L’API vérifie la session ou la délégation et le rôle du manager, reprend les verrous sur les lignes concernées, puis réutilise le découpage des ajustements ponctuels. Elle raccourcit, décale, scinde ou désactive les lignes selon le recouvrement. Le fragment conservé reprend le snapshot d’origine. Le découpage capture sa borne de fin avant la mise à jour Sequelize, qui peut modifier en place l’objet source. Les changements des lignes existantes sont journalisés dans la même transaction sérialisable que la création. La contrainte d’exclusion reste active.

Une création sans conflit garde son parcours habituel. Une affectation active ne peut commencer dans le passé. Le remplacement par dates entières commence au plus tôt demain pour préserver la journée en cours. Les gardes comportant des continuations identifiées sont renvoyées vers l’ajustement ponctuel, qui dispose de la logique de traitement de ces liens. Le remplacement de période est limité à la création par POST.

## Fichiers

- API tenant · `routes/schedule.assignments.route.ts`, `class/ScheduleAssignments.ts`, `model/ScheduleAssignmentsModel.ts`, `class/ScheduleAssignmentsLog.ts`, `model/ScheduleAssignmentsLogModel.ts`.
- Services API · `tools/schedule.assignment.manual.service.ts`, `tools/schedule.assignment.adjustment.service.ts`.
- BFF · `routes/schedule.assignments.route.ts`, `services/schedule.assignment.service.ts`.
- Cloud · `service/ScheduleAssignment.ts`, `views/planning/schedule_assignment/scheduleAssignmentForm.vue`.
- Vérifications · `packages/api/verification/schedule-manual-replacement.postgres.test.cjs`, `packages/api/verification/schedule-manual-assignment.test.cjs`, `packages/cloud/verification/schedule-assignment-navigation.test.cjs`.

## Vérifications

- PostgreSQL 16.15 local. Le test rejoue le service avec de vraies transactions et une contrainte GiST d’exclusion reconstruite depuis les règles repérées. Il couvre le code `23P01`, le remplacement sans date de fin, le découpage en deux fragments, le recouvrement intégral, la confirmation obsolète, les gardes liées et le refus des dates historiques. Il force aussi un échec après la création pour vérifier l’annulation du découpage, de la nouvelle insertion et du journal. La vérification de l’identité utilise une autorité de session simulée.
- Six tests API, BFF et Cloud sur fixtures passent. Ils couvrent notamment la remontée du conflit et la transmission de l’empreinte au clic de confirmation.
- Les contrôles TypeScript de l’API, du BFF et du Cloud passent.
- La recette avec une session et une délégation réelles, dans un environnement intégré, reste à faire.

Aucune migration nécessaire. Aucun déploiement effectué. Après validation, livrer l’API tenant, le BFF et le Cloud ensemble selon la [procédure de déploiement et retour arrière existante](TOKE_CORRECTIFS_AFFECTATION_MANUELLE_ET_NAVIGATION_APRES_PUBLICATION.md). Les remplacements déjà confirmés restent enregistrés en cas de retour arrière applicatif.
