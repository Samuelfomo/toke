# TOKÉ — Finalisation de la consultation Web des mémos

Le correctif est prêt dans le dépôt. Les six bases sont annoncées installées avec le profil `PGADMIN_POSTGRES_LEGACY_OWNER`. La consultation en production reste à vérifier après déploiement.

| Fichier | Ajustement |
| --- | --- |
| [reads.service.ts](../../packages/api/src/tenant/memos/reads.service.ts) | Vérifie le marqueur `b1-v1` dans la transaction de lecture, avec le rôle runtime. Les requêtes vérifient l’accès aux tables qu’elles utilisent. Le chargement complet des modèles B1 et les droits d’écriture sortent du chemin de lecture. |
| [memosView.vue](../../packages/cloud/src/views/memo/memosView.vue) | Charge la liste dès que la session manager est prête et ouvre les liens directs par GUID, y compris hors de la page courante. |
| [memoReadError.ts](../../packages/cloud/src/utils/memoReadError.ts) | Affiche un message distinct si le marqueur B1 est inaccessible ou incorrect. |
| [ecosystem.config.cjs](../../ecosystem.config.cjs) et [profil API](../../packages/api/ecosystem.config.cjs) | Activent par défaut la lecture B2 sur les profils PM2 concernés et permettent une valeur explicite pour le retour arrière. |

Les deux GET conservent les contrôles de session, les ACL B2 et l’isolation par tenant. Un mémo historique sans workflow reste visible si le manager en est l’auteur ou le destinataire. L’accès par responsabilité exige une attribution certifiée. L’authentification et les migrations sont hors de ce correctif.

Vérifications réussies dans le dépôt : TypeScript Cloud et API, valeurs B2 des profils PM2 et `git diff --check`. Les suites B2 existantes n’ont pas été relancées.

Depuis la racine de la release, avec la destination statique Cloud existante renseignée dans `CLOUD_WEB_ROOT` :

```sh
: "${CLOUD_WEB_ROOT:?Renseigner le répertoire statique Cloud existant}"
npm run build && npm run build --workspace=@toke/cloud
MEMO_B2_PRODUCTION_MANAGER_READS=1 pm2 startOrRestart ecosystem.config.cjs --only api-tenant --env production --update-env
MEMO_B2_PRODUCTION_MANAGER_READS=1 pm2 startOrRestart ecosystem.config.cjs --only api-backend --env production --update-env
rsync -a packages/cloud/dist/ "$CLOUD_WEB_ROOT/"
```

Vérifier liste et détail avec une session manager réelle et un mémo auquel elle a droit. En cas de retour arrière, appliquer les deux commandes PM2 avec la valeur `0`, BFF puis API Tenant. Aucune commande de production n’a été exécutée.

## Consultation en contexte intégrateur

L’ouverture du profil délégué renseigne le manager représenté sans mettre le store en état de connexion manager directe. Le chargement des mémos attend désormais l’un ou l’autre de ces états.

| Fichiers | Ajustement |
| --- | --- |
| [memoStore.ts](../../packages/cloud/src/stores/memoStore.ts), [memosView.vue](../../packages/cloud/src/views/memo/memosView.vue), [memoReadError.ts](../../packages/cloud/src/utils/memoReadError.ts) | Déclenchent la lecture sur le profil délégué validé et signalent un contexte devenu invalide. |
| [memos.route.ts](../../packages/backend/src/routes/memos.route.ts), [memo-manager-reads.ts](../../packages/backend/src/tools/memo-manager-reads.ts) | Réutilisent la délégation validée par le BFF et transmettent les preuves intégrateur à l’API Tenant. |
| [memo-b2-reads.ts](../../packages/api/src/middle/memo-b2-reads.ts), [reads.service.ts](../../packages/api/src/tenant/memos/reads.service.ts) | Revérifient la délégation auprès du Master, l’associent au tenant courant et appliquent les ACL B2 du manager représenté. |
| [memo-manager-reads.test.cjs](../../packages/backend/verification/memo-manager-reads.test.cjs) | Couvre la liste, le détail, le refus hors tenant et le respect de l’ACL en contexte délégué. |

La suite ciblée Mémos BFF/API a réussi ses 66 cas. Les vérifications TypeScript Cloud, BFF et API ont réussi.

Pour la recette avec Cloud local, compiler puis redéployer uniquement le BFF et l’API Tenant avec les deux commandes PM2 ci-dessus. Le Master conserve son endpoint de contexte existant. Les variables `USER_SESSION_MASTER_URL`, `USER_SESSION_SERVICE_KEY` et `USER_SESSION_SERVICE_SECRET` de l’API Tenant sont les mêmes que pour la vérification existante des sessions. La recette locale utilise le Cloud du dépôt et le backend de production.
