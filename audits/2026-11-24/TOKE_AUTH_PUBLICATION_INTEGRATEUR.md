# TOKE — Authentification de la publication en délégation intégrateur

## Cause

Cloud envoie le Bearer intégrateur et `x-integrator-context`. Le middleware BFF vérifie le couple auprès du Master et impose la référence tenant résultante. La consultation, la modification et la génération utilisent ensuite le proxy signé du BFF vers ce tenant.

La publication transmettait en plus la preuve humaine pour une revérification dans l’API tenant. Cette revérification construisait son propre client Master avec les paramètres du BFF. Le fichier d’environnement API ne définit ni `HOST`, ni `MST_HOST`, ni `MST_PORT`, ni `SECRET_KEY`. La requête échouait donc à cette seconde étape avec la configuration du dépôt, bien que le BFF ait accepté la délégation. La réponse brute du Master de production n’a pas été consultée.

## Correction

Le client de publication utilise la configuration déjà en place pour joindre l’autorité Master (`USER_SESSION_MASTER_URL`, `USER_SESSION_SERVICE_KEY`, `USER_SESSION_SERVICE_SECRET`) et le client de signature TOKE. La consultation du fuseau passe par le même client. Aucun paramètre de déploiement n’a été ajouté.

L’API tenant vérifie la délégation auprès du Master et compare son sous-domaine et sa référence à ceux de la connexion tenant. Un intégrateur validé peut prévisualiser et publier les brouillons des responsables de l’organisation sélectionnée. Un manager direct conserve ses contrôles de rôle et de propriété du brouillon. Les deux parcours exigent un compte actif. La traçabilité conserve l’identité effective du responsable et le mode de connexion. Les validations de publication et la confirmation restent applicables dans les deux parcours.

## Fichiers et vérifications

- `packages/api/src/tenant/routes/schedule.suggestion.route.ts`
- `packages/api/src/tools/schedule.suggestion.approval.service.ts`
- `packages/api/verification/schedule-suggestion-approval.test.cjs`

25 tests ciblés réussis. Ils couvrent le relais de la preuve par le BFF, les deux opérations en session directe et déléguée, l’absence des variables propres au BFF, le refus d’un contexte expiré ou d’un autre tenant ainsi que l’identité enregistrée. Les services externes ont été simulés. Aucun appel à la production ni déploiement.
