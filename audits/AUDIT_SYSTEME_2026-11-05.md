# Audit Toké — 5 novembre 2026

Mise à jour du périmètre : après remplacement du client cloud par sa version réelle, une revue complémentaire a été réalisée dans [AUDIT_CLOUD_2026-11-05.md](./AUDIT_CLOUD_2026-11-05.md). L’exclusion du cloud ci-dessous décrit le périmètre de la revue initiale ; le complément couvre désormais cette nouvelle version.

## Périmètre et méthode

Revue du code de l’API master/tenant, de la passerelle backend, du package partagé, de la configuration de lancement et de certaines vérifications du solveur OR-Tools. `packages/cloud` est exclu. Aucun correctif applicatif, appel aux bases réelles ou lancement des services métier. Le rapport du 4 novembre a servi de point de départ ; les constats de code ci-dessous ont été relus dans le workspace actuel. Les anciennes reproductions ne sont pas présentées comme de nouveaux tests.

## Verdict

Les défauts les plus urgents concernent l’isolation entre entreprises et l’authentification de la passerelle. Une compilation réussie ne protège pas contre ces défauts. Leur exploitation depuis Internet dépend de l’exposition réelle des services et des protections de déploiement, non vérifiées ici.

Priorités : P0 = correction/confinement immédiat ; P1 = avant prochaine mise en production ; P2 = fiabilisation à planifier.

## Constats confirmés dans le code actuel

### 1. P0 — Contexte tenant global partagé entre requêtes

Références : `packages/api/src/tenant/database/db.tenant-manager.ts:19`, `packages/api/src/middle/tenant.middleware.ts:74`, `packages/api/src/tenant/database/db.initializer.ts:51` et `:88`.

`currentTenant` est statique. Le middleware le définit puis attend la connexion et l’initialisation ; les modèles retrouvent ensuite leur tenant via cette même variable globale. Pendant une attente de A, B peut remplacer le contexte. Cela permet de sélectionner la mauvaise base ou d’associer les modèles au mauvais tenant, même avec un seul processus Node.js.

Correction : contexte par requête avec `AsyncLocalStorage.run()` ou tenant/connexion explicitement transmis aux services. Initialisation des modèles avec tenant explicite. Validation attendue : deux entreprises exécutent simultanément des lectures et écritures après des attentes contrôlées, sans aucun croisement.

### 2. P0 — La passerelle accepte une référence d’entreprise sans session utilisateur

Références : `packages/backend/src/tools/tenant.config.ts:7`, `packages/backend/src/tools/integrator.delegation.ts:7`, `packages/backend/src/tools/api.factory.ts:26`, `packages/backend/app.ts`, `packages/backend/src/routes/memos.route.ts`.

`TenantConfig.authenticate()` exige uniquement un en-tête de référence, initialise `req.client.reference` et appelle `next()`. Le middleware global intégrateur laisse passer les requêtes sans contexte intégrateur. `Ensure` vérifie les méthodes HTTP, pas l’identité. La passerelle ajoute ensuite ses propres clés de service pour joindre l’API tenant.

Conséquence : sur les routes métier concernées, connaître une référence permet d’utiliser les privilèges de service sans prouver son identité utilisateur. Les GUID de superviseur/utilisateur envoyés par l’appelant ne constituent pas une authentification. Le ticket temps réel des mémos utilise lui aussi un `user_guid` fourni dans le corps.

Correction : session obligatoire sur les routes métier ; dériver tenant et acteur de cette session ; vérifier les droits sur chaque ressource. Exceptions explicites pour connexion et callbacks signés. Tester absence de session, acteur usurpé et ressource d’un autre tenant.

### 3. P0 — Proxy de fichiers vers une URL arbitraire avec clés de service

Références : `packages/backend/src/routes/memos.route.ts:22`, `packages/backend/src/services/user.service.ts:123`, `packages/api/src/utils/axios.config.ts:47`.

`GET /memo?url=...` transmet directement l’URL à `api.get()`. Une URL absolue remplace la destination de base ; l’intercepteur ajoute les en-têtes de clé et signature sans vérifier l’origine.

Conséquence : requêtes serveur vers une destination choisie par l’appelant, avec risque d’accès au réseau interne et d’envoi des identifiants de service vers un tiers. Aucun appel réseau offensif n’a été effectué pendant cette revue.

Correction : accepter un identifiant de pièce jointe et construire la destination côté serveur. Valider origine et chemin, contrôler les redirections, et ne jamais joindre les secrets à une origine arbitraire.

### 4. P1 — Cache contenant des secrets suivi par Git

Références : `packages/api/cache/clients.json`, `.gitignore`, `packages/api/src/tools/client.cache.service.ts`.

Vérification locale : le fichier est suivi ; il contient trois entrées avec token et secret non vides, dont une entrée root active. Aucune valeur secrète n’est reproduite ici. La validité des clés en production n’a pas été testée. Les caches QR et tenant ainsi que des pièces jointes sont également suivis.

Correction : renouveler/révoquer les clés si elles sont utilisées ; retirer les données d’exécution du suivi et les exclure ; stocker les secrets hors dépôt. Évaluer séparément le nettoyage de l’historique. Supprimer le fichier courant ne révoque aucune clé.

### 5. P1 — Le profil root contourne la signature API

Référence : `packages/api/src/middle/server-auth.ts:68`.

Le retour anticipé `if (clientConfig.profile.root) return next()` intervient avant la vérification HMAC et avant l’initialisation de `req.client`. Le token root seul franchit ce middleware ; les handlers dépendant de `req.client` peuvent ensuite échouer.

Correction : vérifier la signature et initialiser l’identité pour tous les profils ; réserver root aux décisions d’autorisation. Ajouter un test root sans signature, signature invalide et identité correctement propagée.

### 6. P1 — QR : référence utilisée comme clé et journalisation cryptographique sensible

Références : `packages/api/src/utils/encryption.ts:3`, `:49`, `:80`, `packages/api/src/tenant/routes/auth.route.ts:93`.

Le QR est déchiffré avec la référence d’entreprise comme clé. La normalisation copie cette référence dans un tampon de 32 octets ; AES-CBC est utilisé sans MAC. Le déchiffreur journalise aussi le contenu et la clé personnalisée. Une référence connue de l’appelant ne fournit pas une preuve d’identité. Cela ne démontre pas à lui seul le contournement de toutes les étapes OTP.

Correction : challenge serveur court, lié au tenant et à une session mobile authentifiée, consommation atomique et mécanisme cryptographique authentifié. Supprimer les logs sensibles et prévoir la compatibilité/migration mobile.

### 7. P1 — Uploads en mémoire sans plafond de taille

Référence : `packages/backend/src/routes/memos.route.ts:20` et `:60`.

`multer()` utilise la mémoire sans `limits`. Le maximum de dix fichiers ne borne pas le nombre d’octets. Le backend reconstruit ensuite un multipart à partir des buffers. Une limite dans l’API aval n’empêche pas l’épuisement préalable de mémoire de la passerelle.

Correction : limiter taille des fichiers/champs au point d’entrée, borner concurrence et débit, privilégier un flux ou un stockage temporaire borné. Tester le rejet avant traitement aval.

### 8. P2 — Validation globale non opérationnelle

Références : `package.json`, `packages/api/package.json:7`, `packages/backend/package.json:7`, `packages/api/verification/run-tests.cjs:2`.

Les scripts API/backend `test` échouent volontairement ; `type-check` manque dans ces deux packages. Le lanceur de vérification, exécuté pendant cet audit, s’arrête sur `packages/api/tests/views.test.cjs` absent. L’environnement Python existant ne contient pas pytest. Les vérifications disponibles restent fragmentées.

Correction : commandes maintenues par composant, agrégateur excluant cloud, dépendances de test déclarées et CI depuis un checkout propre. Éviter de traiter les scripts de gestion qui créent des clients ou profils comme des tests isolés.

### 9. P2 — Gestion des processus fragile

Références : `packages/api/src/master/server.ts:8` et `:51`, `packages/api/src/tenant/server.ts:7` et `:50`, `ecosystem.config.cjs`.

Master et tenant partagent `server.pid` dans le même répertoire. Le contrôle emploie en plus `require('fs')` dans un package ESM ; l’erreur est capturée comme un PID obsolète. La détection et l’arrêt par PID deviennent peu fiables.

Correction : laisser PM2 gérer les PID ou utiliser des fichiers distincts et des imports ESM. Unifier les gestionnaires d’arrêt pour fermer tâches, sockets et connexions.

### 10. P2 — Host d’écoute ignoré et chemin de cache imposé

Références : `packages/backend/app.ts:84`, `packages/api/src/tenant/app.ts:91`, `packages/api/src/master/app.ts:117`, `packages/api/src/tools/tenant-cache.service.ts:33`.

Les appels `listen(port)` omettent le host configuré : définir localhost ne restreint donc pas l’interface d’écoute. Le cache tenant utilise un chemin absolu `/opt/toke/...`, ce qui rend l’exécution dépendante de l’arborescence du serveur.

Correction : transmettre le host et rendre le chemin configurable. Valider les interfaces ouvertes après lancement.

### 11. P2 — Le scénario OR-Tools sur huit semaines échoue

Référence : `packages/planning-ortools/tests/test_long_horizon_continuity.py:167`.

Exécution directe avec `PYTHONPATH=. .venv/bin/python tests/test_long_horizon_continuity.py` : échec de l’assertion, réponse `INFEASIBLE` alors que le test attend `OPTIMAL` ou `FEASIBLE`, huit semaines et une couverture complète. Le solveur indique avoir prouvé l’impossibilité avec les contraintes fortes du scénario. Ce résultat ne permet pas de trancher entre une fixture impossible et une régression du moteur, ni de conclure que tous les horizons longs échouent.

Correction : isoler les contraintes rendant ce cas impossible, vérifier l’attente métier puis corriger la fixture ou le moteur. Conserver un scénario réaliste de non-régression sur huit semaines.

## Vérifications de cette session

- `tsc --noEmit` : API, backend et shared passent avec l’installation et les artefacts présents. Un build vierge n’est pas certifié ; les scripts build n’ont pas été utilisés car ils effacent notamment des logs.
- `node --test packages/api/verification/schedule-suggestion-approval.test.cjs` : 10 tests réussis. Ils couvrent notamment protection de l’historique, dates d’application et rollback avec adaptateur transactionnel en mémoire ; ils ne valident pas l’isolation réelle de PostgreSQL ou les droits HTTP.
- `node packages/api/verification/run-tests.cjs` : échec confirmé, fichier `views.test.cjs` absent.
- `.venv/bin/python -m pytest --version` : échec, module absent.
- Test direct OR-Tools de continuité sur huit semaines : échec confirmé, `INFEASIBLE`.
- `git ls-files` et inspection sans affichage de valeurs : présence confirmée des caches/secrets suivis.

## Ordre de correction

1. Fermer le proxy arbitraire et imposer l’identité utilisateur sur la passerelle.
2. Corriger le contexte tenant et prouver l’isolation par tests concurrents.
3. Révoquer les clés concernées, retirer le bypass root et sortir les caches du dépôt.
4. Corriger QR et uploads.
5. Rétablir la validation automatisée, puis fiabiliser lancement et configuration.

## Limites

Audit ciblé du code et vérifications locales, sans test d’intrusion en ligne, base réelle, paiement, migration, ou modification métier. Configuration effective de production, reverse proxy/TLS, sauvegarde/restauration et inventaire CVE restent à auditer. Le solveur complet et l’ensemble des parcours fonctionnels ne sont pas certifiés par cette revue. Le client cloud n’a pas été audité.
