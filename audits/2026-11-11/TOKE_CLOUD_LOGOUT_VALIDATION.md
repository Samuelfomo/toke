# TOKÉ — Révocation de session à la déconnexion Cloud

- Date : 2026-11-11, Africa/Douala (WAT, UTC+1), vérifiée avec `date '+%Y-%m-%d %Z'`.
- Verdict : **VALIDÉ** dans le périmètre local testé ; pas de validation sur serveur réel.

## Objectif et contrat examiné

L'action `logout()` effaçait seulement l'identité, les clés `authData`/`auth_token`, les subordonnés et le cache d'équipe. Elle ne demandait pas la révocation serveur.

Le BFF existant, `packages/backend/src/routes/tenant.route.ts`, expose `POST /tenant/session/logout`. Il exige `Authorization: Bearer <jeton>`, attend la révocation par `UserSessionService.logout()` et confirme avec `{ success: true, data: { revoked: true } }`. L'absence de jeton entraîne HTTP 401 ; une révocation non confirmée entraîne HTTP 401 ou 503 avec `session_revocation_unconfirmed`.

L'architecture reste Cloud → https://my.toke.cm/local → Nginx → BFF → API. Aucun contrat ni fichier Backend/BFF n'est modifié.

## Correction implémentée

`logout()` devient asynchrone et capture le jeton et la génération de session courants. Si le jeton existe, il appelle le nouveau service de révocation avant le nettoyage local. Le service utilise exactement ce jeton capturé, la même base `https://${import.meta.env.VITE_URL}`, la route existante et un délai maximal Axios de 10 secondes.

Cet appel Axios est indépendant des intercepteurs du client général : une erreur de révocation ne déclenche pas son invalidation intermédiaire et un contexte intégrateur ne remplace pas le jeton capturé. Cela conserve les mécanismes d'expiration existants sans les modifier.

Seule une réponse contenant strictement `success: true` et `data.revoked: true` produit `revoked: true`. Une erreur ou une réponse non confirmante produit `revoked: false` et un avertissement « Révocation de session non confirmée. ». Sans jeton, aucune requête n'est envoyée et aucune révocation n'est revendiquée.

Le bloc `finally` efface systématiquement l'ancienne session locale, même en cas d'échec réseau, à condition que le jeton et la génération soient toujours ceux capturés. Si une nouvelle session a été ouverte entre-temps, elle est conservée avec ses caches. Le résultat distingue `{ revoked, localCleared }`.

Le nettoyage existant est conservé : identité, tenant, indicateur de connexion, subordonnés, cache d'équipe, `authData` et `auth_token`. L'effacement des clés reste dans un `finally` même si `clearCache()` lève une erreur.

Les composants de déconnexion attendent le résultat et redirigent seulement si le nettoyage a concerné leur session. Les appels du store intégrateur attendent également l'action pour préserver l'ordre des opérations existantes.

## Fichiers réellement modifiés ou créés

| Fichier | Modification de cette mission |
| --- | --- |
| `packages/cloud/src/stores/userStore.ts` | Action de déconnexion asynchrone, révocation puis nettoyage, protection par jeton et génération. |
| `packages/cloud/src/service/SessionLogoutService.ts` | Nouveau service dédié à la révocation du jeton capturé. |
| `packages/cloud/src/views/components/header.vue` | Attente du résultat avant redirection. |
| `packages/cloud/src/views/setting.vue` | Attente du résultat avant redirection. |
| `packages/cloud/src/stores/integratorStore.ts` | Attente des deux appels existants de déconnexion utilisateur. |
| `packages/cloud/verification/logout.test.cjs` | Nouvelle suite ciblée sans réseau. |
| `audits/2026-11-11/TOKE_CLOUD_LOGOUT_VALIDATION.md` | Présent rapport. |

Les corrections précédentes d'expiration et de validation OTP sont préservées. Les fichiers et modifications Git préexistants restent en place ; aucun staging, reset ou nettoyage destructif n'a été effectué.

## Tests réellement exécutés

Commande depuis la racine :

```sh
node --test packages/cloud/verification/logout.test.cjs packages/cloud/verification/session.test.cjs packages/cloud/verification/otp.test.cjs > /tmp/toke-logout-tests.log 2>&1
```

Premier passage : 26 réussites et 7 échecs. Les sept nouveaux tests échouaient au chargement parce que le chargeur de test n'autorisait pas les dépendances locales `pinia`/`vue`. Ce chargeur a été corrigé sans changement applicatif supplémentaire.

Second passage : **33 tests réussis, 0 échec**, code de sortie 0 :

- 7 tests de déconnexion : succès confirmé ; échec réseau ; réponse sans confirmation ; rejet simulé représentant un HTTP 401 ; session absente ; nouvelle session pendant une révocation réussie ; nouvelle session pendant un échec de révocation.
- 6 tests existants d'expiration de session.
- 20 tests existants de validation OTP.

Les tests chargent le vrai store et le vrai service de révocation, avec Axios simulé. Ils vérifient la route, le jeton transmis, le délai configuré, l'ordre révocation/nettoyage, l'effacement local et du cache d'équipe, l'absence de requête sans jeton et la conservation d'une nouvelle session et de ses données sur réponse tardive. Aucun appel réseau réel n'est effectué. Le rejet représentant HTTP 401 est simulé par une promesse rejetée ; il ne constitue pas un test HTTP du BFF.

## TypeScript et Git

```sh
npm run type-check --workspace=@toke/cloud > /tmp/toke-logout-typecheck.log 2>&1
```

Résultat : `vue-tsc --noEmit`, terminé avec code de sortie 0, aucun diagnostic.

```sh
git diff --check -- packages/cloud/src/stores/userStore.ts packages/cloud/src/stores/integratorStore.ts packages/cloud/src/views/components/header.vue packages/cloud/src/views/setting.vue
```

Résultat : code de sortie 0, aucune erreur d'espacement signalée. Contrôle ciblé des fichiers suivis, pas une validation de tous les changements du dépôt. Le diff des adaptations des appelants a également été examiné.

## Limites et risques résiduels

- Aucun test navigateur ni appel au BFF distant ou à la production. Les redirections des composants sont vérifiées par lecture et TypeScript, sans simulation de navigation.
- En cas de panne réseau ou de délai dépassé, la session locale est effacée mais la révocation serveur reste non confirmée. Une requête dont la réponse est perdue peut avoir été exécutée côté serveur ; le Cloud ne revendique pas sa confirmation.
- Le délai Axios est vérifié dans la configuration simulée ; son écoulement réel n'est pas testé.
- Les erreurs de stockage navigateur et les exceptions de nettoyage de cache ne font pas l'objet de tests dédiés. Une exception de cache peut rejeter la promesse de déconnexion, mais les clés locales sont effacées par le bloc `finally`.
- La protection contre une session remplacée est testée dans une instance du store ; aucune synchronisation multi-onglets n'est ajoutée.
- Les avertissements de révocation non confirmée sont consignés dans la console et dans le résultat retourné ; aucun nouvel affichage utilisateur de confirmation n'est ajouté.

Aucune modification des API, du BFF, des règles OTP ou d'expiration, des URLs, de `.env`, de Nginx, des mémos, des pointages ou des plannings. Cette mission s'arrête à la correction de déconnexion et au présent rapport.
