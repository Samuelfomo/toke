# LOT 3 — Étape A : socle local des sessions utilisateur

6 novembre 2026. Référence : [LOT3_CONTRAT_IMPLEMENTATION.md](./LOT3_CONTRAT_IMPLEMENTATION.md), architecture A renforcée. **Implémentation locale et tests de cette étape terminés ; aucune autorisation de production.** D1–D7, les délégations intégrateur et le provisioning ne sont pas implémentés.

## 1. Résultat et périmètre

Master émet désormais les preuves HMAC v2 après consommation unique d’un challenge OTP manager inscrit dans Redis. Le BFF ne possède plus de fonction d’émission depuis un GUID. La signature seule ne suffit plus : registre, expiration, tenant et compte actif sont contrôlés par Master. BFF et frontière API Tenant interrogent indépendamment cette autorité, sans cache positif de session. Le logout serveur révoque uniquement la preuve présentée.

**Les routes métier mémos et `/upload` de l’API restent fermées** : après authentification, réponse `503 memo_permissions_pending`, sans appel au middleware tenant ni SQL métier de la route. Même fermeture dans le routeur mémos BFF. Les tickets mémos sont refusés et les invalidations mémos Socket.IO suspendues. Les namespaces QR et les autres événements techniques Socket.IO ne sont pas remplacés. Cette fermeture temporaire évite de transformer une authentification réussie en droits mémos non approuvés ; elle ne constitue pas l’implémentation de leur ACL.

Les modifications Cloud existantes sont intactes. Aucun changement des règles de pointage, planning ou rotation ; leurs appels internes aux classes métier ne sont pas transformés en appels utilisateur HTTP. Aucun schéma modifié hors bootstrap des bases jetables par le banc préexistant ; aucune migration MemoReads exécutée.

## 2. Mécanismes implémentés

- Challenge manager : code cryptographique à six chiffres, clé dérivée par HMAC, TTL Redis 300 s, nonce pour comparaison atomique ; index par email et remplacement du challenge précédent. Aucun nouveau code clair journalisé par ces handlers. Le cache mémoire/fichier historique ne sert plus à ce parcours ; il n’a pas été supprimé pour ses autres usages. `/tenant/cache/stats` ne retourne plus les entrées détaillées.
- Consommation : lecture pour validation de l’identité active, puis script Redis comparant exactement le challenge avant inscription `SET NX EX` de la session et suppression du challenge. Un changement/une expiration pendant la validation fait échouer l’opération. Les droits Redis `SET` et `DEL` sont vérifiés avant écriture : un script Redis est atomique pour la visibilité mais **ne rollbacke pas ses écritures après une erreur**. Cette vérification évite notamment une session orpheline lorsque DEL est interdit. **Redis 7 ou supérieur nécessaire** pour `redis.acl_check_cmd` ; une version incompatible échoue fermée, sans fallback.
- Preuve : deux segments base64url, HMAC-SHA256 et comparaison constante, payload v2 `kind/iss/aud/kid/sid/userGuid/tenantGuid/subdomain/iat/exp`. SID aléatoire 32 octets ; durée maximale 86 400 s, pas de refresh ni prolongation glissante. `kind=manager` identifie le parcours de connexion, pas l’attribution d’un rôle métier.
- Registre : namespace `toke:auth:{manager-v2}:…`, identités/digest/état/expiration, même hash-slot pour les opérations atomiques. Le bearer n’est pas stocké. Preuve v1, GUID seul, session absente ou contradictoire refusés. Révocation conservée jusqu’à expiration, jamais réactivation à la lecture.
- Compte : vérification Master du tenant actif, du sous-domaine et de la référence cache ; lecture du véritable `User` via une opération tenant V01 explicite. `User._load` exclut les supprimés ; `isActive()` doit être vrai. Après cette attente SQL, nouvelle vérification Redis/expiration avant réponse d’introspection, pour ne pas publier une admission révoquée pendant l’attente.
- Service : introspection/logout réservés à une allowlist de clés applicatives actives et une signature HMAC technique fraîche, **y compris pour un client root**. Le secret de signature humaine reste côté Master. Les erreurs d’authentification du service remontent comme indisponibilité 503 au consommateur, sans être présentées comme expiration de sa session humaine.
- Disponibilité : configuration explicite, délais bornés, pas de localhost implicite, pas d’offline queue, pas de reconnexion/rejeu automatique d’une commande d’émission incertaine. Panne registre/introspection => 503, preuve invalide => 401, mauvais tenant => 403. Aucune admission par preuve locale seule.
- Limitation actuelle des handlers : envoi et retry 5/900 s par clé d’identité, vérification 30/300 s par IP vue par Master. Un BFF partagé peut concentrer ce dernier quota : à calibrer avant release, sans faire confiance à un en-tête IP fourni par le navigateur. Il n’existe pas de compteur par utilisateur sur un code incorrect seul, puisque le contrat de vérification historique ne transmet pas de challenge ID.

## 3. Fichiers modifiés pour cette étape

Les chemins ci-dessous sont relatifs à la racine du dépôt. Ils décrivent **cette intervention**, pas l’ensemble du diff historique déjà présent dans le workspace.

| Ensemble | Fichiers | Objet |
|---|---|---|
| Nouveaux modules API | `packages/api/src/tools/user-session.authority.ts`, `user-session.client.ts`, `user-session.runtime.ts` | Autorité pure injectable, client d’introspection sans dotenv, adaptation Redis et compte actif réel. |
| Nouvelles frontières API | `packages/api/src/master/routes/user-session.route.ts`, `packages/api/src/middle/manager-session.ts` | Authentification du service, introspection/logout ; vérification humaine puis fermeture des routes mémos. |
| Assemblage API | `packages/api/src/master/app.ts`, `packages/api/src/tenant/app.ts` | Montage après authentification applicative, avant résolution tenant pour la frontière mémos. |
| OTP Master | `packages/api/src/master/routes/tenant.route.ts` | Seulement handlers manager auth/verify/retry, imports associés et retrait des entrées détaillées des stats. Aucun handler de provisioning modifié pendant cette étape. |
| BFF | `packages/backend/src/tools/user.session.ts`, `tenant.config.ts`, `routes/tenant.route.ts`, `routes/memos.route.ts` | Fin de l’émission locale, vérification autoritaire, relais OTP, logout serveur et fermeture mémos. |
| Temps réel | `packages/api/src/realtime/SocketAuth.ts`, `MemoEventsService.ts` | Refus des anciens tickets mémos et suspension des invalidations mémos pendant cette étape. |
| Nouveau banc | `packages/api/verification/user-sessions/{run,load,child,scenarios,otp-http}.cjs` | Redis privé, source loader fermé, concurrence interprocessus, HTTP réel et handlers OTP sélectionnés. |
| Banc PostgreSQL existant | `packages/api/verification/tenant-isolation/postgres-user-session.cjs`, `postgres-integration.cjs`, `provisioning-http-fixture.cjs` | Ajout du test du résolveur de compte ; injection fermée des nouveaux imports auth dans le fixture de provisioning. Aucune assertion de provisioning retirée. |

Les huit fichiers centraux V01 (ALS, propriété, SQL guard, manager, initialiseur, BaseModel, config tenant et middleware tenant) sont **identiques octet pour octet** aux empreintes du candidat clôturé. Preuve : [LOT3_ETAPE_A_EMPREINTES.json](./LOT3_ETAPE_A_EMPREINTES.json). Les algorithmes worker et CLOCK_IN n’ont pas été modifiés.

## 4. Contrats et configuration

| Parcours | Contrat actuel de cette étape |
|---|---|
| `POST /tenant/auth` et `/tenant/retry` | Routes et enveloppes de succès conservées. Retry émet un **nouveau** code et invalide le précédent, au lieu de renvoyer le même code encore valable. Challenge absent/expiré : nouvelle authentification nécessaire. |
| `GET /tenant/verify-otp/:otp`, Master puis BFF | `{success:true,data:{message,user,tenant,access_token,token_type:'Bearer',expires_in:86400}}`. Master émet ; BFF vérifie la session et relaie. Réponse `Cache-Control: no-store`. L’URL historique portant l’OTP reste à masquer dans les journaux proxy/observabilité avant release. |
| `POST /auth/session/introspect` Master | Service signé et allowlist obligatoires ; body `{token,tenantGuid?,subdomain?}`, au moins une cible obligatoire. Réponse minimale `{success:true,data:{principal}}`. Deux cibles fournies doivent être cohérentes. |
| `POST /auth/session/logout` Master | Service signé ; body `{token}`. Révocation idempotente ; `{success:true,data:{revoked:true}}`. Une preuve mal signée ne peut pas révoquer un autre SID. Une preuve authentique déjà expirée ne renouvelle rien. |
| `POST /tenant/session/logout` BFF | Bearer manager présenté, aucun GUID de session à choisir dans le body ; appelle le logout Master. Erreur 503 si la révocation distante n’est pas confirmée. **Le branchement du bouton logout Cloud n’est pas effectué dans cette étape de socle.** |
| Frontière API Tenant mémos/upload | Preuve humaine dans `X-Toke-User-Session`, distincte des credentials de service. Cible issue du même extracteur de routage que V01, comparée à la preuve. Les routes restent fermées après vérification ; le transfert BFF→API pour leurs futures opérations sera câblé lors de l’étape autorisations, pas par un GUID. |

Configuration nouvelle, **aucun fichier réel changé** :

- Master : `USER_SESSION_SECRET` (clé >=32 octets, existante à fournir explicitement à cette autorité), `USER_SESSION_SERVICE_KEYS` (allowlist technique), `USER_SESSION_REDIS_SOCKET` **ou** `USER_SESSION_REDIS_HOST`/`PORT`, et selon l’installation `USERNAME`, `PASSWORD`, `TLS` sous le même préfixe `USER_SESSION_REDIS_`.
- BFF et API Tenant : `USER_SESSION_MASTER_URL`, `USER_SESSION_SERVICE_KEY`, `USER_SESSION_SERVICE_SECRET`. URL explicite de l’autorité ; HTTPS ou transport interne réellement protégé à vérifier avant production. Pas de credentials de production copiés dans le banc.
- Redis commun aux autorités Master, sans registre mémoire par processus ; primaire autoritaire et ACL permettant les scripts/commandes requis, dont contrôles préalables. Les privilèges d’administration des utilisateurs Redis utilisés pour provoquer des fautes dans le banc ne sont **pas** requis par l’application.
- Version de clé v2 fixe pour cette étape. Rotation opérationnelle des clés, durabilité Redis et prévention de résurrection de sessions lors d’un failover/restauration restent à valider avant release ; aucun mécanisme multi-clés non testé annoncé ici.

## 5. Tests exécutés et preuves

Prévol : Redis **8.0.3** présent, sans installation. Le sandbox a refusé le bind Unix ; l’essai a été arrêté/nettoyé. Exécution locale ensuite autorisée au niveau outil pour le même banc privé. Redis `--port 0`, socket dans un dossier `/tmp/toke-l3-redis-*` mode 0700, persistance désactivée, propriétaire marqué ; aucun serveur existant adressable. Le client du banc n’accepte que ce socket. Les HTTP fictifs sont sur loopback et le chargeur refuse toute autre destination ; secrets et identités sont fictifs.

| Commande / niveau | Résultat final |
|---|---|
| `node packages/api/verification/user-sessions/run.cjs --create-disposable-redis` | **20 scénarios réussis, sortie 0**, Redis/HTTP véritables ; détails ci-dessous. |
| `node packages/api/verification/tenant-isolation/run.cjs` | **58/58 réussis, sortie 0** ; invariants V01, SQL/pilote inerte et frontières métier déjà couvertes. |
| `node packages/api/verification/tenant-isolation/run.cjs --framework-probes` | **15/15 réussis, sortie 0**. Sondes de framework, pas substituts des critères d’acceptation. |
| `env PATH="/Applications/Postgres.app/Contents/Versions/16/bin:$PATH" node packages/api/verification/tenant-isolation/postgres-integration.cjs --create-disposable-cluster --skip-memo-migration` | **Sortie 1 conservée**, uniquement `PROVISIONING_RECOVERY_REQUIRED`. Nouveau test compte actif PostgreSQL réussi ; autres scénarios isolation/métier/worker/pointage et lifecycle réussis. Migration MemoReads explicitement non exécutée. |
| `node packages/api/verification/tenant-isolation/build-types-isolated.cjs` | **Shared/API/BFF réussis, sortie 0**, émission dans un répertoire temporaire, aucun `dist` actif remplacé. Cloud inchangé ; pas de build Cloud revendiqué. |

Les 20 scénarios du banc Redis :

1. OTP correct, session v2 réellement inscrite et enveloppe attendue ; seconde consommation refusée.
2. OTP incorrect et malformé refusés.
3. OTP réellement expiré dans Redis refusé.
4. Deux **processus Node distincts**, départ synchronisé : exactement une consommation réussie.
5. SET interdit par ACL Redis pendant l’émission : 503, aucune session ajoutée, OTP encore utilisable.
6. DEL interdit par ACL : contrôle préalable, aucune session orpheline, OTP encore utilisable.
7. Preuve v2 correctement signée mais entrée supprimée : refus.
8. Révocation pendant une attente contrôlée du résolveur actif : admission finale refusée.
9. Token altéré, v1 signé et GUID seul : refus.
10. Mauvais tenant et contradiction du registre : refus.
11. Utilisateur inactif et session expirée : refus (horloge contrôlée pour les 24 h, pas attente réelle d’une journée).
12. Introspection Master réservée au service signé allowlisté, clé root seule insuffisante.
13. Mauvaise signature de service : 503 côté consommateur, sans faux diagnostic d’expiration utilisateur.
14. Véritables handlers sélectionnés OTP/retry/logout Master et BFF par HTTP : nouveau code, ancien code refusé, réponse et headers préservés, logout réellement révoqué.
15. Deux instances HTTP BFF indépendantes, même autorité/registre ; pas de fallback GUID.
16. Vingt requêtes A/B simultanées, même GUID utilisateur dans deux tenants : identité tenant correcte.
17. Logout par la façade BFF, deux instances refusant ensuite la preuve ; idempotence.
18. Frontière API vérifiée indépendamment, absence/preuve erronée refusées, casse de route incluse ; session valide ne rouvre pas les routes mémos.
19. Arrêt réel du **seul Redis possédé par le banc** : autorité et deux BFF refusent fermés avec 503.
20. Noms DNS légitimes comportant des tirets consécutifs acceptés, sans modifier le routage V01.

Distinction des preuves : dans ce banc, les résolveurs de compte sont des fixtures ; les deux BFF sont deux serveurs/chargeurs distincts **dans un même processus**, alors que la course de consommation utilise deux processus. Le test HTTP OTP exécute les registrations sélectionnées du source réel sans importer le serveur complet : catalogue Master, email, recherche initiale et middleware technique Ensure sont injectés. Le middleware d’authentification du service d’introspection et les HMAC sont réels. Aucun email réel envoyé.

Le nouveau scénario **PostgreSQL réel fictif** exécute séparément `assertManagerIdentityActive` et les véritables `User`, Sequelize et pg : 12 vérifications A/B concurrentes, inactivation puis suppression logique dans A sans affecter B, tenant Master inactif et référence cache contradictoire refusés avant SQL tenant, aucun contexte conservé. Seuls catalogue/configuration Master et Redis importable sont injectés ; aucune connexion Redis n’est ouverte par ce scénario. Il ne s’agit donc pas d’un parcours complet SMTP→Master réel→Redis→BFF→API dans un seul déploiement.

Journaux conservés : [Redis](./LOT3_ETAPE_A_REDIS.log), [PostgreSQL](./LOT3_ETAPE_A_POSTGRESQL.log), [V01](./LOT3_ETAPE_A_V01.log), [sondes](./LOT3_ETAPE_A_FRAMEWORK.log), [TypeScript](./LOT3_ETAPE_A_TYPES.log). Empreintes des sources et journaux dans le JSON associé. Les premiers essais ont révélé deux défauts du **banc** (fetch non injecté, interop default d’un mock) et une erreur TypeScript initiale (`User.toJSON()` asynchrone) : corrigés avant les exécutions finales. Aucun garde V01 contourné.

Nettoyage : tous les processus enfant du banc Redis terminés ; cluster PostgreSQL arrêté par son lanceur, dossier propriétaire supprimé malgré l’échec métier attendu. Contrôle final : aucun répertoire `/tmp/toke-l3-redis-*`, `/tmp/toke-redis-probe-*` ou `/tmp/v01-pg-*` restant. Aucune commande de service système, production ou migration réelle.

## 6. Limites et suite soumise à validation

- **Le lot 3 n’est pas terminé et cette release n’est pas déployable** : les mémos HTTP/upload/temps réel sont volontairement fermés ; D1–D7 et les grants intégrateur restent à approuver/implémenter séparément. Aucun fallback pour les délégations ou sessions historiques.
- Le Cloud n’appelle pas encore le nouveau logout serveur : l’endpoint est prêt et testé, mais une déconnexion locale actuelle ne doit pas être présentée comme une révocation distante confirmée. Branchement et comportement multi-onglets à réaliser dans une étape explicitement validée.
- Les sessions anciennes non enregistrées et challenges manager historiques ne sont pas importés ; nouvel OTP obligatoire. Les autres mécanismes d’authentification hors frontières de cette étape ne sont pas déclarés sécurisés par ce travail.
- Le montage complet avec vrais processus Master/BFF/Tenant et services techniques configurés, deux processus BFF réels, TLS/proxy/Redis durable, livraison email et charge OTP restent à valider en environnement fictif avant toute release. Aucune hypothèse sur un Redis de production existant.
- La sonde historique `memo-contract-review.cjs` conserve son scénario v1 (`UserSessionService.create`) comme preuve de l’ancien état ; elle n’a pas été exécutée ni comptée comme validation de cette étape. Ce scénario n’est plus compatible avec la façade BFF v2. Le banc `user-sessions` constitue la nouvelle recette du protocole ; les autres tests mémos devront être repris lors de leur étape dédiée.
- Une révocation interdit les admissions suivantes ; elle ne retire pas les octets ou effets d’une opération déjà admise. Une réponse perdue après consommation atomique peut nécessiter un nouvel OTP ; aucune réémission/rejeu automatique d’une session à issue incertaine.
- Réserve séparée du lot 4 : `PROVISIONING_RECOVERY_REQUIRED` toujours rouge. Ni suppression du test, ni réparation du provisioning, ni recette globale présentée comme verte.

**Point d’arrêt :** le socle est implémenté et ses tests locaux ci-dessus sont exécutés. Attendre la validation utilisateur avant de poursuivre permissions mémos, délégations ou autres travaux. Aucun transfert, déploiement ou accès production autorisé/effectué.
