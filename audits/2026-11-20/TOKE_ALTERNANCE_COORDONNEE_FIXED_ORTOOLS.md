# Alternance FIXED avec OR-Tools

## Modèle

Les profils fixes étaient représentés par des affectations constantes
(`TEMPLATE`) ou par une variable de présence liée à un seul modèle.
Pour la paire configurée, des variables de choix relient cette présence
à l’un des deux modèles de référence. Le modèle retenu alimente la
couverture, les congés à périmètre de service, la durée hebdomadaire,
le repos entre services et la restitution. Un jour non travaillé
dans le modèle de référence reste non admissible pour la génération
automatique. Les dérogations verrouillées conservent une seule affectation.

La phase horaire repose sur les jours civils écoulés depuis l’ancre et
la division entière par la cadence, y compris avant l’ancre. Elle ne
dépend ni des repos ni des fenêtres de calcul. La préférence de repos
utilise la parité des semaines à partir du lundi contenant l’ancre.
`KEEP_PROFILE` conserve les règles de repos du profil. Avec
`ALTERNATE_SAT_SUN`, les repos imposés par le template et les jours
autorisés par une politique de congé priment sur la préférence.
L’alternance des repos est réalisable lorsque ces règles laissent
une marge suffisante, comme avec un repos fixe de type `ROTATING`
et un jour de repos hebdomadaire admissible le samedi ou le dimanche.

L’objectif historique domine l’ensemble des pénalités d’alternance.
Les pénalités favorisent le travail admissible et les repos du week-end
souhaités, les horaires opposés, puis l’orientation prévue par l’ancre.
Une limite de récupération écarte les nouveaux changements d’horaire
qui la violeraient. Les transitions historiques entre horaires de référence
et les décisions déjà verrouillées gardent leurs règles existantes.
Les charges fixes de référence déjà présentes et les minutes imposées
par un verrou servent de borne de continuité lorsqu’elles dépassent
la limite habituelle. Les autres profils conservent leur modèle et
leurs contraintes propres.

## Contrat et diagnostic

Le solveur publie `capabilities.fixedAlternation: 1` sur `GET /health`.
L’API sonde une fois par génération concernée et envoie le champ
`fixed_alternation_policy` de contrat 1 au solveur qui l’annonce.
Les listes ordonnées de GUID reprennent les modèles déjà chargés
avec les profils fixes. Les requêtes historiques et GREEDY conservent
leur comportement. Le contrôle de capacité des membres de la paire
distingue couverture potentielle et affectations verrouillées seulement
lorsque le solveur est compatible. Un repli GREEDY repasse les contrôles
de capacité historiques.

OR-Tools compare l’attendu et les affectations résolues. L’API conserve
les observations des jours engagés par fenêtre, puis celles comprises
dans la période demandée. Le champ `fixedAlternation` distingue
`APPLIED`, `PARTIALLY_APPLIED`, `NOT_RESPECTED` et `NOT_APPLICABLE`.
`applied` vaut vrai si au moins une préférence évaluée est respectée.
Chaque écart indique la date, les valeurs attendues et obtenues et les
verrous. Un motif explicite identifie un verrou, un repos du profil ou un
modèle indisponible. Les autres écarts signalent un arbitrage du solveur,
sans attribuer une cause précise que le diagnostic ne démontre pas.

## Résolution représentative

Scénario fictif reprenant les deux profils de la Pharmacie du Plateau.
Les plages utilisées pour le test sont 08 h–16 h et 10 h–18 h, avec un jour
de repos hebdomadaire admissible. Ancre au lundi 28 décembre 2026.

| Date | Aïcha | Camille |
| --- | --- | --- |
| 28 déc. | 10 h | Matin |
| 29 déc. | Matin | 10 h |
| 30 déc. | 10 h | Matin |
| 31 déc. | Matin | 10 h |
| 1 janv. | 10 h | Matin |
| 2 janv. | Repos | Matin |
| 3 janv. | 10 h | Repos |
| 4 janv. | Matin | 10 h |
| 5 janv. | 10 h | Matin |
| 6 janv. | Matin | 10 h |
| 7 janv. | 10 h | Matin |
| 8 janv. | Matin | 10 h |
| 9 janv. | 10 h | Repos |
| 10 janv. | Repos | Matin |

Les 14 préférences évaluées sur cette fixture ont été respectées, sans
écart. Une résolution de contrôle sans extension gardait les horaires
de référence fixes. Les tests de couverture et de verrous produisent
des écarts justifiés. Aucun accès aux données de production.

## Vérifications et mise en ligne

- 12 scénarios Python ciblés exécutent CP-SAT ou la validation de contrat.
  Trois régressions Python existantes passent, dont les verrous du manager,
  les congés à périmètre de service et les continuations.
- 14 tests ciblés TypeScript/Node passent, dont le recontrôle de capacité,
  le transport, la projection par fenêtres et la régénération avec verrous.
- Le test HTTP réel lance Uvicorn sur un port local éphémère et vérifie
  la négociation, un calcul historique et le calcul avec alternance.
- Contrôle TypeScript API réussi. Aucun changement frontend.

Cette étape ne nécessite aucune nouvelle migration. Chaque base tenant
existante doit disposer de la colonne ajoutée à
[l’étape 1](TOKE_ALTERNANCE_COORDONNEE_FIXED.md). Après autorisation,
déployer d’abord le worker `toke-planning-ortools` défini dans
`packages/planning-ortools/ecosystem.ortools.config.cjs`. Vérifier la
capacité sur son adresse PM2 configurée. Compiler ensuite
`@toke/shared` puis `@toke/api` et livrer les binaires d’`api-tenant`
selon la procédure existante. Tester la configuration et la génération
en recette avant d’activer la politique dans le tenant concerné.
Le retour arrière consiste à restaurer l’artefact précédent du tenant,
puis celui du worker. Conserver la colonne et les configurations stockées.
Aucune migration appliquée ni mise en production effectuée.
