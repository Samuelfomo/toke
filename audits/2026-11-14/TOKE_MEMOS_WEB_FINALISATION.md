# TOKÉ — Finalisation de la consultation Mémos Web
Date : 2026-11-14, Africa/Douala.
Verdict : **VALIDÉ SOUS RÉSERVES** — code de consultation préparé ; aucun déploiement ni accès production.

## Correction ciblée
- Profil installé annoncé : `PGADMIN_POSTGRES_LEGACY_OWNER`, marqueur `b1-v1`.
- Lecture ciblée du chargeur B1 et des modèles : les cinq structures métier sont compatibles avec le script préparé ; la colonne supplémentaire de profil du registre n'est pas rejetée. Les GET n'appellent pas `observeLegacyState()` : le refus d'EXECUTE sur cette fonction ne bloque pas la consultation. Aucun correctif backend ni migration nécessaire sur ce constat statique.
- La compatibilité des bases effectivement installées n'a pas été vérifiée depuis Codex ; elle reste une confirmation opérateur.
- Le détail Cloud prenait le mémo déjà en cache depuis la liste : il manquait ainsi le contenu détaillé B2. Il charge maintenant le GET détail autorisé et affiche erreur/indisponibilité et bouton Réessayer.
- Le texte `details` autorisé par B2 est conservé dans le store et affiché comme texte, séparément des échanges ; aucun message ou auteur n'est inventé.
- La sidebar affiche désormais l'erreur reçue par ses props avant l'état vide. Les états chargement, liste vide et liste paginée existants sont conservés.
- Création désactivée, formulaire de création non monté, composeur masqué et envoi neutralisé, actions approuver/rejeter/révoquer non affichées et gardées côté page. La sélection ne déclenche plus le PATCH de marque de lecture.
- Les noms absents du contrat B2 sont présentés par identifiants auteur/destinataire, sans profils ni données fictifs. Une date de modification invalide n'est plus affichée dans le panneau.
- Authentification, isolation tenant, ACL B2, adaptation de pagination BFF et fermeture des routes non GET sont inchangées. Aucun contournement frontend du refus serveur.

## Fichiers modifiés par cette intervention
- `packages/cloud/src/views/memo/memosView.vue`
- `packages/cloud/src/views/memo/memoSidebar.vue`
- `packages/cloud/src/views/memo/memoDetailChat.vue`
- `packages/cloud/src/views/memo/memoDetailPanel.vue`
- `packages/cloud/src/stores/memoStore.ts`
- Le présent rapport. Les autres modifications Git préexistantes sont conservées ; aucun reset/staging.

## Vérifications ciblées
Compilation par `@vue/compiler-sfc` des scripts/templates des quatre composants modifiés : **4 réussites**. Pas de données injectées, pas de requête réseau.
Commande finale : `npm run type-check --workspace=@toke/cloud`, résultat consigné ci-dessous. Une première vérification a été lancée avant la correction d'une insertion dans un commentaire ; elle n'est pas utilisée comme validation finale.
Relecture ciblée des branches d'écriture, de la sélection, du détail et des contrôles B1 ; aucune nouvelle suite générale, création de fixtures, migration ou lancement PostgreSQL. Aucun test navigateur ni affichage de mémos de production depuis Codex.

## Activation exacte à effectuer uniquement par l'opérateur autorisé
1. Déployer les artefacts compilés Cloud, BFF et API correspondant aux corrections déjà préparées ; conserver les paramètres réseau existants. Aucune compilation/déploiement serveur n'est exécuté ici.
2. Vérifier les droits runtime de lecture B1 et l'exécution de `public.toke_b1_version()` ; conserver les sessions Master et credentials techniques existants.
3. En production, définir **`MEMO_B2_PRODUCTION_MANAGER_READS=1`** dans la configuration persistante de **l'API Tenant ET du BFF**, avec `NODE_ENV=production`. Les anciens flags locaux ne suffisent pas. Ne pas modifier le frontend pour simuler cette activation.
4. Si l'injection se fait depuis le shell PM2, après mise à jour persistante : `MEMO_B2_PRODUCTION_MANAGER_READS=1 pm2 restart api-tenant --update-env`, puis `MEMO_B2_PRODUCTION_MANAGER_READS=1 pm2 restart api-backend --update-env`. Adapter aux vrais hôtes/noms/instances ; contrôler les valeurs effectives sans exporter les secrets. Aucun redémarrage Master/Nginx requis pour ce flag.
5. Vérifier depuis une session manager réelle la liste et le détail autorisés, ainsi que les refus hors tenant/hors ACL. Rollback : valeur `0` et redémarrage BFF puis API Tenant avec environnement actualisé. Aucune variable réelle n'a été modifiée par Codex.

## Limites importantes
B1 installé vide ne crée aucune responsabilité certifiée : les mémos historiques restent visibles seulement selon les droits auteur/cible et les responsabilités réellement persistées. Aucun responsable n'est fabriqué pour élargir la liste. Une liste vide peut donc être légitime.
Les médias, sockets et écritures restent fermés. Les paramètres effectifs, les migrations installées et les données réelles n'ont pas été inspectés. La disponibilité finale dépend du déploiement et de l'activation opérateur des deux côtés.

Résultat final : type-check Cloud **code 0**, sans diagnostic ; contrôle Git d'espacement ciblé sur les cinq fichiers **code 0**. Aucun changement applicatif après ces vérifications.
