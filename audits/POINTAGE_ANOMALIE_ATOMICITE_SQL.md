# Pointage — atomicité SQL CLOCK_IN

## Résolution autorisée — 2026-11-05, dernière étape

**CLOCK_IN corrigé localement et validé sur PostgreSQL fictif A/B.** Les sections suivantes restent le constat historique avant autorisation. Patch distinct : [POINTAGE_CLOCK_IN_ATOMICITY_FIX.patch](./POINTAGE_CLOCK_IN_ATOMICITY_FIX.patch), construit contre l’instantané local avant cette correction ; GPS, V01, worker et changements utilisateur déjà présents sont exclus de ce delta. Liste exacte : [POINTAGE_CLOCK_IN_FILES.json](./POINTAGE_CLOCK_IN_FILES.json).

La propagation explicite concerne 38 fichiers, dont 35 fichiers de helpers/classes/modèles (paramètres facultatifs et transmission aux options SQL), la route, l’utilitaire d’idempotence et le nouveau type ClockInOptions. Ce volume vient des lectures transitives de planning, groupes/rotations, hiérarchie et relations ; aucun algorithme de planning/rotation, contrat HTTP ou mécanisme d’authentification n’est réécrit. BaseModel et les gardes V01 ne sont pas modifiés.

- Route CLOCK_IN : transaction Sequelize gérée READ COMMITTED sur TenantManager.getConnectionSync(), verrou FOR UPDATE de l’utilisateur pour sérialiser même l’absence de session ouverte ; recontrôle de l’idempotence sous verrou en réutilisant le comparateur existant (409 conservé si même external_id avec données différentes). Aucune modification de format GUID/ULID.
- Unité transactionnelle : contrôle géofence et accès QR, lecture d’horaire/rotation/hiérarchie, recherche et fermeture de l’ancienne session, GUID de chaque objet, nouvelle session, entrée, acceptation, mémo éventuel, lien entrée→mémo et alertes. Le même objet transaction est transmis par arguments jusqu’aux vrais appels Sequelize ; aucun CLS, transaction ALS implicite ou défaut global.
- Toutes les instances manipulées avant commit sont des copies de travail privées créées/chargées dans le parcours ; elles ne sont ni mises en cache global ni exposées. Leurs identifiants provisoires servent uniquement aux FK de la même transaction. Publication de la réponse/objets après résolution du commit ; sérialisation de réponse et ses lectures de présentation se font après commit comme publication, et non comme écritures de l’unité.
- FCM est mis en file locale via ClockInOptions.onCommit ; activité externe déplacée après confirmation du commit. Aucun hook afterCommit Sequelize utilisé comme preuve de succès. Échec de commit => pas de notification/activité ni succès HTTP, pas de nouvelle transaction/rejeu automatique. La perte simulée de confirmation après vrai COMMIT est distinguée d’un rollback.
- L’admission préexistante (PIN/licence, validation des identifiants et premier contrôle idempotent) précède l’unité CLOCK_IN. **Le middleware UserAuth met déjà à jour employee_license avant le PIN (`middle/user-auth.ts:45–53`) ; ce rafraîchissement d’authentification reste hors transaction métier et inchangé.** La garantie de rollback porte sur session/entrée/corrections/mémos/alertes, pas sur les effets externes ou ce rafraîchissement antérieur. Aucun changement des règles d’authentification autorisé/décidé ici.

### Dernières preuves

`postgres-clockin-atomicity.cjs` appelé depuis le vrai parcours HTTP/PIN : erreurs BEFORE INSERT session, entrée, mémo, alerte, puis BEFORE UPDATE ancienne session, chacune en A et B. Comparaison de **toutes les lignes et colonnes** des quatre tables avant/après : état identique après rollback, y compris date/statut de l’ancienne session ; zéro FCM/activité. Trace SQL de BEGIN à ROLLBACK : même PID physique pour toutes les lectures, GUID et écritures de l’unité. Le nominal produit toujours sessions/entrées/anomalies/mémos/alertes selon les règles existantes.

Concurrence : deux requêtes HTTP ont terminé leur authentification, barrière JS de test avant verrou (nécessaire car le refresh de licence préexistant écrit l’utilisateur), puis attente réelle des deux FOR UPDATE observée dans pg_stat_activity. Après libération, 201 + 200 idempotent, même GUID, une seule entrée ; test répété par tenant. A/B simultanés : 201 chacun, données séparées. Un succès concurrent produit exactement un appel d’activité et un FCM ; le replay ne les répète pas. L’ordre historique activité puis notification est conservé, désormais après commit. Réponse COMMIT incertaine : hook afterQuery échoue après COMMIT réel, une seule tentative/COMMIT, entrée durable présente, aucune notification/activité ou réponse de succès. Ce n’est pas une partition réseau réelle.

Dernière recette PostgreSQL : **sortie 1 uniquement pour PROVISIONING_RECOVERY_REQUIRED**, toutes suites CLOCK_IN/V01/worker/mémos préparées exécutées réussies. Migration MemoReads explicitement **non réexécutée** (`--skip-memo-migration`), artefact manuel inchangé. Autres validations : 58/58 applicatifs ; script mémos sortie0 et 4/4 tests complémentaires ; types Shared/API/BFF et Cloud réussis, sans remplacer dist.

Incidents de banc : première barrière utilisateur bloquait le refresh licence avant l’entrée en transaction, donc ne démontrait pas la course attendue ; barrière repositionnée après l’admission, sans affaiblir les gardes. Une promesse HTTP initialement non interceptée a arrêté Node ; seul le cluster marqué correspondant a été arrêté, son arrêt vérifié puis répertoire supprimé. Promesses désormais collectées avant les assertions. Un timestamp fictif situé dans le futur a été refusé comme prévu ; fixture ramenée dans le passé, aucune validation assouplie. Dernier passage nettoyé normalement.

### Limites et arrêt

Atomicité ajoutée à **CLOCK_IN seulement** ; ne pas extrapoler à CLOCK_OUT/pauses/waypoint, ni à l’authentification préalable. Les requêtes concurrentes hors CLOCK_IN et variantes complexes de calendriers historiques nécessitent encore une recette représentative ; les appels historiques des helpers gardent leurs défauts et les non-régressions planning/worker passent. Le verrou peut retarder d’autres mises à jour du même utilisateur ; drainage/PM2 reste à inspecter après autorisation. Pas de garantie de livraison exactly-once d’une notification après commit (pas d’outbox ajoutée), ni de rollback d’une erreur survenant après un commit confirmé. Aucun rattrapage d’anciennes sessions incohérentes.

Lots 3 et 4 restent des propositions dans [LOTS_3_4_CONCEPTION_FINALE.md](./LOTS_3_4_CONCEPTION_FINALE.md). Aucun accès production, migration réelle ou déploiement.


**Reproduit sur PostgreSQL fictif A/B après correction GPS. Non corrigé. Autorisation distincte nécessaire pour modifier la persistance transactionnelle du pointage.** Aucun schéma réel ou métier changé. Le test d'acceptation reste rouge.

## Reproduction et cause

`postgres-pointage-http.cjs` exécute la vraie route HTTP, le middleware/PIN, les classes et PostgreSQL dans le cluster privé. Un trigger de fixture BEFORE INSERT sur tk_time_entries lève V01_POINTAGE_INSERT_FAILURE pour latitude=2.5. Un CLOCK_IN valide reçoit une erreur ; depuis des requêtes de contrôle ultérieures :

| Tenant | Avant : entrées/sessions/mémos/alertes | Après |
|---|---|---|
| A | 10 / 4 / 2 / 3 | 10 / 5 / 2 / 3 |
| B | 10 / 4 / 2 / 3 | 10 / 5 / 2 / 3 |

Le trigger et sa fonction sont supprimés dans finally, uniquement dans les bases fictives. Assertion `POINTAGE_SQL_ATOMICITY_REQUIRED` : zéro écriture partielle attendu, échec explicite. Aucun croisement A/B observé.

Cause : `packages/api/src/tenant/routes/time.entries.route.ts:329` sauvegarde WorkSessions puis `:350` sauvegarde TimeEntries sans transaction commune. Ces deux instructions sont aussi dans HEAD et le fichier route n'a aucun diff local. `class/WorkSessions.ts:816` et `class/TimeEntries.ts:817` exposent save() sans transaction ; leurs modèles create/update également sans option transaction (`WorkSessionsModel.ts:473,505`, `TimeEntriesModel.ts:741,789`). Une transaction ouverte ailleurs n'engloberait pas implicitement ces appels. V01 reste actif, mais ALS n'apporte pas à lui seul une atomicité métier.

Le correctif GPS séparé remplace seulement les deux tests de présence qui rejetaient 0. Les tests latitude=0/longitude=0 passent ; les coordonnées invalides/null échouent avant toute écriture. Cela ne résout pas un véritable échec SQL après création de session. Aucun des trois correctifs worker ne répare le pointage.

## Correctif ciblé recommandé, à approuver avant implémentation

Pour commencer, rendre atomique l'unité CLOCK_IN démontrée, en conservant ses règles, réponses HTTP et anomalies : transaction gérée sur la connexion tenant courante, options explicitement propagées à toutes ses lectures/écritures participantes, GUID compris ; session + entrée + corrections + mémos/alertes concernés dans la même transaction si produits par ce parcours. Les requêtes sur les autres bases/services ne sont pas incluses par magie. Faire l'inventaire ciblé des méthodes de persistance de ce seul chemin avant édition.

Sauvegardes et helpers : ajouter des options facultatives compatibles avec les appels historiques, sans CLS global ni affaiblissement des gardes V01. Toute mutation mémoire et notification/activity externe publiée seulement après commit confirmé. Échec de n'importe quelle écriture => rollback ; commit incertain => pas de rejeu aveugle. Verrous nécessaires sur les lignes existantes réellement modifiées à définir selon les méthodes de correction existantes, sans inventer de nouvelle règle d'avancement ou de rejet.

Cette propagation dépasse deux contrôles GPS et touche les services d'anomalies et modèles de persistance : elle est volontairement proposée, pas implémentée sous l'autorisation GPS. Après validation du chemin CLOCK_IN, les autres types de pointage nécessitent leur propre couverture avant de promettre une atomicité complète.

Tests : INSERT session refusé, INSERT entrée refusé, UPDATE/correction ou mémo/alerte refusé ; snapshots des données avant/après, deux tenants concurrents, PIN/GPS/geofence/pauses/clôture inchangés ; commits et rollbacks sur même connexion/transaction ; mémoire/notifications après commit et absence de replay automatique. Aucun ajout de schéma ni donnée client.
