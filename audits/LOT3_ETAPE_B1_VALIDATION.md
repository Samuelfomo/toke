# TOKÉ — Lot 3 / étape B1 : validation locale des fondations

Date : 9 novembre 2026. **Verdict : VALIDÉ SOUS RÉSERVES**, pour les fondations B1 uniquement. Les tests PostgreSQL A/B et TypeScript passent. Les réserves de portée et de sécurité opérationnelle ci-dessous interdisent de présenter ce résultat comme une activation métier ou une validation de migration réelle.

Références : [contrat](./LOT3_CONTRAT_IMPLEMENTATION.md), [plan B](./LOT3_ETAPE_B_PLAN_IMPLEMENTATION.md). Aucun changement de leurs décisions métier. Aucune source préexistante modifiée ; aucun changement V01, Lot 3-A, provisioning, CLOCK_IN, worker, HTTP ou Cloud. Aucun accès production, aucun déploiement. Toutes les exécutions SQL concernent des bases fictives nouvellement créées par le banc.

## 1. Fichiers livrés — liste exhaustive

Tous ces fichiers sont **créés** pendant B1 ; aucun fichier préexistant n’est modifié :

| Fichier | Objet |
|---|---|
| `packages/api/migrations/manual/memo_foundations_b1_v1.sql` | Migration manuelle transactionnelle, cinq tables de fondations + registre de version, contraintes, fonctions et ACL. |
| `packages/api/src/tenant/persistence/memos/foundations.models.ts` | Déclarations Sequelize des cinq modèles, sans sync, DDL ou associations synthétiques pouvant altérer les FK composites. |
| `packages/api/src/tenant/persistence/memos/foundations.persistence.ts` | Chargeur explicite `loadExisting` et persistance bornée `observeLegacyState`, transaction appartenant au tenant obligatoire. Aucun appelant applicatif ajouté. |
| `packages/api/verification/tenant-isolation/postgres-memo-b1.cjs` | Banc dédié, cluster jetable A/B, schémas réels du dépôt, rôles séparés, tests SQL et du repository. |
| `audits/LOT3_ETAPE_B1_POSTGRESQL.log` | Sortie du dernier banc PostgreSQL réussi et code de sortie. |
| `audits/LOT3_ETAPE_B1_TYPES.log` | Commande et résultat TypeScript API sans émission, contrôle syntaxique du banc. |
| `audits/LOT3_ETAPE_B1_VALIDATION.md` | Présent rapport. |

Les fichiers temporaires de travail et clusters ne sont pas des livrables du dépôt. Les modifications utilisateur préexistantes sont conservées. Aucun reset, clean ou restauration de fichiers n’a été utilisé.

## 2. Schéma SQL réellement installé et testé

Noms physiques conformes au dépôt : `tk_memos.id`, `xa_users.id`, `tk_time_entries.id` sont des PK **INTEGER** ; `xa_work_sessions.id` est une PK **SMALLINT**. Les nouvelles FK de session sont SMALLINT, pas INTEGER par supposition. Tenant implicite par connexion/base : aucune colonne tenant fournie par le navigateur.

Les définitions complètes sont dans le [script manuel](../packages/api/migrations/manual/memo_foundations_b1_v1.sql). Aucun changement des tables parentes, de leurs données, de leurs séquences ou de l’enum des statuts.

| Table | Colonnes et contraintes importantes réellement testées |
|---|---|
| `tk_memo_workflows` | `memo_id INTEGER PK/FK`, responsable INTEGER nullable/FK, état de responsabilité TEXT avec CHECK UNRESOLVED/ASSIGNED/REVIEW_REQUIRED, motif borné, provenance JSONB objet <=16 Kio, cycle/version BIGINT positifs, `last_event_id UUID NOT NULL`, instantané initial JSONB borné, complétude COMPLETE_SINCE_B/LEGACY_INCOMPLETE. ASSIGNED exige un responsable ; UNRESOLVED exige NULL + motif. FK composite `(memo_id,last_event_id)` différable vers l’événement du même mémo. Index de file `(responsibility_state,responsible_user_id,memo_id)`. |
| `tk_memo_events` | UUID PK ; mémo INTEGER/FK ; séquence BIGINT positive ; type TEXT fermé ; acteur HUMAN ou SYSTEM avec CHECK d’identité, auteur effectif INTEGER/FK ou service borné ; acteur délégué réel nullable borné ; responsable instantané/FK ; résultat approved/rejected exigé uniquement sur DECIDED ; date TIMESTAMPTZ serveur ; cycle/version ; événement précédent/lié ; commande UUID et index SMALLINT ; métadonnées objet version 1 <=16 Kio. UNIQUE mémo/événement, mémo/séquence, commande/index. FK composites même mémo pour commande et liens d’événements. Index partiel UNIQUE mémo/cycle sur DECIDED et index mémo/cycle/séquence. |
| `tk_memo_commands` | UUID PK ; mémo et acteur INTEGER/FK ; acteur délégué borné ; action fermée à OBSERVE_LEGACY_STATE en B1 ; payload/résultat JSONB objets <=16 Kio ; date serveur ; UNIQUE mémo/commande. La date est celle de l’écriture transactionnelle, pas une mesure de l’instant exact de commit WAL. |
| `tk_time_raw_observations` | UUID PK ; exactement une FK entrée INTEGER ou session SMALLINT ; `target_key` générée STORED NOT NULL ; champ compatible avec la cible ; valeur TIMESTAMPTZ nullable ; source et qualité fermées ; référence source bornée ; date serveur ; métadonnées objet borné. LEGACY_OBSERVED ne peut pas être RAW_CAPTURED. UNIQUE cible/champ/source/référence et observation/cible/champ. |
| `tk_time_correction_changes` | UUID PK ; mémo/commande/événement et décision optionnelle par FK composites même mémo ; acteur effectif/FK et délégué réel ; justification non vide <=4 000 caractères ; date serveur ; exactement une cible, clé générée ; avant/après TIMESTAMPTZ distincts ; version après = avant +1 ; qualité de provenance ; métadonnées objet borné. Observation brute et correction précédente/rectifiée liées par FK composites sur la **même cible et le même champ**, sans contournement par NULL de la clé générée. UNIQUE commande/cible/champ et cible/champ/version après. Décision absente exige un motif ; référence brute exigée pour qualité RAW_CAPTURED. |
| `tk_memo_b1_migrations` | Registre privé au propriétaire : version b1-v1, rôle runtime, date serveur et signature JSONB du catalogue. Aucun grant runtime direct sur ce registre. |

Toutes les FK sont `ON DELETE RESTRICT` ; aucune cascade destructrice n’est introduite. Les références utilisateur conservent l’identité au lieu de supprimer le journal lors d’une suppression physique. Une future politique d’effacement devra traiter cette contrainte explicitement.

Pas de séquence SQL nouvelle : les identifiants sont UUID, et la séquence d’événements est un numéro par mémo protégé par UNIQUE. Le premier événement est numéro 1 ; les suivants doivent référencer le précédent, avec numéro +1 et cycle/version non décroissants. Les index UNIQUE visés par les FK sont immédiats, comme l’exige PostgreSQL.

## 3. Revue des dépendances, différabilité et intégrité

Ordre de création : commandes → événements → workflow → observations → corrections. Il n’y a pas de cycle de FK entre workflow et événements : workflow référence son événement final, et un **constraint trigger différé** vérifie l’existence/cohérence de la projection depuis l’événement. Cela permet d’insérer événement puis workflow dans la même transaction.

Les liens précédent/lié des événements, dernier événement du workflow, et liens précédent/rectifié des corrections sont `DEFERRABLE INITIALLY DEFERRED`. Les FK commande, parents, observation brute et événement de correction restent immédiates : leurs parents doivent être insérés avant les enfants. Les tests forcent `SET CONSTRAINTS ALL IMMEDIATE` pour révéler les erreurs avant la fin d’une transaction de fixture.

Fonctions/triggers installés :

- `toke_b1_immutable` : refuse UPDATE/DELETE/TRUNCATE ordinaires sur événements, commandes, observations et changements de correction, y compris un UPDATE sans ligne affectée sous le propriétaire. Test TRUNCATE propriétaire avec CASCADE pour atteindre le trigger malgré les FK ; refus runtime testé sans CASCADE.
- `toke_b1_workflow_integrity` : instantané initial et qualification de complétude immuables ; tout changement du workflow exige version +1 et nouvel événement final. Dernier événement, version, cycle et responsable doivent correspondre. Un simple changement de motif sans événement est refusé.
- `toke_b1_event_integrity` : chaîne ordonnée, auteur humain cohérent avec la commande, projection finale présente et correspondant à l’événement le plus récent. Les commentaires/décisions/réouvertures ne sont **pas** implémentés par ces contraintes génériques.
- `toke_b1_correction_integrity` : événement TIME_CORRECTION_APPLIED de la même commande et du même acteur ; référence optionnelle vers un vrai DECIDED ; provenance identique à l’observation référencée ; continuité avant/après et versions ; rectification vers le passé. Ces contraintes préparent les futurs writers mais ne modifient aucun pointage.
- `toke_b1_observe_legacy` : seule écriture SECURITY DEFINER exposée au rôle runtime B1. Elle observe le statut, le dernier validateur et les identités/type connus **maintenant**, verrouille le mémo, enregistre commande + LEGACY_STATE_OBSERVED + workflow non résolu dans la transaction appelante. Elle ne nomme aucun responsable et ne crée aucune décision passée. Aucun horodatage métier n’est reçu du client.
- `toke_b1_version` : lecture bornée de la version installée, sans exposer le registre.

Les fonctions persistantes fixent `search_path=pg_catalog,public`, les tables sont qualifiées, les noms de rôle dynamiques sont quotés, aucune commande SQL arbitraire n’est acceptée. La fonction temporaire de migration calcule la signature des colonnes/defaults/types/nullabilités, contraintes, index, triggers, propriétaires/ACL et définitions de fonctions. Une installation connue mais divergente est refusée ; aucune réparation automatique.

## 4. Droits de migration et runtime

Tests avec rôles réels, dans chaque base jetable :

| Rôle | Droits de fixture / comportement vérifié |
|---|---|
| `fixture_a` / `fixture_b` LOGIN | Propriétaires des tables historiques fictives, bootstrap initial via l’initialiseur inchangé. Aucun usage pour écrire les nouvelles fondations après migration. |
| `migrate_a` / `migrate_b` NOLOGIN | Propriétaires dédiés des nouvelles tables/fonctions ; ni superuser ni CREATEROLE. USAGE/CREATE public, TEMP base, REFERENCES sur les quatre parents, SELECT sur mémos et UPDATE **de la colonne id seulement** pour permettre SELECT FOR UPDATE. Aucun UPDATE de pointage dans la migration. Exécution du script après SET ROLE, avec les seuls privilèges de ce rôle. |
| `runtime_a` / `runtime_b` LOGIN | Ni propriétaire, ni superuser, ni CREATEDB/CREATEROLE/BYPASSRLS, ni membre du propriétaire. CONNECT uniquement à sa base fictive ; USAGE public, pas CREATE. SELECT sur les anciennes tables de fixture pour permettre les descriptions de schéma existing ; SELECT sur les cinq tables B1 ; EXECUTE uniquement sur observation et version. Aucun INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES sur les fondations. Aucun SET ROLE migration possible. |
| `b1_control` | Superuser de **ce cluster créé par le test seulement**, pour initdb/PostGIS et création des rôles/bases. Les commandes runtime et les migrations sont testées sous leurs rôles séparés, pas sous ce superuser. |

Les confirmations dans la même session doivent désigner explicitement base, propriétaire courant et runtime (`toke.migration.expected_database`, `expected_role`, `runtime_role`). Sans elles : arrêt. Le runtime ne doit pas posséder les tables parentes, ni avoir CREATE public. Les droits d’écriture hérités sur les nouvelles tables font aussi échouer l’installation/réexécution. Les grants par défaut publics/runtime sont révoqués explicitement.

**Limite fondamentale :** aucun trigger ne protège contre un propriétaire malveillant désactivant lui-même les triggers, ou un superuser. La séparation des rôles et le contrôle des opérations DBA sont une précondition, pas une propriété magique du journal en ajout seul. Les schémas tenant existants utilisant leur rôle runtime comme propriétaire doivent être revus avant une migration réelle ; B1 ne change ni leurs comptes ni le provisioning pour masquer ce problème.

## 5. Idempotence, état initial et historique

Une commande B1 est identifiée par UUID par base. Le contenu canonique JSONB est comparé directement, ainsi que mémo, action, acteur et délégation ; aucun hash susceptible de collision ne remplace cette comparaison. Payload B1 accepté : objet vide uniquement. Même clé et mêmes paramètres : résultat existant, aucune nouvelle écriture. Réutilisation contradictoire : B1_COMMAND_CONFLICT. Nouvelle clé sur workflow déjà observé : refus, sans remplacer l’instantané.

Un verrou consultatif transactionnel sur la clé sérialise les requêtes concurrentes, même si une même clé désigne deux mémos différents ; une collision du verrou ne fait que sérialiser, elle ne fusionne pas les identités de commande. Le mémo est ensuite verrouillé avant création du workflow. Le résultat et les preuves disparaissent ensemble au rollback. Deux sessions runtime indépendantes rejouant simultanément la même commande obtiennent le même résultat et un seul effet durable.

L’installation laisse les cinq tables **vides**. Les cinq statuts historiques sont préservés. Les fixtures comprennent un pointage déjà CORRECTED, des heures courante/real_clocked_at différentes et une ancienne justification sans preuve brute ; toutes ces valeurs restent identiques avant/après.

Un ancien mémo APPROVED explicitement observé pendant le test crée LEGACY_STATE_OBSERVED avec statut observé APPROVED, responsabilité UNRESOLVED, LEGACY_INCOMPLETE et `past_decision_date_known=false` ; aucun DECIDED fictif. Auteur/cible/validator historiques ne deviennent pas un responsable certifié. Aucune observation brute n’est inventée à partir des valeurs historiques. Les insertions de graphes de corrections sont des fixtures positives **annulées par ROLLBACK**, sans modification des sources horaires.

## 6. Résultats exécutés

PostgreSQL **16.15**, Postgres.app. Socket Unix dans un répertoire aléatoire `/tmp/toke-b1-*` marqué par nonce ; TCP désactivé (`-h ''`). Le client du banc refuse tout autre socket, port ou nom de base que son cluster A/B. Aucune variable de connexion ou `.env` existante n’est utilisée. Les bases `v01_test_a` et `v01_test_b` sont nouvellement créées dans ce cluster, pas recherchées sur une instance existante.

Commande :

```sh
PATH="/Applications/Postgres.app/Contents/Versions/16/bin:$PATH" node packages/api/verification/tenant-isolation/postgres-memo-b1.cjs --create-disposable-cluster
```

L’exécution sans le flag est refusée avant toute connexion. Le premier essai sandbox a été arrêté par `initdb` (mémoire partagée interdite), puis le banc seul a été exécuté avec autorisation système. Les premiers essais ont corrigé les fixtures et précisé leurs droits de lecture/TEMP, sans affaiblir les assertions d’intégrité. Le dernier passage est réussi, code 0 ; cluster arrêté et supprimé après contrôle du nonce.

| Contrôle | A | B |
|---|---|---|
| Bootstrap du schéma réel à 30 modèles, types PK réels | PASS | PASS |
| Refus sans confirmations, parent attendu incompatible, objet homonyme non versionné | PASS | PASS |
| Installation puis réexécutions avant/après données B1 | PASS | PASS |
| Dérive de colonne/index refusée sans réparation | PASS | PASS |
| Lignes historiques comparées intégralement via `to_jsonb`, statuts et ancien pointage corrigé intacts | PASS | PASS |
| Cinq nouvelles tables vides après DDL : zéro backfill | PASS | PASS |
| UPDATE/DELETE/TRUNCATE runtime refusés, absence de privilège INSERT ; refus par trigger propriétaire sur journaux | PASS | PASS |
| Références inter-mémos workflow/événement et événement/commande refusées ; chaîne sans projection refusée | PASS | PASS |
| Workflow version/motif sans événement et remplacement de l’état initial refusés | PASS | PASS |
| Erreur SQL après DDL : tables, registre et fonctions non installés | PASS | PASS |
| Erreur SQL après observation et FK acteur invalide : rollback du triplet commande/événement/workflow | PASS | PASS |
| Rejeu identique, conflit mémo/délégation, nouvelle clé sur état déjà observé | PASS | PASS |
| Deux connexions concurrentes : un résultat et un effet ; réutilisation contradictoire refusée | PASS | PASS |
| Graphe de correction SQL valide, rollback complet ; cible brute étrangère, provenance incohérente, fausse référence de décision et prédécesseur d’une autre cible refusés | PASS | PASS |
| CHECK exactement une cible, FK inexistante, fausse qualité brute historique, événement de correction incompatible | PASS | PASS |
| UNIQUE partiel : deuxième décision sur même cycle refusée | PASS | PASS |
| Ancien APPROVED observé sans fabriquer DECIDED | PASS | PASS |
| Initialiseur V01 existing + chargeur B1 appelés plusieurs fois sans CREATE/ALTER/DROP/TRUNCATE | PASS | PASS |
| Connexion SQL runtime A vers base B et repository capturé sous mauvais tenant/transaction | PASS | PASS |

Le dernier contrôle d’isolation inclut le refus réel de connexion A→B, et les gardes V01 existants sur le repository/transaction. Le banc n’a pas relancé toutes les suites V01 ou Lot 3-A : leurs sources sont inchangées et B1 ne prétend pas les recertifier.

Autres vérifications : TypeScript API `tsc --noEmit -p packages/api/tsconfig.json` réussi, syntaxe Node du banc réussie. Aucun build avec clean, aucun serveur applicatif, Redis, HTTP, worker ou Cloud lancé pour B1. [Trace PostgreSQL](./LOT3_ETAPE_B1_POSTGRESQL.log), [trace TypeScript](./LOT3_ETAPE_B1_TYPES.log).

## 7. Chargement des modèles et portée applicative

Le chargeur B1 est **opt-in**, sans import dans l’initialiseur V01, le middleware, les routes, le worker ou le provisioning. Il vérifie la version et les colonnes/types/nullabilités, puis définit cinq modèles sur la connexion tenant existante. Il n’appelle jamais sync, ni en existing ni en bootstrap. Les contraintes composites et associations SQL sont définies exclusivement par la migration manuelle, pas par un `belongsTo` générant un DDL simplifié.

Schéma B1 absent : chargement refusé, sans création/réparation de table. L’initialiseur V01 reste à 30 modèles et peut servir les anciens modules indépendamment. La vérification complète des contraintes/grants est faite par la migration et sa signature ; `loadExisting` n’est pas un outil d’audit complet des privilèges ou des triggers après intervention DBA.

Le repository exige la transaction fournie et vérifie son appartenance avec les gardes V01 inchangés. Aucun service n’accorde une permission humaine : l’identité passée au repository doit provenir du principal vérifié et d’une autorisation de la phase suivante. La FK auteur prouve une identité tenant existante, **pas** une autorisation métier. Aucune route n’utilise cette nouvelle écriture et aucune permission D1–D7 n’est implémentée.

## 8. Outbox et préconditions pour la suite

**Outbox non créée en B1.** La seule commande persistable observe un état existant ; elle ne requiert aucune notification ni nouvelle décision du manager. Créer une outbox maintenant introduirait un schéma de destinataires/déduplication sans producteur métier autorisé. Avant activation de décisions/réouvertures ou corrections notifiables, une migration additive d’outbox et une écriture dans la même transaction seront nécessaires ; publication uniquement après commit. Aucun worker existant n’est modifié ici.

Avant toute migration réelle future, autorisation distincte nécessaire, puis :

1. Préflight réel en lecture seule : noms, PK/enum, propriétaires, droits hérités, modèle de rôles tenant, versions et absence d’objets B1 divergents. Préparer un propriétaire NOLOGIN et un runtime non propriétaire sans élargir ses droits métier.
2. Sauvegarde cohérente chiffrée, empreinte du script/version approuvée, restauration vérifiée sur clone et fenêtre d’intervention ; conserver les données et séquences historiques.
3. Confirmer les trois paramètres de session et vérifier la cible avant exécution du script manuel. Aucun hook automatique, `sync()` existing ou modification Master/provisioning n’est prévu.
4. Après installation : comparer lignes/statuts/valeurs historiques, vérifier tables nouvelles vides, contraintes/triggers et privilèges effectifs ; répéter la migration seulement si version/catalogue identiques. Dérive => arrêt, migration corrective revue séparément.
5. Ne brancher les nouveaux writers qu’après validation des capacités métier et de leur atomicité. Le CHECK action des commandes B1 n’autorise que l’observation ; les autres commandes exigent une évolution explicite et versionnée, pas un SQL libre ni une modification silencieuse du script v1 installé.

## 9. Réserves et arrêt B1

- **Garantie bornée aux fondations :** le runtime B1 ne peut modifier workflow/journal directement, et l’écriture bornée conserve commande/état/événement atomiquement. Les anciennes tables `tk_memos` et les anciens writers horaires ne sont pas rétrofités avec un journal obligatoire : c’est interdit dans B1. La garantie globale « toute mutation métier/pointage produit son journal » reste bloquante pour l’activation des phases correspondantes, et n’est pas affirmée ici.
- Les fonctions futures de décision, réouverture, résolution/transfert, conservation/correction et capture brute à l’ingestion ne sont pas implémentées. Les contraintes préparées n’effectuent ni ces actions ni leurs ACL. Aucune correction réelle n’est appliquée par le repository ; les tests positifs de graphe ne constituent pas une validation de l’algorithme de correction.
- La table des commandes est volontairement limitée à un acteur humain d’observation en B1. Les futurs producteurs système et leurs contrats de commande nécessitent une évolution explicite ; aucune fausse identité humaine n’est créée pour contourner cette limite.
- Les rôles propriétaires/superusers et la conservation/effacement restent des préconditions opérationnelles. Aucune purge ni durée arbitraire n’est introduite. Les données brutes perdues dans le passé restent inconnues.
- Les cas PostgreSQL testés concernent le schéma local réel bootstrapé, pas les variantes de toutes les bases clientes. La migration refuse les variantes incompatibles, elle ne les répare pas. Aucun environnement réel n’a été inspecté.
- Les routes sensibles ne sont ni rouvertes ni modifiées ; leur branchement reste interdit avant les phases approuvées. Les réserves V01 et le socle de sessions A restent inchangés.

**Clôture proposée : VALIDÉ SOUS RÉSERVES — B1 testé localement, sans activation métier ni migration réelle.** Arrêt ici ; aucune réalisation B2 engagée.

## 10. Empreintes des sources B1 validées

SHA-256 des fichiers utilisés par le dernier passage réussi ; le script v1 doit être conservé avec cette empreinte avant toute utilisation future.

| Fichier | SHA-256 |
|---|---|
| `packages/api/migrations/manual/memo_foundations_b1_v1.sql` | `50385b33e1de63526d9601ebd3286250e449e01a7c73ac1dff228cc5ae05e2ff` |
| `packages/api/src/tenant/persistence/memos/foundations.models.ts` | `db22165f7649e6e5a3fe299d11e2bcf739296bc6eef1e91b330a52b162c6bf46` |
| `packages/api/src/tenant/persistence/memos/foundations.persistence.ts` | `2c7b724d71b009016ab6cf13ea5902d7e5a7fdfa03dfb7059bad4c9111b3cae3` |
| `packages/api/verification/tenant-isolation/postgres-memo-b1.cjs` | `092b1fb9d6f83dfd5322122803ba85f37961cb29761edf7ac9bbed22d5d6817e` |

Contrôle final : aucune entrée Git préexistante retirée ou changée de statut pendant B1 ; aucun cluster de test B1 marqué restant.
