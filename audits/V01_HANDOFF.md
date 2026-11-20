# V01 — handoff d’implémentation locale

## Décision officielle — clôture technique locale approuvée le 2026-11-06

L’utilisateur approuve officiellement la clôture technique locale de V01 avec le verdict **VALIDÉ SOUS RÉSERVES**, exclusivement pour la correction des risques de collision entre tenants sur le candidat identifié dans [V01_VALIDATION_FINALE_ISOLATION.md](./V01_VALIDATION_FINALE_ISOLATION.md) et ses empreintes.

- Conserver les rapports, journaux, empreintes et tests de non-régression comme références de V01.
- Ne plus modifier l’architecture V01 sans nouvelle anomalie démontrée ou nécessité de compatibilité documentée.
- `PROVISIONING_RECOVERY_REQUIRED` reste ouvert dans le chantier Master/provisioning ; l’authentification et les permissions mémos restent ouvertes dans le lot 3.
- **Aucune autorisation de déploiement.** Cette clôture ne vaut que pour le candidat local et le périmètre validé, avec les réserves documentées.
- Décision enregistrée uniquement dans ce suivi ; aucune nouvelle implémentation ni aucun test exécuté à cette occasion. Toutes les modifications utilisateur existantes sont conservées.

> Recette de référence du 2026-11-06 : 58/58 tests, 15/15 sondes, deux passages PG sortant 1 uniquement sur la reprise du provisioning ; complément réel même tenant/autre opération réussi. La clôture formelle locale est désormais approuvée. Les bilans suivants restent historiques.


## Dernier état — CLOCK_IN transactionnel et propositions finales lots 3–4

**CLOCK_IN réalisé et validé localement ; release toujours bloquée par le provisioning et l’authentification mémos non implémentée.** Dernier bilan : [POINTAGE_ANOMALIE_ATOMICITE_SQL.md](./POINTAGE_ANOMALIE_ATOMICITE_SQL.md), [LOTS_3_4_CONCEPTION_FINALE.md](./LOTS_3_4_CONCEPTION_FINALE.md). Ces sections remplacent les anciens états « atomicité pointage rouge/non corrigée » ci-dessous.

- Patch distinct **POINTAGE_CLOCK_IN_ATOMICITY_FIX.patch** contre l’état local avant cette mission ; liste exacte POINTAGE_CLOCK_IN_FILES.json. 38 fichiers : propagation facultative explicite dans 35 helpers/classes/modèles de persistance/planning/hiérarchie, route CLOCK_IN, utilitaire d’idempotence et type ClockInOptions. Aucun BaseModel/garde V01, cron ou algorithme worker/planning modifié. Aucun fichier Cloud/BFF de fonctionnalités modifié par cette mission. Les changements utilisateur et les patchs GPS/worker restent distincts.
- Transaction gérée READ COMMITTED sur connexion propriétaire, verrou utilisateur FOR UPDATE et recontrôle idempotent sous verrou. Session, ancienne session corrigée, entrée/acceptation, mémo/lien, alertes et tous leurs GUID/lectures transmis au même objet transaction. Copies privées avant commit, publication réponse et FCM/activité après résolution réussie ; pas d’afterCommit comme preuve ni rejeu automatique après commit incertain.
- Limite explicite : préflight PIN/licence reste inchangé hors unité métier ; il actualise déjà employee_license avant PIN. Sérialisation de présentation après commit. Aucun changement d’authentification autorisé ; pas de promesse d’atomicité globale des autres types de pointage.
- Dernière recette PostgreSQL fictive complète **sortie1 uniquement PROVISIONING_RECOVERY_REQUIRED**. Nouveau postgres-clockin-atomicity.cjs : INSERT session/entrée/mémo/alerte et UPDATE correction refusés A puis B, snapshots complets identiques, une transaction physique, zéro notifications/activité ; concurrence HTTP réellement bloquée sous verrou puis 201+200 idempotent, A/B simultanés ; vrai commit suivi de confirmation perdue simulée, pas de replay/effet externe, état durable reconnu.
- Migration MemoReads **non réexécutée** cette mission, artefact inchangé ; nouvelle option de banc `--skip-memo-migration`, passage marqué NOT_EXECUTED. Validations fictives précédentes conservées comme historiques, aucune migration réelle.
- Non-régression : **58/58**, script mémos sortie0, **4/4** SFC/socket/dispatch, types/builds temporaires Shared→API→BFF réussis, vue-tsc Cloud réussi. Aucun dist actif remplacé. Derniers types temporaires : `/var/folders/q2/j5pdncpx5tg50hs64gt9g6f40000gn/T/toke-types-build-GLl9XK`.
- Incidents de banc : verrou test posé trop tôt bloquait la mise à jour de licence du middleware, donc barrière repositionnée après authentification sans changer l’application. Promesses HTTP du banc désormais collectées ; un cluster marqué laissé par une exception a été arrêté/vérifié/nettoyé, aucun autre service touché. Timestamp fictif futur corrigé dans la fixture, refus métier conservé. Dernière exécution terminée normalement et cluster nettoyé.
- Lots 3–4 **propositions uniquement** : recommandation finale **A renforcée** (preuve de session existante vérifiée jusqu’à l’API, révocation autoritaire, réutilisation du contexte intégrateur Master/Redis ; pas de nouvelle enveloppe signée par requête), avec décisions explicites avant implémentation. Journal Master minimal/états/contraintes et transitions durables proposés ; aucune prise de relais d’un bootstrap incertain, aucun DROP/sync historique.
- Reste à approuver : principal/lifecycle/revocation/délégation lot3 ; journal/migration Master, preuve OID/marqueur, verrou/connexion et politique de revue manuelle lot4. AC10/AC32 provisioning restent partiels/en échec ; AC38 pointage CLOCK_IN corrigé mais autorisations mémos et autres branches restent partielles. Aucun accès/déploiement production.


## Dernier état — stabilisation lots 1–2 (2026-11-05)

**Release bloquée ; aucune production contactée/déployée.** Correctifs mémos et GPS zéro locaux terminés, migration MemoReads testée sur A/B fictifs. Le critère d’absence d’écriture partielle après véritable erreur SQL pointage reste **en échec** : une session persiste quand l’INSERT entrée échoue. Aucun correctif transactionnel pointage appliqué sans accord distinct. Le provisioning interrompu reste également rouge ; lots 3–4 proposés, non implémentés.

Rapports à lire pour reprendre : [STABILISATION_LOTS_1_2.md](./STABILISATION_LOTS_1_2.md), [STABILISATION_LOTS_3_4_PROPOSITIONS.md](./STABILISATION_LOTS_3_4_PROPOSITIONS.md), [POINTAGE_ANOMALIE_ATOMICITE_SQL.md](./POINTAGE_ANOMALIE_ATOMICITE_SQL.md), [MEMOREADS_PROCEDURE_MANUELLE.md](./MEMOREADS_PROCEDURE_MANUELLE.md). Les conclusions de non-modification applicative dans les sections antérieures sont historiques et remplacées par cet état.

- Cloud lot 1 : MemoService tri recent/oldest et upload ; memoStore périmètre tenant/user/génération locale + invalidation complète, persist:false et purge ciblée memo-store ; userStore compteur local (aucun token/contrat serveur changé) ; MemoRealtimeService génération pour tickets/callbacks ; Fetch.Client métadonnée interne Axios rejetant une requête ancienne avant dispatch, aucun header ajouté ; vues memoSidebar/memosView/memoDetailChat/memoCreateChat/AuthenticatedMedia nettoyées et retours tardifs protégés. Dix fichiers Cloud modifiés dans ce lot, modifications utilisateur préservées.
- API lot 1 : uniquement TimeEntriesModel null/undefined au lieu de falsy pour GPS, patch indépendant POINTAGE_GPS_ZERO_FIX.patch. Route pointage inchangée. V01 et les trois patchs worker inchangés. Aucun code BFF/Shared/auth/provisioning modifié par ces lots.
- Lot 2 : nouveau `packages/api/migrations/manual/memo_reads_v1.sql`, pas d’auto-exécution. Migration additive, confirmations base/rôle, transaction/verrou, checks et refus incompatibles. Tests draft sous contrôle fictif et portable sous rôles tenant non superuser : création, idempotence/données conservées, droits/séquence/upsert, FK/unique/NOT NULL/CASCADE, table/index incompatibles et rollback réel de table/séquence réussis A/B. Hash SHA256 portable : 58998ac8efbd5faf803ddcb528b56007ae4a50670d6a7ae9ed65170d38eb5671.
- Tests Cloud/BFF ciblés : memo-contract-review.cjs sortie0, vrais stores/plugin/services, services distants simulés ; quatre tests Node SFC/socket/Axios réussis. Course Axios observée rouge avant correction puis zéro envoi sous nouveau tenant ; tests absence de persistance et maintien de theme, même GUID A/B, liste/détail/lecture/events tardifs et tickets obsolètes. Pas de navigateur complet ni de recette d’autorisation serveur ; lacune /list toujours démontrée, non considérée comme acceptation.
- Non-régression : **58/58** ; compilations Shared→API→BFF sorties tmp réussies ; vue-tsc Cloud réussi ; Vite avec Shared fraîchement compilé, envFile:false/configFile:false, URL fictive, configurations CSS explicites : réussi, avertissement gros bundles. Artefacts locaux seulement : types `/var/folders/q2/j5pdncpx5tg50hs64gt9g6f40000gn/T/toke-types-build-bKPkFU`, Cloud `/var/folders/q2/j5pdncpx5tg50hs64gt9g6f40000gn/T/toke-cloud-build-D7SDaR`. Aucun dist du dépôt remplacé.
- Dernier lanceur PG complet : **sortie1** pour `POINTAGE_SQL_ATOMICITY_REQUIRED` et `PROVISIONING_RECOVERY_REQUIRED`. Nominal pointage/PIN/pauses/géofence, GPS zéro et invalides sans écritures, planning/rollback, Master nominal, intégrateur borné, worker et courses deux processus, mémos/migration et autres gardes/lifecycles préparés passent. Le test pointage SQL utilise un trigger fictif, après erreur compte sessions 4→5 tandis qu’entrées restent 10, en A puis B. Nouveau blocage distinct documenté, aucune règle métier contournée.
- Incidents de banc documentés dans le rapport : délai VM initial, rôle du brouillon non habilité à lire un paramètre PG, fixture CASCADE liée à un autre objet métier et échappement $$ ; tests corrigés sans modification des gardes/contraintes. Un passage a subi un signal9 PostgreSQL externe de cause inconnue ; pg_ctl status=3 vérifié, seul répertoire marqué supprimé. Dernier passage terminé normalement, tous clusters nettoyés.
- Reste : approbations distinctes lot3 principal/sessions/permissions/délégation et lot4 journal durable/preuve de création/reprise sûre ; approbation transactionnelle pointage séparée. Schémas/ACL historiques, sessions expirées, inter-onglets, uploads et navigateur réels, inspection environnement/sauvegardes/rollback demeurent prérequis avant production. Aucun fallback anonyme ou DDL existing introduit.


## Reprise conjointe mémos / V01 — dernier état, 2026-11-05

**Ce bilan remplace les anciennes conclusions de suite globale verte ci-dessous. Release non validée.** Modifications utilisateur Cloud/BFF/API conservées ; aucun fichier applicatif modifié pendant cette reprise. Aucune migration exécutée. Rapport intermédiaire : [MEMOS_INTEGRATION_AVANT_CORRECTIONS.md](./MEMOS_INTEGRATION_AVANT_CORRECTIONS.md).

- Banc PostgreSQL adapté à **30 modèles** après ajout MemoReads (auparavant 29). Deux passages sur clusters jetables propres : dernier **sortie 1** pour pointage coordonnée zéro et reprise provisioning après panne. Tests indépendants poursuivis sans masquer les erreurs.
- Provisioning HTTP réel concurrent deux processus et contrôle des 30 tables physiques : réussis. Échec après création : catalogue/base/cache restent ; retry existing refuse la base vide, blocage confirmé. Aucun bootstrap automatique ajouté.
- Mémos PG : vraies classes et upsert brut A/B concurrents, unicité, refus non-participant et refus hors contexte/génération propriétaire : réussis. Table retirée uniquement dans transaction fixture annulée, memo historique lisible par modèle, statut en erreur puis rollback. Migration proposée dans MEMOREADS_MIGRATION_FICTIVE_PROPOSITION.sql, **non exécutée/non validée**.
- Store réel Vue/Pinia/plugin : **test rouge** MEMO_LATE_RESPONSE après logout + clearCache ; persistance réelle malgré paths:[] confirmée. Sources session/middleware exécutées avec faux environnement : signature/expiration et refus absent/mauvais tenant réussis ; authenticate utilisé par /list admet le seul header tenant sans preuve utilisateur. Pas de test HTTP complet d'exploitation revendiqué.
- Worker : trois patchs distincts inchangés ; nominal, erreurs SQL et courses multiprocessus passent encore. Planning et ses rollbacks passent. Pointage HTTP nominal/geofence/anomalies passe ; zéro latitude/longitude retourne 500 après création durable de session (TimeEntriesModel.ts:920,927), aucune correction métier.
- Streams/events liés explicitement à ALS, interruption HTTP, SQL tardif, handshake SCRAM interrompu, fermeture pendant bootstrap : réussis sur PG fictif. Pas de promesse de rollback global des DDL.
- Vérifications actuelles : **58/58 tests applicatifs**, TypeScript API et BFF, vue-tsc Cloud réussis. Pas de build Vite ni navigateur complet, pas d'import d'environnement réel. Deux clusters arrêtés/supprimés, aucun répertoire /tmp/v01-pg-* restant.
- Nouveaux fichiers de test : memo-contract-review.cjs, postgres-memo-review.cjs. Adaptations tests uniquement : postgres-integration.cjs, postgres-schemas.cjs, postgres-scenarios.cjs, postgres-provisioning-http.cjs et postgres-business-boundaries.cjs (30 modèles) ; postgres-business.cjs relu/réenregistré, pas de correction métier. Le banc de cette reprise reste dans le répertoire verification non suivi préexistant.
- Avant correction : approuver contrat tri name, décodage uploadFile, identité/hiérarchie commune et sessions historiques/intégrateur/révocation, isolation cache, reprise provisioning et traitement pointage zéro. Migration à tester séparément seulement après autorisation. Aucun changement auth/HTTP appliqué.


## Autorisation et décisions approuvées

Implémentation locale autorisée après `V01_CONCEPTION_DETAILLEE.md` : ALS immuable, aucun tenant global/fallback, propriétaires tenant/génération/opération, single-flight, gardes limités aux instances tenant et à leur pilote injecté, frontières HTTP/Master/intégrateurs/worker/utilitaires. CRUD et contrats HTTP conservés, Master indépendant. `existing` sans DDL ; `bootstrap` uniquement provisioning autorisé d’une base nouvellement créée et vide de tables métier. Aucun transfert, déploiement, redémarrage ou accès aux bases réelles autorisé.

## État du candidat

Étapes 1–3 implémentées. **Intégration PostgreSQL réelle fictive réussie sur PostgreSQL 16.9 et PostGIS 3.4.4, le 2026-11-05. État actuel : validation locale réussie des suites préparées ; la correction transactionnelle worker est autorisée, implémentée et validée localement ; la dernière recette PostgreSQL préparée passe, mais les critères globaux encore partiels demeurent à compléter. WORKER-IDS et WORKER-LOG-CYCLE-LENGTH sont des patchs séparés de V01. Aucun déploiement autorisé.**

Postgres.app était installé hors PATH. Aucun outil installé ni service système démarré. Le bac à sable bloque `shmget` : exécution du seul lanceur jetable hors bac à sable, avec les mêmes protections réseau/cibles. Deux bases/rôles distincts, aucun TCP, aucune connexion à une base existante.

Une transaction abandonnée bloquant le drainage a été découverte, documentée avant correction dans [V01_ANOMALIE_TRANSACTION_ABANDONNEE.md](./V01_ANOMALIE_TRANSACTION_ABANDONNEE.md), puis corrigée localement. Le premier handoff annonçait à tort cette protection comme déjà présente ; elle est désormais implémentée et vérifiée sur serveur PostgreSQL fictif. La couverture détaillée par niveau et les critères encore partiels figurent dans [V01_VALIDATION_POSTGRESQL.md](./V01_VALIDATION_POSTGRESQL.md).

## Fichiers applicatifs effectivement modifiés

Sous `packages/api/src/` :

- `tenant/database/db.tenant-manager.ts`.
- `tenant/database/db.initializer.ts`.
- `tenant/database/db.base.ts`.
- Nouveaux `tenant/database/tenant.context.ts`, `tenant.ownership.ts`, `tenant.sql-guard.ts`, `pg.tenant-driver.d.ts`.
- `middle/tenant.middleware.ts`.
- `automate/automate.ts`.
- `master/routes/tenant.route.ts`, `master/routes/integrator.route.ts`.
- `utils/generate.database.ts`.
- `tenant/app.ts`, `master/app.ts` : fermeture des pools tenant et protection des réponses déjà closes côté Tenant.

Aucun changement Cloud/BFF/shared/solveur par cette implémentation. Les modifications préexistantes de l’utilisateur dans le workspace sont conservées. Aucun manifest, lockfile, schéma ou configuration de déploiement modifié.

Tests et documentation : banc `packages/api/verification/tenant-isolation/`, son README et ce fichier. Les premières caractérisations affirmant le bug sont archivées dans `characterization.before-v01.cjs.txt` et exclues du lanceur courant. Les anciens rapports restent historiques ; `inventory.json` est le relevé avant correction.

## Mécanismes implémentés

- ALS par opération ; descripteur gelé ; jeton révocable. Setter conservé comme symbole de compatibilité vérifiant une portée identique, incapable de sélectionner un tenant. Aucun appel actif au setter.
- Portée HTTP jusqu’à finish/close, erreurs de setup traitées dans ALS, handlers async préservés ; après fermeture aucun nouveau SQL métier sous l’ancien jeton. Opérations détachées explicites avec durée de vie propre.
- Registre privé tenant/génération ; configuration comparée en mémoire ; changement silencieux refusé. Une opération ne change pas de génération après son premier accès.
- Single-flight connexion/modèles ; initialisations partagées indépendantes de l’abandon du premier HTTP ; publication après succès et contrôle de génération ; fermeture coalescée et drainage des opérations admises.
- Échec de modèles : génération rendue inutilisable puis retirée après drainage, sans boucle de retry. Un nouveau demandeur peut retenter avec une génération neuve, jamais une Map partielle. Échec de fermeture : génération bloquée et erreur visible.
- Gardes locaux à l’instance : query/transaction/acquisition, hooks, pg.Client injecté. Propriétaires des modèles, transactions et connexions physiques vérifiés ; transaction terminée/étrangère refusée ; rollback technique après révocation ; restauration du parent après savepoint. SQL technique dialecte limité ; client ouvert avant un échec de setup fermé même s’il n’était pas encore dans le pool.
- Transaction racine encore ouverte à la fermeture de sa portée : rollback automatique lié à l’opération d’origine, coalescé avec un rollback déjà en cours. Cette voie de nettoyage n’autorise aucun SQL métier après révocation ; test avec le vrai moteur Sequelize et un pilote inerte, fermeture du pool comprise.
- Sequelize 6.37.8 explicitement vérifié ; CLS global, native/force-native et replication non couverts refusés. Le lockfile actuel correspond à Sequelize 6.37.8 / pg 8.23.1 / Express 5.3.0 ; vérifier le runtime déployé avant toute livraison.
- `existing` : métadonnées en lecture seule, aucun sync. Une table optionnelle manquante/incompatible est signalée et interdite sans désactiver les modèles compatibles. Une base entièrement absente/incompatible ne devient pas prête. Les types/contraintes des schémas historiques de production restent à vérifier séparément ; les 29 schémas actuels ont été testés sur PostgreSQL fictif. Aucun rattrapage automatique.
- `bootstrap` : signal privé de création du provisioning et vérification d’absence de table métier ; tables appartenant aux extensions (PostGIS spatial_ref_sys notamment) exclues du test de vide. Sync uniquement ici, force/alter/hooks désactivés. Base partielle refusée.
- Worker : séquence/horaire/règles conservés ; double déclenchement local coalescé par tenant. Aucun verrou distribué ajouté : un seul worker actif demeure un prérequis.

## Commandes et résultats

```sh
node packages/api/verification/tenant-isolation/run.cjs
node packages/api/verification/tenant-isolation/run.cjs --framework-probes
./node_modules/.bin/tsc --noEmit -p packages/api/tsconfig.json
```

Premier passage : **57/57 tests applicatifs réussis, zéro échec/ignoré**, incluant les dix régressions existantes de publication des plannings. **15/15 sondes ALS/Express/Sequelize réussies séparément** ; elles ne sont pas comptées comme acceptation. TypeScript `--noEmit` réussi sur API, backend et shared. `git diff --check` propre sur les sources API modifiées. Aucun test cloud lancé pour V01.

Lanceur PostgreSQL préparé :

```sh
node packages/api/verification/tenant-isolation/postgres-integration.cjs --create-disposable-cluster
```

Commande utilisée, sans changement du PATH permanent :

```sh
env PATH="/Applications/Postgres.app/Contents/Versions/16/bin:$PATH" node packages/api/verification/tenant-isolation/postgres-integration.cjs --create-disposable-cluster
```

Passage avant extension métier : **sortie 0** (historique, remplacé par le bilan ci-dessous). Tests A/B SQL/modèles/commits/rollback, 29 schémas applicatifs bootstrap et existing concurrents, schémas inchangés et DDL interdit côté serveur en mode existing, JSONB/unicité, PostGIS, savepoints, afterCommit, révocation, tâches détachées, transaction abandonnée, générations/configuration, fermeture pendant initialisation et refus bootstrap non vide. Le cluster a été arrêté et son répertoire supprimé.

Fichiers de tests étendus dans cette reprise : `postgres-integration.cjs`, nouveaux `postgres-schemas.cjs` (schémas et constantes réels chargés sans point d’entrée applicatif), `postgres-scenarios.cjs`. Adaptation de `guarded-orm.test.cjs` pour exiger le vrai rollback automatique plutôt que détruire artificiellement sa connexion. Seul changement applicatif de cette reprise : `tenant.sql-guard.ts`, finaliseur de rollback propriétaire coalescé et annulation des savepoints par le rollback racine.

Les anciennes sorties « initdb absent du PATH » restent historiques : les exécutables existent dans Postgres.app. Aucune installation nécessaire. Aucune URL de substitution admise. Le lanceur crée exclusivement son propre cluster marqué sur socket privé, filtre les variables PG/DB, vérifie les paramètres du pilote et ne charge aucun .env/cache. Une exécution initiale en sandbox a échoué avant SQL (`shmget` interdit). Une première extension du banc attendait à tort un message générique de contrainte unique et une erreur DRAINING au lieu de GENERATION_STALE : assertions corrigées selon les contrats existants, aucun garde contourné. Le défaut réel de transaction abandonnée a ensuite été reproduit avec sortie 1 et nettoyage borné avant sa correction ; le scénario d’abandon de transaction passe sans déclencher ce secours ; cela ne constitue pas une réussite globale de la recette métier étendue.

## Reprise métier / WORKER-IDS — dernier état

Autorisation utilisateur distincte reçue pour corriger uniquement `{ ids: groupIds }` après vérification des contrats. `RotationGroup._list()`/`listAll()`/`BaseModel.findAll()` transmettent le filtre where ; l’absence de résultat de la classe est `null`. Sequelize 6.37.8 prend en charge `Op.in`, dont liste vide. Source worker changée uniquement par import de `Op` et filtre `id: { [Op.in]: groupIds }`. Aucun changement des règles de rotation.

- **Changement métier séparé :** `src/automate/rotation.cron.ts`, patch indépendant `audits/WORKER_IDS_FIX.patch`, test dédié `verification/tenant-isolation/worker-group-filter.postgres.cjs`. Régression passée sur PostgreSQL : sélection exacte, exclusion d’un groupe, vide/IDs absents, worker sans assignations, A/B concurrents.
- **Autre correction strictement V01 :** `tenant.sql-guard.ts`, wrapper interne `_connect` désormais async. Refus d’une portée expirée auparavant synchrone et non intercepté par sequelize-pool ; défaut documenté avant correction dans `V01_ANOMALIE_POOL_CONTEXT_CLOSED.md`, test d’abord rouge puis vert, aucun SQL ni client admis. Test ajouté dans `guarded-orm.test.cjs` et scénario PostgreSQL équivalent.
- Fichiers de recette créés/complétés : `postgres-business-loader.cjs`, `postgres-business.cjs`, `postgres-business-boundaries.cjs`, `postgres-http.cjs`, `postgres-runtime.cjs`, `postgres-resilience.cjs`, `postgres-child.cjs`, `worker-group-filter.postgres.cjs`, `postgres-integration.cjs`. La dépendance Op du test rotation dans `business-boundaries.test.cjs` est injectée explicitement.
- Le lanceur est maintenant UTF8 pour exercer le vrai provisioning. A/B demeurent deux bases/rôles séparés ; la base supplémentaire `v01_provisioned` est créée exclusivement par le provisioning de test dans ce même cluster possédé, puis détruite avec lui. Le `postgres` de contrôle héberge seulement une table Master fictive de test.
- Réussites PostgreSQL : PIN/bcrypt et classes sessions/pauses A/B ; quatre services planning et leurs rollbacks après vraies erreurs SQL ; CRUD Master sans ALS, provisioning réel/utilitaire existing ; trois handlers intégrateur (Redis/auth externe neutralisés) ; HTTP Unix réel, abort/finish/détachement ; contrôles objets capturés, vieux pools, pg.Query/callbacks, erreurs PostgreSQL, fermeture pendant authenticate, schéma incompatible sans réparation, SCRAM avec rotation des credentials et deux processus Node écrivant dans les bonnes bases.
- **Historique avant correction cycle_length :** worker avec assignations retournait `failed:1`, `processed:0`, car le journal exige `cycle_length`, non renseigné dans le cron (omission déjà dans HEAD). Offset et date ont déjà été modifiés avant cet échec ; état vérifié A/B sans log. Panne cache A n’empêche pas l’exécution suivante de B. Document : `V01_ANOMALIE_WORKER_CYCLE_LENGTH.md`. Correction du champ ensuite autorisée et appliquée, voir mise à jour ci-dessous ; correction transactionnelle pas encore autorisée à cette étape historique, désormais achevée ci-dessous.
- **Ancien résultat avant transaction : sortie 1**, uniquement pour le défaut d’atomicité du worker, maintenant reproduit par un échec SQL volontaire du journal. Les suites indépendantes continuent et passent ; aucun échec ignoré/masqué pour rendre la recette verte. Tous les processus/bases du dernier cluster sont arrêtés et le répertoire supprimé ; aucun répertoire `/tmp/v01-pg-*` restant après vérification.
- **Vérifications finales : 58/58 tests applicatifs, zéro échec/ignoré ; TypeScript API réussi ; diff --check API propre.** Sondes framework : 15/15 séparées, non assimilées aux AC. Backend/shared inchangés depuis leur dernière vérification réussie.

Le crash initial du pool a laissé un cluster marqué ; il a été arrêté manuellement via son propre répertoire, son arrêt vérifié avec pg_ctl, puis ce seul répertoire supprimé. Les exécutions suivantes finissent et se nettoient normalement. Aucun service PostgreSQL existant/système touché, aucune installation, aucune production contactée.

## WORKER-LOG-CYCLE-LENGTH — correction autorisée et test d’atomicité

- Correspondance confirmée par le code du modulo (`rotation.cron.ts:225–248,407`), les slots réels et le contrat de snapshot du journal : nombre de positions effectivement utilisé pour cet avancement. Le champ informatif du groupe n’est pas la même mesure. Preuve : groupe.cycle_length=97, slots A=2/B=3, journal.cycle_length=2/3.
- Seule correction applicative de cette étape : `.setCycleLength(templateCount)` avant `log.save()` et commentaires explicatifs, dans `src/automate/rotation.cron.ts`. Patch distinct `audits/WORKER_LOG_CYCLE_LENGTH_FIX.patch` ; le patch WORKER_IDS_FIX.patch reste inchangé.
- Test nominal PostgreSQL passé : offset 0→1, date renseignée, journal lié à la bonne assignation avec previous/new offsets et longueur correcte ; doubles déclenchements locaux coalescés ; passages suivants ignorés, pas de second journal/avancement. A/B isolés.
- Nouveau `verification/tenant-isolation/worker-log.postgres.cjs` : refus BEFORE INSERT du journal A, puis B, pendant succès de l’autre tenant ; observation depuis connexions de contrôle indépendantes. UPDATE des deux colonnes avant INSERT, aucun BEGIN/COMMIT explicite commun. **Offset/date restent persistés après l’échec, log absent, retry du même jour ignoré.**
- Historique avant correction : critère supplémentaire WORKER-ATOMICITY en échec (`WORKER_ATOMICITY_REQUIRED`), sortie globale 1. Ce n’est pas un échec du champ cycle_length corrigé, et ce constat n’est pas un test de rollback réussi.
- Historique : défaut et proposition transactionnelle alors **non implémentée**, dans `audits/V01_ANOMALIE_WORKER_ATOMICITE.md` : transaction par assignation, relecture/verrou FOR UPDATE, propagation du même objet transaction à l’UPDATE, au GUID et à l’INSERT ; publication mémoire/processed après commit. Accord ensuite obtenu ; implémentation et résultats dans la section suivante.
- `postgres-business.cjs` et le mock de journal de `business-boundaries.test.cjs` complétés. **58/58 tests applicatifs et TypeScript API réussis** après ce changement. Les autres suites PG fictives passent ; aucun cluster restant après nettoyage.

## WORKER-ATOMICITY — dernière étape autorisée et achevée

- Autorisation utilisateur explicite reçue pour la transaction par assignation. Correctif conservé dans `audits/WORKER_ATOMICITY_FIX.patch`, séparé de V01, WORKER_IDS_FIX et WORKER_LOG_CYCLE_LENGTH_FIX. Les anciennes notes d’atomicité rouge ci-dessus restent historiques et sont remplacées par ce bilan.
- Fichiers source de cette étape : `automate/rotation.cron.ts`, `tenant/database/db.base.ts`, `tenant/class/RotationAssignments.ts`, `tenant/model/RotationAssignmentsModel.ts`, `tenant/class/RotationAssignmentLog.ts`, `tenant/model/RotationAssignmentLogModel.ts`, `tenant/class/RotationGroups.ts`.
- Transaction READ COMMITTED, relecture FOR UPDATE active/non supprimée et recontrôle du jour sous verrou ; groupe/slots relus sur la transaction. UPDATE offset/date, GUID et INSERT propagés explicitement au même objet transaction. Aucun changement de règle, schéma, contrat HTTP, autre service ou garde V01.
- Interfaces : options transaction facultatives à insertOne/randomGuidGenerator et aux sauvegardes rotation. Sauvegarde transactionnelle : callback interne requis pour enregistrer les publications mémoire. Le worker les exécute après résolution du commit géré ; aucun hook afterCommit Sequelize utilisé comme preuve de confirmation (le framework les appelle même sur erreur commit).
- **Dernière recette PostgreSQL complète préparée : sortie 0.** Échecs UPDATE et INSERT annulés réellement dans A puis B, autre tenant réussi, état mémoire inchangé ; même PID transactionnel pour verrou/écritures/GUID. Nominal cycle_length 2/3 et idempotence conservés.
- Course réelle sous barrière FOR UPDATE : deux appels indépendants, puis deux processus Node, un seul avancement/log par tenant après relecture. Transaction abandonnée : rollback des deux écritures et fermeture du pool. Simulation d’un signal perdu après COMMIT réel : aucun replay automatique ni publication mémoire, état durable correctement identifié comme commité ; pas une coupure réseau réelle.
- Tests : `worker-log.postgres.cjs` désormais vert, nouveau `worker-atomic-concurrency.postgres.cjs`, mode rotation supplémentaire dans `postgres-child.cjs`, adaptation ciblée du banc métier et du test simulé de rotation. Trace pilote de test enrichie du PID backend.
- **58/58 tests applicatifs et TypeScript API réussis.** Les suites PG métier/résilience précédentes passent. Tous les clusters sont arrêtés et supprimés après tests ; aucune production contactée. Détail : `V01_ANOMALIE_WORKER_ATOMICITE.md`.

## Couverture AC et validations manquantes

Voir la matrice explicite **AC01–AC40** dans [V01_VALIDATION_POSTGRESQL.md](./V01_VALIDATION_POSTGRESQL.md). Elle distingue mocks, Sequelize réel/pilote inerte, serveur PostgreSQL fictif, défaut corrigé et non-exécutés. Les sondes framework ne rendent aucun AC automatiquement satisfait. La recette PostgreSQL reste partielle pour certains parcours HTTP métier complets et pannes/bootstrap multiprocessus ; le worker nominal, ses rollbacks et les courses multiprocessus passent désormais.

## Risques / limites à conserver pour la reprise

- Versions et interfaces internes Sequelize figées : toute divergence doit être revue, jamais contournée pour faire démarrer les tenants.
- Validation metadata à froid plus coûteuse ; mesurer la latence et les pools avec les vraies structures fictives.
- Table incompatible : fonction concernée refusée avec diagnostic, autres tables compatibles disponibles. Aucun ancien schéma de client inspecté/corrigé.
- Fermeture : drainage sans seuil de kill arbitraire ; délai opérateur/PM2 et gestion des requêtes longues à valider. Les anciens gestionnaires de signaux restent à confronter à la recette complète ; aucune promesse de zéro interruption.
- État de config/caches partagé entre processus et routage physique PgBouncer non certifiés par un registre mémoire ; changement manuel avec admissions bloquées et consommateurs coordonnés.
- Le travail SQL déjà envoyé ne peut pas être annulé rétroactivement par ALS. Une issue commit inconnue exige réconciliation, pas rejeu automatique.
- Pas de correction V02 ni des autres vulnérabilités ; aucune migration, aucun changement des règles de pointage/planning.

## Opérations restantes

1. Faire valider ce bilan local de la correction transactionnelle terminée. Aucun nouveau correctif métier nécessaire n’est démontré par ces tests ; ne pas réparer automatiquement d’anciens journaux. Aucun transfert/déploiement autorisé.
2. Poursuivre les critères partiels explicitement listés dans V01_VALIDATION_POSTGRESQL.md : route pointage/géofencing/anomalies complète, Master HTTP complet, streams/callbacks externes, pannes au handshake/DDL et contraintes multiprocessus de provisioning. Les deux processus existing et la rotation sur mêmes assignations sont validés ; ne pas en déduire une sérialisation globale du provisioning ni autoriser plusieurs ordonnanceurs en production.
3. Avant toute inspection de production en lecture seule, faire valider le périmètre/commandes ; vérifier ensuite séparément versions/runtime, schémas historiques, singletons, pools/PgBouncer, sauvegardes/restauration, drainage et rollback. Aucun transfert ni déploiement autorisé.

Ne pas lancer build/clean/PM2/migration ou les points d’entrée serveur pour tester. Ne pas reconnecter ce banc à IMEDIATIS ou à une base client.
