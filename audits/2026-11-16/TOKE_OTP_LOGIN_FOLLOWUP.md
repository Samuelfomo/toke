# TOKÉ — Suivi du blocage OTP à la connexion

**Verdict : VALIDÉ SOUS RÉSERVES** — le parcours local est validé ; le service de production n’a pas été consulté et le déploiement du correctif n’est pas confirmé.

## Cause établie dans les sources

`POST /tenant/auth` traverse le BFF puis la route `/auth` de l’API Master. Le Master charge l’utilisateur par email, puis appelle `UserSessionAuthority.issueChallenge()` avant l’envoi du mail. L’erreur `invalid_session_identity` est émise par la validation de l’identité utilisateur dans `packages/api/src/tools/user-session.authority.ts`. Elle rejetait les GUID utilisateur UUID et ceux commençant par zéro, alors que le modèle `User.guid` stocke des UUID et des chaînes numériques.

Le correctif local accepte ces formats et conserve le contrôle strict du GUID tenant, la vérification d’existence et d’activité du compte au moment d’émettre la session, ainsi que la vérification BFF du jeton. Aucune validation d’identité n’a été supprimée.

## Vérifications effectuées le 16 novembre

- `node packages/api/verification/user-sessions/run.cjs --create-disposable-redis` — **22 scénarios réussis**, dont le parcours HTTP `/auth` → envoi simulé → `/verify-otp` à travers Master et BFF. Redis local éphémère uniquement.
- `node --test packages/cloud/verification/otp.test.cjs` — **20 tests réussis**, dont conservation du code à six chiffres jusqu’au serveur.
- Les tests emploient des identités et services locaux simulés ; ils ne prouvent pas l’état du processus de production ni l’identité d’un compte réel.

## État et action opérateur

Aucun accès ni changement de production n’a été effectué. Le correctif présent dans le dépôt ne peut pas modifier un processus déjà démarré avec un ancien build. Pour faire disparaître l’erreur si elle est encore émise, recompiler/déployer l’API Master avec `user-session.authority.ts`, puis redémarrer son processus API Master. Le BFF et Cloud n’ont pas de changement nécessaire pour cette cause. Ensuite, vérifier les réponses HTTP de `/tenant/auth` puis `/tenant/verify-otp/:otp` sans transmettre le code OTP ni aucun secret.

Si le Master mis à jour renvoie encore `invalid_session_identity`, il faudra relever uniquement le `error.code` et le statut HTTP de chaque étape : le cas dépend alors du GUID réel renvoyé par la route d’authentification tenant, que les fixtures locales ne reproduisent pas.

## Fichiers de cette intervention

- Aucun code applicatif modifié le 16 novembre.
- `audits/2026-11-16/TOKE_OTP_LOGIN_FOLLOWUP.md` — présent rapport.
