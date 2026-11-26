# TOKÉ — Correction de la visibilité des mémos côté manager

**24 novembre 2026 — Correctif local, validation en production en attente.**

La page Mémos lançait son chargement au montage, alors que la session manager pouvait encore être en cours d’initialisation. La liste se charge désormais dès qu’une session complète est disponible. Les profils PM2 de production omettaient aussi le paramètre d’activation de la lecture B2.

## Fichiers ajustés

| Fichier | Modification |
| --- | --- |
| [packages/cloud/src/views/memo/memosView.vue](../../packages/cloud/src/views/memo/memosView.vue) | Charge la liste à l’arrivée de la session et ignore les erreurs d’une requête devenue obsolète. |
| [ecosystem.config.cjs](../../ecosystem.config.cjs) | Active par défaut la lecture B2 en production pour `api-tenant` et `api-backend`. |
| [packages/api/ecosystem.config.cjs](../../packages/api/ecosystem.config.cjs) | Applique la même valeur par défaut au profil autonome de l’API Tenant. |

Une valeur explicite de `MEMO_B2_PRODUCTION_MANAGER_READS` prime sur le défaut dans les profils PM2. Les contrôles de session, d’entreprise et d’accès au mémo continuent de s’appliquer.

## Vérifications et déploiement

`git diff --check` et le contrôle des valeurs par défaut des profils PM2 ont réussi. Aucune suite de tests ni vérification sur une instance de production n’a été exécutée.

Avant d’appliquer la configuration PM2, vérifier le schéma et les droits B1 des tenants concernés. Déployer le Cloud, appliquer les profils de production au BFF et à l’API Tenant, puis vérifier la liste et le détail avec une session manager réelle. La [procédure de validation et de retour arrière](../2026-11-14/TOKE_MEMOS_WEB_FINALISATION.md#activation-exacte-à-effectuer-uniquement-par-lopérateur-autorisé) détaille les contrôles.
