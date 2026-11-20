# Toké — stabilisation locale lots 1 et 2, 2026-11-05

**Correctifs GPS zéro et mémos implémentés ; migration testée. Lot 1 pas totalement accepté : l’atomicité du pointage après erreur SQL reste en échec. Release non livrable : authentification/permissions et reprise de provisioning également bloquantes.** Aucun accès réel, transfert, déploiement ou installation. Ni reset/stash/nettoyage Git, ni écrasement des modifications utilisateur. Aucun modèle synchronisé en mode existing.

## Changements séparés

| Ensemble | État de cette reprise |
|---|---|
| Modifications utilisateur Cloud/BFF/API | Conservées ; pas de retour aux anciennes interfaces. |
| V01 | Implémentation inchangée ; banc PostgreSQL étendu et rejoué. |
| Worker | Trois patchs IDS/cycle_length/atomicité inchangés et tests rejoués ; aucun nouveau changement métier worker. |
| Mémos lot 1 | Corrections ciblées Cloud uniquement, décrites ci-dessous. Aucun correctif d'authentification BFF/API appliqué. |
| Pointage GPS | Deux contrôles de présence null/undefined dans TimeEntriesModel ; patch autonome `POINTAGE_GPS_ZERO_FIX.patch` relatif au candidat avant ce lot, pas à HEAD supposé déployé. Aucune autre règle de pointage modifiée. |
| MemoReads lot 2 | Nouveau SQL manuel portable et tests de migration. Aucune migration réelle ni ajout à un démarrage/deploy automatique. |

Fichiers applicatifs Cloud modifiés par ce lot :

- `src/service/MemoService.ts` : tri typé recent/oldest ; décodage uploadFile `success/data/attachments`, contrôle d'une réponse invalide. uploadMultipleFiles conserve son contrat.
- `src/stores/memoStore.ts` : portée tenant/utilisateur/génération locale de session, époque d'invalidation supplémentaire pour clearCache, clés de listes/détails isolées, rejet des résultats et callbacks anciens, nettoyage des promesses/horodatages/lectures/pagination/données, confirmation de lecture liée à sa portée. `persist:false`, purge ciblée de `memo-store` à l'instanciation ; aucune purge des autres préférences.
- `src/stores/userStore.ts` : compteur **local de cache** lors d'une nouvelle connexion, restauration et déconnexion. Aucun changement du token, de son stockage/signature/expiration ni de l'identité acceptée par le serveur.
- `src/service/MemoRealtimeService.ts` : génération de socket ; ancien ticket initial ou de refresh ne peut créer/reconnecter le socket d'une autre session ; callbacks d'anciens sockets ignorés.
- `src/tools/Fetch.Client.ts` : métadonnée interne Axios limitée aux appels mémos, capturée avant mise en attente et contrôlée avant envoi. Aucun header/contrat HTTP supplémentaire. Une requête A attendant l'intercepteur ne peut recevoir les credentials de B ; erreur locale `memo_session_changed`. Une requête déjà envoyée n'est pas annulable rétroactivement par ce mécanisme.
- `src/views/memo/memoSidebar.vue`, `memosView.vue` : retrait du type name, sélection et actions réinitialisées/protégées au changement de session, confirmations de lecture via store protégé.
- `memoDetailChat.vue`, `memoCreateChat.vue`, `AuthenticatedMedia.vue` : retours asynchrones invalidés après changement de session/démontage, pas de nouvelle action après upload obsolète, détail/médias et ressources audio nettoyés. Aucun changement de calcul/validation métier serveur.

API : `src/tenant/model/TimeEntriesModel.ts:920,927` distingue 0 de null/undefined ; SQL, schémas et transactions inchangés par ce correctif.

## Preuves finales

| Vérification | Résultat et niveau |
|---|---|
| `memo-contract-review.cjs` | Sortie 0. Vrais services/stores Vue/Pinia et plugin installé, transports/storage fictifs. Logout pendant liste, A→B même utilisateur/GUID, nouvelle génération même compte, clearCache pendant requête, détail/lecture/event tardifs ; ancienne persistance purgée et non réécrite, préférence theme conservée. Single/multiple upload et pagination/tri vérifiés. |
| `memo-components.test.cjs`, `memo-realtime.test.cjs`, `memo-dispatch.test.cjs` | **4/4**, zéro ignoré. Scripts SFC réels compilés, Vue réel, réseau/socket/audio inertes : détail et blob tardifs refusés, ticket/refresh/socket ancien refusé, course Axios A→B reproduite rouge avant correctif puis verte avec zéro dispatch. Pas un test navigateur complet. |
| `run.cjs` | **58/58** tests applicatifs, zéro ignoré. Sondes de framework non assimilées aux AC ; pas besoin de les recompter comme acceptation. |
| PostgreSQL réel fictif | Dernière suite complète termine normalement **sortie 1 pour POINTAGE_SQL_ATOMICITY_REQUIRED et PROVISIONING_RECOVERY_REQUIRED**. Les contrôles GPS zéro/coordonnées invalides passent ; l’INSERT pointage refusé conserve une session. Les autres suites préparées passent : planning/rollback, Master nominal, intégrateur borné, worker et courses deux processus, V01 SQL/callbacks/streams/handshake/générations, mémos et migration. |
| GPS A/B | Latitude 0 en A, longitude 0 en B persistées exactement ; règles existantes d'anomalies géofence maintenues. Coordonnées hors bornes, null et chaîne invalide retournent 400 ; counts sessions/entrées/mémos/alertes inchangés après chaque refus. Un test supplémentaire de véritable échec INSERT conserve une session en A et B : **critère général d’absence d’écriture partielle non satisfait**, voir POINTAGE_ANOMALIE_ATOMICITE_SQL.md. |
| Mémos PG A/B | Vraies classes/Sequelize/pg, upsert brut concurrent, paire unique, données propres à A/B malgré même GUID, non-participant et instance étrangère refusés, zéro SQL natif pour contexte invalide. |
| Migration PG A/B | Brouillon validé avec contrôle fictif ; portable testé avec rôles tenant non superuser, création et idempotence, données conservées lors d'une seconde passe, séquence et upsert réels, contraintes FK/NOT NULL/unique, CASCADE, table et index incompatibles refusés, erreur injectée annulant création table/séquence. Aucun DDL de migration hors cluster marqué. |
| Types/builds | Shared, API et BFF compilés dans tmp, API/BFF résolvent Shared/API fraîchement compilés via configs de test temporaires ; succès. vue-tsc Cloud réussi. Build Vite isolé sans .env, configuration/URL fictive, sortie tmp ; succès (voir handoff pour dernier artefact). Pas de remplacement de dist dans le dépôt ni lancement de serveur. |

Commandes reproductibles :

```sh
node packages/api/verification/tenant-isolation/memo-contract-review.cjs
node --test packages/api/verification/tenant-isolation/memo-components.test.cjs packages/api/verification/tenant-isolation/memo-realtime.test.cjs packages/api/verification/tenant-isolation/memo-dispatch.test.cjs
node packages/api/verification/tenant-isolation/run.cjs
env PATH="/Applications/Postgres.app/Contents/Versions/16/bin:$PATH" node packages/api/verification/tenant-isolation/postgres-integration.cjs --create-disposable-cluster
node packages/api/verification/tenant-isolation/build-types-isolated.cjs
./node_modules/.bin/vue-tsc --noEmit -p packages/cloud/tsconfig.json
node packages/api/verification/tenant-isolation/build-cloud-isolated.mjs
```

Les lanceurs n'admettent aucune URL PostgreSQL alternative. Le SQL portable n'a aucun lanceur automatique. La suite PostgreSQL **doit rester rouge** tant que la reprise du lot 4 et l’atomicité SQL pointage ne sont pas corrigées ; ne pas retirer l'assertion pour rendre une livraison verte.

## Incidents et limites conservés

- Premier essai PG interrompu par délai VM de chargement, avant scénarios. Pas de garde modifié pour contourner cet incident.
- Le brouillon de migration lit unix_socket_directories, réservé au rôle privilégié ; essai tenant initial refusé. Le portable ne lit pas ce paramètre et s'exécute sous le rôle tenant. Le pilote de test continue d'imposer socket/bases/port du cluster possédé.
- Deux défauts de fixtures corrigés : test CASCADE initialement choisi sur un mémo lié à des entrées dont la FK interdit légitimement sa suppression (remplacé par le mémo de test dédié) ; remplacement JS de `$$` dans le SQL d'injection (fonction de remplacement pour préserver les dollars). Aucune contrainte métier ou garde SQL modifié.
- Un passage après migrations réussies a subi un signal 9 sur PostgreSQL puis son processus de récupération ; cause externe non déterminée. Le répertoire marqué a été conservé, son arrêt confirmé par pg_ctl status=3, puis ce seul répertoire supprimé. Dernier passage propre, arrêt/nettoyage normal ; aucune donnée système/client.
- Build de types temporaire initial : recherche des types dépendant du répertoire de config corrigée dans le lanceur avec typeRoots explicite du dépôt, sans toucher les sources Shared. Première variante Vite sans config Tailwind trouvée avait un avertissement de contenu ; le lanceur reproduit désormais explicitement les règles content/theme et le découpage vendor avec environnement fictif. Avertissement de gros bundles conservé, aucune optimisation hors périmètre.

## Blocages et suite soumise à décision

0. **Pointage SQL atomique non satisfait** : après refus INSERT réel, sessions 4→5 sans entrée, dans A/B. Défaut préexistant distinct du GPS, documenté dans POINTAGE_ANOMALIE_ATOMICITE_SQL.md avec proposition transactionnelle non implémentée. Accord séparé requis.
1. Authentification/permissions mémos : lacune /list et autres opérations conservée visible ; le test de caractérisation montrant authenticate sans token n'est **pas** une acceptation sécurité. Sessions historiques, expiration/révocation et délégation intégrateur non stabilisées. L'entrée de profil intégrateur appelle actuellement setAuthData sans access_token ; aucune tolérance anonyme ajoutée.
2. Provisioning : deux processus sérialisés et 30 tables complets passent ; panne après création laisse un état durable non repris. AC10/AC32 restent partiels/en échec ; aucun bootstrap automatique d'existing.
3. Matrice AC globale conserve les autres limites (historique des schémas, variantes CRUD/callbacks, changements de config multi-processus, parcours financiers/auth externes). Cache inter-onglets et navigateur complet, enregistreur audio réel, fichiers réels, permissions complètes et ancienne/nouvelle release complète restent à recetter ; les tests SFC ne remplacent pas cela.
4. Migration portable ne certifie pas les schémas/ACL historiques réels. Sa procédure réclame contrôle préalable, sauvegarde/restauration vérifiée et autorisation d'intervention séparée. Ne jamais déduire une autorisation d'exécuter des tests chez un client.

Propositions à approuver séparément : [STABILISATION_LOTS_3_4_PROPOSITIONS.md](./STABILISATION_LOTS_3_4_PROPOSITIONS.md). Procédure migration : [MEMOREADS_PROCEDURE_MANUELLE.md](./MEMOREADS_PROCEDURE_MANUELLE.md). Retour arrière futur : conserver la table additive ; rollback cohérent des artefacts Cloud/BFF/API/shared, pas de DROP ni retour Git supposé restaurer données/sessions. La production n'a pas été inspectée et aucun déploiement n'est autorisé.
