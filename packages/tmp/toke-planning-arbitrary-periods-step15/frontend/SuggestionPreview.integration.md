# Aperçu de suggestion — diagnostics Step 14

Le type `SuggestionDiagnostics` expose maintenant :

```ts
suggestion.diagnostics.guardPools ?? []
suggestion.diagnostics.weeklyLeaveGroups ?? []
```

Pour résoudre les employés d’un pool, utilisez le GUID utilisateur et non le
GUID de l’item :

```ts
const itemsByUserGuid = new Map(
  suggestion.items.map((item) => [item.user.guid, item] as const),
)
```

`weeklyLeaveGroups` contient, par semaine :

- la population effectivement éligible ;
- `leaveByEmployee`, avec les dates attribuées ;
- le sélecteur appliqué ;
- le périmètre de service appliqué.

Pour l’affichage d’une continuation, le libellé recommandé est
`Fin de garde / récupération` afin de ne pas laisser croire à une nouvelle
garde complète sur la journée.
