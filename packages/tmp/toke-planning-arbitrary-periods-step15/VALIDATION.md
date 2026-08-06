# Validation du paquet Step 15

## Vérifications exécutées

- normalisation jeudi-jeudi vers lundi-dimanche ;
- absence d'expansion lorsqu'aucune règle hebdomadaire n'est active ;
- conservation d'une période déjà alignée lundi-dimanche ;
- suppression des jours techniques avant et après la période demandée ;
- conservation de la continuation causée par une garde du dernier jour demandé ;
- filtrage de la couverture et des congés sur la période visible ;
- recalcul du score de couverture après projection ;
- compilation stricte et exécution du test TypeScript autonome ;
- compilation syntaxique de `schemas.py`, `solver.py` et `main.py` avec
  `py_compile`.

## Test exécuté

```text
status: ok
requested: 2026-08-06 → 2026-08-20
solve: 2026-08-03 → 2026-08-23
projected dates: 2026-08-06, 2026-08-20, 2026-08-21
```

Le 21 août est conservé parce qu'il s'agit de la continuation de la garde
commencée le 20 août. Les autres jours techniques sont supprimés.

## Tests à exécuter sur le serveur Toké

Les tests CP-SAT complets nécessitent l'environnement virtuel du serveur avec
`ortools==9.14.6206` :

```bash
cd /opt/toke/packages/planning-ortools
source .venv/bin/activate
export PYTHONPATH="$(pwd)"
python tests/test_arbitrary_horizon_schema.py
python tests/test_policy_schema_v2.py
python tests/test_weekly_guard_pool.py
python tests/test_service_scoped_weekly_leave.py
```
