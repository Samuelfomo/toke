# Alternance des horaires fixes dans le Cloud

La section se trouve dans **Règles de planification → Charge de travail**.
Elle propose une seule paire de collaborateurs et reprend les contrôles
Vue existants. Le service de profils fournit les profils actifs et leurs
modèles de référence. L’interface filtre les profils `FIXED`, empêche
de sélectionner deux fois la même personne et vérifie que les horaires
sont disponibles et distincts. Elle contrôle la date de référence et
une cadence entière de 1 à 366 jours. Le repos du week-end offre
`KEEP_PROFILE` et `ALTERNATE_SAT_SUN`. Le formulaire signale la limite du
calcul rapide et les écarts avec les références enregistrées.

Le formulaire lit `rules.fixed_alternation_policy` et envoie
`fixed_alternation_policy` à la racine uniquement si la politique change.
La désactivation préserve les paramètres déjà enregistrés. Une politique
non configurée reste absente de la requête. Si les profils sont
indisponibles, l’édition de la politique attend leur rechargement, tandis
que les autres règles peuvent être sauvegardées. En modification, le PUT
contient les champs réellement modifiés. Les autres règles restent en
place et le versionnement serveur reste celui de la configuration.
Le parcours existant revient à la liste après sauvegarde et recharge
la configuration à la prochaine ouverture.

La liste **Profils employés** affiche « Alternance active » pour les
membres fixes actifs référencés dans la politique de la configuration
active. Le mode et l’horaire de référence sont toujours affichés.

## Fichiers

- `configuration/PlanningConfigForm.vue`, `PlanningConfigEditorView.vue`,
  `planningConfig.steps.ts` et `fixedAlternationForm.ts`.
- `planningSuggestion.type.ts` et `service/PlanningSuggestionConfigService.ts`.
- `profiles/EmployeePlanningProfileList.vue` et
  `verification/fixed-alternation-form.test.mjs` dans le paquet Cloud.

## Vérifications

- TypeScript Cloud et lint ciblé des fichiers TypeScript réussis.
- Syntaxe, doublons et validité de `v-model` vérifiés sur les SFC avec
  les parseurs Vue/TypeScript du dépôt. La configuration ESLint racine
  couvre seulement les fichiers TypeScript et TSX.
- Trois tests unitaires et un parcours Chrome local réussis. Le navigateur
  couvre une configuration initialement sans politique, l’activation,
  les profils disponibles, la duplication, la date, l’ordre des GUID,
  la sauvegarde avec une charge utile partielle, la réouverture,
  la désactivation, la réactivation et la sauvegarde d’un autre champ
  lorsque les profils sont indisponibles. Section vérifiée à 1280 et 390 px.
  Les réponses API étaient fictives.

Aucun changement d’API, de solveur ou de données. Aucune migration ni mise
en production effectuée.
