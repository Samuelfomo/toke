# Audit de l’exemple fourni

## Éléments utiles conservés

- utilisation de `CpModel` et de variables booléennes ;
- contrainte d’un service maximum par jour ;
- contraintes de capacité ;
- objectif d’équilibrage de la charge ;
- exposition avec FastAPI.

## Problèmes corrigés

1. **Données codées en dur**
   - `/generate` utilise des employés et horaires locaux.
   - Le nouveau service reçoit le contrat réel envoyé par Node.js sur `/solve`.

2. **Trois employés de garde par nuit**
   - L’exemple impose deux équipes de trois personnes.
   - Toké utilise les besoins `EXACT`, généralement une seule garde par date.

3. **Équipes A/B permanentes**
   - Elles figent les mêmes personnes sur plusieurs nuits.
   - Elles sont supprimées au profit d’une rotation optimisée date par date.

4. **Jours sous forme `1..7`**
   - Impossible de gérer une semaine ou un mois réel et les continuations hors période.
   - Le service travaille avec des dates ISO `YYYY-MM-DD`.

5. **Employés fixes affectés tous les jours**
   - L’exemple ignore les jours de repos contenus dans le template fixe.
   - Le service lit la définition réelle du `SessionTemplate`.

6. **Capacité identique tous les jours**
   - Les capacités sont désormais des `PlanningSuggestionRequirement` par jour de semaine.

7. **Garde 16h–08h traitée comme un seul shift**
   - Toké utilise début + continuation.
   - Le service produit `GUARD_CONTINUATION`, y compris sur `periodTo + 1`.

8. **Aucun repos hebdomadaire réel**
   - Le service applique `minRestDaysPerWeek`.

9. **Pas de maximum de jours consécutifs ni d’heures**
   - Le service applique `maxConsecutiveWorkDays`, `maxWeeklyMinutes`
     et l’override employé.

10. **Pas de temps de repos entre deux services**
    - Le service interdit les paires de shifts incompatibles.

11. **Résultat incompatible avec Node.js**
    - L’ancien résultat contient `employee/day/shift`.
    - Le nouveau résultat respecte exactement `EngineResult`.

12. **Deux architectures mélangées**
    - `Planner` utilise `days/shifts`.
    - `OneShiftPerDayConstraint` attend `start_date/end_date/shift_types`.
    - Le nouveau service possède un seul modèle cohérent.

13. **Seul OPTIMAL accepté**
    - Une solution `FEASIBLE` est exploitable lorsqu’un timeout est atteint.
    - Le nouveau service renvoie OPTIMAL ou FEASIBLE.

14. **Règles métiers non retenues**
    - `is_manager`, `can_manage_cash`, `NightTeam` et `Workstation` ne sont pas
      intégrés, car la décision produit actuelle ne tient pas compte des rôles.
