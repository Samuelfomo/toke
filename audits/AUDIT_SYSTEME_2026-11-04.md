# Audit du système Toké — 4 novembre 2026

Périmètre : `packages/api` (master, tenant, temps réel et tâches), `packages/backend`, `packages/shared`, `packages/planning-ortools` et configuration de lancement. Le client `packages/cloud` est exclu.

Audit du code présent dans le répertoire de travail, y compris les modifications locales déjà présentes. Aucun correctif métier appliqué. Les secrets ne sont pas reproduits dans ce rapport.

## Conclusion

Le système possède une séparation fonctionnelle utile et des protections transactionnelles sur la publication des suggestions. Cependant, son isolation multi-tenant et l'authentification de la passerelle présentent des défauts critiques. Je déconseille d'élargir l'exposition du service avant de corriger les trois premiers constats.

La compilation réussie ne valide ni les droits d'accès ni l'isolation des requêtes. Les constats ci-dessous reposent sur la lecture du code et, lorsque précisé, sur des reproductions locales isolées sans réseau et sans base de données.

Priorités : **P0** = confinement/correction immédiate ; **P1** = correction avant prochaine mise en production ; **P2** = fiabilisation à planifier rapidement. La portée réelle en production dépend des routes exposées, du reverse proxy et des clés effectivement déployées, non vérifiés ici.

## 1. P0 — Le tenant courant est partagé entre toutes les requêtes

Références :
- `packages/api/src/tenant/database/db.tenant-manager.ts:19`
- `packages/api/src/middle/tenant.middleware.ts:74`
- `packages/api/src/tenant/database/db.initializer.ts:51` et `:87`
- `packages/api/src/tenant/database/db.base.ts:36`

`currentTenant` est un champ statique global. Le middleware le modifie avant plusieurs `await`, puis les modèles relisent cette variable pour choisir leur base. Une requête B peut donc changer le tenant pendant qu'une requête A attend une connexion ou une requête SQL. Le problème existe avec une seule instance Node.js : les traitements asynchrones s'entrelacent.

À l'initialisation, la clé de tenant choisie par `TableInitializer.initialize(connection)` peut également ne plus correspondre à la connexion passée.

**Reproduction locale confirmée :** A définit son tenant puis attend ; B définit le sien ; A reprend et lit B. Aucun accès à une vraie base n'a été nécessaire.

**Impact :** lecture ou écriture dans la base d'une autre entreprise, incohérence entre connexion et modèles, corruption potentiellement silencieuse.

**Correction :** propager un contexte par requête avec `AsyncLocalStorage.run()` ou passer explicitement tenant/connexion aux services. Faire dépendre l'initialisation des modèles d'un tenant explicite. Ajouter un test concurrent avec deux bases distinctes, incluant des écritures après attente.

## 2. P0 — La passerelle confond référence d'entreprise et authentification

Références :
- `packages/backend/src/tools/tenant.config.ts:8`
- `packages/backend/src/tools/integrator.delegation.ts:7`
- `packages/backend/src/tools/api.factory.ts:29`
- `packages/backend/src/routes/user.route.ts:17`
- `packages/api/src/tenant/routes/schedule.suggestion.route.ts:555`

`TenantConfig.authenticate()` vérifie seulement la présence de `x-api-client` ou `x-api-reference`, puis appelle `next()`. Il n'exige aucune session utilisateur. Le middleware intégrateur laisse également passer les appels sans `x-integrator-context` ; il ne protège donc pas les appels ordinaires.

Les services de la passerelle ajoutent ensuite leurs propres clés API aux requêtes vers l'API tenant. Les identifiants `manager`/`supervisor` transmis par l'appelant ne prouvent pas son identité. Par exemple, la route tenant d'approbation transmet un GUID de suggestion au service sans acteur authentifié ni contrôle de propriété dans ce handler.

**Reproduction locale confirmée :** `TenantConfig.authenticate()` accepte une référence seule, sans token ni session.

**Impact :** un appelant connaissant une référence valide peut utiliser les privilèges de la passerelle sur les routes concernées. Les contrôles de format, de rôle du manager désigné ou de cohérence entre deux GUID fournis par le même appelant ne suffisent pas.

**Correction :** authentifier la session sur les routes métier ; dériver tenant et acteur de cette session ; vérifier les droits et la propriété des ressources. Conserver des exceptions explicites pour l'initiation de connexion et les callbacks signés. Tester absence de session, tenant différent et usurpation de manager.

## 3. P0 — Le proxy de fichiers permet une SSRF et la fuite des en-têtes API

Références :
- `packages/backend/src/routes/memos.route.ts:22`
- `packages/backend/src/services/user.service.ts:123`
- `packages/api/src/utils/axios.config.ts:47`

`GET /memo?url=...` transmet l'URL fournie à `api.get(data)`. Axios accepte une URL absolue qui remplace `baseURL`. L'intercepteur ajoute malgré tout `X-Api-Key`, `X-Api-Timestamp` et `X-Api-Signature`.

**Reproduction locale confirmée :** avec un adaptateur Axios simulé, une URL absolue vers `127.0.0.1` est acceptée et reçoit les en-têtes API factices. Aucun appel réseau ni secret réel utilisé.

**Impact :** accès aux services accessibles depuis le backend et envoi des identifiants API à un serveur choisi par l'appelant. Ce risque est amplifié par le constat 2.

**Correction :** recevoir un identifiant de pièce jointe et construire le chemin côté serveur ; limiter strictement origine et chemin ; bloquer les redirections hors origine. Ne jamais joindre des clés de service à une destination fournie par le client.

## 4. P1 — Des secrets API et des données d'exécution sont versionnés

Références :
- `packages/api/cache/clients.json`
- `packages/api/src/tools/client.cache.service.ts:31`
- `packages/api/cache/auth-qr-cache.json`
- `.gitignore`

`git ls-files` confirme que le cache clients est suivi. Il contient trois enregistrements avec `token` et `secret` non vides ; tous sont marqués actifs, dont un profil root. Le service charge effectivement ce fichier pour authentifier les clients. Leur validité sur les serveurs déployés n'a pas été testée.

Le dépôt suit également un cache QR et des fichiers de pièces jointes. Les contenus personnels éventuels n'ont pas été examinés.

**Impact :** les lecteurs du dépôt et de son historique disposent de matériel d'authentification potentiellement exploitable. Les journaux du middleware/cache affichent aussi des tokens lors de certains échecs.

**Correction :** révoquer/renouveler les clés concernées si elles sont encore utilisées, retirer les caches et pièces jointes du suivi, compléter les exclusions et gérer les secrets hors dépôt. Évaluer ensuite le nettoyage de l'historique. Une suppression du dernier commit ne révoque pas une clé.

## 5. P1 — Le profil root contourne la vérification de signature

Référence : `packages/api/src/middle/server-auth.ts:68`.

Après chargement du client, `if (clientConfig.profile.root) return next()` intervient avant la vérification HMAC et avant l'initialisation de `req.client`.

**Impact :** le token root seul suffit à franchir ce middleware ; les handlers qui attendent `req.client` peuvent aussi échouer. Le cache versionné contient précisément un profil root marqué actif.

**Correction :** exiger la signature pour tous les clients et toujours initialiser l'identité. Le privilège root doit affecter les autorisations, sans supprimer l'authentification.

## 6. P1 — Le chiffrement utilisé pour le QR ne constitue pas une preuve d'identité

Références :
- `packages/api/src/utils/encryption.ts:3`, `:49` et `:80`
- `packages/api/src/tenant/routes/auth.route.ts:92`

Le QR tenant est déchiffré avec la référence d'entreprise comme clé. `normalizeKey()` copie simplement cette référence dans un tampon de 32 octets. Une référence utilisée pour sélectionner l'entreprise ne doit pas servir de secret cryptographique. AES-CBC est employé sans MAC, et le déchiffrement journalise le contenu chiffré et la clé personnalisée.

**Reproduction locale confirmée :** un payload peut être chiffré puis accepté par le déchiffreur avec la seule référence, sans secret serveur. Cela établit la faiblesse de cette preuve, pas un contournement complet de toutes les étapes OTP.

**Impact :** fabrication de payloads QR tenant et divulgation de matériel sensible dans les logs ; l'identité ne doit pas reposer sur ce chiffrement.

**Correction :** lier l'approbation QR à une session mobile authentifiée, à un nonce serveur, au tenant et à une expiration ; consommer le challenge atomiquement. Utiliser un mécanisme authentifié (signature/MAC ou AEAD selon le protocole) avec un secret approprié. Supprimer la journalisation des clés. Prévoir la migration du protocole mobile.

## 7. P1 — Les uploads peuvent épuiser la mémoire du backend

Référence : `packages/backend/src/routes/memos.route.ts:20` et `:60`.

La passerelle utilise `multer()` sans stockage explicite ni limite de taille. Les fichiers sont donc conservés en mémoire. `upload.array('files', 10)` limite leur nombre, pas leurs octets. La limite de 50 Mo configurée dans l'API aval intervient après leur réception complète par la passerelle.

**Impact :** consommation de mémoire non bornée par requête, arrêt du processus ou redémarrages PM2. L'absence d'authentification utilisateur sur cette route aggrave le risque.

**Correction :** plafonner la taille des fichiers et des champs au point d'entrée ; préférer un transfert en flux ou un stockage temporaire borné ; limiter concurrence et débit. Aligner les limites du reverse proxy, de la passerelle et de l'API.

## 8. P2 — Le scénario de continuité du planning sur huit semaines échoue

Référence : `packages/planning-ortools/tests/test_long_horizon_continuity.py:167`.

Le test attend `OPTIMAL` ou `FEASIBLE`, huit groupes hebdomadaires et une couverture de 100 %. Le moteur retourne `INFEASIBLE`.

**Reproduction :** constaté lors de la découverte Python puis confirmé par exécution directe :

```sh
cd packages/planning-ortools
PYTHONPATH=. .venv/bin/python tests/test_long_horizon_continuity.py
```

**Impact :** le contrat attendu par ce scénario n'est plus satisfait. L'audit ne tranche pas entre une régression des contraintes et une fixture devenue impossible ; il ne démontre pas que tous les plannings longs échouent.

**Correction :** isoler la première semaine et la combinaison de contraintes qui rendent ce cas impossible, puis corriger le moteur ou documenter et remplacer l'attente de test. Conserver une régression réaliste sur huit semaines.

## 9. P2 — Les commandes de validation ne permettent pas une vérification globale fiable

Références :
- `package.json:44`
- `packages/api/package.json:7`
- `packages/backend/package.json:7`
- `packages/api/verification/run-tests.cjs:2`
- `packages/api/verification/renewal-preview.test.cjs:7`

Les scripts `test` de l'API et du backend échouent volontairement. Le lanceur `verification/run-tests.cjs` s'arrête sur `packages/api/tests/views.test.cjs`, absent. Plusieurs vérifications anciennes pointent vers des chemins qui ne correspondent plus à `src`. La commande racine `type-check` demande aussi un script absent de l'API et du backend.

Le répertoire Python mélange assertions exécutées à l'import et fonctions de test. `unittest discover` exécute les premières mais ne collecte pas automatiquement les fonctions libres ; un résultat global avec cet outil seul serait incomplet.

**Correction :** définir une commande maintenue pour chaque composant et un agrégateur hors client cloud ; utiliser un collecteur Python adapté ou uniformiser les tests. Faire échouer la CI sur les régressions réelles, avec une commande reproductible depuis un checkout propre.

## 10. P2 — Master et tenant partagent un fichier PID, avec un contrôle incompatible ESM

Références :
- `packages/api/src/master/server.ts:8` et `:51`
- `packages/api/src/tenant/server.ts:7` et `:50`
- `ecosystem.config.cjs`

Les deux processus utilisent le même `cwd` et le même `server.pid`. Chacun peut écraser ou supprimer celui de l'autre. Le contrôle utilise en plus `require('fs')` dans un package ESM ; sans adaptation, cette erreur est capturée et traitée comme un PID obsolète.

**Impact :** détection de doublons et arrêt externe non fiables ; PID d'un autre service supprimé ou remplacé.

**Correction :** laisser PM2 gérer les PID ou utiliser des fichiers distincts et les imports ESM existants. Un seul gestionnaire d'arrêt doit fermer sockets, tâches, caches et connexions ; les serveurs et les classes App enregistrent actuellement des handlers concurrents.

## 11. P2 — La configuration réseau et de cache limite la portabilité et le confinement

Références :
- `packages/backend/app.ts:84`
- `packages/api/src/tenant/app.ts:103`
- `packages/api/src/master/app.ts` (appel `listen`)
- `packages/api/src/tools/tenant-cache.service.ts:33`

Les serveurs configurent un host mais appellent `listen(port)` sans lui transmettre ce host. Une configuration localhost ne restreint donc pas l'écoute comme attendu. Le cache tenant est quant à lui fixé à `/opt/toke/packages/api/cache/tenants.json`, chemin absent du workspace actuel.

**Impact :** exposition sur des interfaces inattendues et dépendance au chemin du serveur de production pour le fonctionnement local.

**Correction :** transmettre explicitement le host et rendre le chemin de cache configurable avec une valeur par défaut adaptée. Vérifier les interfaces réellement ouvertes après lancement.

## Vérifications effectuées et points solides

- TypeScript : `tsc --noEmit` réussit sur API, backend et shared, avec les dépendances et artefacts déjà présents. Un build depuis un checkout vierge n'a pas été vérifié.
- Publication des suggestions : **10 tests passent**, incluant dates d'application, protection de l'historique, concurrence simulée et rollback. Le service utilise une transaction `SERIALIZABLE` et des verrous ; ces garanties sont utiles mais ne remplacent pas le contrôle d'accès.
- OR-Tools : les assertions à l'import des autres modules ont été exécutées pendant la découverte ; le scénario huit semaines échoue. Les **3 fonctions du contrat step17** ont aussi été appelées explicitement et passent. Ce n'est pas une certification complète du solveur.
- Le solveur est configuré pour écouter sur `127.0.0.1:8090` et borne le temps de recherche CP-SAT.
- Le callback de paiement de la passerelle est placé avant le parseur JSON pour préserver le corps signé ; sa sécurité complète n'a pas été validée par cet audit.
- Confirmations isolées hors réseau : partage du tenant courant, acceptation d'une référence sans session, URL absolue Axios avec ajout d'en-têtes factices et chiffrement avec une référence publique.

## Ordre de traitement recommandé

1. Bloquer les URL arbitraires du proxy de fichiers et authentifier les routes métier de la passerelle.
2. Isoler le contexte tenant par requête et tester deux entreprises en concurrence.
3. Renouveler les clés concernées, supprimer le bypass root et retirer les données d'exécution du dépôt.
4. Sécuriser le protocole QR, limiter les uploads et supprimer les logs sensibles.
5. Rétablir une suite de validation exécutable, résoudre le cas OR-Tools en échec et fiabiliser le lancement.

## Limites

Pas de test d'intrusion sur les services en ligne, d'accès aux bases réelles, de lancement des tâches métier, ni de mutation des paiements ou des tenants. Reverse proxy, TLS, sauvegardes/restauration, droits PostgreSQL, configuration de production et inventaire CVE en ligne restent à vérifier. Les constats ne supposent aucune vulnérabilité du client cloud, exclu du périmètre.
