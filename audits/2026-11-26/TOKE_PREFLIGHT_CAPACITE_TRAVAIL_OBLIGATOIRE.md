# TOKE — Prévalidation des capacités maximales de travail

La prévalidation compare le travail exigé aux capacités maximales lorsque la politique impose un nombre exact de repos
et le travail les autres jours. Elle vérifie chaque jour, chaque semaine civile et les sous-ensembles de dates les plus
contraignants, par population tournante éligible. Les effectifs sont ceux sélectionnés après exclusions. Les plafonds
sont limités au périmètre des services concernés et tiennent compte de la taille des pools et des quotas journaliers et
hebdomadaires du service plafonné, même quand les minima des services sont à zéro.

Le calcul utilise une borne supérieure optimiste. Il crédite les possibilités de continuation, repos après garde et
dérogation par verrou. Un verrou sur le service plafonné ou un horaire fixe garanti peut en consommer la capacité. Les
affectations fixes encore variables ne sont pas supposées consommer cette capacité. Une borne suffisante ne prouve pas
la faisabilité. Les obligations de repos minimales non exactes et les affectations fixes à capacité indéterminée restent
soumises au solveur.

Le contrôle s’applique au périmètre initial, puis à chaque fenêtre avec ses verrous et son état de bord connus.
Génération et régénération passent par le même service. Une contradiction vérifiée renvoie
`PLANNING_PREFLIGHT_INFEASIBLE` avec les dates, la configuration, les besoins, la population, la capacité, le déficit et
des ajustements à revalider. Aucun ajustement n’est appliqué par l’API. La génération suivante revérifie les paramètres
choisis.

## Résultats

- Ancienne configuration représentative : 24 affectations requises contre 22 disponibles hors compensations. Avec trois
  continuations initiales, la borne optimiste monte à 23 et la contradiction demeure.
- Plafond de 8 h relevé le vendredi, samedi et dimanche : le nouveau contrôle laisse passer la configuration.
  L’exclusion d’un tournant et la suppression de l’obligation de travail hors repos ne déclenchent pas ce blocage.
- Les tests couvrent aussi les dérogations liées aux verrous, les quotas et les configurations compatibles existantes.
  La fixture HTTP génération et régénération utilise un worker local et ne reproduit pas les données de production.

## Fichiers

- `packages/api/src/utils/planning.preflight.validation.service.ts`
- `packages/api/src/utils/schedule.suggestion.generation.service.ts`
- `packages/api/src/utils/test/planning.preflight.validation.service.test.ts`

## Mise en production et retour arrière

Après autorisation, construire l’API avec `npm run build --workspace=@toke/api` puis recharger `api-tenant` via
`npm run autoReload:tenant`. Vérifier la réponse de prévalidation et l’absence d’appel solveur sur une fixture
incompatible, puis vérifier une génération compatible. Pour revenir en arrière, restaurer l’artefact API précédent et
recharger le même processus.

Aucune migration, modification de configuration tenant ni déploiement.
