# C-WORKER rc5 — recette Linux et paquet de livraison

**Verdict : GO pour la compatibilité Linux dans l’environnement testé. Installation serveur en attente des contrôles manuels et de la décision de l’opérateur.** Aucun accès production, SSH, changement PM2, migration cliente ou déploiement n’a été effectué.

Références conservées : `C_WORKER_RELEASE_CANDIDATE.md`, `C_WORKER_PRODUCTION_GO_NO_GO.md`. Cette recette ne remplace pas l’inventaire réel du serveur et ne modifie pas son verdict opérationnel en attente.

## Environnement réellement exécuté

Recette du 9 novembre 2026 dans un conteneur Linux jetable Docker Desktop local, contexte explicite `desktop-linux`, architecture **amd64**. Ubuntu **24.04.5 LTS**, glibc **2.39**, Node **20.18.0** (ABI 115, N-API 9), PostgreSQL **16.15** (Ubuntu 16.15-0ubuntu0.24.04.1), extension PostGIS disponible pour les modèles fictifs. Le noyau **6.10.14-linuxkit** est celui de la VM Linux Docker Desktop ; ce n’est pas un noyau Ubuntu ni une observation du serveur Toké.

Image de banc : `toke-cworker-linux-fixture:20261109-node20.18.0`, identité `sha256:6645b9fbe6de927eabc2199822e780dab092d86ded107c252f000d29e7cd39f2`.

Bases utilisées lors de la construction :

- Ubuntu 24.04 : `sha256:fe81560990fae86dc4743202b2cb4d3df98d0bcf949173cecef15ce1127ef852`.
- Node 20.18.0 bookworm-slim : `sha256:28fbbb764069c698ead61d6a739a7615e8f0e07a4b8fe1473ceca70c1c3d6aaa`.

Le Dockerfile versionné conserve les tags de construction ; les digests ci-dessus identifient les images effectivement utilisées. Les paquets apt sont ceux de l’image identifiée : une reconstruction future depuis des dépôts mouvants exige une nouvelle vérification de l’environnement et une nouvelle recette.

Le processus s’exécute sous UID 10001, sans capacités, avec `no-new-privileges`, racine en lecture seule, `--network=none` (interface loopback seule), montages candidat et banc en lecture seule, mémoire 2 Go, 2 CPU et limite de 256 processus. Le cluster PostgreSQL privé et les deux bases A/B sont créés dans le tmpfs jetable avec propriétaires/runtime fictifs, cache tenants et secrets générés pour le test. Aucun fichier .env réel ni montage de configuration hôte.

La première tentative avait un tmpfs `/tmp` non exécutable : le chargement natif de la copie relocalisée échouait avec « failed to map segment from shared object ». Le tmpfs privé a été remonté avec `exec,nosuid,nodev` pour permettre dlopen ; ni rc5 ni le banc existant n’ont été modifiés pour contourner ce résultat. La recette complète suivante a réussi, code de sortie **0**.

## Identité de l’artefact

**Rc5 fonctionne sans réassemblage.** Son manifeste indique toujours son origine de construction macOS ; cette provenance a été conservée, sans la réécrire en Linux. Les dépendances comprennent déjà le prébuild Linux compatible.

- Original : `/Volumes/Workspace/toke/releases/c-worker-local-20261109-rc5`.
- `MANIFEST.json` original et livré : SHA-256 `139115cf53b1cdd42f9c0d65db3a05b7badf48b8dc8d3a1dae2b60ce129db536`.
- **5 233 fichiers payload** vérifiés, plus le manifeste original : même contenu dans `worker/` livré. Versions de dépendances, modules Shared, sources métier et gardes V01 inchangés.
- Bcrypt **6.0.0**, chargement réel de `node_modules/bcrypt/prebuilds/linux-x64/bcrypt.glibc.node`, SHA-256 `d640649833b5f0504096b747ae1a66e0780291edc5c33b541696b2cf2aabb5e3`. Hash, comparaison positive et comparaison négative exécutés sous Linux.

## Recette exécutée et preuves

Le banc **existant** `packages/api/release/c-worker/verify.cjs` a été exécuté intégralement contre `/candidate`, puis sa copie installée en dehors du workspace dans le conteneur. Il démarre réellement le point d’entrée `run.mjs` dans des processus OS et déclenche la tâche du vrai cron. Ce n’est ni un simple import statique ni une attente de minuit : le déclenchement du scheduler est piloté par le banc.

| Contrôle | Résultat réel |
|---|---|
| Empreintes complètes et bcrypt natif | PASS, avant exécution et vérification finale du candidat original |
| ESM, point d’entrée compilé et dépendances privées | PASS après relocalisation, aucun emprunt au node_modules du workspace |
| Vrai cron, sélection des groupes et cycle_length | PASS sur A/B, longueur effective 3 et non valeur informative 99 |
| Aucune écoute HTTP/provisioning/connexion externe | PASS, instrumentation du banc et réseau Docker coupé |
| Existing sans DDL/migration automatique | PASS, traces et garde PostgreSQL anti-DDL ; table MemoReads absente |
| Redis du lot 3 | PASS, aucun package Redis nécessaire, aucun service Redis lancé |
| Atomicité offset/date/journal | PASS : échecs INSERT journal et UPDATE affectation, rollback vérifié ; autre tenant indépendant |
| Idempotence et concurrence | PASS : deux processus réels, attente FOR UPDATE observée, une seule avancée/un seul journal A/B |
| SQL hors contexte tenant | PASS : SQL natif/raw sans contexte, contexte étranger et transaction étrangère refusés avant driver |
| COMMIT confirmé perdu | PASS : COMMIT SQL réel puis erreur d’acquittement injectée ; état durable, failed=1/processed=0, pas de rejeu |
| Arrêt pendant une tâche active | PASS : SIGTERM attend transaction et les deux tenants, puis drainage des pools |
| Arrêt inactif et nettoyage | PASS : sortie du vrai lanceur ; cluster A/B arrêté/supprimé et tous enfants terminés |

Le test COMMIT simule explicitement la perte de confirmation après un commit durable ; il ne prétend pas reproduire toutes les pannes réseau ou serveur PostgreSQL possibles. Aucun essai d’écriture sur base cliente. Les fixtures seules sont créées/modifiées/supprimées.

Preuves livrées : `proof/LINUX_ENVIRONMENT.json`, `proof/LINUX_IMAGE.json`, `proof/LINUX_RECIPE.log`. Les deux conteneurs de recette identifiés ont été vérifiés absents après leur sortie (`--rm`). L’image locale de banc demeure en cache ; aucun service de test ne reste en fonctionnement. Aucune installation globale sur l’hôte.

### Reproduction locale isolée

Depuis la racine du dépôt, sur un Docker local approuvé, sans secrets/configurations réels :

```sh
docker --context desktop-linux build --platform linux/amd64 \
  --label toke.purpose=c-worker-disposable-linux-fixture \
  -t toke-cworker-linux-fixture:20261109-node20.18.0 \
  -f packages/api/release/c-worker/linux/Dockerfile packages/api/release/c-worker/linux

docker --context desktop-linux run --rm --init \
  --platform linux/amd64 --pull=never --network=none --read-only \
  --tmpfs /tmp:rw,exec,nosuid,nodev,mode=1777,size=1073741824 \
  --tmpfs /run:rw,nosuid,mode=0755,size=16777216 \
  --shm-size=256m --memory=2g --cpus=2 --pids-limit=256 \
  --cap-drop=ALL --security-opt=no-new-privileges \
  --mount "type=bind,source=$PWD/releases/c-worker-local-20261109-rc5,target=/candidate,readonly" \
  --mount "type=bind,source=$PWD/packages/api/release/c-worker,target=/harness,readonly" \
  --entrypoint /bin/sh toke-cworker-linux-fixture:20261109-node20.18.0 -ec \
  'node /harness/linux/check-environment.mjs; node /harness/verify.cjs /candidate --create-disposable-cluster'
```

La construction peut télécharger des paquets publics dans l’image isolée ; l’exécution de recette est sans réseau externe. Les commandes de reproduction ci-dessus ne sont pas des commandes d’installation serveur.

## Livraison préparée

Répertoire : `/Volumes/Workspace/toke/releases/c-worker-rc5-linux-amd64-delivery-20261109`.

Archive : `/Volumes/Workspace/toke/releases/c-worker-rc5-linux-amd64-delivery-20261109.tar.gz` (**8 402 978 octets**).

- Archive SHA-256 : `f637431e8f07c8404f79d46723c439e81a9714e90a9a319e933be00d2593d686` ; sidecar `.tar.gz.sha256`.
- `DELIVERY_MANIFEST.json` SHA-256 : `457a7cdc2242733dd384fdf3900a80a7b3f8f47c2bcbd349356c85bc8d76bd94`.
- **5 243 fichiers** : worker exact, manifeste original, profil PM2 dédié, procédure, trois outils de contrôle, trois preuves, manifeste de livraison et SHA256SUMS. Liste exacte et empreintes individuelles dans le manifeste ; SHA256SUMS inclut aussi le manifeste de livraison.

Archive déterministe sans liens symboliques, chemins absolus, xattrs ou identités hôte. Extraction locale dans un nouveau répertoire temporaire, vérification de tous les SHA256SUMS et de `tools/verify-package.cjs` : **PASS**. Cette vérification hors ligne n’importe ni ne démarre le worker. Aucun .env, cache tenant, credential, donnée cliente ou banc PostgreSQL inclus. Les secrets de test générés ne sont pas livrés.

`INSTALLATION_MANUELLE.md` couvre la configuration externe nécessaire, la conservation des anciens artefacts, l’arrêt de l’ancien worker, l’unicité du planificateur, la bascule ciblée du seul toke-rotation, la surveillance de la première échéance et le retour arrière. Aucun npm install, rebuild, remplacement des dist/node_modules actifs ou migration B1/MemoReads nécessaire. Le profil livré est `worker/ecosystem.config.cjs` : une instance fork, autorestart=false, kill_timeout 45 s ; drainage du lanceur jusqu’à 30 s.

L’ancien worker présentant les défauts connus n’est pas un repli automatiquement sûr. En cas de doute après exécution/COMMIT, arrêter le planificateur, rapprocher offset/date/journal en lecture seule et faire décider la reprise. Aucun reset d’offset/date, suppression de journal, rejeu manuel ou restauration aveugle de base.

## Vérifications manuelles minimales du serveur — à exécuter par l’opérateur

**Ces commandes sont documentées, pas exécutées sur un serveur Toké.** Exécuter depuis le paquet extrait après vérification d’intégrité. Les variables de chemins, PID et rôle technique sont à renseigner par l’opérateur. Ne communiquer ni credentials, .env/cache, environnement PM2 complet, cmdline ou données personnelles.

```sh
worker_node_executable="$(command -v node)"
env -i PATH=/usr/bin:/bin "$worker_node_executable" -p \
  'JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,modules:process.versions.modules,napi:process.versions.napi})'
uname -m
getconf GNU_LIBC_VERSION
readlink -f "$(command -v pm2)"
# Chemins du PM2 installé et de son socket existant, sous le compte autorisé :
env -i PATH=/usr/bin:/bin "$worker_node_executable" \
  tools/pm2-readonly.cjs "$worker_pm2_package_json" "$worker_existing_rpc_socket"
# PID obtenu par la projection PM2 :
readlink -f "/proc/$worker_pid/exe"
readlink -f "/proc/$worker_pid/cwd"
ps -p "$worker_pid" -o pid=,ppid=,user=,comm=
env -i "/proc/$worker_pid/exe" -p \
  'JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,modules:process.versions.modules,napi:process.versions.napi})'
PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=1000' \
  psql -X --set=ON_ERROR_STOP=1 \
  --dbname='service=<service_lecture_fourni_par_operateur>' \
  --set=worker_role='<role_SQL_technique_worker>' \
  --file=tools/rotation-schema-readonly.sql
```

Le helper PM2 ne démarre aucun daemon : uniquement RPC getVersion/getMonitorData via socket existant, affichage borné des versions, PID, script/cwd, interpréteur/mode/instances et paramètres d’arrêt. API interne incompatible => arrêt du helper, pas de fallback PM2 susceptible de créer un daemon. Il n’a pas été testé contre le PM2 de production. Le compteur est limité au daemon interrogé : vérifier séparément les autres comptes/daemons, cron, timers, conteneurs et hôtes sans en divulguer les configurations sensibles.

Le SQL livré ne contient que SELECT/WITH SELECT : versions, colonnes/types/nullabilité/enums, clés/index, RLS/triggers et droits table/colonne/séquence sur les quatre tables de rotation. Il ne lit pas de lignes métier, ne génère pas de valeur de séquence et n’applique pas de grant. Répéter sur les bases autorisées ; masquer noms de bases/rôles par alias si nécessaire. Cette checklist de métadonnées aide à identifier les écarts ; elle ne certifie pas à elle seule les effets d’un trigger/RLS ou d’une contrainte locale inconnue.

## Conditions restantes et périmètre préservé

Avant installation : confirmer Node réellement utilisé, amd64/glibc, PostgreSQL/schémas/droits et contraintes locales ; examiner toute différence de version ; confirmer séparation worker/API, cache externe dédié protégé et compatible, tous les ordonnanceurs, arrêt sûr de l’ancien et sauvegardes restaurables. Définir fenêtre, surveillance et procédure de reprise ; obtenir la décision explicite d’installation. ARM, musl et autres versions ne sont pas certifiés par cette recette.

Fichiers nouveaux de préparation : `packages/api/release/c-worker/linux/Dockerfile`, `linux/check-environment.mjs`, `linux/delivery-tools/{verify-package.cjs,pm2-readonly.cjs,rotation-schema-readonly.sql}`, le paquet versionné, son archive/sidecar et ce rapport. Aucun changement du banc verify.cjs, du payload rc5, des services HTTP, de V01, CLOCK_IN, B1/B2 ou du provisioning. Aucun chantier B3/B4 ouvert. Les modifications locales préexistantes sont conservées.
