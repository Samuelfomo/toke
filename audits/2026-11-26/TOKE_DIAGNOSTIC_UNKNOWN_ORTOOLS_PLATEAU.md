# TOKE — Diagnostic UNKNOWN OR-Tools au Plateau

Fenêtre étudiée du 30/11 au 13/12/2026. Aucun changement du code de production, des contraintes, du tenant ou du budget.

## Budget et reproduction

L’adaptateur TypeScript a été testé par capture HTTP locale. Il envoie `solverTimeoutSeconds=20` pour 19 s et `61` pour 60 s. Le worker soustrait une seconde. Dans la reproduction, ses paramètres avant `Solve()` valaient 60 s et huit workers. Pour confirmer le déploiement, relever `error.details.search_seconds` et `solverStats.wallTimeSeconds` sur l’appel réel. Le payload et les journaux de production n’étaient pas disponibles.

La fixture reprend les effectifs, les dates, les 42 débuts de garde, les trois continuations en entrée, les pools de six, le repos hors pool, le v3 et le paramètre STRICT annoncé. Faute de payload, les horaires et identités sont fictifs. Les services standards sont modélisés en remplissage à minimum zéro. Les repos admissibles sont vendredi, samedi et dimanche, avec deux places par jour et travail dans le périmètre des services les autres jours. Aucun historique de charge ni verrou non confirmé n’a été ajouté.

## Résultats CP-SAT

Les temps ci-dessous sont ceux de `Solve()`. OPTIMAL en faisabilité seule signifie qu’un témoin existe.

| Variante | Statut | Première solution | Durée | Gardes |
|---|---|---:|---:|---:|
| Objectif de production | OPTIMAL | 0,360 s | 14,857 s | 42/42 |
| Objectif retiré, contraintes identiques | OPTIMAL | 0,088 s | 0,113 s | 42/42 |
| Objectif retiré, STRICT forcé en dur | OPTIMAL | 0,270 s | 0,275 s | 42/42 |
| Objectif retiré, sans continuations initiales | OPTIMAL | 0,087 s | 0,088 s | 42/42 |
| Objectif retiré, sans politique v3 | OPTIMAL | 0,082 s | 0,087 s | 42/42 |
| Objectif retiré, sans repos hors pool | OPTIMAL | 0,053 s | 0,053 s | 42/42 |
| Objectif retiré, sans équilibrage | OPTIMAL | 0,081 s | 0,082 s | 42/42 |

## Interprétation

- Les paramètres connus admettent un planning ensemble sur la fixture. Les ablations n’identifient aucune contradiction et la reproduction ne déclenche pas UNKNOWN. En production, UNKNOWN signifie qu’aucune solution ni preuve d’infaisabilité n’a été retournée dans le budget.
- L’objectif coûte beaucoup de recherche sur la fixture, principalement après la première solution. Cela ne suffit pas à expliquer le UNKNOWN de production, où le solveur n’a retourné aucun témoin.
- Trois gardes et leurs trois continuations mobilisent six personnes distinctes sur les journées pleines. Le choix du pool conditionne aussi le repos et les services des quatre tournants hors pool. La limite 10 h 30 réduit leurs options en plus des affectations du binôme. Le repos hors pool a représenté la plus forte baisse sur ces ablations ponctuelles, sans preuve de causalité en production.
- Sur deux semaines, l’écart de 2 est automatiquement respecté et une suite de plus de deux semaines ne peut pas être créée par ce calcul de pool. Le code compte les appartenances de la fenêtre. L’API n’envoie pas `resilientAssistantMode` et le défaut du worker rend STRICT pénalisé dans l’objectif. La variante qui le force en dur reste faisable.
- Un minimum standard à 0 ne suffit pas à connaître la contrainte. Un besoin EXACT peut imposer une cible supérieure et le repos hors pool peut imposer du travail les autres jours. Les cibles, maxima, créneaux, profils, verrous et historiques exacts restent nécessaires pour conclure sur le cas réel.

## Recommandation

Rejouer une seule fois le payload anonymisé de la fenêtre réelle avec objectif, puis sans objectif en conservant toutes les contraintes. Si le modèle est rapidement faisable sans objectif, chercher d’abord un témoin puis le donner comme indication à l’optimiseur. Conserver ce témoin comme résultat FEASIBLE si l’amélioration échoue dans le budget, et conserver le diagnostic UNKNOWN si aucun témoin n’existe au terme de la recherche. Si la faisabilité prouve une contradiction, isoler les contraintes sur ce payload avant toute correction. Aucun déploiement.
