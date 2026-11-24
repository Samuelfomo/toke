# TOKE — Admissibilité du binôme au service de 8 h le week-end

Dans le contrat v3, OR-Tools vérifie les blocs du modèle de 8 h pour la personne désignée pour travailler le samedi ou le dimanche. Un bloc dans son modèle de référence n’est plus requis pour créer cette option. Le diagnostic de disponibilité utilise également le modèle cible. Les contraintes de repos, de couverture, de quota et de verrouillage continuent de s’appliquer.

## Fichiers modifiés

- `packages/planning-ortools/app/solver.py`
- `packages/planning-ortools/tests/test_fixed_alternation.py`

## Résultats

Les 19 tests du module d’alternance fixe passent. Avec une référence de 10 h 30 sans bloc le dimanche, le binôme alterne correctement ses repos sur deux semaines et la personne qui travaille le week-end est affectée à 8 h. Les plafonds quotidiens et hebdomadaires de 10 h 30 sont respectés pour tous les collaborateurs testés. Sans bloc dans le modèle cible de 8 h, le solveur renvoie `INFEASIBLE` avec le diagnostic `WEEKEND_EARLY_SERVICE`.

Les essais ont utilisé des fixtures locales. Aucun changement de configuration du Plateau et aucun déploiement.
