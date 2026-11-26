# TOKÉ — Écritures Mémos

Le Cloud permet de choisir un destinataire autorisé, d’enregistrer et modifier un brouillon, de le soumettre, puis de répondre, valider, rejeter ou révoquer selon les capacités renvoyées par l’API. La création et les réponses prennent du texte. Les médias et le temps réel conservent leur verrou existant.

## Fichiers

| Composant | Fichiers |
| --- | --- |
| API Tenant | `src/middle/memo-b2-reads.ts`, `src/tenant/memos/writes.service.ts`, `src/tenant/memos/reads.service.ts`, `verification/tenant-isolation/postgres-memo-b2.cjs` |
| BFF | `src/tools/memo-manager-reads.ts`, `verification/memo-manager-reads.test.cjs` |
| Cloud | `MemoService.ts`, `memoStore.ts`, `memoReadError.ts`, `memosView.vue`, `memoCreateChat.vue`, `memoDetailChat.vue`, `memoDetailPanel.vue`, `memoChat.vue` |
| Configuration | `ecosystem.config.cjs`, `packages/api/ecosystem.config.cjs` |
| PostgreSQL | [TOKE_MEMOS_B1_WRITES.sql](./TOKE_MEMOS_B1_WRITES.sql) |

Les nouvelles routes sont `GET /memo/recipients` et `POST /memo/commands`. Les deux preuves existantes conduisent au même manager effectif. Le sélecteur réutilise le résolveur d’organisation B1 et limite les destinataires au périmètre du manager. La décision appartient au responsable certifié. La révocation d’un mémo ouvert appartient à son auteur humain. La révocation d’une décision appartient au responsable qui l’a prise. Une réponse historique n’invente aucune responsabilité. Les changements de statut ne modifient pas les pointages.

La fonction SQL verrouille le mémo, contrôle la version et inscrit la commande et son événement dans la même transaction. Un identifiant de commande permet de rejouer une réponse réseau incertaine sans dupliquer l’opération. Le journal conserve l’identité du manager et, en délégation, une référence hachée de la session intégrateur. Les nouveaux grants se limitent à l’exécution de cette fonction pour le rôle runtime B1. Les anciens handlers restent verrouillés.

## Activation et recette

1. Dans pgAdmin, renseigner `expected_database` puis exécuter le fichier entier comme `postgres` séparément sur chaque base tenant concernée. Le complément étend les contraintes d’actions et d’événements sans réécrire les lignes historiques. Conserver le script d’installation B1 initial comme référence de son manifeste d’origine.
2. Exécuter `npm run build`. Redéployer `api-tenant` avec `MEMO_B2_PRODUCTION_MANAGER_READS=1` et `MEMO_B1_MANAGER_WRITES=1`, puis `api-backend` avec `MEMO_B2_PRODUCTION_MANAGER_READS=1`. Renseigner ces valeurs dans la configuration persistante PM2. Le Master conserve ses routes actuelles.
3. Utiliser le Cloud local pour la recette. Pour livrer aux utilisateurs Web, compiler puis publier le Cloud via le déploiement statique habituel. Le retour au mode lecture seule se fait avec `MEMO_B1_MANAGER_WRITES=0` et redémarrage de `api-tenant`.

Le SQL a été installé et exercé sur un PostgreSQL jetable avec le script B1 pgAdmin d’origine. Les contrôles ont couvert les sept commandes, le rejeu, l’ACL, le refus inter-tenant, la version périmée et les contraintes différées. Le test de relais vérifie le manager effectif, la délégation et le rejet hors tenant. Les contrôles TypeScript Cloud, BFF et API ont réussi. Aucune action en production.
