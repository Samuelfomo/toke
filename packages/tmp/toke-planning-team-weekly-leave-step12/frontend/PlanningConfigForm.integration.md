# Ajustement de PlanningConfigForm.vue

## 1. État du formulaire

Ajouter :

```ts
weekly_leave_mode: 'TEAM_ROTATION' as WeeklyLeaveMode,
weekly_leave_employees_per_week: 1,
weekly_leave_allowed_days: ['Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as PlanningDayKey[],
weekly_leave_rotation_anchor_date: '',
weekly_leave_complete_weeks_only: true,
post_guard_rest_counts_as_weekly_leave: false,
max_consecutive_work_days: null as number | null,
```

Lorsqu’une configuration existante est chargée :

```ts
const policy = config.rules.weekly_leave_policy

form.weekly_leave_mode = policy.mode
form.weekly_leave_employees_per_week = policy.employees_per_week
form.weekly_leave_allowed_days = [...policy.allowed_days]
form.weekly_leave_rotation_anchor_date = policy.rotation_anchor_date ?? ''
form.weekly_leave_complete_weeks_only = policy.complete_weeks_only
form.post_guard_rest_counts_as_weekly_leave =
    policy.post_guard_rest_counts_as_leave
form.max_consecutive_work_days =
    config.rules.max_consecutive_work_days
```

## 2. Section visible « Politique de congé hebdomadaire »

Le formulaire doit proposer trois choix explicites :

- `NONE` — aucune règle de congé hebdomadaire automatique ;
- `PER_EMPLOYEE` — chaque collaborateur reçoit un minimum de repos ;
- `TEAM_ROTATION` — un nombre défini de collaborateurs reçoit le congé à tour de rôle.

Pour `TEAM_ROTATION`, afficher :

- bénéficiaires par semaine ;
- jours autorisés avec cases à cocher ;
- date de démarrage du cycle ;
- uniquement les semaines complètes ;
- le repos post-garde compte ou non comme congé.

Texte métier recommandé :

> Une seule personne de l’équipe reçoit le congé hebdomadaire selon l’ordre de rotation des profils. Les autres collaborateurs peuvent travailler toute la semaine.

## 3. Comportement automatique

Quand le manager sélectionne `TEAM_ROTATION` :

```ts
form.min_rest_days_per_week = 0
form.max_consecutive_work_days = null
form.solver_type = 'ORTOOLS'
form.fallback_to_greedy = false
```

Ne pas afficher « Jours consécutifs maximum » comme une règle active lorsque la valeur est `null`.
Afficher à la place :

> Règle désactivée — les collaborateurs non sélectionnés pour le congé peuvent travailler 7 jours sur 7.

## 4. Validation frontend

Bloquer l’enregistrement si :

- aucun jour autorisé n’est sélectionné ;
- la date d’ancrage est vide ;
- le nombre de bénéficiaires est inférieur à 1 ;
- le solveur n’est pas OR-Tools ;
- le fallback Greedy est actif.

## 5. Payload

```ts
const payload: PlanningSuggestionConfigPayload = {
    ...,
    weekly_leave_mode: form.weekly_leave_mode,
    weekly_leave_employees_per_week:
        form.weekly_leave_employees_per_week,
    weekly_leave_allowed_days:
        [...form.weekly_leave_allowed_days],
    weekly_leave_rotation_anchor_date:
        form.weekly_leave_rotation_anchor_date || null,
    weekly_leave_complete_weeks_only:
        form.weekly_leave_complete_weeks_only,
    post_guard_rest_counts_as_weekly_leave:
        form.post_guard_rest_counts_as_weekly_leave,
    max_consecutive_work_days:
        form.max_consecutive_work_days,
}
```
