# Ajustement de ScheduleSuggestionPreview.vue

Ajouter les sources suivantes dans les couleurs et les libellés :

```ts
WEEKLY_LEAVE: 'bg-rose-50 text-rose-800 border-rose-200',
TEMPLATE_REST: 'bg-slate-100 text-slate-600 border-slate-200',
UNASSIGNED: 'bg-white text-slate-400 border-dashed border-slate-200',
```

Libellés :

```ts
if (source === 'WEEKLY_LEAVE') return 'Congé hebdomadaire'
if (source === 'POST_GUARD_REST') return 'Repos après garde'
if (source === 'TEMPLATE_REST') return 'Repos du modèle'
if (source === 'UNASSIGNED') return 'Non affecté'
```

`UNASSIGNED` ne doit pas être présenté comme un congé ou comme un repos réglementaire.
