# Audit du client cloud Toké — 5 novembre 2026

## Périmètre

Version de `packages/cloud` actuellement présente dans le workspace, y compris les ajouts et modifications locaux. Revue technique des sessions, du routage, des caches, des échanges HTTP/Socket.IO et des commandes de validation. Vérification des liens avec le backend déjà audité. Aucun fichier applicatif modifié, aucune requête vers les services en ligne, aucun paiement ni accès à une base réelle.

Ce document complète `AUDIT_SYSTEME_2026-11-05.md`, dont l’exclusion initiale du cloud est désormais levée pour cette version. Ce n’est pas une revue visuelle ou une certification exhaustive des parcours dans un navigateur.

## Conclusion

Le contrôle TypeScript passe, mais le build de production échoue dans l’environnement actuel. Le défaut d’authentification de la passerelle est confirmé par le vrai client : les appels manager ordinaires transmettent une référence d’entreprise sans preuve de session. Le cloud ajoute un défaut de confidentialité des caches de mémos entre utilisateurs et une séparation fragile entre l’identité intégrateur et l’identité manager.

P0 : correction/confinement immédiat ; P1 : avant prochaine mise en production ; P2 : fiabilisation à planifier. L’exposition réelle dépend du reverse proxy et du déploiement, non vérifiés.

## 1. P0 — Session manager déclarative et appels sans preuve de session

Références : `packages/cloud/src/stores/userStore.ts:97`, `:162`, `:297` ; `packages/cloud/src/tools/Fetch.Client.ts:41` ; `packages/cloud/src/router.ts:188` ; `packages/cloud/src/service/UserService.ts:133`.

La restauration considère un JSON `authData` comme une session. `checkSession()` accepte tout JSON parsable dont l’expiration ne déclenche pas le rejet : l’identité et l’expiration ne sont pas obligatoires. Une expiration manquante ne ferme pas la session. La sauvegarde crée une durée de sept jours, alors que le commentaire du routeur annonce 24 heures.

Le client HTTP ajoute `x-api-client` depuis le tenant du store. Il ajoute un Bearer uniquement en présence du token et du contexte intégrateur ; il ne transmet aucune preuve de session manager ordinaire. Les GUID d’acteur/superviseur viennent également du client. Le backend relu précédemment accepte précisément cette référence seule.

**Reproduction locale :** exécution du vrai store transpilé avec Vue/Pinia, stockage simulé et services remplacés ; `authData = {}` suffit pour que `checkSession()` retourne `true`. Cela prouve le contournement du garde local, pas la réussite de toutes les vues avec un objet vide. En complétant les informations d’identité connues, l’absence de session côté passerelle reste le problème de sécurité principal.

**Correction :** session délivrée et contrôlée par le serveur après OTP/QR ; acteur et tenant dérivés de cette session côté backend. Pour le navigateur, préférer une session en cookie HttpOnly sécurisé avec protection CSRF adaptée. Le garde frontend ne doit servir qu’à la navigation. Vérifier le schéma des données restaurées, l’expiration, la révocation et les réponses 401. Ce constat prolonge le constat 2 du rapport système ; ce n’est pas une faille indépendante à additionner artificiellement.

## 2. P1 — Mémos du précédent utilisateur conservés après déconnexion

Références : `packages/cloud/src/stores/userStore.ts:319` ; `packages/cloud/src/stores/memoStore.ts:234`, `:288`, `:423` ; `packages/cloud/src/views/components/header.vue:217` et `:274`.

La déconnexion vide le store utilisateur et le cache équipe, mais pas le store mémo. Le démontage du header arrête le temps réel sans vider les mémos. La persistance utilise une clé globale `memo-store`, sans tenant ni utilisateur. `loadMemos(managerGuid)` renvoie le cache existant sans vérifier à quel manager il appartient ; sa promesse en cours est aussi globale.

**Reproduction locale :** initialisation du vrai store mémo avec un mémo A factice et un cache récent, appel du vrai `userStore.logout()`, puis `loadMemos('manager-B')`. Le résultat contient encore le mémo A, sans appel au service. Cela confirme une fuite possible sur un navigateur partagé ou lors d’un changement de profil intégrateur.

**Correction :** vider les données et la persistance à la déconnexion/changement d’identité ; identifier tous les caches et promesses par tenant + acteur ; annuler ou ignorer les réponses appartenant à une ancienne session. Préférer l’absence de persistance des mémos et données RH sensibles. Tester connexion A, déconnexion, connexion B, et réponse A arrivant après la connexion B.

## 3. P1 — Le profil intégrateur devient une identité manager persistante

Références : `packages/cloud/src/stores/integratorStore.ts:70`, `:79`, `:107` ; `packages/cloud/src/service/IntegratorService.ts:10` ; `packages/cloud/src/stores/userStore.ts:158` ; `packages/cloud/src/router.ts` ; `packages/cloud/src/views/components/header.vue:217`.

Le token et le contexte intégrateur sont dans `sessionStorage`, tandis que `enterProfile()` sauvegarde le profil délégué dans `authData` en `localStorage` pour sept jours. Un nouvel onglet ouvert sans copie du sessionStorage peut donc restaurer ce profil alors qu’il ne dispose plus du contexte intégrateur. Les routes manager ne valident pas la session intégrateur ; l’intercepteur omet alors les en-têtes de délégation et continue d’envoyer la référence d’entreprise. Le backend laisse passer les appels sans contexte.

Autre défaut de sortie : `releaseContext()` attend la révocation distante avant tout nettoyage local. Si cet appel échoue, `logout()` efface finalement le stockage intégrateur mais peut laisser `authData`. Le bouton de déconnexion du header manager appelle uniquement `userStore.logout()` et ne révoque pas le contexte intégrateur.

**Impact :** changement implicite d’une identité déléguée vers un état manager non validé, accès résiduel et confusion sur la fin de session. Analyse statique de ces branches ; scénario multi-onglets et révocation distante non exécutés en ligne.

**Correction :** marquer explicitement le mode d’authentification ; ne pas restaurer un profil délégué comme session manager ; valider le contexte sur les routes déléguées et côté serveur ; nettoyer toute identité et tout cache local dans un `finally`, même si la révocation distante échoue. Unifier la déconnexion des deux interfaces.

## 4. P2 — Les TTL des caches ne s’écoulent pas comme prévu

Références : `packages/cloud/src/stores/memoStore.ts:117`, `:235` ; `packages/cloud/src/stores/teamStore.ts:59`.

`isCacheValid` est un `computed()` basé sur `Date.now()` et `lastFetch`. L’horloge n’est pas réactive. Après une première évaluation à `true`, le simple écoulement du temps ne recalcule pas la valeur tant qu’aucune dépendance réactive ne change. Le cache équipe suit le même schéma. Des événements temps réel ou rafraîchissements forcés peuvent actualiser les mémos, mais cela ne rend pas le TTL fiable.

**Reproduction locale :** le vrai store mémo est exécuté avec une horloge contrôlée. Après lecture d’un cache valide puis avancement de deux minutes, `isCacheValid` reste `true`, malgré un TTL annoncé de 60 secondes.

**Correction :** effectuer le calcul temporel dans une fonction appelée à chaque chargement ou utiliser une horloge réactive correctement nettoyée. Tester avant et après échéance sans modifier `lastFetch` entre les deux.

## 5. P1 — Build de production non reproductible dans l’environnement actuel

Références : `packages/cloud/package.json:6`, `packages/cloud/vite.config.ts`, `package.json`.

`npm run build --workspace=@toke/cloud` passe le contrôle Vue/TypeScript puis échoue au chargement de la configuration Vite avec `ERR_REQUIRE_ESM`. Le processus utilise Node 20.18.0 ; Vite installé annonce exiger Node 20.19+ ou 22.12+. Le package cloud ne déclare pas `type: module` et sa configuration TypeScript importe Vite ESM. Il faut vérifier ces deux aspects ensemble, sans déduire que l’unique changement de version résoudra toute la construction.

**Correction :** fixer et documenter une version Node compatible, clarifier le chargement ESM de la configuration (`.mts` ou package ESM selon les effets sur les autres configs), puis exécuter le build et une validation du résultat dans une installation propre. Aucun bundle final de cette version n’a pu être audité.

## 6. P2 — Tests déclarés mais outillage absent ; lint Vue non configuré

Références : `packages/cloud/package.json:12`, `eslint.config.cjs`.

`test:unit` invoque Vitest et `test:e2e` Cypress, sans que ces outils figurent dans les dépendances du package. L’exécution `npm run test:unit --workspace=@toke/cloud -- --run` échoue : `vitest: command not found`. Aucun fichier de test cloud ni configuration Vitest/Cypress n’a été trouvé par la recherche locale hors dépendances. Cypress n’a pas été lancé.

Le lint passe avec 47 avertissements, mais la configuration racine cible les fichiers TypeScript/TSX et ne configure pas le parseur des composants `.vue`. Ce succès ne constitue donc pas une validation des templates Vue. Le contrôle `vue-tsc` reste utile et réussit.

**Correction :** déclarer l’outillage et une vraie suite maintenue ; configurer ESLint pour Vue. Prioriser les tests de session, changement d’identité, caches et erreurs de paiement, avec une commande CI finie et reproductible.

## 7. P2 — OTP envoyé dans l’URL

Références : `packages/cloud/src/service/AuthService.ts:67`, `packages/backend/src/routes/tenant.route.ts:93`, `packages/backend/app.ts:139` et `:230`.

La vérification transmet le code dans `GET /tenant/verify-otp/<code>`. Les URL peuvent être conservées par les logs HTTP/proxy ; le logger de développement du backend affiche explicitement `req.path`. Un appel Axios n’est pas une navigation : il n’est pas affirmé ici que ce code se retrouve dans l’historique de navigation.

**Correction :** endpoint POST avec code dans le corps, challenge lié à la tentative de connexion, consommation atomique et limitation des tentatives côté serveur ; masquer le code dans les journaux et désactiver la mise en cache des réponses d’authentification. Une limitation uniquement dans l’interface ne protège pas l’API.

## 8. P2 — Sélection des champs persistés incompatible avec le plugin installé

Référence : `packages/cloud/src/stores/memoStore.ts:423` ; implémentation installée `node_modules/pinia-plugin-persistedstate/dist/index.js`.

La configuration mémo utilise `paths`, masqué par `as any`. La version installée du plugin utilise `pick`/`omit` et ne lit pas `paths` ; en l’absence de ces options, elle sérialise l’état complet. La sélection de champs annoncée n’est donc pas appliquée. Elle inclut déjà des données sensibles et peut aussi restaurer des indicateurs transitoires tels que le chargement ou l’état de connexion.

**Correction :** supprimer le cast qui masque le contrat, utiliser les options typées de la version installée et minimiser les données conservées. Vérifier les champs réellement enregistrés/restaurés. Pour les mémos, traiter d’abord la suppression ou le cloisonnement de cette persistance décrit au constat 2.

## Vérifications et éléments positifs

- Contrôle Vue/TypeScript : réussi avec les dépendances présentes.
- Build : échec confirmé, Node incompatible annoncé et erreur ESM.
- Lint : 0 erreur, 47 avertissements ; couverture Vue insuffisante.
- Tests unitaires : lancement impossible, Vitest absent.
- Trois reproductions locales isolées : session vide acceptée ; mémo A renvoyé après déconnexion et demande B ; TTL mémo restant valide après échéance. Elles exécutent le code des stores transpilé avec le vrai Vue/Pinia et des dépendances métier simulées. Aucune donnée réelle ou requête réseau.
- Le mode intégrateur dispose bien d’un Bearer, d’une validation distante de session et de données de profil obtenues auprès du serveur. Il fournit une base utile, mais doit rester obligatoire pour toute opération effectuée sous cette identité.
- Le service mémo passe par la passerelle ; les clés API de service ne sont pas ajoutées par le client HTTP frontend examiné. Le helper `TokenGenarate.ts` référence encore des variables `VITE_API_SECRET`/`VITE_API_KEY`, mais aucun import de ce helper n’a été trouvé et ces variables ne sont pas présentes dans le fichier `.env.local` actuel. Aucune fuite de ces clés dans un bundle n’est donc affirmée.
- Le service QR nettoie ses listeners et sa connexion ; la vue nettoie son timer à la sortie. Le contrat serveur exprime actuellement `expiresIn` en millisecondes, cohérent avec le `setTimeout` de la vue.

## Priorités communes cloud/backend

1. Établir une session serveur pour tous les appels manager et empêcher le passage d’un accès intégrateur vers une référence seule.
2. Purger et cloisonner les caches à chaque changement d’identité ; tester deux entreprises et deux profils successifs.
3. Corriger l’isolation tenant et le proxy arbitraire décrits dans le rapport système.
4. Rétablir le build et les tests, puis corriger TTL, persistance et transport OTP.

## Limites

Pas de validation navigateur ni de comparaison visuelle, pas de test en ligne des parcours OTP/QR, des paiements, des cartes ou du temps réel. Aucun inventaire CVE en ligne ni installation de dépendances. Les dépendances et artefacts déjà présents ont servi aux contrôles ; un checkout propre reste à vérifier. Les défauts de sessions et de caches sont établis par code et reproductions ciblées, sans prétendre certifier tous les parcours fonctionnels.
