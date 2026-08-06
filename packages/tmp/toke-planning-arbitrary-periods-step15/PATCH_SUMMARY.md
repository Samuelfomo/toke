# Résumé technique Step 15

## Problème corrigé

Les règles `complete_weeks_only=true` ignoraient les semaines partielles alors
que les besoins de couverture restaient actifs sur les dates demandées. Les
requirements `MEMBER` et `NON_MEMBER` pouvaient alors être créés sans pool
hebdomadaire correspondant, ce qui produisait un `INFEASIBLE` artificiel.

## Correction

Le service de génération sépare maintenant :

- la période demandée et persistée ;
- la période technique transmise au solveur.

La période technique est étendue au lundi précédent et au dimanche suivant
lorsqu'une règle hebdomadaire l'exige. Après résolution, les jours techniques
sont retirés des items et des diagnostics visibles.

## Sécurité de projection

Une date située après la fin demandée n'est conservée que lorsqu'elle est une
`GUARD_CONTINUATION` ou un `POST_GUARD_REST` relié explicitement à une garde
commencée dans la période demandée.

## Historique

L'historique d'équité est désormais chargé jusqu'à la veille de `solveFrom`, et
non jusqu'à la veille de `requestedFrom`. Cela évite de compter deux fois les
jours ajoutés au début de l'horizon technique.

## Observabilité

Le service Python journalise :

- période demandée ;
- période résolue ;
- nombre d'employés ;
- nombre de besoins ;
- taille de l'historique ;
- vrai statut CP-SAT ;
- durée ;
- conflits ;
- branches ;
- booléens.

## Compatibilité

- aucune migration SQL ;
- corps de requête public inchangé ;
- période enregistrée inchangée ;
- anciens tenants sans politique hebdomadaire inchangés ;
- champs Python `requestedPeriodFrom` et `requestedPeriodTo` optionnels.
