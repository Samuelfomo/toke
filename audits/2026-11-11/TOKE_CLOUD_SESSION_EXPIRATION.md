# TOKÉ — Expiration des sessions Cloud

- Date de l'intervention : 2026-11-11, fuseau Africa/Douala (UTC+1).
- Verdict : **VALIDÉ SOUS RÉSERVES**.
- Périmètre : expiration et invalidation locale des sessions Cloud ; aucune modification des API ou de la configuration réseau.

## 1. Objectif et problème initial

Aligner la session Cloud sur la durée de validité de 24 heures renvoyée par le BFF, refuser une session sans jeton ou expirée et préserver les sessions existantes encore valides.

L'architecture définitive reste : Cloud → https://my.toke.cm/local → Nginx → BFF → API. Le frontend local utilise volontairement ce BFF distant. La cible distante n'est pas une incompatibilité à corriger ; le constat initial sur ce point est retiré.

## 2. Comportement précédent

Le store enregistrait `authData.expiresAt` à sept jours et ignorait `expires_in`. La restauration et `checkSession()` reposaient sur le cache d'identité sans exiger le jeton. Une mise à jour de profil recalculait cette durée et pouvait prolonger le cache. Le garde de navigation appelait déjà `checkSession()`.

## 3. Correction réellement implémentée

- À la réception des données d'authentification, le store exige un utilisateur, un tenant, un jeton et un `expires_in` numérique fini et positif.
- L'échéance enregistrée est le minimum de `Date.now() + expires_in * 1000` et de `exp * 1000` lu dans le jeton. Une échéance déjà atteinte est refusée.
- Le jeton actuel est composé de deux parties `payload.signature`, et non de trois parties JWT. Le nouvel utilitaire lit le JSON encodé en base64url et exige un `exp` entier positif.
- La restauration exige le jeton, les données utilisateur/tenant et une échéance exploitable. Elle borne et réenregistre l'ancienne échéance selon `exp`. L'égalité avec l'heure courante est considérée comme expirée.
- `checkSession()` invalide l'identité locale et supprime `authData` et `auth_token` si la restauration échoue.
- La mise à jour du profil conserve l'échéance existante ; elle ne renouvelle pas la session.
- Un intercepteur Axios invalide la session locale pour un HTTP 401, ou un HTTP 403 portant `tenant_session_mismatch`, uniquement si la requête utilisait le jeton manager actuellement stocké.
- Cet intercepteur exclut les routes publiques `/tenant/auth`, `/tenant/retry`, `/tenant/verify-otp`, les contextes intégrateur et les réponses concernant un ancien jeton. Les autres HTTP 403, les erreurs réseau et les HTTP 503 ne déclenchent pas cette invalidation.

L'action `invalidateSession()` est locale. Le parcours de déconnexion explicite n'a pas été modifié.

## 4. Fichiers créés ou modifiés

| Fichier | Intervention |
| --- | --- |
| `packages/cloud/src/stores/userStore.ts` | Expiration reçue du serveur, restauration et validation, invalidation locale, conservation de l'échéance lors des mises à jour du profil. |
| `packages/cloud/src/tools/Fetch.Client.ts` | Traitement des refus serveur concernant la session courante. |
| `packages/cloud/src/utils/sessionExpiry.ts` | Nouveau calcul de l'échéance bornée par le jeton. |
| `packages/cloud/verification/session.test.cjs` | Six tests ciblés avec dépendances simulées. |
| `audits/2026-11-11/TOKE_CLOUD_SESSION_EXPIRATION.md` | Présent rapport, seule création de la mission documentaire. |

`router.ts` et les services d'authentification ont été examinés, sans modification : le garde utilise déjà `checkSession()` et le service transmet les données d'authentification au store. Les modifications indexées et non indexées préexistantes ont été conservées ; aucun reset ni staging n'a été effectué par cette intervention.

## 5. Contrats Backend/BFF concernés

- `packages/backend/src/routes/tenant.route.ts` : `GET /tenant/verify-otp/:otp` renvoie une enveloppe de succès contenant notamment `user`, `tenant`, `access_token`, `token_type: Bearer` et `expires_in: 86400`. Le BFF vérifie la session enregistrée auprès de l'autorité.
- `packages/api/src/tools/user-session.authority.ts` : émission d'un jeton signé `payload.signature` contenant `iat` et `exp`, avec `exp = iat + 86400`. La vérification serveur reste responsable de la signature, de la session enregistrée et de son autorisation.
- `packages/backend/src/tools/tenant.config.ts` : refus d'authentification en HTTP 401 et incompatibilité tenant/session en HTTP 403 avec `tenant_session_mismatch`.

Ces contrats ont été lus localement. Aucun appel au BFF distant ou à la production n'a été exécuté pour cette correction.

## 6. Tests réellement exécutés

Commande exécutée depuis la racine du dépôt :

```sh
node --test packages/cloud/verification/session.test.cjs
```

Premier passage : cinq tests, cinq réussites. Après ajout du cas `expires_in` plus court et d'une assertion sur le refus OTP public, dernier passage : **6 tests, 6 réussites, 0 échec**, code de sortie 0. Ce dernier passage a été exécuté avec redirection :

```sh
node --test packages/cloud/verification/session.test.cjs > /tmp/toke-session-tests.log
```

Cas couverts :

1. Session existante valide : réduction du cache de sept jours à `exp`, conservation de la connexion et de l'échéance après mise à jour du profil.
2. Jeton expiré : refus malgré une échéance de cache future et état non authentifié.
3. Jeton absent : refus du cache d'identité.
4. Nouvelle session : prise en compte de `expires_in=86400` et de `exp`.
5. Refus HTTP 401 de la session courante : invalidation ; préservation sur erreur réseau, HTTP 503, HTTP 403 générique, ancien jeton et refus de vérification OTP publique.
6. `expires_in` plus court que la durée du jeton : respect de l'échéance la plus courte.

Le stockage et les appels de services sont simulés ; l'intercepteur Axios est testé via une simulation, sans requête HTTP. Les modules TypeScript sont transpilés pour ces tests et le store utilise Pinia. Aucun test navigateur ou de bout en bout n'a été effectué.

## 7. Vérifications TypeScript et Git

Commande exécutée :

```sh
npm run type-check --workspace=@toke/cloud > /tmp/toke-session-typecheck.log 2>&1
```

Résultat observé dans la session précédente : `vue-tsc --noEmit`, code de sortie 0, aucun diagnostic.

Commande Git exécutée et répétée après les changements :

```sh
git diff --check -- packages/cloud/src/stores/userStore.ts packages/cloud/src/tools/Fetch.Client.ts
```

Résultat : code de sortie 0, aucune erreur d'espacement signalée. Cette vérification ciblée ne constitue pas une validation fonctionnelle de l'ensemble du dépôt ni un contrôle des nouveaux fichiers non suivis.

Les sorties des commandes et les codes de sortie sont identifiables dans l'historique de conversation. Lors de la mission documentaire, les deux journaux `/tmp/toke-session-tests.log` et `/tmp/toke-session-typecheck.log` n'étaient plus présents. Les résultats ci-dessus proviennent des sorties déjà observées, et non d'une nouvelle exécution. Aucun test n'a été relancé pour rédiger ce rapport.

## 8. Compatibilité avec les sessions existantes

Les clés `authData` et `auth_token` et la structure du cache restent utilisées. Une session existante avec un jeton au format actuel et un `exp` futur demeure utilisable ; son ancienne échéance de sept jours est bornée par `exp`. Aucun renouvellement implicite n'est ajouté.

Un cache sans jeton, sans échéance exploitable ou contenant un jeton illisible/expiré est refusé. La compatibilité avec d'autres anciens formats de jeton n'a pas été démontrée. Les erreurs temporaires du serveur et de réseau ne suppriment pas une session localement valide.

## 9. Limites et risques résiduels

- Verdict sous réserves : validation locale ciblée et TypeScript réussies ; absence de validation navigateur et de vérification sur un serveur réel, conformément à l'interdiction d'accès production.
- La lecture de `exp` ne vérifie pas la signature et ne prouve pas que la session est encore autorisée. Le serveur reste l'autorité ; une révocation est prise en compte quand une requête reçoit un refus reconnu.
- Le calcul local dépend de l'horloge du navigateur. Aucun mécanisme de synchronisation d'horloge n'a été ajouté.
- Aucun minuteur ne ferme immédiatement l'écran à l'échéance : les contrôles s'effectuent lors de la restauration, de `checkSession()` et des refus serveur traités.
- Le chemin HTTP 403 `tenant_session_mismatch`, l'exclusion des contextes intégrateur, les jetons malformés et une vraie navigation de route n'ont pas de test dédié dans cette suite.
- Un HTTP 401 sur une route non publique utilisant le jeton courant entraîne une invalidation même sans code d'erreur précis ; les autres HTTP 403 sont conservés.
- `invalidateSession()` efface l'identité et les deux clés de session, sans reprendre le nettoyage des caches métier de `logout()`. `loadFromStorage()` renvoie simplement `false` en cas d'échec ; son appel après une authentification déjà active n'a pas de test dédié.
- Les anciennes méthodes auxiliaires de stockage d'`AuthService` n'ont pas été harmonisées ; aucun appel à ces méthodes n'avait été identifié dans le parcours examiné.

## 10. Autres sujets

- **OTP : non traité.** Aucune modification des règles OTP, de leur émission ou des contrôleurs. Seule l'exclusion des erreurs des routes publiques dans l'invalidation de session a été ajoutée.
- **Déconnexion : non traitée.** Aucun ajout d'appel à `POST /tenant/session/logout`, aucune modification de la révocation serveur ni de l'action explicite `logout()`.
- Mémos, pointages, plannings et autres fonctionnalités : aucune modification ciblée dans ces modules.
- `VITE_URL`, Nginx et configuration serveur : inchangés par cette intervention.

La présente mission est exclusivement documentaire. Aucun ancien rapport n'a été déplacé et aucun code applicatif n'a été modifié pendant sa rédaction.
