# Step 15 — Périodes quelconques avec horizon hebdomadaire interne

## Objectif

Ce lot complète le moteur générique Step 14. Le manager peut demander une
suggestion sur n'importe quelle période inclusive, sans obligation de commencer
un lundi ni de terminer un dimanche.

Exemple accepté :

```json
{
  "period_from": "2026-08-06",
  "period_to": "2026-08-20"
}
```

Lorsque des politiques hebdomadaires sont actives, le service calcule en
interne sur des semaines complètes :

```text
Période demandée : 2026-08-06 → 2026-08-20
Période résolue  : 2026-08-03 → 2026-08-23
Période stockée  : 2026-08-06 → 2026-08-20
```

Les jours ajoutés avant et après la période sont uniquement du contexte de
résolution. Ils ne sont pas enregistrés dans les cellules visibles de la
suggestion.

## Comportement

1. L'API conserve les dates exactes demandées.
2. Si une règle hebdomadaire l'exige, le début technique est ramené au lundi.
3. La fin technique est prolongée jusqu'au dimanche.
4. L'historique d'équité s'arrête la veille du début technique, pour éviter un
   double comptage des jours de contexte.
5. OR-Tools résout l'horizon technique complet.
6. Le résultat est projeté sur la période demandée.
7. Une continuation ou un repos post-garde situé après la date de fin reste
   conservé uniquement lorsqu'il découle d'une garde commencée dans la période
   demandée.
8. Les diagnostics enregistrent les deux horizons dans
   `diagnostics.solver.horizon`.

## Règles déclenchant l'expansion hebdomadaire

L'expansion lundi-dimanche est activée lorsqu'au moins une des conditions
suivantes est vraie :

- pool de garde `WEEKLY_POOL` avec `complete_weeks_only=true` ;
- repos `TEAM_ROTATION` ou `PER_ELIGIBLE_EMPLOYEE` avec
  `complete_weeks_only=true` ;
- minimum de repos hebdomadaire supérieur à zéro ;
- plafond hebdomadaire global ou individuel en minutes.

Les tenants sans règle hebdomadaire conservent exactement l'horizon demandé.

## Fichiers ajoutés

- `backend/planning.horizon.ts`
- `backend/tests/planning.horizon.test.ts`
- `INTEGRATION_ORDER_STEP15.md`

## Fichiers modifiés

- `backend/schedule.suggestion.generation.service.ts`
- `backend/solver/planning.solver.ts`
- `backend/solver/ortools.planning.solver.ts`
- `backend/planning-ortools/app/schemas.py`
- `backend/planning-ortools/app/solver.py`
- `backend/planning-ortools/app/main.py`

Aucune migration SQL n'est nécessaire.

## Diagnostic OR-Tools

Les logs du service affichent désormais :

```text
planning.solve.start requested=2026-08-06..2026-08-20 solve=2026-08-03..2026-08-23 employees=13 requirements=21 history=...
planning.solve.done status=OPTIMAL ... durationMs=... conflicts=... branches=... booleans=...
```

La réponse Python contient également `solverStats` avec le vrai statut CP-SAT,
la durée, les conflits, les branches et le nombre de booléens.

## Limite de ce lot

Ce lot corrige les bornes de période et améliore les diagnostics. Il ne relâche
aucune contrainte métier et ne change pas la sémantique de l'équité stricte du
pool. Une éventuelle incompatibilité propre aux horizons longs reste donc
visible comme une vraie erreur `INFEASIBLE`, avec des logs désormais
exploitables pour isoler la famille de contraintes concernée.
