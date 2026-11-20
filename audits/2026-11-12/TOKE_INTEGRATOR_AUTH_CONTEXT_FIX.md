# TOKÉ — Compatibilité du contexte intégrateur avec les sessions Cloud

Date : 2026-11-12, Africa/Douala.
Verdict : **VALIDÉ SOUS RÉSERVES** — correction et tests locaux validés ; aucun test navigateur ou serveur réel.

## Cause vérifiée et parcours actuel

L'authentification intégrateur est distincte des sessions utilisateur tenant :

1. `IntegratorService` appelle `/integrator/otp/request` puis `/otp/verify`. Le Master renvoie un jeton intégrateur opaque conservé en `sessionStorage`.
2. Les routes `/tenants` et `/tenants/:subdomain/responsibles` exposent les entreprises et responsables autorisés.
3. `/context/select` vérifie le tenant actif, sa configuration, l'utilisateur actif avec rôle MANAGER/ADMIN-RH et la concordance du profil récupéré. Le Master crée un contexte opaque d'une heure lié au hash de la session intégrateur.
4. `/context/:token` et `/context/:token/profile` exigent la session intégrateur propriétaire du contexte. Elles renvoient respectivement ses identifiants tenant/utilisateur et le profil. Elles n'émettent pas de `access_token` utilisateur tenant.
5. Le BFF relaie ces contrats dans `packages/backend/src/routes/integrator.route.ts`. Son middleware `integrator.delegation.ts` vérifie auprès du Master le couple bearer intégrateur/contexte, refuse une entreprise différente et reconstruit la référence tenant.
6. Le client HTTP Cloud existant transmet déjà `Authorization: Bearer <session intégrateur>` et `x-integrator-context` lorsqu'un contexte est ouvert.

L'ancien `integratorStore.enterProfile()` transmettait seulement `{user, tenant, message}` à `userStore.setAuthData()` avec un cast `as any`. Cette action exige légitimement un véritable `access_token` tenant. Elle levait donc « Incomplete authentication response », déclenchant ensuite `releaseContext()` et son POST `/context/leave`.

La présence d'une requête leave dans les observations de production est compatible avec ce nettoyage après échec ; aucune réponse HTTP n'ayant été communiquée, son succès ou son échec réel n'est pas établi.

## Contrat serveur et décision

Le mécanisme délégué existe explicitement côté serveur. Aucun jeton utilisateur tenant ne doit être fabriqué ni remplacé par le jeton intégrateur. Une projection UI distincte du profil délégué suffit pour corriger ce blocage ; aucune modification BFF n'est indispensable ni appliquée.

La validation locale ne remplace pas les autorisations BFF/API. Cette correction n'étend aucune permission de route métier et ne prétend pas ouvrir les surfaces qui refusent les contextes intégrateurs.

## Correction implémentée

- Le store intégrateur ne passe plus par `setAuthData()` pour ouvrir un contexte.
- À l'ouverture, il vérifie le format du contexte renvoyé, récupère contexte et profil via les routes existantes et compare utilisateur, tenant et subdomain entre réponses et sélection initiale.
- Un profil incomplet ou incohérent est refusé. Si un contexte identifiable a déjà été créé, une sortie est tentée avant de remonter l'erreur ; un échec de cette tentative ne confirme aucune révocation.
- `userStore` expose une projection en mémoire `delegatedContext` avec `setDelegatedProfile()` et `clearDelegatedProfile()`. Elle ne crée ni jeton ni `authData`, conserve le stockage manager et purge les subordonnés/cache d'équipe au changement de profil. Les mises à jour du profil délégué ne réécrivent pas le cache manager.
- Le garde Cloud vérifie le contexte auprès du serveur avant d'autoriser la navigation déléguée. Il restaure le profil en mémoire après rechargement. Un contexte refusé ou invérifiable redirige vers la console intégrateur au lieu de laisser accéder au dashboard. Le parcours manager sans contexte conserve son contrôle `checkSession()`.
- La sortie du contexte utilise toujours le jeton intégrateur en Authorization et le jeton de contexte dans le corps `{contextToken}`. Elle exige HTTP 204, conformément à la route Master. Un 200 inattendu ou une erreur est propagé ; le contexte actif est conservé pour permettre une nouvelle tentative de sortie.
- La sortie purge la projection déléguée et restaure, si elle existe et est encore valide, l'identité manager conservée. Elle n'appelle plus le logout manager. Le logout depuis l'interface déléguée utilise cette sortie de contexte, sans révoquer une autre session utilisateur.
- L'invalidation de session intégrateur efface aussi la projection UI déléguée.

## Fichiers réellement modifiés ou créés

| Fichier | Modification |
| --- | --- |
| `packages/cloud/src/stores/integratorStore.ts` | Validation et ouverture explicite du contexte ; suppression de l'appel incompatible à setAuthData ; nettoyage délégué. |
| `packages/cloud/src/stores/userStore.ts` | Projection déléguée en mémoire, restauration manager, sortie spécifique en mode délégué. Le contrat de setAuthData et les contrôles d'expiration manager sont conservés. |
| `packages/cloud/src/service/IntegratorService.ts` | Consultation du contexte via la route existante ; exigence de réponse 204 à leave. |
| `packages/cloud/src/router.ts` | Validation serveur du contexte avant la navigation déléguée, sans modifier le parcours sans contexte. |
| `packages/cloud/verification/integrator.test.cjs` | Nouvelle suite de 13 tests. |
| `audits/2026-11-12/TOKE_INTEGRATOR_AUTH_CONTEXT_FIX.md` | Présent rapport. |

Les modifications indexées/non indexées préexistantes ont été conservées. Aucun reset ni staging. Aucun changement API/BFF, QR, formulaire utilisateur, OTP, Nginx, `.env`, URL publique ou module métier.

## Tests réellement exécutés

Toutes les dépendances réseau sont simulées. Les tests chargent les véritables stores Cloud, le service et le garde de navigation transpilés ; les composants de routes sont remplacés par des objets de test.

### Suite ciblée finale

```sh
node packages/cloud/verification/integrator.test.cjs > /tmp/toke-integrator-targeted.log 2>&1
```

Résultat : **13 tests réussis, 0 échec**, code de sortie 0.

Cas : sélection et dashboard avec stockage manager inchangé ; restauration du contexte après rechargement ; jeton de contexte absent ; profil absent ; mauvais tenant ; mauvais utilisateur ; refus serveur ; sortie sans révocation manager ; erreur leave conservée pour retry ; dashboard bloqué après refus du contexte ; vrai service leave avec bearer intégrateur/corps contexte et exigence 204 ; sélection uniquement parmi les tenants du serveur ; restauration d'une session manager valide après sortie.

### Régressions et incident du lanceur

Première commande :

```sh
node --test packages/cloud/verification/integrator.test.cjs packages/cloud/verification/session.test.cjs packages/cloud/verification/otp.test.cjs packages/cloud/verification/logout.test.cjs > /tmp/toke-integrator-tests.log 2>&1
```

Le premier passage échouait sur une accolade manquante dans le nouveau chargeur de test, corrigée. Le lanceur signalait également une erreur de désérialisation interprocessus pour la suite logout.

Après correction du test, commande :

```sh
node --test --test-concurrency=1 packages/cloud/verification/integrator.test.cjs packages/cloud/verification/session.test.cjs packages/cloud/verification/otp.test.cjs packages/cloud/verification/logout.test.cjs > /tmp/toke-integrator-tests.log 2>&1
```

Ce passage n'est **pas déclaré réussi** : 43 réussites, une erreur de processus `Unable to deserialize cloned data due to invalid or unsupported version` dans le runner Node pour logout. Les 11 tests intégrateur alors présents, les 6 tests session et les 20 tests OTP passaient ; le lanceur échouait pendant la suite logout, malgré plusieurs assertions déjà réussies. Deux tests intégrateur ont ensuite été ajoutés et la suite ciblée finale ci-dessus a passé ses 13 cas.

Pour distinguer le runner d'une régression logout :

```sh
node packages/cloud/verification/logout.test.cjs > /tmp/toke-integrator-logout-direct.log 2>&1
```

Résultat : **7 tests réussis, 0 échec**, code de sortie 0. Les fichiers de tests précédents n'ont pas été modifiés.

### TypeScript et Git

```sh
npm run type-check --workspace=@toke/cloud > /tmp/toke-integrator-typecheck.log 2>&1
```

Résultat : `vue-tsc --noEmit`, code de sortie 0, aucun diagnostic. Exécuté après les modifications applicatives ; seuls les tests ont ensuite été ajustés.

```sh
git diff --check -- packages/cloud/src/stores/userStore.ts packages/cloud/src/stores/integratorStore.ts packages/cloud/src/service/IntegratorService.ts packages/cloud/src/router.ts
```

Résultat : code de sortie 0. État Git ciblé examiné avant et après correction.

## Limites et réserves

- Aucun accès production, aucun appel HTTP réel, aucun navigateur. Les connexions utilisateur opérationnelles QR et identifiant/mot de passe n'ont pas été retestées de bout en bout ; leurs implémentations n'ont pas été modifiées. Les suites locales OTP, expiration et logout fournissent une couverture de régression ciblée.
- La validation du dashboard couvre le garde et l'identité projetée, pas le rendu ni le succès de toutes les requêtes métier. Certaines routes peuvent exiger une session manager et refuser légitimement le contexte intégrateur ; leurs autorisations ne sont pas modifiées.
- Une requête de nettoyage après ouverture incomplète peut échouer : le contexte serveur peut alors rester jusqu'à expiration. Aucun succès de sortie n'est revendiqué dans ce cas.
- Une erreur de sortie normale est remontée et conserve l'état pour retry ; aucun retry automatique n'est ajouté.
- Le contrôle délégué dépend des réponses serveur à chaque navigation ; une indisponibilité bloque la navigation déléguée. Aucun assouplissement hors ligne ni minuteur d'autorisation autonome n'est ajouté.
- Les conflits de plusieurs sélections simultanées, de plusieurs onglets et les caches métier autres que ceux déjà disponibles dans userStore ne font pas l'objet d'une refonte ou d'une garantie supplémentaire.
- L'échec du runner multiprocessus est documenté ; la suite complète en un seul appel `node --test` n'est pas présentée comme verte.

La mission s'arrête à cette correction Cloud et à son rapport.
