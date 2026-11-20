# TOKÉ — Incident d'authentification : session_configuration_missing

- Date : 2026-11-12, Africa/Douala (WAT), vérifiée localement.
- Verdict : **VALIDÉ SOUS RÉSERVES** — condition causale établie dans les sources locales ; environnement et artefact effectivement déployés non inspectés.
- Mission : diagnostic et procédure uniquement. Aucun code applicatif ni `.env` modifié ; aucun accès production.

## Cause démontrée

`packages/api/src/tools/user-session.runtime.ts:32` produit précisément HTTP 503 / `session_configuration_missing` lorsque :

```ts
Buffer.byteLength(process.env.USER_SESSION_SECRET || '') < 32
  || (!process.env.USER_SESSION_REDIS_SOCKET && !process.env.USER_SESSION_REDIS_HOST)
```

Au moins une condition est donc vraie dans l'environnement effectif de l'autorité Master si le déploiement exécute ces sources : secret absent/vide/trop court en octets UTF-8, ou absence simultanée d'hôte et de socket Redis dédiés aux sessions. Plusieurs défauts peuvent coexister.

Cette vérification intervient **avant** la construction du client Redis et toute tentative de connexion. Ce code d'erreur ne démontre pas une panne Redis, ni une erreur Nginx, ni des identifiants email/code incorrects. Sans observer l'environnement réel, il est impossible de désigner honnêtement la variable précise en défaut.

L'autorité est initialisée paresseusement au premier appel de `managerSessionAuthority()`, et non au démarrage HTTP. Le serveur peut donc démarrer et accepter des connexions tout en refusant l'authentification. La promesse d'initialisation est réinitialisée après échec ; une compilation réussie ne fournit pas les variables manquantes.

## Chemin de la requête et fichiers concernés

1. Cloud → `https://my.toke.cm/local` → Nginx → BFF : architecture conservée, non contactée pendant le diagnostic.
2. `packages/backend/src/routes/tenant.route.ts` reçoit `POST /tenant/auth`, valide email/code et appelle `TenantService.authenticate()`.
3. `packages/backend/src/services/tenant.service.ts` relaie vers le Master `/tenant/auth` avec le client technique existant. En production, la base est `http://${HOST}:${MST_PORT}` ; en développement elle dépend de `MST_HOST`. Les credentials existants sont `API_KEY` et `SECRET_KEY`.
4. `packages/api/src/master/routes/tenant.route.ts:1531` charge le tenant et authentifie l'utilisateur, puis appelle `managerSessionAuthority()` avant la limitation des envois, la création du challenge Redis et l'envoi email.
5. Le runtime de session déclenche la condition ci-dessus. `sessionFailure()` dans `packages/api/src/master/routes/user-session.route.ts` conserve le statut/code du `SessionError`.
6. Le service BFF conserve le statut et la réponse d'erreur Master. La route BFF réemballe cette erreur : son contenu peut figurer sous `error.result` et sous `error.response.response.error`, plutôt qu'au premier niveau `error.code`. La forme exacte observée sur le déploiement reste à confirmer ; elle ne change pas l'origine locale du code.
7. Une fois la configuration corrigée, le Master émet le challenge OTP dans Redis ; à la consommation de l'OTP, `UserSessionAuthority` émet et enregistre une session de 86400 secondes.
8. Le BFF vérifie indépendamment `access_token` via `packages/backend/src/tools/user.session.ts` et `packages/api/src/tools/user-session.client.ts`, qui appelle le Master `/auth/session/introspect`. Cette étape exige une seconde famille de configuration : les credentials de service.

Autres sources : `packages/api/src/tools/user-session.authority.ts` (registre, signature, scripts Redis), `packages/backend/src/tools/tenant.config.ts` (vérification de session), `packages/api/src/middle/manager-session.ts` (client de sessions côté API Tenant).

## Paramètres requis

### Autorité API Master

| Paramètre | Exigence réelle |
| --- | --- |
| `USER_SESSION_SECRET` | Au moins 32 octets dans la chaîne fournie. Le code utilise directement cette chaîne pour HMAC, sans décodage base64. Secret stable, protégé et identique entre instances Master partageant l'autorité. Ne pas le régénérer à chaque démarrage. |
| `USER_SESSION_REDIS_SOCKET` ou `USER_SESSION_REDIS_HOST` | Au moins l'un des deux doit être non vide. Le socket est prioritaire si les deux sont définis. Aucun repli vers les autres paramètres Redis de l'application. |
| `USER_SESSION_REDIS_PORT` | Pour TCP uniquement ; valeur par défaut 6379. Définir un entier entre 1 et 65535 adapté au serveur. Le runtime effectue seulement une conversion `Number()`, pas une validation complète préalable. |
| `USER_SESSION_REDIS_USERNAME`, `USER_SESSION_REDIS_PASSWORD` | Selon l'authentification Redis déployée. Non imposés par le garde initial ; une mauvaise valeur échoue ensuite à la connexion/commande. |
| `USER_SESSION_REDIS_TLS` | TLS activé uniquement si la valeur est exactement `true`. Adapter au service réellement configuré. |
| `USER_SESSION_SERVICE_KEYS` | Liste de clés techniques autorisées, séparées par des virgules ; nécessaire pour les routes internes d'introspection/révocation. Chaque clé doit identifier un client actif dans `ClientCacheService`, avec secret correspondant. |

Redis doit être partagé entre instances Master, accessible sous l'identité du processus et compatible avec les scripts Lua. Les opérations utilisent `GET`, `EVAL`, ainsi que `INCR`, `EXPIRE`, `EXISTS`, `SET`, `DEL` dans les scripts, sous le préfixe `toke:auth:{manager-v2}:`. Le script d'émission utilise aussi `redis.acl_check_cmd` : la compatibilité de version et les ACL doivent être contrôlées, pas seulement `PING`. Ne pas accorder des privilèges administrateur pour contourner une erreur.

### BFF et consommateurs API Tenant

| Paramètre | Exigence réelle |
| --- | --- |
| `USER_SESSION_MASTER_URL` | Base explicite de l'autorité Master ; le client ajoute `/auth/session/introspect` ou `/auth/session/logout`. HTTP/HTTPS seulement, sans credentials embarqués, query ou fragment. Employer le transport interne protégé existant ou HTTPS selon le déploiement. Ne pas confondre avec l'URL publique du Cloud. |
| `USER_SESSION_SERVICE_KEY` | Clé technique non vide, autorisée par `USER_SESSION_SERVICE_KEYS` et correspondant à un client actif du Master. |
| `USER_SESSION_SERVICE_SECRET` | Secret technique non vide correspondant au client Master ; utilisé après décodage base64 pour signer les appels. Distinct de la clé HMAC humaine `USER_SESSION_SECRET`. |

Les horloges doivent être synchronisées : les routes de service acceptent un écart de timestamp de 60 secondes. Les dépendances DB Master/tenant, les comptes actifs et l'envoi email restent nécessaires au parcours complet ; elles ne sont pas la condition qui produit `session_configuration_missing`.

## Distinguer les erreurs

| Code ou situation | Interprétation locale |
| --- | --- |
| `session_configuration_missing` | Garde initial Master : secret de moins de 32 octets OU absence des deux destinations Redis. Un secret présent mais trop court reçoit également ce code « missing ». |
| `session_configuration_invalid` | Constructeur direct de `UserSessionAuthority` recevant un secret trop court ; normalement intercepté plus tôt par le runtime, qui renvoie « missing ». |
| `session_registry_unavailable` | Échec de connexion Redis ou de commande/script : hôte/socket inaccessible, auth/TLS incorrects, ACL, incompatibilité de commande, indisponibilité. Ne distingue pas à lui seul ces causes. |
| Port invalide ou erreur de construction Redis | Le constructeur Redis est hors du `try` de connexion ; certains paramètres invalides peuvent produire une erreur générique, convertie ensuite en `session_authority_unavailable`. |
| `session_service_configuration_missing` | URL/clé/secret client absents côté consommateur, ou allowlist vide côté Master. |
| `session_service_configuration_invalid` | URL analysable mais protocole/credentials/query/fragment interdits. Une URL impossible à analyser lève aussi une erreur native `URL`, sans ce code garanti. |
| `session_service_unauthorized` | Allowlist, client inactif, signature, timestamp ; le client de session transforme généralement ce refus infrastructure en HTTP 503 / `session_authority_unavailable`. |
| `session_authority_unavailable` | Transport interne, délai, refus technique Master ou erreur non typée ; ne conclure ni à une expiration utilisateur ni à une panne Redis sans contrôle complémentaire. |

## Documentation et chargement de configuration

`audits/LOT3_ETAPE_A_VALIDATION.md`, section « Configuration nouvelle », documente déjà ces paramètres et le Redis commun. `audits/LOT3_CONTRAT_IMPLEMENTATION.md` décrit la clé d'autorité. Ils ne sont donc pas totalement non documentés.

En revanche, ni `ecosystem.config.cjs` à la racine, ni `packages/api/ecosystem.config.cjs`, ni les README racine/API examinés ne fournissent cette configuration de sessions. La checklist `packages/api/docs/migrations/files/DEPLOYMENT_CHECKLIST.md` concerne des colonnes générées et ne constitue pas une recette de sessions. Aucun mode opératoire complet de provisionnement/injection/rechargement de ces paramètres n'a été établi dans ces supports. La procédure effectivement utilisée en production n'est pas connue : un oubli lors du déploiement est compatible avec les sources mais pas directement observé.

Le runtime et le client de session ne chargent pas eux-mêmes de `.env`. Le Master importe `master/database/db.config.ts`, qui appelle `dotenv.config()`. Le BFF comporte aussi `dotenv.config()` dans `app.ts` et ses services. Par défaut, le fichier est résolu selon le répertoire de travail et une variable déjà injectée n'est pas écrasée par dotenv. Le PM2 racine définit `cwd: ./packages/api` pour Master/Tenant et `./packages/backend` pour le BFF ; le PM2 du package API a un autre contexte relatif. Vérifier quel fichier PM2 est réellement utilisé et son répertoire de lancement.

## Procédure minimale pour l'opérateur de production — non exécutée par Codex

1. Identifier les processus et le build réellement servis : noms PM2, script, `cwd`, heure de démarrage et correspondance de la ligne du garde avec l'artefact déployé. Ne pas publier un export complet PM2, `printenv`, les fichiers `.env` ou des logs contenant des credentials.
2. Dans le mécanisme d'injection effectif du Master, vérifier uniquement des indicateurs : `USER_SESSION_SECRET` présent et longueur >=32 octets ; socket présent OU hôte présent ; port TCP valide si applicable ; TLS égal à la valeur attendue. Ne pas imprimer les valeurs, empreintes de secret, URL avec credentials ou jetons. Un shell indépendant n'est pas une preuve de l'environnement du processus PM2 : vérifier aussi les variables injectées par le superviseur et la priorité dotenv.
3. Exemple de contrôle limité, à exécuter par l'opérateur dans un processus de contrôle ayant **la même injection d'environnement et le même cwd** que l'application. Ce script ne charge pas les routes et n'appelle aucun service. Si l'application utilise dotenv, charger le même fichier par le même mécanisme avant ce contrôle. Ne pas utiliser `source .env` comme substitut à dotenv.

```js
const e = process.env;
const report = {
  sessionSecretPresent: Boolean(e.USER_SESSION_SECRET),
  sessionSecretMinimumBytesOK: Buffer.byteLength(e.USER_SESSION_SECRET || '') >= 32,
  redisSocketPresent: Boolean(e.USER_SESSION_REDIS_SOCKET),
  redisHostPresent: Boolean(e.USER_SESSION_REDIS_HOST),
  redisTcpPortOK: Number.isInteger(Number(e.USER_SESSION_REDIS_PORT || 6379)) &&
    Number(e.USER_SESSION_REDIS_PORT || 6379) >= 1 &&
    Number(e.USER_SESSION_REDIS_PORT || 6379) <= 65535,
  redisTlsEnabled: e.USER_SESSION_REDIS_TLS === 'true',
  serviceAllowlistPresent: Boolean((e.USER_SESSION_SERVICE_KEYS || '').split(',').some(s => s.trim())),
  clientMasterUrlPresent: Boolean(e.USER_SESSION_MASTER_URL),
  clientKeyPresent: Boolean(e.USER_SESSION_SERVICE_KEY),
  clientSecretPresent: Boolean(e.USER_SESSION_SERVICE_SECRET),
};
console.log(JSON.stringify(report));
```

Les champs client peuvent être absents sur un Master qui n'est pas consommateur ; l'allowlist n'est requise que sur le Master. Ne pas interpréter tous les champs comme obligatoires pour tous les processus.

4. Corriger uniquement le provisionnement fautif via le gestionnaire de secrets/configuration habituel : fournir la clé Master stable existante si elle existe et la destination Redis de sessions autorisée. Si une nouvelle clé est nécessaire, la générer dans le système de secrets (au moins 32 octets de hasard), sans la copier dans un ticket ou ce rapport. Changer une clé existante invalide les jetons/challenges correspondants : ne pas effectuer de rotation incidente inutile.
5. Compléter les credentials internes BFF/Tenant et l'allowlist Master si absents. Vérifier leur correspondance par un contrôle authentifié, sans afficher ni comparer publiquement les secrets. Aucune réutilisation automatique d'un secret d'un autre rôle.
6. Contrôler Redis sous l'identité et avec le transport/auth/TLS de l'application : accessibilité, authentification, `PING`, puis compatibilité/ACL des opérations listées. Éviter les mots de passe dans les arguments CLI ou les URL. Utiliser un canal de secrets protégé et un préfixe de diagnostic isolé pour tout essai d'écriture, sans toucher aux clés de sessions réelles ; `PING` seul ne valide pas les scripts.
7. Redémarrer/recharger uniquement les processus dont l'environnement change. Avec les noms du PM2 racine : **`api-master`** si secret, destination Redis, credentials Redis ou allowlist changent ; **`api-backend`** si paramètres client/chargement BFF changent ; **`api-tenant`** si ses paramètres client changent. Rafraîchir l'environnement PM2 avec `--update-env` si l'injection vient du superviseur/shell ; un simple redémarrage sans nouvelle injection peut conserver les anciennes valeurs. Si dotenv est utilisé, vérifier aussi les éventuelles anciennes valeurs prioritaires dans PM2. Ne pas redémarrer le cron ou le solveur pour cette correction. Redis lui-même ne nécessite un redémarrage que si son propre administrateur change sa configuration et que cette modification l'exige.
8. Vérifier ensuite, par l'opérateur et avec un compte de contrôle autorisé, que la demande email produit HTTP 201 et que la vérification OTP renvoie une session puis passe l'introspection BFF. Conserver seulement statuts/codes et indicateurs ; ne publier aucun OTP, email personnel, jeton ou secret. Ce contrôle peut envoyer un email et créer une session : il n'a pas été exécuté ici.

Aucune modification de Nginx, de la route publique ou des règles de sécurité n'est nécessaire pour corriger le garde identifié. Ne pas rétablir une émission permissive sans registre.

## Autres symptômes et limites

« Incomplete authentication response » n'est pas une preuve de la même configuration manquante. Le chemin intégrateur local transmet à `setAuthData()` un objet `user`/`tenant` sans `access_token` (`packages/cloud/src/stores/integratorStore.ts`), tandis que le store exige ce jeton avant toute modification d'état. Cette incompatibilité indépendante suffit à expliquer ce message sur ce chemin ; la correction de configuration Master ne promet pas de la résoudre. Aucun changement frontend ni investigation QR n'est entrepris.

## Vérifications effectuées et état final

Lecture ciblée des sources, des configurations PM2 et des documents cités ; recherche de l'émetteur d'erreur et des paramètres ; examen de l'état Git. Aucun test applicatif, build, vérification TypeScript ou essai Redis n'a été lancé : le diagnostic demandé est statique et n'introduit aucun code applicatif.

Seul fichier créé par cette mission : `audits/2026-11-12/TOKE_AUTH_SESSION_CONFIGURATION_INCIDENT.md`. Aucun `.env` réel lu/modifié, aucun accès production, aucun reset, aucun déplacement de rapport ni modification des travaux Git existants. La cause effective parmi les branches du garde et le succès de la correction restent à confirmer par l'opérateur sur l'environnement déployé.
