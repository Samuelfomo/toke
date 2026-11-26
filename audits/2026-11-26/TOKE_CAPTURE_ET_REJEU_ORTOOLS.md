# TOKE — Capture et rejeu de la fenêtre OR-Tools

La capture est désactivée par défaut. Elle s’active pour une organisation, une fenêtre exacte et une échéance de moins d’une heure. Elle s’écrit une seule fois, en mode 0600, dans un répertoire privé appartenant au compte API. Seule une réponse CP-SAT UNKNOWN déclenche l’écriture. La capture utilise le corps envoyé au worker, remplace noms, codes et identifiants et conserve les relations entre ces derniers ainsi que leur ordre. Elle inclut le budget transmis, le budget attendu et la durée que rapporte le worker. Les horaires et l’historique chiffré restent des données sensibles. La capture est pseudonymisée.

Le script de rejeu construit le même modèle deux fois. Pour la seconde exécution, il retire uniquement l’objectif après la construction. Il mesure le premier témoin, les temps de construction et de résolution cumulés, la couverture et la valeur de l’objectif original pour chaque solution. Les deux exécutions indépendantes servent à comparer les stratégies hors production.

## Vérification locale

Contrôle TypeScript API réussi. Le test de capture couvre le refus d’un autre tenant ou d’une date expirée, le masquage, les liens entre identifiants, les permissions et le refus d’écraser la capture. Sur la fixture v3 existante, objectif actif = premier témoin à 0,092 s, total 0,260 s, couverture 4/4, objectif 0. Faisabilité seule = premier témoin à 0,004 s, total 0,017 s, couverture 4/4, objectif original 1 160. Les deux obtiennent un résultat valide. La vitesse du premier témoin se paie ici par un objectif plus élevé si l’optimisation est omise.

## Mise en service après autorisation

1. Construire l’API depuis la racine du dépôt avec `npm run build --workspace=@toke/api`. Le worker de production ne change pas.
2. Avec le compte système d’`api-tenant`, créer un répertoire dédié en mode 0700. Utiliser son chemin absolu réel. Activer temporairement `PLANNING_ORTOOLS_DIAGNOSTIC_CAPTURE` dans l’environnement du processus API. Exemple de valeur JSON avec échéance UTC à remplacer par une date dans les 60 prochaines minutes :

```json
{"tenant":"pharmacieplateaudla.toke.cm","periodFrom":"2026-11-30","periodTo":"2026-12-13","expiresAt":"<échéance UTC ISO>","directory":"<répertoire réel en 0700>"}
```

3. Recharger uniquement `api-tenant` avec `pm2 reload api-tenant --update-env` depuis l’environnement de déploiement portant ce réglage. Relancer une fois la génération du 01/12 au 31/12. Récupérer le fichier `ortools-window.json` par le canal interne sécurisé. Si le worker retourne un autre statut, la capture ne produit aucun fichier.
4. Vérifier `payload.solverTimeoutSeconds`, `searchSeconds`, `workerWallSeconds` et `workerVersion`. Le contrat worker réserve une seconde, donc 61 transmis correspondent à 60 s attendues. Rejouer avec la version du worker de production :

```sh
cd packages/planning-ortools
PYTHONPATH=. .venv/bin/python verification/replay_window.py /chemin/protege/ortools-window.json
```

5. Retirer la variable de l’environnement géré par PM2, recharger le même processus avec cet environnement, puis supprimer la capture après analyse. Pour restaurer le code précédent, restaurer l’artefact API antérieur et recharger `api-tenant`. Aucune migration.

## Décision

Le payload du Plateau et le budget réellement observé en production restent indisponibles. Le solveur actif et ses fenêtres n’ont pas été modifiés. Si le rejeu exact montre un témoin rapide en faisabilité, implémenter la recherche en deux phases sous une seule échéance et conserver le meilleur témoin valide. Si le rejeu montre INFEASIBLE ou UNKNOWN sans objectif, documenter le résultat avant toute modification.
