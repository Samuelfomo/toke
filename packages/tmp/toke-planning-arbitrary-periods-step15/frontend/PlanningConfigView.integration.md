# Intégration de la configuration — Step 14

Remplacer le composant `PlanningConfigForm.vue` par la version fournie.

Le formulaire charge les Session Templates afin de permettre une politique de
repos ciblée par template. Il expose aussi les portées `ANY`, `SERVICE_TYPE`,
`TEMPLATE` et `REQUIREMENT`.

Aucune propriété supplémentaire n’est requise dans `PlanningConfigView.vue` si
le composant reçoit déjà `open`, `config`, et émet `close` / `saved`.
