# V01 — refus de contexte lors de création interne du pool

Observation pendant la recette WORKER-IDS : une assertion du nouveau test traitait à tort une liste vide (`null` dans le contrat réel) comme un tableau. Après cet échec, une création de connexion encore en attente a hérité d’une portée révoquée. Le garde a refusé l’accès, mais son exception synchrone a échappé au pool : `TenantContextError: TENANT_CONTEXT_CLOSED` depuis `cm._connect`, appelé par `sequelize-pool/Pool._createResource`. Node s’est arrêté ; le cluster de test a été arrêté manuellement via son répertoire marqué, sans toucher aux autres services.

Cause V01 : le wrapper d’instance `cm._connect` exécute `assertConnection()` avant de retourner une promesse. Le pool Sequelize 6.37.8 attend que sa factory `create()` retourne une promesse et traite ses rejets ; une exception synchrone à ce point échappe à ce contrat interne. Aucun SQL non autorisé ni croisement de données observé.

Correction locale nécessaire à V01 : rendre uniquement ce wrapper asynchrone afin que le même garde et les mêmes erreurs deviennent des rejets de promesse. Aucun affaiblissement du garde, réanimation de contexte ou retry métier. Tester explicitement la création interne depuis une portée fermée et vérifier zéro client ouvert et zéro SQL envoyé. La sélection SQL du worker demeure une correction distincte, dans WORKER_IDS_FIX.patch.

Limite conservée : une acquisition héritant d’une portée déjà révoquée échoue explicitement. Cette correction ne transforme pas un travail abandonné en travail autorisé et ne garantit pas à elle seule un drainage borné en toutes circonstances.

## Vérification après correction V01

Reproduction avant correction : le nouveau test `AC26: pool creation from a revoked scope rejects asynchronously without opening a client` échoue sur `assert.doesNotThrow`, avec `TENANT_CONTEXT_CLOSED`. Correction : un seul mot-clé `async` sur le wrapper d’instance `_connect`.

Après correction, le même test passe avec le vrai ORM et sequelize-pool/pilote inerte, puis le scénario équivalent passe dans la suite PostgreSQL fictive : promesse rejetée, zéro SQL natif, aucun crash. Suite applicative : 58/58. Aucun garde désactivé et aucune connexion admise sous une portée révoquée.
