# TOKÉ — Lectures et notifications des mémos

| Composant  | Fichiers                                                                                                                                                 |
|------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| API Tenant | `src/middle/memo-b2-reads.ts`, `src/tenant/memos/reads.service.ts`, `src/tenant/class/MemoReads.ts`, `src/tenant/model/MemoReadsModel.ts`                |
| BFF        | `src/tools/memo-manager-reads.ts`, `src/routes/memos.route.ts`, `src/services/memo.socket.bridge.service.ts`, `verification/memo-manager-reads.test.cjs` |
| Cloud      | `MemoService.ts`, `MemoRealtimeService.ts`, `memoStore.ts`, `header.vue`, `memosView.vue`, `memoSidebar.vue`, `memoDetailChat.vue`                       |
| SQL        | [TOKE_MEMO_READS_PGADMIN.sql](./TOKE_MEMO_READS_PGADMIN.sql)                                                                                             |

`PATCH /memo/:guid/read` réutilise l’ACL de détail et l’identité du manager effectif. Le Cloud accuse réception de la
version affichée dans un onglet visible. L’upsert conserve la lecture la plus récente. Une modification ultérieure peut
rendre le mémo non lu. `GET /memo/state` calcule le total sur l’ensemble des mémos autorisés, indépendamment de la page
ou des filtres.

Le BFF ouvre le namespace Socket.IO existant avec un ticket à usage unique valable 30 secondes. Chaque connexion
réévalue son état autorisé via l’API Tenant à environ six secondes d’intervalle, y compris pour les changements
provenant d’autres producteurs. Elle pousse uniquement la révision et le compteur lorsque l’état change. Le Cloud relit
les ressources par REST. La connexion renouvelle son ticket au plus tard au bout de cinq minutes et s’interrompt si la
preuve est rejetée. En cas de panne du socket, les lectures REST et le rafraîchissement des compteurs au retour au
premier plan restent disponibles.

## Déploiement

1. Sur chacune des six bases, renseigner `expected_database`, puis exécuter le SQL entier avec pgAdmin comme `postgres`.
   Le rôle runtime est repris du registre B1. Le script conserve les accusés existants et annule la transaction devant
   une structure incompatible ou des doublons.
2. Exécuter `npm run build`, puis redéployer `api-tenant` et `api-backend` en conservant leurs variables et flags
   actuels. Le Master et le socket générique Tenant n’ont pas de modification pour cette livraison.
3. Vérifier sur Cloud local la liste, le compteur global, le marquage après ouverture visible et une nouvelle réponse
   dans un deuxième contexte sur le même tenant. Utiliser le chemin Socket.IO du BFF déjà configuré, par défaut
   `/local/socket.io` côté navigateur avec le préfixe BFF `/local`. Livrer le Cloud statique pour l’usage en production.

Validation ciblée sur PostgreSQL jetable pour installation, upsert et nouvelle modification, et au niveau BFF pour la
parité des deux contextes, le refus hors tenant, le ticket unique et la projection Socket.IO. Aucun déploiement ni SQL
de production exécuté.
