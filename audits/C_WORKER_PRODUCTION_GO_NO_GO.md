# TOKÉ — C-WORKER rc5 : décision opérationnelle de mise en production

9 novembre 2026. Référence : [candidat local C-WORKER](./C_WORKER_RELEASE_CANDIDATE.md).

**Verdict actuel : NO-GO opérationnel.** Le GO local rc5 est conservé. L’inventaire de production n’est pas autorisé à ce stade et n’a pas été effectué ; aucune compatibilité Linux n’est démontrée. Aucun déploiement, commande PM2, redémarrage, migration, sauvegarde serveur ou requête SQL de production exécuté.

Ce rapport prépare exclusivement le remplacement du processus de rotation. Il ne rouvre ni V01, ni B3/B4, ni le lot 4, ni un audit général de Toké. Une première autorisation explicite est requise pour l’inventaire borné en lecture seule ; **une seconde autorisation distincte** sera nécessaire pour toute installation, modification de configuration/processus, sauvegarde impliquant une intervention serveur ou bascule effective.

## 1. Situation réellement connue

| Élément | Résultat confirmé |
|---|---|
| Candidat local | `/Volumes/Workspace/toke/releases/c-worker-local-20261109-rc5` |
| Identité du manifeste | SHA-256 `139115cf53b1cdd42f9c0d65db3a05b7badf48b8dc8d3a1dae2b60ce129db536` |
| Intégrité locale | Les 5 233 fichiers manifestés sont inchangés lors de cette préparation. Aucun lien vers le node_modules actif. |
| Environnement testé | Darwin x64, Node 20.18.0 ; PostgreSQL fictif 16.15 ; aucune exécution Linux revendiquée. |
| Dépendances clés | Sequelize 6.37.8, pg 8.23.1, node-cron 4.6.0, bcrypt 6.0.0, zod 3.25.76 ; Shared 1.0.0 compilé ; versions complètes dans le manifeste. |
| Entrée rc5 | `run.mjs` → vrai `dist/automate/automate.js` ; une tâche quotidienne `0 0 * * *`, Africa/Douala. |
| Processus cible proposé | Nom `toke-rotation`, une instance fork, arrêt/drainage 30 s, kill_timeout 45 s, autorestart=false. Ce sont les paramètres du candidat, **pas ceux du serveur**. |
| Cache rc5 | Fichier externe absolu fourni par `C_WORKER_TENANT_CACHE_FILE`, indépendant du cache API ; aucun cache réel livré. |
| Tests locaux antérieurs | Runtime déplacé hors workspace, PostgreSQL A/B, groupes, cycle_length, rollback, concurrence, commit incertain, SQL hors contexte et arrêt en charge : PASS. Aucun nouveau banc métier relancé pour cette préparation. |

### Version déployée et différences : non déterminées

| Information serveur | État | Comparaison attendue avec rc5 |
|---|---|---|
| Hôte(s), utilisateur système et daemon PM2 concernés | Inconnus | Périmètre explicite et compte de lecture nécessaires avant connexion. |
| Identifiant PM2, namespace, PID, script et cwd effectivement actifs | Inconnus | Identifier l’entrée réellement exécutée, pas le seul fichier ecosystem du dépôt. |
| Version/hash du worker chargé | Inconnus | Relier provenance d’artefact, démarrage et fichiers déployés ; une version package.json générique ne suffit pas. |
| Node réellement utilisé / architecture / libc | Inconnus | Comparer au runtime Linux isolé qui sera validé. |
| Nombre d’instances et autres ordonnanceurs | Inconnus | Prouver l’unicité sur le périmètre approuvé, y compris hors du daemon PM2 courant. |
| Schémas, index, contraintes, triggers et droits rotation | Inconnus | Aucun schéma manquant ni migration nécessaire n’est présumé. |
| Cache/configuration active et état des rotations/journaux | Inconnus | Métadonnées et projection expurgée uniquement ; pas de lecture de secrets. |
| Séparation worker / artefacts web | Inconnue | Aucune substitution d’un dist/node_modules partagé lors de l’installation. |

Les défauts corrigés localement — filtre des groupes, cycle_length réel et transaction offset/date/journal — ne sont **pas déclarés présents sur le serveur sans preuve du code actif**. HEAD Git local et empreinte du fichier sur disque ne prouvent pas à eux seuls quels octets un processus ancien a chargés, notamment si un dist a été remplacé depuis son démarrage.

## 2. Autorisation nécessaire pour la phase 1

L’autorisation à obtenir doit préciser : hôte(s)/cible SSH, compte système et périmètre d’accès, daemon/utilisateur PM2 visé, bases tenant concernées et canal SQL de lecture déjà approuvé. Aucun accès n’est déduit d’une configuration locale, d’un cache ou d’un ancien accès de conversation. Pas de recherche de credentials dans .env, cache JSON, historique shell, configuration SSH ou connecteurs.

Actions admissibles après cette première autorisation : lectures de métadonnées ciblées, projection PM2 limitée, fingerprints des fichiers du worker et requêtes **SELECT exclusivement**, sans prise de verrou métier. Aucun lancement du worker, même « pour voir s’il démarre » : il enregistre un ordonnanceur et peut ultérieurement écrire des rotations.

Actions exclues de l’inventaire : `pm2 env`, dumps bruts `jlist/prettylist`, lecture de `/proc/<pid>/environ` ou cmdline, `printenv`, .env/cache tenants, logs généraux non expurgés, exports de bases, imports applicatifs, `npm install`, créations de fichiers sur le serveur, services/cron reload, changement d’utilisateur/rôle SQL non prévu. Aucun outil de collecte n’est téléversé/exécuté sans inclusion explicite dans l’autorisation.

L’inventaire pourra noter « accès non disponible » plutôt que demander une élévation générale ou lire des secrets. Une absence de preuve reste bloquante ; elle n’est pas traitée comme une absence de risque.

## 3. Inventaire système/PM2 ciblé — commandes proposées, non exécutées

### 3.1 Projection du daemon existant

Relever uniquement pour `toke-rotation` : nom/namespace, PM2 id, PID(s), statut, script, cwd, interpréteur, version Node annoncée, mode, instances, horodatage de démarrage, kill_timeout et autorestart. Aucune valeur de credential, arguments libres ou tableau d’environnement.

Utiliser une projection assainie depuis le **daemon déjà actif**, avec filtre exécuté côté serveur avant restitution. Ne pas appeler une commande PM2 susceptible d’amorcer un nouveau daemon quand aucun daemon n’est joignable. Si le mécanisme de projection en lecture seule n’est pas disponible ou ne peut être borné, obtenir ces seuls champs de l’opérateur ; ne pas remplacer cela par un dump brut.

La présence d’un socket PM2 est une observation, pas une garantie contre une course de disparition du daemon. Ne pas conclure qu’un `pm2 jlist` serait strictement sans effet parce qu’un fichier rpc.sock existe.

Pour comparer les racines d’artefacts HTTP, demander seulement leurs chemins techniques nécessaires à cette comparaison, sans environnement ni inspection fonctionnelle Master/Tenant/BFF/Cloud.

### 3.2 Vérifications Linux du PID identifié

Exemples à adapter **après identification du PID réel**, avec variables fournies par l’opérateur, pas extraites d’un dump de secrets :

```sh
ps -p "$worker_pid" -o pid=,ppid=,user=,comm=
readlink -f "/proc/$worker_pid/exe"
readlink -f "/proc/$worker_pid/cwd"
file -L "/proc/$worker_pid/exe"
uname -srm
getconf LONG_BIT
getconf GNU_LIBC_VERSION
```

Sur musl, la dernière commande peut ne pas exister/réussir ; demander alors l’identification libc par l’opérateur ou un outil système approuvé. Ne pas considérer un échec comme une preuve de glibc. Ne pas exécuter `ldd` sur un binaire inconnu.

Si l’exécutable identifié est bien Node et son exécution de version est autorisée :

```sh
env -i "/proc/$worker_pid/exe" -p \
  'JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,modules:process.versions.modules,napi:process.versions.napi})'
```

Ce nouveau processus ne charge aucun module applicatif et reçoit un environnement vide ; aucun NODE_OPTIONS hérité. Cela ne donne pas la version des bibliothèques déjà chargées par l’ancien worker : les rapprocher de la provenance de son artefact.

Empreintes et métadonnées ciblées, sans contenu de configuration :

```sh
sha256sum -- "$worker_script"
stat -- "$worker_script"
stat -- "$worker_cache_path"
readlink -f -- "$worker_cache_path"
```

Le cache n’est **ni ouvert ni parsé** par l’agent. Pour ses champs attendus, demander une attestation ou projection déjà expurgée fournie par l’opérateur, et un exemple fictif de même structure. La vérification de présence/type du mot de passe doit être fournie sans sa valeur ; pas de commande JSON qui lit un fichier secret puis prétend ne pas l’avoir lu parce qu’elle en masque l’affichage.

### 3.3 Autres ordonnanceurs de rotation

Limiter la collecte aux noms/PID/chemins techniques liés à la rotation : autres utilisateurs/daemons PM2 connus, services/timers dont le nom est lié à Toké/rotation, cron/conteneurs et éventuels autres hôtes explicitement inclus. Exemples de métadonnées ciblées :

```sh
systemctl list-timers --all --no-pager 'toke*' '*rotation*'
systemctl list-unit-files --no-pager 'toke*' '*rotation*'
```

Pour les unités identifiées : propriétés `MainPID`, `User`, `WorkingDirectory`, `FragmentPath`, `ActiveState`, pas Environment ni ExecStart brut. Pas de dump de crontabs, scripts ou fichiers de service pouvant contenir des secrets. L’opérateur doit confirmer les tâches indirectes ou portant un nom générique, et le périmètre multi-hôtes. Une recherche par nom ou un seul daemon PM2 ne prouve pas l’unicité globale.

## 4. Inventaire PostgreSQL — SELECT seulement, aucune écriture

Connexion de lecture fournie via un mécanisme approuvé sans exposition de mot de passe. Prévoir dès l’ouverture de connexion `default_transaction_read_only=on`, un statement_timeout court convenu avec l’opérateur et un lock_timeout borné, comme paramètres de démarrage du canal et non par des commandes SET ; ne pas créer de rôle, changer de grants, impersonner le worker ou exécuter son code. Aucun SELECT FOR UPDATE/SHARE, fonction de mutation, séquence nextval/setval, verrou consultatif, BEGIN/SET/DDL/DML ou EXPLAIN ANALYZE.

Les exemples suivants sont **des requêtes proposées non exécutées**. Les paramètres `:worker_role` et `:assignment_id` devront être liés par le collecteur approuvé ; ils ne sont pas des substitutions shell libres. Le rôle d’inventaire et le futur rôle worker sont distincts : ne pas déduire les droits du worker de ceux du lecteur.

### 4.1 Version et disponibilité des tables de rotation

```sql
SELECT current_database(), current_user,
       current_setting('server_version') AS server_version;

SELECT required.name,
       to_regclass(format('public.%I', required.name)) IS NOT NULL AS present
FROM (VALUES
  ('xa_rotation_groups'), ('xa_rotation_group_template'),
  ('xa_rotation_assignments'), ('xa_rotation_assignment_log')
) AS required(name);

SELECT c.relname, a.attname, format_type(a.atttypid,a.atttypmod) AS type,
       a.attnotnull, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_attribute a ON a.attrelid=c.oid
WHERE n.nspname='public'
  AND c.relname IN ('xa_rotation_groups','xa_rotation_group_template',
                   'xa_rotation_assignments','xa_rotation_assignment_log')
  AND a.attnum>0 AND NOT a.attisdropped
ORDER BY c.relname,a.attnum;
```

Comparer les PK INTEGER, identifiants/GUID, `offset`, `last_advanced_date` DATE, timestamps, `active/deleted_at`, références rotation, slots/positions/snapshots et champs immuables du journal. Examiner PK/FK, unicités/index valides, notamment GUID, related/family/group et relations du journal. Les catalogues sont lisibles sans exposer les valeurs related/GUID des collaborateurs.

Métadonnées complémentaires : noms/colonnes des PK/FK, validité des index, présence de prédicats/expressions, nombre de triggers non internes et politiques RLS. Ne pas collecter les corps des fonctions/triggers en masse ; un trigger ou une RLS non expliqué exige une revue ciblée autorisée, pas une hypothèse de neutralité.

L’initialiseur rc5 décrit 30 modèles existing, même si le worker utilise surtout les quatre tables ci-dessus. Comparer aussi les métadonnées nécessaires des modèles réellement traversés (utilisateurs, groupes/rôles et relations), à partir de l’allowlist du manifeste ; aucune lecture de noms/emails/PIN. L’absence MemoReads est tolérée par le chemin testé ; elle ne justifie aucune migration. Un modèle requis indisponible impose NO-GO, jamais sync/repair.

### 4.2 Capacités effectives du rôle worker

```sql
SELECT r.rolname, r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolbypassrls
FROM pg_roles r WHERE r.rolname=:worker_role;

SELECT c.relname,
       pg_get_userbyid(c.relowner)=:worker_role AS role_is_owner,
       has_schema_privilege(:worker_role,'public','USAGE') AS schema_usage,
       has_table_privilege(:worker_role,c.oid,'SELECT') AS can_select,
       has_table_privilege(:worker_role,c.oid,'UPDATE') AS table_update,
       has_table_privilege(:worker_role,c.oid,'INSERT') AS table_insert
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('xa_rotation_groups','xa_rotation_group_template',
                   'xa_rotation_assignments','xa_rotation_assignment_log');

SELECT column_name,
       has_column_privilege(:worker_role,'public.xa_rotation_assignments',
                            column_name,'UPDATE') AS can_update
FROM (VALUES ('offset'),('last_advanced_date'),('updated_at')) AS cols(column_name);

SELECT pg_get_serial_sequence('public.xa_rotation_assignment_log','id') IS NOT NULL
         AS sequence_present,
       has_sequence_privilege(:worker_role,
         pg_get_serial_sequence('public.xa_rotation_assignment_log','id'),'USAGE')
         AS sequence_usage;
```

À évaluer : lectures réellement nécessaires, UPDATE des colonnes de l’assignment, INSERT/RETURNING/lecture du journal et usage de sa séquence, transactions et verrouillage permis. Les droits par colonne ne doivent pas être confondus avec le grant global de table. Ne pas lire pg_authid ni les mots de passe. Un rôle propriétaire/superuser ou une RLS diffère de la fixture non propriétaire : documenter précisément cette différence sans modifier les privilèges pendant l’inventaire.

### 4.3 État agrégé, sans données personnelles

Ne lancer ces SELECT qu’après confirmation des tables/colonnes/types et avec délais bornés. Estimer d’abord les volumes via les catalogues : les comptages du journal peuvent nécessiter un scan complet. Si la charge ou le budget de lecture ne le permet pas, reporter les comptages à une fenêtre autorisée, sans les remplacer par des nombres inventés. Aucun export du contenu des utilisateurs ou snapshots JSONB.

```sql
WITH slots AS (
  SELECT rotation_group, count(*) AS slot_count
  FROM public.xa_rotation_group_template
  WHERE deleted_at IS NULL GROUP BY rotation_group
), assignments AS (
  SELECT id, rotation_group, "offset", last_advanced_date
  FROM public.xa_rotation_assignments
  WHERE active=true AND deleted_at IS NULL
)
SELECT count(*) AS active_assignments,
       count(*) FILTER (WHERE g.id IS NULL) AS missing_group,
       count(*) FILTER (WHERE COALESCE(s.slot_count,0)=0) AS without_slots,
       count(*) FILTER (WHERE a."offset"<0 OR a."offset">=s.slot_count)
         AS offset_outside_current_slots,
       min(a.last_advanced_date) AS oldest_advanced_day,
       max(a.last_advanced_date) AS newest_advanced_day
FROM assignments a
LEFT JOIN public.xa_rotation_groups g ON g.id=a.rotation_group
LEFT JOIN slots s ON s.rotation_group=a.rotation_group;

SELECT count(*) AS log_count, min(executed_at) AS first_event,
       max(executed_at) AS latest_event,
       count(*) FILTER (WHERE cycle_length<=0 OR previous_offset<0 OR new_offset<0)
         AS invalid_log_bounds
FROM public.xa_rotation_assignment_log;

SELECT count(*) AS assignment_days_with_multiple_logs
FROM (
  SELECT rotation_assignment,
         (executed_at AT TIME ZONE 'Africa/Douala')::date AS local_day
  FROM public.xa_rotation_assignment_log
  GROUP BY rotation_assignment,(executed_at AT TIME ZONE 'Africa/Douala')::date
  HAVING count(*)>1
) AS repeated_days;
```

Ces compteurs signalent des situations à expliquer, pas des corrections à appliquer ni la preuve automatique d’une corruption : un changement historique de slots ou une action manuelle peut influer sur leur interprétation. Les SELECT sont des photographies de lecture ; des lectures séparées sous activité ne sont pas un snapshot distribué de tous les tenants.

Pour un résultat SQL incertain identifié, projection limitée au seul identifiant technique approuvé :

```sql
SELECT id, "offset", last_advanced_date, updated_at
FROM public.xa_rotation_assignments WHERE id=:assignment_id;
SELECT rotation_assignment, previous_offset, new_offset, cycle_length, executed_at
FROM public.xa_rotation_assignment_log
WHERE rotation_assignment=:assignment_id ORDER BY executed_at DESC,id DESC LIMIT 20;
```

Pas de related, assigned_by, nom de groupe ou données utilisateur retournés. Pour l’activité transactionnelle, ne collecter que PID/rôle technique/état/début de transaction et attente sur les tables ciblées ; pas le texte brut de pg_stat_activity.query qui peut contenir des valeurs personnelles ou secrets.

## 5. Compatibilité du cache et séparation de la release

À obtenir sans ouvrir les secrets : chemin canonique, propriétaire/groupe/mode, possibilité de lecture par le futur compte, absence de partage en écriture avec les artefacts API, type de stockage et processus qui le maintiennent. L’opérateur doit fournir les seules caractéristiques non secrètes du JSON : mapping par sous-domaine, cohérence de subdomain, type boolean active, hôte/base/rôle techniques approuvés, port entier, présence d’un champ password string, références et nombre de tenants actifs. Valeurs de mots de passe et autres secrets exclues ; au besoin exemple intégralement fictif.

Une attestation/projection expurgée n’est pas une validation de connexion. L’autorisation d’inventaire SQL via un compte lecteur ne vaut pas autorisation de lancer le worker avec ses credentials pour « tester » une base cliente.

**Point opérationnel à prendre en compte :** le service de cache existant peut tenter de sauvegarder un cache vide après une erreur de chargement/rechargement. Ne pas démarrer rc5 avec le fichier actif de l’API. Préparer un cache dédié, valide, sauvegardé et protégé contre les mises à jour concurrentes ; une configuration montée en lecture seule peut empêcher son écrasement de secours, mais les erreurs de lecture doivent alors être traitées comme une indisponibilité, pas comme « zéro tenant à gérer ». Aucun correctif du service de cache n’est entrepris ici.

La racine de release, son dist et son node_modules doivent être physiquement distincts des racines HTTP. Vérifier les chemins canoniques et symlinks pertinents, le profil PM2 et le mécanisme qui remplace les releases. Aucun lien global de dépendance partagé, pas de remplacement de /opt/toke/packages/api/dist ni de node_modules actif. Seul un profil externe worker-only pourra imposer un interpréteur Node absolu si le défaut du daemon n’est pas celui validé ; le payload signé rc5 ne se retouche pas silencieusement.

## 6. Phase 2 — décision Linux et recette isolée préparée

### État actuel

Architecture/distribution/libc/Node du serveur inconnus. **Réassemblage nécessaire ou non : indéterminé.** Rc5 contient des prébuilds bcrypt 6.0.0 pour linux-x64, linux-arm64 et linux-arm, en variantes glibc/musl ; leur présence ne prouve ni le chargement ni l’exécution sur la cible. Le manifeste garde légitimement son identité de construction Darwin x64.

### Décision après inventaire

| Résultat | Suite |
|---|---|
| Plateforme couverte et rc5 inchangé exécutable | Tester ces mêmes octets sur Linux isolé correspondant. En cas de succès, conserver le manifeste original et joindre la preuve Linux ; ne pas réétiqueter le manifeste comme une construction Linux. |
| Binaire natif incompatible ou assembly nécessaire | Créer un nouveau candidat Linux, nouvelles empreintes et recette complète, mêmes sources/lockfile/versions. Il ne s’appelle plus « rc5 inchangé ». |
| Architecture/libc non prise en charge, installation exacte impossible hors ligne, runtime non validé | NO-GO ; aucune mise à jour opportuniste de Node/bcrypt/Sequelize ou affaiblissement de garde pour contourner l’erreur. |

Recette à réaliser dans une VM/conteneur Linux **jetable et distinct de la production**, préparé avec Node de la cible validée, PostgreSQL, compilateur et dépendances vérifiées, sans réseau externe ni montage de secrets/caches/volumes clients. Pas d’exécution du banc sur un serveur hébergeant les bases clientes. Aucun téléchargement d’image/paquet ni construction Linux effectué pendant cette préparation.

1. Vérifier les SHA rc5 et les versions exactes ; ne pas faire npm install/ci dans le payload. Fournir les seuls moyens de test et leur configuration fictive hors artefact.
2. Smoke test natif bcrypt sur chaîne fictive, dans le bac Linux, puis vrai démarrage du lanceur avec cache fictif et contrôle d’absence de service HTTP/connexion externe. Exemple de smoke test, dans le cwd du seul artefact isolé, avec Node cible explicitement fourni :

```sh
env -i "$linux_node_executable" --input-type=module -e   "import bcrypt from 'bcrypt'; const h=await bcrypt.hash('C_WORKER_LINUX_FIXTURE_ONLY',4); if(!await bcrypt.compare('C_WORKER_LINUX_FIXTURE_ONLY',h)) throw Error('NATIVE_SMOKE_FAILED'); console.log('NATIVE_SMOKE_OK');"
```

Aucune donnée réelle ni digest à collecter. Ce smoke test ne remplace pas le banc complet.
3. Exécuter le banc existant sur ce Linux :

```sh
node packages/api/release/c-worker/verify.cjs \
  /chemin/isole/c-worker-rc5 \
  --create-disposable-cluster
```

Il crée exclusivement ses bases A/B et son socket PostgreSQL privé ; vérifier que les noms/ports/racines sont ceux du banc. Les écritures et DDL de fixtures sont autorisés uniquement dans ces bases jetables, jamais sur une base cliente.

4. Si un réassemblage est justifié et approuvé : reconstruire hors ligne avec le constructeur existant vers un répertoire nouveau, versions épinglées, sources métier/V01 identiques, puis répéter toute la recette :

```sh
node packages/api/release/c-worker/build.cjs /chemin/isole/nouveau-c-worker-linux
node packages/api/release/c-worker/verify.cjs \
  /chemin/isole/nouveau-c-worker-linux \
  --create-disposable-cluster
```

Le constructeur actuel part de dépendances locales déjà disponibles et vérifiées contre le lockfile ; ce n’est pas une restauration depuis le registre npm. Toute préparation de packages/headers natifs doit être isolée, autorisée et tracée. Refuser un delta inattendu des sources, du lockfile ou des versions. Consigner les différences de fichiers natifs, Node/ABI/libc, le manifeste, les traces et le nettoyage des processus.

Le GO Linux exige les mêmes résultats que le GO local : groupes, cycle_length, atomicité, idempotence et deux processus réellement concurrents, garde SQL, commit incertain, existing sans DDL, absence Redis/HTTP et arrêt au repos/en charge. Un import statique ou un simple node --version n’en tient pas lieu.

## 7. Sauvegardes nécessaires avant une éventuelle bascule

Aucune sauvegarde exécutée dans la phase 1. Préparer, sous la seconde autorisation :

- Ancien artefact exact et sa provenance, définition PM2 ciblée et chemins effectifs ; captures expurgées, pas de dumps d’environnement sensibles dans le rapport.
- Configuration/cache dédié et configuration actuelle nécessaires au repli, gérés par l’opérateur en stockage chiffré et à accès restreint, sans lecture/affichage de leurs secrets par l’agent.
- Sauvegarde cohérente/restaurable des bases concernées suivant le mécanisme d’exploitation approuvé, avec schéma/droits et dépendances des données de rotation ; restauration vérifiée sur clone. Ne pas limiter aveuglément une restauration à quatre tables sans leurs relations.
- État de référence, en lecture seule, des rotations/journaux immédiatement avant intervention. Une sauvegarde ne justifie pas de restaurer une base entière après de nouveaux pointages concurrents.

Un export de base peut utiliser des commandes autres que SELECT et écrire des fichiers : il ne fait **pas** partie de l’autorisation d’inventaire strictement en lecture seule.

## 8. Phase 3 — commandes de bascule proposées, aucune exécutée

Préconditions : inventaire approuvé, compatibilité Linux prouvée, manifeste retenu identifié (rc5 ou nouveau Linux), sauvegardes prêtes, fenêtre hors échéance et retour arrière validés. Une seconde autorisation explicite doit couvrir l’installation, la configuration dédiée, l’arrêt de l’ancien et le démarrage du nouveau worker, donc ses futures écritures métier normales.

Variables ci-dessous : chemins absolus/identifiants fournis après inventaire. Ne pas les remplir par hypothèse. Vérifier que la destination n’est ni une racine active ni un alias/symlink de celle-ci.

```sh
# Phase 3 uniquement, après seconde autorisation.
# La racine parente est déjà approuvée ; mkdir échoue si la release existe.
mkdir -m 0755 -- "$worker_release_dir"
rsync -a -- "$worker_verified_payload/" "$worker_release_dir/"
sha256sum -- "$worker_release_dir/MANIFEST.json"
```

Vérifier ensuite **tous** les SHA manifestés, l’absence de fichiers ajoutés/symlinks/.env, l’identité de l’interpréteur et les droits. Le SHA d’un manifeste seul ne vérifie pas son payload. Aucun build/npm/migration sur les répertoires actifs.

L’opérateur prépare le cache externe dédié hors release, sans transporter de secrets dans ces commandes. Le profil retenu doit contenir exclusivement `toke-rotation`, une instance fork, run.mjs, cwd de la nouvelle release, kill_timeout 45 s, autorestart=false et la configuration externe. Si nécessaire, un profil opérationnel externe approuvé fixe `interpreter` à l’exécutable Linux validé ; ne pas supposer que le node du shell est celui utilisé par PM2.

### Arrêt de l’ancien

1. Reconfirmer utilisateur/daemon, PM2 id, PID, script et cwd pour éviter un identifiant périmé. Confirmer absence d’autres ordonnanceurs.
2. Vérifier fenêtre, absence d’exécution métier et transactions/attentes ciblées en cours. Une observation ponctuelle idle ne prouve pas qu’une boucle est finie.
3. Déterminer depuis la version réellement identifiée si l’ancien supporte un drainage. **Ne pas attendre C_WORKER_DRAINED d’un ancien worker inconnu.** Sans protocole d’arrêt démontré, ne pas l’arrêter pendant une exécution ; si l’absence d’activité ne peut être établie, NO-GO.
4. Arrêter seulement l’identifiant vérifié sous le compte/daemon identifié :

```sh
pm2 stop "$worker_old_pm_id"
```

5. Vérifier fin effective de tous les anciens PID et absence de transaction de rotation. Une extinction forcée/kill_timeout ou un COMMIT non confirmé exige réconciliation avant démarrage du nouveau. Ne pas modifier le kill_timeout ou la configuration de l’ancien pendant l’inventaire.

### Démarrage exclusif du nouveau

Le nom peut déjà exister à l’état stopped dans PM2. Faire approuver la procédure de remplacement de **cette seule entrée**, avec ancienne définition conservée ; ne pas laisser PM2 réutiliser silencieusement l’ancien chemin.

```sh
# worker_pm2_profile : profil dédié validé, éventuellement celui livré avec rc5.
C_WORKER_TENANT_CACHE_FILE="$worker_cache_path" \
  pm2 start "$worker_pm2_profile" --only toke-rotation --env production
```

Ce modèle de commande reste à confirmer contre l’état PM2 inventorié. Le lancement doit utiliser un environnement borné, sans NODE_OPTIONS/NODE_PATH ou préchargement non approuvé ; ne pas exporter l’environnement complet pour le vérifier. Vérifier immédiatement le nouveau PID, l’unique instance, script run.mjs, cwd/racine de release, interpréteur exact et marqueur READY. Si le script/cwd ne correspond pas, interrompre la bascule ciblée suivant la procédure autorisée ; pas de --force ou suppression globale improvisée. Aucun start/restart/reload all, autre service ou solveur.

READY confirme la planification, **pas** la compatibilité de tous les schémas avant le premier passage. Ne pas déclencher manuellement une rotation sur base cliente pour valider le déploiement.

## 9. Contrôles de la première échéance

Comparer la référence avant/après avec des SELECT agrégés et, uniquement si nécessaire, les identifiants techniques des assignments concernés. Pas de données personnelles ni contenu de cache dans les observations.

- Une seule tâche attendue à minuit Africa/Douala ; confirmer horloge et timezone effectivement validées.
- Lire les compteurs processed/skipped/**failed** et diagnostics ciblés expurgés. Le résumé historique Automate peut être ok avec des échecs par assignment : le code de sortie ou ce résumé seul ne suffit pas.
- Vérifier cohérence offset/date/journal et cardinalité des slots utilisés, sans confondre cycle_length informatif du groupe et cardinalité enregistrée dans le log.
- Vérifier absence de double avance et expliquer les écarts avec les périodes éligibles ; un nombre de traitements inférieur au nombre d’assignments n’est pas automatiquement une anomalie.
- Aucune erreur de contexte/génération/transaction/configuration ou DDL ; aucun démarrage/écoute HTTP inattendu, aucune modification des services web existants.
- Les anciens ordonnanceurs restent arrêtés. Le nouveau fichier de cache reste dédié ; ne pas corriger sa configuration ou les offsets à chaud pour masquer une erreur.

Écart inexpliqué, résultat SQL incertain ou configuration/schema incompatible : suspendre la planification suivant la procédure ciblée autorisée, collecter l’état en lecture seule et demander une décision. Le calendrier existant ne s’auto-suspend pas après tout échec métier : la surveillance doit agir avant l’échéance suivante.

## 10. Retour arrière sans correction improvisée

Avant première exécution, arrêt ciblé du nouveau possible selon procédure autorisée, avec anciens artefacts conservés. Après une exécution possible :

1. Arrêter les nouveaux déclenchements et laisser drainer les transactions admises ; ne pas lancer simultanément ancien et nouveau.
2. Une erreur après COMMIT ne signifie pas rollback. Inspecter offset/date/journal en lecture seule, conserver preuves et diagnostic. Aucun replay automatique, reset last_advanced_date, décrémentation d’offset, DELETE de log ou restauration aveugle.
3. Si arrêt forcé, timeout de drainage ou perte de confirmation : réconciliation avant toute reprise.
4. Ne redémarrer l’ancien que si sa version est identifiée et ses garanties de sécurité/intégrité sont acceptables. Un worker avec les défauts IDS/cycle_length/atomicité connus n’est **pas** un repli sûr par défaut.
5. Si aucun artefact antérieur sûr n’est disponible, conserver le scheduler arrêté et faire valider la continuité métier. Ne pas reprendre un code dangereux pour obtenir un processus online.

Aucune migration n’est introduite par ce lot : pas de down/DROP à effectuer. Conserver les données et sauvegardes ; le rollback du worker ne doit pas remplacer le dist, node_modules ou les configurations des API HTTP/BFF/Cloud.

## 11. Tableau de décision et arrêt

| Condition de GO opérationnel | État actuel |
|---|---|
| Autorisation explicite d’inventaire et cibles/comptes bornés | **En attente** |
| Version réellement exécutée et différences avec rc5 établies | **Inconnues** |
| Unicité des ordonnanceurs et séparation artefacts démontrées | **Non démontrées** |
| Architecture/libc/Node et recette Linux correspondante réussie | **Non démontrées** |
| Schémas/droits/cache compatibles, sans lecture de secrets | **Non inspectés** |
| Sauvegardes restaurables et ancien artefact/repli sûr identifiés | **Non établis** |
| Fenêtre, arrêt ancien, profil Node/PM2 et surveillance approuvés | **En attente** |
| Seconde autorisation explicite d’intervention | **Non donnée** |

**NO-GO opérationnel maintenu sans remettre en cause le GO local rc5.** Aucun blocage serveur spécifique ne peut être affirmé sans inventaire ; ce sont les preuves et autorisations nécessaires qui manquent. L’autorisation d’inventaire devra être obtenue avant toute connexion de production. Elle ne vaudra pas autorisation de déployer.

Seul ce rapport a été créé pendant cette préparation. Aucun changement applicatif, réassemblage Linux, accès serveur, requête de production ou intervention PM2. Arrêt après le rapport.
