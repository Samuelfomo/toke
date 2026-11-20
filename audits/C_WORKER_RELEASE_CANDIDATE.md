# TOKÉ — C-WORKER : candidat de release autonome

9 novembre 2026. Référence : [plan de première release](./TOKE_PREMIERE_RELEASE_PLAN.md).

**Verdict : GO pour le candidat local rc5. Aucun GO de déploiement serveur.** Le véritable point d’entrée compilé, ses dépendances privées et le cron ont été exécutés après installation dans un répertoire temporaire extérieur au workspace, avec PostgreSQL A/B jetable. Les contrôles demandés passent. L’inventaire serveur reste à autoriser et à réaliser avant toute décision d’installation réelle.

Aucun accès production, déploiement, commande PM2 réelle, migration réelle, changement de données historiques, reset/clean Git ou nouveau chantier métier. Les sources V01, worker, Master/Tenant/BFF/Cloud et les mécanismes de sécurité mémos existants sont préservés. Les seules adaptations sont dans l’outillage de packaging et l’artefact autonome, décrites ci-dessous.

## 1. Emplacement et identité de l’artefact

Candidat unique retenu :

```text
/Volumes/Workspace/toke/releases/c-worker-local-20261109-rc5
```

Point de lancement officiel : `node run.mjs`. Il importe et démarre le vrai `dist/automate/automate.js`, compilé depuis le worker existant, sans VM ni remplacement de ses services métier. Une tâche node-cron réelle `0 0 * * *`, timezone Africa/Douala, est enregistrée.

Manifeste exhaustif : [MANIFEST.json](../releases/c-worker-local-20261109-rc5/MANIFEST.json).

```text
SHA-256 MANIFEST.json
139115cf53b1cdd42f9c0d65db3a05b7badf48b8dc8d3a1dae2b60ce129db536
```

Le manifeste contient les SHA-256 individuels de **5 233 fichiers**, hors manifeste lui-même, les 107 sources API de la fermeture d’imports, les empreintes des sources/paramètres de construction, les versions et intégrités du lockfile des 66 packages externes copiés, ainsi que les transformations d’emballage. Total : **5 234 fichiers avec le manifeste**, aucun lien symbolique. Les fichiers manifestés représentent 38 135 499 octets ; taille allouée disque différente selon filesystem.

Les répertoires rc1–rc4 sont des étapes locales d’assemblage/essai, **non retenues pour livraison**. Ils n’ont pas été supprimés par nettoyage destructif. Seul rc5, identifié par son manifeste ci-dessus, bénéficie de ce verdict.

### Contenu livré

| Contenu | Rôle |
|---|---|
| `run.mjs` | Lanceur opérationnel dédié : configuration externe obligatoire, démarrage du vrai worker, arrêt/drainage. |
| `dist/automate/{automate,rotation.cron}.js` | Ordonnanceur et calcul métier compilés, correctifs WORKER-IDS / WORKER-LOG-CYCLE-LENGTH / WORKER-ATOMICITY inclus. |
| Autres fichiers `dist/` | Fermeture transitive native ESM des classes/modèles/définitions/utilitaires et gardes V01. Liste complète dans `sourceFiles` et `files` du manifeste. |
| `node_modules/@toke/shared/dist/` et son package.json | Shared compilé depuis les sources compatibles ; types/public barrel conservés. |
| Autres `node_modules/` | Fermeture des dépendances déclarées installées, avec versions vérifiées contre le lockfile ; copies privées, pas de symlink vers le workspace. Certains packages déclarent aussi des supports de types. |
| `package.json` | Package privé worker-only, lancement `node run.mjs` ; aucun script de démarrage web/provisioning. |
| `ecosystem.config.cjs` | Une seule définition `toke-rotation`, une instance fork, script `run.mjs`, cwd = répertoire de release, kill_timeout 45 s, autorestart=false. Jamais exécutée pendant cette mission. |
| `workspace.lock.json` | Copie du lockfile de provenance, pas un appel à installer le monorepo en production. |
| `api.build.json`, `shared.build.json` | Paramètres et sources de compilation relevés ; recette reproductible portée par build.cjs. |

Les sources centrales V01 sont compilées sans modification fonctionnelle. Les `.d.ts` API non nécessaires au runtime sont écartées ; aucune résolution d’import JavaScript ne repose sur ces déclarations. Les imports relatifs et dynamiques littéraux du JavaScript livré sont vérifiés avant publication du manifeste.

### Exclusions vérifiées

Aucun point d’entrée Master HTTP, Tenant HTTP, BFF, Cloud, provisioning ou solveur n’est livré comme application. Les routeurs/serveurs applicatifs et modules A/B1/B2 sont interdits par la fermeture d’imports du constructeur. Aucune migration SQL, B1 ou MemoReads n’est incluse. Aucun package Redis, Express, Socket.IO, SMTP ou Firebase n’est requis/copié par cette fermeture.

Des définitions/classes communes Master apparaissent transitivement via `tools/revision` et les modèles : elles ne sont pas un démarrage du service Master. Les tests fournissent une configuration Master fictive inaccessible et bloquent toute connexion inattendue. Aucun serveur Master n’a été démarré.

Le lockfile de provenance peut nommer des packages du monorepo exclus ; leur présence dans ce document de provenance ne les installe ni ne les active. Les fichiers réellement livrés sont ceux de `files` et des packages copiés du manifeste.

## 2. Adaptations d’emballage explicites

Aucune refonte du worker, aucune modification de garde V01 ni changement des règles de rotation.

1. **Cache externe obligatoire.** Dans le seul JavaScript compilé `dist/tools/tenant-cache.service.js`, le littéral `/opt/toke/packages/api/cache/tenants.json` devient `process.env.C_WORKER_TENANT_CACHE_FILE`. Le lanceur exige un chemin absolu, un fichier existant et une structure de configuration cohérente avant de charger le worker. Pas de fallback vers le cache actif de l’API. La source applicative originale reste inchangée.
2. **ESM natif.** Les trois sites d’import dynamique `./db.config` du module commun Master sont normalisés en `./db.config.js`. Il s’agit de résolution de module, pas d’une initialisation ajoutée du Master.
3. **Métadonnées Shared.** Le package Shared généré garde nom/version/main/types, mais sa dépendance de workspace circulaire `@toke/api` est retirée de l’enveloppe distribuée : aucun import runtime Shared ne la requiert. Le code Shared compilé n’est pas remplacé ; sa dépendance runtime zod est incluse et épinglée.
4. **Lanceur d’arrêt.** SIGTERM/SIGINT stoppent les déclenchements futurs, attendent les événements de fin/échec des exécutions actives, détruisent la tâche puis drainent les pools via les APIs V01 existantes hors contexte métier. Le compteur d’exécutions tient compte du fait que `node-cron.execute()` ne signale pas toujours l’état running. Aucune transaction n’est réattribuée ou rejouée. Délai maximal de drainage 30 s ; échec => sortie 1 avec diagnostic imposant revue du résultat SQL.
5. **Profil PM2 dédié.** Une instance seulement et aucun autorestart automatique configuré, pour conserver une décision opérateur après échec d’arrêt/démarrage. Cela ne prouve pas l’absence d’une autre instance sur le serveur : inventaire obligatoire.

Le lanceur fixe `NODE_ENV=production` et `TZ=Africa/Douala`, se place dans son propre répertoire et refuse un `.env` à sa racine. Les modules transitifs utilisant dotenv ne trouvent pas de fichier réel dans cet artefact neuf. Ne pas déposer de .env dans la release ni lancer un autre point d’entrée à la place du lanceur.

## 3. Outils créés et construction reproductible

Fichiers ajoutés dans le workspace, hors artefact :

```text
packages/api/release/c-worker/build.cjs
packages/api/release/c-worker/run.mjs
packages/api/release/c-worker/verify.cjs
packages/api/release/c-worker/fixture-driver.mjs
packages/api/release/c-worker/fixture-preload.cjs
audits/C_WORKER_RELEASE_CANDIDATE.md
```

Les deux fichiers fixture sont des moyens de test et **ne sont pas livrés** dans le candidat. Aucun fichier applicatif préexistant n’a été édité pendant cette mission. Les artefacts rc1–rc5 sont de nouveaux répertoires locaux.

Commande de reconstruction, sur les sources et dépendances épinglées du workspace, vers un répertoire absolument nouveau :

```sh
node packages/api/release/c-worker/build.cjs /chemin/local/nouveau/c-worker-versionne
```

Le constructeur refuse un répertoire existant et les répertoires applicatifs packages. Il ne charge aucun module applicatif, ne lance aucun script npm/install, ne charge aucun .env et n’accède pas au réseau. Il utilise le compilateur TypeScript **5.9.3** présent, compile Shared puis la fermeture API avec les types Shared fraîchement émis, et refuse les diagnostics TypeScript. Aucun `dist` du workspace n’est remplacé.

Résolution : AST des imports JS après effacement des types, exports transitifs et imports dynamiques littéraux ; imports dynamiques calculés refusés. Les racines externes et leurs dépendances déclarées sont résolues à partir des installations locales, vérifiées contre les entrées exactes de package-lock.json, puis copiées hors ligne en conservant leur emplacement imbriqué. Symlinks, .env, .npmrc et node_modules imbriqués copiés aveuglément sont refusés/exclus ; les dépendances imbriquées sont traitées explicitement.

**Provenance :** les versions et champs integrity sont vérifiés/relevés contre le lockfile ; les fichiers copiés ont leurs propres SHA. Les archives npm d’origine n’ont pas été téléchargées ni revérifiées par SRI. Il ne s’agit pas d’un npm ci indépendant depuis un registre. La reconstruction demande donc les mêmes sources et paquets locaux vérifiés, ou une préparation de dépendances sous autorisation distincte. Ne pas lancer npm install/ci dans l’artefact livré.

Assemblages réalisés : compilations Shared/API et packaging jusqu’à rc4, puis rc5 constitué à partir du payload rc4 intégralement vérifié par SHA, avec le seul lanceur final recopié et ses empreintes source/fichier actualisées. Le code compilé du worker, Shared et les dépendances de rc5 sont les mêmes octets compilés par le constructeur. Toutes les empreintes source du manifeste rc5 correspondent aux sources actuelles. La recette finale porte sur rc5 complet, pas sur l’état de rc4.

La première tentative a corrigé la résolution d’un package de types sans entrypoint JS dans le constructeur ; les premiers essais ont corrigé le nom physique singulier du journal et l’observation des verrous depuis une connexion hors transaction de blocage. Le test d’arrêt en charge a corrigé le nouveau lanceur. Aucune assertion de concurrence, contrainte PostgreSQL ou protection V01 n’a été supprimée/affaiblie.

## 4. Recette de l’artefact réel

Commande exécutée avec succès :

```sh
PATH="/Applications/Postgres.app/Contents/Versions/16/bin:$PATH" \
  node packages/api/release/c-worker/verify.cjs \
  /Volumes/Workspace/toke/releases/c-worker-local-20261109-rc5 \
  --create-disposable-cluster
```

**Sortie finale : 0.** PostgreSQL 16.15. Node 20.18.0, macOS Darwin x64. Les versions exactes des bibliothèques figurent plus bas et dans le manifeste.

### Confinement

Le test vérifie le manifeste puis copie l’artefact dans un nouveau `/tmp/toke-cworker-*/installed`, extérieur au workspace. Ses enfants chargent les fichiers JavaScript natifs depuis cette installation déplacée, sans VM, loader de sources métier ou substitution de package applicatif. Les résolutions CJS qui sortiraient de l’artefact sont refusées ; ESM utilise ses propres packages dans l’installation isolée. Aucun NODE_PATH ni environnement applicatif hérité n’est fourni.

Chaque passage crée son propre cluster marqué par nonce, deux bases `v01_test_a` / `v01_test_b`, deux propriétaires de fixtures et deux rôles runtime. Socket Unix privé, TCP PostgreSQL désactivé. Bootstrap par les véritables structures compilées sur ces bases neuves seulement ; pas de migration. La table MemoReads est ensuite retirée des **fixtures jetables** pour démontrer qu’elle n’est pas requise par le worker.

Le runtime ne possède pas les tables : SELECT pour les lectures/descriptions, UPDATE des assignments, INSERT du journal et usage des séquences. CREATE public refusé ; un event trigger de fixture bloque les DDL ordinaires existing, en plus de l’inspection des requêtes. Le rôle de contrôle crée les triggers de panne uniquement dans ces bases fictives, séparément du rôle runtime.

Le préchargement de test autorise uniquement les sockets PG de ce cluster, refuse DNS/TCP externes, écouteurs HTTP, cache `/opt/toke` et .env réel. Cache tenants fictif externe à la copie installée ; variables Master vers une cible fictive interdite. Aucun email/webhook/notification, Redis, HTTP applicatif, PM2 ou provisioning n’est lancé. Les privilèges système accordés au banc servent uniquement à initdb/cluster privé et ses enfants.

### Résultats

| Contrôle | Résultat réel |
|---|---|
| 1. Véritable point d’entrée | Exécution native du launcher livré comme entrée OS ; marqueurs READY puis DRAINED ; sortie 0 après SIGTERM. |
| 2. Résolution imports/dépendances | Compilation stricte + vérification du graphe ; runtime déplacé hors workspace, tous packages privés ; PASS. |
| 3. Pas de serveur/provisioning inattendu | Aucun routeur/serveur dans la fermeture ; écoutes HTTP et réseau externe interdits pendant les processus réels ; PASS. |
| 4. Zéro DDL existing | Runtime non propriétaire, event trigger de refus, trace SQL contrôlée ; MemoReads absent et aucun schéma B1 ; PASS A/B. |
| 5. Groupes exacts | Deux groupes, un seul assigné ; vrai SELECT Op.in ciblé et un avancement/log attendu ; PASS A/B. |
| 6. cycle_length | Groupe informatif =99, trois slots réels ; journal =3, offset 0→1 ; PASS A/B. |
| 7. Atomicité | Refus BEFORE INSERT journal et BEFORE UPDATE assignment dans A puis B ; ligne assignment entière inchangée et aucun journal après rollback, autre tenant commit ; PASS. |
| 8. Idempotence/concurrence | Deux exécutions du vrai cron donnent un seul journal/jour ; deux processus natifs distincts réellement en attente FOR UPDATE, puis un seul avancement/log par base ; PASS. |
| 9. SQL hors contexte | Connexion capturée hors portée et sous tenant/transaction étrangers : refus avant SQL natif ; aucune requête SELECT 1 de contournement ; PASS. |
| 10. Commit incertain | Hook de test après vrai COMMIT SQL : offset/date/journal durables, failed=1 et processed=0, un seul COMMIT, pas de rejeu ; PASS. Ce n’est pas une partition réseau réelle. |
| 11. Sans Redis lot 3 | Aucun package ioredis/redis ni source de sessions A dans le payload ; aucune socket autre que PG admise dans le test ; PASS. |
| 12. Arrêt propre | SIGTERM au repos et pendant une vraie tâche bloquée sur verrou PG ; processus reste vivant jusqu’à libération, termine A et B, puis ferme tâche/pools et sort 0 ; PASS. |

La tâche réelle `node-cron.execute()` est déclenchée dans le test : on ne prétend pas avoir attendu l’échéance murale de minuit. Les parcours de rotation et SQL exécutés sont ceux du fichier compilé réel. Les hooks d’observation/commit incertain et les gardes de confinement appartiennent au banc externe, pas au payload.

Tous les enfants suivis sont terminés, pg_ctl a confirmé l’arrêt du cluster, puis seul le répertoire marqué du test a été supprimé. Contrôle final : aucun `/tmp/toke-cworker-*` marqué restant. L’artefact source reste intact après la recette ; les SHA sont revérifiés.

### Trace du passage final

```text
postgres (PostgreSQL) 16.15 (Postgres.app)
PASS artifact native entry + actual cron task execution, correct groups/cycle_length=3 (not informative99), A/B, no MemoReads table or DDL, replay idempotent
PASS artifact rollback: failed log INSERT / assignment UPDATE A/B preserve offset/date and journal, other tenant commits
PASS artifact two-process concurrency, real FOR UPDATE wait observed, exactly one advance/log A/B
PASS artifact V01: native/raw SQL absent/foreign context and transaction refused before driver
PASS artifact uncertain commit: real SQL COMMIT then injected acknowledgement failure; durable offset/log, failed=1/processed=0, no replay
PASS SIGTERM during actual scheduled execution waits for transaction and both tenants, then drains pools
PASS actual OS entry startup + SIGTERM shutdown, no HTTP listener/external network/real dotenv/cache, no Redis package
PASS native runtime tested after relocation outside workspace, all dependencies private
RESULT C-WORKER artifact verification PASS
CLEANUP owned A/B cluster stopped and removed; all child processes exited
```

## 5. Différences à confirmer avec le serveur

Aucune donnée serveur recueillie. L’inventaire futur devra confirmer :

- Node/OS/architecture/ABI et disponibilité des prébuilds bcrypt ; le GO local Darwin x64 ne vaut pas recette Linux. Le paquet contient les prébuilds fournis par la dépendance épinglée, pas une compilation faite sur le serveur.
- Schémas exacts et droits par tenant : rotations/slots/assignments/journal, last_advanced_date, cycle_length, types/FK/index et contraintes. L’artefact ne répare pas un schéma incompatible et n’exécute aucune migration.
- Ancien worker réellement utilisé : script, cwd, artefact, scheduler(s), PM2 daemon/utilisateur, autres hôtes et producteurs de rotations. Une seule entrée locale instances=1 ne démontre pas une unicité distribuée.
- Version de Shared et des schémas ayant produit les données existantes. Les dépendances privées évitent un remplacement du node_modules actif, pas une incompatibilité de données non inspectées.
- Cache/configuration dédiée : chemin externe, permissions, comptes et empreintes de configuration ; aucune copie du cache actif ni de secrets n’a été faite ici. Les entrées actives de ce fichier définissent tous les tenants traités ; aucun canary par tenant nouveau n’a été ajouté.
- Anciennes valeurs offset/date/journal et effets d’un éventuel commit incertain avant bascule ; sauvegardes restaurables et surveillance prévue.

Le chemin source fixe du cache est supprimé uniquement dans cet artefact ; l’API existante garde sa propre configuration. Les changements de credentials/configuration tenant exigent un drainage/redémarrage contrôlé : ne pas contourner TENANT_CONFIG_CHANGED par une édition à chaud ou un reset des gardes.

## 6. Checklist d’installation future — non exécutée

1. **Autorisation serveur et inventaire en lecture seule.** Faire confirmer les points ci-dessus et le manifeste exact. Sans compatibilité du schéma/runtime et propriété des ressources : NO-GO de déploiement.
2. **Sauvegardes.** Conserver anciens artefacts, configuration du processus/PM2, état rotation/journal et sauvegarde cohérente des bases concernées, avec restauration vérifiée sur clone. Stocker les secrets hors release et hors logs.
3. **Installer sans écraser.** Copier uniquement rc5 dans un nouveau répertoire versionné, par exemple un chemin de releases dédié au worker. Vérifier SHA du manifeste puis chaque fichier ; aucune symlink vers dist/node_modules d’API Master/Tenant/BFF/Cloud. Ne pas exécuter npm install, build global ou migration sur le serveur actif.
4. **Configurer séparément.** Fournir `C_WORKER_TENANT_CACHE_FILE` vers un fichier JSON absolu dédié, non livré dans l’archive/répertoire candidat. Restreindre les accès au compte worker. Prévoir les seuls tenants autorisés ; ne pas modifier le cache partagé de l’API pour simuler un canary. Aucun .env dans la release.
5. **Arrêter l’ancien ordonnanceur.** Hors fenêtre de cron, suspendre sa planification et attendre la fin de ses transactions. Sauvegarder sa définition PM2 ; vérifier PID(s)/utilisateur(s)/hôtes et absence d’un second cron système/conteneur. Aucune suppression de données, aucun reset offset/date.
6. **Démarrer exclusivement toke-rotation.** Faire pointer uniquement cette définition vers le `ecosystem.config.cjs` de la nouvelle release, cwd/version vérifiés. Remplacer l’ancienne entrée ciblée suivant la procédure PM2 approuvée, sans `start all`, `restart all`, `reload all` ou déploiement du monorepo. L’exemple `pm2 start <release>/ecosystem.config.cjs --only toke-rotation --env production` ne dispense pas de vérifier le remplacement de l’ancienne entrée et le chemin effectif du nouveau PID.
7. **Vérifier l’unicité et READY.** Un seul scheduler autorisé ; pas de nouvelle écoute HTTP ni démarrage Master/Tenant/BFF/Cloud. Procédure d’arrêt SIGTERM testée, kill_timeout 45 s supérieur au drainage 30 s. L’état READY confirme le cron, pas une validation des schémas de tous les tenants avant leur première exécution.
8. **Surveiller la première échéance.** Vérifier processed/skipped/**failed**, logs d’erreur par assignment, date et cohérence offset/journal/cycle_length, sans écriture de test improvisée chez un client. Le résumé historique Automate peut classer un tenant ok même si son résultat contient failed : ne pas surveiller seulement ce résumé ou le code de sortie du processus.
9. **Accepter ou arrêter.** Écart d’intégrité, garde V01, schéma absent ou résultat SQL incertain => suspendre la planification et réconcilier, pas rejouer/assouplir. Aucun autre lot n’est activé par cette livraison.

Le worker reste un processus partagé parcourant le cache séquentiellement ; la livraison progressive porte sur ce composant, pas sur un canary tenant inexistant. Si cette portée ne convient pas à l’exploitation, NO-GO opérationnel sous la procédure actuelle.

## 7. Résultat SQL incertain et retour arrière

- Une erreur après COMMIT peut laisser une rotation durable. Le test le démontre ; « failed » ne signifie pas rollback. Ne pas déclencher de nouveau passage de rattrapage et ne pas modifier offset/date/journal pour tenter d’annuler.
- Relever l’assignment concerné, sa date, son offset et le journal dans une inspection autorisée en lecture seule. Suspendre les prochains déclenchements si la confirmation est incertaine et demander une décision d’exploitation. Le calendrier quotidien existant n’est pas modifié par l’artefact ; il ne s’auto-suspend pas après chaque erreur métier.
- SIGTERM attend les exécutions actives. En cas de dépassement 30 s, le lanceur sort en échec avec diagnostic de revue ; toute fermeture forcée/interruption reste une issue à réconcilier, pas une preuve que rien n’a été écrit. Le profil PM2 livré n’autoredémarre pas.
- Avant première exécution : arrêter le nouveau processus et conserver les deux artefacts ; aucune donnée à annuler. Après exécution possible : rapprocher les écritures avant tout changement de version.
- L’ancien worker comportant les défauts IDS/cycle_length/atomicité **n’est pas un rollback automatiquement sûr**. Revenir uniquement à un artefact dont les garanties nécessaires sont établies. À défaut, garder le scheduler arrêté et faire valider la continuité métier ; pas de restauration aveugle d’une base recevant encore des pointages.
- Conserver les anciennes releases et les sauvegardes. Aucun DROP/down de migration n’est requis puisque ce candidat n’ajoute pas de schéma. Ne pas remplacer le dist/API actif pour effectuer le retour arrière du worker.

## 8. Portée du verdict

**GO local rc5** : code compilé et packages privés résolus hors workspace, tests réels A/B réussis, gardes V01 inchangés, aucune dépendance aux surfaces HTTP/mémos du lot 3. Le manifeste ci-dessus est l’identité du candidat validé.

**Pas encore de GO serveur** : version déployée, schémas historiques, privileges, architecture/Node, configuration, unicité distribuée, sauvegardes et fenêtre restent à confirmer après autorisation explicite d’inventaire. Les réserves V01 et les fermetures memo_permissions_pending des services existants ne sont ni modifiées ni déclarées résolues. B3/B4/lot 4 non entrepris.

Arrêt de la mission après ce candidat et sa validation locale.

## Annexe — Versions exactes des packages externes copiés

Chaque emplacement imbriqué est conservé ; une même bibliothèque peut donc apparaître plusieurs fois avec des versions différentes nécessaires à ses consommateurs. SHA individuels dans MANIFEST.files, version/lockIntegrity/path dans MANIFEST.packages.

| Package | Version | Emplacement privé |
|---|---|---|
| `@types/debug` | `4.1.13` | `node_modules/@types/debug` |
| `@types/ms` | `2.1.0` | `node_modules/@types/ms` |
| `@types/node` | `20.19.43` | `node_modules/@types/node` |
| `@types/validator` | `13.15.10` | `node_modules/@types/validator` |
| `agent-base` | `6.0.2` | `node_modules/agent-base` |
| `asynckit` | `0.4.0` | `node_modules/asynckit` |
| `axios` | `1.21.0` | `node_modules/axios` |
| `bcrypt` | `6.0.0` | `node_modules/bcrypt` |
| `call-bind-apply-helpers` | `1.0.2` | `node_modules/call-bind-apply-helpers` |
| `combined-stream` | `1.0.8` | `node_modules/combined-stream` |
| `debug` | `4.4.3` | `node_modules/debug` |
| `delayed-stream` | `1.0.0` | `node_modules/delayed-stream` |
| `dotenv` | `16.6.1` | `node_modules/dotenv` |
| `dottie` | `2.0.7` | `node_modules/dottie` |
| `dunder-proto` | `1.0.1` | `node_modules/dunder-proto` |
| `es-define-property` | `1.0.1` | `node_modules/es-define-property` |
| `es-errors` | `1.3.0` | `node_modules/es-errors` |
| `es-object-atoms` | `1.1.2` | `node_modules/es-object-atoms` |
| `es-set-tostringtag` | `2.1.0` | `node_modules/es-set-tostringtag` |
| `follow-redirects` | `1.16.2` | `node_modules/follow-redirects` |
| `form-data` | `4.0.6` | `node_modules/form-data` |
| `mime-db` | `1.52.0` | `node_modules/form-data/node_modules/mime-db` |
| `mime-types` | `2.1.35` | `node_modules/form-data/node_modules/mime-types` |
| `function-bind` | `1.1.2` | `node_modules/function-bind` |
| `get-intrinsic` | `1.3.0` | `node_modules/get-intrinsic` |
| `get-proto` | `1.0.1` | `node_modules/get-proto` |
| `gopd` | `1.2.0` | `node_modules/gopd` |
| `has-symbols` | `1.1.0` | `node_modules/has-symbols` |
| `has-tostringtag` | `1.0.2` | `node_modules/has-tostringtag` |
| `hasown` | `2.0.4` | `node_modules/hasown` |
| `https-proxy-agent` | `5.0.1` | `node_modules/https-proxy-agent` |
| `inflection` | `1.13.4` | `node_modules/inflection` |
| `libphonenumber-js` | `1.13.15` | `node_modules/libphonenumber-js` |
| `lodash` | `4.18.1` | `node_modules/lodash` |
| `math-intrinsics` | `1.1.0` | `node_modules/math-intrinsics` |
| `moment` | `2.31.0` | `node_modules/moment` |
| `moment-timezone` | `0.5.48` | `node_modules/moment-timezone` |
| `ms` | `2.1.3` | `node_modules/ms` |
| `node-addon-api` | `8.9.2` | `node_modules/node-addon-api` |
| `node-cron` | `4.6.0` | `node_modules/node-cron` |
| `node-gyp-build` | `4.8.4` | `node_modules/node-gyp-build` |
| `pg` | `8.23.1` | `node_modules/pg` |
| `pg-cloudflare` | `1.4.1` | `node_modules/pg-cloudflare` |
| `pg-connection-string` | `2.14.1` | `node_modules/pg-connection-string` |
| `pg-int8` | `1.0.1` | `node_modules/pg-int8` |
| `pg-pool` | `3.14.0` | `node_modules/pg-pool` |
| `pg-protocol` | `1.16.1` | `node_modules/pg-protocol` |
| `pg-types` | `2.2.0` | `node_modules/pg-types` |
| `pgpass` | `1.0.5` | `node_modules/pgpass` |
| `postgres-array` | `2.0.0` | `node_modules/postgres-array` |
| `postgres-bytea` | `1.0.1` | `node_modules/postgres-bytea` |
| `postgres-date` | `1.0.7` | `node_modules/postgres-date` |
| `postgres-interval` | `1.2.0` | `node_modules/postgres-interval` |
| `proxy-from-env` | `2.1.0` | `node_modules/proxy-from-env` |
| `retry-as-promised` | `7.1.1` | `node_modules/retry-as-promised` |
| `semver` | `7.8.6` | `node_modules/semver` |
| `sequelize` | `6.37.8` | `node_modules/sequelize` |
| `sequelize-pool` | `7.1.0` | `node_modules/sequelize-pool` |
| `uuid` | `8.3.2` | `node_modules/sequelize/node_modules/uuid` |
| `split2` | `4.2.0` | `node_modules/split2` |
| `toposort-class` | `1.0.1` | `node_modules/toposort-class` |
| `undici-types` | `6.21.0` | `node_modules/undici-types` |
| `validator` | `13.15.35` | `node_modules/validator` |
| `wkx` | `0.5.0` | `node_modules/wkx` |
| `xtend` | `4.0.2` | `node_modules/xtend` |
| `zod` | `3.25.76` | `node_modules/zod` |

Shared compilé : `@toke/shared@1.0.0`. Compilateur : `typescript@5.9.3`. Assemblage testé : Node `v20.18.0`, Darwin x64 ; PostgreSQL fictif `16.15`.
