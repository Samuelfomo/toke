# ScheduleSuggestionPreview — pools hebdomadaires

Le backend renvoie facultativement :

```ts
diagnostics.guardPools: Array<{
  weekFrom: string
  weekTo: string
  employeeGuids: string[]
  mode: 'WEEKLY_POOL'
  selectionMode: 'ROTATION_ORDER' | 'OPTIMIZED'
}>
```

Ajouter un panneau « Équipes de garde par semaine » en résolvant chaque GUID
avec les employés déjà présents dans `suggestion.items`. Cet affichage est
informatif : les contraintes sont déjà appliquées par OR-Tools.
