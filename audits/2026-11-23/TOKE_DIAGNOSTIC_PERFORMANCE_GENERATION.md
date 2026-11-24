# TOKE — Durée de génération des suggestions

Mesures locales, sans données ni configuration de production. Les journaux locaux du worker étaient vides. Aucun changement de code de production.

## Mesures

| Étape | Sans politique | Contrat v3 | Périmètre |
|---|---:|---:|---|
| Préparation API, hors prévalidation | 1,1 ms | 7,0 ms | Fixture légère, lectures métier simulées. Le v3 inclut la requête locale de capacité. |
| Prévalidation | 1,1 ms | 0,4 ms | Même fixture |
| Construction CP-SAT | 50,6 ms | 55,9 ms | Fixture distincte, 13 collaborateurs, 12 besoins récurrents, 14 jours |
| Première solution | 68 ms | 37 ms | Même fixture CP-SAT |
| Solve complet | 4 011 ms | 4 000 ms | Budget expérimental de 4 s. Statut FEASIBLE dans les deux cas. |
| Après la première solution | 3 943 ms | 3 964 ms | Optimisation et amélioration des bornes |
| Persistance | 36 ms | — | Transaction PostgreSQL locale, un en-tête et 13 lignes, lectures utilisateurs simulées |

Sur la fixture CP-SAT, le v2 a construit 1 034 variables et 1 286 contraintes, contre 866/1 146 sans politique et 995/1 246 en v3 (72 hypothèses, contre 28 en v2). Épingler les hypothèses v3 à vrai pour ce seul essai a amélioré la borne et réduit le temps de première solution de 37 à 18 ms. Le statut est resté FEASIBLE au terme des 4 s. L’exclusion d’un tournant a réduit le modèle à 913 variables et 1 135 contraintes, sans éviter le plafond. Exclure un membre du binôme v3 bloque en amont actuellement.

Une fixture HTTP légère sur 28 jours a utilisé quatre fenêtres successives et trois chevauchements (70 jours-modèle au total). Chaque fenêtre était OPTIMAL en 12 à 18 ms côté worker. Le temps cumulé des appels au solveur coté API était de 75 ms. Au-delà de 21 jours calculés, l’API exécute les fenêtres en série, avec 7 jours validés, 7 jours de chevauchement et 7 jours d’anticipation lorsque disponibles.

## Diagnostic et action minimale

Le temps mesuré se concentre dans l’optimisation après la première solution, avec ou sans v3. Le v3 a une borne moins serrée sur cette fixture, mais ces mesures ne démontrent ni une explosion de construction ni la cause de la régression de production. Le v3 retire les pénalités de permutation des profils fixes et conserve les autres objectifs, dont l’équité. La double lecture des verrous dans la construction des diagnostics v3 est redondante, mais le surcoût de construction mesuré reste faible.

La génération active n’envoie pas de durée au worker. Le défaut Python de 20 s donne un plafond CP-SAT de 19 s par fenêtre, avec huit workers. L’API accepte FEASIBLE et OPTIMAL. Son délai de 31 min concerne l’attente des en-têtes HTTP du solveur, avec 10 s pour la connexion et 2 s pour la sonde de capacité. Les limites du frontal de production n’ont pas été vérifiées.

Les logs worker fournissent le temps total et les compteurs de résolution. Le contrat Python contient le temps interne CP-SAT dans `solverStats.wallTimeSeconds`, et les métadonnées API fournissent le temps par fenêtre. La première solution a été chronométrée par un callback temporaire pour cette comparaison.

Recommandation : comparer d’abord les statuts et durées par fenêtre dans les logs du Plateau. Si les fenêtres lentes finissent fréquemment FEASIBLE autour de 19 s, tester un plafond d’optimisation explicite et plus court par fenêtre en conservant une solution FEASIBLE et en comparant sa qualité. Ce réglage doit conserver un traitement explicite du cas où aucune solution faisable n’est trouvée avant le plafond. Aucun déploiement.
