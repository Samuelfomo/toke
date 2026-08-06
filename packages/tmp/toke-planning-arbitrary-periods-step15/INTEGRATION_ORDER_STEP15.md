# Ordre d'intégration — Step 15

## 1. API tenant

Ajouter :

- `planning.horizon.ts` dans le même répertoire que
  `schedule.suggestion.generation.service.ts` et `suggestion.engine.ts`.

Remplacer :

- `schedule.suggestion.generation.service.ts` ;
- `solver/planning.solver.ts` ;
- `solver/ortools.planning.solver.ts`.

Aucune route et aucune table ne changent.

## 2. Service Python OR-Tools

Remplacer dans `/opt/toke/packages/planning-ortools/app` :

- `schemas.py` ;
- `solver.py` ;
- `main.py`.

Le fichier `requirements.txt` ne change pas.

## 3. Tests autonomes TypeScript

Depuis le dossier contenant `planning.horizon.ts` :

```bash
tsc \
  --target ES2022 \
  --module NodeNext \
  --moduleResolution NodeNext \
  --strict \
  --skipLibCheck \
  --outDir /tmp/toke-horizon-test \
  planning.horizon.ts \
  tests/planning.horizon.test.ts

node /tmp/toke-horizon-test/tests/planning.horizon.test.js
```

Le test doit afficher `status: ok` et l'horizon :

```text
requested : 2026-08-06 → 2026-08-20
solve     : 2026-08-03 → 2026-08-23
```

## 4. Vérification Python

```bash
cd /opt/toke/packages/planning-ortools
source .venv/bin/activate
python -m py_compile app/schemas.py app/solver.py app/main.py
```

Puis exécuter les tests existants :

```bash
export PYTHONPATH="$(pwd)"
python tests/test_arbitrary_horizon_schema.py
python tests/test_policy_schema_v2.py
python tests/test_weekly_guard_pool.py
python tests/test_service_scoped_weekly_leave.py
```

## 5. Compilation et redémarrage

```bash
cd /opt/toke/packages/api
npm run build

pm2 restart toke-planning-ortools
pm2 restart api-tenant
```

## 6. Tests fonctionnels

### Période non alignée

```json
{
  "period_from": "2026-08-06",
  "period_to": "2026-08-20"
}
```

Résultat attendu : la suggestion conserve ces dates, tandis que
`diagnostics.solver.horizon` indique une résolution du 3 au 23 août.

### Une journée

```json
{
  "period_from": "2026-08-13",
  "period_to": "2026-08-13"
}
```

### Période du mercredi au mardi

```json
{
  "period_from": "2026-08-12",
  "period_to": "2026-08-18"
}
```

### Semaine déjà alignée

```json
{
  "period_from": "2026-08-10",
  "period_to": "2026-08-16"
}
```

Pour ce dernier cas, `requestedFrom/To` et `solveFrom/To` doivent être identiques.

## 7. Logs

```bash
pm2 logs toke-planning-ortools --lines 200 --nostream
```

Les lignes `planning.solve.start` et `planning.solve.done` doivent apparaître.
