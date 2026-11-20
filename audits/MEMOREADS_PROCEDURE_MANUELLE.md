# MemoReads — migration manuelle préparée, non exécutée sur une base réelle

Script : `packages/api/migrations/manual/memo_reads_v1.sql`. Ne fait partie d'aucun démarrage applicatif, sync existing ou déploiement automatique. La proposition précédente dans audits reste historique et limitée au cluster fictif. Le script portable exige confirmation explicite du nom de base et du rôle ; ce contrôle évite une cible accidentelle, **il ne constitue pas une autorisation de production**.

## Avant toute intervention réelle, après autorisation distincte

1. Identifier release, inventaire exact de tenants/base/rôle/hôte depuis une source vérifiée, sans exporter les mots de passe. HEAD et IMEDIATIS ne représentent pas la production entière. Vérifier versions PostgreSQL et schéma public/noms physiques tk_memos/xa_users. Toute variante => arrêt et étude ciblée.
2. Sauvegarde vérifiée Master/tenants, pièces et configurations/artefacts de rollback ; preuve de restauration hors production. La migration ne change que MemoReads ; une restauration globale pour ce seul ajout pourrait écraser de nouvelles données métier.
3. Préflight en lecture seule par base : PK parents INTEGER, propriétés et ACL, table/index/séquence homonymes, colonnes et defaults si table présente, PK/FK/validité/index unique non différable, contraintes supplémentaires, doublons/orphelins le cas échéant. Ne pas journaliser le contenu des mémos. Le script refuse une incompatibilité plutôt que la réparer ; des variantes équivalentes peuvent nécessiter une adaptation approuvée.
4. Prévoir blocage bref de DDL/écritures concernées et timeouts (lock 3s, statement 15s). Ne pas l'exécuter sur tous les tenants en parallèle. Faire valider le premier passage et ses contrôles avant le suivant ; les processus applicatifs restent partagés.

## Exécution future contrôlée (exemples non exécutés)

Session psql dédiée, `-X`, `ON_ERROR_STOP=1`, credentials via mécanisme approuvé hors ligne de commande/logs. Utiliser le rôle propriétaire applicatif du tenant, ou SET ROLE explicitement autorisé ; aucune promotion automatique et aucun secret dans le fichier SQL. Confirmer base, utilisateur effectif et serveur hors du script avant de continuer.

```sql
-- Valeurs fournies par l'opérateur après vérification de la cible.
SELECT set_config('toke.migration.expected_database', :'target_database', false);
SELECT set_config('toke.migration.expected_role', :'target_role', false);
-- Dans la même session psql, uniquement après autorisation :
-- \i /release_verifiee/packages/api/migrations/manual/memo_reads_v1.sql
```

Le script ouvre une transaction, fixe search_path/timeouts, prend un verrou advisory par base, crée la table/index si absents et contrôle colonnes, propriétaire, séquence/usage, PK, FK CASCADE et index unique utilisable par ON CONFLICT. Aucun UPDATE de données existantes, aucun backfill, aucun DROP/ALTER réparateur. Une table compatible déjà présente est conservée ; objets incompatibles => erreur et rollback. Ne pas relancer automatiquement après issue de commit incertaine : d'abord lire le catalogue et réconcilier.

## Après chaque base

Vérifier colonnes/types/PK/FK/index valide immédiat, default/read_at, séquence appartenant à id et droits du rôle applicatif. Vérifier données antérieures inchangées et absence de changement de tk_memos/xa_users. Tester lecture/écriture par parcours autorisé selon procédure de recette approuvée ; aucune écriture de test chez un client n'est autorisée par ce document. La validation fonctionnelle réelle nécessite un plan distinct.

Coordonner ensuite les générations/pools de tous les processus qui ont mémorisé le modèle indisponible : V01 ne le rend pas automatiquement disponible dans une génération existante. Pas d'invalidation forcée pendant des transactions actives. Les redémarrages/drainages éventuels font partie d'une future procédure manuelle autorisée séparément. Ne pas livrer un Cloud dépendant de /read avant disponibilité API/BFF et schéma vérifiée sur toutes les cibles.

Rollback : avant COMMIT, ROLLBACK du script ; après COMMIT, conserver la table additive et ses données de lecture. Retour de code coordonné Cloud/BFF/API/shared vers une version vérifiée compatible ; pas de DROP automatique. L'ancien code SQL non isolé n'est pas un rollback de sécurité acceptable sans analyse. Un retour de commit ne restaure ni sessions, caches, données ni secrets.

## Preuves locales et limites

Le banc `postgres-memo-migration.cjs` refuse les cibles hors cluster marqué V01 via le pilote local. Il exerce le brouillon sous contrôle fictif puis le portable sous les vrais rôles tenant fictifs non superuser. Création/idempotence/données conservées, droits séquence/upsert, FK/NOT NULL/unique, CASCADE, table et index incompatibles, et rollback de table/séquence après échec volontaire. Résultats exacts du dernier passage : voir le rapport de stabilisation et V01_HANDOFF. Aucun schéma historique réel inspecté ; aucune permission réelle supposée.
