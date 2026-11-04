# Application des suggestions sans modification rétroactive

Date : 4 novembre 2026.

## Problème corrigé

L’approbation remplaçait toutes les affectations individuelles actives qui chevauchaient la période enregistrée dans la suggestion, même pour les journées déjà passées. Une suggestion octobre–décembre approuvée en novembre pouvait donc changer le planning de référence d’octobre.

Les statistiques et la détection des anomalies consultent le planning applicable à la date analysée. Un remplacement rétroactif peut changer les heures attendues et l’interprétation des retards ou absences lors d’une nouvelle analyse, sans changer les pointages bruts.

## Règle mise en place

- La prise d’effet est au plus tôt **le lendemain du jour d’approbation**, dans le fuseau configuré par `TimezoneConfigUtils.getTimezone()` (actuellement `Africa/Douala`). Le jour courant est protégé systématiquement, même sans pointage, pour éviter de modifier une journée déjà commencée.
- Sans date explicite, le début appliqué est le maximum entre demain et le début initial de la suggestion.
- Le client peut transmettre une date future `effective_from` au format `YYYY-MM-DD`. Elle doit être dans la période initiale et au plus tôt demain. Une date invalide est refusée, jamais ajustée silencieusement.
- Seule la période allant de la prise d’effet à la fin initiale est publiée. Les prolongements autorisés de garde et de repos après cette fin restent pris en compte, comme auparavant.
- Une suggestion sans journée future applicable est refusée. Elle reste en brouillon et aucune affectation n’est modifiée.
- Si la nouvelle coupure commence sur une continuation de garde ou un repos post-garde de la suggestion, l’application est refusée. Le gestionnaire doit choisir une autre date ou régénérer la suggestion.
- Si une continuation de garde déjà publiée commence à la date de prise d’effet, l’application est également refusée, pour préserver son lien avec la veille.
- Le traitement reste transactionnel : un échec annule l’ensemble des changements de l’approbation.

Exemple : suggestion du 1er octobre au 31 décembre approuvée le 10 novembre, sans date explicite. L’ancien planning est conservé jusqu’au 10 novembre inclus ; la suggestion est publiée du 11 novembre au 31 décembre. Un éventuel ancien planning au-delà du 31 décembre est conservé, après les prolongements de garde autorisés s’il y en a.

## Modifications fichier par fichier

Les chemins suivants sont relatifs à la racine du dépôt.

| Fichier | Modification et objectif |
| --- | --- |
| `packages/api/src/utils/schedule.suggestion.application-period.ts` (nouveau) | Calcule la période future applicable à partir d’un instant réel et d’un fuseau explicite, valide la date demandée, refuse les périodes expirées et les coupures de garde proposées. Accueille la classe d’erreur métier commune. |
| `packages/api/src/tools/schedule.suggestion.approval.service.ts` | Accepte une date de prise d’effet optionnelle. Conserve la validation structurelle de la suggestion initiale, mais ne charge les modèles de séance et ne crée les blocs que pour les dates effectivement publiées. Recherche les chevauchements à partir de la prise d’effet, conserve le fragment antérieur jusqu’à sa veille et le fragment postérieur après la fin appliquée. Refuse une coupure de continuation déjà publiée. Inscrit la période réellement remplacée dans le motif des anciennes affectations. Renvoie les bornes effectives. Réexporte la classe d’erreur pour préserver les imports existants. |
| `packages/api/src/tenant/routes/schedule.suggestion.route.ts` | Transmet `req.body.effective_from` au service et expose `effective_from` et `effective_to` dans la réponse d’approbation. Les erreurs métier utilisent le mécanisme de réponse existant. |
| `packages/backend/src/routes/schedule.suggestion.route.ts` | Transmet le corps de la requête d’approbation au service BFF pour permettre le choix de la date via le backend. |
| `packages/backend/src/services/schedule.suggestion.service.ts` | Accepte le payload optionnel d’approbation et le relaie à l’API du tenant. Les appels sans payload restent compatibles. |
| `packages/api/verification/schedule-suggestion-approval.test.cjs` (nouveau) | Vérifie les règles de date et exécute le service réel avec des modèles et une transaction simulés, sans serveur ni base externe. |
| `packages/api/docs/modifications-planning/2026-11-04-application-suggestion-sans-retroactivite.md` (nouveau) | Documente le comportement, les fichiers touchés, le contrat API, les vérifications et les limites. |

## Contrat API

Endpoint existant : `POST /schedule-suggestions/:guid/approve` (sous le préfixe habituel de l’API ou du BFF).

Corps facultatif, pour demander une prise d’effet ultérieure :

```json
{
  "effective_from": "2026-11-20"
}
```

Les réponses réussies ajoutent `effective_from` et `effective_to` aux compteurs existants. `effective_to` est la fin nominale de la suggestion ; les prolongements autorisés de garde et de repos peuvent aller au-delà, comme dans le comportement précédent. La période initiale de la suggestion n’est pas réécrite : elle décrit toujours la proposition générée. Les motifs des affectations remplacées enregistrent la plage effectivement publiée.

| Code | HTTP | Signification |
| --- | --- | --- |
| `SUGGESTION_EFFECTIVE_FROM_INVALID` | 400 | Date mal formée ou inexistante. |
| `SUGGESTION_EFFECTIVE_FROM_OUT_OF_RANGE` | 422 | Date passée, jour courant ou date hors de la suggestion. |
| `SUGGESTION_PERIOD_EXPIRED` | 422 | Aucune journée future applicable sans date explicite. |
| `SUGGESTION_UNSAFE_APPLICATION_BOUNDARY` | 422 | La coupure compromet une garde ou son repos. |

## Vérifications

Commande des tests ciblés :

```sh
node --test packages/api/verification/schedule-suggestion-approval.test.cjs
```

Cas couverts :

1. Suggestion octobre–décembre appliquée en novembre : conservation des dates antérieures et du suffixe après décembre.
2. Suggestion future : début initial conservé.
3. Prise d’effet explicite : conservation de l’ancien planning jusqu’à sa veille.
4. Minuit à Douala et changement d’année : calcul indépendant du fuseau du serveur.
5. Date invalide, rétroactive, aujourd’hui ou hors période : refus.
6. Suggestion expirée : absence de modification des affectations et du statut.
7. Modèle de séance retiré concernant uniquement le passé écarté : ne bloque plus la publication future.
8. Coupures de garde, repos post-garde et continuation publiée : refus sans modification.
9. Ancienne affectation sans date de fin : reprise conservée après la suggestion.
10. Repos futurs et prolongements autorisés après la période : publication conservée.
11. Erreur d’insertion : annulation transactionnelle simulée.
12. Suggestion déjà approuvée : seconde application refusée.

Vérifications TypeScript :

```sh
node_modules/.bin/tsc --noEmit -p packages/api/tsconfig.json
node_modules/.bin/tsc --noEmit -p packages/backend/tsconfig.json
```

Résultats de l’exécution finale : **10 tests réussis, aucun échec** (plusieurs scénarios sont regroupés par test). Les vérifications TypeScript de l’API et du backend passent toutes les deux sans erreur. `git diff --check` ne signale aucune erreur d’espacement.

## Périmètre et limites

- Aucune migration de base de données ni modification des pointages ou du calcul des statistiques.
- Aucun écran n’est modifié : la protection s’applique automatiquement aux clients actuels ; le choix explicite d’une date est disponible à l’API/BFF.
- Les anciennes affectations chevauchantes restent désactivées et leurs parties préservées sont recréées, suivant le mécanisme existant. Les identifiants des fragments changent ; les horaires historiques sont conservés. Il ne s’agit pas d’une refonte complète de l’audit des plannings.
- Les propositions déjà appliquées rétroactivement ne sont pas réparées par ce changement. Une correction des données historiques nécessiterait une analyse séparée.
- La partie future d’une suggestion ancienne n’est pas recalculée automatiquement. Si le personnel, les contraintes ou les disponibilités ont changé, il convient de régénérer la suggestion. La validation complète de ces changements de contexte ne fait pas partie de cette correction.
- Les tests du service utilisent une transaction simulée ; ils ne constituent pas une validation d’intégration sur PostgreSQL ni un test de concurrence réelle.
- Les modifications déjà présentes dans `WorkSessions.ts` et `WorkSessionsModel.ts` avant cette intervention ne font pas partie de ce correctif et n’ont pas été éditées.
