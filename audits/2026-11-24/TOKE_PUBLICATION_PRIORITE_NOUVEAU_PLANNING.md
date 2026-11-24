# TOKE — Priorité du nouveau planning à la publication

La suggestion confirmée s’applique à toutes les dates modifiables pour tous ses collaborateurs. Les affectations directes déjà publiées dans cette plage, notamment les gardes et continuations, sont remplacées. Les avertissements signalent les chevauchements d’horaires effectifs, la rupture de garde et les conséquences du remplacement. Les contrôles de couverture, de repos, d’autorisation et de confirmation restent en vigueur.

## Frontière et intégrité

La prise d’effet reste à minuit, au plus tôt demain, dans le fuseau configuré de l’organisation. Le serveur lit le fuseau à partir des métadonnées tenant existantes. Une affectation qui déborde sur la prise d’effet conserve ses horaires jusqu’à minuit. Pour une série récurrente, seule la dernière journée avant la prise d’effet reçoit le snapshot tronqué. Les jours antérieurs conservent les horaires d’origine et le fragment postérieur à la période conserve son snapshot d’origine.

Une continuation hors période dont le début est remplacé conserve ses horaires avec son ancien lien retiré. Une nouvelle continuation est reliée à un début compatible lorsqu’il est identifiable. Sinon, sa plage est publiée comme affectation autonome après avertissement. Le début de garde historique conserve son identification pour la consultation de l’historique. La transaction, l’empreinte de confirmation et la traçabilité dans les diagnostics existants sont conservées.

## Fichiers

- API : `packages/api/src/tools/schedule.suggestion.approval.service.ts`, `packages/api/src/tools/schedule.resolution.service.ts` et `packages/api/src/tenant/routes/schedule.suggestion.route.ts`.
- Cloud : `packages/cloud/src/service/ScheduleSuggestionService.ts` et `packages/cloud/src/views/planning/suggestion/suggestions/ScheduleSuggestionPreview.vue`.
- Vérification : `packages/api/verification/schedule-suggestion-approval.test.cjs`.

## Contrôles

25 tests de publication ciblés réussis sur adaptateur transactionnel de test. Ils couvrent notamment le remplacement de la continuation future, la conservation du début historique, la coupure nocturne à minuit, les chevauchements acceptés, le maintien ou le retrait des liens, le fuseau tenant et la confirmation périmée. Les contrôles TypeScript API et Cloud et `git diff --check` passent. La base du Plateau n’a pas été utilisée.

Aucune migration, modification d’OR-Tools, modification de configuration tenant ni aucun déploiement.
