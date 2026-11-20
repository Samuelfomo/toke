# V01 — tests locaux du correctif

## Commandes depuis la racine

```sh
node packages/api/verification/tenant-isolation/run.cjs
node packages/api/verification/tenant-isolation/run.cjs --framework-probes
```

La première commande exécute les critères applicatifs, le cycle de vie, les frontières HTTP/Master/intégrateur/worker/PIN et les tests existants de publication planning. La seconde exécute séparément les sondes ALS/Express/Sequelize : elles ne sont pas considérées comme une acceptation applicative.

Aucun serveur ou accès à une base réelle : les unités applicatives sont transpilées en mémoire par un chargeur fermé, les dépendances externes simulées. Les tests `guarded-orm` exécutent réellement les gardes de l’application avec Sequelize 6.37.8 et son dialecte PostgreSQL, mais avec un Client pg inerte incapable d’ouvrir une socket. Les tests `actual-http` utilisent le vrai Router avec requêtes/réponses synthétiques. Les secrets, caches et `.env` existants ne sont pas chargés. Le lanceur ne transmet que PATH et NODE_ENV=test aux tests.

Chaque test est borné à cinq secondes. Les courses sont contrôlées par promesses-barrières, pas par des attentes réseau ou du hasard.

## Couverture

- `acceptance.test.cjs` : AC01–16 adaptés à la conception approuvée, dont AC04 zéro DDL en mode existing.
- `guarded-orm.test.cjs` : gardes applicatifs sur vrai ORM, SQL brut/native, acquisition, QueryInterface, détection version, SET/OIDs, transactions gérées/non gérées, savepoints, rollback après révocation, afterCommit, callbacks/promesses, modèles/transactions capturés.
- `lifecycle.test.cjs` : fermeture pendant acquisition/modèles, générations et configuration, single-flight, bootstrap, schéma partiel, détachement et erreurs typées.
- `business-boundaries.test.cjs` : vrais handlers intégrateur, indépendance Master/CRUD, vrai middleware PIN, worker et règles de rotation sur données fictives ; vérification AST du retrait du setter global.
- `actual-http.test.cjs` : vrai middleware de l’application avec Router Express, requêtes concurrentes et erreurs après await.
- `../schedule-suggestion-approval.test.cjs` : régressions existantes de publication planning et rollback en mémoire.

Ces tests ne certifient pas le serveur PostgreSQL, PostGIS, les verrous réels, PgBouncer ou les schémas historiques. Certaines vérifications AC sont partielles tant que les intégrations réelles ne passent pas. Le tableau de suivi et les blocages se trouvent dans `audits/V01_HANDOFF.md`.

## PostgreSQL réel fictif — prérequis et commande explicite

```sh
node packages/api/verification/tenant-isolation/postgres-integration.cjs --create-disposable-cluster
```

Ce lanceur exige `initdb`, `pg_ctl` et `postgres` locaux. Sur cette machine ils sont disponibles dans Postgres.app : `/Applications/Postgres.app/Contents/Versions/16/bin`, hors PATH. Sans eux, il sort avec le code 2 **avant création de cluster ou connexion**. Aucune installation automatique et aucun mode de connexion à un serveur existant.

Une fois les prérequis autorisés et disponibles, il crée son propre cluster dans un répertoire temporaire marqué, désactive TCP, utilise seulement son socket Unix privé, crée deux bases/roles fictifs et teste SQL, modèles, écritures concurrentes, commit/rollback et refus de transaction/contexte. Les paramètres du pilote sont explicitement contrôlés ; les variables PG/DB héritées sont retirées dans ce processus. Le cluster est arrêté et son répertoire possédé supprimé au terme de l’essai. Une erreur d’arrêt conserve le répertoire pour inspection. Ne jamais ajouter un DATABASE_URL de remplacement ou des credentials clients.

Commande sur cette machine, sans modification permanente du PATH :

```sh
env PATH="/Applications/Postgres.app/Contents/Versions/16/bin:$PATH" node packages/api/verification/tenant-isolation/postgres-integration.cjs --create-disposable-cluster
```

Premier banc validé avec PostgreSQL 16.9 et PostGIS 3.4.4. Après correction transactionnelle autorisée, le dernier lanceur complet sort avec le code 0 : WORKER-IDS, cycle_length et atomicité sont validés sur PostgreSQL fictif. Les autres scénarios passent ; le cluster est arrêté/supprimé même sur cet échec. Le bac à sable système bloque shmget : une autorisation d’exécution du lanceur hors sandbox peut être nécessaire. Aucun service système ne doit être démarré. `postgres-schemas.cjs` charge uniquement les 29 schémas réels et les constantes revues ; `postgres-scenarios.cjs` couvre existing sans DDL (garde serveur + snapshots), contraintes, cycles de vie, tâches détachées et transactions. Le test de transaction abandonnée échoue explicitement et nettoie sa transaction si le rollback automatique régresse. La matrice avec les scénarios restants figure dans `audits/V01_VALIDATION_POSTGRESQL.md`. Ce succès ne certifie pas les parcours métier complets ni tout AC01–40.

## Historique et sécurité du chargeur

Les anciennes assertions qui prouvaient le défaut sont conservées dans `characterization.before-v01.cjs.txt` : archive non exécutable par la collecte des tests. Elles ne doivent pas être utilisées comme critères de réussite du correctif.

`inventory.json` conserve le relevé de préparation avant correction ; ne pas interpréter ses lignes comme un inventaire actuel. `inventory.cjs` peut produire un nouveau relevé sur stdout, sans exécuter les sources.

La VM est un chargeur de dépendances revues, pas une sandbox contre du JavaScript hostile. Aucun fallback automatique vers require des dépendances réelles n’est autorisé. Les sondes framework ne chargent pas l’application. Les tests applicatifs qui utilisent le vrai ORM injectent explicitement le pilote inerte.

## Recette métier étendue

Le lanceur exécute `postgres-business.cjs` (PIN/classes pointage, planning GREEDY réel et rollback de chaque service), `postgres-business-boundaries.cjs` (Master/provisioning et intégrateurs), `postgres-http.cjs` (Express sur socket Unix privé), `postgres-resilience.cjs` (pool/fermeture, dérive de fixture, SCRAM et deux processus Node via `postgres-child.cjs`). Les erreurs de suite sont accumulées sans rendre le résultat final vert ; les autres scénarios continuent.

Le chargeur métier n’expose aucun .env/service externe et interdit les constructions Sequelize non injectées. Le provisioning administratif ne peut viser que le cluster possédé. `pg_hba.conf` est temporairement adapté dans CE cluster pour le test SCRAM puis restauré ; aucun fichier PostgreSQL système touché. Les seuls processus enfants sont ceux des tests, sans ordonnanceur réel.

Correction distincte WORKER-IDS : patch `audits/WORKER_IDS_FIX.patch`, test `worker-group-filter.postgres.cjs`. Préserve le retour null de la classe pour liste vide. Les corrections suivantes du log et de son atomicité sont détaillées dans les rapports associés, avec patchs séparés. Les tests de pool révoqué vérifient un rejet asynchrone sans SQL, avec le vrai sequelize-pool, plutôt qu’un contournement des gardes.

WORKER-LOG-CYCLE-LENGTH est conservé dans `audits/WORKER_LOG_CYCLE_LENGTH_FIX.patch`. Le banc métier compare un groupe informatif à 97 avec 2/3 slots réellement utilisés, puis vérifie le log et l’idempotence. `worker-log.postgres.cjs` exige l’annulation de l’offset/date après échec SQL du journal ; ce test est désormais vert avec une vraie transaction et un rollback PostgreSQL, documentés dans `audits/V01_ANOMALIE_WORKER_ATOMICITE.md`.

Correctif transactionnel autonome : `audits/WORKER_ATOMICITY_FIX.patch`. `worker-log.postgres.cjs` teste INSERT/UPDATE refusés dans A puis B, absence de publication mémoire et le même PID PostgreSQL pour verrou/GUID/écritures. `worker-atomic-concurrency.postgres.cjs` observe de vrais waiters FOR UPDATE pour deux invocations puis deux processus sur les mêmes assignations, l’abandon/fermeture du pool et un signal COMMIT perdu simulé après commit réel. Cette dernière simulation ne remplace pas un test de partition réseau réelle. Les fonctions métier de calendrier/modulo restent inchangées.

### CLOCK_IN transactionnel — reprise de validation

`postgres-clockin-atomicity.cjs` est appelé par le parcours HTTP réel du banc.
Il couvre les refus SQL session/entrée/mémo/alerte/correction, les snapshots A/B,
la concurrence idempotente sous verrou et un signal de commit perdu simulé.
Les sorties framework/probes ne remplacent pas ces preuves.

Pour conserver MemoReads comme artefact manuel sans réexécuter sa migration :

```sh
env PATH="/Applications/Postgres.app/Contents/Versions/16/bin:$PATH" node packages/api/verification/tenant-isolation/postgres-integration.cjs --create-disposable-cluster --skip-memo-migration
```

Le scénario de migration affiche explicitement NOT_EXECUTED ; les autres suites
continuent. L'assertion PROVISIONING_RECOVERY_REQUIRED reste rouge tant que le
lot de reprise n'est pas implémenté. Ne pas la supprimer pour obtenir un vert.
