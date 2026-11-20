# Toké — propositions finales lots 3 et 4

2026-11-05. **Propositions seulement : aucune modification de l'authentification ni du provisioning dans cette étape.** Ce document précise/remplace les recommandations générales précédentes. Il ne vaut pas autorisation de migration, transfert ou déploiement.

## Lot 3 : comparaison et recommandation

| | A — renforcer les preuves existantes | B — ajouter une preuve interne BFF→API |
|---|---|---|
| Preuve du manager | Token HMAC déjà émis après OTP, validé jusqu'à l'API ; aucune confiance dans un GUID seul. | Même preuve initiale, puis enveloppe interne signée tenant/acteur/méthode/chemin/body/nonce/expiration. |
| Révocation | État serveur partagé indispensable pour un logout réellement révocable. Une session purement stateless ne suffit pas. | Registre également nécessaire ; une enveloppe courte ne révoque pas à elle seule une session/socket. |
| Intégrateur | Couple session/contexte opaque existant, vérifié par Master/Redis à chaque admission sensible. | Transformer la délégation vérifiée en preuve interne, conserver l'acteur réel. |
| Complexité | Un cycle de vie de session et une autorité de validation ; réutilisation des formats et du mécanisme Master intégrateur. | Deux preuves, clés/rotation et expirations supplémentaires, canonisation de requête, registre anti-rejeu et gestion des retries. |
| Limite | Le token utilisateur reste une preuve bearer ; TLS et protection du token nécessaires. | Meilleure séparation des clés de signature et liaison par requête ; plus de risques d'erreur d'implémentation et de compatibilité. |

**Recommandation : A renforcée, avec révocation centrale obligatoire et vérification de bout en bout.** A ne signifie pas simplement ajouter authenticateUser à /list : l'API doit aussi vérifier une preuve utilisateur/de délégation et ses permissions. B est une alternative pertinente si une séparation cryptographique des domaines BFF/API est exigée ; elle n'est pas nécessaire pour supprimer ici l'usurpation de GUID et impose davantage de nouveaux mécanismes. Aucun fallback anonyme de compatibilité.

### Conception A proposée

- **Autorité centrale :** un petit service de validation/lifecycle dans Master, utilisant Redis déjà employé par `master/routes/integrator.route.ts:16,118–141`. Le cache QR `tools/auth.cache.service.ts` est un cache fichier dédié, **pas** ce registre. Ne pas réutiliser ses entrées/sessions comme preuves manager.
- **Émission manager :** conserver le token signé existant et la réponse access_token/token_type/expires_in. Enregistrer sa validité côté serveur à l'issue d'un OTP réellement validé, avant de retourner un succès. Recommandation : ajouter un identifiant aléatoire de session au payload opaque pour distinguer deux connexions simultanées du même utilisateur ; garder les deux segments HMAC existants. Le registre stocke un hash de session/token, tenant, utilisateur, état et expiration, jamais le bearer en clair. L'émission/inscription doivent être réservées à l'OTP validé ; aucune inscription publique à partir de GUID.
- **Validation :** BFF vérifie signature, expiration et état serveur ; API tenant obtient le même principal via une introspection Master authentifiée sur le lien de service existant, puis vérifie correspondance tenant/contexte V01 et utilisateur encore actif. Éviter de distribuer la clé d'émission à tous les processus tenant. La localisation finale de la signature BFF ou Master doit être approuvée ; préférence Master à l'endroit qui sait que l'OTP a été consommé, BFF relayant le token, afin de ne pas créer une API générique d'enregistrement de GUID arbitraires.
- **Transport :** préserver l'authentification du service et transporter séparément la preuve humaine opaque (header interne dédié, écrasé par le BFF). `ServerAuth.extractToken` privilégie Authorization hors /integrator (`server-auth.ts:255–275`) : remplacer ce Bearer par celui du manager casserait le service. Le nouveau header transporte un **token vérifiable**, jamais un GUID faisant foi. API refuse un principal non vérifié, même pour un client applicatif root. Résoudre le principal et sa correspondance tenant avant l’admission SQL métier et avant de créer une portée tenant depuis des paramètres non fiables ; l’introspection ne prend jamais un GUID du body comme preuve.
- **Identités :** principal immuable tenant/user/session/mode, et acteur intégrateur réel lorsqu'il y a délégation. Auteur et validateur dérivés du principal ; identités d'action contradictoires rejetées. supervisor/target du navigateur restent éventuellement des filtres de ressources, limités aux droits du principal ; pas un changement d'identité. Pas de middleware permissif si le registre est indisponible : 503 fermé, token invalide/expiré/révoqué => 401, ressource interdite => 403.
- **Permissions mémos :** politique unique côté API pour liste, détail, lu, création/réponse/contenu, validation/rejet/révocation/escalade et pièces jointes. Conserver participation auteur/cible/validateur pour la visibilité existante ; ne pas ajouter automatiquement tous les descendants. Appliquer rôle et relation hiérarchique aux actions où ils sont requis (TODO POST /manager), sans ouvrir de visibilité supplémentaire. Les habilitations opaques/ambiguës doivent être explicitement arbitrées, pas remplacées par « manager voit tout ».
- **Sessions historiques :** ne jamais convertir authData/localStorage ou un GUID en preuve. Absence de token inscrit/version prise en charge => reconnexion OTP ; message clair et purge mémos. Durée initiale serveur conservée à 24h, authData de sept jours ne la prolonge pas. Pas de refresh automatique décidé ici. Les anciennes sessions non révocables ne doivent pas rester admises durablement sur les opérations sensibles.
- **Logout/expiration :** révocation idempotente au registre, tombstone jusqu'à expiration pour empêcher la réactivation d'une ancienne preuve ; fermeture des sockets. Client nettoyé immédiatement même si la révocation distante échoue, sans annoncer à tort son succès. Une connexion déjà admise ou une réponse déjà envoyée ne peut pas être annulée rétroactivement ; toute nouvelle admission/émission sensible vérifie la validité. Les erreurs 401 provoquent la purge et une reconnexion contrôlée.
- **Médias :** upload sous principal ; référence de pièce liée au tenant, au mémo et à son droit de lecture. Proxy et `tenant/routes/upload.route.ts:64` doivent appliquer cette même politique ; une URL ou un chemin seul ne donne pas accès. Fermer les accès directs qui contournent le proxy, conserver le format des réponses de fichiers.
- **Socket.IO :** ticket mémos lié à session/tenant/principal et portée ; vérifier à l'ouverture, à la réouverture et avant émission sensible, fermer lors de la révocation. Une validation du ticket uniquement à l'ouverture est insuffisante. Pub/sub peut accélérer la déconnexion mais ne remplace pas la validation autoritaire si un événement est perdu. Pas de cache positif prolongé si l'on exige une révocation immédiate des nouvelles actions.
- **Intégrateur :** réutiliser requireIntegrator et la vérification Master du couple token/contexte, déjà liés par hash (`integrator.route.ts:387–395`, `integrator.delegation.ts`). Propager cette preuve opaque jusqu'à l'API pour introspection, ne pas fabriquer de token manager depuis userGuid. Étendre le principal avec acteur réel, profil effectif, scope, durée et révocation du contexte ; autoriser les seules opérations prévues. Corriger explicitement le parcours Cloud délégué qui appelle aujourd'hui setAuthData sans access_token, avec un mode délégué vérifié distinct, pas en rendant setAuthData permissif.

**Accord demandé :** A renforcée ; autorité/lifecycle Master et Redis partagé ; identifiant aléatoire de session ; reconnexion des sessions historiques ; preuve humaine séparée du service sur le lien interne ; permissions exactes et mode intégrateur explicite. Aucun de ces choix n'est appliqué. Les tests obligatoires comprennent usurpation, accès API direct, utilisateurs inactifs, sessions expirées/révoquées, panne registre, médias, socket après logout et délégation inter-tenant/inter-profils.

## Lot 4 : journal durable minimal Master

### Structure et migration proposées

Une table explicite `xa_tenant_provisioning_operation` dans Master, créée par **migration manuelle additive distincte**, jamais par un sync au démarrage. Champs minimaux :

| Champ | Rôle |
|---|---|
| operation_id UUID PK | Identité stable de l'opération, conservée sur retry. |
| tenant_id FK xa_tenant(id) | Tenant concerné ; aucune suppression CASCADE des preuves. |
| state TEXT avec CHECK | ALLOCATED, CREATING, CREATED, BOOTSTRAPPING, VERIFIED, PUBLISHING, READY, REVIEW_REQUIRED. |
| database_name, database_owner, server_identity | Allocation immuable ; distinguer les serveurs ayant le même nom de base. |
| database_oid BIGINT nullable | OID observé après création, détecte un remplacement de base. |
| config_fingerprint, bootstrap_version | Config/version exacte, sans mot de passe en clair ni hash de mot de passe attaquable hors ligne. Utiliser une version de secret ou HMAC protégé si nécessaire. |
| creation_marker nullable | Marqueur administratif lié à operation_id ; pas un secret d'authentification. |
| revision BIGINT, owner_run_id UUID | Compare-and-set et identification de l'exécuteur ; pas une preuve de mort par simple TTL. |
| created_at, updated_at, error_code nullable | Diagnostic sans secret, pas de dump de configuration. |

Index unique partiel sur tenant_id pour les états non terminés (y compris REVIEW_REQUIRED), FK et CHECK contrôlés ; unicité d'allocation serveur/base pendant une opération active. Une tentative READY n'autorise pas implicitement une nouvelle création pour ce tenant. Un journal d'événements séparé est facultatif, pas nécessaire au correctif minimal.

Migration Master : préflight/table inexistante ou compatible, création/addition idempotente, contraintes/index, droits du seul rôle de provisioning ; pas de backfill inventant une preuve de création pour les anciennes bases. L'applicatif doit refuser le provisioning si le journal n'est pas disponible, sans rendre indisponibles les autres fonctions Master. Ne pas inscrire cette table dans un mécanisme historique qui exécuterait sync automatiquement. Aucune modification de schéma métier tenant requise pour ce journal ; le marqueur de nouvelle base peut être un COMMENT administratif.

### Verrou et transitions

Conserver la clé advisory tenant actuelle (3701, tenantGuid), exercée entre deux processus dans les tests. Les changements de journal doivent être committés dans des transactions Master dédiées, **pas annulés avec le verrou englobant après qu'un CREATE DATABASE a réellement réussi**. Réutiliser le verrou actuel implique une connexion tenant-lock et une connexion de journal séparées ; vérifier la capacité du pool et borner les attentes. L'alternative verrou de session sur connexion dédiée réduit ce besoin, mais constitue un choix d'implémentation à approuver. Ne pas laisser la connexion de verrou dans un pool sans déverrouillage maîtrisé.

Chaque transition vérifie tenant/opération/revision/config/OID ; une erreur/perte de verrou arrête tout nouvel effet. Un heartbeat ou un verrou Master perdu ne prouve pas qu'un ancien processus a arrêté ses connexions tenant : **aucune prise de relais automatique d'un bootstrap possiblement encore actif**.

Transitions normales : `ALLOCATED → CREATING → CREATED → BOOTSTRAPPING → VERIFIED → PUBLISHING → READY`. Échec/état contradictoire : `→ REVIEW_REQUIRED`. Les étapes déjà confirmées ne sont pas rejouées ; retry conserve operation_id. Une opération historique sans preuve reste une ouverture existing, pas une création.

### Preuves et reprise

Une base « nouvelle » exige simultanément : allocation durable antérieure, absence vérifiée sous verrou avant création, succès de création confirmé, OID/propriétaire/serveur/config enregistrés et marqueur d'opération cohérent. Le commentaire seul, une base vide ou un nom récent ne prouvent rien. Un rôle administrateur compromis n'est pas couvert par ce marqueur opérationnel.

| Panne / état observé | Traitement |
|---|---|
| ALLOCATED, création non commencée, base toujours absente | Reprendre la création sous verrou avec la même allocation/version. |
| CREATING, réponse CREATE DATABASE perdue | Base absente après vérification fiable : nouvelle tentative contrôlée possible. Base présente sans preuve complète : REVIEW_REQUIRED, même vide. |
| CREATE confirmé et marqué, état CREATED durable, aucun bootstrap admis | Revalider preuve et absence de tables métier ; seul ce cas permet le bootstrap contrôlé d'une nouvelle base vide. |
| Crash entre CREATE et enregistrement OID/marqueur | Fenêtre incertaine assumée, revue manuelle ; aucun CREATE/DROP/DDL de rattrapage aveugle. |
| BOOTSTRAPPING interrompu ou exécuteur inconnu | Revue manuelle : vérifier fin de l'ancien exécuteur, preuve, version et catalogue. Schéma partiel => aucun sync de réparation. Même vide, ne pas reprendre tant qu'un autre bootstrap peut être actif. |
| Schéma complet mais VERIFIED non enregistré | Vérification complète en lecture seule et preuve d'exécuteur terminé ; promotion contrôlée après réconciliation, jamais nouveau sync. |
| VERIFIED/PUBLISHING avec panne cache | Vérifier provenance et compatibilité en lecture seule, republier le cache de façon idempotente, puis READY. Aucun bootstrap. |
| READY et cache perdu | Reconstruire le cache depuis l'état READY/config vérifiés ; existing uniquement. |
| Base historique sans preuve, OID changé, autre opération ou config/version contradictoire | Existing si historique compatible ; sinon REVIEW_REQUIRED. Aucune attribution rétroactive à l'opération courante ni réparation silencieuse. |

Pour les tenants historiques déjà en service, ne pas exiger une preuve de création rétroactive : leur accès existing compatible reste autorisé. Le journal manquant bloque la création/reprise automatique incertaine, pas toutes les fonctions des tenants existants. Ne publier `active/ready` pour un nouveau provisioning dans le cache qu'après VERIFIED. Un cache existant publié avant l'échec ne constitue pas une preuve de readiness ; à réconcilier avant admission. Les changements de configuration/génération restent coordonnés avec les pools V01. Les tâches doubles sont empêchées par verrou + journal/CAS, pas par une Map Node.

**Décisions à approuver :** table/index/permissions et migration Master séparée ; marqueur/OID et empreinte de config ; choix de verrou/connexion et transactions de journal durables ; publication cache après VERIFIED ; revue manuelle obligatoire des fenêtres incertaines et des schémas partiels. Aucun DROP automatique et aucun sync de rattrapage historique.
