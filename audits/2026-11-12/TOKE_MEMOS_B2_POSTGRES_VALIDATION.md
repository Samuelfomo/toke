# TOKÉ — Validation réelle PostgreSQL des lectures Mémos B2

Date : 2026-11-12, Africa/Douala (WAT).
Verdict : **VALIDÉ pour les scénarios locaux isolés exécutés**, sans autorisation ni activation production.

## Résultat

Le service ACL B2 inchangé et les deux opérations GET liste/détail ont été exécutés sur PostgreSQL **16.15 (Postgres.app)** réel. La validation inclut le relais BFF implémenté précédemment, la vérification indépendante de la session à l'API, les tables/fonctions B1 réelles et les contrôles Redis/Master réels dans le banc.

Résultat final : **code de sortie 0**, **35 groupes de contrôles PASS**, aucune assertion échouée. Il ne s'agit pas d'un décompte de 35 assertions unitaires : plusieurs groupes contiennent plusieurs assertions SQL/HTTP.

Journal persistant : `audits/2026-11-12/TOKE_MEMOS_B2_POSTGRES_VALIDATION.log`.

Aucun défaut applicatif reproductible n'a été identifié dans le périmètre des deux GET. Aucun code applicatif, contrôle de permission, frontend, session, configuration réseau ou `.env` n'a été modifié pendant cette mission.

## Isolation examinée avant exécution

Lecture du banc `postgres-memo-b2.cjs` et de ses dépendances `postgres-runtime.cjs`, `postgres-schemas.cjs`, `harness.cjs`, du chargeur de sessions fermé et des migrations exécutées par le banc.

Garanties constatées :

- option explicite obligatoire `--create-disposable-cluster`, aucun mode de connexion à un cluster existant ;
- nouveau répertoire aléatoire `/tmp/toke-b2-*`, sous-répertoire de données initialisé par `initdb`, socket privé et marqueur propriétaire aléatoire vérifié ;
- PostgreSQL lancé avec `-h ''`, donc sans écoute TCP ; le numéro 15485 ne désigne que le socket dans ce répertoire privé ;
- client PostgreSQL contraint au socket privé, port explicite et bases `postgres`, `v01_test_a`, `v01_test_b`, sans connection string ni stream externe ;
- environnement de lancement PostgreSQL réduit à PATH/locale et retrait des variables PG/DB héritées avant les connexions ; aucun `.env` chargé ;
- schémas/applications chargés par des VM à dépendances fermées, pas par les points d'entrée des serveurs réels ;
- Redis neuf, sans TCP, persistance désactivée, socket privé dans le même dossier ;
- HTTP réservé à `127.0.0.1` et aux ports enregistrés par le banc lui-même ;
- arrêt des serveurs HTTP, déconnexion Redis/SQL, arrêt du Redis enfant, fermeture des pools et `pg_ctl -D <nouveau data_directory> ... stop`, puis suppression du seul répertoire propriétaire jetable.

Un contrôle SQL a été ajouté avant toute création de bases métier de test : `current_setting('data_directory')` doit correspondre exactement au répertoire créé par le banc et `inet_server_addr()` doit être NULL. Il a réussi.

Aucune base PostgreSQL locale préexistante n'a été connectée, migrée ou modifiée. Les noms de bases synthétiques identiques dans un autre cluster ne seraient pas accessibles via ce socket privé.

## Préparation SQL autorisée, uniquement jetable

Le banc crée deux bases synthétiques A/B et, pour chacune, des rôles distincts de fixture, migration et runtime. Le bootstrap construit les tables historiques à partir des déclarations locales, dont `tk_memo_reads`. Il installe PostGIS uniquement si l'extension est disponible dans ce cluster jetable.

La migration réelle `packages/api/migrations/manual/memo_foundations_b1_v1.sql` est exécutée dans ces bases après confirmations explicites de base/propriétaire/rôle runtime. Le vrai repository vérifie ensuite `public.toke_b1_version() = 'b1-v1'` et la structure des cinq tables B1 :

- `tk_memo_workflows` ;
- `tk_memo_events` ;
- `tk_memo_commands` ;
- `tk_time_raw_observations` ;
- `tk_time_correction_changes`.

Les fixtures sont **exclusivement des données de test** : utilisateurs, rôles, mémos, liens hiérarchiques et groupes identifiés par les domaines `.invalid` et libellés du banc. Le responsable certifié synthétique est représenté par des lignes workflow/événement/commande contraintes, insérées uniquement par le rôle de migration du banc. Cela ne démontre ni ne crée une procédure métier réelle d'affectation. Les propositions du résolveur et les champs historiques ne sont jamais transformés en certificats pour contourner les ACL.

Les droits runtime sont ceux prévus par le banc existant. Aucune permission applicative ni concession supplémentaire n'a été ajoutée pour obtenir les résultats. Les modifications de rôles/liens testent explicitement le retrait d'accès puis restaurent les fixtures.

La migration manuelle MemoReads n'a pas été validée séparément ici : sa table existe par bootstrap dans le cluster synthétique. Aucun DDL n'a été appliqué à une base réelle métier.

## Scénarios et résultats SQL réels

Sur **chacune des deux bases**, le service B2 réel a vérifié :

| Scénario | Résultat |
| --- | --- |
| Auteur de mémo | Accès aux mémos dont il est auteur, sans attribution de responsabilité implicite. L'auteur fixture employee voit quatre mémos. |
| Destinataire | Détail du mémo ciblé accessible au destinataire direct. |
| Responsable certifié | Accès au mémo soumis certifié. Le manager direct voit trois mémos : auteur, destinataire et responsable. |
| Supérieur actuel autorisé | Accès au seul mémo de la branche certifiée, total 1. |
| Non-participant | Liste vide, total 0 ; détail refusé en 404. |
| `validator_user` historique seul | Aucun accès indu au mémo foreign/legacy ; 404 du manager non participant. |
| Groupe sans certification | Pas d'attribution rétroactive de responsabilité ni d'accès. |
| Responsable inactif | Accès du responsable refusé ; ses supérieurs perdent l'accès de branche ; projection auteur en REVIEW_REQUIRED. |
| Relation expirée, matrix_report ou cyclique | Pas d'accès de supervision indu. |
| Pagination | Total conservé ; une ligne par page ; offset suivant distinct ; ordre ascendant inverse du descendant. |
| Filtres | Statut et recherche titre bornés aux mémos autorisés ; limit=0 refusé ; supervisor différent de l'acteur refusé en 403. |
| Historique | Aucun backfill ; état historique non certifié reste UNRESOLVED. Les liens média secrets des fixtures sont absents des projections textuelles. |

Le résolveur a aussi exécuté 13 cas par tenant : manager direct unique, groupe seul, priorité directe, managers directs concurrents, groupes concurrents, membre inactif, relation expirée/non directe, cycle, manager inactif, groupes multiples même manager, adhésion future, rôle manager retiré, intervalle incohérent.

Le banc compare les lignes historiques `tk_memos` avant/après les lectures : égalité obtenue. Les compteurs workflow/événement/commande restent **2/2/2 par base**, sans création par les GET. Les transactions de lecture B2 utilisent le niveau repeatable-read et `SET TRANSACTION READ ONLY` du service réel.

Les essais runtime `UPDATE tk_memo_workflows` et `DELETE tk_memo_events` sont refusés avec SQLSTATE **42501**. Le rôle runtime A ne peut pas se connecter à la base B. Un principal A exécuté dans la connexion tenant B est également refusé.

## Chaîne HTTP réelle et raccordement BFF

Le banc existant vérifie déjà l'authentification technique API, les sessions signées et enregistrées dans Redis, l'introspection HTTP Master et le middleware tenant réel. Les sessions synthétiques sont émises par la véritable autorité, pas par un GUID fourni par le client. Les tests de révocation et de jeton réellement expiré restent réussis.

Extension de cette mission : chargement du vrai `memoManagerReads` BFF et des vrais contrôles `TenantConfig.authenticate`/`authenticateUser`, sur HTTP loopback. Le résolveur d'URL tenant/client technique est injecté pour ne pouvoir viser que les deux tenants synthétiques et l'API loopback ; les credentials et la signature de service sont ceux fictifs du banc. Le service de lecture et son SQL ne sont pas simulés.

Pour chaque tenant, les tests BFF → API → PostgreSQL confirment :

- listes auteur/direct/supérieur/non-participant et totaux attendus ;
- détails auteur, cible, responsable et supérieur autorisés ;
- détails hors ACL refusés, réponse opaque identique à un GUID inexistant ;
- filtres, pagination et ordre ;
- absence de session et contexte intégrateur refusés ;
- changement de `x-api-client` vers l'autre tenant refusé pour liste et détail, malgré des GUID identiques entre fixtures A/B ;
- faux header interne navigateur remplacé par la vraie preuve du bearer vérifié ;
- réponse Cloud conservant `memos.items`, pagination et `data.memo`, capacités de mutation désactivées ;
- routes GET summary, événements et ticket restant fermées dans le raccordement BFF ;
- passage indépendant du BFF ou de l'API en production conservant `memo_permissions_pending`.

Les scénarios préexistants API contrôlent aussi les refus de mutations, médias, uploads, HEAD et tickets ainsi que les filtres invalides, le flag désactivé et le verrou production. Ces contrôles n'activent pas ces opérations : ils vérifient leur fermeture. Le banc API historique utilise son ancien flag expérimental pour ses propres scénarios de lecture ; l'extension BFF le retire temporairement et utilise uniquement le nouveau flag restreint aux deux GET.

## Commandes et déroulement réel

```sh
node packages/api/verification/tenant-isolation/postgres-memo-b2.cjs --create-disposable-cluster > /tmp/toke-b2-postgres-validation.log 2>&1
```

1. Première tentative sandbox : échec `initdb` sur la création de mémoire partagée (`shmget`, Operation not permitted), avant migration. Le répertoire jetable a été nettoyé.
2. Relance autorisée hors sandbox du banc existant : code 0, contrôles PostgreSQL/Redis/API réussis, nettoyage terminé.
3. Extension test-only au BFF et contrôle SQL explicite du data_directory ; validation syntaxique du nouveau helper :

```sh
node --check packages/api/verification/tenant-isolation/postgres-memo-bff-reads.cjs
```

Résultat : code 0.

4. Exécution finale autorisée du banc étendu avec la commande principale ci-dessus : **code 0**, 35 groupes PASS, aucune erreur d'assertion. Le journal contient deux avertissements de dépréciation Express sur des promesses provenant des VM, sans échec de scénario.
5. Vérification après fin du processus : aucun dossier `/tmp/toke-b2-*` de cluster restant ; seul le journal `/tmp/toke-b2-postgres-validation.log` correspond au motif. Le code 0 confirme aussi la fin du bloc d'arrêt/nettoyage du banc. Journal copié dans le dépôt après les contrôles.

`git diff --check -- packages/api/verification/tenant-isolation/postgres-memo-b2.cjs` exécuté avec code 0. Le fichier étant nouveau/non suivi dans l'état Git hérité, ce contrôle ne constitue pas une validation exhaustive de son espacement. Aucun build/type-check relancé : seuls des fichiers de banc CJS et des artefacts de rapport ont changé.

## Fichiers réellement modifiés ou créés

- `packages/api/verification/tenant-isolation/postgres-memo-b2.cjs` : contrôle SQL supplémentaire d'isolation et appel du helper BFF, sans modification des permissions/ACL.
- `packages/api/verification/tenant-isolation/postgres-memo-bff-reads.cjs` : nouveau helper de validation HTTP BFF/API contre les fixtures PostgreSQL réelles.
- `audits/2026-11-12/TOKE_MEMOS_B2_POSTGRES_VALIDATION.md` : présent rapport.
- `audits/2026-11-12/TOKE_MEMOS_B2_POSTGRES_VALIDATION.log` : journal persistant du passage final.

Tous les autres travaux Git sont conservés. Aucun staging, reset, nettoyage destructif du dépôt ni modification de configuration réelle.

## Limites et conditions avant production

- Résultats sur schémas et données **synthétiques** préparés dans un nouveau cluster, pas sur un clone représentatif des variations historiques de chaque tenant réel.
- Les adaptateurs de résolution tenant/client technique et le contrôle d'activité de l'autorité utilisent les fixtures du banc ; les serveurs de production complets et leur configuration ne sont pas démarrés.
- Pas de test navigateur : affichage des identités minimales, pagination UI et appels annexes encore verrouillés restent à vérifier.
- Pas de validation séparée de l'application de `memo_reads_v1.sql` sur un schéma historique, ni de test de retrait B1 dans ce passage réel. Les validations d'absence de schéma précédentes restent simulées et ne sont pas requalifiées en tests SQL réels.
- Avant activation : revue sécurité/exploitation, état et droits des migrations de chaque tenant, sessions/credentials techniques effectifs, validation sur un clone autorisé, puis décision explicite d'activation limitée aux deux GET. Le flag actuel continue d'être ignoré en production.
- Mutations, uploads, médias, sockets et délégation intégrateur mémos restent hors activation. Aucune autorisation de production n'est déduite de ce succès local.

La mission s'arrête après cette validation et son rapport.
