# TOKÉ — V01 : conception détaillée soumise à approbation

Complément à [V01_PREPARATION_CORRECTIF.md](./V01_PREPARATION_CORRECTIF.md). Aucune implémentation applicative, configuration, migration, modification de schéma ou donnée métier dans cette étape. Aucun service de production contacté. Les seuls nouveaux exécutables sont des sondes de framework isolées dans `packages/api/verification/tenant-isolation/`.

## Synthèse des décisions

**Recommandation : ALS par opération + propriétaires explicites et générations + gardes tenant à plusieurs niveaux + single-flight.** Ne pas modifier les signatures CRUD ni les contrats HTTP. Les connexions Master restent hors du gestionnaire tenant.

Trois précisions corrigent une lecture trop optimiste du premier rapport :

1. `run()` ne définit pas à lui seul la durée de vie d’une requête Express, et une promesse rejetée traitée hors de `run()` peut perdre le contexte.
2. `beforeQuery` est trop tardif pour empêcher l’acquisition ou tout le SQL d’initialisation du pilote ; les hooks seuls sont insuffisants.
3. `model.sync({})` peut modifier un schéma existant : index et enums notamment. Le maintenir tel quel ne permet pas de promettre « aucune modification de schéma ». Le choix de séparation initialisation/synchronisation doit être approuvé explicitement.

Versions **réellement installées et relues** : Sequelize **6.37.8**, Express **5.3.0**, router **2.2.0**, pg **8.23.1**. Ce ne sont pas les simples plages des manifests. Leur identité en production reste à vérifier manuellement. Les garanties ci-dessous doivent être revalidées pour tout autre assemblage.

## 1. Contrat exact de `runWithTenant()`

Contrat interne proposé, non implémenté :

```ts
runWithTenant<T>(tenant: string, work: () => T, options?: TenantScopeOptions): T
```

`T` peut être une valeur synchrone ou une `Promise<R>` : préserver la forme de retour est nécessaire pour les constructeurs/getters synchrones existants. La portée est exécutée par `AsyncLocalStorage.run()`, jamais par mutation d’un contexte global. Pas de `Sequelize.useCLS()` : cela changerait implicitement la propagation transactionnelle pour d’autres connexions.

### Validation

- Exiger chaîne non vide, longueur bornée, représentation canonique conforme au format des domaines actuellement admis. Rejeter tableaux, objets, whitespace, URL complète, port ou caractères interdits ; pas de conversion permissive d’un tenant inconnu vers un autre.
- Conserver la validation actuelle comme référence de compatibilité ; ne pas profiter de V01 pour ajouter un nouveau format IDN, modifier les domaines ou accepter des entrées auparavant refusées.
- Cette fonction valide une identité logique ; elle **n’authentifie pas l’utilisateur** et ne rend pas une configuration DB arbitraire fiable.
- La résolution/cache active et la cohérence référence/domaine/configuration restent obligatoires aux frontières. Le gestionnaire n’acquiert que la configuration vérifiée de cette identité. Une portée inconnue ne peut pas ouvrir une connexion par défaut.

### Contenu de portée

Descripteur gelé : `tenantId`, `operationId`, `origin`, référence à un jeton de durée de vie privé. La génération de connexion est épinglée au premier accès pour ce tenant dans cette opération. L’état mutable du jeton et des générations est gardé dans des registres privés ; le descripteur ALS ne permet pas de modifier son tenant.

`TenantScopeOptions` est interne : origine, jeton de vie délivré par une frontière, et éventuelle capacité privée de changement de tenant pour une opération Master. Aucun `skipGuard`, `allowMissingContext` ou booléen fourni par une requête.

### Imbrication et restauration

| Cas | Contrat |
|---|---|
| Pas de parent | Nouvelle opération, identité et jeton propres. |
| Parent actif, même tenant | Réutiliser la même opération et génération ; ne pas prolonger la durée de vie du parent. |
| Parent actif, autre tenant en HTTP/CRUD ordinaire | Refuser `TENANT_CONTEXT_MISMATCH` avant acquisition. |
| Changement explicite dans une opération Master autorisée | Capacité interne dédiée ; nouvelle opération tenant, parent restauré à la sortie. Les objets/transactions du parent ne sont pas transportables vers l’enfant. |
| Retour normal ou exception synchrone | ALS restaure immédiatement le contexte du code appelant ; résultat/erreur conservé. |
| Travail asynchrone attendu | Ses ressources asynchrones conservent leur portée ; fermeture du jeton au règlement de la promesse dans les entrées à durée de vie de callback. |
| Exception/rejet | Pas de fallback ; fermeture de la durée de vie possédée par cette entrée, nettoyage contrôlé puis propagation de l’erreur d’origine. |

Le setter actuel ne peut pas conserver sa sémantique autonome. Les trois appels sont remplacés ; un éventuel symbole conservé temporairement ne peut que vérifier une portée déjà établie et identique, jamais en créer une ni changer de tenant.

### Durées de vie distinctes

- **Callback attendu** : Master/utilitaire/worker ; le jeton propre se ferme après règlement de `work`, une fois les transactions gérées nettoyées.
- **Requête HTTP** : jeton attaché au cycle réel requête/réponse, pas au retour de `next()` ; voir section 2.
- **Travail détaché** : interdit de continuer du SQL métier sous un jeton HTTP terminé. Pour un travail légitime identifié, création d’une opération de tâche indépendante avant son détachement, avec tenant vérifié, propriétaire, suivi des erreurs et durée bornée. Ne pas réanimer un jeton fermé depuis un `req` conservé.

ALS ne tue ni les promesses ni les requêtes SQL déjà parties. Une réponse terminée peut révoquer de nouvelles admissions SQL, pas annuler rétroactivement une écriture engagée. Les opérations post-réponse existantes doivent être recensées et classées avant activation de cette règle ; leur blocage silencieux serait une régression.

## 2. Middleware Express 5 et parcours d’erreur

Point actuel : `packages/api/src/middle/tenant.middleware.ts:34–104`. Ordre global : `packages/api/src/tenant/app.ts:158–164`.

Séquence proposée :

1. Extraire/valider l’identité puis charger la configuration active, sans SQL tenant implicite.
2. Créer un jeton HTTP privé ; attacher un finaliseur idempotent à `res.finish` et `res.close`, et traiter une interruption avant réponse. Ne pas utiliser aveuglément `req.close` comme fin normale : la lecture du corps et la réponse n’ont pas la même durée.
3. Dans `runWithTenant`, acquérir la génération, initialiser les modèles, compléter `req.tenant`, puis appeler `next()` **dans cette portée**.
4. Enregistrer aussi **dans cette portée** la gestion du rejet de l’initialisation et l’appel à `next(error)` ou au convertisseur d’erreur existant. Ne pas retourner simplement une promesse ALS dont le routeur enregistrerait le rejet après restauration du parent.
5. Les handlers `async` appelés par ce `next()` héritent du contexte ; les rejets de ces handlers sont enregistrés par le routeur dans ce même parcours.
6. Les error-handlers et logs restent dans le contexte actif tant que la requête est légitime. Avant établissement d’un tenant, l’erreur reste sans tenant et ne peut exécuter du SQL tenant.
7. En fin/rupture de réponse, fermer le jeton HTTP et retirer les listeners ; ne pas fermer le pool partagé. Les opérations déjà admises sont suivies jusqu’au règlement, les nouvelles opérations sous ce jeton sont refusées.

`next()` ne renvoie pas une promesse représentant la fin des handlers : ni `await next()` ni un `finally` de callback autour de `next()` ne doivent fermer prématurément le jeton.

Les callbacks EventEmitter/stream créés hors chaîne ALS ne sont pas automatiquement liés au contexte d’enregistrement. Pour un callback réellement autorisé à faire du SQL : entrée explicite ou liaison contrôlée avec vérification du jeton. Les finaliseurs `finish/close` n’effectuent pas de SQL métier ; ils n’ont donc pas besoin de ressusciter une portée.

**Preuves exécutées avec le vrai Router Express**, requêtes synthétiques sans serveur : contexte conservé dans deux routes async concurrentes et leurs erreurs ; contexte perdu pour une rejection de setup enregistrée hors ALS ; conservation quand le catch et `next(error)` sont enregistrés dans ALS. Source framework : `node_modules/router/lib/layer.js:106–165`.

## 3. Invariants de sécurité et points de contrôle

Notation : `C` contexte, `G` génération, `S` instance Sequelize, `M` modèle, `T` transaction, `P` connexion physique.

| Invariant | Vérification |
|---|---|
| I1 — Contexte requis et actif pour tout SQL métier tenant | Getters, BaseModel, entrée `S.query`, entrée transaction, acquisition et pilote gardé. |
| I2 — `C.tenantId = G.tenantId = owner(S).tenantId` | Registre privé par identité d’objet, pas comparaison du seul nom de base. |
| I3 — Génération épinglée = propriétaire S/M/P | Getter, initialiseur avant `define`, BaseModel, query et driver ; génération invalidée jamais réactivée. |
| I4 — `M.sequelize === S` et instance métier propriétaire cohérente | Accès `getModel`, CRUD et query finale. Les `options.model`/`options.instance` contradictoires sont refusés. |
| I5 — `T.sequelize === S`, propriétaire enregistré et même opération | Enregistrement à la création transaction, options de query, commit/rollback et pilote ; parent/savepoint également vérifié. |
| I6 — Configuration fournie = configuration de G | Avant réutilisation ou attente d’un single-flight. Identité cible host/port/base/rôle/options significatives ; credentials comparés en privé, jamais loggés. |
| I7 — Une unité logique ne change pas de génération en milieu de traitement | Épinglage dans l’opération ; jamais de repli automatique sur une nouvelle génération. |
| I8 — Master indépendant | Aucun hook/prototype global installé sur Sequelize ; seulement instances/driver tenant gérés. |
| I9 — Publication exclusivement après succès complet et contrôle de génération | Registres connexions et modèles ; aucune instance partielle exposée par un getter. |
| I10 — Nettoyage limité à son propriétaire | Aucune fermeture de pool d’un autre tenant ; rollback technique possède une capacité interne étroite. |

### Gardes recommandés

Un module adaptateur tenant centralise les gardes, sans réécriture généralisée des CRUD :

1. `TenantManager`/`BaseModel` : refus précoce et erreurs compréhensibles.
2. Instance tenant de Sequelize : interception contrôlée de `query()` et `transaction()` avant acquisition ; contrôle de toutes les formes d’arguments admises. Pas de monkey-patch du prototype global.
3. Entrée d’acquisition du gestionnaire de connexion : contrôle avant la détection de version et avant pool, car les transactions acquièrent également par ce chemin. Cette interception dépend d’une API interne 6.37.8 : elle sera isolée et couverte par tests de version.
4. `beforeQuery`, `beforeConnect`, hooks pool : vérifications complémentaires aux frontières framework, pas unique protection.
5. **Pilote pg tenant injecté par `dialectModule`**, avec `Client.query()` gardé dès la construction, pour le SQL brut natif et l’initialisation qui contourne `Sequelize.query`. Préserver les surcharges callback/promesse et objets Query réellement utilisés. Refuser une configuration `native`/replication/dialectModule non couverte plutôt que contourner la protection ; leur usage réel est un prérequis à inspecter.

Le niveau pilote est une recommandation de conception soumise à approbation, pas un code déjà validé. Il ajoute une surface de compatibilité significative : les sondes actuelles prouvent le besoin, pas la correction du futur adaptateur.

### SQL technique d’initialisation

La détection de version Sequelize transmet parfois `{ transaction: { connection } }`, sans objet Transaction réel (`abstract/connection-manager.js:174–183`). Rejeter aveuglément tout objet de ce type casserait la connexion.

Prévoir une capacité **privée d’infrastructure** : propriétaire/génération, phase acquisition/initialisation, liste fermée des requêtes techniques attendues de cette version. Elle autorise seulement les SET de session et lectures de métadonnées identifiées ; jamais du SQL métier. Le garde ne la déduit ni de `options.raw`, ni de `transaction.connection`, ni d’un commentaire SQL fourni par l’appelant.

Les créations physiques par le pool sont du travail infrastructurel partagé, pas une raison de réutiliser le jeton HTTP du premier appelant indéfiniment. Une génération abandonnée ou invalidée ne peut plus publier de connexion ; les initialisations techniques déjà admises se terminent puis ferment le résultat, sans pouvoir accepter du SQL métier.

**Limite honnête :** ce dispositif protège les chemins applicatifs et les APIs ORM/pilote supportées. Il n’isole pas du code JavaScript hostile qui accéderait directement au socket/protocole interne pg ou créerait un autre pilote. Interdire ces accès dans les sources par contrôle statique ; l’isolation système/droits SQL reste une autre barrière. V01 ne remplace pas l’autorisation des utilisateurs V02.

## 4. Vérification technique de Sequelize 6.37.8

| Chemin constaté | Garantie du framework | Contrôle Toké encore nécessaire |
|---|---|---|
| `lib/sequelize.js:235–326`, `query()` | `beforeQuery` précède `Query.run`, mais suit l’acquisition ; le finally tente `afterQuery` et libération hors transaction. | Refus à l’entrée et avant acquisition ; garder le pilote. |
| même fichier `:295–305` | Vérifie une transaction terminée ; prend directement `options.transaction.connection`. | Vérifier propriétaire/opération : aucun contrôle d’appartenance à `this` ici. |
| `abstract/connection-manager.js:168–203` | Détection version avant `beforePoolAcquire` ; réutilisation du pool. | Garde d’entrée ; traiter le contexte technique de version. |
| même fichier `:220–224` | `beforeConnect` avant connexion dialecte et `afterConnect` après. | `beforeConnect` ne concerne pas chaque emprunt d’un client déjà connecté. `afterConnect` arrive après du SQL dialecte. |
| `postgres/connection-manager.js:163–207` | SET et métadonnées envoyés par `connection.query()`. | Ces commandes ne passent pas par `beforeQuery` ; injection pg gardée dès construction. |
| `lib/transaction.js:83–120` | Acquiert une connexion, BEGIN/isolation, tentative rollback en erreur setup. | Propriétaire, génération, opération et cleanup sécurisé. |
| `lib/sequelize.js:493–517` | Transaction gérée : rollback sur rejet du callback, commit sinon. | Aucun invariant tenant automatique ; garder commit/rollback explicites et parent/savepoint. |
| `lib/transaction.js:30–55` | Hooks `afterCommit` exécutés après tentative commit ; une erreur peut faire rejeter la promesse après écriture déjà commitée. | Ne pas conclure « promesse rejetée = aucune écriture ». Tests après-commit obligatoires. |
| `abstract/connection-manager.js:68–72` | `close()` interdit les nouvelles acquisitions puis draine/détruit le pool. | Ne coordonne ni registres Toké, ni initialisations en attente, ni tous les callbacks déjà lancés. |

`hooks:false` passé à `query()` ne désactive pas son appel inconditionnel à `beforeQuery` dans cette version : sonde exécutée. Cela n’empêche pas la suppression/mutation de hooks par du code interne ; ne pas exposer cette mutation comme API métier.

Sequelize n’apporte pas automatiquement les garanties tenant. Aucun `useCLS` actif n’a été trouvé dans les sources examinées ; sa présence à l’exécution doit être vérifiée. Si une transaction implicite CLS est installée ailleurs, refuser ou intégrer explicitement ce mode avant déploiement ; ne pas présumer que `options.transaction` contient toujours toute la vérité.

### Preuves locales nouvelles

`sequelize-framework-probes.test.cjs` : **8/8 sondes réussies**, vrai Sequelize/dialecte, pilote PostgreSQL inerte injecté. Vérifie ordre des hooks, absence de beforeQuery sur SQL d’initialisation, pool réutilisé, transaction étrangère acceptée par le framework, hooks:false et effets de sync.

`express-context-probes.test.cjs` : **3/3 sondes réussies**, vrai Router, aucun serveur ni socket réseau.

Ces sondes ne chargent aucun module applicatif, aucun `.env`, aucun cache ou service réel. Le faux Client ne sait pas ouvrir de connexion ; les paramètres sont fictifs. Elles ne sont pas des tests PostgreSQL réels.

## 5. Single-flight et machine d’état

Registre par tenant, génération monotone et objet d’entrée unique :

`ABSENT → CONNECTING → CONNECTED → DEFINING → READY → DRAINING → CLOSED`

Une erreur conduit à `FAILED`, puis nettoyage ; la reprise utilise une nouvelle génération, pas des modèles partiellement définis. Les promesses connexion et modèles sont distinctes mais rattachées à la même entrée. `CONNECTED` peut servir une introspection intégrateur explicitement autorisée, sans publier les modèles comme prêts.

### Création/publication

1. Vérifier contexte, configuration et admissions. Créer et enregistrer l’entrée et sa promesse **avant tout await**.
2. Construire l’instance avec propriétaire et gardes déjà installés, puis authentifier sous capacité infrastructurelle contrôlée.
3. Attendreurs : même tenant/config/génération attendent la même promesse ; A et B ne se bloquent pas mutuellement.
4. Avant publication, vérifier identité de l’entrée courante, génération, absence d’invalidation et succès.
5. Initialisation modèles : même discipline ; seul un registre complet devient accessible. Aucun getter ne retourne la Map en cours de remplissage.

L’abandon du premier appel HTTP ne doit pas fermer un pool en cours utilisé par d’autres attenteurs. Il révoque son jeton, pas toute la génération. Après attente, chaque appelant revérifie son propre jeton avant de poursuivre.

### Échec/reprise

- Tous les attenteurs observent le même échec ; aucune reprise automatique infinie ni fallback.
- Retirer une entrée seulement si c’est encore exactement celle que l’appel possède ; un vieux `finally` ne supprime pas une génération nouvelle.
- Fermer l’instance échouée, supprimer ses modèles privés, rendre l’échec observable sans secrets. Une reprise explicite/borne crée une nouvelle génération après nettoyage confirmé.
- Une définition/synchronisation partielle ne se reprend pas sur la même Map comme si elle était saine. En mode bootstrap, traiter séparément tout DDL déjà effectué.

### Fermeture/invalidation

1. Poser `DRAINING` avant les await ; refuser les nouvelles opérations et nouvelle publication.
2. Révoquer les travaux non admis ; laisser les opérations déjà admises et transactions actives terminer dans la génération épinglée, sous délai opérateur défini.
3. Attendre les initialisations en cours. Une authentification tardive ne peut plus publier : son résultat est fermé.
4. Fermer les connexions, supprimer uniquement les registres possédés, puis `CLOSED`.
5. Si délai expiré : ne pas prétendre qu’une promesse ou un SQL en vol est annulé. Maintenir la génération indisponible ; fermeture forcée/processus ciblé uniquement sur décision opérateur. Aucune nouvelle génération déclarée saine tant que l’ancienne fermeture est indéterminée.

`closeAllConnections()` pose aussi une barrière globale du gestionnaire avant d’énumérer les entrées ; sinon un nouvel appel peut s’ajouter pendant la fermeture. Pas de `ALS.disable()` pour simuler un nettoyage de requête.

## 6. Changement légitime de configuration PostgreSQL

**V01 ne propose pas de reconfiguration silencieuse ni hot-swap automatique.** Un changement host/port/base/rôle/credential/options significatives pour un tenant déjà connecté retourne `TENANT_CONFIG_CHANGED` ; aucun retour de l’ancien pool à un demandeur présentant la nouvelle configuration.

Procédure recommandée : préparer la configuration cohérente sur les consommateurs, bloquer les nouvelles admissions du tenant, drainer ses opérations, fermer ancienne génération, invalider modèles, publier configuration puis créer/valider nouvelle génération. Les autres tenants gardent leur état dans chaque processus, mais les ressources CPU/DB restent partagées.

L’identité de génération est locale au processus. Une mise à jour du cache seul ne coordonne pas Master/Tenant/worker : en V01, traiter ce changement comme une opération manuelle planifiée avec synchronisation des consommateurs, éventuellement redémarrages ciblés. Une API d’administration de hot-reload n’est pas nécessaire pour le correctif initial.

Un renommage de domaine ne doit pas créer deux identités concurrentes vers la même base active. Vérifier mapping référence stable ↔ domaine ↔ cible SQL, retirer explicitement l’ancienne entrée, sans changer les références publiques dans V01.

Un rollback de configuration/credential est différent d’un rollback de code. Ne jamais revenir au seul nom du tenant pour choisir une ancienne connexion. Le cas de changement de mot de passe sans changement de base doit aussi invalider la génération.

## 7. Objets capturés et transactions réutilisées

| Objet réutilisé | Règle |
|---|---|
| BaseModel/service d’A dans B | Refus avant CRUD/raw. Propriétaire capturé au constructeur ; garde final indépendant. |
| Même tenant, génération ancienne | Refus `TENANT_GENERATION_STALE`, même si le pool n’a pas encore physiquement disparu. |
| Modèle statique de même tenant/génération dans une autre requête | Réutilisable : c’est la définition partagée attendue ; jeton courant actif obligatoire. |
| Service stateless même tenant/génération | Réutilisable si son contrat le permet ; V01 ne le transforme pas en singleton ni n’autorise ses états utilisateur cachés. |
| Transaction d’une autre requête/opération, même tenant | Refus : une transaction appartient à son opération créatrice. |
| Transaction terminée ou savepoint d’un autre propriétaire | Refus avant SQL ; parent doit être enregistré et cohérent. |
| Connexion physique native conservée | `Client.query()` applique les mêmes gardes ; pas de permis durable par possession de l’objet. |
| Callback partagé | Liaison/entrée explicite à une opération active ; pas de confiance dans le contexte d’un émetteur quelconque. |
| Tâche détachée après réponse | Jeton HTTP révoqué ; tâche légitime doit avoir une opération distincte suivie. |

Commit exige l’opération active propriétaire. Rollback de nettoyage peut utiliser une capacité privée attachée à la transaction enregistrée, uniquement pour le SQL de rollback/savepoint et libération. `options.completesTransaction` n’est pas un permis : c’est un attribut ORM forgeable. Le garde ne réouvre aucune opération métier dans ce cleanup.

En cas d’issue commit inconnue, ne pas rejouer automatiquement l’opération ; signaler l’incertitude et réconcilier. Une erreur afterCommit ne déclenche pas une compensation aveugle.

## 8. `model.sync({})` : choix obligatoire sans migration métier

Code actuel : `packages/api/src/tenant/database/db.initializer.ts:587–599`, synchronisation même en production.

Code ORM : `lib/model.js:925–1004`. Sans `alter` ni `force`, `sync({})` peut : créer une table absente, appeler `ensureEnums` pour une table présente, ajouter les index manquants. `postgres/query-interface.js:39–119` peut créer des types et ajouter des valeurs enum. De plus les options du modèle sont fusionnées avant les options d’appel ; `{}` ne constitue pas une garantie d’innocuité.

**Décision recommandée, à approuver :** séparer deux opérations internes :

- `existing` pour HTTP, worker et connexions de lecture intégrateur : définition des modèles + validation en lecture seule des objets réellement nécessaires, **aucun `sync()`**, aucune réparation automatique. Une dérive bloquante produit `TENANT_SCHEMA_NOT_READY` et une action opérateur hors V01. Les index manquants non nécessaires à l’exécution sont signalés, pas créés sous couvert de V01.
- `bootstrap` uniquement dans le provisioning déjà autorisé d’une **nouvelle base vide vérifiée**, avec capacité interne et verrou de provisioning ; création initiale selon les structures existantes, sans ajouter une migration métier V01. Pour une base existante/partielle, pas de `sync()` de rattrapage automatique : inspecter et faire approuver une intervention distincte.

Aucun de ces chemins n’est exécuté pendant cette conception. Si « aucun DDL » doit aussi s’appliquer à la création de futurs nouveaux tenants, suspendre ce bootstrap pour V01 : il n’existe pas de création de tables sans DDL. Cette distinction nécessite ta décision.

Le Master possède déjà un verrou advisory transactionnel de provisioning (`master/database/base_model/db.tenant-onboarding.ts:6–14`). Le réutiliser ne rend pas atomiques le DDL dans la base tenant et la transaction Master. Vérifier propriété de la base vide et absence d’autre initialiseur ; ne pas se contenter du nom ou d’un booléen navigateur.

Single-flight en mémoire = protection **dans un processus seulement**. En mode `existing`, plusieurs processus peuvent définir leurs propres modèles sans DDL partagé. Pour bootstrap, conserver un seul propriétaire avec le verrou interprocessus existant et la vérification DB ; en cas de crash partiel, arrêter/revoir plutôt que relancer une réparation non autorisée.

Alternative écartée : conserver `sync({})` partout en disant qu’il ne change rien. Alternative possible mais non recommandée pour V01 : envelopper sync dans une transaction read-only et espérer que l’échec suffise ; les métadonnées/pilote et DDL déjà engagés rendent cette stratégie trop fragile pour promettre une initialisation transparente.

**Conséquence sur la première matrice :** AC04 doit devenir « définition single-flight, zéro DDL en mode existing » ; « sync une fois » reste seulement un test bootstrap sur base fictive vide. Le premier banc n’est donc pas à recopier tel quel comme définition finale du comportement.

## 9. Adaptation exacte des frontières

| Frontière et lignes actuelles sous `packages/api/src/` | Comportement proposé |
|---|---|
| `middle/tenant.middleware.ts:65–95` | Résolution, jeton requête, portée A, génération A, initialisation existing, req.tenant, next ; catch dans portée, finaliseur de jeton sans fermeture de pool. |
| `master/routes/tenant.route.ts:726`, `:825–835` | Conserver les opérations Master et le verrou de provisioning. Section tenant dans opération enfant explicite, mode existing ou bootstrap validé ; retour au parent même en erreur. Ne pas transporter la transaction Master dans les modèles tenant. |
| `automate/automate.ts:31–54`, `:72–88` | runWithTenant par tenant couvrant connexion, modèles existing et toute rotation attendue ; garder séquentialité, horaire et comportement métier. Fin de jeton après cleanup. Pas de contexte global entre deux tenants. |
| `master/routes/integrator.route.ts:157`, `:182`, `:246` | Section DB tenant explicitement scopée pour chaque entrée : authenticate/query dans même génération. Pour la liste, portée distincte par tenant ; aucun tenant du précédent élément conservé. SQL Master/Redis hors de ce contrôle. Aucun changement du contrat d’intégrateur. |
| `utils/generate.database.ts:147–177` | initializeDatabase établit/restaure son opération ; mode existing par défaut. Bootstrap seulement sur preuve interne de base nouvelle/vide, pas sur un argument HTTP. La création administrative de base reste séparée et explicitement Master/admin. |

Le worker a aussi besoin d’une protection contre deux déclenchements de la même rotation : ALS empêche le croisement de tenant, **pas le double avancement métier**. Conserver le fonctionnement existant et vérifier l’idempotence/verrouillage ; ne pas activer de parallélisation dans V01. Deux processus de rotation actifs ne sont pas autorisés par ce plan de déploiement.

Les callbacks Socket.IO actuels ne deviennent pas des opérations DB par simple connexion au namespace : chaque futur handler faisant du SQL doit ouvrir une portée issue d’un tenant vérifié. Les événements d’invalidation légers qui n’exécutent aucun SQL n’ont pas besoin d’un accès tenant implicite.

## 10. Absence de contexte, erreurs et contrats existants

Erreurs internes recommandées : `TENANT_CONTEXT_MISSING`, `TENANT_CONTEXT_CLOSED`, `TENANT_CONTEXT_MISMATCH`, `TENANT_GENERATION_STALE`, `TENANT_TRANSACTION_MISMATCH`, `TENANT_CONFIG_CHANGED`, `TENANT_DRAINING`, `TENANT_SCHEMA_NOT_READY`.

- Refus avant SQL ou acquisition selon le point d’entrée ; aucun `defaultTenant`, base par défaut ou dernier tenant.
- Les fonctions utilitaires qui capturent toutes les erreurs et renvoient `null` doivent laisser remonter ces erreurs typées, notamment générateurs/révisions. Sinon une faute d’isolation serait masquée comme une absence métier.
- Ne pas reclasser une erreur d’isolation interne en simple « utilisateur introuvable ». Conserver les enveloppes HTTP existantes pour les parcours normaux et les erreurs d’initialisation ; pas de nouveaux endpoints ni de nouvelle preuve exigée du cloud dans V01.
- Logs : operationId, tenant logique et génération non secrets ; aucun credential, configuration complète ou SQL contenant des données personnelles. Les détails internes ne doivent pas être renvoyés au client.
- Erreur avant sélection de tenant : gestionnaire Master/générique sans SQL tenant. Erreur après fermeture de réponse : log seulement, pas seconde réponse ni résurrection du contexte.
- Base Master : fonctionnement normal sans contexte tenant. Pas de getter qui remplace implicitement une connexion tenant absente par la Master ; connexions distinctes et explicites.

## 11. Intégration obligatoire avec PostgreSQL réel fictif

**Non exécutée et non installée dans cette étape.** Les outils PostgreSQL/conteneur n’ont pas été trouvés dans le PATH lors des vérifications disponibles. Les sondes framework ne remplacent pas cette intégration.

### Confinement recommandé

Cluster PostgreSQL jetable dans un conteneur/namespace de test **sans réseau**, accessible par socket Unix dans un répertoire temporaire dédié. Processus de tests dans le même environnement, sources/artefacts nécessaires montés en lecture seule ; seuls les volumes temporaires sont inscriptibles. Aucun `.env`, credential, cache ou montage de production. Pas de port publié, pas de route sortante, pas de proxy paiement/email/Redis réel.

Éviter de considérer `127.0.0.1` seul comme preuve suffisante : un tunnel pourrait rediriger vers autre chose. Le cluster doit être créé/possédé par le lanceur et identifié par un marqueur aléatoire et son répertoire/socket, pas simplement accepter une URL passée dans l’environnement.

Deux bases fictives `v01_test_a`/`v01_test_b`, rôles distincts, droits croisés explicitement refusés ; aucune extension d’accès distant. Marqueurs identiques de clé mais valeurs A/B, afin de rendre un mauvais routage visible. Un accès de contrôle appartenant au lanceur vérifie les deux contenus ; les comptes applicatifs n’ont pas accès à cette capacité.

Le lanceur ignore les variables `PG*`/`DB_*` héritées et construit ses paramètres. Il vérifie marqueur, identité cluster, base, utilisateur, socket et version avant écriture ; toute discordance arrête le test. Préparer les fixtures uniquement dans ce cluster, puis exécuter les tests avec des rôles bornés. Le teardown supprime uniquement les ressources portant le marqueur possédé ; ne jamais construire un DROP à partir d’une URL libre.

### Scénarios à mesurer dans les deux bases

1. SQL brut `SELECT current_database(), current_user`, modèles réels et CRUD concurrents avec barrières JS.
2. Écritures A/B portant la même clé métier et marqueurs différents ; vérification indépendante après commit.
3. Transaction A suspendue pendant commit/rollback B ; A et B restent séparées ; cas de transaction fournie à une autre instance/opération.
4. SQL natif capturé, QueryInterface, transaction non gérée, parent/savepoint, bind/replacements, callbacks/promesses du pilote.
5. Connexion à froid, pool réutilisé, détection version par défaut (ne pas seulement fixer databaseVersion), perte/reconnexion physique.
6. Initialisation existing concurrente dans plusieurs processus : empreinte du schéma avant/après inchangée ; rôle sans DDL pour cette validation.
7. Bootstrap dans base fictive vide séparément, sous le verrou prévu ; crash/échec partiel puis refus de réparation automatique.
8. Fermeture/invalidation pendant authenticate et modèles ; résultat tardif jamais publié ; aucun pool orphelin.
9. Changement de configuration cible et de credentials ; génération épinglée, drainage et impossibilité de réutiliser l’ancienne après fermeture.
10. Request abort/finish, tâche détachée, rollback de cleanup et afterCommit : distinguer refus d’une nouvelle opération et SQL déjà en vol.

Journal SQL du cluster de test + compteurs au pilote permettent d’établir le « zéro SQL » des tentatives refusées, après soustraction explicite du SQL technique autorisé. Aucun test de ces scénarios sur IMEDIATIS/clients en production.

## 12. Matrice d’acceptation complétée

Les AC01–AC16 existent dans le banc précédent ; ils restent rouges sur l’application actuelle. Les exigences suivantes sont **spécifiées**, pas présentées comme des tests implémentés/passants. AC04 et le mode bootstrap seront ajustés après approbation du choix section 8.

| ID nouveau | Exigence et preuve requise | Niveau |
|---|---|---|
| AC17 | Sequelize réel query/raw/QueryInterface sans contexte : refus avant acquisition/SQL métier. | ORM + PostgreSQL |
| AC18 | Connexion native capturée en A utilisée hors portée/B : zéro envoi pilote. | pg gardé + PostgreSQL |
| AC19 | Premier connect/version/SET/OIDs : seules commandes techniques prévues ; refus sans capacité privée. | ORM + PostgreSQL |
| AC20 | Pool réutilisé, options `hooks:false` et objets transaction forgés ne contournent pas le garde. | ORM + PostgreSQL |
| AC21 | Transactions gérées/non gérées, commit, rollback et savepoint avec propriétaire/opération incorrects refusés. | PostgreSQL |
| AC22 | Rollback de nettoyage autorisé après révocation sans réouvrir SQL métier. | ORM + PostgreSQL |
| AC23 | Erreur afterCommit : écriture déjà commitée reconnue, pas de rejeu automatique. | PostgreSQL |
| AC24 | Trois routes intégrateur réelles, deux tenants, authenticate/query scopés ; erreurs et réponses inchangées. | Routes + PostgreSQL fictif |
| AC25 | SQL Master fonctionne sans contexte et durant une opération enfant tenant ; aucune confusion de transaction. | Master + PostgreSQL fictif |
| AC26 | closeAll pendant acquisition avant/après await ; génération tardive fermée, non publiée. | Barrières + ORM réel |
| AC27 | Fermeture pendant définition/validation/bootstrap ; registres et modèles partiels non exposés. | ORM + PostgreSQL |
| AC28 | Deux fermetures idempotentes, vieux finally, nouvelle tentative : aucune suppression d’une autre génération. | Barrières |
| AC29 | Config différente pendant pending/ready/draining ; refus, drainage puis nouvelle génération explicite. | ORM + PostgreSQL |
| AC30 | Rotation de credential seule ; anciens objets et pool rejetés après clôture. | PostgreSQL |
| AC31 | Existing : zéro DDL, schéma inchangé ; dérive détectée et non réparée. | PostgreSQL |
| AC32 | Bootstrap vide : un propriétaire ; reprise sur base partielle refusée, aucun schema force/alter. | Multi-processus fictif |
| AC33 | Express réel : succès, rejet setup/handler/error-handler, callback partagé, abort/finish/stream ; contexte correct et jeton clos. | Router/HTTP local confiné |
| AC34 | Tâche détachée héritée interdite après réponse ; tâche autorisée distincte fonctionne puis se ferme. | ALS + PostgreSQL |
| AC35 | Getter/modèle/BaseModel capturés : autre tenant/ancienne génération/absence de portée rejetés avant SQL. | ORM + PostgreSQL |
| AC36 | Retours `null` des helpers ne masquent pas les erreurs typées de contexte. | Unitaire application |
| AC37 | Double déclenchement worker : isolation garantie, effets métier non doublés selon protections existantes. | Worker + fixtures métier |
| AC38 | Publication/ajustement/bulk-edit/régénération, pointage/PIN, révisions : résultats métier inchangés avec A/B concurrents. | Non-régression application |
| AC39 | Driver surcharges callback/promesse/Query, parsing enums/OIDs et timezone inchangés. | pg/ORM réels |
| AC40 | Contrôle statique : pas de pilote tenant alternatif, mutation des gardes, setCurrentTenant autonome ou SQL protocole non gardé. | Analyse sources |

Les sondes framework ajoutées sont des preuves de comportement de dépendances, pas des AC de correction verts. L’acceptation production exige à la fois la suite d’isolation corrigée, l’intégration réelle et les contrats métier.

## 13. Risques de régression, fichiers et limites

| Composant | Risque principal | Prévention / acceptation |
|---|---|---|
| API Tenant partagée | Perte de portée, contexte fermé trop tôt, erreurs nouvelles sur parcours auparavant dépendant d’un résidu. | Express réel + deux bases + pointage/mémos/planning ; aucun fallback. |
| Master | Garde global accidentel ; transaction Master transmise à tenant ; provisioning partiel. | Connexions Master hors adaptateur ; enfant tenant limité ; AC24/25/32. |
| Worker | Fermeture avant fin de rotation, double lancement, échec d’un tenant bloquant les suivants. | Portée sur tout await, séquence conservée, isolation et fixtures de rotation. |
| Plannings | Transaction refusée à tort, savepoint, hooks afterCommit ou raw query incompatibles. | AC21/22/23/38, tests de publication existants ; ne pas changer règles/contraintes. |
| Pointage | Latence à froid ou write PIN/licence sans contexte. | Requêtes A/B concurrentes, modèle/SQL natif ; aucune nouvelle session navigateur exigée. |
| Intégrateurs | Connexion explicite hors portée ; contexte d’un tenant conservé dans une liste. | Trois routes testées, portée par élément/section ; contrats Redis/HTTP inchangés. |
| Mémos/temps réel | Objet de modèle conservé ou callback externe sans portée, sockets coupés au restart. | SQL seulement avec portée vérifiée ; tickets/reconnexion REST testés ; aucune modification du cache cloud dans V01. |
| Config/ORM/pilote | Incompatibilité native/replication/pg.Query ou cycle pool. | Version figée, inventaire config, tests de surcharge et cycle ; mode non couvert refusé. |
| Schéma existant | Suppression du rattrapage sync implicite, drift historiquement masqué. | Inspection read-only avant bascule ; décision section 8 ; aucun rattrapage automatique. |

### Fichiers qui seraient modifiés

- `packages/api/src/tenant/database/db.tenant-manager.ts` : ALS, propriétaires, générations, single-flight, fermeture/config.
- Nouveau module interne de contexte et/ou adaptateur Sequelize/pg tenant sous `tenant/database/`, pour garder les contrôles centralisés et testables.
- `packages/api/src/tenant/database/db.initializer.ts` : registre par génération, modes explicités, validation/propriété et publication unique.
- `packages/api/src/tenant/database/db.base.ts` : propriétaire capturé, CRUD/raw/transaction et erreurs typées.
- `packages/api/src/middle/tenant.middleware.ts` : durée de vie Express et parcours d’erreur.
- `packages/api/src/master/routes/tenant.route.ts`, `master/routes/integrator.route.ts`, `utils/generate.database.ts`, `automate/automate.ts` : frontières explicites.
- `tenant/database/db.config.ts` : adaptation du cycle de fermeture/getter historique si nécessaire.
- Services de planning listés dans le premier rapport : revue et ajustement seulement si les contrôles centralisés ne suffisent pas, sans changement métier.
- Points d’arrêt `master/app.ts`, `tenant/app.ts`, `master/server.ts`, `tenant/server.ts` : si nécessaire pour un drainage unique cohérent ; éviter les gestionnaires concurrents. Pas de modification de configuration de lancement dans cette conception.
- Tests/fixtures et outils d’intégration correspondants.

Pas de modification fonctionnelle prévue pour cloud, BFF, shared ou solveur, ni de migration/table de suivi ajoutée. Les anciens objets sérialisés ne reçoivent aucun accès DB par simple désérialisation.

### Alternatives écartées

- Mutex global autour de toutes les requêtes : sérialise la plateforme, ne couvre pas correctement tous les callbacks et garde une sélection implicite dangereuse.
- `enterWith()`/setter mutable : restauration et portée de propagation trop implicites.
- Paramètre tenant ajouté à chaque CRUD : propagation massive, risque de régression supérieur pour le premier correctif.
- Hooks Sequelize seuls : insuffisance démontrée.
- Patch global de Sequelize ou CLS transactionnel global : risque sur Master et comportements transactionnels existants.
- Hot-swap automatique d’un pool lors d’un changement de cache : peut diviser une même opération entre deux générations.
- Maintien de sync sur les bases existantes avec promesse « zéro DDL » : incompatible avec le code ORM relu.

Limites : pas de preuve sur la configuration déployée ; pas de garantie contre du code interne hostile ; aucune correction des sessions/permissions V02 ; pas d’atomicité distribuée Master/tenant ; single-flight local au processus ; aucune annulation rétroactive de SQL engagé.

## 14. Déploiement et rollback manuels

### Préalables bloquants

Approbation de cette conception puis autorisation distincte d’implémentation. Après correctif : AC corrigés verts, intégration PostgreSQL fictive complète, validation des parcours métier, vérification versions/driver/replication/CLS réellement déployés, inspection du schéma en lecture seule, sauvegardes et restauration vérifiées, artefacts de secours, fenêtre hors pics de pointage et rotation.

Le schéma ne sera pas « mis à niveau pour faire passer les tests ». Toute dérive bloquante se traite séparément, après décision explicite.

### Livraison

1. Construire hors répertoire actif une release immuable cohérente, avec code partagé consommé par Master/Tenant/worker et dépendances identifiées.
2. Vérifier que candidate et tests ne montent ni credentials ni caches/volumes de production. Une candidate sur données fictives ne doit démarrer aucun job réel.
3. Préparer manuellement l’arrêt des admissions, le drainage et le retour ; ne pas annoncer zéro interruption avec les instances `fork` uniques.
4. Cibler d’abord l’API Tenant pour couvrir les requêtes quotidiennes, puis Master et worker avec le même artefact validé, selon une fenêtre approuvée. Les processus ont des mémoires distinctes, mais la sécurité globale n’est complète qu’après mise à jour de tous les chemins. Suspendre les opérations de provisioning concernées pendant la transition et ne pas lancer deux workers.
5. Si le répertoire `dist`/dépendances est partagé physiquement, ne pas remplacer ses fichiers sous des processus anciens ; basculer des chemins de release cohérents. Tenir compte des imports BFF vers `@toke/api/dist` et confirmer s’il doit être relancé.
6. Réouvrir manuellement et surveiller chaque composant. IMEDIATIS peut compléter la validation fonctionnelle autorisée, sans être présenté comme isolé des autres entreprises. Aucun test de concurrence/écriture client dans cette validation.

### Surveillance et arrêt

Compteurs par tenant/génération/opération : refus de contexte, génération/config contradictoire, pending/ready/draining, pools, durée de drainage, initialisations, échecs SQL, latence et 5xx, succès pointage, générations planning, opérations intégrateur et rotations. Aucun secret/SQL métier sensible dans les logs.

Un seul croisement, une publication de génération invalidée, une écriture après refus, un DDL inattendu ou une double rotation impose l’arrêt de la généralisation et l’analyse. Un pic d’erreurs de contexte signale un chemin oublié ; ne pas le résoudre en réactivant un fallback.

### Rollback

Rollback de code, de configuration et de données sont trois actions distinctes. Drainer les processus concernés ; si drainage impossible, décision opérateur sur interruption/transactions en cours. Revenir à une release cohérente, fermer les pools de l’ancienne exécution, repartir sans modèles/générations réutilisés. Ne pas restaurer une base simplement pour revenir au code antérieur.

L’ancien code réintroduit V01. Une version de secours corrigée est préférable ; à défaut, le retour exige confinement temporaire et décision explicite, pas une validation implicite par le seul tenant interne. Toute écriture croisée ou issue commit inconnue doit être identifiée/réconciliée ; une restauration massive pourrait effacer les écritures légitimes des entreprises.

Les éventuelles créations d’un nouveau tenant via le provisioning existant ne sont pas annulées automatiquement par rollback : préserver leurs données et examiner leur état ; aucun DROP automatique.

## 15. Décisions restant à approuver

1. Contrat ALS avec jeton d’opération et révocation HTTP à finish/close, plus opérations séparées pour travaux détachés légitimes. Valider le traitement des tâches post-réponse avant activation.
2. Adaptateur tenant multi-niveaux, y compris pg.Client gardé et points d’interception internes Sequelize 6.37.8 ; sinon réduire explicitement la garantie sur le SQL natif, ce qui n’est pas recommandé.
3. Suppression de sync pour les bases existantes ; validation read-only et refus des dérives bloquantes. Autorisation distincte du maintien du bootstrap des nouveaux tenants vides, ou suspension de ce parcours pendant V01.
4. Politique de changement de configuration par drainage manuel, sans hot-swap ; comportement attendu durant cette courte indisponibilité ciblée.
5. Délai maximal de drainage, traitement des transactions encore en cours et autorité d’un arrêt forcé ; aucune valeur n’est imposée arbitrairement à la production.
6. Préparation ultérieure de l’environnement PostgreSQL éphémère confiné, installation éventuelle des outils nécessaires et tests d’intégration avant toute livraison.
7. Fenêtre/ordre précis de bascule Master/Tenant/worker, version de secours et vérifications opérateur, une fois l’implémentation et les preuves disponibles.

**Ce document propose une conception ; il ne vaut ni autorisation d’implémentation ni autorisation de déploiement. Aucun correctif applicatif n’a été commencé.**
