# TOKÉ — Préparation d’une première release contrôlée

9 novembre 2026. **Analyse uniquement ; aucun candidat assemblé, aucun déploiement, accès production ou migration réelle.** Aucun changement applicatif réalisé pendant cette analyse. [B2](./LOT3_ETAPE_B2_VALIDATION.md) est arrêté sous réserves ; B3/B4/lot 4 et V01 ne sont pas rouverts.

## 1. Décision et chemin de livraison le plus court

**NO-GO pour une release web/API complète du workspace actuel.** Il n’existe actuellement aucun artefact démontré qui cumule : correctifs terminés, mémos utilisables sans `memo_permissions_pending`, et absence de retour aux permissions connues comme dangereuses.

- Livrer le workspace courant introduirait les fermetures A sur mémos/upload/BFF/temps réel. B2 ne les supprime pas : son accès est local seulement, désactivé en production, limité à la lecture et absent du BFF.
- Retirer ces fermetures ou reprendre les routes antérieures réintroduirait notamment l’absence de preuve humaine/ACL générale et l’usage de GUID/ancien validateur comme autorité. Les correctifs de cache Cloud, de pagination et MemoReads ne réparent pas ces défauts serveur.
- Livrer B2 comme remplacement complet serait inexact : mutations, médias et délégation restent fermés ; le logout Cloud n’est pas relié à la révocation serveur. B2 n’a pas reçu sa validation formelle et son dernier rejeu complet est bloqué.
- Les tests globaux historiques gardent `PROVISIONING_RECOVERY_REQUIRED`. Ils ne sont pas globalement verts. Aucun « candidat vert » n’est fabriqué en retirant ce scénario.

**Livraisons partielles techniquement envisageables, distinctes d’une release web complète :**

1. **C-WORKER : worker de rotation seul, dans son propre artefact/processus.** Priorité proposée : V01 à l’intérieur de ce processus + correctifs IDS/cycle_length/atomicité. Le point d’entrée séparé existe déjà. Il n’importe pas les routeurs HTTP A/B2 et ne modifie pas les services web existants : aucun nouveau `memo_permissions_pending` exposé, aucun retour d’une route mémo vers une ancienne version. Cette possibilité n’équivaut ni à sécuriser l’API existante ni à certifier sa version actuelle.
2. **C-GPS : les deux contrôles zéro uniquement.** Delta isolable dans TimeEntriesModel, indépendant du protocole A. Une extraction/compilation sur la base réellement livrée serait nécessaire : copier le fichier courant importerait aussi des dépendances CLOCK_IN. Aucun artefact extrait/testé n’est constitué ici.
3. **C-CORE : V01 complet + worker + CLOCK_IN + GPS.** Dépendances API/Master importantes et fichiers mêlés avec A. Les correctifs sont localement validés dans leur assemblage historique, mais aucune release HTTP satisfaisant simultanément l’exigence mémos n’est validée aujourd’hui.

**GO aujourd’hui : aucun.** C-WORKER est une piste de première livraison indépendante à confirmer par inventaire du déployé, compatibilité de schéma et recette de son artefact autonome. Si la demande implique aussi de corriger/sécuriser les mémos publics dans cette première livraison, C-WORKER ne satisfait pas cette exigence : le blocage fonctionnel et de sécurité reste explicite.

Déplacer la fermeture mémos vers le proxy, changer son code d’erreur ou supprimer l’interface ne constituerait pas une résolution du critère demandé. Une suspension métier distincte nécessiterait une décision explicite ; elle n’est pas postulée dans ce plan.

## 2. Références et niveau de certitude

Sources de validation locale :

- [V01 clôturé sous réserves](./V01_VALIDATION_FINALE_ISOLATION.md), empreintes du candidat local du 6 novembre.
- [Worker IDS](./V01_ANOMALIE_WORKER_IDS.md), [cycle_length](./V01_ANOMALIE_WORKER_CYCLE_LENGTH.md), [atomicité](./V01_ANOMALIE_WORKER_ATOMICITE.md) et leurs patchs séparés.
- [CLOCK_IN corrigé](./POINTAGE_ANOMALIE_ATOMICITE_SQL.md), patch transactionnel et [liste de 38 fichiers](./POINTAGE_CLOCK_IN_FILES.json).
- [GPS et mémos locaux](./STABILISATION_LOTS_1_2.md), patch GPS ; lire les mises à jour CLOCK_IN/V01 ultérieures qui remplacent son ancien constat d’atomicité rouge.
- [Sessions A](./LOT3_ETAPE_A_VALIDATION.md), [B1](./LOT3_ETAPE_B1_VALIDATION.md), [B2](./LOT3_ETAPE_B2_VALIDATION.md).

HEAD local : `5d4a18ee93ceeb3d00b56d7f41ead2512dbce71d`, branche historique `1-api-issues`. **HEAD n’est pas la version déployée et le workspace ne correspond pas à un commit de release.** Il contient de nombreuses modifications utilisateur indexées/non indexées et sources non suivies. Les SHA des rapports identifient des états locaux, pas la production. Les patchs worker/GPS/CLOCK_IN sont relatifs à leurs instantanés locaux successifs, pas des patchs garantis applicables au déployé.

La présente analyse lit les sources et leurs imports sans les exécuter, sans lire les .env/caches réels et sans lancer de service. Les régressions de B2 ne recertifient pas une extraction C-WORKER/C-CORE différente. Aucun numéro de version production, schéma réel ou processus PM2 réel n’est affirmé.

## 3. Inventaire exact des deltas fonctionnels à sélectionner

**Aucun manifeste de fichiers d’un candidat déployable n’est approuvé.** Les listes ci-dessous identifient exactement les sources des corrections locales à conserver lors d’une future extraction. Ce sont des ensembles de changements, pas l’autorisation de copier tout leur contenu courant. Les autres modifications utilisateur sont à préserver et à qualifier séparément, jamais à éliminer par reset.

### 3.1 V01 : quatorze fichiers d’intervention

Sous `packages/api/src/` :

```text
tenant/database/db.tenant-manager.ts
tenant/database/db.initializer.ts
tenant/database/db.base.ts
tenant/database/tenant.context.ts
tenant/database/tenant.ownership.ts
tenant/database/tenant.sql-guard.ts
tenant/database/pg.tenant-driver.d.ts
middle/tenant.middleware.ts
automate/automate.ts
master/routes/tenant.route.ts
master/routes/integrator.route.ts
utils/generate.database.ts
tenant/app.ts
master/app.ts
```

Changements : portées ALS immuables, propriété tenant/génération/opération, gardes ORM/pilote/transaction, single-flight, existing sans DDL, bootstrap réservé aux nouvelles bases vides, frontières worker/HTTP/intégrateur/utilitaire et drainage des pools. Les wrappers de provisioning déjà inclus dans V01 sont des dépendances de l’isolation ; ils ne réalisent pas la reprise du lot 4.

Ne pas extraire le seul TenantManager : les anciens appelants du setter global ou des initialisations sans contexte deviendraient incompatibles. Ne modifier aucun garde pour adapter une release partielle.

### 3.2 Worker : sept fichiers, dont certains partagés

Sous `packages/api/src/` :

```text
automate/rotation.cron.ts
tenant/database/db.base.ts
tenant/class/RotationAssignments.ts
tenant/model/RotationAssignmentsModel.ts
tenant/class/RotationAssignmentLog.ts
tenant/model/RotationAssignmentLogModel.ts
tenant/class/RotationGroups.ts
```

Deltas : filtre `id: {[Op.in]: groupIds}` ; cardinalité réelle des templates dans cycle_length du journal ; verrou/relecture transactionnels, avancement et journal sur la même transaction, état mémoire publié après confirmation du commit. `automate/automate.ts` et le socle V01 sont également nécessaires au fonctionnement du processus.

Les trois patchs WORKER_IDS_FIX, WORKER_LOG_CYCLE_LENGTH_FIX et WORKER_ATOMICITY_FIX doivent être considérés ensemble avec leurs prérequis. Un retour à l’ancien worker peut réintroduire double avancement ou journal incohérent ; ce n’est pas un rollback sûr par défaut.

### 3.3 CLOCK_IN : trente-huit fichiers indissociables pour ce correctif

La liste exhaustive du manifeste local est reproduite en annexe A. Deltas : transaction gérée sur la connexion tenant, verrou utilisateur y compris en l’absence de session ouverte, recontrôle de l’idempotence sous verrou, propagation explicite transactionnelle dans les lectures/écritures transitives, notifications/activité après confirmation du commit, sans rejeu automatique à issue incertaine.

Dépendances : V01, paramètres transactionnels de BaseModel déjà présents et classes/planning/hiérarchie. Le fichier `TimeEntriesModel.ts` porte aussi GPS ; les classes de rotation portent aussi les correctifs worker. Les appels locaux Memos pour les anomalies ne deviennent pas des HTTP anonymes et n’exigent pas le protocole A. Aucune dépendance B1/B2 n’a été ajoutée à ce parcours.

Le rafraîchissement préexistant de licence avant PIN reste hors transaction métier ; aucune garantie plus large n’est annoncée. Ne pas publier seulement la route sans les helpers : les sauvegardes hors transaction annuleraient la preuve d’atomicité.

### 3.4 GPS : un fichier, deux conditions ciblées

`packages/api/src/tenant/model/TimeEntriesModel.ts` : accepter latitude/longitude égales à zéro en distinguant explicitement null/undefined ; validation des bornes inchangée. Patch autonome `audits/POINTAGE_GPS_ZERO_FIX.patch`. Un correctif techniquement indépendant, mais le fichier courant contient aussi CLOCK_IN : extraction par delta revue sur base connue, pas copie aveugle.

### 3.5 Mémos terminés côté client et MemoReads : disponibilité locale, sécurité non complète

Les dix fichiers des corrections Cloud du lot 1, sous `packages/cloud/src/` :

```text
service/MemoService.ts
service/MemoRealtimeService.ts
stores/memoStore.ts
stores/userStore.ts
tools/Fetch.Client.ts
views/memo/memoSidebar.vue
views/memo/memosView.vue
views/memo/memoDetailChat.vue
views/memo/memoCreateChat.vue
views/memo/AuthenticatedMedia.vue
```

Deltas validés à leur étape : tri recent/oldest, enveloppe upload, isolation des caches/promesses/callbacks par tenant/utilisateur/génération, purge de l’ancienne persistance, invalidation des réponses et ressources obsolètes. Ils ne constituent pas des permissions serveur et ne sont pas un contournement possible du verrou A.

La compatibilité MemoReads engage exactement, sous `packages/api/src/`, `tenant/class/MemoReads.ts`, `tenant/model/MemoReadsModel.ts`, `tenant/database/data/memo.reads.db.ts`, `tenant/class/Memos.ts`, `tenant/model/MemosModel.ts`, `tenant/database/db.initializer.ts`, `tenant/routes/memos.route.ts`, `utils/response.model.ts` ; côté BFF `packages/backend/src/routes/memos.route.ts` et `packages/backend/src/services/user.service.ts` participent au relais/listage. Ces fichiers comprennent aussi des changements utilisateur, CLOCK_IN ou A : leur contenu complet n’est pas un delta indépendant certifié. SQL manuel associé : `packages/api/migrations/manual/memo_reads_v1.sql`.

**Exclus d’une première livraison HTTP sans permissions complètes.** Les parcours corrigés restent à rendre accessibles de manière sûre avant de devenir un lot utilisable en production. Le rôle de `validator_user` dans l’ancien accès participant, l’absence de filtre obligatoire dans /list et les autres routes ne sont pas réparés par la migration de lecture.

## 4. Fichiers mêlés avec le lot 3 et exclusions

| Fichier / ensemble | Dépendances mêlées / décision |
|---|---|
| `packages/api/src/tenant/app.ts` | V01 : arrêt des pools et réponses closes ; A : managerSessionBoundary ; B2 : nouveau gateway local. Copier ce fichier en entier expose le verrou A ; enlever la frontière expose les anciennes routes. Aucun assemblage web sûr approuvé. |
| `packages/api/src/master/app.ts` | V01 : drainage ; A : montage user-session.route. Sélection de hunks requise pour une extraction pré-A, avec recette propre, pas déduction depuis HEAD. |
| `packages/api/src/master/routes/tenant.route.ts` | V01 : wrappers de portée/bootstrap ; A : auth/retry/OTP/stats. Ne pas confondre les wrappers avec une résolution de PROVISIONING_RECOVERY_REQUIRED. |
| `packages/backend/src/routes/memos.route.ts`, `tools/tenant.config.ts`, `tools/user.session.ts`, `routes/tenant.route.ts` | Fermeture mémos, protocole v2, émission désormais Master, introspection/logout. Les versions BFF/Master de A sont contractuellement liées. |
| `packages/api/src/realtime/SocketAuth.ts`, `MemoEventsService.ts` | Refus tickets mémos et suspension d’émission A ; les retirer n’apporte pas une ACL de média/temps réel. |
| `packages/api/src/tenant/model/MemoReadsModel.ts` | Différence observée avec l’empreinte V01 clôturée ; ne pas attribuer automatiquement ce delta à V01/B2 ni prendre l’ancien hash comme preuve du contenu courant. À qualifier lors de l’extraction du lot mémos, non livrée ici. |
| Nouveaux modules A | `tools/user-session.authority.ts`, `user-session.client.ts`, `user-session.runtime.ts`, `master/routes/user-session.route.ts`, `middle/manager-session.ts` : pas requis par l’entrée worker. Les retirer d’une release web sans remplacement sûr demeure NO-GO. |
| B1 | Migration `memo_foundations_b1_v1.sql` et `tenant/persistence/memos/{foundations.models,foundations.persistence}.ts` : pas nécessaires à worker/GPS/CLOCK_IN ; ne pas migrer les tenants pour ces correctifs. |
| B2 | `middle/memo-b2-reads.ts`, `tenant/memos/{responsibility.policy,reads.service}.ts` et deux lignes de montage : non requis et exclus des lots worker/GPS ; aucun enable en production. |
| Cloud, intégrateur, autres écrans/manifests et configurations utilisateur | Pas de publication du workspace complet ; aucun changement de .env local ni suppression de fichier incorporé sans qualification. D7 reste exclu. |

La présence d’un module dans le code compilé ne prouve pas son activation, et l’absence d’import dans le worker ne permet pas de redéployer l’application HTTP avec le même artefact en prétendant qu’elle reste inchangée. Le worker doit avoir un répertoire d’artefact et une sélection de processus séparés.

## 5. Dépendances de livraison par composant

| Lot envisagé | API Tenant | API Master | BFF | Cloud | Shared / infrastructure |
|---|---|---|---|---|---|
| C-WORKER | Aucun redémarrage HTTP ; bibliothèques tenant V01 dans le worker | Aucun déploiement du serveur ; modules communs importés à inclure | Inchangé | Inchangé | Shared compatible et dépendances Node exactes dans le worker ; cache tenants et accès PG compatibles. |
| C-GPS | Artefact Tenant ciblé sur base connue ; pas le tenant/app courant entier | Pas de changement contractuel | Inchangé | Inchangé | Types/validators Shared actuels ; vérifier ceux du déployé. |
| V01 complet | Tous consommateurs SQL et frontières d’entrée compatibles | Routes intégrateur/provisioning et drainage compatibles | Protocole réseau inchangé pour V01 seul | Inchangé pour V01 seul | Sequelize **6.37.8** exigé par le garde, pg/Node/configuration supportés ; pas CLS/native/replication non pris en charge. |
| CLOCK_IN | Route + 38 fichiers + V01 cohérents, activité/FCM après commit | Pas de nouvelle API de session requise par ce correctif | Même contrat de pointage à vérifier | Même contrat GUID/ULID à vérifier | Shared et schéma réel des sessions/entrées/anomalies/alertes ; effets externes non rejoués. |
| Mémos client / MemoReads | Contrats liste/lecture/lu/media sécurisés indispensables | Selon choix de session | Relais auth/proxy cohérent indispensable | Dix fichiers de cache/affichage ne suffisent pas seuls | Migration MemoReads si la table manque ; pas de migration B1 par nécessité de ce lot. |
| A/B2 web courant | Frontière A et lecture B2 locale seulement | Émetteur unique v2 + Redis | Vérifie auprès du même Master, mémos encore fermés | Logout distant non branché ; D7 absent | Redis autoritaire durable, secrets et services allowlistés à configurer. Non retenu comme première release fonctionnelle mémos. |

Ordre de build futur : Shared → API → BFF → Cloud lorsque ces composants sont inclus, dans un répertoire de release isolé. Les imports du BFF vers `@toke/api/dist` et les workspaces exigent des artefacts cohérents. Aucun `npm run build` actuel sur le répertoire actif : les scripts API/BFF commencent par clean et effacent dist/logs/PID. Pas d’installation globale/non épinglée.

## 6. C-WORKER : périmètre exact de sources et dépendances résiduelles

Point d’entrée réel : `packages/api/src/automate/automate.ts` → `rotation.cron.ts` ; processus défini dans `ecosystem.config.cjs` : **toke-rotation**, `cwd=./packages/api`, `script=dist/automate/automate.js`, une instance fork. Le commentaire historique du source mentionnant dist/automate.js n’est pas la configuration constatée. Ne pas démarrer les apps api-master/api-tenant/api-backend ou le solveur avec un `start all` pour cette livraison.

Une analyse AST des imports du JavaScript produit par transpileModule (types effacés), sans exécution, donne **107 fichiers locaux conservateurs**, reproduits en annexe B. Les imports relatifs dynamiques littéraux sont inclus ; `./db.config` est résolu vers son source .ts pour l’inventaire, mais sa résolution dans un artefact ESM natif doit encore être testée. Ce graphe n’est pas une preuve d’exhaustivité des chemins calculés par réflexion.

Dépendances externes identifiées : `@toke/shared`, axios, bcrypt, dotenv, libphonenumber-js, node-cron, pg, sequelize ; modules natifs crypto/node:crypto, node:async_hooks, fs/promises et path. Les versions effectives doivent provenir du lockfile figé, pas des plages package.json. Shared reste une dépendance de package complète : son barrel/artefact et ses transitifs ne sont pas remplacés par cette liste d’imports API.

Le graphe inclut `tools/revision.ts`, des définitions Master et un import dynamique de configuration Master : cela **n’implique pas** que le cron initialise le Master ou effectue des migrations, mais interdit de le présenter comme deux fichiers autonomes. Des modules appellent dotenv à l’import. Le cache tenant contient un chemin source fixe `/opt/toke/packages/api/cache/tenants.json`. Aucun de ces chemins/configurations réels n’a été lu ici ; démarrage autonome dans une fixture intégrale, résolution ESM, cache fourni et absence d’effets externes inattendus restent des préconditions GO. Les bancs actuels utilisent des imports fermés et injections ; ils ne prouvent pas ce démarrage binaire.

## 7. Migrations nécessaires ou évitables

| Situation | Action future requise |
|---|---|
| Worker IDS/cycle_length/atomicité + V01 dans le worker | Pas de nouvelle migration issue de ces correctifs si colonnes/types/index/contraintes de rotation/journal existent conformément au schéma validé. Préflight réel obligatoire ; différence => arrêt, pas sync existing. |
| GPS | Aucune DDL ajoutée par les deux conditions. |
| CLOCK_IN | Aucune DDL ajoutée par le patch. Vérifier external_id, unicité/idempotence, colonnes et FK des quatre tables ; schéma incompatible => NO-GO. |
| Initialiseur V01 et table MemoReads absente | Modèle indisponible identifié, sans DDL existing ; les modèles de rotation compatibles restent utilisables. L’absence de MemoReads ne justifie pas de migration pour le seul worker. |
| Activation future des statuts de lecture MemoReads | Migration manuelle additive `memo_reads_v1.sql` si nécessaire, avec préflight, sauvegarde et rôle autorisé ; jamais automatique par le démarrage. |
| B1/B2 | Aucune migration B1 pour C-WORKER/C-GPS/CLOCK_IN ; B2 n’en ajoute pas. Ne pas exécuter la migration B1 « au cas où ». |
| Sessions A | Pas de table SQL nouvelle, mais Redis/durabilité/ACL/rotation de secret/reconnexion des sessions anciennes et compatibilité de tous les composants. Cette infrastructure n’est pas requise par le worker. |
| Reprise provisioning | Non implémentée, aucun schéma Master/journal de lot 4 créé ou proposé à exécuter dans cette livraison. |

Toutes migrations éventuelles seraient soumises à une autorisation distincte, par base, après contrôle des schémas réels. Aucun backfill, reset de données, DROP d’historique, auto-repair ou `sync()` en mode existing.

## 8. Différences avec le déployé : inconnues à confirmer

Aucun accès production autorisé/effectué. Il est impossible aujourd’hui de fournir un diff de production honnête ou une liste de migrations obligatoires sur des schémas non inspectés.

Informations à fournir/recueillir ultérieurement en lecture seule sous autorisation :

1. Commit et empreintes des artefacts réellement chargés par chaque processus, release paths, PM2 scripts/cwd/instances, Node/Sequelize/pg/Shared/lockfile ; ne pas assimiler dépôt distant, HEAD ou dist présent sur disque à ce qui tourne.
2. Schémas et versions de migration par tenant ; colonnes/types/index/FK de rotation, logs, utilisateurs, entrées et sessions ; PostgreSQL/PostGIS ; droits effectifs et connexions. Aucune donnée métier sensible à copier pour cet inventaire.
3. Contrats réellement utilisés par les clients pointage, Cloud/BFF/Master ; mécanisme de sessions actuellement actif, médias et routage réseau. Confirmer si une vulnérabilité mémos connue est déjà exposée ; une livraison worker ne la corrige pas.
4. Unicité de l’ordonnanceur, historique de last_advanced_date/offset et journal, timezone, cache tenants/configuration ; vérifier les autres producteurs de mutations de rotation.
5. Topologie de release : partage ou non du même dist/node_modules/cache entre worker et serveurs. Si remplacer l’artefact du worker remplace aussi des fichiers des serveurs en cours, C-WORKER n’est pas indépendant sous cette procédure.

Une fois cette base connue, un manifeste de delta exact par hunk/artefact avec SHA doit remplacer la simple comparaison locale. Aucun extraction, branche, commit, cherry-pick ou candidat n’a été créé ici.

## 9. Contrôles et sauvegardes avant intervention autorisée

- Artefacts immuables versionnés : sources sélectionnées, lockfile, résultats de tests, SHA, dépendances et configuration attendue sans secrets ; compilation hors répertoire actif, contrôle de résolution et import du véritable point d’entrée dans une fixture isolée.
- Sauvegardes cohérentes par tenant et catalogue Master si composant concerné, rôles/grants/schéma, configuration/processus et cache tenant sous stockage chiffré ; restauration vérifiée sur clone. Conserver les artefacts actuels. Pas de credentials en ligne de commande/log.
- Recette du candidat **exact** sur PostgreSQL A/B jetables : V01 existant, worker et concurrence interprocessus, compte/offset/journal, rollback et COMMIT incertain ; CLOCK_IN/GPS si inclus. Les preuves historiques restent valides dans leur portée mais ne remplacent pas cette recette d’assemblage.
- Vérifier aucun DDL existing, aucune initialisation Master ou connexion externe inattendue lors du démarrage worker ; redirection des effets externes vers des fixtures. Aucun test d’écriture chez un client n’est autorisé par ce plan.
- État d’observabilité préparé : erreurs de contexte/génération/transaction, table manquante, compte de traitements/skips/échecs, incohérences offset/journal, disponibilité de la preuve humaine si serveur concerné. Masquer OTP/tokens et URL de vérification OTP.

Le défaut provisioning reste une condition NO-GO pour toute livraison revendiquant sa reprise. Il peut être hors périmètre d’un worker autonome qui n’appelle pas le provisioning, sans transformer la suite globale rouge en succès. Une livraison web incluant ces endpoints doit expliciter ce risque et leur exposition avant tout GO ; aucune nouvelle fermeture ou règle opérateur n’est inventée ici.

## 10. Procédure progressive proposée — non exécutée

### C-WORKER en premier, seulement si tous ses critères GO sont satisfaits

1. Faire approuver le manifeste/artefact autonome et l’inventaire du déployé. Préparer les sauvegardes et le retour arrière ; choisir une fenêtre hors exécution du cron et clarifier la timezone réelle.
2. Suspendre l’ancienne planification de rotation, attendre la fin des unités en cours et établir qu’aucune autre instance ne tourne. Ne pas interrompre à l’aveugle un COMMIT dont l’issue est inconnue.
3. Installer l’artefact worker dans un nouveau répertoire immutable, sans écraser dist/node_modules des API existantes ni changer leurs processus. Vérifier sa configuration et l’accès au cache tenant ; pas de bootstrap/migration.
4. Démarrer **uniquement** toke-rotation après contrôle de la prochaine échéance. Le source traite tous les tenants du cache, séquentiellement : **aucun canary par tenant n’est fourni**. Ne pas prétendre cibler un tenant par un flag inexistant et ne pas modifier le cache partagé pour simuler un canary. Si ce périmètre est trop large, NO-GO sous la procédure actuelle.
5. Surveiller la première échéance et rapprocher offset/date/journal/compteurs selon critères approuvés. Contrôles réels en lecture seule ; pas de déclenchement manuel client ou correction de données improvisée. Valider l’absence de nouvel impact HTTP/mémos, puisque ces services ne sont pas redémarrés.
6. Maintenir l’ancien ordonnanceur arrêté, conserver sauvegardes et artefacts. Étendre ensuite à un autre lot uniquement sur autorisation séparée.

### Si une release API complète devient admissible ultérieurement

Recetter d’abord l’assemblage et les contrats de sécurité complets, résoudre le critère mémos sans fallback permissif, puis planifier drainage coordonné Master/Tenant/worker et consommateurs BFF/Cloud. Éviter un mélange de protocoles de sessions ou de modules V01 de générations incompatibles. Une API partagée sert plusieurs tenants : un canary exige un routage prouvé, pas un simple déploiement de fichier dans le répertoire commun. Cette branche de procédure est conditionnelle ; aucune implémentation B3/lot 4 n’est engagée par ce document.

## 11. Retour arrière

- Avant exposition/exécution : conserver l’ancien artefact actif, arrêter le lancement du nouveau ; aucune suppression de données.
- Si une unité de rotation a pu committer : arrêter la planification et réconcilier date/offset/journal en lecture seule. Un timeout/erreur de réponse n’est pas la preuve d’un rollback. Aucun nouveau déclenchement automatique pour « rattraper » et aucune décrémentation aveugle de l’offset.
- Revenir seulement à un artefact antérieur dont les garanties nécessaires sont établies. L’ancien worker avec défaut IDS/atomicité n’est pas un repli sûr : à défaut de version sûre, maintenir le worker arrêté et faire valider la continuité métier, plutôt que réintroduire la corruption.
- Ne pas restaurer toute une base après de nouveaux pointages concurrents pour annuler un offset ; restauration ciblée exceptionnelle après analyse/autorisation uniquement. Les correctifs proposés sont sans DDL, donc aucun down destructif requis.
- Pour une future release web, ne pas revenir au tenant global V01, aux tokens acceptés depuis un GUID, aux routes mémos sans ACL ou à un registre Redis ancien réactivant des sessions. Fermer l’action concernée/retirer le nouveau trafic vers une version sûre selon une procédure approuvée ; aucun rollback permissif présenté comme acceptable.
- Conserver toute table additive et son historique si une migration a été autorisée plus tard. Une restauration d’artefact ne restaure ni données, ni sessions, ni cache, ni secrets.

## 12. Critères GO / NO-GO

| Critère | État actuel |
|---|---|
| Version réellement déployée, schéma, privilèges et processus identifiés | **NO-GO : inconnus**, à confirmer ultérieurement sous autorisation. |
| Candidat exact assemblé, build isolé, SHA et dépendances épinglées | **NO-GO : aucun artefact constitué.** Inventaire de sources disponible, pas certification de binaire. |
| Worker indépendant du dist/API et démarrage complet sans effet inattendu | Faisabilité source identifiée ; **preuve d’artefact et topologie manquante**. |
| Tests V01/worker/CLOCK_IN/GPS locaux historiques | Réussis dans les périmètres rapportés ; V01 clôturé sous réserves, non rouvert. |
| Régressions B1/A et V01 ciblées pendant B2 | B1 sortie 0, A 20/20, V01 ciblé 42/42 ; pas une recette du candidat extrait. |
| B2 intégralement retesté après dernières retouches | **Réserve : relance finale bloquée par revue automatique en limite d’usage.** Ne pas bloquer artificiellement un worker qui n’importe pas B2, mais ne pas certifier B2 pour production. |
| Web/API sans verrou pending et avec permissions mémos sûres | **NO-GO : combinaison non réalisée.** Retirer le verrou n’est pas une correction. |
| Migrations réellement nécessaires déterminées, sauvegardes/restauration validées | **NO-GO : inventaire réel et restauration future à établir.** Aucun SQL réel autorisé. |
| Provisioning interrompu annoncé comme repris | **NO-GO : PROVISIONING_RECOVERY_REQUIRED connu** ; lot 4 non implémenté. Hors revendication possible pour C-WORKER autonome seulement. |
| Fenêtre, arrêt unique de l’ancien cron, surveillance et rollback sûr approuvés | **NO-GO : décision opérationnelle future nécessaire.** |

**Recommandation : conserver C-WORKER comme première piste indépendante à très faible périmètre de composants, puis C-GPS si nécessaire ; ne pas publier le workspace complet.** Le prochain pas est de confirmer le déployé et les préconditions opérationnelles, pas d’ouvrir de nouveaux lots métier. Aucun candidat global n’est déclaré déployable et aucune action de production n’est effectuée.

## Annexe A — Manifeste CLOCK_IN exact

```text
packages/api/src/tenant/class/Device.ts
packages/api/src/tenant/class/FraudAlerts.ts
packages/api/src/tenant/class/Groups.ts
packages/api/src/tenant/class/Memos.ts
packages/api/src/tenant/class/OrgHierarchy.ts
packages/api/src/tenant/class/QrCodeGeneration.ts
packages/api/src/tenant/class/Role.ts
packages/api/src/tenant/class/RotationAssignments.ts
packages/api/src/tenant/class/RotationGroupTemplate.ts
packages/api/src/tenant/class/RotationGroups.ts
packages/api/src/tenant/class/ScheduleAssignments.ts
packages/api/src/tenant/class/SessionTemplates.ts
packages/api/src/tenant/class/Site.ts
packages/api/src/tenant/class/TimeEntries.ts
packages/api/src/tenant/class/User.ts
packages/api/src/tenant/class/UserRole.ts
packages/api/src/tenant/class/WorkSessions.ts
packages/api/src/tenant/model/DeviceModel.ts
packages/api/src/tenant/model/FraudAlertsModel.ts
packages/api/src/tenant/model/GroupsModel.ts
packages/api/src/tenant/model/MemosModel.ts
packages/api/src/tenant/model/OrgHierarchyModel.ts
packages/api/src/tenant/model/RoleModel.ts
packages/api/src/tenant/model/RotationAssignmentsModel.ts
packages/api/src/tenant/model/RotationGroupTemplateModel.ts
packages/api/src/tenant/model/RotationGroupsModel.ts
packages/api/src/tenant/model/ScheduleAssignmentsModel.ts
packages/api/src/tenant/model/SessionTemplatesModel.ts
packages/api/src/tenant/model/SiteModel.ts
packages/api/src/tenant/model/TimeEntriesModel.ts
packages/api/src/tenant/model/UserModel.ts
packages/api/src/tenant/model/UserRoleModel.ts
packages/api/src/tenant/model/WorkSessionsModel.ts
packages/api/src/tenant/routes/time.entries.route.ts
packages/api/src/tools/anomaly.detection.service.ts
packages/api/src/tools/schedule.resolution.service.ts
packages/api/src/utils/time.entry.idempotency.ts
packages/api/src/tenant/database/clock-in.options.ts
```

## Annexe B — Inventaire conservateur C-WORKER des sources locales

Cet inventaire fixe les fichiers analysés, pas un candidat exécutable. Chaque source TS implique son JavaScript correspondant dans un futur build ; les déclarations de types de compilation, manifestes/lockfile, package Shared et dépendances externes restent à joindre au manifeste d’artefact. Les SHA identifient le contenu local actuel, pas la production. Les 107 fichiers incluent des supports non modifiés par les correctifs : ils ne représentent pas 107 corrections.

| Source | SHA-256 local |
|---|---|
| `packages/api/src/automate/automate.ts` | `17c8d429651c8963834b3f75332d1267cbcd15a034d6a8201cbdbc38f3091536` |
| `packages/api/src/automate/rotation.cron.ts` | `d5b52ade5d03a949563ed939aed9eda9a438fcab18611224c0b7cc497b3a3eb2` |
| `packages/api/src/master/database/data/activity.monitoring.db.ts` | `b0dd2f354c0e35aac8b9f4352c75f8dcb3ca12a053fbad7abbb3bec27001a237` |
| `packages/api/src/master/database/data/app.config.db.ts` | `0adb04ca8a9795abf08aa5f2cb12a5d8286bb1465661480553390675d564d2df` |
| `packages/api/src/master/database/data/billing.cycle.db.ts` | `ba24a05188099f56b4ea3b761b4441ecde8f67a7765f16aa5b8f77fce42d9955` |
| `packages/api/src/master/database/data/client.db.ts` | `b2b95a6830082948045dd0142898bce0402f42608a6e0d6f30dd28f2958a943b` |
| `packages/api/src/master/database/data/client.profile.db.ts` | `954aa35c7dce32f63d7935d0e417bd31a01438b0ac2b7dc33ffd0a92b6611b45` |
| `packages/api/src/master/database/data/contact.db.ts` | `af46f179219840d8376b10912f21d4d8549fd1ab8b12de14b53953a7467fae52` |
| `packages/api/src/master/database/data/country.db.ts` | `31f961272ee90775fcea32a99be0c88cb0420ceb185cf96528b35263769812d4` |
| `packages/api/src/master/database/data/currency.db.ts` | `b879053350d0c81b64b374058853ddba669ac28d252138e5ef896fac4bb15685` |
| `packages/api/src/master/database/data/employee.license.db.ts` | `e9f0be571ba7d9f0da088bd531be815ddbc378f844403b68fd34a9b838e45a5a` |
| `packages/api/src/master/database/data/endpoint.db.ts` | `867e95564c89a84fd47bc649348bee7d472f26048e71809b8bdaa28218c6eb95` |
| `packages/api/src/master/database/data/exchange.rate.db.ts` | `6d2a99183bbf14396c2f25fca37b5e3d68db712499c998e8e140f136aa2185a1` |
| `packages/api/src/master/database/data/feature.db.ts` | `c2f98c4668ec20ce68d868ed777c19df50cc41af02c9acbe99bc1817eaec5ee9` |
| `packages/api/src/master/database/data/fraud.detection.log.db.ts` | `eb50314128bd361243a397123109083c079b831964d4772cb2667ffa8657bca9` |
| `packages/api/src/master/database/data/global.license.db.ts` | `06572cfdd263147f5580442e388973416c68b8bc0ba8adffa6d188a84988ec2f` |
| `packages/api/src/master/database/data/language.db.ts` | `27ebb6afaf574c30c2400e9ec45a51a5e7ad37006259a0c1e743f9c34064328c` |
| `packages/api/src/master/database/data/lexicon.db.ts` | `ccfdc7df00c93e1b40049124359030a228ab79d5f77690eb98bd27c19ac4bdec` |
| `packages/api/src/master/database/data/license.adjustment.db.ts` | `e9741f2979a3f146ec57412e8674d4202c60c465bea12cf9915482e02e223498` |
| `packages/api/src/master/database/data/license.event.db.ts` | `ec14e3abd42054980839470dbc146645c24db3f5d45fb206d3efda267d3574a5` |
| `packages/api/src/master/database/data/payment.attempt.db.ts` | `9bc409965f2e79d7f94e9d15991a62181481813d458af2bdd98ac3d16381d724` |
| `packages/api/src/master/database/data/payment.method.db.ts` | `5f6f46397a9f2d487d8b8a1c98bd44c6f0ca00d3ad2a193d4c920bca91251e27` |
| `packages/api/src/master/database/data/payment.transaction.db.ts` | `3f94ed214550d631d549200655b44f67da65721ea5458e185e5b780efaa84332` |
| `packages/api/src/master/database/data/permission.db.ts` | `1895b32251e4011a2942719edc930d5f0ac7f6c16915c17aa426722fa2b94e29` |
| `packages/api/src/master/database/data/sponsor.db.ts` | `2e00b2da25fbe49a63b86338eae747291c785ac46372dff0a59907447e7cc761` |
| `packages/api/src/master/database/data/tax.rule.db.ts` | `d4e2d638f189f28c230877accaa596c490c633772be47b5bf53d1565716fd9ea` |
| `packages/api/src/master/database/data/tenant.db.ts` | `380eab8822a5c72008607dbe1035b837a527297e8b6ad5f5de64c491fe4e7bc6` |
| `packages/api/src/master/database/db.base.ts` | `64aefca4bf6aef86dfa4b8b65ac1a99d595ee9831816e6b290f34f759e3bdccc` |
| `packages/api/src/master/database/db.config.ts` | `60cb22a755ef6792793d20c8c9dda04eb178996c00f7b1dd10d926e287220a8a` |
| `packages/api/src/master/database/db.initializer.ts` | `700b3a7a7918c3fba860ccba9529d8d79c840da7efba5bc5e384225dd8fff0e6` |
| `packages/api/src/master/services/payable-amount.ts` | `1c774cb24a250d6cc8e81982c97ca776ee7f1e421c5921f75d3eb9eabd6bd1f2` |
| `packages/api/src/master/services/payment-money.ts` | `39ba0c074039bfb90f63b59ce4f6faa4b01f25604cc333b8b2873a4472b274ce` |
| `packages/api/src/tenant/class/Groups.ts` | `01f7c0cdbd0a32f0c518a9d8dbfc8670434b6856d4f3cbce634db8f2bb92ea9e` |
| `packages/api/src/tenant/class/OrgHierarchy.ts` | `4e7f63a666ba86275adfe8ce957af05070e70b5813a0f8671ae23347d7815af4` |
| `packages/api/src/tenant/class/Role.ts` | `94e82ccd22fb383e686bbf246965a303ad5926b1e62a7eb121639e5fbb3ed027` |
| `packages/api/src/tenant/class/RotationAssignmentLog.ts` | `3a28da01814e46d46c1133796326d3398e189f613ff201f75cd7871cef1ad79f` |
| `packages/api/src/tenant/class/RotationAssignments.ts` | `2ae226c9e09ec1b319daac60d3e59fbd8762cde0f1a34b31bdf6c5832e830802` |
| `packages/api/src/tenant/class/RotationGroupTemplate.ts` | `06259f6c4fe05c96c8e7e00625dc0681adf20a032f7592a2130127a7dee20e15` |
| `packages/api/src/tenant/class/RotationGroupTemplateLog.ts` | `4a30b2e9cfd2a08fe97c4bfa8133ed62750282b87934a0fb8e17a76c2163644d` |
| `packages/api/src/tenant/class/RotationGroups.ts` | `22ff0bfd53ad5f4de7981a0d716cb1cae70020f3aa89c1391226f2330e0947f9` |
| `packages/api/src/tenant/class/ScheduleAssignments.ts` | `6c3f9083f25402f21fd40625a20709c8a0ba888b641561683a35755c0ae0b03e` |
| `packages/api/src/tenant/class/ScheduleAssignmentsLog.ts` | `4c8e16e34b2568dc7aac3f32c202c14b7ca98411268a75f6d7a57a6d2ebaa46b` |
| `packages/api/src/tenant/class/SessionModel.ts` | `135132d00e18537e38c6f47649b5acf4ee7a31cc12fb595ccb57395186d57554` |
| `packages/api/src/tenant/class/SessionTemplates.ts` | `7a01d5b8e6c3c238ecad7c40e19d86ab301487289ea25f520f48f50a1a8598e5` |
| `packages/api/src/tenant/class/User.ts` | `dfbcade81d5b1b5b9bd78b44cd9e5e21c2c4aceca572d5338cd251103ef9b429` |
| `packages/api/src/tenant/class/UserRole.ts` | `c5657c780fc79884c72abfde9d3fb5bb415480b6cb3bdd654b6f29b0ab8ebdfc` |
| `packages/api/src/tenant/database/data/audit.logs.db.ts` | `32484935c129ef73f895f9d25ef866ba3b3dc215ee81d984f8e7fc248b9e450f` |
| `packages/api/src/tenant/database/data/department.db.ts` | `0929fe9b038b40bec667994f1a0e07818e5fa6634adaad3b0b94cfae3dfee4ad` |
| `packages/api/src/tenant/database/data/device.db.ts` | `bb6a43488fc17dee53c5ca95a96a5d503901994c8ad716e571c6d5541bdc1693` |
| `packages/api/src/tenant/database/data/employee.planning.profile.db.ts` | `ee90a4449e475d447c5cef1e8a8260927ee9a2b3b1c429d42d2b363cf25de226` |
| `packages/api/src/tenant/database/data/fraud.alerts.db.ts` | `e589b871bd966fa2a1c15fbc964be364be1c80528c4d07a75282fdccb53e36a3` |
| `packages/api/src/tenant/database/data/groups.db.ts` | `559a7f9fe2e28fa83701aabb0e5e81ba377aa45bbbfdfe37b9fd47a1f66c0e86` |
| `packages/api/src/tenant/database/data/memo.reads.db.ts` | `4199b4025b6ae6d39cde7571020edb35822ac6075710ebc7c7145abda97e8c97` |
| `packages/api/src/tenant/database/data/memos.db.ts` | `66ecef702f5e15786e6c608173b754d151e88e6f75ae86d124c70b2facb61f03` |
| `packages/api/src/tenant/database/data/org.hierarchy.db.ts` | `ff83866f365a649d53991fc26f3b066cedd467006c663942c2489622237f8db0` |
| `packages/api/src/tenant/database/data/planning.suggestion.config.db.ts` | `bbbf1f749a422510d7c19fabeaaf6321b956265df107ca554a150e29ea4aa518` |
| `packages/api/src/tenant/database/data/planning.suggestion.requirement.bd.ts` | `1f68bd32def635cd40d0a7dd259857be360888e64f6a886d8a7669fd49aedad0` |
| `packages/api/src/tenant/database/data/poste.db.ts` | `044c19ead72bff4456932e8a8a1e5f1db010e2e417fd240f23e02ec7be2ad906` |
| `packages/api/src/tenant/database/data/qr.code.generation.db.ts` | `eb1153e39074f6e6cf619782633d52b139f5f23d60c29648b3520f1118818af1` |
| `packages/api/src/tenant/database/data/roles.db.ts` | `edcd71c9ea17e3efbf23b5fc6a68e7cf28165d293bb7083572ebecaae3058b6a` |
| `packages/api/src/tenant/database/data/rotation.assignment.log.db.ts` | `1fe85fb6383c12104f9c7eaefd8654cb46def336393ba2754fb333046992d732` |
| `packages/api/src/tenant/database/data/rotation.assignments.db.ts` | `ff4ff5d33608a5f618efcb6a2889bb4489d2a909ce492747d2d3497225b1dfe5` |
| `packages/api/src/tenant/database/data/rotation.group.template.db.ts` | `9efb64c0b0bbf3ed85eb93891b41044733583332b381b3e4854e3144a4e1689e` |
| `packages/api/src/tenant/database/data/rotation.group.template.log.db.ts` | `d3b98546e3d2be5991b367b772ce70ec288c07514e06f28890eb2851bc5edab1` |
| `packages/api/src/tenant/database/data/rotation.groups.db.ts` | `22602f75244962d501e27f751c1b75f27c7f62e419e8b13c17495403d10314a5` |
| `packages/api/src/tenant/database/data/schedule.assignments.db.ts` | `5f0f94b5377cb9c0cdae67de6213cd16039528bea1013591a2a66518df0ba902` |
| `packages/api/src/tenant/database/data/schedule.assignments.logs.db.ts` | `2abf8be550eb44471862c7493896f7f31ab35977c8067211732ac345cf7506a7` |
| `packages/api/src/tenant/database/data/schedule.suggestion.db.ts` | `028f9ca61bf63a931d857d169ee7730814142b44c8477ff2dc420f5726d135b5` |
| `packages/api/src/tenant/database/data/schedule.suggestion.item.db.ts` | `199536d7988f70c77d7e3bee4bfbf8a0dc652bc71aea24974f8946ed863b43d0` |
| `packages/api/src/tenant/database/data/session.model.db.ts` | `58719b8c13765031ead72bdead1deb85393d7b6366f0c9964483ffb18ec3c60c` |
| `packages/api/src/tenant/database/data/session.templates.db.ts` | `e03d584f5e589a521cc73b774d1306b6ad9f8a203ff7db3c082448fb71e8153d` |
| `packages/api/src/tenant/database/data/sites.db.ts` | `679b726f9a982ceac9ce9e87f0c6fc4f677ce7ed6623af5ea197b56b5851c364` |
| `packages/api/src/tenant/database/data/time.entries.db.ts` | `efe67088f7d983c9daf9375a110399861ab8f0421169e9f7e919fbde799da395` |
| `packages/api/src/tenant/database/data/user.roles.db.ts` | `a20ef39f9425ac319ac5e6dbf0ecfeace83bc6dd44653b9a3ea9005714d3249a` |
| `packages/api/src/tenant/database/data/users.db.ts` | `faf142c0ada9b3f172a930b159ed0876dcf33544142ef07c9225cbaabf8aa1a4` |
| `packages/api/src/tenant/database/data/work.sessions.db.ts` | `dabcff078efed620bc4fd44ae57035098a0fde7dbcf2180f79353f5f2a94ed73` |
| `packages/api/src/tenant/database/db.base.ts` | `5cbb5a1ed2573d0dbf9f6c3ec5c33079b2e245da32f89473711abb3e023af49f` |
| `packages/api/src/tenant/database/db.initializer.ts` | `f6e825d33f9ea5617c930cc25f83d9d593041edc369cba0079e340ab7cfa635d` |
| `packages/api/src/tenant/database/db.tenant-manager.ts` | `3a08a3bd7eb663ac5cdd53f200f9bca9f07468dcc52b887c262e7d62c730e6cf` |
| `packages/api/src/tenant/database/tenant.context.ts` | `52a8080193c053eee44658aeeb39499c30935d3e28efe0a4cdfa962341a369dd` |
| `packages/api/src/tenant/database/tenant.ownership.ts` | `616eadb72f2fb70d0eb72f4b4dcc0891ba922fdee3804e07495d8dcf3277829e` |
| `packages/api/src/tenant/database/tenant.sql-guard.ts` | `b991a618ecd66273bdb8a0f7a84feb0750f2044f4593fd0eea08f164fd107873` |
| `packages/api/src/tenant/model/GroupsModel.ts` | `3cc28497385257434295531310bb08052e08013d8a45f29b3691e7f58a44ae61` |
| `packages/api/src/tenant/model/OrgHierarchyModel.ts` | `47e6f03d24cf132a7922133ad11debe7c1e86005084c0b071de257db04e9c2dc` |
| `packages/api/src/tenant/model/RoleModel.ts` | `fd2de94a0bfcb7a4b1086ae7fa23e20e63b8032dc4d4984cb6db04718388ad3a` |
| `packages/api/src/tenant/model/RotationAssignmentLogModel.ts` | `06870628d78c2998a24d9e3354ddb85ab8eeb3d5e7e33f1b338da0c69b916301` |
| `packages/api/src/tenant/model/RotationAssignmentsModel.ts` | `8333caeef26626be6382c9dace55e26587fb008532c30f06f1cb5cfba6d926d8` |
| `packages/api/src/tenant/model/RotationGroupTemplateLogModel.ts` | `d5d9324a2e306ae1ab8e2754b4aca6bc41dcb9a9801e625c78088600c2425155` |
| `packages/api/src/tenant/model/RotationGroupTemplateModel.ts` | `41ae4f37848ed7910383c11dac4b4fc7d7662b6f59ca1893e3ae742cf1ecf513` |
| `packages/api/src/tenant/model/RotationGroupsModel.ts` | `f20d26afa13e0541d4a64916eb4407ead0818e6aa03fd647190df893f62c8935` |
| `packages/api/src/tenant/model/ScheduleAssignmentsLogModel.ts` | `794fed965d3ae5fdb2f02e553f7d14c507338d2aca76497fd847d581c44f16cb` |
| `packages/api/src/tenant/model/ScheduleAssignmentsModel.ts` | `1ffd862bfb54ec1a4b59f9a4d60d90d77a8c39d1441d5951783c58f1c14ed92e` |
| `packages/api/src/tenant/model/SessionModelModel.ts` | `74d646263e6ebaead15c405bb4e6a46ad7c154af74ed553f28397084b4d0963d` |
| `packages/api/src/tenant/model/SessionTemplatesModel.ts` | `222dfdce787c100265d894e8a334db9d2cf685da9df464d53a0956f28e47722b` |
| `packages/api/src/tenant/model/UserModel.ts` | `2f0f84f20ef9686dc004f43c8159d264768ae84f4718a7526163a23cf280ee68` |
| `packages/api/src/tenant/model/UserRoleModel.ts` | `c3d804d6b90a68927208834ea9deef3be5f5017fcd8fadb7fa992dde5108eea6` |
| `packages/api/src/tools/api-key-manager.ts` | `8521a5bf0204b59301f770aa03838a1110f3ce82278f0215d066af64e4e4f9f0` |
| `packages/api/src/tools/country.phone.validation.ts` | `67aa925bb121aca7ff902af25cba582eb49cce6d8bde4779c131b1ecc37fc611` |
| `packages/api/src/tools/glossary.ts` | `b4b3d37ccdd6c3ed97407eb9d1517cbc239f86a6670428e8a8200844db57ebc8` |
| `packages/api/src/tools/revision.ts` | `470d3583ba3082240b8ddc11aa06bc91aa1f3a9a7fb133e822ea224abc1c1713` |
| `packages/api/src/tools/tenant-cache.service.ts` | `f82c9377e807d5e91809a84c8f23b75f6120aff48b6d3018d85e65349a009be0` |
| `packages/api/src/tools/watcher.ts` | `69e81efc818adcbde2031e8013f083890a534d8cff3bcba7dc4e6a9de80ea1e5` |
| `packages/api/src/utils/axios.config.ts` | `ecbbf8265cfe0231501bd0ad0ad5731bc6f3459c204548ba028850fc673f8990` |
| `packages/api/src/utils/employee.color.ts` | `9d811f9479d539c2ed8a917691a67658b7017ffe797d74123bea38052044f18a` |
| `packages/api/src/utils/generate.otp.ts` | `6ce3af15372efefa8a017b0adb841c7f062e9a20584a61a35296459ad7484e48` |
| `packages/api/src/utils/response.model.ts` | `44965a7238bd9f8b8c09829a46d7c04fa5c2e056778e4f73516d6f70f426d078` |
| `packages/api/src/utils/token.generator.ts` | `33b890248d5e3309c3242119c10de5b4d4794b43203475fcc828debb40f4945a` |

Supports de compilation/assemblage à figer également : `packages/api/src/tenant/database/pg.tenant-driver.d.ts`, `package.json`, `package-lock.json`, `packages/api/package.json`, `packages/api/tsconfig.json`, `packages/shared/package.json`, `packages/shared/tsconfig.json`, `ecosystem.config.cjs` et l’artefact complet Shared résolu. Ne pas copier une configuration .env ou un cache de travail. Les 107 sources ne contiennent aucun routeur A/B2 ni montage HTTP `tenant/app.ts` ou `master/app.ts`.
