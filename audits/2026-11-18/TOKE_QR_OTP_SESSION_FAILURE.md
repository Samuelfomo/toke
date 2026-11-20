# TOKÉ — Échec de connexion après OTP du parcours QR

**Verdict : VALIDÉ SOUS RÉSERVES** — défaut local corrigé et reproduit par test isolé ; aucune validation ni modification de production.

## Cause

Le Master acceptait les GUID utilisateur stockés comme UUID ou chaîne numérique avec zéro initial et émettait la session. Le BFF utilisait ensuite `UserSessionClient.verify()` pour vérifier le jeton avant de répondre à `/tenant/verify-otp/:otp`, mais son validateur n’acceptait que les GUID numériques sans zéro initial. Il rejetait donc certaines identités pourtant valides comme réponse d’autorité ; le BFF masquait ce rejet sous `verification_failed`. Cela correspond à l’échec après consommation de l’OTP.

Les logs fournis confirment que le scan a déclenché l’envoi du code. `user undefined` est un log de la confirmation QR intermédiaire : cette route appelle `/tenant/auth`, qui ne renvoie qu’un accusé d’envoi OTP, puis marque la confirmation QR comme acquise. Ce log ne démontre pas à lui seul l’identité du compte authentifié par le code.

## Correction et fichiers

- `packages/api/src/tools/user-session.client.ts` : le validateur BFF accepte désormais les mêmes GUID utilisateur que l’autorité Master (UUID ou chaîne numérique, zéro initial compris, limite de 255 caractères). Le GUID tenant reste strictement numérique.
- `packages/api/verification/user-sessions/scenarios.cjs` : test de bout en bout d’introspection BFF pour UUID et GUID numérique avec zéro initial.

## Tests

- `node packages/api/verification/user-sessions/run.cjs --create-disposable-redis` — **23 scénarios réussis**, Redis local éphémère, HTTP local seulement.
- `./node_modules/.bin/tsc --noEmit -p packages/api/tsconfig.json` — réussi.
- `git diff --check -- packages/api/src/tools/user-session.client.ts packages/api/verification/user-sessions/scenarios.cjs` — réussi.

## Déploiement nécessaire

Déployer le code API incluant `user-session.client.ts`, reconstruire le paquet `@toke/api` (utilisé depuis `dist`), puis reconstruire le BFF et redémarrer `api-backend` ainsi que `api-tenant` s’il consomme le même paquet compilé. Le correctif ciblé ne demande pas de changement de configuration ni de migration. Aucun build de production, changement PM2 ou déploiement n’a été effectué par Codex. Après déploiement, demander un nouvel OTP : celui déjà soumis a pu être consommé par le Master.
