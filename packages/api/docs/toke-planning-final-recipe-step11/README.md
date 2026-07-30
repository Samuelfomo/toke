# Recette finale pharmacie — Step 11

## 1. Étendre les cinq SessionTemplate aux sept jours

Utiliser `01-full-week-session-templates.json` et mettre à jour uniquement le champ
`definition` de chaque template via la route PUT existante.

Templates :
- Fixed Morning: `7808474948857602`
- Rotating Morning: `9565631348489403`
- Special Shift: `7719227120554504`
- Guard Start: `8458796316720205`
- Guard End: `1971539537938306`

## 2. Créer les 16 requirements manquants

Utiliser `02-missing-requirements-thu-sun.json`.
Créer quatre requirements pour chacun de Thu, Fri, Sat, Sun dans la configuration
`5872958340068201`.

Après création, la configuration doit contenir exactement 28 requirements actifs :
7 jours × 4 besoins.

## 3. Compléter les 13 profils employés

Utiliser `03-employee-profile-examples.json`.
La génération doit retourner `employee_count = 13`.

Ne pas envoyer `employee_guids` lors du test final, afin de prendre tout le scope
du manager.

## 4. Générer deux semaines

POST `/schedule-suggestion/6427683422365001/generate`

```json
{
  "period_from": "2026-08-03",
  "period_to": "2026-08-16"
}
```

Enregistrer la réponse dans `final-generation.json`.

## 5. Valider automatiquement avant approbation

```bash
python3 04-validate-final-suggestion.py final-generation.json --employees 13
```

La commande doit afficher `RECETTE VALIDÉE`.

## 6. Approuver puis vérifier

POST `/schedule-suggestion/<SUGGESTION_GUID>/approve`

Contrôles attendus :
- suggestion `approved`;
- `employee_count = 13`;
- aucune superposition active;
- Guard Start J, Guard End J+1, repos J+2;
- planning publié pour toute la période.

Ne jamais approuver une suggestion dont la recette automatique échoue.
