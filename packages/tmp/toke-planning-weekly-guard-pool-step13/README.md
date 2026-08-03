# Step 13 — Pool hebdomadaire de garde configurable

## Objectif

Ajouter une politique de garde hebdomadaire sans modifier le comportement des
autres tenants.

Deux modes sont disponibles :

- `DAILY_FLEXIBLE` : comportement historique, le moteur choisit les gardes jour par jour ;
- `WEEKLY_POOL` : seuls les employés ROTATING sélectionnés dans le pool de la semaine peuvent commencer une garde.

Le nombre d'employés, la méthode de sélection, l'ancre de rotation et le
traitement des semaines partielles sont configurables. Aucun nombre propre à la
Pharmacie du Plateau n'est codé en dur.

## Paramètres ajoutés

```json
{
  "guard_team_mode": "WEEKLY_POOL",
  "guard_team_employees_per_week": 6,
  "guard_team_selection_mode": "ROTATION_ORDER",
  "guard_team_rotation_anchor_date": "2026-08-03",
  "guard_team_complete_weeks_only": true,
  "guard_team_require_participation": true
}
```

### Méthodes de sélection

- `ROTATION_ORDER` : cycle déterministe fondé sur `rotation_order` des profils `ROTATING` ;
- `OPTIMIZED` : OR-Tools choisit le pool en équilibrant les gardes et l'historique disponible.

Les employés `FIXED` ne sont pas sélectionnés dans le pool, car le moteur ne
leur crée pas d'affectations de garde. Les employés `EXCLUDED` restent hors du
moteur.

## Point métier important pour la Pharmacie du Plateau

Une garde commencée le jour J bloque déjà le jour J+1, car ce jour contient la
continuation 00h–08h. Si la récupération se déroule ensuite pendant le reste de
ce même jour, utiliser :

```json
{
  "rest_after_guard_required": true,
  "post_guard_rest_days": 0
}
```

`post_guard_rest_days = 1` ajoute un nouveau jour calendaire complet J+2. Avec
3 débuts de garde par jour et un pool de 6 personnes, cette configuration est
mathématiquement insuffisante. Le solveur renvoie désormais une erreur précise
avant CP-SAT au lieu du message générique `PLANNING_INFEASIBLE`.

## Fichiers backend à remplacer

- `planning.suggestion.config.db.ts`
- `PlanningSuggestionConfigModel.ts`
- `PlanningSuggestionConfig.ts`
- `planning.suggestion.config.ts`
- `planning.suggestion.config.route.ts`
- `schedule.suggestion.generation.service.ts`
- `suggestion.engine.ts`
- `planning-ortools/app/schemas.py`
- `planning-ortools/app/solver.py`
- `planning-ortools/app/main.py`

Ajouter :

- `step13-weekly-guard-pool.migration.sql`
- `planning-ortools/tests/test_weekly_guard_pool.py`

## Fichiers frontend complets

- `frontend/src/views/planning/suggestion/planningSuggestion.type.ts`
- `frontend/src/views/planning/suggestion/configuration/PlanningConfigForm.vue`

Les documents `frontend/*.integration.md` décrivent les petits ajouts
facultatifs dans la vue de lecture et l'aperçu.

## Installation

```bash
psql -d <tenant_db> -f backend/step13-weekly-guard-pool.migration.sql
npm run build
pm2 restart api-backend
pm2 restart api-tenant
pm2 restart toke-planning-ortools
```

Vérification du schéma Python :

```bash
curl -s http://127.0.0.1:8090/openapi.json | grep -o "guardTeamPolicy"
```

Test OR-Tools :

```bash
cd /opt/toke/packages/planning-ortools
source .venv/bin/activate
python tests/test_weekly_guard_pool.py
```

Résultat attendu pour le scénario isolé : 6 membres dans le pool, 21 débuts de
garde sur 7 jours, aucun début de garde attribué hors pool.
