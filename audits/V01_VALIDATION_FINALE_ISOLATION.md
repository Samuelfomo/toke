# TOKÉ — validation finale locale de l’isolation V01

Date : **6 novembre 2026**. Périmètre : code local actuel, sans modification applicative pendant la recette. Références relues : V01_HANDOFF.md, V01_VALIDATION_POSTGRESQL.md, V01_CONCEPTION_DETAILLEE.md. Les anciennes conclusions générales ou versions de dépendances ne remplacent pas les résultats ci-dessous.

## 1. Verdict et portée de clôture

**VALIDÉ SOUS RÉSERVES.**

Les douze invariants demandés sont étayés sur les parcours exécutés, avec vrais Sequelize/pg/PostgreSQL, contrôles négatifs avant envoi SQL et concurrence. **Aucun défaut de collision V01 n’a été découvert pendant cette recette.** Le complément PostgreSQL ferme notamment une lacune de preuve sur les transactions entre opérations distinctes d’un même tenant.

Ce verdict ne signifie ni « tous les AC sont exhaustivement couverts », ni « la suite globale est verte », ni « la plateforme est prête à déployer ». Les réserves sont la couverture partielle de certaines variantes et les hypothèses de confiance/assemblage précisées sections 6–8. La reprise de provisioning et l’authentification mémos restent distinctes ; leur correction n’a pas été entreprise ici.

**Les deux exécutions PostgreSQL globales terminent avec le code 1, uniquement pour PROVISIONING_RECOVERY_REQUIRED.** Cet échec est conservé, pas filtré en succès. Aucune lecture/écriture sur l’autre tenant n’est observée lors de cet échec ; c’est la reprise d’une base nouvelle vide qui échoue sous son propre contexte.

## 2. État exact testé

- Branche : `1-api-issues`.
- HEAD : `5d4a18ee93ceeb3d00b56d7f41ead2512dbce71d` ; **pas une référence de production vérifiée**.
- Workspace initial : **483 entrées** dans git status porcelain, modifications indexées/non indexées et fichiers non suivis, aucun conflit Git non résolu. Les modifications utilisateur Cloud/BFF/API, V01, worker, mémos et CLOCK_IN sont présentes simultanément.
- Empreintes par fichier, état Git initial et vérification finale : [V01_VALIDATION_FINALE_EMPREINTES.json](./V01_VALIDATION_FINALE_EMPREINTES.json). 1 090 fichiers sources/tests/manifests au relevé initial. Empreinte agrégée initiale : `7c8542ab0d7da623f632b4e51e633cb9c70585d1e6276998f62bd0ec139ac56a`.
- Dernier banc, après ajout du complément : empreinte `a5b59a74e0c4341d5822c71e703c1a90757c4f4a4659b39dcbd57d66783bafa7`. Seules modifications de tests : ajout de `postgres-final-isolation.cjs` et de son nom dans la collection du lanceur existant. **Aucune assertion existante modifiée.** Les nouvelles assertions sont des refus supplémentaires, pas des exceptions aux gardes.
- Contrôle final : tous les fichiers applicatifs/manifests du relevé initial restent identiques octet pour octet. Aucun changement de contrat, configuration, migration, dist, authentification, provisioning ou algorithme métier. Aucune installation, aucun reset/stash/clean Git.
- Les empreintes ne lisent pas les fichiers .env, tokens texte, caches ou données. Elles identifient le code, pas l’environnement déployé. Les fichiers de configuration locale signalés par Git n’ont pas été chargés par cette recette.

### Assemblage local

| Élément | Version relevée |
|---|---|
| Node | 20.18.0 |
| Sequelize | 6.37.8 |
| pg | 8.23.1 |
| Express / router | 5.3.0 / 2.2.0 |
| postgres utilisé via PATH explicite | 16.15, Postgres.app |
| PostGIS | Extension créée/exercée dans A/B ; contrôle installé `default_version = 3.4.6`. La version du catalogue d’extension n’est pas imprimée par ce banc. |

Les mentions historiques PostgreSQL 16.9/PostGIS 3.4.4 dans les rapports précédents ne décrivent pas ce passage. L’identité des dépendances de production reste inconnue. Le garde applicatif exige Sequelize 6.37.8 et refuse les configurations CLS/native/replication non prises en charge.

## 3. Commandes et confinement

Commandes de recette effectivement exécutées, depuis la racine du dépôt :

```sh
git status --porcelain=v1
git log -3 --oneline
node --version
node packages/api/verification/tenant-isolation/run.cjs
node packages/api/verification/tenant-isolation/run.cjs --framework-probes
env PATH="/Applications/Postgres.app/Contents/Versions/16/bin:$PATH" node packages/api/verification/tenant-isolation/postgres-integration.cjs --create-disposable-cluster --skip-memo-migration
# Même commande PostgreSQL rejouée après ajout des assertions finales AC06/16/21/35.
node --check packages/api/verification/tenant-isolation/postgres-final-isolation.cjs
/Applications/Postgres.app/Contents/Versions/16/bin/postgres --version
```

Les sorties sont archivées par un wrapper Python subprocess avec PATH/NODE_ENV de test seulement, sans chargement d’environnement applicatif. Des lectures ciblées rg/sed des sources et un calcul SHA256 avant/après complètent ces commandes ; aucune commande serveur de production.

Le seul lanceur PostgreSQL existant crée son propre cluster marqué et ses sockets privés, sans TCP (`-h ''`), dans `/tmp/v01-pg-*`. Identités fictives principales : A = a.v01.invalid / v01_test_a / v01_a ; B = b.v01.invalid / v01_test_b / v01_b. CONNECT croisé refusé au niveau PostgreSQL. Les bases additionnelles du provisioning et le catalogue de contrôle sont également créés dans ce même cluster jetable. Aucune base IMEDIATIS/DEMO/client n’est utilisée.

Le pilote de fixture exige le socket/port privés et une liste fermée de bases, refuse connectionString/stream arbitraires ; les variables PG/DB héritées sont écartées avant chargement de pg. Les sources sont chargées en mémoire avec imports autorisés/injections explicites ; les points d’entrée des services, dotenv, ordonnanceurs, email, notifications et services de production ne sont pas lancés. Les vrais gardes tenant restent en place. Les adaptateurs administratifs de provisioning sont bornés aux bases fictives. Le compte de contrôle sert aux fixtures/barrières/observations ; le SQL applicatif A/B utilise ses rôles distincts.

**Aucune migration exécutée.** `--skip-memo-migration` garde le fichier SQL MemoReads comme artefact manuel non exécuté et affiche NOT_EXECUTED. La création des 30 structures dans les bases neuves de fixture est un bootstrap de test ; elle ne constitue pas une migration d’une base existante. En existing, le test interdisant les DDL côté serveur est conservé et passe.

Aucun cluster V01 préexistant au démarrage ; arrêt et suppression normaux des deux clusters après les passages ; inventaire final `/tmp/v01-pg-*` vide. Aucun autre service PostgreSQL touché.

## 4. Résultats réels et preuves archivées

| Exécution | Résultat | Preuve |
|---|---|---|
| Tests applicatifs d’acceptation/non-régression | **58/58**, zéro échec/ignoré, sortie 0 | [UNIT.log](./V01_FINAL_2026-11-06_UNIT.log) |
| Sondes de framework séparées | **15/15**, sortie 0 ; ce ne sont pas 15 AC V01 supplémentaires | [PROBES.log](./V01_FINAL_2026-11-06_PROBES.log) |
| PostgreSQL complet, banc existant | Sortie **1**, unique échec reprise provisioning | [POSTGRES.log](./V01_FINAL_2026-11-06_POSTGRES.log) |
| PostgreSQL complet + complément final d’isolation | Sortie **1**, même unique échec ; complément isolation réussi | [POSTGRES_COMPLEMENT.log](./V01_FINAL_2026-11-06_POSTGRES_COMPLEMENT.log) |
| Migration MemoReads | **Non exécutée** | Ligne NOT_EXECUTED des deux logs PG |

Les PASS PostgreSQL sont des groupes d’assertions, pas un nombre artificiel de tests TAP. Le compteur de SQL natif reste inchangé dans les scénarios de refus. Aucun échec de sécurité connu n’est remplacé par une observation « comportement actuel ».

Échec restant exact : `PROVISIONING_HTTP_FAILURES: PROVISIONING_RECOVERY_REQUIRED: interrupted new provisioning cannot resume empty database; no distributed rollback`. Les deux processus de provisioning nominal attendent le verrou réel et obtiennent un schéma complet de 30 tables. Après la panne cache injectée, la base/les métadonnées restent partielles et la reprise existing échoue. **Ce constat ne démontre pas une collision A/B ; il reste un blocage du chantier provisioning et de la release.**

Avertissements attendus : erreur de confirmation simulée après vrai COMMIT pour worker/CLOCK_IN, destruction de connexion Sequelize correspondante, et avertissement Express sur les promesses provenant du chargeur VM. Ils n’ont pas été assimilés à un rollback ni masqués. Aucun nouveau défaut réel d’isolation n’a justifié l’arrêt anticipé de cette recette.

## 5. Les douze invariants demandés

| Invariant | Preuves exécutées / portée |
|---|---|
| 1 — A/B simultanés ne changent pas de connexion | Barrières SQL et attentes async, CRUD/écritures distinctes, contrôles current_database/current_user et contenus relus ; HTTP réel, métiers et deux processus. |
| 2 — Modèle A capturé interdit sous B | Vrai Model.findAll, hooks:false, BaseModel et QueryInterface ; refus avant SQL. Complément réel sur le modèle capturé et l’initialiseur étranger. |
| 3 — Transaction propriétaire de tenant et opération | A→B refusé ; nouveau complément A→nouvelle opération A refuse query, Client.query et commit sans envoi. La transaction originale reste utilisable par son propriétaire. Savepoints et transactions terminées/forgées couverts selon matrice. |
| 4 — Connexion native gardée | Client pg réel capturé sous A refusé sous B/hors portée ; promesse/callback/pg.Query exercés. Connexion physique liée à une transaction également refusée dans une autre opération du même tenant. Limite : APIs prévues, pas isolation contre du JavaScript interne hostile. |
| 5 — SQL métier sans contexte actif refusé | query/raw/QueryInterface, modèle/BaseModel et pilote ; compteur natif inchangé. SQL purement Master exécuté séparément sans ALS tenant. |
| 6 — Portée fermée non réutilisable | finish/close/abort HTTP, tâches héritées et callbacks ; refus du nouveau SQL et rollback technique propriétaire, sans réouvrir la portée métier. |
| 7 — Initialisation concurrente bien attribuée | Quatre appelants par tenant, single-flight connexion/modèles ; initialisations existing de deux processus ; modèle A/connexion A ne s’enregistrent pas comme B. Double enregistrement de la même instance refusé. |
| 8 — Pas de publication d’ancienne génération | Barrières authenticate/catalogue/CREATE TABLE, handshake SCRAM interrompu et fermeture pendant acquisition ; résultats tardifs refusés, anciennes instances inactives, pools fermés. |
| 9 — Master distinct et enfants explicites | BaseModel Master réel sans ALS/avec parent tenant, provisioning utilitaire/HTTP, initialisation tenant explicite ; complément parent A restauré après enfant B en échec. Catalogue et licence de fixture, pas schéma Master complet. |
| 10 — Intégrateurs et worker sans tenant résiduel | Trois handlers intégrateur réels avec SQL A/B et erreur, worker A/B/séquence/échec/courses deux processus ; portées nettoyées. Services auth/Redis externes simulés, aucun cron réel. |
| 11 — Mémos, pointage, planning sous les mêmes gardes | Upsert brut MemoReads A/B, refus non-participant et objet/contextes étrangers ; CLOCK_IN transactionnel A/B, erreurs de chaque écriture et concurrence ; quatre services planning, solveur GREEDY local et rollbacks SQL ; worker même connexion transactionnelle. |
| 12 — Pas de sélection globale/fallback | Contrôle AST des sources actives + lecture ciblée : pas de propriété globale currentTenant, aucun appel autonome actif à setCurrentTenant. Le symbole conservé ne fait que vérifier tenantScope().tenant. Les variables locales de journalisation nommées currentTenant ne sont pas une sélection globale. |

Points de contrôle relus, sans modification :

- `packages/api/src/tenant/database/tenant.context.ts:61,68,76` : portée active, génération épinglée, ALS.run et restauration.
- `tenant/database/tenant.ownership.ts:20,25,40,49` : enregistrement unique, cohérence contexte/connexion et propriétaire/opération des transactions.
- `tenant/database/db.tenant-manager.ts:51,58,92,136,215` : setter non sélecteur, configuration/single-flight, installation des gardes, drainage/fermeture.
- `tenant/database/tenant.sql-guard.ts:26,51,80,164,181,227,245` : connexion physique, pilote, query/transaction/acquisition et nettoyage limité.
- `tenant/database/db.initializer.ts:55,83,89,165` : publication contrôlée, bootstrap séparé, disponibilité des modèles et getter propriétaire.
- `middle/tenant.middleware.ts:76–84` : durée de vie HTTP liée à finish/close.
- `automate/automate.ts:48`, `master/routes/integrator.route.ts:157,184,250`, `master/routes/tenant.route.ts:825`, `utils/generate.database.ts:155` : frontières explicites.
- `tenant/model/MemoReadsModel.ts:22`, `tenant/routes/time.entries.route.ts:314`, `automate/rotation.cron.ts:122` : nouveaux accès bruts et transactions métier sur connexions gardées. Tous les chemins courts ci-dessus sont sous `packages/api/src/`.

## 6. Synthèse AC01–AC40

Légende : **M** = application avec infrastructure simulée ; **O** = vrai ORM/pilote inerte ; **PG** = vrai PostgreSQL fictif. ✓ = scénario exécuté et réussi, P = couverture partielle, — = non exécuté à ce niveau, s/o = preuve non SQL. Les sondes ne remplissent aucune case par elles-mêmes. **I** = isolation stricte ; **C** = compatibilité/cycle de vie ; **H** = volet hors isolation dont l’état est conservé. Une case ✓ ne prétend pas couvrir toutes les permutations du framework.

| AC | M | O | PG | Portée | Preuve et réserve résiduelle / partie hors périmètre |
|---|---|---|---|---|---|
| 01 | ✓ | — | ✓ | I | A/B async, lectures/écritures/commits séparés, deux processus. Pas un test de charge long. |
| 02 | ✓ | — | ✓ | I/H | Middleware et HTTP réels A/B ; cache/extracteur injectés. Authentification de l’utilisateur hors V01. |
| 03 | ✓ | — | ✓ | I/C | Single-flight connexion local à chaque processus ; pas de pool mémoire distribué revendiqué. |
| 04 | ✓ | — | ✓ | I/C | Initialisation existing concurrente, 30 modèles, zéro DDL ; pas toutes les variantes historiques. |
| 05 | ✓ | — | ✓ | I | Aucune portée résiduelle après HTTP, requête tardive refusée. |
| 06 | ✓ | — | ✓ | I | Complément réel : réappropriation connexion refusée, initialize A sous B refusé avant SQL. |
| 07 | ✓ | — | ✓ | I | Objet BaseModel A capturé : autre tenant/hors portée/ancienne génération refusés. |
| 08 | ✓ | P | P | I | Transaction étrangère refusée sur CRUD/query ; toutes les signatures CRUD ne sont pas énumérées. |
| 09 | ✓ | — | P | I/H | Worker réel finit ses portées, erreurs incluses ; callbacks de tous services externes non exhaustifs. |
| 10 | ✓ | — | P | I/H | Contexte provisioning nominal/retour parent corrects ; **reprise métier en échec** (hors collision), conservée. |
| 11 | ✓ | — | P | I/C/H | Transactions concurrentes A/B, commit/rollback/savepoints, CLOCK_IN/worker ; combinaisons métier non exhaustives. |
| 12 | ✓ | — | ✓ | I/C | initializeDatabase réel/portée explicite et close ; restauration du parent également simulée. |
| 13 | ✓ | — | ✓ | I/C | SCRAM erroné, fermeture et reprise, aucun rattachement à un autre tenant. |
| 14 | ✓ | — | ✓ | I/C | Config contradictoire refusée ; pas de réutilisation silencieuse. La première config doit être fiable. |
| 15 | ✓ | — | P | I/H | Worker A/B, erreur A puis B, deux processus ; ordonnanceur et services réels non démarrés. |
| 16 | ✓ | — | ✓ | I | Complément réel : A → enfant B en échec → retour A, identités DB contrôlées ; hors portée après sortie. |
| 17 | — | ✓ | ✓ | I | SQL brut et QueryInterface sans portée refusés avant envoi ; pas protection de tout code administratif arbitraire. |
| 18 | — | ✓ | ✓ | I | Client natif A sous B/hors contexte refusé ; pas sandbox contre accès aux prototypes/protocole par code interne hostile. |
| 19 | — | ✓ | ✓ | I/C | Vraie acquisition, version/SET/OIDs et réutilisation pool, capacité technique bornée à l’assemblage testé. |
| 20 | — | ✓ | P | I | hooks:false/transaction forgée testés ; toutes mutations adverses d’options non exhaustives. |
| 21 | ✓ | ✓ | P | I | Transactions gérées/non gérées et savepoints ; même tenant/autre opération query/native/commit testé PG ; mutations physiques supplémentaires surtout O. |
| 22 | — | ✓ | ✓ | I | Révocation/abort, nouveau SQL refusé et rollback technique réel, sans effet durable de l’insertion abandonnée. |
| 23 | — | ✓ | ✓ | I/H | Commit durable puis erreur reconnue sans rejeu ; atomicité/distribution/notifications exactly-once hors isolation. |
| 24 | ✓ | — | P | I/H | Trois handlers intégrateur et SQL A/B réels ; Redis/email/session finale simulés, permissions lot 3 hors recette. |
| 25 | ✓ | — | P | I/H | BaseModel Master réel sans ALS/avec scope tenant ; catalogue Master complet et tous services Master non testés. |
| 26 | ✓ | P | ✓ | I/C | Handshake SCRAM réellement interrompu, fermeture avant/après attente ; pas toutes les partitions réseau/OS. |
| 27 | ✓ | — | P | I/C/H | Fermeture durant catalogue/DDL bootstrap : aucune publication tardive ; pas de certification crash OS ni de rollback global DDL. |
| 28 | ✓ | — | P | I/C | Fermetures coalescées, drainage, génération suivante ; toutes permutations des finally non exhaustives. |
| 29 | ✓ | — | P | I/C | Config pending/ready/draining contrôlée par processus ; coordination d’une reconfiguration déployée multi-processus non certifiée. |
| 30 | ✓ | — | ✓ | I/C | Rotation credential SCRAM, anciens mot de passe/pool/objets refusés après clôture. |
| 31 | ✓ | — | P | I/C/H | 30 schémas actuels, interdit DDL existing, vraie colonne absente détectée sans réparation ; schémas clients et migration manuelle non testés ici. |
| 32 | ✓ | — | P | I/H | Deux processus sérialisés, base vide bootstrap et base non vide refusée ; **reprise interrompue rouge**, distincte de l’attribution tenant. |
| 33 | P | — | P | I/C | HTTP réel/error/abort/finish/stream et callbacks explicitement liés ; toutes bibliothèques d’événements externes non exhaustives. |
| 34 | ✓ | — | ✓ | I | Héritage tardif refusé ; travail détaché explicite autorisé avec durée propre puis fermé. |
| 35 | ✓ | ✓ | ✓ | I | Getter/modèle/BaseModel/natif et anciennes générations : refus, compteur natif inchangé. |
| 36 | ✓ | — | — | I/C | Rethrow d’erreurs typées testé sur helpers ciblés en simulé uniquement ; pas revue exhaustive des mappings d’erreur de tous métiers. |
| 37 | ✓ | — | ✓ | I/H | Isolation worker et courses réelles multi-processus ; non-régression métier des trois correctifs réussie mais distincte de V01. |
| 38 | P | — | P | I/H | Mémos bruts, pointage/PIN/GPS/CLOCK_IN, quatre services planning/rollback passent A/B ; atomicité de tous autres types, UI et autorisations hors V01. |
| 39 | — | P | P | I/C | Vrai Client callback/promesse/pg.Query, bindings/JSONB/enums/timezone/PostGIS ; parsing et surcharges exotiques non exhaustifs. |
| 40 | ✓ | — | s/o | I | AST sources actives et lecture ciblée : pas setter autonome/CLS/protocole direct ; administration/environnement et code tiers non intégralement couverts. |

La migration MemoReads et sa validation antérieure ne sont pas réattribuées à cette recette. Aucun critère non exécuté n’est déclaré PG validé. Les réserves « P » demeurent dans la matrice, même lorsqu’un sous-invariant précis passe sur le serveur.

## 7. Limites de garantie et risques résiduels

1. **Confiance dans la résolution initiale.** Une portée ALS ne prouve pas les droits de l’utilisateur ni l’exactitude d’un premier mapping tenant→host/base/rôle fourni par un cache administrativement erroné. V01 empêche le remplacement/croisement des propriétaires et générations dans le processus ; il ne devine pas quel client appartient à une base mal configurée. Authentification/permissions, caches de résolution réels et mapping physique restent des prérequis distincts. Ne pas transformer cet avertissement en fallback de connexion.
2. **Code interne de confiance.** Le pilote gardé protège les APIs standard query/QueryInterface/transactions/Client.query exercées. Aucun modèle Node ne constitue une sandbox contre du JavaScript hostile qui remplace des prototypes, modifie le module ou ouvre un socket/pilote indépendant. Ces chemins ne sont pas utilisés dans les sources actives contrôlées ; un nouveau chemin SQL doit être revu et testé. Ne pas prétendre « aucun contournement imaginable ».
3. **Assemblage supporté.** Pas de preuve pour une autre version de Sequelize, CLS, pilote natif/force-native ou replication ; le code refuse ces configurations connues. Les versions pg, router, PostgreSQL et particularités PgBouncer du déployé restent à confronter. Aucun réglage de garde ne doit être désactivé pour adapter la production.
4. **Concurrence et cycle de vie.** Barrières déterministes, pas fuzzing exhaustif ni stress long. Single-flight par processus ; pas une coordination de changement de credentials sur tout le parc. Le SQL déjà envoyé ne peut pas être annulé rétroactivement par la révocation ALS. Requête longue, rollback réseau en erreur ou commit incertain demandent une réconciliation ; pas de réexécution automatique.
5. **Frontières métier/externe.** Master complet, vérification réelle Redis/session intégrateur, tâches externes et toutes formes de callbacks ne sont pas certifiés. Les portées DB de leurs vrais handlers sont exercées avec adaptateurs de fixtures fermés. CLOCK_IN protège son unité métier, pas le refresh préexistant de licence pendant l’authentification, ni tous les autres types de pointage.
6. **Compatibilité et disponibilité.** Schéma historique incompatible => refus ciblé, jamais réparation ou sélection d’un autre tenant. Cela peut rendre un parcours indisponible sans constituer une collision. Échec de provisioning, autorisations mémos et sauvegardes non vérifiées restent des blocages release indépendants.

## 8. Conditions de clôture de V01 et différence avec la production

**Clôture locale possible sous acceptation formelle des réserves**, pour le périmètre : assemblage exact ci-dessus, résolveur/configuration fiables, APIs gardées et frontières testées. Conditions :

1. Approuver ce verdict et les limites M/O/PG de la matrice, sans exiger de V01 la correction du lot provisioning ou des permissions mémos.
2. Conserver les empreintes/logs et les assertions, y compris l’échec global de reprise. Toute modification des sources de contexte/driver/frontières ou des nouveaux chemins SQL impose une revalidation ciblée ; la clôture ne s’applique pas automatiquement à un autre candidat.
3. Confirmer qu’aucun chemin d’accès tenant nécessaire à la release ne passe par un pilote non gardé ou une configuration non supportée. Pour un callback/API tiers non couvert, obtenir une preuve ciblée ou l’exclure explicitement du périmètre déclaré ; pas de désactivation du garde.

Si une clôture **sans réserve de couverture** est exigée, compléter d’abord les variantes d’isolation P (notamment AC08/20/21/27/28/29/33/36/39 et frontières externes AC09/24/25), avec des critères finis à approuver ; ne pas les présenter comme déjà exécutées. La présence d’un P n’est pas, à elle seule, la preuve d’une collision ; tout refus contourné ou SQL sur la mauvaise base deviendrait en revanche immédiatement bloquant et imposerait l’arrêt.

**Avant tout déploiement**, travail séparé et non exécuté ici : identifier le code réellement déployé, vérifier Node/Sequelize/pg et options ORM/CLS/native/replication/PgBouncer, mapping/cache de chaque tenant et droits SQL, schémas historiques/PostGIS/MemoReads, nombre de processus/ordonnanceurs, drainage PM2, sauvegardes restaurables et artefacts de rollback cohérents. Les entreprises partagent les processus : une réussite avec un tenant interne ne prouve pas l’absence d’impact sur les autres.

Une clôture V01 n’est donc pas un feu vert production et ne rend pas verte la release. Aucun correctif lot 3 ou 4, migration ou inspection de production réalisé. **Arrêt après ce rapport, en attente de l’approbation formelle de clôture.**
