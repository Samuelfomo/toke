# Step 12 — Congé hebdomadaire tournant d’équipe

Cette étape remplace la fausse règle « un repos par employé et par semaine » pour la Pharmacie du Plateau.

## Règle implémentée

Pour chaque semaine complète :

- exactement un collaborateur reçoit le congé hebdomadaire ;
- le congé est placé uniquement sur un jour autorisé ;
- pour le Plateau, les jours autorisés sont mercredi à dimanche ;
- le bénéficiaire est déterminé par `rotation_order` ;
- avec 13 employés, le cycle complet dure 13 semaines ;
- les autres employés peuvent travailler 7 jours sur 7 ;
- le repos post-garde reste distinct du congé hebdomadaire ;
- les semaines partielles ne reçoivent pas automatiquement de congé.

## Nouvelle politique

```text
NONE          aucune règle automatique
PER_EMPLOYEE  ancienne règle générique, repos par collaborateur
TEAM_ROTATION congé global tournant au niveau de l’équipe
```

## Condition importante sur les profils

Lorsque `TEAM_ROTATION` est actif :

- tous les employés inclus (`FIXED` et `ROTATING`) doivent avoir un `rotation_order` ;
- les valeurs doivent être positives et uniques ;
- un profil `EXCLUDED` ne participe ni au planning ni au cycle de congé.

Exemple pour 13 collaborateurs :

```text
1, 2, 3, ... 13
```

## Ordre d’intégration

1. Exécuter `backend/step12-team-weekly-leave.migration.sql` sur la base du tenant.
2. Remplacer les fichiers de configuration backend :
   - `planning.suggestion.config.db.ts`
   - `PlanningSuggestionConfigModel.ts`
   - `PlanningSuggestionConfig.ts`
   - `planning.suggestion.config.ts`
   - `planning.suggestion.config.route.ts`
3. Remplacer :
   - `suggestion.engine.ts`
   - `schedule.suggestion.generation.service.ts`
4. Remplacer le service Python :
   - `planning-ortools/app/schemas.py`
   - `planning-ortools/app/solver.py`
   - `planning-ortools/app/main.py`
   - ajouter `planning-ortools/app/weekly_leave.py`
5. Recompiler `@toke/shared` et l’API.
6. Redémarrer l’API tenant et le service Python.
7. Mettre `rotation_order = 1..13` sur les profils inclus.
8. Créer une nouvelle configuration avec `plateau-team-weekly-leave.config.json`.
9. Ajouter les besoins de couverture à cette nouvelle configuration.
10. Activer la nouvelle configuration seulement après vérification.

## Pourquoi une nouvelle configuration

Ne modifie pas silencieusement l’ancienne configuration active. Crée une nouvelle version afin que les suggestions déjà générées conservent leur configuration historique.

## Tests

### Tests exécutés ici

- compilation syntaxique Python ;
- validation Pydantic de la nouvelle configuration ;
- cycle déterministe `1 → 13 → 1` de `rotation_order` ;
- transpilation syntaxique des fichiers TypeScript.

### Test CP-SAT à exécuter dans le venv du serveur

```bash
cd /opt/toke/packages/planning-ortools
source .venv/bin/activate
python tests/test_team_weekly_leave_rotation.py
```

Le test doit confirmer :

```text
13 semaines
13 congés hebdomadaires
1 bénéficiaire différent par semaine
jours uniquement mercredi à dimanche
```

Le conteneur utilisé pour préparer ce paquet ne possède pas OR-Tools ; le test CP-SAT complet doit donc être exécuté dans le venv existant du serveur.

## Affichage frontend

Ne plus regrouper toutes les journées vides sous « Repos ».

Utiliser :

```text
WEEKLY_LEAVE    Congé hebdomadaire
POST_GUARD_REST Repos après garde
TEMPLATE_REST   Repos prévu par le modèle
UNASSIGNED      Non affecté
```

Les fichiers du dossier `frontend/` indiquent les ajustements à fusionner dans le design que tu as déjà modifié.
