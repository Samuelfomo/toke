# PlanningConfigView — affichage de la politique de garde

Dans la carte « Gardes », afficher `config.rules.guard_team_policy` :

- `DAILY_FLEXIBLE` → « Affectation quotidienne flexible » ;
- `WEEKLY_POOL` → « Pool hebdomadaire de garde » ;
- `employees_per_week` → nombre de collaborateurs ROTATING autorisés à prendre les gardes ;
- `selection_mode` → « Ordre de rotation » ou « Choix optimisé » ;
- `rotation_anchor_date` seulement pour `ROTATION_ORDER` ;
- `complete_weeks_only` et `require_participation` sous forme Oui/Non.

Ne pas présenter `post_guard_rest_days = 0` comme « aucun repos » : cela signifie
« aucun jour calendaire complet ajouté après la continuation ». La journée de
continuation 00h–08h reste déjà indisponible pour un service de journée.
