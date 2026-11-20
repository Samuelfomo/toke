# V01 — recette métier : filtre worker invalide (2026-11-05)

Reproduction sur bases PostgreSQL/PostGIS fictives A/B : création d’un groupe de rotation avec deux slots, une assignation active et démarrage explicite de `runForTenant()` dans le banc, avec node-cron remplacé par un enregistreur inerte. La vraie chaîne automate → rotation.cron → classes/model → Sequelize → PostgreSQL échoue : `column xa_rotation_groups.ids does not exist` (SQLSTATE 42703).

Cause : `packages/api/src/automate/rotation.cron.ts:117` appelle `RotationGroup._list({ ids: groupIds })`. `_list()` transmet ce filtre sans conversion, via `RotationGroupsModel.listAll()` puis `BaseModel.findAll()`, à Sequelize. La table a une colonne `id`, aucune colonne `ids`. Le même appel existe dans HEAD : défaut préexistant, pas une régression démontrée du contexte ALS. Les anciennes fixtures simulées ne vérifiaient pas cette requête SQL.

Conséquence : le parcours de rotation avec assignations ne peut pas être déclaré validé. Aucun croisement A/B observé. Les scénarios indépendants continuent ; le résultat global métier reste en échec tant que le parcours n’est pas débloqué.

Correctif envisageable : filtre `id` avec `Op.in` explicitement, ou conversion documentée au niveau de la méthode métier. Cette modification touche un chemin métier antérieur à V01 : aucune correction appliquée sans accord utilisateur. Aucun ajout fictif de colonne `ids`, mock du filtre ou contournement SQL admis pour obtenir un résultat vert.

## Correction locale autorisée et validée

Après accord utilisateur explicite, vérification de la chaîne : `_list(conditions)` délègue à `list()` ; `RotationGroupsModel.listAll()` ajoute seulement `deleted_at: null` ; `BaseModel.findAll()` transmet `where` à Sequelize. Aucun contrat de pseudo-filtre `ids`. La classe renvoie `null` quand la liste est vide. Sequelize 6.37.8 reconnaît `Op.in` et traduit une liste vide en `IN (NULL)`.

Seul changement applicatif WORKER-IDS : import de `Op` et appel `_list({ id: { [Op.in]: groupIds } })` dans `rotation.cron.ts`. Le garde existant `groupIds.length > 0` reste identique. Aucune règle, assignation, calendrier ou schéma changé.

Changement isolable : [WORKER_IDS_FIX.patch](./WORKER_IDS_FIX.patch). Test dédié : `packages/api/verification/tenant-isolation/worker-group-filter.postgres.cjs` : deux groupes attendus, exclusion d’un troisième, IDs inconnus, liste vide (`null`), worker sans assignation sans appel aux groupes, appels A/B concurrents avec noms et tenants distincts. Test PostgreSQL réussi. Le banc unitaire de rotation reçoit désormais le vrai symbole `Op.in` dans sa dépendance Sequelize simulée.

Le parcours worker dépasse cette erreur SQL mais reste bloqué par une autre omission préexistante du journal, documentée séparément dans [V01_ANOMALIE_WORKER_CYCLE_LENGTH.md](./V01_ANOMALIE_WORKER_CYCLE_LENGTH.md). Ce résultat ne remet pas le filtre corrigé en échec ; il empêche de déclarer toute la rotation validée. Aucun autre correctif métier appliqué.

Mise à jour suivante : après une autorisation distincte, le champ du journal a été corrigé dans WORKER_LOG_CYCLE_LENGTH_FIX.patch. Le filtre reste indépendant ; la rotation nominale passe, mais l’atomicité SQL échoue encore (voir V01_ANOMALIE_WORKER_ATOMICITE.md).

Dernière mise à jour : après autorisation distincte, WORKER_ATOMICITY_FIX.patch rend les écritures atomiques. La dernière recette PostgreSQL préparée passe, y compris les refus SQL du journal et la concurrence multiprocessus ; voir V01_ANOMALIE_WORKER_ATOMICITE.md. Les échecs décrits plus haut sont historiques.
