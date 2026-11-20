# Prévalidation de publication des suggestions

## Contrat HTTP

`POST /schedule-suggestion/:guid/approval-preview` sur l’API tenant.
Sur le BFF exposé comme dans l’environnement actuel, utiliser
`POST /local/schedule-suggestion/:guid/approval-preview`.
Les deux routes passent par les mêmes middlewares d’authentification et de
résolution de l’organisation que `/:guid/approve`.

Corps facultatif — `{"effective_from":"2026-12-02"}`.
Sans date explicite, le point de départ est le plus tardif entre demain dans
le fuseau de l’organisation et le début de la suggestion.

Le résultat métier est renvoyé en HTTP 200 dans `data`. Exemple avec une continuation publiée :

```json
{
  "success": true,
  "data": {
    "can_publish": false,
    "effective_from": "2026-12-01",
    "alerts": [
      {
        "severity": "BLOCKING",
        "code": "SUGGESTION_UNSAFE_APPLICATION_BOUNDARY",
        "message": "La publication ne peut pas commencer le 01/12/2026 : une garde déjà publiée se poursuit à cette date.",
        "details": {
          "item_guid": "1453435282470810",
          "effective_from": "2026-12-01",
          "conflict_type": "PUBLISHED_GUARD_CONTINUATION",
          "continuation_date": "2026-12-01"
        }
      }
    ],
    "suggested_actions": [
      {
        "code": "CHOOSE_EFFECTIVE_FROM",
        "message": "Choisissez cette date pour préserver la garde ou le repos en cours.",
        "effective_from": "2026-12-02"
      }
    ],
    "earliest_valid_date": "2026-12-02"
  }
}
```

`alerts[].details` est propre à chaque code. Un conflit de frontière fournit
aussi `conflicts`, les références publiques de la garde et de sa continuation
lorsqu’elles existent, et `affected_guards` pour les continuations publiées
qui recouvrent la période. `conflict_type` distingue une continuation publiée,
une continuation de la suggestion et un repos post-garde de la suggestion.
Une prévalidation publiable peut inclure l’information
`SUGGESTION_PUBLISHED_GUARDS_AFFECTED` ou l’avertissement
`SUGGESTION_PUBLISHED_GUARD_CONTINUATION_OUTSIDE_APPLICATION` si une
continuation publique liée reste au lendemain de la période appliquée.
Le niveau `CONFIRMATION_REQUIRED` est réservé à une extension du contrat.
Un identifiant mal formé produit HTTP 400, une suggestion absente du tenant
HTTP 404 et une erreur interne HTTP 500 avec un message générique.

| Code d’alerte | Signification |
| --- | --- |
| `SUGGESTION_EFFECTIVE_FROM_INVALID` | Date invalide ou format différent de YYYY-MM-DD |
| `SUGGESTION_EFFECTIVE_FROM_OUT_OF_RANGE` | Date antérieure à demain ou hors période |
| `SUGGESTION_PERIOD_EXPIRED` | Aucun jour futur ne reste dans la suggestion |
| `SUGGESTION_ALREADY_RESOLVED` | La suggestion n’est plus un brouillon |
| `SUGGESTION_EMPTY`, `SUGGESTION_EMPLOYEE_NOT_FOUND` | Collaborateurs absents ou devenus indisponibles |
| `SUGGESTION_SCHEDULE_INVALID`, `SUGGESTION_SCHEDULE_INCOMPLETE`, `SUGGESTION_SCHEDULE_PERIOD_MISMATCH` | Contenu de planning invalide ou incomplet |
| `SUGGESTION_TEMPLATE_NOT_FOUND`, `SUGGESTION_TEMPLATE_DAY_INVALID` | Modèle horaire indisponible ou incompatible avec les dates |
| `SUGGESTION_UNSAFE_APPLICATION_BOUNDARY` | La prise d’effet coupe une garde ou un repos protégé |
| `SUGGESTION_NO_COMPATIBLE_EFFECTIVE_DATE` | Aucun jour ultérieur de la suggestion ne satisfait les contrôles |

## Règles de calcul et compatibilité

Le contrôle commun lit le brouillon, les collaborateurs, les modèles horaires
et les affectations existantes. En cas de conflit de garde ou de repos, il
essaye chaque date ultérieure jusqu’à la fin de la suggestion et propose la
première qui passe les mêmes contrôles. La date proposée n’est jamais
appliquée par la prévalidation. Le client doit la transmettre explicitement
à `approve` après décision de l’utilisateur.

La prévalidation utilise une transaction PostgreSQL `REPEATABLE READ` en
lecture seule. La publication réexécute la validation sous transaction
`SERIALIZABLE` avec les verrous de publication avant toute écriture.
Un aperçu peut devenir obsolète si le planning change ou si la date locale
change. Les codes de refus métier de `approve` sont conservés. Les messages
et certains détails sont enrichis ou reformulés.
Le repos post-garde est identifiable par les motifs de la suggestion. Les
anciens repos enregistrés comme repos génériques et les gardes historiques
sans lien de continuation ne peuvent pas être attribués à une garde de façon
fiable. Aucune migration. Le flux de publication partielle et les règles de
couverture ne changent pas.

## Vérifications ciblées

```sh
node --test packages/api/verification/schedule-suggestion-approval.test.cjs
./node_modules/.bin/tsc --noEmit -p packages/api/tsconfig.json
./node_modules/.bin/tsc --noEmit -p packages/backend/tsconfig.json
```

16 tests réussis et les deux vérifications TypeScript ont réussi. Les tests
exécutent le service réel avec un adaptateur transactionnel simulé. Ils
couvrent la lecture seule, la recherche de date, les gardes et repos, le
recontrôle après changement d’affectation, le rollback et le câblage BFF
d’authentification et d’isolation entre deux organisations simulées. Le
contrôle de bout en bout avec PostgreSQL et les authentifiants réels reste
une vérification de préproduction.

## Déploiement et retour arrière

À exécuter après validation. Les processus `api-tenant` et `api-backend`
sont définis dans `ecosystem.config.cjs` et chargent les dossiers `dist`
sous `packages/api` et `packages/backend`. Préparer un checkout propre de
la révision approuvée avec les versions Node/npm habituelles de l’instance.
Compiler dans ce checkout, hors de l’arborescence en service, car les scripts
`build` nettoient leurs dossiers `dist`.

```sh
npm ci
npm run build --workspace=@toke/shared
npm run build --workspace=@toke/api
npm run build --workspace=@toke/backend
test -f packages/api/dist/tenant/server.js
test -f packages/backend/dist/server.js
```

Définir `TOKE_RELEASE` comme le chemin absolu du checkout compilé, accessible
sur le serveur. Vérifier que `pm2 describe` confirme les chemins attendus
avant la copie. Conserver la valeur de `TOKE_BACKUP` pour le retour arrière.

```sh
cd /opt/toke
pm2 describe api-tenant
pm2 describe api-backend
TOKE_BACKUP=$(mktemp -d /opt/toke/.approval-preview-backup.XXXXXX)
cp -a "$TOKE_RELEASE/packages/api/dist" packages/api/dist.approval-next
cp -a "$TOKE_RELEASE/packages/backend/dist" packages/backend/dist.approval-next
mv packages/api/dist "$TOKE_BACKUP/api-dist"
mv packages/api/dist.approval-next packages/api/dist
npm run autoReload:tenant
pm2 status api-tenant
mv packages/backend/dist "$TOKE_BACKUP/backend-dist"
mv packages/backend/dist.approval-next packages/backend/dist
npm run reloadAuto:backend --workspace=@toke/backend
pm2 status api-backend
```

Contrôler le tenant avant de basculer le BFF. Sur l’environnement de
validation, appeler la route via un compte autorisé sur un brouillon publiable,
puis sur un brouillon bloqué et avec un GUID d’une autre organisation.
Vérifier les résultats, l’absence de modification du brouillon et les logs
`pm2 logs api-tenant --lines 30 --nostream` et
`pm2 logs api-backend --lines 30 --nostream`. N’utiliser que la prévalidation
pour le contrôle de disponibilité en production.

En cas de retour arrière, remettre le BFF puis l’API tenant sur les binaires
précédents. Si un seul processus a été basculé, ne restaurer que celui-ci.

```sh
cd /opt/toke
mv packages/backend/dist "$TOKE_BACKUP/backend-dist-failed"
mv "$TOKE_BACKUP/backend-dist" packages/backend/dist
npm run reloadAuto:backend --workspace=@toke/backend
mv packages/api/dist "$TOKE_BACKUP/api-dist-failed"
mv "$TOKE_BACKUP/api-dist" packages/api/dist
npm run autoReload:tenant
pm2 status
```

Aucun rollback de schéma ou de données n’est requis.
