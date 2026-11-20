# TOKÉ — Mémos : état actuel et blocages démontrés

Date : 2026-11-12, Africa/Douala (WAT), vérifiée localement.
Verdict : **NON VALIDÉ pour une utilisation fonctionnelle complète du module** avec les sources locales actuelles. Diagnostic statique effectué ; module intentionnellement fermé sur le parcours Cloud/BFF de production.

## Conclusion

Le module ne peut pas fonctionner de bout en bout simplement en créant `tk_memo_reads`. Deux sujets indépendants sont démontrés :

1. Un schéma historique peut manquer de la table de lectures désormais référencée par les modèles ; une migration manuelle existe.
2. Les routes métier sont explicitement verrouillées dans le BFF et l'API Tenant en attendant les permissions. Une expérimentation de lectures B2 existe uniquement en test/développement et ne supprime pas ces verrous de production.

Aucun code, `.env`, contrôle d'autorisation ou migration n'a été modifié/exécuté. Aucun accès production.

## 1. Parcours Cloud → BFF → API Tenant

Le Cloud utilise `packages/cloud/src/service/MemoService.ts`, le store `memoStore.ts` et le client `Fetch.Client.ts` : liste, détail, création, réponse, validation/rejet/révocation, marque de lecture, pièces jointes et ticket temps réel. Le client ajoute la preuve manager ou le couple intégrateur/contexte selon le mode existant et possède une protection de génération pour les requêtes mémos. Le store contrôle aussi sa portée utilisateur/tenant avant de publier une réponse.

Correspondances examinées, toutes actuellement derrière le verrou BFF :

| Opération Cloud/BFF | Relais API prévu par le code historique |
| --- | --- |
| GET `/memo/list?supervisor=…` | GET `/memo/list` |
| GET `/memo/:guid` | GET `/memo/:guid` |
| POST `/memo/memo` | POST `/memo/manager` |
| PATCH `/memo/reply/:guid` | PATCH `/memo/:guid/manager-respond` |
| PATCH `/memo/validate/:guid` | PATCH `/memo/:guid/validate` |
| PATCH `/memo/rejet/:guid` | PATCH `/memo/:guid/reject` |
| PATCH `/memo/revoke/:guid` | PATCH `/memo/:guid/revoke` |
| PATCH `/memo/:guid/read` | PATCH `/memo/:guid/read` avec `user_guid` issu de la session vérifiée au BFF |
| POST `/memo/attachments` | POST `/upload/attachments` |
| GET `/memo/?url=…` | Proxy de fichier historique |
| POST `/memo/realtime-ticket` | Ticket BFF et demande de ticket API |

Les différences de nommage entre les routes publiques et internes ci-dessus sont des adaptations existantes, pas la preuve d'une route manquante. La présence de handlers historiques ne prouve pas qu'ils soient accessibles ou conformes au futur workflow.

Sources : `packages/backend/src/routes/memos.route.ts`, `services/user.service.ts`, `tools/api.factory.ts`, `packages/api/src/tenant/routes/memos.route.ts`, `packages/backend/app.ts` et `packages/api/src/tenant/app.ts`.

## 2. Blocage démontré : fermeture globale BFF

Dans `packages/backend/src/routes/memos.route.ts`, avant tout handler :

```ts
router.use(TenantConfig.authenticate, TenantConfig.authenticateUser, (_req, res) => {
  res.status(503).json({ success: false, error: { code: 'memo_permissions_pending' } });
});
```

Ce middleware ne poursuit pas avec `next()`. Une session manager correctement vérifiée reçoit donc 503 ; liste, détail, écritures, lectures de fichiers, uploads et tickets sont inaccessibles sur ce parcours. Des requêtes invalides peuvent recevoir 401/403 avant d'atteindre ce 503.

`TenantConfig.authenticateUser` refuse explicitement un header `x-integrator-context`. L'accès intégrateur au dashboard ne confère donc pas d'accès aux mémos. Ce refus est une frontière volontaire, à conserver.

**Correction minimale recommandée :** ne pas supprimer ce middleware. Finaliser et valider les autorisations correspondant aux opérations à ouvrir, puis prévoir une activation bornée et autorisée avec propagation de preuve jusqu'à l'API. Il s'agit d'une évolution de sécurité future, pas d'un défaut à contourner pendant ce diagnostic.

## 3. Blocage démontré : fermeture API et exception B2 locale

L'ordre effectif dans `packages/api/src/tenant/app.ts` est :

1. `ServerAuth.authenticate` ;
2. `memoB2ReadGateway` ;
3. `managerSessionBoundary` ;
4. middleware tenant et montage des routes métier.

`packages/api/src/middle/manager-session.ts` intercepte `/memo` et `/upload`. Il exige une preuve humaine `x-toke-user-session`, refuse les preuves intégrateur, vérifie le tenant et la session auprès du Master, puis renvoie intentionnellement `memo_permissions_pending` même après vérification réussie.

`packages/api/src/middle/memo-b2-reads.ts` fournit une exception de lecture sur une allowlist exacte, mais exige simultanément :

- `NODE_ENV` égal à `test` ou `development` ;
- `MEMO_B2_LOCAL_READS=1` ;
- authentification technique et preuve de session manager vérifiée ;
- concordance de l'identité, du sous-domaine et du tenant de la connexion.

L'exception couvre notamment listes, détail, événements et statistiques ; elle ne couvre pas les mutations ni les médias. En production, même avec le flag, elle retombe sur le verrou. Le BFF actuel ne fournit pas de passerelle d'ouverture B2.

**Correction minimale recommandée :** conserver cette séparation. Ne pas définir artificiellement `NODE_ENV=development` en production ni activer un flag comme substitut à une validation de permissions.

## 4. Permissions et workflow réellement présents

`packages/api/src/tenant/memos/reads.service.ts` implémente une ACL de lecture centrale : auteur ou cible, ou responsable certifié/supérieur autorisé. Le champ historique `validator_user`, l'appartenance à une équipe/groupe et une simple proposition du résolveur n'accordent pas à eux seuls la lecture. Les requêtes utilisent un principal vérifié et une transaction de lecture ; un filtre `supervisor` contradictoire avec l'acteur est refusé.

`responsibility.policy.ts` détermine une proposition de responsable selon liens directs actuels, puis groupes, et refuse les structures incohérentes ou concurrentes. Ses résultats portent explicitement `proposalOnly: true` : ils ne constituent pas un certificat persisté de responsabilité. Les supérieurs sont calculés sur une chaîne directe fiable, pas sur les groupes.

Les fondations B1 sont présentes dans `tenant/persistence/memos/` et la migration `memo_foundations_b1_v1.sql` : `tk_memo_workflows`, `tk_memo_events`, `tk_memo_commands`, `tk_time_raw_observations`, `tk_time_correction_changes`. Le repository fournit notamment une observation bornée de l'état historique ; ce n'est pas un branchement complet des anciennes mutations métier sur un workflow autorisé.

Le service B2 expose des capacités de mutation/média désactivées. Les anciens handlers création, réponse, validation, rejet, révocation et leurs contrôles historiques restent dans `memos.route.ts`, derrière les verrous. Leur existence ne permet pas de déclarer le nouveau workflow complet ou les décisions autorisées en production.

**Correction minimale recommandée :** prendre les fondations et lectures comme implémentations partielles, et les anciens handlers comme non réactivables sans revue des ACL et transitions. Aucun journal ou responsable historique ne doit être inventé pour rendre les écrans utilisables.

## 5. `TENANT_SCHEMA_NOT_READY` et `tk_memo_reads`

### Cause locale établie

`MemoReadsDbStructure` définit `tk_memo_reads` et `TableInitializer` l'enregistre parmi les modèles tenant. En mode `existing`, l'initialiseur vérifie tables, colonnes et valeurs d'enum ; il ne crée pas les tables manquantes. Une absence produit un log `TENANT_SCHEMA_NOT_READY` avec `reason: missing-table` et marque le modèle indisponible. Un accès au modèle indisponible est ensuite refusé par `tenant.ownership.ts`.

L'initialisation peut continuer avec les autres modèles compatibles. Un log concernant cette table ne signifie donc pas nécessairement une indisponibilité générale du tenant. L'absence de colonne ou une incompatibilité peuvent aussi produire ce code ; il faut disposer du détail du log réel pour distinguer les cas.

`Memos._readStatuses()` consulte désormais `MemoReads`, et `_markAsRead()` l'écrit après contrôle des participants. La table est donc une dépendance réelle du suivi historique des lectures, pas un nom de table décoratif.

### Migration identifiée

`packages/api/migrations/manual/memo_reads_v1.sql` est additive et explicitement manuelle. Elle crée :

- `id BIGSERIAL PRIMARY KEY` ;
- `memo_id INTEGER` vers `public.tk_memos(id)` ;
- `user_id INTEGER` vers `public.xa_users(id)` ;
- `read_at TIMESTAMPTZ` avec valeur par défaut ;
- l'index unique `(memo_id, user_id)`.

Elle exige dans la même session les confirmations `toke.migration.expected_database` et `toke.migration.expected_role`, vérifie les parents, le propriétaire, les colonnes, les clés étrangères, l'index et des droits. `CREATE TABLE IF NOT EXISTS` ne répare pas silencieusement une table incompatible : les assertions peuvent annuler l'opération. Aucun lanceur automatique n'a été identifié pour cette migration.

**Correction minimale recommandée si l'absence réelle est confirmée :** revue et application autorisée de cette migration sur chaque base tenant concernée, avec cible/rôle explicitement contrôlés, sauvegarde et vérification des droits du rôle runtime séparé, dont la séquence. Ne pas réactiver `sync({alter:true})` ni exécuter le DDL dans une requête applicative. Prévoir un renouvellement contrôlé des connexions/modèles après migration : les modèles marqués indisponibles sont mémorisés, sans mécanisme de revalidation à chaud démontré.

Cette mission ne donne ni ne réalise une autorisation de migration production. La migration seule ne lève aucun verrou de permissions.

## 6. Prérequis supplémentaires de B2 et preuve interne non relayée

`MemoFoundationsPersistence.loadExisting()` exige `public.toke_b1_version()` renvoyant `b1-v1` et vérifie les colonnes des cinq structures B1. La seule migration MemoReads ne satisfait pas ces exigences. La migration B1 distincte exige une séparation propriétaire de migration/rôle runtime et des confirmations explicites ; elle n'est pas interchangeable avec MemoReads.

Autre incompatibilité démontrée pour une future ouverture : les relais historiques `UserService.listByManager()` et `markMemoAsRead()` utilisent `getApiClient(reference)` avec credentials techniques, sans transmettre `x-toke-user-session`. Ce dernier est pourtant exigé par la frontière API et B2. Une simple suppression du verrou BFF conduirait donc encore à un refus ou à un contrat de preuve incomplet. Un GUID `user_guid` dans un corps n'est pas une preuve humaine.

**Correction minimale recommandée :** lors d'une future ouverture autorisée, relayer la preuve utilisateur vérifiée avec son header interne explicite ; conserver séparément les credentials de service, le contrôle tenant et l'identité effective. Aucun correctif de cette nature n'est appliqué ici.

## 7. Temps réel et médias

Les tickets REST sont déjà derrière le verrou BFF. En outre, `packages/api/src/realtime/SocketAuth.ts` refuse explicitement un `realtimeTicket` avec `memo_permissions_pending`. Les mécanismes de ticket/bridge existants ne rendent donc pas le temps réel Cloud opérationnel.

Les médias et uploads restent sous les verrous BFF/API ; les ACL média ne sont pas considérées finalisées par le commentaire de la frontière. Ne pas utiliser les anciens accès techniques Socket ou les URLs de fichiers pour contourner ce verrou.

**Correction minimale recommandée :** aucune réactivation isolée. Validation préalable des ACL de ticket, abonnement, média et durée/révocation, puis activation contrôlée dans une mission distincte.

## 8. Vérifications requises sur l'environnement réel

À réaliser ultérieurement par un opérateur autorisé, sans afficher secrets ou données personnelles :

- identifier version du build et processus réellement servis ; comparer aux verrous des sources locales ;
- identifier le tenant/base/rôle du log, son motif `missing-table`, colonne ou autre, et distinguer simple diagnostic d'initialisation d'une requête échouée ;
- vérifier en lecture seule présence/structure de `public.tk_memo_reads`, parents, index, FK et droits table/séquence du rôle runtime ;
- consulter le registre de migrations de chaque tenant : aucun déploiement de DDL n'est déduit du seul déploiement de code ;
- si des lectures B2 sont envisagées dans un environnement local autorisé, vérifier séparément schéma B1, marqueur de version et certificats/identités nécessaires ;
- relever les statuts/codes des requêtes mémos réelles, sans jeton : 401/403, `memo_permissions_pending`, erreur schéma ou autre ;
- vérifier le mode manager/intégrateur, l'état de session et les credentials internes sans les publier ;
- après migration éventuellement autorisée, vérifier la génération des connexions et des modèles avant d'interpréter un ancien refus mémorisé.

Aucune de ces vérifications réelles n'a été exécutée par Codex pendant cette mission.

## 9. Vérifications effectuées, portée et fichiers modifiés

Lecture et recherches ciblées Cloud/BFF/API, migrations SQL, modèles, middlewares, repositories, SocketAuth et rapports antérieurs B1/B2. État Git examiné et date locale vérifiée. Aucun test applicatif, type-check, build, lancement de serveur, appel réseau ou commande SQL n'a été exécuté ; aucun résultat antérieur de tests n'est revendiqué comme validation nouvelle.

Seul fichier créé par cette intervention : `audits/2026-11-12/TOKE_MEMOS_ETAT_ACTUEL.md`.

Aucune correction applicative n'est proposée comme immédiatement déployable sans revue : le schéma nécessite une vérification opérateur et les permissions une finalisation explicite. Les parcours de connexion, configurations et travaux Git existants sont préservés. Aucun reset, staging, nettoyage destructif ou déplacement d'ancien rapport.
