# V01 — anomalie observée sur PostgreSQL fictif, 2026-11-05

Constat avant correction : une transaction Sequelize non gérée est créée dans une portée A, effectue une insertion, puis la portée se termine sans commit/rollback explicite. `TenantManager.closeTenant(A)` attend indéfiniment le retour de sa connexion physique. Le scénario ajouté dans `postgres-scenarios.cjs` s’arrête à cette étape ; il ne constitue pas une réussite.

Reproduction : PostgreSQL 16.9/PostGIS sur cluster privé sans TCP, créé par `postgres-integration.cjs`. Les précédents scénarios bootstrap/existing, CRUD A/B, contraintes, savepoints, révocation et générations ont passé lors du passage précédent (sortie 0). La nouvelle suite étendue reste en échec/blocage.

Cause vérifiée : `attachTransaction()` dans `tenant.sql-guard.ts` encadre le rollback explicite mais n’enregistre aucun finaliseur de durée de vie. Le pool conserve la connexion empruntée par la transaction non terminée. La fermeture du jeton ALS empêche les nouvelles requêtes métier, mais ne libère pas à elle seule cette transaction.

Le handoff précédent indiquait à tort qu’un rollback automatique à la fermeture de portée était présent. Ce mécanisme est absent du fichier actuellement exécuté. Les tests avec pilote inerte ne prouvaient pas sa présence ni la fermeture réelle de la transaction abandonnée.

Impact : fuite d’une connexion puis drainage bloqué ; aucune lecture/écriture croisée observée. Une transaction non finalisée ne doit pas être utilisée dans une nouvelle opération. Ne pas réintroduire de fallback, relâcher les gardes ou forcer un commit pour libérer la connexion.

Correction ciblée envisageable, à examiner séparément : attacher un finaliseur au jeton de l’opération propriétaire, autoriser uniquement le rollback technique lié à ce propriétaire, coalescer les nettoyages concurrents et traiter les savepoints/transactions déjà terminées. Tester les erreurs de rollback et la fermeture physique du pool.

Nettoyage de cette exécution : identifier le seul cluster marqué appartenant au lanceur ; arrêter ce cluster temporaire et terminer le processus du test bloqué. Aucun service système ni base existante à arrêter.

## Résolution locale après documentation

Correction ciblée dans `tenant.sql-guard.ts` : finaliseur de portée lié par AsyncResource au propriétaire d’origine, rollback technique uniquement, single-flight de rollback, savepoints annulés par le rollback racine déjà engagé. Aucun élargissement des autorisations SQL métier.

Le test reproduisant le défaut est borné : en cas de régression il nettoie sa transaction via son propriétaire original puis échoue explicitement. Après correction, ce secours ne se déclenche plus, la fermeture réussit et l’insertion abandonnée est absente de la base. Suite PostgreSQL/PostGIS complète : sortie 0 ; 57/57 tests applicatifs, 15/15 sondes séparées et TypeScript API réussis.

Le cluster initial bloqué a été arrêté exclusivement via son propre répertoire marqué ; après vérification de son arrêt, le répertoire a été supprimé. L’arrêt a fait remonter 57P01 au client de contrôle du lanceur initial ; cette erreur de teardown n’est pas un nouvel échec d’isolation. Les reproductions suivantes sont bornées et se nettoient normalement.
