# Ajustement de PlanningConfigView.vue

Remplacer la carte générique « Repos minimum par semaine » par une carte conditionnelle.

## TEAM_ROTATION

Titre : `Congé hebdomadaire tournant`

Valeur :

```ts
`${policy.employees_per_week} collaborateur(s) par semaine`
```

Description :

> Le congé est accordé au niveau de l’équipe selon l’ordre de rotation des profils.

Exemple :

> Avec 13 collaborateurs et un bénéficiaire par semaine, chacun reçoit son congé une fois sur un cycle de 13 semaines.

Afficher également :

- jours autorisés ;
- date de début du cycle ;
- semaines complètes uniquement ;
- repos post-garde distinct ou fusionné.

Pour `max_consecutive_work_days === null`, afficher :

- Valeur : `Règle désactivée`
- Description : `Les collaborateurs non sélectionnés pour le congé peuvent travailler 7 jours sur 7.`

## PER_EMPLOYEE

Conserver la carte existante, mais préciser :

> Chaque collaborateur reçoit individuellement le nombre de jours indiqué.

## NONE

Afficher :

> Aucun congé hebdomadaire n’est imposé automatiquement par le moteur.
