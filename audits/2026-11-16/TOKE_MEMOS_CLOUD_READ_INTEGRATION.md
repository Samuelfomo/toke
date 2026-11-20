# TOKÉ — Intégration Cloud des lectures Mémos

**Verdict : VALIDÉ SOUS RÉSERVES** — le raccordement Cloud liste/détail et ses erreurs est vérifié. L’accès aux données réelles dépend encore des flags B2 serveur et des ACL B2.

## Changements

- `packages/cloud/src/service/MemoService.ts` : valide les enveloppes BFF de liste et détail ; une réponse d’échec ou mal formée devient une erreur explicite, pas une liste vide.
- `packages/cloud/src/utils/memoReadError.ts` : distingue verrou B2, session invalide, refus tenant et indisponibilité.
- `packages/cloud/src/views/memo/memosView.vue` : transmet ces erreurs à la liste.
- `packages/cloud/src/views/memo/memoSidebar.vue` : affiche l’erreur et propose une nouvelle tentative.
- `packages/cloud/src/views/memo/memoDetailChat.vue` : affiche l’erreur B2 lors du chargement du détail.
- `packages/cloud/verification/memo-read-contract.test.cjs` : tests sans réseau des contrats Cloud/BFF.

Le Cloud appelle `GET /memo/list?supervisor=<manager>&offset=…&limit=…` et `GET /memo/:guid`, avec le jeton manager et le tenant ajoutés par le client HTTP existant. Les actions d’écriture restent désactivées. Aucun flag, API, BFF, session ou configuration n’a été modifié.

## Vérifications

- `node --test packages/cloud/verification/memo-read-contract.test.cjs` — **4 tests réussis**.
- `npm run type-check --workspace=@toke/cloud` — réussi.
- `git diff --check -- <fichiers Cloud modifiés>` — réussi.
- Aucun accès production, appel réseau réel ou test avec données métier.

## Activation serveur requise pour voir les vrais mémos

L’activation demeure manuelle et doit être cohérente : définir `MEMO_B2_PRODUCTION_MANAGER_READS=1` avec `NODE_ENV=production` dans les environnements du BFF (`api-backend`) **et** de l’API Tenant (`api-tenant`), puis redémarrer ces deux processus avec leur mécanisme opérateur habituel et leurs variables d’environnement mises à jour. Ne pas activer le flag sur une seule couche. Le Cloud n’a pas de flag à régler. Pour revenir en mode fermé, remettre `0` côté BFF puis API Tenant et redémarrer les deux processus.

Même activées, les routes renvoient uniquement les mémos autorisés par les ACL B2 et les prérequis B1. Les contenus hérités non textuels restent filtrés par le service B2. Aucune migration n’est lancée ici.
