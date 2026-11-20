# Alternance coordonnée des profils fixes

## Analyse

- L’écriture de `planning-config` reçoit des champs à plat. En lecture,
  `PlanningSuggestionConfig.toJSON()` assemble `rules` à partir des
  colonnes de la table tenant. Il n’existe pas de colonne JSON `rules`.
  La mise à jour augmente la version de la configuration.
- Un profil `FIXED` fournit son modèle de référence, son ordre, sa limite
  hebdomadaire individuelle et son mode de repos. Le mode `TEMPLATE`
  déduit les jours de repos du modèle horaire. Le mode `ROTATING` concerne
  le repos d’un profil fixe et ne change pas son `planning_mode`. Les
  contrôles de capacité distinguent couverture fixe certaine et potentielle.
- La régénération extrait les décisions manuelles directes. Un autre service
  d’un profil fixe est transmis comme occupation verrouillée, et un repos
  manuel comme affectation nulle verrouillée. Les valeurs et motifs manuels
  sont réappliqués avant la sauvegarde transactionnelle. Dans un calcul par
  fenêtres, les décisions manuelles priment sur les cellules de recouvrement.

## Configuration et préparation

La politique facultative concerne une paire de profils fixes. Elle est
enregistrée dans une colonne JSONB nullable de la configuration existante,
avec le versionnement habituel. Écrire `fixed_alternation_policy` à la racine
du corps de création ou de modification, puis lire
`rules.fixed_alternation_policy`.

| Champ | Valeur |
| --- | --- |
| `enabled` | Booléen |
| `employee_guids` | Deux GUID distincts, dans l’ordre d’ancrage |
| `template_guids` | Deux GUID distincts, dans l’ordre d’affectation à l’ancre |
| `anchor_date` | Date civile valide au format YYYY-MM-DD |
| `shift_cadence_days` | Nombre entier de jours civils par phase. Utiliser 1 pour une cadence quotidienne |
| `weekend_rest` | `KEEP_PROFILE` ou `ALTERNATE_SAT_SUN` |

À l’activation, les deux profils doivent être fixes et actifs dans le tenant.
Les deux modèles autorisés correspondent à l’ensemble de leurs modèles de
référence. Une désactivation garde les paramètres avec `enabled: false`.
La valeur `null` retire la politique. Un champ omis dans un PUT conserve la
valeur stockée. Les autres valeurs de configuration et profils sont conservés.
La modification de la politique change la version de configuration. Le contrôle
existant de régénération des brouillons d’une ancienne version continue à
s’appliquer.

Le futur moteur doit préférer l’association des deux listes à la date
d’ancrage, puis la permutation à chaque changement de phase civile, uniquement
si les deux personnes travaillent le même jour. La phase est
`floor((date - ancre) / cadence)` modulo 2, normalisé y compris avant l’ancre.
Les jours sans travail commun, les dérogations manuelles et les changements
de mois ou de fenêtre ne réinitialisent pas la phase. Avec
`ALTERNATE_SAT_SUN`, la semaine contenant l’ancre préfère samedi pour la
première personne et dimanche pour la seconde, puis inverse à chaque lundi.
L’alternance propose la répartition des repos admissibles. Les repos du modèle,
les règles applicables au profil fixe, les contraintes impératives et les
verrous manuels priment sur cette préférence.

## État actuel et intégration future

L’API prépare les GUID ordonnés, les définitions des deux modèles, l’ancre et
la cadence pour chaque fenêtre. Elle exclut cette extension du payload HTTP
du solveur actuel, dont le schéma refuse les champs supplémentaires. GREEDY
continue d’appliquer son comportement existant. Les prévalidations conservent
leurs contrôles de capacité sur les horaires de référence et ajoutent un
avertissement informatif lorsque la politique est activée. Le diagnostic
`fixedAlternation`, avec `applied: false`, indique
`PENDING_SOLVER_SUPPORT`, `OUT_OF_SCOPE` ou `INCOMPATIBLE_PROFILES`.

L’étape Python devra accepter ce contrat versionné, modéliser les préférences
et leurs écarts, puis vérifier les priorités, la couverture, la continuité
et les verrous sur de vraies solutions. L’API devra alors autoriser l’envoi
aux seules versions compatibles et réexaminer les bornes de couverture fixe
des membres concernés. Aucune alternance de planning n’a été validée ici.

## Fichiers et vérification

- Configuration — route, classe, modèle et schéma Sequelize de
  `PlanningSuggestionConfig`. Modification additive uniquement.
- Génération — `planning.fixed.alternation.ts`,
  `planning.preflight.validation.service.ts`,
  `schedule.suggestion.generation.service.ts`, `suggestion.engine.ts`
  et contrat/adaptateur HTTP dans `utils/solver`.
- Migration tenant — `packages/api/migrations/manual/planning_fixed_alternation_v1.sql`.
  À appliquer à chaque base tenant existante avant une future mise en ligne.
  Les nouvelles bases reçoivent la colonne du schéma Sequelize.
  Les lignes existantes gardent une valeur nulle. En cas de retour aux
  binaires précédents, conserver la colonne et ses données.

TypeScript et 12 contrôles ciblés réussis. Ils couvrent le format de politique,
l’activation, la désactivation et la persistance versionnée dans un adaptateur
simulé, la conservation des profils existants, le recouvrement mensuel et
annuel avec une ancre inchangée, l’absence du champ sur le transport hérité,
les avertissements de prévalidation et la conservation d’un horaire et d’un
repos manuels pendant la régénération. Migration fournie et non appliquée.
Aucun déploiement.
