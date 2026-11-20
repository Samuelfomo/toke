# TOKÉ — V01 : préparation du correctif, sans changement applicatif

Complément soumis à approbation : [V01_CONCEPTION_DETAILLEE.md](./V01_CONCEPTION_DETAILLEE.md). Il précise les durées de vie Express, les limites des hooks Sequelize et le traitement de `sync({})` ; ses décisions proposées sur ces points remplacent les formulations générales ci-dessous, sans être encore implémentées.

État de préparation : 5 novembre 2026. Priorité révisée : V01 avant les autres corrections. Périmètre : sources actuelles, y compris modifications locales de l’utilisateur. Aucun changement de logique applicative, configuration, schéma ou contrat HTTP ; aucun accès en production, aucune installation, aucun démarrage de service.

Les seuls ajouts de cette étape sont le présent document et les outils/tests/fixtures sous `packages/api/verification/tenant-isolation/`. Les secrets et caches réels ne sont ni chargés ni reproduits.

## 1. Décision proposée

Utiliser `AsyncLocalStorage.run()` pour porter un tenant immuable par unité de travail, en conservant les signatures CRUD et les accesseurs existants. Compléter cette isolation par un propriétaire explicite de chaque instance Sequelize, un contrôle des transactions/modèles, et une initialisation unique en cours par tenant pour connexions et modèles.

La correction ne consiste pas seulement à remplacer un champ par AsyncLocalStorage : les entrées HTTP, le worker, le provisioning Master et les connexions explicites des routes intégrateur doivent tous établir une portée ; un objet ou modèle conservé au-delà de sa portée doit être contrôlé avant SQL. Aucun repli sur le dernier tenant ne sera admis.

## 2. Inventaire des dépendances

Relevé reproductible : `packages/api/verification/tenant-isolation/inventory.cjs`. Capture détaillée : `inventory.json` dans le même répertoire. Le relevé AST ignore les commentaires, contrairement à une recherche textuelle brute.

Capture : 857 fichiers TS/JS/CJS parcourus dans les packages hors dépendances, `dist`, vérifications et assets ; 32 références directes actives aux membres suivis ; 103 imports/accès indirects ciblés ; 186 frontières asynchrones candidates ; 168 fichiers dans la fermeture conservatrice des imports locaux. Ces derniers chiffres ne sont ni un nombre de vulnérabilités ni une liste de fichiers à modifier. Les alias et usages dynamiques ne sont pas une preuve de graphe d’appel exhaustif. Les références directes ci-dessous sont complétées par la revue manuelle des chemins connus.

### 2.1 Champ global : toutes les opérations actives trouvées

Chemin commun : `packages/api/src/tenant/database/db.tenant-manager.ts`.

| Ligne | Opération |
|---|---|
| 19 | Déclaration statique `currentTenant = null`. |
| 25 | Écriture du tenant dans `setCurrentTenant()`. |
| 30 | Lecture pour vérifier la présence dans `getCurrentTenant()`. |
| 33 | Lecture retournée par `getCurrentTenant()`. |
| 146 | Remise à zéro à la fermeture de toutes les connexions. |

### 2.2 Tous les appelants actifs du setter

| Fichier | Ligne | Portée actuelle |
|---|---|---|
| `packages/api/src/middle/tenant.middleware.ts` | 74 | Chaque requête HTTP tenant. |
| `packages/api/src/automate/automate.ts` | 39 | Traitement d’un tenant dans le worker. |
| `packages/api/src/master/routes/tenant.route.ts` | 825 | `PATCH /:guid/subdomain`, dans le callback de provisioning. |

L’occurrence Master vers la ligne 685 est commentée et n’est pas un appel actif. Aucun autre appel actif au setter n’a été trouvé dans les sources recherchées hors artefacts.

### 2.3 Tous les lecteurs actifs du getter

| Fichier | Lignes | Utilisation |
|---|---|---|
| `tenant/database/db.tenant-manager.ts` | 99, 112 | Choix de connexion implicite, async et sync. |
| `tenant/database/db.initializer.ts` | 51 | Indexation de l’initialisation par tenant. |
| même fichier | 88, 111 | Modèle individuel et collection de modèles. |
| même fichier | 126, 153 | État d’initialisation et statistiques du tenant courant. |
| `tenant/database/db.base.ts` | 219, 273, 319 | Logs des générateurs ; le SQL est déjà passé avant certaines de ces lectures. |

Les chemins de ce tableau sont relatifs à `packages/api/src/`. Le getter n’est donc pas seulement utilisé pour des logs : il détermine les connexions et les modèles CRUD.

### 2.4 Tous les accès actifs à une connexion tenant

| Fichier sous `packages/api/src/` | Lignes | Nature |
|---|---|---|
| `middle/tenant.middleware.ts` | 77 | Connexion explicite après écriture globale. |
| `automate/automate.ts` | 42 | Connexion explicite pour le tenant du worker. |
| `master/routes/tenant.route.ts` | 827 | Connexion explicite de provisioning. |
| `master/routes/integrator.route.ts` | 157, 182, 246 | Connexions explicites, SQL direct ; pas de setter aujourd’hui. |
| `utils/generate.database.ts` | 158 | Initialisation explicite d’un tenant, mais sans établissement du contexte. |
| `tenant/database/db.base.ts` | 16 | Connexion capturée dans le constructeur. |
| `tools/schedule.suggestion.approval.service.ts` | 222 | Transaction de publication. |
| `tools/schedule.assignment.adjustment.service.ts` | 528 | Transaction d’ajustement. |
| `utils/schedule.suggestion.bulk-edit.service.ts` | 1563 | Transaction de modification en masse. |
| `utils/schedule.suggestion.regeneration.service.ts` | 395 | Connexion de régénération. |
| `tenant/database/db.config.ts` | 14, 19 | Adaptateur historique : getter implicite puis fermeture globale. |

### 2.5 Dépendances indirectes

- `tenant/database/db.base.ts` : toutes les opérations CRUD sélectionnent un modèle par `TableInitializer.getModel()` ; plusieurs opérations utilisent aussi `this.sequelize` capturé auparavant.
- Les modèles de `tenant/model/` héritent de ce BaseModel ; les classes de `tenant/class/` héritent de ces modèles. Le relevé JSON conserve les imports concernés, sans exiger de modifier ces classes en masse.
- `tools/revision.ts:25` : `TenantRevision` hérite du BaseModel tenant ; `Revision` dans le même module hérite du BaseModel Master. Un import commun n’implique pas que les deux utilisent la même base.
- Les routes Tenant passent par le middleware commun (`tenant/app.ts:164`). Les services de planning font aussi leurs propres recherches de modèles, parfois dans des fonctions appelées après des attentes.
- `TableInitializer.cleanupTenant():187` et `cleanup():197` ne lisent pas le tenant courant : elles suppriment des registres explicites/globaux. Elles doivent néanmoins être coordonnées avec toute future initialisation en cours.
- `getAllStats()` et `isInitializedForTenant()` sont explicites et ne doivent pas exiger artificiellement une portée tenant.
- Les sources BFF/cloud n’accèdent pas directement à `currentTenant`. Leur contrat réseau ne doit pas changer pour V01.

## 3. Fonctionnement actuel et courses identifiées

### 3.1 Requête HTTP

`tenant.middleware.ts:65` charge la configuration, `:74` remplace le tenant global, `:77` attend la connexion, puis `:85` initialise les tables. La connexion est conservée dans `req.tenant`, mais les opérations des modèles ne lisent pas toutes `req.tenant` : elles relisent le contexte statique.

Entrelacement confirmé : A fixe son tenant, attend ; B fixe le sien ; A reprend avec sa connexion A mais l’initialiseur voit B. Si B est déjà initialisé, A peut continuer sans modèles enregistrés pour A. Sinon, la connexion A peut être enregistrée sous B.

### 3.2 Objet métier capturé

`BaseModel` capture Sequelize A au constructeur. Après une attente et le passage global à B, un CRUD récupère un modèle B, alors qu’une requête SQL brute sur le même objet continue d’utiliser A. Un objet peut donc combiner deux connexions dans une même opération logique.

### 3.3 Transactions

Transactions tenant explicitement repérées :

| Service | Acquisition | Début de transaction |
|---|---|---|
| Publication suggestion | `tools/schedule.suggestion.approval.service.ts:222` | 238 |
| Ajustement journée | `tools/schedule.assignment.adjustment.service.ts:528` | 540 |
| Modification en masse | `utils/schedule.suggestion.bulk-edit.service.ts:1563` | 1566 |
| Régénération | `utils/schedule.suggestion.regeneration.service.ts:395` | 669 |

Les modèles capturés avant une attente ne changent pas magiquement de connexion ; en revanche toute nouvelle recherche implicite de modèle après une attente peut sélectionner B. Une transaction A passée à un modèle B est une incohérence à rejeter avant exécution. Le banc la reproduit comme incohérence de sélection ; il ne prétend pas reproduire le routage exact du pilote PostgreSQL face à cette erreur.

`SERIALIZABLE` protège les opérations dans une base/transaction cohérente ; il ne répare pas le choix de base applicatif.

### 3.4 Connexions et modèles simultanés

- Connexions : le registre n’est rempli qu’après `authenticate()` (`db.tenant-manager.ts:81–88`). Deux premiers appels au même tenant ouvrent deux instances/pools. Une instance échouée n’est pas fermée par le catch actuel.
- Modèles : le registre n’est rempli qu’après tous les `sync()` (`db.initializer.ts:71–74`). Deux premières initialisations redéfinissent et synchronisent les modèles simultanément.
- Configuration : une connexion existante est réutilisée sur le seul nom du tenant, sans comparaison à une configuration contradictoire passée ensuite.

### 3.5 Master

Les modèles Master utilisent `master/database/db.base.ts` et leur propre initialiseur : ils doivent rester utilisables sans contexte tenant.

Le provisioning `master/routes/tenant.route.ts:726` exécute des opérations Master puis passe aux modèles tenant dans un callback `TenantOnboarding.provision`. Cette section doit ouvrir une portée tenant limitée, puis restaurer le contexte appelant, y compris en erreur.

Les trois routes intégrateur emploient explicitement `db.query()`/`db.authenticate()` sur une connexion tenant. Elles évitent aujourd’hui le setter, mais devront ouvrir une portée autour de leurs opérations tenant si un garde bas niveau est installé. Leurs requêtes Master resteront indépendantes.

`ManageTenantDatabase.initializeDatabase()` ne fixe pas le contexte malgré un argument `subdomain` explicite. Sans contexte antérieur il échoue ; avec un contexte B il peut initialiser A sous B. Aucun appel actif à cet utilitaire n’a été trouvé en dehors de sa déclaration ; le sécuriser évite néanmoins un chemin public interne incohérent.

### 3.6 Worker, callbacks et opérations hors HTTP

`automate.ts:72` parcourt les tenants séquentiellement dans une exécution. Cela limite l’entrelacement dans ce chemin, mais ne garantit pas l’absence de chevauchement entre deux déclenchements ou appels manuels. Le scheduler ne doit pas être utilisé comme mécanisme d’isolation.

`rotation.cron.ts:91`, `:117`, `:224`, `:253`, `:269` effectue des lectures/écritures via les classes tenant avec plusieurs attentes. Toute l’exécution d’un tenant doit rester dans sa portée. La fonction métier est simulée dans le banc actuel ; les règles de rotation ne sont pas modifiées ni certifiées par ces tests.

Les transactions transmettent normalement la portée native des promesses. Les EventEmitter partagés peuvent au contraire appeler un listener dans le contexte de l’émetteur : le test natif le démontre. Les callbacks nécessitant des modèles tenant devront ouvrir une portée explicite ou être liés intentionnellement à une portée connue ; les événements contenant seulement des GUID ne deviennent pas une preuve de tenant.

Les tâches Master de licence/paiement restent sur la base Master sauf chemin explicitement tenant. Ne pas entourer globalement toutes les tâches Master d’un tenant fictif.

## 4. Comparaison des approches

| Critère | AsyncLocalStorage aux frontières | Tenant/connexion explicitement propagés partout |
|---|---|---|
| Contrats HTTP | Inchangés | Inchangés possibles |
| Signatures CRUD et classes | Conservées avec gardes internes | Changements potentiellement nombreux |
| Surface initiale | Gestionnaire + initialiseur + entrées + gardes | Propagation à toutes les couches et appels imbriqués |
| Lisibilité de propriété | Implicite à l’appel, explicite dans la portée et le registre | Explicite à chaque appel |
| Callbacks partagés | Réouverture/liaison nécessaire | Paramètres à transporter explicitement |
| Objet/transaction réutilisé à tort | Nécessite garde propriétaire | Nécessite aussi validation des paramètres |
| Risque de migration | Modéré, si toutes les frontières sont couvertes | Élevé vu le volume d’appels existants |

Recommandation : **ALS pour l’unité de travail, propriété explicite des connexions/modèles/transactions**. Cela ne justifie pas une propagation généralisée de nouveaux paramètres dans tous les CRUD.

Une API interne additive `runWithTenant(tenant, callback)` est proposée. `getCurrentTenant()`, `getConnection()`, `getConnectionSync()` et les CRUD conservent leur signature. En revanche la sémantique autonome de `setCurrentTenant()` ne peut pas rester identique : elle doit être retirée des trois entrées ou limitée à vérifier une portée déjà existante, en refusant toute mutation. Utiliser `enterWith()` comme remplacement automatique du setter ne fournit pas la restauration explicite et maîtrisée recherchée.

Une portée imbriquée explicite peut être nécessaire dans Master ; elle restaure le parent. Le code HTTP normal ne doit pas changer de tenant en milieu de requête. Aucun setter mutable à l’intérieur d’une portée.

## 5. Mécanisme proposé de refus avant SQL

### Identités

1. Contexte logique immuable : identifiant tenant canonique, identifiant d’opération et origine (`http`, `worker`, `master`).
2. Registre privé propriétaire pour chaque Sequelize tenant : tenant, configuration de connexion, génération et état de vie. Ne jamais journaliser le mot de passe ou une empreinte exploitable de secret.
3. Modèles liés à cette instance Sequelize ; transaction liée à la même instance. La correspondance repose sur l’identité des objets/registre, pas seulement le nom affiché de la base.

### Contrôles

- Les getters implicites exigent un contexte ; absence = erreur avant accès au modèle/SQL.
- `getConnectionForTenant()` exige un contexte cohérent ou un chemin d’ouverture explicite documenté qui crée cette portée ; les appelants intégrateur/provisioning sont adaptés ensemble. Pas de permissivité silencieuse pour un appel sans contexte.
- L’initialiseur reçoit/vérifie un tenant explicite ou le tenant propriétaire du registre, et refuse une connexion A pour la portée B **avant `define`/`sync`**.
- BaseModel mémorise son tenant propriétaire et vérifie la cohérence avant chaque opération ; les modèles conservés directement et SQL bruts doivent aussi être protégés.
- Garde sur les instances Sequelize tenant gérées, en amont des requêtes et de la création/acquisition de connexions. Sequelize installé expose notamment `beforeQuery` et `beforeConnect` ; le choix exact des points d’interception doit être validé avec le vrai ORM isolé. Un seul garde dans le constructeur BaseModel serait insuffisant.
- Vérifier `transaction.sequelize`, propriétaire de l’instance, modèle et contexte ; interdire toute association contradictoire avant envoi de SQL.
- Les erreurs de sécurité ne doivent pas être avalées par les helpers qui retournent actuellement `null` sur erreur (`findLastModification`, générateurs). Conserver leurs valeurs métier normales, mais laisser remonter une erreur de contexte.
- Les opérations Master ordinaires ne passent pas par ce registre/garde tenant. Ne pas installer un hook Sequelize global sur toutes les connexions.
- Fermer/annuler proprement les transactions engagées : le rollback de nettoyage d’une transaction possédée ne doit pas être bloqué aveuglément parce qu’une portée appelante s’est terminée. Cette exception interne ne doit pas autoriser du SQL métier sans contexte.

### Durée de vie et limites

`ALS.run()` isole les chaînes asynchrones, mais ne les annule pas : un travail détaché créé dans une requête peut garder sa portée après la réponse. Le banc démontre cette propriété. Les travaux différés légitimes doivent avoir une portée de tâche propre et une politique de durée/annulation explicite ; ne pas marquer toutes les tâches héritées comme invalides sans vérifier le comportement existant.

Une fermeture globale doit attendre les initialisations en cours ou les invalider par génération avant fermeture. Sinon une connexion peut terminer son authentification et réapparaître dans le registre après l’arrêt.

## 6. Initialisation unique par tenant

Deux registres distincts de promesses en cours sont nécessaires : acquisition de connexion et initialisation des modèles.

Pour chaque tenant, le premier appel publie immédiatement sa promesse ; les appels suivants attendent la même promesse. La configuration fournie est comparée avant réutilisation. Les tenants A et B restent initialisables indépendamment ; aucun verrou global ne doit les sérialiser tous.

Succès : publier un objet prêt, puis retirer l’entrée en cours. Échec : retirer l’entrée, fermer la connexion possédée si nécessaire, ne pas publier d’instance partielle et permettre une reprise contrôlée. Le nettoyage doit être protégé contre la suppression d’une promesse plus récente. Les modèles partiellement définis nécessitent une stratégie de reprise testée ; le banc factice ne certifie pas le cycle de redéfinition du vrai Sequelize.

Le V01 proposé n’ajoute aucun `alter`, `force`, migration ou nouveau schéma. Le `model.sync({})` existant reste un effet d’initialisation à maîtriser : il peut créer des tables absentes ; une instance candidate ne doit pas être reliée aux données clients pour tester ce chemin.

## 7. Tests préparés et exécutés

Répertoire : `packages/api/verification/tenant-isolation/`.

| Fichier | Rôle |
|---|---|
| `harness.cjs` | Chargeur fermé et faux Sequelize en mémoire, fixtures A/B, barrières, middleware/worker/handler Master réels avec dépendances simulées. |
| `characterization.test.cjs` | 16 tests du comportement actuel, dont reproductions des défauts et contrats CRUD séquentiels. |
| `als-feasibility.test.cjs` | 4 tests des primitives natives ALS : promesses concurrentes, restauration imbriquée, EventEmitter, travail détaché. |
| `acceptance.test.cjs` | 16 exigences de sécurité exécutables contre le code actuel, volontairement rouges. |
| `inventory.cjs` / `inventory.json` | Relevé AST reproductible des références et dépendances. |
| `README.md` | Commandes, garanties d’isolation et limites. |

### Résultats

- **16/16 caractérisations réussies.** Leur succès inclut la confirmation de défauts, pas leur correction.
- **4/4 tests ALS réussis.** Ils ne remplacent pas TenantManager par une implémentation corrigée.
- **0/16 critères d’acceptation réussis : 16 échecs attendus, sortie 1.** Aucun test ignoré/TODO. Le code applicatif reste inchangé.

### Matrice des exigences d’acceptation

| Test | Exigence |
|---|---|
| AC01 | Deux portées simultanées A/B, attente contrôlée, lecture et écriture sans croisement. |
| AC02 | Middleware HTTP réel, connexions initialisées dans un ordre inversé, modèles associés au bon tenant. |
| AC03 | Une connexion/pool par tenant pendant acquisition concurrente. |
| AC04 | Une définition et synchronisation de chaque modèle pendant initialisation concurrente. |
| AC05 | Aucun tenant implicite après une requête HTTP achevée. |
| AC06 | Connexion A interdite sous B avant définition/synchronisation. |
| AC07 | Objet capturé en A interdit pour SQL brut dans B. |
| AC08 | Transaction A interdite pour CRUD B avant opération modèle. |
| AC09 | Worker réel : portée terminée en fin d’exécution. |
| AC10 | Handler Master réel : retour au contexte appelant après provisioning tenant. |
| AC11 | Commit A et rollback B concurrents, aucune association modèle/transaction croisée. |
| AC12 | Utilitaire d’initialisation explicite établit sa portée et restaure le parent. |
| AC13 | Connexion échouée fermée ; reprise possible. |
| AC14 | Configuration contradictoire d’un même tenant refusée sans réutilisation silencieuse. |
| AC15 | Deux entrées worker qui se chevauchent ne mélangent pas les écritures. |
| AC16 | Une erreur dans une portée imbriquée restaure le parent. |

L’absence de contexte au démarrage est également testée, avec zéro opération SQL factice ; le Master CRUD fonctionne sans contexte tenant.

### Garanties d’isolation du banc

Le chargeur ne fait jamais `import` des points d’entrée serveur : il lit les fichiers explicitement autorisés puis les transpile en mémoire. Les imports applicatifs ne peuvent résoudre que des objets fournis explicitement. Pas de vrai Sequelize/pg, dotenv, Redis, Axios, fs, email ou ordonnanceur dans les unités chargées. Aucun environnement réel transmis. Le constructeur factice n’accepte que deux bases fictives, un hôte réservé de fixture et le port 1 ; même ces paramètres ne déclenchent aucune connexion.

Le handler Master de provisioning ne crée aucune base : création, configuration/cache et dépendances Master sont simulées. La VM n’est pas présentée comme une protection contre du code source malveillant ; c’est un chargeur à capacités fermées pour les unités revues.

### Limites et tests restant nécessaires

- Transactions et rollbacks sont en mémoire : PostgreSQL, verrous, DDL, contraintes et PgBouncer ne sont pas certifiés.
- Le worker réel est chargé, mais la fonction métier de rotation est remplacée par une écriture factice. Les règles de rotation nécessitent des fixtures métier supplémentaires avant livraison.
- Les routes intégrateur explicitement connectées sont inventoriées mais pas exécutées par ce banc.
- Les structures de tables sont simulées. La reprise après échec partiel de `sync`, les hooks bas niveau et le drainage/fermeture doivent recevoir leurs tests lors de l’implémentation.
- Les erreurs de sécurité avalées par les helpers doivent faire l’objet de tests additionnels lorsque leur code d’erreur exact est défini.
- Les mocks devront être adaptés explicitement aux nouvelles dépendances/hooks : aucun fallback vers de vrais imports ne doit être introduit.
- Les anciennes caractérisations affirmant le bug ne constituent pas une porte de livraison future ; les convertir ou les conserver séparément comme preuve historique. L’acceptation finale exige les invariants corrigés et la compatibilité métier.

### PostgreSQL temporaire, étape ultérieure facultative ici mais recommandée avant production

Aucun PostgreSQL n’est créé pendant cette préparation. Pour la validation complète : cluster éphémère local, deux bases fictives et rôles distincts, schémas de test contrôlés, port loopback dédié, aucun credential réel, aucun accès réseau sortant. Le lanceur devra identifier le cluster et les bases par marqueur avant toute écriture et refuser les connexions non locales. Même GUIDs et valeurs contradictoires A/B pour rendre les croisements visibles. Éventuelle troisième base Master fictive pour une intégration complète.

Vérifier notamment `current_database()`, écritures après attente, commit/rollback réels, amorçage concurrent, modèle/transaction capturés et échec de connexion. Les dépendances locales absentes ne seront installées qu’après autorisation ; le banc actuel ne requiert aucune installation.

## 8. Fichiers envisagés pour le futur correctif

| Fichier | Modification envisagée | Risque / validation |
|---|---|---|
| `tenant/database/db.tenant-manager.ts` | ALS, portée explicite, registre propriétaire/configuration, acquisition unique, fermeture/reprise. | Transversal ; AC01/03/05/07/13/14/16 et hooks réels. |
| `middle/tenant.middleware.ts` | Encadrer connexion, modèles et `next()` dans une portée par requête ; aucun setter global. | Express async, erreurs, requêtes simultanées ; AC02/05. |
| `tenant/database/db.initializer.ts` | Tenant/propriétaire vérifié avant définition, initialisation unique, garde getModel, nettoyage coordonné. | Démarrage à froid/reprise/DDL ; AC04/06. |
| `tenant/database/db.base.ts` | Propriété capturée, vérifications CRUD/raw/transaction ; erreurs de contexte non avalées. | Valeurs de retour et pagination inchangées ; séquentiel + AC07/08. |
| `automate/automate.ts` | Portée par tenant incluant toute la fonction de rotation. | Ordre, erreurs, logs et scheduler inchangés ; AC09/15. |
| `master/routes/tenant.route.ts` | Portée limitée à la section tenant du provisioning. | Ne pas déplacer les écritures Master ni changer le contrat ; AC10. |
| `master/routes/integrator.route.ts` | Portée explicite autour des trois usages de connexions tenant. | Listes, sélection, authentification DB et fermeture ; tests locaux additionnels. |
| `utils/generate.database.ts` | Portée autonome dans `initializeDatabase()` ; séparer création admin et SQL tenant. | Aucun changement de schéma/provisioning ajouté ; AC12. |
| `tenant/database/db.config.ts` | Vérifier l’adaptateur historique et la fermeture ; ne pas l’utiliser comme fallback. | Compatibilité getter et arrêt. |
| Services planning cités section 3.3 | Revue des modèles/transactions ; modifications seulement si les gardes centralisés ne suffisent pas. | Publication, ajustement, régénération, bulk-edit ; tests existants + deux tenants. |

Chemins relatifs à `packages/api/src/`. Un module interne de contexte séparé peut être ajouté si cela évite des dépendances circulaires ; ce n’est pas une modification HTTP.

`master/database/db.base.ts` et les schémas Master ne devraient pas être modifiés. Cloud/BFF/shared/OR-Tools ne nécessitent pas de changement fonctionnel pour V01. Les dépendances BFF vers `@toke/api/dist` imposent toutefois de livrer les artefacts avec cohérence, sans remplacer en place un `dist` partagé actif.

## 9. Risques de régression et conséquences par composant

- API Tenant : nouvelles erreurs fermées sur les chemins qui fonctionnaient par contexte résiduel ; tous les points d’entrée doivent être couverts avant bascule. Aucun paramètre HTTP ajouté. Les requêtes légitimes gardent leurs réponses et leur sélection de base.
- Master : SQL Master inchangé ; provisioning et intégrateurs encadrent leur SQL tenant. Ne pas exiger une session/tenant pour une opération purement Master.
- Worker : un contexte neuf par tenant, même comportement séquentiel ; ne pas profiter du correctif pour paralléliser les rotations ou changer le calendrier.
- Transactions : rejeter les propriétaires contradictoires et préserver les rollbacks de nettoyage. Ne pas changer les niveaux d’isolation ni la politique de publication.
- Sessions/QR/PIN : pas de modification de protocole ni invalidation volontaire ; un redémarrage peut néanmoins interrompre des connexions en cours et tickets mémoire.
- Modèles : aucune mutation des enregistrements existants et aucun `alter/force`. L’initialisation existante par `sync({})` doit être observée et testée sur fixtures.
- Configuration : une config différente pour un tenant déjà connecté ne doit pas être acceptée silencieusement. La procédure légitime de changement de domaine/config doit drainer ou recréer explicitement la connexion, pas contourner le garde.

## 10. Prérequis de déploiement manuel et rollback

Avant déploiement : autorisation explicite du correctif ; revue des fichiers ; suite d’acceptation verte ; tests métier concernés ; essais réels à deux bases fictives ; versions Node/Sequelize et pools identifiées ; sauvegardes Master/tenants et restauration vérifiées ; inventaire des processus et options de tâches.

Les processus Node ne partagent pas leur mémoire, mais doivent recevoir des versions compatibles du code commun. Prévoir une release immuable, pas de compilation/nettoyage dans le répertoire actif. Mise à jour ciblée des consommateurs : API Tenant, Master et worker ; BFF seulement si son couplage aux artefacts l’exige. Ne pas utiliser un redémarrage PM2 global. L’instance unique `fork` implique une interruption possible : prévoir une fenêtre hors pics de pointage et hors rotation de minuit. Tout choix de double instance nécessite caches, tâches et connexions maîtrisés.

Avant une candidate : cache tenant absolu `/opt/toke/...`, PID, credentials et tâches doivent être isolés. Tester avec IMEDIATIS dans l’instance partagée n’isole pas le changement des autres entreprises. Aucune candidate de cette préparation n’a été démarrée.

Surveillance : erreurs de contexte et correspondance tenant/connexion sans secrets, connexions/pools en cours, init échouées, latence, 5xx, pointage, plannings, mémos, exécution rotation, opérations intégrateur. La tolérance à un croisement est zéro. Un seul croisement, contexte contradictoire ou écriture inattendue impose l’arrêt de la généralisation et l’analyse des données touchées.

Rollback : conserver l’ancienne release et les configurations associées ; aucun schéma à annuler prévu. Drainer les opérations, arrêter de façon ciblée, revenir à l’artefact validé puis reconnecter les pools. Ne pas restaurer les bases par défaut : cela effacerait les écritures légitimes depuis le déploiement. Une écriture déjà croisée nécessite une réparation ciblée, pas un simple retour de code.

Revenir au code actuel réintroduirait V01 : ce n’est pas un état final acceptable. Préférer une version corrigée de secours ; si un rollback vulnérable devient inévitable pour incident critique, il exige confinement et décision opérateur explicites, sans supposer qu’IMEDIATIS seul est affecté.

## 11. Autorisation encore attendue

La prochaine étape proposée est l’implémentation ciblée du contexte ALS et des gardes/single-flight décrits ci-dessus, puis passage des critères rouges au vert. **Cette étape n’est pas commencée : aucune logique applicative n’a été modifiée.**
