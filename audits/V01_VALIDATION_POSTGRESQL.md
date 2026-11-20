# V01 — validation locale du 2026-11-05

> Recette de clôture du 2026-11-06 : voir [V01_VALIDATION_FINALE_ISOLATION.md](./V01_VALIDATION_FINALE_ISOLATION.md). Verdict **VALIDÉ SOUS RÉSERVES**, aucune modification applicative ; 58/58 tests, 15/15 sondes, deux passages PG sortant 1 uniquement sur la reprise du provisioning. Complément réel même tenant/autre opération réussi. Clôture formelle encore en attente, aucun feu vert production. Les bilans suivants restent historiques.


## Dernière étape — correction CLOCK_IN autorisée

**Dernier passage : sortie1 uniquement PROVISIONING_RECOVERY_REQUIRED.** POINTAGE_SQL_ATOMICITY_REQUIRED est maintenant corrigé pour CLOCK_IN, détails POINTAGE_ANOMALIE_ATOMICITE_SQL.md. Les passages précédents rouges restent historiques.

PG réel fictif A/B : session/entrée/mémo/alerte INSERT et correction UPDATE refusés → rollback de toutes les lignes, même PID transactionnel pour lectures/GUID/écritures, zéro FCM/activité. Concurrence HTTP réelle sous verrou et recontrôle : un seul enregistrement pour même external_id, 201+200 ; A/B simultanés isolés. COMMIT réel puis erreur de confirmation simulée : une seule tentative, aucune publication externe/succès, état durable identifié comme commité. Pas une partition réseau réelle. PIN/GPS zéro/geofence/pauses/clôture et autres suites V01/worker/planning/mémos préparées passent.

Migration MemoReads **non exécutée à nouveau** : `--skip-memo-migration` explicite, preuve antérieure seulement. Aucun nouveau schéma, garde affaibli ou modification d’authentification/provisioning. 58/58 tests applicatifs, script mémos sortie0 et 4/4 tests SFC/socket/dispatch ; types API/BFF/Shared/Cloud réussis, compilation temporaire sans dist actif.

Préflight d’authentification/licence préexistant et sérialisation après commit distincts de l’unité SQL CLOCK_IN ; autres types de pointage non rendus transactionnels par extrapolation. Lots 3–4 proposés dans LOTS_3_4_CONCEPTION_FINALE.md, non implémentés. Aucun feu vert production.


## Dernier passage — stabilisation lots 1–2

**Sortie globale 1 : POINTAGE_SQL_ATOMICITY_REQUIRED + PROVISIONING_RECOVERY_REQUIRED.** Voir STABILISATION_LOTS_1_2.md. Les anciennes observations GPS zéro et cache rouge sont désormais corrigées ; l’atomicité SQL pointage est un défaut distinct nouvellement testé, non corrigé. Aucun déploiement.

PG réel fictif : zéro latitude/longitude, géofencing/anomalies, refus coordonnées invalides sans écritures, memo upsert A/B et migration portable (création, idempotence, droits/sequence/FK/unique, compatibles/incompatibles/rollback) réussis. Worker, planning, concurrence de provisioning nominale, 30 schémas, contextes et cycles de vie préparés réussis. Test supplémentaire : erreur BEFORE INSERT d’entrée conserve une session A/B (4→5 sans entrée), assertion rouge maintenue, détail POINTAGE_ANOMALIE_ATOMICITE_SQL.md. Migration uniquement fictive, existing sans DDL inchangé.

Mocks/sources réelles frontend : memo-contract-review sortie0 ; quatre tests Node SFC/socket/dispatch réussis, plugin Pinia réel, réseau/browser inertes. Cela ne valide pas l’authentification complète Cloud/BFF/API. 58/58 tests applicatifs ; types et builds Shared/API/BFF/Cloud isolés réussis. Aucun ancien AC partiel rendu vert par ces seules réussites. Dernier cluster nettoyé.


## Dernier passage conjoint mémos / V01 — 2026-11-05

**Dernière sortie globale : 1. Les anciens résultats 0 ci-dessous sont historiques.** Voir [MEMOS_INTEGRATION_AVANT_CORRECTIONS.md](./MEMOS_INTEGRATION_AVANT_CORRECTIONS.md). Aucun changement applicatif, migration ou production.

30 modèles réels bootstrap/existing A/B (MemoReads ajouté par l’utilisateur), worker/planning et isolation SQL réussis. Nouvelle suite postgres-memo-review.cjs : upsert brut concurrent, statuts et séparation A/B, non-participant refusé, instance capturée interdite avant SQL ; table absente en transaction fixture annulée. Aucun test de migration exécuté.

Provisioning deux processus HTTP : verrou réel et 30 tables physiques complets, succès. Panne cache après création : état partiel durable, retry échoue existing, **PROVISIONING_RECOVERY_REQUIRED**. Pointage HTTP nominal/PIN/pauses/geofence/anomalies réussi, mais coordonnées zéro refusées après création durable de session, **POINTAGE_ZERO_COORDINATE_REQUIRED**. Handshake interrompu et fermeture DDL sans publication tardive réussis ; aucune garantie de rollback de toute l'initialisation DDL.

Test memo-contract-review.cjs : vraies sources sessions/middleware et vrais stores/plugin, infrastructure simulée, **sortie 1** sur réponse tardive après logout/clearCache. Persistance malgré paths:[] démontrée. Ce test n'est pas une preuve PostgreSQL. TypeScript API/BFF/Cloud réussis ; 58/58 tests applicatifs. Aucun build navigateur ni migration SQL validé. Clusters nettoyés.


**État : suites locales préparées validées, correction worker atomique réussie sur PostgreSQL fictif. AC01–AC40 encore partiels selon la matrice ; aucune certification production ni autorisation de transfert/déploiement.**

PostgreSQL 16.9 (Postgres.app), PostGIS 3.4.4 disponible ; exécutables trouvés dans `/Applications/Postgres.app/Contents/Versions/16/bin`, pas dans PATH. Homebrew présent, aucune formule PostgreSQL installée parmi ses formules listées. Aucune installation, démarrage de service système ou modification permanente du PATH.

## Résultats et confinement

- Passage initial PostgreSQL fictif : sortie 0. Avant correction atomique, sortie 1 sur le worker. Dernière suite étendue après correction : **sortie 0**, toutes les suites préparées passent et le cluster est arrêté/supprimé. Le premier essai sandbox était bloqué par `shmget` ; seuls les essais jetables ont reçu l’exécution hors sandbox.
- **58/58 tests applicatifs**, zéro échec/ignoré, dont dix tests existants de publication planning ; **15/15 sondes framework séparées**. TypeScript API réussi après les corrections ciblées ; backend/shared réussis lors de l’étape précédente, non relancés dans cette reprise car inchangés.
- Deux bases `v01_test_a`/`v01_test_b`, rôles `v01_a`/`v01_b`, droits CONNECT croisés refusés ; cluster créé/possédé par le lanceur, TCP désactivé, socket Unix privé, marqueur aléatoire, paramètres hérités PG/DB écartés. Aucun .env, cache, service de production ou base existante chargé. Compte de contrôle réservé aux fixtures/observations.
- Vrais modules contexte/propriété/manager/gardes/initialiseur, vrai Sequelize 6.37.8, vrai pg 8.23.1 et vrai serveur. Chargement fermé en mémoire ; les 29 définitions applicatives et leurs constantes partagées sont celles du dépôt, pas des définitions fictives substituées. Les données insérées sont exclusivement fictives.
- Bootstrap des 29 modèles dans chacune des deux bases vides (extension PostGIS seule préinstallée). Quatre appelants concurrents par tenant partagent une connexion et une initialisation. Initialisations existing A/B également simultanées.
- Existing après fermeture/reconnexion : event trigger serveur interdisant DDL aux rôles applicatifs ; zéro commande DDL dans le compteur pilote ; snapshots colonnes/index/contraintes/enums identiques avant/après. Ceci valide le schéma actuel créé par le test, pas toutes les variantes historiques de production.
- CRUD du vrai modèle Roles, même code A/B avec contenus distincts, JSONB, contrainte unique réellement rejetée, SQL PostGIS et colonnes géométriques créées. Écritures concurrentes du modèle fixture, contrôle de count/contenu, commits/rollback effectifs. Les définitions enum sont créées/inspectées ; toutes les surcharges de parsing et tous les rejets de valeurs enum ne sont pas exercés.
- Savepoint annulé avec poursuite du parent, afterCommit rejeté après écriture durable, rollback de nettoyage après révocation, tâche héritée expirée sans envoi SQL, transaction abandonnée annulée puis pool fermé. Refus sans contexte/tenant contradictoire vérifiés par compteur d’appels au pilote inchangé.
- Config différente refusée ; fermeture coalescée ; nouvelle génération et rejet de l’ancienne. **Le premier banc utilisait trust ; la recette étendue vérifie désormais une vraie authentification SCRAM et sa rotation dans le seul cluster temporaire.** Fermeture pendant vraie lecture de catalogue : résultat tardif non publié, pool drainé. Bootstrap non vide refusé.

Lanceurs : `packages/api/verification/tenant-isolation/postgres-integration.cjs`, `postgres-scenarios.cjs`, `postgres-schemas.cjs`. Ce banc est une suite d’assertions séquentielles fail-fast ; on ne lui attribue pas artificiellement un nombre de tests Node/TAP.

## Anomalies rencontrées

Le défaut réel de transaction abandonnée est documenté avant correction dans [V01_ANOMALIE_TRANSACTION_ABANDONNEE.md](./V01_ANOMALIE_TRANSACTION_ABANDONNEE.md). Il bloquait la fermeture, sans croisement observé. Correction locale ciblée du garde : rollback lié au propriétaire de l’opération, coalescé et limité au nettoyage. Reproduction finale réussie sans secours. Le handoff antérieur annonçait à tort ce mécanisme comme présent ; cette affirmation est corrigée.

Deux assertions du nouveau banc étaient trop spécifiques à un message attendu : contrainte unique avec message métier plutôt que « Validation error », génération invalidée plutôt que DRAINING lors de fermeture. Alignement sur les classes/codes existants, aucun changement applicatif pour ces écarts. **Dernier passage : aucun échec dans les suites exécutées ; le test de rollback worker passe après correction transactionnelle autorisée.** Des scénarios restent non exécutés ci-dessous.

## Extension métier et résilience exécutée

- `postgres-business.cjs` : vrais User/bcrypt et middleware PIN (valide/invalide), WorkSessions/TimeEntries, quatre entrées ouverture/pause/départ de pause/fermeture, calcul des durées et données A/B distinctes. Il s’agit des classes/persistance et du middleware réels, pas d’une recette complète de la route pointage avec géofencing et anomalies.
- Planning : services réels publication, ajustement journalier, modification en masse et régénération avec vrai solveur GREEDY local, A/B concurrents. Erreurs PostgreSQL injectées par des triggers de fixtures : les transactions de chacun des quatre services annulent leurs écritures ; états relus après échec et comparés. Aucun ORTOOLS externe appelé.
- Master : vraie classe BaseModel Master sur une table fictive de contrôle, SQL indépendant de l’ALS ; vrais utilitaires de création PostgreSQL/roles/extensions et bootstrap de `provisioned.v01.invalid`, puis existing. C’est une troisième base de provisioning jetable en plus d’A/B, dans le même cluster possédé ; aucune route complète de provisioning Master ni tenant réel utilisés.
- Intégrateurs : trois vrais handlers avec SQL A/B, catalogue de tenants adossé à la table Master fictive, profils relus dans chaque base, panne A n’empêchant pas B. Redis, email et délégation d’authentification finale sont des adaptateurs inertes/fictifs, pas des services externes validés.
- `worker-group-filter.postgres.cjs` : régression WORKER-IDS séparée, groupes exacts/exclus, liste vide, worker sans assignations, absence de croisement A/B. Le worker nominal avec assignations passe après le correctif distinct cycle_length, et l’atomicité en cas d’erreur SQL passe désormais après correction distincte.
- `postgres-http.cjs` : vrai Express et transport HTTP sur socket Unix privé, middleware tenant réel, A/B simultanés, erreur SQL arrivant au gestionnaire Express, finish, tâche héritée expirée refusée, tâche indépendante admise avant fin de réponse, requête interrompue et rollback réel.
- `postgres-resilience.cjs` : vrai Client pg avec callback et pg.Query, BaseModel/modèle capturé refusés hors tenant/génération, QueryInterface, SQL réel en erreur puis rollback et réutilisation ; fermeture pendant une authentification réelle tenue par barrière, contradiction de config pending et admissions pendant drainage.
- Dérive simulée dans la seule base fictive : renommage temporaire d’une colonne de mémos, refus du modèle sans réparation, maintien des tables compatibles, restauration explicite de la fixture puis nouvelle génération. Enum invalide réellement refusé et timezone contrôlée.
- SCRAM réel : règle pg_hba limitée à A/son rôle, dans le répertoire temporaire marqué ; mauvais mot de passe refusé, retry, rotation de mot de passe après drainage, ancien pool refusé. Fichier du cluster de test restauré puis cluster détruit ; aucune configuration système/existante modifiée.
- Deux processus Node enfants séparés : marqueur/socket/roles/bases contrôlés, initialiseurs existing simultanés, écritures A/B distinctes et fermeture des pools avant sortie. Aucun ordonnanceur ni worker de production démarré. Pas de garantie de verrou distribué de provisioning ou de rotation déduite de ce test.

Le chargeur métier interdit par défaut toute nouvelle instance Sequelize non injectée. Seul l’adaptateur administratif de test, borné aux bases du cluster, peut construire les connexions du provisioning. Les fichiers, réseau, dotenv, timers cron et entrées serveur ne sont pas exposés aux sources métier. Les données de départ peuvent être insérées sans validation JS générique pour construire les fixtures ; les contraintes PostgreSQL, les gardes tenant et les validations des opérations métier testées restent actifs.

Deux incidents de banc ont été corrigés sans changer le métier : attente erronée d’un tableau au lieu de `null` sur liste vide et comparaison JSON dépendant de l’ordre des clés. Le refus synchrone interne du pool a révélé un défaut V01 réel : [V01_ANOMALIE_POOL_CONTEXT_CLOSED.md](./V01_ANOMALIE_POOL_CONTEXT_CLOSED.md), documenté avant correction, testé rouge puis vert. Le wrapper `_connect` est désormais async, avec les mêmes gardes. Un cluster laissé par ce crash a été arrêté puis supprimé après vérification de son marqueur et de son arrêt.

Corrections séparées : [WORKER_IDS_FIX.patch](./WORKER_IDS_FIX.patch) pour les deux changements worker autorisés ; le correctif de contrat asynchrone appartient à V01. Le champ manquant [V01_ANOMALIE_WORKER_CYCLE_LENGTH.md](./V01_ANOMALIE_WORKER_CYCLE_LENGTH.md) est désormais corrigé après accord, dans [WORKER_LOG_CYCLE_LENGTH_FIX.patch](./WORKER_LOG_CYCLE_LENGTH_FIX.patch). L’atomicité [V01_ANOMALIE_WORKER_ATOMICITE.md](./V01_ANOMALIE_WORKER_ATOMICITE.md) est corrigée localement après accord, dans WORKER_ATOMICITY_FIX.patch.

## Correction cycle_length et preuve initiale d’atomicité (historique)

Seule modification applicative de cette étape : setter du champ existant dans le worker et commentaires ; aucun changement des transactions, calendriers, calculs ou schémas. Patch distinct [WORKER_LOG_CYCLE_LENGTH_FIX.patch](./WORKER_LOG_CYCLE_LENGTH_FIX.patch).

- La longueur effective du tick est la cardinalité des slots utilisée par `computeNextOffset`. Elle est journalisée comme snapshot ; elle n’est pas la durée informative nullable du groupe. Les fixtures utilisent volontairement **97 dans le groupe**, mais **2 slots A / 3 slots B**. Les journaux réels contiennent 2 et 3 ; offsets 0→1, bonne assignation/base, un seul log après double déclenchement local et second passage ignoré.
- `worker-log.postgres.cjs` injecte un véritable refus SQL du journal dans A puis B, l’autre tenant réussissant chaque fois. Une connexion indépendante lit l’offset 1 et la date persistée du tenant en échec, avec nombre de logs inchangé. La trace montre un UPDATE comprenant les deux colonnes puis INSERT séparé, sans transaction commune. Le passage suivant est ignoré : pas de double avancement, mais journal manquant non réparé.
- **Avant correction : WORKER-ATOMICITY en ÉCHEC**, critère complémentaire aux AC historiques. La recette complète sort 1 et conserve l’assertion exigeant le rollback. Les scénarios indépendants continuent et passent ; pas de faux vert fondé sur la seule constatation du comportement actuel.
- Proposition transactionnelle détaillée et tests d’acceptation initialement sans implémentation ; après accord, correction terminée dans [V01_ANOMALIE_WORKER_ATOMICITE.md](./V01_ANOMALIE_WORKER_ATOMICITE.md). Tous les clusters de cette étape sont arrêtés/supprimés. Aucun accès de production.

## Résolution autorisée de WORKER-ATOMICITY — dernier résultat

Le constat rouge de la section précédente est historique. Après autorisation : transaction par assignation, relecture FOR UPDATE et contrôle du jour, lectures groupe/slots et deux écritures explicitement transactionnelles. Le GUID conserve son format/algorithme avec lecture MAX dans cette transaction. Patch distinct [WORKER_ATOMICITY_FIX.patch](./WORKER_ATOMICITY_FIX.patch) ; détail d’implémentation et limites dans [V01_ANOMALIE_WORKER_ATOMICITE.md](./V01_ANOMALIE_WORKER_ATOMICITE.md).

**WORKER-ATOMICITY : VALIDÉ sur PostgreSQL réel fictif. Dernière suite complète préparée : sortie 0.**

- Échecs UPDATE et INSERT, chacun dans A puis B : offset/date et journal intégralement annulés, objets mémoire inchangés, autre tenant réussi. Verrou, UPDATE, GUID MAX, INSERT et terminaison sont tracés sur le même PID PostgreSQL par transaction ; état durable relu par contrôle indépendant.
- Deux invocations indépendantes (sans coalescence), puis deux processus Node, attendent réellement FOR UPDATE sur les mêmes assignations ; après libération une seule transaction avance/journalise, l’autre relit la date et ignore le doublon. Journaux cycle_length 2/3 malgré champ informatif groupe 97.
- Abandon de transaction après les deux écritures : rollback réel V01, aucune publication mémoire, fermeture du pool réussie.
- COMMIT réel suivi d’un signal d’échec simulé via hook afterQuery : failed/processed=0, aucun second COMMIT ni publication mémoire, état durable avancé correctement identifié comme commité. Aucun test de partition réseau réelle revendiqué. Les hooks afterCommit du framework n’étant pas fiables sur cette erreur, seule la résolution de la transaction gérée déclenche la file locale de publication.
- Aucun schéma, calendrier, règle de repos, autre service ou garde d’isolation modifié. Les options facultatives de persistance restent compatibles avec les appels sans transaction. Aucun ancien historique réparé.

## Matrice AC01–AC40

`✓` : scénario demandé couvert et réussi à ce niveau ; `P` : preuve partielle, sans revendiquer tout le critère ; `—` : non exécuté à ce niveau ; `s/o` : niveau non pertinent. Un succès avec mocks/pilote inerte n’est jamais une réussite serveur. Colonnes M = infrastructure simulée ; O = vrai Sequelize avec pilote inerte ; PG = PostgreSQL réel fictif. Les scénarios supplémentaires sont décrits dans la dernière colonne. Les sondes framework sont exclues.

| AC | M | O | PG | Preuve / limite restante |
|---|---|---|---|---|
| 01 | ✓ | — | ✓ | Lectures/écritures A/B concurrentes, classes métier et deux processus. |
| 02 | ✓ | — | ✓ | Vrai middleware + HTTP Unix + PG A/B ; extracteur/cache de test explicites. |
| 03 | ✓ | — | ✓ | Single-flight dans chaque processus ; pas de pool global entre processus. |
| 04 | ✓ | — | ✓ | Existing concurrent, dans un processus puis deux processus ; zéro DDL. |
| 05 | ✓ | — | ✓ | Finish HTTP révoque le SQL hérité ; getter hors portée refusé. |
| 06 | ✓ | — | P | Initialiseur refusant une connexion étrangère ; réenregistrement direct spécifique surtout simulé. |
| 07 | ✓ | — | ✓ | Vrai BaseModel capturé : refus hors tenant/portée et ancienne génération. |
| 08 | ✓ | P | P | Transactions étrangères refusées ; toutes les signatures CRUD transactionnelles non exhaustives. |
| 09 | ✓ | — | P | Worker réel nominal et erreurs SQL exécutés, portées closes ; détail des callbacks externes non exhaustif. |
| 10 | ✓ | — | P/ÉCHEC | Route HTTP réelle et bootstrap nominal validés ; reprise après panne post-création en échec, base vide durable non reprise. |
| 11 | ✓ | — | P | Transactions A/B, commits/rollback/savepoints et rollbacks métier ; permutations non exhaustives. |
| 12 | ✓ | — | ✓ | initializeDatabase réel sur le tenant fictif provisionné, portée close après appel. |
| 13 | ✓ | — | ✓ | Vraie erreur SCRAM, fermeture du pool échoué et reprise avec bon credential. |
| 14 | ✓ | — | ✓ | Config contradictoire refusée avant réutilisation. |
| 15 | ✓ | — | P | Worker A/B simultané et deux processus : avancements/logs isolés ; erreur locale ne bloque pas l’autre tenant. |
| 16 | ✓ | — | P | Opérations enfant et transactions étrangères refusées ; imbrication complète surtout unitaire. |
| 17 | — | ✓ | ✓ | SQL/QueryInterface sans contexte refusés avant envoi. |
| 18 | — | ✓ | ✓ | Client natif capturé hors portée/B : compteur SQL inchangé. |
| 19 | — | ✓ | ✓ | Connexions réelles froides, version/SET/OIDs et pool réutilisé. |
| 20 | — | ✓ | P | hooks:false et transaction forgée sur vrai ORM/PG ; toute la surface d’options non exhaustive. |
| 21 | ✓ | ✓ | P | Géré/non géré, savepoints, abandon et worker atomique réels ; mutations adverses complètes non exhaustives. |
| 22 | — | ✓ | ✓ | Révocation/abort HTTP : nouveau SQL interdit, vrai rollback et insertion absente. |
| 23 | — | ✓ | ✓ | afterCommit échoue après commit durable ; aucun rejeu. |
| 24 | ✓ | — | P | Trois handlers + SQL réel ; Redis et authentification déléguée simulés. |
| 25 | ✓ | — | P | Vrai BaseModel Master et SQL sans contexte/pendant portée tenant ; schéma Master complet non testé. |
| 26 | ✓ | P | ✓ | Handshake SCRAM réellement interrompu : zéro SQL, nettoyage/retry ; close durant échange mot de passe interdit publication tardive. |
| 27 | ✓ | — | P | Fermeture pendant validation existing et DDL bootstrap réel vérifiée ; publication refusée/pool fermé. Crash brutal complet non exercé. |
| 28 | ✓ | — | P | Fermetures coalescées, drainage, générations neuves ; toutes les courses de finally non exhaustives. |
| 29 | ✓ | — | P | Contradiction pending/ready et drainage ; coordination de changements entre processus à valider. |
| 30 | ✓ | — | ✓ | SCRAM réel : rotation, ancien mot de passe refusé, nouveau pool et rejet des objets anciens. |
| 31 | ✓ | — | P | 29 schémas + zéro DDL + vraie colonne absente ; autres dérives et schémas historiques non exhaustifs. |
| 32 | ✓ | — | P/ÉCHEC | Création concurrente deux processus HTTP, verrou advisory et 30 tables complets validés ; reprise de provisioning interrompu en échec. |
| 33 | P | — | P | Streams, événements partagés explicitement liés à ALS, erreurs/abort/finish et refus tardif vérifiés ; tous callbacks externes non exhaustifs. |
| 34 | ✓ | — | ✓ | HTTP fini : héritage interdit ; tâche indépendante admise avant finish puis close. |
| 35 | ✓ | ✓ | ✓ | Vrais modèles/BaseModel/connexion natifs refusés hors propriétaire et ancienne génération. |
| 36 | ✓ | — | — | Helpers typés testés en unitaire ; pas d’extension PG spécifique. |
| 37 | ✓ | — | ✓ | Rotation, journaux 2/3, idempotence, rollback UPDATE/INSERT, coalescence et deux processus concurrents sur mêmes assignations vérifiés. |
| 38 | P | — | P | CLOCK_IN/PIN/GPS/geofence nominal, rollback session/entrée/mémo/alerte/correction, concurrence et commit incertain passent ; planning et worker passent. Autres types non certifiés atomiques, autorisations mémos/navigateur complet restant à stabiliser. |
| 39 | — | P | P | Vrais callbacks/pg.Query/bind/JSONB/enums/timezone/PostGIS ; parsing complet non exhaustif. |
| 40 | ✓ | — | s/o | Contrôle AST ; revue complète des accès administratifs et environnement déployé à prévoir. |

## Suite recommandée

1. Faire valider le bilan local du correctif transactionnel terminé. Aucun échec connu restant dans les suites préparées ; ne pas en déduire une réparation des anciens journaux ni une validation de production.
2. Compléter les parcours HTTP/contrats de pointage (géofencing/anomalies) et Master complets, les callbacks/streams partagés, crash/handshake et scénarios DDL/multiprocessus de provisioning pertinents. Aucun test restant n’est présenté comme réussi.
3. Avant toute inspection de production en lecture seule : valider ce bilan, définir précisément les commandes et cibles autorisées ; prévoir vérification versions Sequelize/pg/Node, options ORM/CLS/replication/PgBouncer, schémas historiques, processus/singletons, drainage PM2, sauvegardes/restauration et artefacts de rollback. Aucune de ces inspections de production effectuée ici.

Aucun transfert ni déploiement. Les échecs de tests restent visibles, aucun garde contourné, aucun service réel lancé.
