# Régression `invalid_session_identity` sur `tenant/auth`

**Verdict : VALIDÉ** — cause corrigée et reproduction ciblée couverte. Aucun service de production n’a été contacté.

## Cause et correction

`POST /tenant/auth` est relayé par le BFF vers la route `/auth` de l’API Master. Après authentification du compte, `UserSessionAuthority.issueChallenge()` valide l’identité avant de créer l’OTP. Le rejet venait de `user-session.authority.ts` : la même expression numérique stricte était appliquée à l’identifiant utilisateur et au tenant, en interdisant les zéros initiaux et les UUID.

Or `UsersDbStructure.guid` est `VARCHAR(255)` avec défaut `UUIDV4`, et le générateur historique produit aussi des GUID numériques qui peuvent commencer par zéro. La correction sépare les formats : l’utilisateur peut avoir un GUID numérique ou UUID conforme au stockage, tandis que le tenant conserve sa validation numérique stricte. Le contrôle est aussi appliqué au décodage du jeton. La validation d’existence, d’activité, de tenant et de sous-domaine reste effectuée par le résolveur Master ; aucune identité n’est déduite d’une valeur fournie par le client.

## Fichiers de cette intervention

- `packages/api/src/tools/user-session.authority.ts` — validation compatible avec les formats `User.guid`.
- `packages/api/verification/user-sessions/scenarios.cjs` — cas GUID numérique avec zéro initial, UUID accepté et GUID malformé refusé.
- `audits/2026-11-14/TOKE_TENANT_AUTH_INVALID_SESSION_IDENTITY.md` — présent rapport.

## Vérification

Commande : `node packages/api/verification/user-sessions/run.cjs --create-disposable-redis`

Résultat : **22 scénarios réussis**, dont les deux nouveaux cas, le parcours HTTP OTP réel sur services locaux, le refus des identités invalides, la séparation des tenants et les contrôles de session. Redis était éphémère, local et sans TCP ; arrêté et supprimé par le harnais. Un avertissement de dépréciation du routeur est apparu, sans échec.

Action de déploiement : déployer/recompiler l’API Master contenant ce correctif et redémarrer son processus selon la procédure opérateur habituelle. Aucun changement BFF, Cloud, PM2 ou configuration n’est requis ; aucune action production n’a été effectuée par Codex.
