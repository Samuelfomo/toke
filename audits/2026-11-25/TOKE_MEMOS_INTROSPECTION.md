# TOKÉ — Refus d’introspection technique pour IMEDIATIS SARL

Pour le tenant 100014, la réponse exacte `{"success":false,"error":{"code":"session_service_unauthorized"}}` correspond au relais BFF d’un refus de l’API Tenant. Un refus de l’introspection propre au BFF inclurait un message et un horodatage. L’appelant de l’introspection en cause est donc `api-tenant`. Le refus intervient sur le Master avant toute vérification de l’utilisateur ou de ses ACL.

Le Master exige une clé dans `USER_SESSION_SERVICE_KEYS`, un horodatage frais, un client enregistré et actif, puis une signature HMAC valide. Les nouveaux messages de journal distinguent ces quatre contrôles sans afficher de secret. Le client normalise l’URL et les identifiants avant de signer et d’émettre la requête, avec le même HMAC que le client technique existant.

Les fichiers locaux associent déjà les deux appelants à des clés autorisées et au port Master prévu par PM2. La clé et la signature Tenant concordent avec le cache Master local. Les valeurs effectives de production et la condition exacte du refus n’ont pas été observées.

## Commandes sur le serveur

Depuis la racine de la release, sous l’utilisateur PM2 habituel, lancer le contrôle avant et après correction. En cas d’hôtes séparés, le lancer sur chaque hôte concerné.

```sh
node packages/api/verification/user-sessions/check-introspection.cjs
pm2 logs api-master --err --lines 30 --nostream | grep -F 'Technical introspection rejected'
```

Le contrôle émet une requête au Master configuré pour chaque appelant. Il utilise un corps volontairement invalide qui permet de confirmer l’admission du service technique sans solliciter le registre Redis ni utiliser de session humaine.

- Si la clé Tenant manque dans l’allowlist, ajouter la clé technique Tenant enregistrée et active à `USER_SESSION_SERVICE_KEYS` dans la configuration Master. Conserver les autres entrées.
- Si la signature diverge, renseigner `USER_SESSION_SERVICE_KEY` et `USER_SESSION_SERVICE_SECRET` avec les identifiants existants correspondant au client Tenant actif du Master. Le secret est sous la même forme Base64 que dans le registre. Vérifier le registre actif en cas de divergence avec le cache.
- Si la destination diverge, renseigner `USER_SESSION_MASTER_URL` avec la base interne du Master réellement servi. Pour une horloge hors tolérance, corriger la synchronisation des hôtes.
- Si les valeurs sont fournies par un gestionnaire de secrets, corriger l’injection de ce gestionnaire avant son redémarrage habituel. Pour des valeurs servies par dotenv, le script peut réinjecter uniquement les paramètres d’introspection depuis le `.env` du processus, sans les afficher ni changer les flags Mémos.

```sh
# Seulement si l’allowlist Master a été corrigée dans son .env
node packages/api/verification/user-sessions/check-introspection.cjs --reload api-master
# Pour remplacer des paramètres Tenant prioritaires dans PM2 par ceux du .env
node packages/api/verification/user-sessions/check-introspection.cjs --reload api-tenant
node packages/api/verification/user-sessions/check-introspection.cjs
```

Une fois `technical_credentials_accepted` obtenu pour les deux clients, vérifier la consultation du même mémo avec le manager direct et avec sa représentation. Les ACL de lecture et d’écriture restent communes et inchangées.

### Régularisation du secret Tenant

Le diagnostic production a confirmé `signature_invalid` pour Tenant et l’acceptation du BFF. Sur l’hôte PM2 commun, exécuter comme propriétaire du `.env` Tenant :

```sh
cd /opt/toke
node packages/api/verification/user-sessions/check-introspection.cjs --repair-tenant
```

Le script conserve la clé Tenant déjà autorisée, lit son secret dans le cache du registre Master et exige que le Master l’accepte avant d’écrire. Il met à jour les deux variables d’introspection du `.env` Tenant, remplace l’ancienne injection PM2 pour ce seul processus et vérifie les deux clients. Les secrets ne passent ni par les arguments de commande ni par la sortie. Si un gestionnaire externe régénère le `.env`, faire persister la même configuration dans ce gestionnaire.

Si le cache est indisponible ou si le Master refuse aussi son secret, faire vérifier le client actif dans le registre de référence. Si son secret est irrécupérable, provisionner un nouveau client technique dédié à l’introspection Tenant avec une clé distincte et un secret généré et transmis via le gestionnaire de secrets. Ajouter sa clé à l’allowlist Master en conservant les entrées existantes et recharger Master. Injecter le nouveau couple dans le `.env` Tenant via ce gestionnaire, puis exécuter `node packages/api/verification/user-sessions/check-introspection.cjs --reload api-tenant`. Le rechargement vérifie le nouveau couple avant de redémarrer Tenant. Contrôler les deux sondes, puis retirer l’ancienne clé de l’allowlist uniquement si aucun autre client ne l’utilise. Conserver le secret des sessions utilisateurs et les credentials BFF.

Pour livrer le code, exécuter `npm run build`, puis redémarrer `api-master` pour les journaux et `api-tenant` et `api-backend` pour le client partagé. Un changement de configuration seul implique uniquement le processus concerné. La consultation du tenant réel reste à vérifier.
