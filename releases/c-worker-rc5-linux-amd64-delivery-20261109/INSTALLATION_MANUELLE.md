# C-WORKER rc5 — livraison manuelle, Linux amd64

Paquet du worker uniquement. Les octets de `worker/` et son MANIFEST sont ceux du rc5 validé sur macOS puis **Ubuntu 24.04.5 amd64, glibc 2.39, Node 20.18.0, PostgreSQL 16.15**. Ce sont des versions provisoires de recette, pas une observation de votre serveur. Pas de validation ARM/musl, autre Node ou autre PostgreSQL revendiquée.

**Aucune installation n’est autorisée par la seule réception du paquet.** Vérifier manuellement le serveur, les sauvegardes et le périmètre, puis décider explicitement de l’installation. Ne jamais exécuter le worker pour « tester » une base cliente. Les commandes ci-dessous sont documentées ; elles n’ont pas été exécutées sur un serveur Toké.

## Contenu et intégrité

- `worker/` : artefact autonome ; `worker/MANIFEST.json` est inchangé, SHA-256 `139115cf53b1cdd42f9c0d65db3a05b7badf48b8dc8d3a1dae2b60ce129db536`.
- `worker/ecosystem.config.cjs` : profil dédié **toke-rotation uniquement**, une instance fork, autorestart=false, kill_timeout=45 s.
- `proof/` : environnement Linux réellement exécuté et trace de recette sur bases jetables, sans credentials.
- `tools/verify-package.cjs` : vérification hors ligne de tous les fichiers ; ne démarre aucun service.
- `tools/pm2-readonly.cjs` : projection bornée du daemon PM2 déjà actif ; ne lance aucun daemon et n’envoie que getVersion/getMonitorData.
- `tools/rotation-schema-readonly.sql` : SELECT de métadonnées, sans données personnelles, migration ou correction.
- `DELIVERY_MANIFEST.json` et `SHA256SUMS` : identité et empreintes de livraison.

Vérifier d’abord le SHA-256 de l’archive avec celui communiqué séparément dans le rapport Linux, puis extraire dans un emplacement **nouveau**, hors artefacts actifs. Aucun fichier caché de configuration ou cache n’est livré.

```sh
sha256sum -c c-worker-rc5-linux-amd64-delivery-20261109.tar.gz.sha256
# Après extraction dans un emplacement de contrôle approuvé :
cd /chemin/du/paquet
sha256sum -c SHA256SUMS
env -i PATH=/usr/bin:/bin /chemin/absolu/node tools/verify-package.cjs "$PWD"
```

Le SHA du manifeste seul ne vérifie pas les autres fichiers. Ne pas exécuter npm install/ci, build monorepo, migration ou modification de fichier sous `worker/` ; les dépendances exactes sont déjà présentes et privées. La présence de prébuilds d’autres plateformes ne les certifie pas.

## Vérifications minimales du serveur — lecture seule

Exécuter seulement sous le compte/périmètre autorisé. **Ne pas envoyer** de .env, cache JSON, historique shell, mot de passe, URI de connexion complète, `pm2 env`, `pm2 jlist/prettylist`, `/proc/*/environ` ou cmdline. Les valeurs de chemins ci-dessous sont à fournir par l’opérateur, sans secrets.

### 1. Node, architecture et libc

```sh
worker_node_executable="$(command -v node)"
env -i PATH=/usr/bin:/bin "$worker_node_executable" -p \
  'JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,modules:process.versions.modules,napi:process.versions.napi})'
uname -m
getconf GNU_LIBC_VERSION
```

Un échec getconf ne prouve pas glibc. Ce Node est celui du shell ; après identification du PID worker, comparer avec son exécutable réel :

```sh
readlink -f "/proc/$worker_pid/exe"
readlink -f "/proc/$worker_pid/cwd"
ps -p "$worker_pid" -o pid=,ppid=,user=,comm=
env -i "/proc/$worker_pid/exe" -p \
  'JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,modules:process.versions.modules,napi:process.versions.napi})'
```

Ne pas démarrer/mettre à jour Node pour obtenir les valeurs attendues. Différence avec la cible de recette => revue avant installation, pas compatibilité automatique.

### 2. PM2, script/cwd et nombre de workers

```sh
readlink -f "$(command -v pm2)"
# Fournir les deux chemins non secrets identifiés pour le compte/daemon concerné :
env -i PATH=/usr/bin:/bin "$worker_node_executable" \
  tools/pm2-readonly.cjs "$worker_pm2_package_json" "$worker_existing_rpc_socket"
```

Exemples de nature de chemins : package.json du PM2 installé et socket rpc.sock du daemon existant. Le helper ne lit ni dump PM2 ni configuration sensible ; la réponse RPC reste en mémoire et seuls les champs techniques autorisés sont imprimés. Il refuse de démarrer un daemon ou de produire un dump en secours. Si l’API interne du PM2 installé n’est pas compatible, fournir manuellement ces seuls champs au lieu de changer PM2 : versions CLI/daemon, PM2 id/namespace, PID, script, cwd, interpréteur/Node, statut/mode/instances et paramètres d’arrêt.

Le compteur ne couvre que ce daemon. Confirmer aussi l’absence d’autre daemon/utilisateur, cron, timer, conteneur ou autre hôte exécutant les rotations. Ne pas afficher de crontabs ou commandes contenant des secrets. Pas d’unicité distribuée déduite d’une seule ligne PM2.

### 3. Schémas et droits PostgreSQL nécessaires

Utiliser un canal de lecture déjà approuvé ; ne jamais placer de mot de passe/URI secrète dans la commande. Fournir le rôle **technique du worker**, qui peut différer du compte d’inventaire :

```sh
PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=1000' \
  psql -X --set=ON_ERROR_STOP=1 \
  --dbname='service=<service_lecture_fourni_par_operateur>' \
  --set=worker_role='<role_SQL_technique_worker>' \
  --file=tools/rotation-schema-readonly.sql
```

Répéter par base autorisée, sans connexion test de mutation. Les résultats communicables sont uniquement version, métadonnées/écarts de colonnes, PK/FK/index, RLS/triggers et privilèges techniques. Aucun related, nom/email/PIN ou snapshot métier n’est exporté. Masquer au besoin les noms des bases/roles par des alias cohérents.

Les quatre tables traitées sont rotation_groups, rotation_group_template, rotation_assignments et rotation_assignment_log du schéma public préfixées xa_. Missing/type/nullability/contraintes/privilèges inattendus ou trigger/RLS non expliqué => ne pas installer et faire examiner l’écart. Le contrôle n’applique pas de migration ni de grant. Les autres déclarations de modèles sont tolérées indisponibles par le chemin existing lorsque le worker n’en dépend pas ; MemoReads/B1 ne sont pas nécessaires et ne doivent pas être migrés pour ce lot.

## Configuration à préparer séparément

| Élément | Attendu, sans valeur réelle fournie |
|---|---|
| `C_WORKER_TENANT_CACHE_FILE` | Obligatoire ; chemin absolu vers un JSON externe **dédié au worker**, pas le cache API actif. |
| Structure JSON | Mapping par sous-domaine ; subdomain cohérent, active boolean ; host/database/username strings, port entier, password string ; conserver les autres références techniques attendues. Fourniture par l’opérateur via canal protégé. |
| Permissions | Compte worker en lecture du cache, accès DB requis ; configuration protégée et sauvegardée, sans écrivain concurrent. Aucune lecture/affichage de ses secrets dans les retours. |
| `NODE_ENV`, `TZ` | Fixés par le lanceur à production et Africa/Douala. |
| Node/PM2 | Interpréteur Linux validé ; contrôler celui de PM2. Si besoin, profil opérationnel worker-only externe approuvé avec chemin Node absolu, sans retoucher le payload manifesté. |
| Variables non nécessaires | Aucun USER_SESSION_*, Redis, secret API Master, .env global, SMTP/webhook ou service de provisioning requis. |

Ne pas déposer de .env dans la release. Le service de cache existant peut tenter de sauvegarder un cache vide après erreur de lecture/rechargement : privilégier une configuration dédiée protégée contre l’écriture et traiter toute erreur de cache comme anomalie, pas comme zéro tenant normal. Pas d’édition des credentials à chaud pour contourner TENANT_CONFIG_CHANGED : drainage/reprise contrôlés.

## Installation et bascule du seul worker — après décision explicite

1. Identifier précisément ancienne release/PID/PM2 id, interpréteur, calendrier et autres ordonnanceurs. Aucun redémarrage web n’est requis ; si les chemins ne sont pas séparables, ne pas installer.
2. Conserver les anciens artefacts et la seule définition worker, préparer sauvegardes cohérentes/restaurables des bases concernées et configuration secrète sous contrôle de l’opérateur. Noter l’état de rotation/journal en lecture seule. Ne pas exporter de données personnelles pour l’inventaire.
3. Copier le paquet validé dans un nouveau répertoire versionné, jamais par-dessus dist/node_modules/cache de Master/Tenant/BFF/Cloud. Revérifier l’intégrité au nouvel emplacement ; ne modifier aucun fichier sous worker/.
4. Choisir une fenêtre hors échéance. Établir la fin de l’exécution précédente et de ses transactions. Ne pas supposer que l’ancien worker possède le drainage de rc5. En cas d’activité ou issue incertaine, suspendre la bascule et réconcilier en lecture seule.
5. Arrêter seulement l’identifiant PM2 revérifié, puis confirmer disparition des anciens PID et absence d’un autre ordonnanceur. L’arrêt peut nécessiter une procédure adaptée au code ancien ; pas de kill forcé automatique.

```sh
# Uniquement au moment de la bascule approuvée :
pm2 stop "$worker_old_pm_id"
```

6. Si l’ancienne entrée stopped empêche de créer le nouveau profil, conserver sa définition de repli puis supprimer **uniquement cette entrée inactive et identifiée**, sans supprimer ses fichiers. Cette étape doit être incluse dans la décision opérateur ; aucun delete all.

```sh
pm2 delete "$worker_old_pm_id"
C_WORKER_TENANT_CACHE_FILE="$worker_cache_path" \
  pm2 start "$worker_pm2_profile" --only toke-rotation --env production
```

`worker_pm2_profile` désigne le profil dédié livré sous worker/, ou son équivalent externe approuvé imposant Node. Valider immédiatement nouveau PID, script run.mjs, cwd de release, Node exact, une instance fork et READY. Vérifier qu’aucun autre ancien worker n’a redémarré. Pas de start/reload/restart all, déploiement API ou solveur.

READY confirme le planificateur, pas la compatibilité SQL de tous les tenants. Ne pas déclencher manuellement une rotation sur base cliente. Le worker traite séquentiellement tous les tenants actifs du cache ; aucun canary par tenant n’a été ajouté.

## Première échéance et résultats incertains

Surveiller minuit Africa/Douala, processed/skipped/**failed**, erreurs ciblées et cohérence offset/date/journal/cycle_length selon les assignments éligibles. Le résumé Automate peut rester ok malgré failed>0 : surveiller les résultats par assignment, pas seulement le processus online. Ne pas collecter les logs généraux ou données utilisateur.

Une erreur après COMMIT peut correspondre à une écriture durable. Pas de rejeu de rattrapage, reset de last_advanced_date, décrémentation d’offset ou suppression de journal. Suspendre les futurs déclenchements si nécessaire, inspecter en lecture seule et demander une décision. Le calendrier quotidien existant ne s’auto-suspend pas après tout échec métier.

## Arrêt et retour arrière

Pour rc5, l’arrêt ciblé doit laisser finir la tâche active ; le lanceur attend jusqu’à 30 s et le profil prévoit 45 s avant kill_timeout. Une sortie forcée ou un dépassement impose une revue du résultat SQL, pas l’hypothèse d’un rollback. Autorestart=false évite une reprise de processus non décidée.

Conserver anciens et nouveaux artefacts. Arrêter le nouveau sans lancer simultanément l’ancien. Après une exécution possible, rapprocher offset/date/journal avant reprise. L’ancien worker comportant les défauts IDS/cycle_length/atomicité n’est **pas** un rollback sûr par défaut : sans version de repli démontrée sûre, garder le planificateur arrêté et faire valider la continuité métier. Aucun down de migration, restauration aveugle de base recevant des pointages ou correction improvisée des données.

**Le GO de compatibilité Linux du paquet ne vaut pas GO pour votre serveur.** Vos vérifications et une décision explicite restent nécessaires ; aucune installation ou connexion de production n’a été effectuée pendant la préparation.
