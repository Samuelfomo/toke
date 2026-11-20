# TOKÉ — Lot 3 / étape B : plan d’implémentation

Date : 9 novembre 2026. Référence normative : [contrat, section 11](./LOT3_CONTRAT_IMPLEMENTATION.md#11-contrat-métier-finalisé--étape-b-9-novembre-2026). Livrable de conception uniquement. Les noms de nouvelles tables/commandes ci-dessous sont proposés ; aucun SQL exécutable n’est livré ou exécuté. Étape A validée localement ; V01 clôturé sous réserves. Sources, sessions, provisioning et changements utilisateur conservés.

## 1. Règles définitives et limites

**Approuvé :** décision APPROVED/REJECTED indépendante de conserver/corriger ; aucune modification automatique de pointage par décision, réouverture ou révocation. Une correction reste effective jusqu’à rectification explicite. Priorité au direct fiable, puis manager de groupe unique ; sinon conservation du mémo « Responsable à désigner ». Responsable figé à la soumission ; transfert autorisé et historisé seulement. Supérieur autorisé : consulter/commenter/rouvrir, jamais décider à la place du responsable. Journal dédié en ajout seul ; aucune reconstruction fictive du passé.

**Propositions techniques :** extension de responsabilité, journal, registre de commandes, journal de corrections et outbox décrits ci-dessous. Aucun nouveau statut SQL. Pas d’autorisation D7 implicite.

**Arbitrages encore bloquants, sans réponse arbitraire :**

| Question | Fonction bloquée tant que non définie |
|---|---|
| Acteurs habilités à désigner/transférer, périmètre et candidats admissibles | Commandes de désignation/transfert et file administrative ; aucune nomination automatique de remplacement. |
| Capacité exacte de correction, états admissibles, lien à une décision absente ou historique | Activation de l’action de correction ; ne pas déduire ce droit du seul droit de lecture, supervision ou validation. |
| Auteur manager également responsable : restrictions d’auto-validation | Activation de ces cas ; garder les restrictions existantes sans les contourner. |
| Lecture/commentaire des anciens participants après transfert | Extension de leurs accès ; ne pas conserver une autorité par ancien lien hiérarchique. |
| Durée de conservation, archivage et effacement exceptionnel | Purge automatique ; aucune durée légale inventée. |

Commentaires de supervision sur REVOKED refusés en attendant décision explicite. Les fonctions dépendantes restent fermées ; lecture et conservation des dossiers ne sont pas conditionnées à une fausse attribution.

## 2. Modèle de responsabilité

Collaborateur concerné : salarié auteur de sa demande, cible de la création manager/système. Vérifier les liens aux entrées et sessions côté serveur. À la soumission, évaluer les relations à l’heure serveur, pas au jour supposé de l’incident rétroactif. Cette date ne prétend pas reconstruire une ancienne appartenance.

Résolveur commun pour créations humaines et automatiques :

1. Lister les DIRECT_REPORT actifs et datés ; vérifier comptes, rôle manager, absence de suppression, cohérence des intervalles et cycles. Dédupliquer les personnes.
2. Un seul direct fiable : le retenir. Groupe différent ou assigned_by différent ne l’invalident pas. Plusieurs directs concurrents : non résolu, sans descendre au groupe pour les départager.
3. Sans direct fiable, rechercher les groupes actifs/non supprimés et membres actifs, avec manager actif habilité ; dédupliquer les managers. Un seul : retenir ; plusieurs ou aucun : non résolu. Préserver la convention historique `active !== false`, sans inventer de date de sortie. Une structure corrompue empêchant d’établir l’absence de concurrence reste non résolue avec motif.
4. Persister provenance (type, références, instant de résolution, version du résolveur), responsable ou motif d’incertitude ; jamais utiliser `assigned_by` seul, le premier groupe, l’ID minimal ou la relation la plus récente comme départage.

Le rôle de responsable est distinct de `author_user`, `target_user` et `validator_user`. Ce dernier reste l’information historique de dernier validateur, s’il existe. Ne pas le recopier comme mandat certifié. Un responsable inactif conserve son identité historique ; état REVIEW_REQUIRED et décisions suspendues, jusqu’à transfert. Un nouveau manager n’hérite pas des anciens dossiers.

Les références aux utilisateurs utilisent les identifiants internes tenant, sans accepter un auteur fourni par le client.

Proposition `memo_workflows` (une ligne par mémo, créée lors de la première opération B, **aucun backfill**) :

| Colonne | Type / règle proposée |
|---|---|
| memo_id | INTEGER PK/FK vers Memos.id, ON DELETE RESTRICT |
| responsible_user_id | INTEGER nullable, FK Users.id RESTRICT |
| responsibility_state | TEXT CHECK IN ('UNRESOLVED','ASSIGNED','REVIEW_REQUIRED') |
| responsibility_reason | Code borné, nullable ; obligatoire si non résolu/en revue |
| responsibility_provenance | JSONB objet validé, borné ; résolution courante uniquement, journal conservant les précédentes |
| decision_cycle | BIGINT >= 1 ; cycle 1 pour première prise en charge, pas une numérotation prétendant couvrir le passé |
| version | BIGINT >= 1, incrément à chaque mutation B, y compris commentaire et correction liée |
| last_event_id | UUID, référence composite différable au dernier événement du même mémo |
| history_completeness | TEXT CHECK IN ('COMPLETE_SINCE_B','LEGACY_INCOMPLETE') |

ASSIGNED exige un responsable ; UNRESOLVED exige NULL ; REVIEW_REQUIRED peut conserver le responsable antérieur. Contrôle transactionnel des droits courants en plus de ces CHECK. Extension absente = historique non certifié : badge de revue, pas responsabilité présumée. Une première opération crée un instantané observé et l’extension sous verrou de Memos ; l’unicité PK arbitre aussi les courses d’initialisation.

Le statut SQL existant reste inchangé. Nouveau filtre API `responsibility_state` orthogonal au statut et badge « Responsable à désigner » ; ne pas l’envoyer comme `memo_status`. Anciens clients : conserver les champs existants, ajouter les capacités serveur ; les anciennes mutations ne peuvent contourner les nouvelles préconditions.

## 3. Transitions et commandes HTTP proposées

| Commande | Préconditions / résultat |
|---|---|
| Soumettre | Résolution + SUBMITTED + événement ; dossier conservé même non résolu ; aucun manager notifié arbitrairement. |
| Valider/rejeter, y compris lot | Responsable ASSIGNED actif ; SUBMITTED ; cycle/version attendus ; décision obligatoire dans le journal même sans commentaire ; zéro écriture pointage. |
| Commenter en supervision | Supérieur actif dans la branche DIRECT_REPORT du responsable ; auteur dérivé ; verrou et append serveur. Sur APPROVED/REJECTED : REOPENED, cycle +1, SUBMITTED ; sinon commentaire seul, sous réserve des états permis. |
| Répondre | Tour salarié/manager existant, D4 ; aucune réouverture attribuée à une simple réponse salarié. |
| Conserver les pointages | Intention explicite `TIME_DATA_KEPT` sur version attendue ; pas de mutation horaire ni promesse d’interdire une correction future. |
| Corriger/rectifier | Commande distincte ; habilitation à définir ; cibles et versions attendues, valeurs explicites, justification, lien de décision si applicable ; statut du mémo inchangé. |
| Désigner/transférer | Capacité à définir ; version attendue, ancien/nouveau responsable et justification ; journal obligatoire ; même cycle, version +1 ; aucune correction. |
| Révoquer | Règles auteur/état existantes ; événement ; aucun appel de correction. |

Proposition d’API : conserver les routes validate/reject, ajouter cycle/version et clé de commande ; routes dédiées `/:guid/supervision-comments`, `/:guid/time-data/keep`, `/:guid/time-corrections`, `/:guid/responsibility/assign`, `/:guid/responsibility/transfer`, `/:guid/events`. La route content/manager-respond réutilise la même politique, sans chemin alternatif de réouverture. `/escalate` et auto-escalate deviennent demande/rappel de supervision, sans écraser le responsable ; les payloads historiques `new_validator` ne désignent plus personne. Le détail renvoie `capabilities`, cycle/version et complétude historique.

409 pour cycle/version obsolète, même si le cycle n’a pas changé depuis un commentaire. 403 pour action hors capacité ; 404 opaque selon la politique de non-divulgation du contrat. Une commande de décision sans préconditions est refusée et exige une actualisation du client. Aucune nouvelle tentative automatique d’une décision après conflit.

Séquence transactionnelle commune : principal étape A → transaction tenant V01 → verrou Memos → droits et liens relus → verrou extension → vérifier/rejouer commande idempotente → préconditions → verrou cibles horaires triées si nécessaire → événements et projections → outbox et résultat de commande → commit. Les changements de relations utilisés pour autoriser doivent être verrouillés ou protégés par version dans cette unité, avec ordre commun pour éviter une révocation concurrente ignorée. Ne pas créer de Sequelize global ou de transaction hors contexte tenant.

Deux commentaires simultanés : chacun est ajouté ; un seul rouvre et incrémente le cycle. Le second est enregistré sur le nouveau cycle, sans perte de contenu ; ne pas imposer au commentaire append-only une version qui ferait disparaître le second. Décision après commentaire avec ancienne version : 409. Décision d’abord puis commentaire : décision conservée et réouverture. Une lecture du nouvel état et une confirmation explicite sont requises avant nouvelle décision.

Lots de décisions : proposition d’atomicité par mémo, résultat individuel explicite, clés dérivées de la commande de lot et du mémo ; aucun succès global masquant un refus et aucune correction partielle. Trier les verrous si une transaction couvre plusieurs mémos ; documenter l’atomicité choisie dans l’API avant activation.

## 4. Schéma minimal du journal d’événements

Proposition `memo_events`, dans chaque base tenant ; **pas de tenant_id reçu du client**, le tenant est celui de la connexion V01 :

| Colonne | Type / contrainte |
|---|---|
| event_id | UUID PK, généré serveur |
| memo_id | INTEGER NOT NULL FK Memos.id, DELETE RESTRICT |
| sequence | BIGINT NOT NULL > 0 ; UNIQUE(memo_id, sequence), ordre sous verrou |
| event_type | TEXT NOT NULL, liste fermée validée SQL + serveur |
| effective_author_id | INTEGER FK Users.id RESTRICT ; requis pour humain |
| actor_kind / service_actor | HUMAN ou SYSTEM ; service borné requis pour système, pas de faux utilisateur |
| delegated_actor_ref | TEXT nullable borné, identité réelle dérivée de la preuve seulement ; ne confère aucune délégation D7 |
| responsible_user_id | INTEGER nullable FK Users.id RESTRICT, instantané du responsable au moment de l’événement |
| decision_result | TEXT nullable CHECK IN ('approved','rejected') ; requis pour DECIDED, absent pour commentaire |
| occurred_at | TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), écriture serveur uniquement |
| decision_cycle / version | BIGINT positifs ; version de l’état résultant |
| previous_event_id | UUID nullable ; FK composite (memo_id, previous_event_id) vers (memo_id,event_id) |
| related_event_id | UUID nullable, même contrainte ; décision rouverte ou décision justifiant l’action |
| command_id / command_event_index | UUID + SMALLINT >= 0 ; UNIQUE(command_id, command_event_index) |
| metadata | JSONB objet NOT NULL, schema_version, schéma par type, taille <= 16 Kio proposée |

Types proposés : SUBMITTED, RESPONSIBILITY_ASSIGNED, RESPONSIBILITY_TRANSFERRED, RESPONSIBILITY_REVIEW_REQUIRED, COMMENTED, DECIDED, REOPENED, REVOKED, TIME_DATA_KEPT, TIME_CORRECTION_APPLIED, LEGACY_STATE_OBSERVED. Ajouter un type exige évolution explicite du CHECK et des validateurs. Le commentaire peut être contenu dans le journal ou référencé par un identifiant stable protégé : ne pas se contenter d’un index dans le JSONB mutable. Texte borné, références structurées ; aucune URL secrète, token, fichier binaire ou payload arbitraire dans metadata. Les limites exactes de messages devront rester compatibles avec les messages historiques sans les tronquer.

Ajouter UNIQUE `(memo_id, event_id)` pour les FK composites et FK de command_id vers memo_commands (contrôle du même mémo). Index `(memo_id, sequence)` et `(memo_id, decision_cycle, sequence)` ; pagination d’événements par curseur sequence. La chaîne référence le dernier événement du même mémo ; séquence/version et liens causaux sont vérifiés dans la transaction. Horodatage ne sert pas à départager une concurrence. Une réouverture et son commentaire peuvent produire deux événements sous la même version résultante, avec index de commande distincts. UNIQUE partiel `(memo_id, decision_cycle)` pour DECIDED : au plus une décision par cycle.

Droits proposés : rôle propriétaire/migration distinct du rôle runtime ; runtime sans UPDATE/DELETE/TRUNCATE sur événements et corrections, sans propriété ni pouvoir de désactiver les triggers. Trigger de défense refusant UPDATE/DELETE ordinaires ; aucun FK CASCADE destructeur. Pour garantir l’accord journal/projection au-delà d’une convention applicative, écritures via fonctions SQL bornées dont EXECUTE seul est accordé au runtime pour ces tables, ou contrôle différé équivalent à prouver ; pas de DML direct permettant une projection sans événement. Fonctions à search_path fixé, sans SQL arbitraire ni escalade générale. Les utilisateurs HTTP n’ont aucun accès SQL direct. Les privilèges réels tenant doivent être audités avant déploiement ; un runtime propriétaire rendrait la protection insuffisante.

Idempotence durable PostgreSQL, pas Redis seul : registre `memo_commands(command_id UUID PK, memo_id FK, actor_ref, action, canonical_payload_hash, result JSONB borné, committed_at serveur)`. Clé unique de commande par base ; même clé/acteur/action/payload => même résultat, aucun nouvel événement ni notification ; réutilisation divergente => 409. Vérifier identité et accès avant de restituer le résultat, pour ne pas divulguer après retrait des droits. Conserver la clé au moins aussi longtemps que ses effets ; aucune expiration permettant un rejeu horaire. Commit incertain : relire cette commande, ne pas recréer une nouvelle clé. Redis peut accélérer, jamais porter la preuve de correction.

Conservation : journal et corrections restent disponibles avec le dossier, archivage contrôlé conservant liens et ordre ; pas de purge automatique en B. Durée à approuver. Effacement exceptionnel éventuel par procédure distincte, autorisée et auditée, jamais privilège runtime. En ajout seul ne signifie pas invulnérable au propriétaire SQL : sauvegardes, contrôle des rôles et traçabilité opérateur restent nécessaires.

## 5. Traçabilité des corrections horaires et impacts

Propositions `time_raw_observations` et `time_correction_changes`, séparées du journal métier. Une observation brute contient source (device/serveur/import), identifiant cible, champ, valeur initiale connue, horodatage de capture et qualité de provenance. UNIQUE(cible, champ, source de capture) ; ajout seul. Pour l’historique, une valeur courante observée n’est **pas** déclarée brute. Aucun peuplement à la migration ; capture brute future avant toute normalisation destructive, dans la transaction d’ingestion.

Chaque changement de correction contient UUID, identifiant de commande/groupe de correction, cible typée TimeEntry/WorkSession, champ allowlisté, avant/après typés (NULL distinct d’une chaîne `not_set`), observation brute éventuelle, qualité de provenance, acteur effectif/délégué, justification obligatoire bornée, heure serveur, version cible avant/après, événement mémo et référence de décision nullable explicitement motivée, précédent changement du même champ et correction rectifiée éventuelle. Utiliser deux FK nullable avec CHECK exactement une cible, plutôt qu’une FK polymorphe non vérifiable. UNIQUE(command_id,cible,champ) et liens précédents de même cible/champ ; DELETE RESTRICT. Même protection append-only que memo_events.

Un lot multi-champs est entièrement validé avant écriture ; tous les changements, durées recalculées, versions, événement et outbox sont dans une transaction. Verrouiller les cibles par ordre stable ; comparer versions/valeurs attendues pour empêcher une correction périmée provenant d’un autre mémo. Une rectification est un nouvel enregistrement, jamais UPDATE d’une ancienne preuve. Retour à la valeur initiale exige une commande explicite avec justification. Un changement sans différence renvoie un résultat sans effet, sans prétendre avoir appliqué une correction ; la commande reste idempotente.

Constats locaux et travaux nécessaires, **sans modification présente** :

- `tools/memo.correction.service.ts` : `applyCorrections` choisit le planning si la liste manuelle manque ; les branches manuelle/automatique écrivent `clocked_at` **et** `real_clocked_at`, sauvegardent plusieurs objets et recalculent des durées. Remplacer ce fallback par préparation de suggestions puis commande explicite ; passer la transaction partout, conserver les bruts, supprimer les résultats partiellement appliqués/skipped silencieux. Vérifier aussi les mises à jour de sessions et le cas durée zéro.
- `tenant/routes/memos.route.ts` : validate et revoke appellent ce helper ; séparer ces chemins, vérifier aussi validate-all, reject, content et escalate. Une simple approbation ne doit plus retourner une correction présentée comme appliquée.
- `TimeEntriesModel.applyCorrection` recopie clocked_at dans real_clocked_at et contient un TODO audit ; `TimeEntries.applyManagerCorrection` et la route `time.entries/:guid/correct` constituent un autre chemin à aligner, sans accepter manager_guid comme preuve d’acteur. Recenser aussi corrections directes de sessions, imports et sauvegardes génériques avant d’affirmer la conservation brute globale.
- `anomaly.detection.service.ts` corrige notamment une session déjà ouverte au CLOCK_IN, et d’autres cas CLOCK_OUT/mission créent ou ajustent des sessions avant de produire le mémo. Ces opérations techniques préexistantes ne deviennent pas des décisions de manager. Les isoler des corrections de mémo, conserver leurs raisons et provenance système ; aucun rejet/réexamen ne doit les rejouer ou les compenser. L’autorisation métier d’en modifier les règles techniques n’est pas donnée ici : toute évolution de ces automatismes exige un lot séparément examiné.
- `time.entries.route.ts`, `clock-in.options.ts`, idempotence de pointage et transaction V01 : garder l’unité atomique ingestion/session/anomalie/mémo. L’absence de responsable conserve le mémo non résolu, sans casser CLOCK_IN. Une panne d’écriture du journal requis doit provoquer rollback cohérent, pas un pointage corrigé sans preuve. Ne pas rendre Redis nécessaire à l’intégrité d’une correction PostgreSQL.
- Calculs de présence, anomalies, exports, planning et worker doivent lire les valeurs effectives sans détruire les observations brutes. `real_clocked_at` historique ne suffit pas à prouver un brut ; les écritures existantes peuvent l’avoir remplacé. Présenter « origine inconnue » lorsque nécessaire.

## 6. Permissions, Cloud et diffusion

D1–D6 détaillées en section 11.7 du contrat sont la référence. ACL commune sur toutes les routes, y compris listes spécialisées, médias, statistiques et journal. Aucun accès global aux non-résolus. LEFT JOIN unique workflow ; ACL + filtres avant pagination/count ; ne pas joindre directement tous les événements. `/pending-validation` = SUBMITTED + responsable courant habilité ; file de supervision séparée, jamais intitulée « à valider par moi » pour le supérieur.

Cloud : afficher responsable/provenance ou badge de désignation, statut réel, cycle et historique paginé ; distinguer décision passée et état courant rouvert. Boutons selon capacités serveur, avec contrôles serveur obligatoires. Deux actions horaires distinctes « conserver » / « corriger », sans sélection imposée par validation/rejet ; récapitulatif avant/après et justification avant correction. Afficher les corrections toujours effectives après rejet. Rechargement après 409 et confirmation utilisateur, sans retry silencieux. Avertissement lorsque les décisions anciennes ou bruts sont incomplets.

Messages/lu : `MemoReads` doit accepter un superviseur autorisé sans l’inscrire comme participant permanent, avec même ACL que détail ; ne pas changer l’isolation V01 ni effacer les lectures existantes.

Notifications proposées via outbox transactionnelle PostgreSQL (ID unique événement/destinataire/type), worker après commit, retry dédupliqué. Différencier DECIDED, COMMENTED, REOPENED, RESPONSIBILITY_TRANSFERRED, TIME_CORRECTION_APPLIED. Une réouverture produit une nouvelle demande au responsable, pas deux demandes pour commentaire + réouverture. Recalculer les destinataires autorisés au moment d’émettre ; aucune fuite de payload à une ancienne branche. Si non résolu, aucun manager choisi ni broadcast tenant. Socket.IO transmet invalidation minimale avec version/event_id ; déduplication, resynchronisation HTTP, pas une copie du dossier à tous les superviseurs.

Conserver tickets, introspection, révocation et sessions v2 de A. Cloud doit terminer son parcours : capturer le token avant purge, appeler le logout BFF serveur existant, invalider la génération locale, fermer Socket.IO, purger mémos/médias/cache et ignorer les réponses anciennes. `userStore.logout` observé purge localement mais ne démontre pas l’appel serveur. Ne pas retarder le nettoyage local en cas de réseau indisponible ; signaler la révocation serveur non confirmée et permettre de la retenter sans restaurer la session. Aucun changement du protocole A ni nouvelle durée de session.

## 7. Fichiers à modifier lors de l’implémentation autorisée

| Périmètre | Fichiers existants / ajouts proposés |
|---|---|
| Contrats partagés | `packages/shared/src/{types,schemas,constants}/tenant/memos.ts`, `utils/tenant/memos.validation.ts` ; vérifier la génération du `.js` voisin, ne pas éditer un artefact sans connaître son build. |
| Responsabilité et ACL | Nouveaux services tenant dédiés ; `OrgHierarchyModel.ts`, `GroupsModel.ts`, `UserRoleModel.ts` seulement pour méthodes fiables nécessaires, sans réécriture des règles globales. |
| Mutations mémos | `packages/api/src/tenant/routes/memos.route.ts`, `tenant/class/Memos.ts`, `tenant/model/MemosModel.ts`, `tenant/database/data/memos.db.ts` pour associations/lecture compatibles. |
| Persistance additive | Nouveaux modèles/classes/structures workflow, événements, commandes, corrections, observations et outbox ; registre `utils/response.model.ts` et chargement des modèles sans sync existing. |
| Pointage | `tools/memo.correction.service.ts`, `tenant/class/TimeEntries.ts`, `tenant/model/TimeEntriesModel.ts`, `tenant/class/WorkSessions.ts`, `tenant/model/WorkSessionsModel.ts`, routes time.entries et structures de données correspondantes pour versions. Audit des autres writers avant activation. |
| Automatique | `tools/anomaly.detection.service.ts`, `tenant/database/clock-in.options.ts`, `automate/automate.ts` et jobs d’escalade si appelants concernés ; garder les gardes et transactions existants. |
| Lecture / temps réel | `tenant/class/MemoReads.ts`, `tenant/model/MemoReadsModel.ts`, `realtime/MemoEventsService.ts`, bridge BFF `packages/backend/src/services/memo.socket.bridge.service.ts` ; outbox consumer proposé. |
| Proxy BFF | `packages/backend/src/routes/memos.route.ts` : relayer préconditions, clés, événements et erreurs sans sélectionner l’acteur. Route tenant logout existante réutilisée. |
| Cloud | `service/MemoService.ts`, `service/MemoRealtimeService.ts`, `stores/memoStore.ts`, `stores/userStore.ts`, `tools/Fetch.Client.ts`, `views/memo/{memosView,memoSidebar,memoChat,memoDetailChat,memoDetailPanel,memoCreateChat}.vue`, lexique/styles si nécessaire ; appelants logout à inventorier. |
| Migration / vérification | Nouveaux scripts versionnés proposés dans `packages/api/migrations/manual/` et tests dans `packages/api/verification/tenant-isolation/` ; aucun script ajouté/exécuté maintenant. |

Les fichiers de A ne sont pas à modifier pour réinventer l’authentification. D7, provisioning, configuration réelle et mécanismes V01 hors périmètre.

## 8. Migration additive proposée et compatibilité historique

1. **Préflight en lecture seule ultérieure** : identifier tenant et version PostgreSQL, tables/noms réels, PK INTEGER, FK, enum memo_status, nullabilité de target/validator, JSONB, indexes, triggers, propriétaire et privilèges. Détecter tables homonymes incompatibles, types divergents, orphelins et workflows partiellement installés. Produire rapport ; incompatible => arrêt explicite, pas réparation automatique.
2. **Sauvegarde avant toute future exécution autorisée** : dump cohérent chiffré par tenant, schéma + données + rôles pertinents, empreintes et restauration vérifiée sur clone isolé. Fenêtre et verrou de migration par base ; pas d’accès production dans cette mission.
3. **DDL proposé** : créer les tables ci-dessus et outbox, indexes, fonctions/contraintes/privilèges ; éventuelles colonnes de version nullable sur TimeEntries/WorkSessions sans backfill (NULL normalisé à zéro dans les nouvelles commandes), ou extension de version dédiée. Utiliser les noms et types FK réels constatés. Aucun ALTER du statut SQL, aucune mise à jour des mémos/pointages existants, aucun INSERT de décisions historiques. Tables d’extension vides après migration.
4. **Versionnement** : registre de migration avec checksum, installation atomique et vérification complète ; objet déjà présent non conforme => arrêt, pas simple `IF NOT EXISTS` masquant une incompatibilité. Séparer une éventuelle création d’index concurrent de la transaction DDL si nécessaire, avec procédure de reprise explicite. Aucun `sync()`, `alter:true` ou `force:true` en mode existing ; ne pas changer le provisioning.
5. **Vérification future** : comparer comptes et empreintes des données métier avant/après ; tables nouvelles vides, statuts inchangés, aucun événement ancien ajouté ; inspecter contraintes/triggers/grants, rejeter UPDATE/DELETE/TRUNCATE runtime, vérifier rollback DDL et restauration sur clone. Tester mode existing sans DDL implicite avec schéma incomplet : erreur explicite et routes concernées fermées.
6. **Bascule** : migrations validées avant activation des nouvelles mutations ; arrêter les anciens writers incompatibles, pas de coexistence d’une ancienne validation corrigeant silencieusement. Lecture historique compatible ; ancienne UI doit être actualisée pour les commandes versionnées. Rollback applicatif uniquement vers une version respectant ces invariants ou fermeture des mutations ; ne pas supprimer tables/journal pour revenir en arrière.

Anciens mémos sans responsable : conserver les champs et statuts ; pas de backfill depuis assigned_by/validator. Une désignation future est un événement daté maintenant, par acteur habilité, sans prétendre être l’attribution d’origine. Pour un ancien mémo terminal, avant réouverture autorisée : responsable certifié requis et LEGACY_STATE_OBSERVED avec statut/validateur observés, date d’observation, ancienne date de décision inconnue. Ne pas convertir cet instantané en DECIDED historique.

Anciens mémos déjà corrigés : conserver leurs valeurs et traces existantes ; signaler complétude inconnue. La première nouvelle rectification capture l’avant effectivement observé et indique brut historique inconnu. Aucun scan/backfill n’annule, ne recalcule ou ne réapplique une ancienne correction.

## 9. Tests à préparer et exécuter après autorisation d’implémenter

Aucun de ces tests n’a été exécuté pour ce livrable. Fixtures exclusivement isolées, jamais données réelles. PostgreSQL réel requis pour contraintes, verrous et rollback ; Redis réel pour les garanties de A/diffusion, sans le substituer aux preuves SQL.

| Lot | Scénarios et preuve attendue |
|---|---|
| Responsabilité | Direct unique prioritaire sur groupe divergent/assigned_by ; groupe seul ; plusieurs groupes même manager ; directs concurrents ; groupes concurrents ; zéro candidat ; inactifs, dates expirées, cycles, non-DIRECT_REPORT, champ active absent/false ; aucune sélection arbitraire. |
| Conservation / listes HTTP | Soumission humaine et auto sans responsable ; mémo conservé, badge, pas de décision possible ni notification arbitraire ; ACL avant count/pagination, sans doublons ; cinq statuts existants inchangés. |
| D1–D6 | Même GUID dans tenants A/B, spoofing auteur/manager, supérieur lisant/commentant mais refusé en décision ; médias/journal/agrégats/lu cohérents ; retrait de rôle et transfert invalidant l’ancien décideur. |
| Cycles PostgreSQL | Décision sans commentaire ; supérieur commente puis SUBMITTED, même responsable, cycle +1 ; nouvelle décision et toutes traces présentes ; deux commentaires conservés avec une réouverture ; course décision/commentaire dans les deux ordres, ancienne version refusée. |
| Corrections | Validate/reject/revoke/reopen sans aucune écriture horaire ; KEEP tracé sans correction ; correction puis rejet/réouverture inchangée ; rectification explicite ; valeurs brutes préservées ; avant/après et durées cohérents, y compris durée zéro ; aucune correction implicite au planning. |
| Concurrence / idempotence SQL | Même clé rejouée, payload divergent, commit incertain, deux corrections de mémos distincts sur même cible, cible périmée, ordre des verrous ; un effet maximum et conflits explicites. |
| Atomicité / droits SQL | Injecter panne entre chaque écriture : statut/journal/cibles/outbox tous rollback ; runtime ne peut UPDATE/DELETE/TRUNCATE ni contourner journal/projection ; FK inter-mémos rejetées et pas de cascade. |
| Historique / migration | Clone avec schémas variants, extension absente, JSONB incomplet, ancienne correction, responsable absent ; aucune invention d’événement et aucune donnée changée par DDL ; tables homonymes incompatibles détectées ; backup restaurable et existing sans sync. |
| HTTP / Cloud | Routes alternatives et lots soumis aux mêmes droits, paramètres d’identité non fiables, 409 sans retry silencieux ; état courant et anciennes décisions visibles ; fermeture des fonctions non arbitrées ; logout serveur confirmé, réseau coupé et réponses tardives. |
| Redis / Socket.IO | Introspection et révocation A inchangées, tickets non rejouables, panne Redis sans double correction SQL ; aucun événement avant commit/rollback, déduplication outbox, reconnexion rattrapée par HTTP, changement de branche entre commit et émission. |
| Régression | Suites existantes `postgres-clockin-atomicity.cjs`, `postgres-memo-review.cjs`, `postgres-memo-migration.cjs`, tests memo-contract/components/dispatch/realtime et suites isolation V01 ; planning/worker ; TypeScript/builds API/BFF/Cloud selon scripts du dépôt. Ne pas requalifier des échecs connus comme succès ni modifier V01 pour les contourner. |

Compléter les tests HTTP des nouvelles commandes avant leur activation. Les tests Redis/A sont des non-régressions du protocole existant, pas une nouvelle implémentation des sessions.

## 10. Risques et ordre de réalisation

Risques principaux : champs historiques confondus avec mandat ; bruts écrasés irrécupérables ; anciens clients/instances qui continuent à corriger à la validation ; helpers sauvegardant hors transaction ; jointures faussant pagination ; supervisions fondées sur liens non directs ; runtime SQL propriétaire ; émission avant commit ; corrections concurrentes hors mémo ; faux sentiment de complétude après migration. Chacun doit être couvert par le lot correspondant avant activation.

Petits lots vérifiables proposés :

1. Résoudre les arbitrages de capacités nécessaires, figer contrats de commandes/erreurs et critères d’activation ; inventorier tous les writers horaires et appelants logout. Aucune fonction non arbitrée activée.
2. Préparer migration additive et préflight, revue SQL/permissions et restauration ; exécuter uniquement après autorisation future sur clones, vérifier zéro changement historique et existing sans sync.
3. Introduire journal/commandes/workflow/outbox et transactions sous garde V01 inchangée ; tests SQL d’intégrité, rollback, ajout seul et idempotence.
4. Résolveur de responsabilité et lecture scoped : soumission non résolue conservée, listes/compteurs/lu/médias ; tests directs/groupes/historique et isolation A/B.
5. Séparer décision et correction sur **toutes** les routes, désactiver ancien fallback ; validation/rejet versionnés, journal systématique ; vérifier absence d’écriture pointage.
6. Commentaire de supervision et réouverture, courses SQL et historiques ; escalades sans transfert. Désignation/transfert seulement après arbitrage de capacité.
7. Observations brutes et corrections explicites transactionnelles, alignement des autres writers horaires autorisés, tests cibles partagées et non-régression CLOCK_IN ; activation correction conditionnée à l’habilitation définie. Les règles techniques automatiques non arbitrées restent inchangées.
8. BFF/Cloud, historique, deux décisions séparées, conflits, outbox/Socket.IO, logout serveur ; tests HTTP/Redis et builds ciblés.
9. Revue finale du contrat, non-régressions V01/A/planning/worker, compatibilité des anciennes instances et procédure de bascule. Aucun déploiement inclus dans cette mission.

Arrêt de cette étape : les deux documents seulement. Aucune migration, aucun test runtime, aucune source applicative ou donnée modifiée.
