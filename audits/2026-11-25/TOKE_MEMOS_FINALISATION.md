# TOKÉ — Finalisation fonctionnelle et UX des mémos

## Backend

| Fichier | Ajustement |
| --- | --- |
| `packages/api/src/tools/user-session.client.ts` | L’introspection transmet les codes de refus du client technique et de configuration manquante en HTTP 503. Les chemins de connexion et de déconnexion sont inchangés. |
| `packages/api/src/tenant/memos/responsibility.policy.ts`, `packages/api/src/tenant/memos/reads.service.ts` | Ajout du prénom et du nom des deux participants au résultat autorisé, avec contrôle du tenant de chaque participant. Les ACL de lecture demeurent communes au manager direct et au manager représenté. |
| `packages/backend/src/tools/memo-manager-reads.ts` | Relais des noms autorisés dans le contrat Cloud, avec compatibilité pendant le déploiement progressif. |
| `packages/backend/verification/memo-manager-reads.test.cjs` | Compare les réponses directes et déléguées à tenant et manager identiques. |

Le code `session_authority_unavailable` agrège les erreurs réseau et les échecs amont non classés. Le code explique aussi comment un refus de clé technique pouvait être masqué par ce 503 en production. La branche effectivement rencontrée reste à confirmer dans l’environnement PM2 de `api-backend` et `api-tenant` ainsi qu’auprès du Master. Vérifier la joignabilité de `USER_SESSION_MASTER_URL` et la concordance de la clé et de sa signature avec le registre et `USER_SESSION_SERVICE_KEYS`, sans afficher les secrets. [Procédure existante](../2026-11-12/TOKE_AUTH_SESSION_CONFIGURATION_INCIDENT.md).

## Cloud et limites

- `memosView.vue`, `memoSidebar.vue`, `memoChat.vue`, `memoDetailChat.vue` et `memoDetailPanel.vue` cadrent les panneaux et leur défilement, séparent chargement, erreur et liste vide, et distinguent le système, le destinataire et l’auteur enregistré.
- `memoLexicon.ts` traduit les anomalies et corrections. Le détail automatique conserve le texte et les diagnostics JSON d’origine dans un volet repliable. `memoReadError.ts` adapte le message d’erreur d’introspection.
- `MemoRealtimeService.ts`, `memoStore.ts` et `header.vue` interceptent les échecs du ticket, du renouvellement et des rappels. Le socket reste verrouillé côté Tenant et les tickets restent indisponibles. La consultation REST reste indépendante.
- Le profil B1 installé n’autorise que la commande `OBSERVE_LEGACY_STATE` et interdit son exécution au rôle runtime. La création, la sélection de destinataires pour un nouveau mémo et les transitions métier restent indisponibles. Le bouton l’indique et les handlers historiques restent verrouillés.

Redéployer `api-tenant` et `api-backend` avec les profils PM2 B2. Le Master n’a aucun changement de code. Le Cloud local suffit à la recette. Aucune opération de production n’a été effectuée.

Les quatre cas ciblés BFF/API, les vérifications TypeScript Cloud et API et les contrôles ciblés du code 503 et des diagnostics JSON ont réussi. La recette sur le même tenant réel et la validation visuelle restent à effectuer.
