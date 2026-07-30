# Préparation du dashboard pour TEAM_ROTATION

Quand la configuration active utilise `TEAM_ROTATION`, la préparation ne doit pas seulement vérifier l’existence des profils.

Elle doit aussi vérifier :

1. tous les profils actifs non `EXCLUDED` ont un `rotation_order` ;
2. chaque ordre est unique ;
3. le nombre de bénéficiaires par semaine ne dépasse pas les employés inclus ;
4. le solveur est OR-Tools ;
5. le fallback Greedy est désactivé ;
6. au moins un jour de congé est autorisé ;
7. la date de démarrage du cycle est renseignée.

Utiliser `validateTeamRotationProfiles` fourni dans `team-weekly-leave.helpers.ts`.

Message bloquant recommandé :

> La rotation des congés n’est pas prête. Attribuez un ordre unique à chaque collaborateur inclus avant de générer un planning.
