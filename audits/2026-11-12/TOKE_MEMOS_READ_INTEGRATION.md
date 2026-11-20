# TOKÉ — Intégration locale des lectures manager B2

Date : 2026-11-12, Africa/Douala.
Verdict : **VALIDÉ SOUS RÉSERVES** — raccordement local et contrats validés par tests simulés ; intégration PostgreSQL réelle et activation production non validées.

## Fonctionnalités implémentées

Deux opérations seulement sont ouvertes par le nouveau raccordement : GET liste et GET détail. Le service `MemoReadsService.read()` et ses règles ACL B2 n'ont pas été modifiés. L'API utilise son principal vérifié, son contrôle tenant et la transaction/ACL existante, sans invoquer les anciens handlers.

Le BFF exécute toujours `TenantConfig.authenticate` puis `authenticateUser`. Après vérification de la session, le nouveau relais compare le tenant de la requête au principal et transmet le bearer manager capturé dans `x-toke-user-session` au client API technique existant. Il ne transmet pas les headers internes fournis par le navigateur et ne considère aucun GUID de requête comme une preuve d'identité.

L'API vérifie de nouveau la session auprès de l'autorité et compare le sous-domaine et la référence tenant à la connexion. Le gateway B2 appelle le service ACL existant ; l'accès refusé au détail conserve son 404 non divulgateur. Les erreurs de session, tenant ou filtres restent des refus. Les erreurs inattendues/prérequis SQL produisent 503, sans repli sur les anciens handlers.

## Activation exclusivement contrôlée

Le nouveau raccordement exige, **sur BFF et API Tenant**, simultanément :

- `NODE_ENV=test` ou `development` ;
- `MEMO_B2_MANAGER_READS=1`.

Aucun `.env` n'a été modifié pour activer ces paramètres. En production, le flag est ignoré : les verrous restent actifs. Aucun changement PM2/Nginx ou URL publique.

Sur l'API, le flag dédié restreint le gateway à `/memo/list` et `/memo/:guid`. L'ancien flag expérimental `MEMO_B2_LOCAL_READS` reste présent pour son banc préexistant ; cette mission ne l'active pas. Lorsque le nouveau flag est défini, son sélecteur restreint la sélection même si l'ancien flag est aussi défini.

Le BFF garde son middleware global de fermeture après le relais ciblé. Mutations, marque de lecture, événements, statistiques, summary, uploads, fichiers, médias et tickets/socket ne sont pas ouverts par ce raccordement. Les contextes intégrateurs restent refusés par `authenticateUser`.

## Fichiers modifiés ou créés

| Fichier | Intervention |
| --- | --- |
| `packages/backend/src/tools/memo-manager-reads.ts` | Nouveau relais local/test liste/détail, preuve manager et adaptation de réponse. |
| `packages/backend/src/routes/memos.route.ts` | Insertion du relais après les deux contrôles existants, avant le verrou conservé. |
| `packages/api/src/middle/memo-b2-reads.ts` | Sélecteur injectable et activation locale restreinte pour le nouveau flag ; réutilisation de l'ACL B2 inchangée. |
| `packages/backend/verification/memo-manager-reads.test.cjs` | Nouvelle suite de tests à dépendances fermées. |
| `audits/2026-11-12/TOKE_MEMOS_READ_INTEGRATION.md` | Présent rapport. |

Aucun fichier Cloud, service de session, connexion utilisateur/intégrateur ou migration n'a été modifié. Travaux Git existants conservés, sans reset ni staging.

## Contrats publics des deux routes

### GET `/memo/list`

Headers publics : bearer manager actuel et référence `x-api-client`. Filtres existants transmis à B2 : `supervisor`, `offset`, `limit`, `memo_type`, `memo_status`, `target_user`, `search`, `sort`, etc. B2 conserve sa validation ; un `supervisor` différent de l'acteur est refusé.

Route interne : GET `/memo/list`, credentials techniques existants et preuve humaine `x-toke-user-session` séparée.

Réponse Cloud :

```json
{"success":true,"data":{"memos":{"items":[],"pagination":{"total":0,"offset":0,"limit":25}}}}
```

Les items sont les projections B2, avec compatibilité des champs historiques `author_user`, `target_user`, `memo_content`. Les personnes ne contiennent que le GUID déjà autorisé ; leurs noms restent vides, aucune donnée personnelle supplémentaire n'est recherchée.

### GET `/memo/:guid`

GUID numérique positif ou UUID au format déjà accepté par le sélecteur B2. Même authentification et preuve interne. Route interne identique. Réponse : `{success:true,data:{memo:…,history_completeness:…}}`.

L'ACL choisit seule les mémos visibles. Le détail utilise `exchanges` B2 comme `memo_content` compatible Cloud ; ces échanges sont déjà filtrés par le service B2. Les capacités sont conservées, notamment mutations et médias désactivés. Les champs historiques absents (profils complets, date de modification, contenu de liste) ne sont pas inventés.

`memoStore` attend précisément une liste dans `memos.items` et sa pagination ; sans cette adaptation, le tableau B2 serait interprété comme une liste vide. Le détail est déjà extrait depuis `data.memo`. Le Cloud n'est donc pas modifié.

## Tests réellement exécutés

```sh
node packages/backend/verification/memo-manager-reads.test.cjs > /tmp/toke-memo-manager-tests.log 2>&1
```

Premier essai : erreur de syntaxe dans le nouveau test, corrigée. Passage suivant : 17 tests réussis. Après ajout de deux contrôles du véritable service/repository, passage final : **19 tests réussis, 0 échec**, code de sortie 0.

Couverture :

- liste avec chaîne BFF authentifié → gateway API → contrat de lecture, preuve interne exacte et pagination Cloud ;
- détail et conservation des capacités ;
- refus ACL simulé conservé en 404 ;
- absence de session, tenant différent au BFF, tenant différent vérifié indépendamment à l'API ;
- contexte intégrateur interdit ;
- header interne falsifié ignoré et filtre d'acteur contradictoire refusé ;
- six chemins/méthodes hors périmètre restant fermés ;
- production même avec flag et test sans flag restant fermés ;
- erreur B1 remontée comme indisponibilité, sans fallback ;
- vrai chargeur B1 et vrai service B2 face à une fonction B1 absente simulée : seule requête de contrôle version, aucun DDL ;
- vrai service B2 avec une connexion simulée sans table MemoReads : liste vide obtenue, aucun SQL `tk_memo_reads`, prédicat ACL présent et tentative d'usurpation `supervisor` refusée.

**Portée exacte :** intégration en processus des véritables middlewares BFF/gateway API ; vérificateur de session, transports et repository sont simulés dans les tests de chaîne. Deux tests supplémentaires chargent le véritable service B2, dont un le véritable repository B1, mais avec accès SQL simulé. Les fixtures ne sont pas insérées dans une base et ne constituent pas des données métier de remplacement. Les tests ne prouvent pas l'exécution des prédicats ACL sur PostgreSQL ni un parcours HTTP réseau complet.

Aucun cluster/clone PostgreSQL autorisé et préparé n'a été utilisé pour cette mission. Le banc existant `postgres-memo-b2.cjs --create-disposable-cluster` crée et migre un cluster : il n'a pas été lancé pour respecter l'absence de migration automatique demandée. Il reste donc à valider les ACL et contrats sur un clone préparé explicitement par l'opérateur, sans fabriquer de certificats ou contourner le schéma.

## TypeScript et Git

```sh
./node_modules/.bin/tsc --noEmit -p packages/backend/tsconfig.json > /tmp/toke-memo-bff-types.log 2>&1
./node_modules/.bin/tsc --noEmit -p packages/api/tsconfig.json > /tmp/toke-memo-api-types.log 2>&1
```

Résultats : les deux commandes ont terminé avec code 0, sans diagnostic. Le sélecteur a ensuite été élargi au format UUID déjà supporté par B2 et le champ synthétique `updated_at` a été retiré ; les 19 tests finaux portent sur cet état. Aucun build avec nettoyage n'a été exécuté.

```sh
git diff --check -- packages/backend/src/routes/memos.route.ts packages/api/src/middle/memo-b2-reads.ts
```

Résultat : code 0. Les nouveaux fichiers non suivis ne sont pas couverts par ce contrôle Git. Aucun type-check Cloud exécuté : aucun fichier Cloud modifié.

## Prérequis schéma et comportement en leur absence

- B1 : `MemoFoundationsPersistence.loadExisting()` exige `public.toke_b1_version() = b1-v1` et les cinq structures B1 compatibles. Fonction/table absente ou structure incompatible : lecture refusée, 503 générique `memo_read_unavailable`, aucun DDL ni handler historique de secours. La migration manuelle disponible est `packages/api/migrations/manual/memo_foundations_b1_v1.sql`. Sa préparation/exécution demeure une opération séparée autorisée, avec contrôle base/propriétaire/rôle runtime.
- MemoReads : ces deux GET B2 ne lisent ni n'écrivent `tk_memo_reads`. La table n'est donc pas ajoutée artificiellement comme prérequis à leur consultation. L'initialiseur tenant peut signaler ce modèle indisponible sans interdire les modèles compatibles ; ce comportement réel n'a pas été testé sur PostgreSQL ici. Les marques de lecture restent verrouillées. Le suivi historique requiert séparément `memo_reads_v1.sql` et ses droits ; aucune migration effectuée.
- Une absence de statut de lecture ne signifie pas que le mémo est effectivement non lu ; les réponses B2 n'affirment aucun acquittement de lecture.

## Conditions restantes avant production

1. Validation sur un clone de schéma réellement préparé et autorisé, avec sessions Master enregistrées, rôles runtime réels et scénarios auteur/cible/responsable certifié/supérieur/non-participant/inter-tenants.
2. Vérification de la compatibilité UI réelle : pagination, détail textuel, identités minimales, absence de prévisualisation de liste et contrôles de capacités. Des appels automatiques de marque de lecture ou temps réel restent susceptibles de recevoir le refus prévu.
3. Revue sécurité et exploitation de l'ouverture des deux seules routes ; autorisation explicite et mécanisme d'activation production à définir dans une mission séparée. Le flag actuel ne permet pas cette activation.
4. Migrations préalables autorisées et contrôlées, sans attribution synthétique de responsabilité ou invention d'historique ; diagnostic de schéma et renouvellement des connexions si nécessaire.

Aucun succès production ni consultation complète sur PostgreSQL réel n'est revendiqué. Aucun accès production, aucune migration automatique, aucune ouverture des écritures/médias/sockets. Cette mission s'arrête au raccordement local des deux GET et au présent rapport.

## Complément — observation Cloud communiquée par l'utilisateur

Observation réelle rapportée le 12 novembre 2026, sans reproduction par Codex :

- requête : `GET /memo/list?supervisor=4704324334147205&offset=0&limit=25` ;
- contexte tenant communiqué : `100014` ; session manager selon l'utilisateur ;
- statut HTTP : **non confirmé** ; ne pas le déduire du seul corps ;
- corps : `{"success":false,"error":{"code":"memo_permissions_pending"}}`.

Ce résultat confirme un refus par un verrou de permissions dans le parcours effectivement sollicité. Il ne permet pas d'identifier le composant émetteur (BFF ou API), la version déployée ou les paramètres effectifs de ces processus. Le fait que le frontend soit exécuté localement ne transforme pas le BFF distant en environnement de test.

Le raccordement de cette mission reste intentionnellement inactif en production. Une réponse distante identique n'est donc pas une raison de modifier le frontend, l'authentification ou le verrou global. En environnement local contrôlé, les deux processus BFF et API Tenant doivent exécuter le raccordement et satisfaire séparément la condition environnement + flag dédiée ; une seule activation ne suffit pas. Aucun changement d'environnement réel n'a été effectué ici.

### Tests complémentaires terminés

Le chargeur de test accepte désormais des environnements BFF et API distincts. Trois cas ont été ajoutés à `packages/backend/verification/memo-manager-reads.test.cjs` :

1. BFF activé, API désactivée : `memo_permissions_pending`, aucun appel au service de lecture, aucun fallback historique.
2. API activée, BFF désactivé : même refus, sans requête amont.
3. Détail en production avec les deux flags locaux présents : reste fermé.

Commande relancée :

```sh
node packages/backend/verification/memo-manager-reads.test.cjs > /tmp/toke-memo-manager-tests.log 2>&1
```

Résultat final de ce complément : **22 tests réussis, 0 échec**, code de sortie 0. Les 19 cas précédents sont inclus. Il s'agit toujours d'intégration de middlewares en processus avec dépendances simulées, et non d'une validation sur PostgreSQL réel. Aucun prérequis SQL n'a été contourné ni migration exécutée.

Les commandes TypeScript BFF et API listées précédemment ont également été relancées pour couvrir l'état final des sélecteurs. Le statut final est consigné ci-dessous. Contrôle `git diff --check -- packages/backend/src/routes/memos.route.ts` réussi ; ce contrôle ne porte pas sur les nouveaux fichiers non suivis.

Fichiers modifiés par ce complément uniquement : le fichier de tests et le présent rapport. Aucun nouveau changement applicatif ni frontend, aucune configuration modifiée, aucun accès production. Verdict maintenu : **VALIDÉ SOUS RÉSERVES**, en attente de validation PostgreSQL sur un clone préparé et autorisé, puis d'une revue distincte avant toute activation production.

Statut final TypeScript du complément : BFF **code 0**, API **code 0**, aucun diagnostic dans les deux journaux. Aucun code applicatif n'a été modifié après ces contrôles.
