# TOKÉ — Préparation d'activation production des lectures manager B2

Intervention commencée le 12 et terminée le **13 novembre 2026**, Africa/Douala (WAT). Rapport classé à la date réelle de finalisation. Les rapports antérieurs restent à leur emplacement.

Verdict : **VALIDÉ SOUS RÉSERVES pour la préparation technique**. Aucune activation production effectuée ni autorisée par ce verdict.

## Mécanisme implémenté

Le raccordement BFF/API et le service ACL B2 sont réutilisés sans réécriture des autorisations. Nouveau paramètre, lu indépendamment par chaque processus :

```text
NODE_ENV=production
MEMO_B2_PRODUCTION_MANAGER_READS=1
```

Seule la chaîne exacte `1` active le mécanisme dans cet environnement. Absence, vide, `0`, `true`, espaces ou environnement inconnu : fermeture. Ce paramètre n'est ajouté à aucun `.env` ni à la configuration PM2 pendant cette mission.

Les flags expérimentaux `MEMO_B2_LOCAL_READS` et `MEMO_B2_MANAGER_READS` ne permettent pas d'activer la production. Même s'ils y restent présents avec le nouveau flag, le sélecteur API production est strictement limité à :

- **GET `/memo/list`** ;
- **GET `/memo/:guid`**, GUID numérique positif ou UUID au format déjà admis par B2.

L'activation doit être cohérente sur le BFF et sur chaque processus API Tenant servant les requêtes. Si un seul côté est activé, la chaîne reste fermée avec `memo_permissions_pending`. Ce contrôle est indépendant dans chaque processus, sans nouveau protocole de synchronisation ou de délégation.

Le middleware BFF de fermeture est conservé après le relais ciblé. La frontière API ferme les autres routes ; aucun passage par les anciens handlers métier n'est ajouté. Mutations, marque de lecture, uploads, médias, sockets, tickets, événements et statistiques ne sont pas ouverts.

## Preuve, tenant et dépendances

Les contrôles restent identiques à ceux validés précédemment : session manager vérifiée au BFF puis indépendamment à l'API, séparation des credentials techniques et de la preuve humaine, refus du contexte intégrateur, concordance du tenant et ACL centrale B2. Aucun GUID client ne remplace une preuve.

Le BFF ne relaie pas un header interne falsifié du navigateur ; il reconstruit `x-toke-user-session` depuis le bearer vérifié. Le contrat de réponse liste/détail attendu par le Cloud est conservé par le relais existant.

B1 absent/incompatible, principal absent/invalide, service de sessions indisponible ou configuration manquante : refus ou indisponibilité, jamais fallback sur un ancien handler. Une erreur B1 produit le 503 générique `memo_read_unavailable`. Des logs opérateur seront nécessaires pour distinguer les causes SQL ; ne pas exposer leurs détails au navigateur.

## Fichiers modifiés ou créés

- `packages/backend/src/tools/memo-manager-reads.ts` : condition explicite production, sélecteur des deux GET conservé.
- `packages/api/src/middle/memo-b2-reads.ts` : condition production indépendante et sélecteur production toujours restreint, même avec anciens flags locaux.
- `packages/backend/verification/memo-manager-reads.test.cjs` : extension de 22 à 64 tests, matrice production et contrôles API indépendants.
- `audits/2026-11-13/TOKE_MEMOS_B2_PRODUCTION_READINESS.md` : présent rapport.
- `audits/2026-11-13/TOKE_MEMOS_B2_PRODUCTION_TESTS.log` : journal persistant de la validation finale.

Le raccordement déjà présent dans `routes/memos.route.ts` n'a pas nécessité de nouvelle modification. Aucun fichier frontend, de session, d'authentification utilisateur/intégrateur, `.env`, Nginx ou PM2 n'est modifié dans cette intervention. Les travaux Git existants sont conservés, sans reset ni staging.

## Tests réellement exécutés

Le 12 novembre, premier passage de l'extension : 64 réussites selon la sortie observée. À la reprise du 13 novembre, les journaux `/tmp` et les anciens processus n'étaient plus disponibles ; les vérifications ont donc été relancées sur l'état présent.

```sh
node packages/backend/verification/memo-manager-reads.test.cjs > audits/2026-11-13/TOKE_MEMOS_B2_PRODUCTION_TESTS.log 2>&1
```

Résultat final : **64 tests réussis, 0 échec**. Sont inclus les 22 tests précédents et 42 cas supplémentaires :

- succès des deux GET avec activation production explicite des deux côtés ;
- refus par défaut et pour sept variantes de valeur non exacte ;
- refus pour environnement absent/inconnu/mal orthographié ;
- activation BFF seule et API seule : refus ;
- vingt chemins/méthodes hors périmètre, vérifiés au BFF et directement au gateway API, avec les anciens flags locaux présents pour vérifier qu'ils n'élargissent pas la surface ;
- absence ou invalidité de session manager, contexte intégrateur, tenant différent au BFF ou à l'API ;
- absence B1, configuration du service de session indisponible et refus ACL : fermeture maintenue.

Tests en processus avec transports, vérificateurs et dépendances SQL simulés ; certains cas préexistants chargent le véritable service/repository avec connexion simulée. Aucune instance réellement déployée n'a été contactée. Les 35 groupes PostgreSQL du rapport du 12 novembre restent une validation antérieure de l'ACL et du raccordement local ; ils ne sont pas revendiqués comme une nouvelle exécution de ce flag production.

Commandes TypeScript relancées :

```sh
./node_modules/.bin/tsc --noEmit -p packages/backend/tsconfig.json > /tmp/toke-memo-production-bff-types.log 2>&1
./node_modules/.bin/tsc --noEmit -p packages/api/tsconfig.json > /tmp/toke-memo-production-api-types.log 2>&1
```

Les résultats finaux sont consignés à la fin de ce rapport.

`git diff --check` global a signalé deux défauts d'espacement préexistants dans `packages/cloud/.env.local` et `packages/cloud/src/env.d.ts` (ligne vide à EOF). Ces fichiers hors mission n'ont pas été corrigés. Les nouveaux fichiers applicatifs et de tests étant non suivis dans l'état Git hérité, un diff Git seul ne valide pas leur contenu ; les tests et TypeScript portent sur les sources présentes.

## Prérequis avant toute activation — contrôles opérateur, non exécutés ici

1. **Schéma de chaque tenant ciblé** : migration B1 revue, appliquée explicitement et compatible avec `public.toke_b1_version() = b1-v1` ; présence/colonnes/droits des cinq tables workflows, events, commands, raw observations et correction changes. Tables historiques users/memos/roles/hierarchy/groups compatibles avec les requêtes B2. Le rôle runtime doit pouvoir lire ce qui est nécessaire sans droits de migration.
2. **Pas de responsabilité inventée** : un workflow certifié existant peut accorder la lecture responsable/supérieur ; un historique sans certification conserve son état UNRESOLVED et ne donne pas ces droits. Les relations métier réelles doivent être vérifiées, jamais fabriquées pour faire apparaître des mémos.
3. **MemoReads** : les deux GET B2 ne dépendent pas de `tk_memo_reads`. Ne pas appliquer sa migration comme moyen de lever ce verrou. Son absence peut rester signalée par l'initialiseur ; les opérations d'acquittement restent fermées.
4. **Sessions et routage interne** : autorité Master/Redis disponible, paramètres `USER_SESSION_*` existants cohérents, session utilisateur manager active, référence tenant résolue vers la bonne API et credentials techniques reconnus. Aucun changement de configuration session n'est inclus dans cette préparation.
5. **Artefacts** : les versions compilées du BFF et de l'API contiennent les deux conditions d'activation et le relais vers B2. Vérifier les scripts/cwd réellement utilisés et toutes les instances actives. Un déploiement de code ne remplace pas une migration.
6. **Validation préalable représentative** : clone préparé et autorisé reproduisant les schémas/ACL réels ; essais liste/détail autorisés et non autorisés, inter-tenants et profils historiques. Vérification navigateur du contrat minimal et des actions annexes encore refusées.
7. **Décision d'exploitation explicite** : fenêtre, responsable, critères d'arrêt, accès aux journaux et moyen de retour arrière. Le flag est global au processus, pas une allowlist tenant ; tous les tenants desservis par un processus activé doivent satisfaire les prérequis, ou le déploiement doit déjà les isoler. Aucune isolation Nginx nouvelle n'est proposée.

## Procédure précise d'activation future — ne pas exécuter sans autorisation

1. Déployer le code compilé avec `MEMO_B2_PRODUCTION_MANAGER_READS` absent ou `0` **sur les deux côtés**. Conserver `NODE_ENV=production`. Valider que les deux GET restent fermés et que les connexions utilisateur existantes restent fonctionnelles.
2. Valider séparément les prérequis de schéma et de sessions. Aucune migration au démarrage, aucun `sync alter`, aucune migration déclenchée par une requête HTTP.
3. Dans la configuration de déploiement persistante de **chaque API Tenant concernée**, définir `MEMO_B2_PRODUCTION_MANAGER_READS=1`. Redémarrer les processus Tenant avec l'environnement actualisé, en gardant le BFF fermé. Attendre la bonne version et la disponibilité.
4. Définir la même valeur sur **chaque BFF concerné**, puis redémarrer les BFF avec l'environnement actualisé. Ne pas activer l'ancien flag local et ne pas passer NODE_ENV en développement.
5. Avec des comptes de contrôle réels autorisés, tester uniquement les deux GET publics : pagination/liste et détail autorisés, détail hors ACL en 404 non divulgateur, changement de tenant refusé et absence de session refusée. Ne pas publier les bearer, OTP ou données personnelles dans les preuves.
6. Vérifier la fermeture des chemins hors périmètre sans déclencher de mutation réelle ; surveiller statuts 401/403/404/503, `memo_permissions_pending`, `memo_read_unavailable`, erreurs de schéma et latence. Au moindre accès hors ACL, fermer immédiatement le BFF puis l'API.

Avec les noms du fichier PM2 racine, les processus sont `api-tenant` et `api-backend`. Exemple opérateur si l'injection provient de l'environnement du shell :

```sh
# Sur l'hôte/API Tenant concerné, après mise à jour persistante du déploiement :
MEMO_B2_PRODUCTION_MANAGER_READS=1 pm2 restart api-tenant --update-env
# Ensuite sur le BFF concerné :
MEMO_B2_PRODUCTION_MANAGER_READS=1 pm2 restart api-backend --update-env
```

Ces commandes ne remplacent pas la mise à jour du gestionnaire de configuration persistant. Si un ecosystem PM2 injecte une valeur prioritaire, utiliser sa procédure habituelle avec le bon fichier et `--env production`, puis contrôler l'environnement effectif. Vérifier les vrais noms/processus du déploiement ; ne pas exporter tous les secrets pour contrôler un seul indicateur.

Master, Redis, frontend, cron et solveur n'ont pas besoin de redémarrage pour ce seul flag. Aucun rechargement Nginx requis.

## Retour arrière futur

1. Dans la configuration persistante BFF, définir `MEMO_B2_PRODUCTION_MANAGER_READS=0` et redémarrer toutes ses instances avec environnement actualisé. Cela ferme immédiatement les nouvelles requêtes dès leur arrivée dans le middleware mis à jour.
2. Définir ensuite `0` côté API Tenant et redémarrer toutes ses instances, pour fermer aussi les appels directs internes.

```sh
MEMO_B2_PRODUCTION_MANAGER_READS=0 pm2 restart api-backend --update-env
MEMO_B2_PRODUCTION_MANAGER_READS=0 pm2 restart api-tenant --update-env
```

3. Vérifier le retour à `memo_permissions_pending` pour les deux GET avec une session valide, et l'absence de fallback historique. Conserver les fichiers/migrations B1 ; aucun DROP ni retour SQL destructif n'est nécessaire pour fermer les lectures.
4. Les requêtes déjà en cours peuvent finir avant l'arrêt/redémarrage ; les données déjà affichées ne sont pas retirées des navigateurs par un flag serveur. Vérifier la fin de toutes les anciennes instances avant de déclarer le retour arrière complet.

## Risques et limites

- Cette mission prépare la capacité d'activation ; elle ne démontre pas la conformité des schémas ou paramètres de production.
- La liste/détail restent en projection minimale B2 : noms de personnes non exposés, historique incomplet signalé, médias/capacités d'écriture fermés. Le frontend peut encore tenter des opérations annexes refusées ; aucune adaptation de contournement n'est ajoutée.
- Un déploiement hétérogène ou une activation d'un seul côté entraîne une indisponibilité fermée, pas un accès permissif. Un flag présent sur une partie des instances peut provoquer des réponses alternantes.
- Les erreurs SQL ou d'infrastructure sont volontairement peu détaillées côté client ; le diagnostic opérateur doit utiliser des journaux protégés.
- Les tests nouveaux portent sur les conditions et chemins production dans un environnement simulé, sans migration ni modification de base existante.

Aucun accès production, aucune activation réelle, aucune migration exécutée. Fin de la seule mission de préparation.

### Résultat final des contrôles à la reprise du 13 novembre

- Suite ciblée : code de sortie **0**, **64/64 tests réussis** ; journal persistant indiqué ci-dessus.
- TypeScript BFF : code de sortie **0**, aucun diagnostic.
- TypeScript API : code de sortie **0**, aucun diagnostic.
- Aucun changement applicatif après ces vérifications ; seule la documentation a été finalisée.
