# TOKE — Vérification et publication des suggestions

La prévisualisation en lecture seule distingue les informations, les avertissements métier et les blocages d’intégrité. Elle vérifie la couverture avec les besoins enregistrés pour la configuration de la suggestion et le repos entre services avec les horaires qui seront effectivement appliqués. Les autres écarts sont lus dans les diagnostics disponibles. L’interface affiche les impacts, les détails des gardes, les raccourcis vers les cellules, les collaborateurs, les besoins et la configuration concernée. Le retour depuis une correction dans la grille relance la vérification sans régénérer le brouillon.

## Protection des gardes et confirmation

Une garde publiée qui traverse une borne est conservée avec sa continuation. Les dates concernées sont exclues de la publication pour le seul collaborateur touché. Une continuation créée par la suggestion ne peut pas être publiée sans son début. Une garde entièrement incluse peut être remplacée avec sa continuation, avec avertissement. Les fragments des affectations hors des dates réellement remplacées sont conservés. Un chevauchement publié sur une date à préserver reste bloquant. Une autre date est proposée si la validation permet de résoudre le conflit de début de période.

Si des avertissements subsistent, l’API exige l’empreinte du plan présenté au manager. Elle recalcule le plan sous transaction sérialisable et refuse une confirmation périmée. Le manager actif propriétaire de la suggestion est vérifié dans l’organisation, y compris lorsqu’il est représenté par une délégation intégrateur vérifiée auprès du Master. L’enregistrement conserve le responsable, le mode d’accès, l’instant, le motif facultatif, les avertissements et les impacts dans les diagnostics JSONB existants. Aucune migration.

## Fichiers

- API tenant : `tools/schedule.suggestion.approval.service.ts`, `utils/schedule.suggestion.bulk-edit.service.ts`, `tenant/routes/schedule.suggestion.route.ts` sous `packages/api/src/`.
- BFF : `routes/schedule.suggestion.route.ts`, `services/schedule.suggestion.service.ts` et `services/tenant.api.proxy.service.ts` sous `packages/backend/src/`.
- Cloud : `service/ScheduleSuggestionService.ts`, `ScheduleSuggestionPreview.vue`, `PlanningRequirementList.vue` et `PlanningConfigEditorView.vue`.
- Vérification : `packages/api/verification/schedule-suggestion-approval.test.cjs`.

## Vérifications et limites

21 tests ciblés sur adaptateur transactionnel de test vérifient notamment la publication sans anomalie, l’acceptation des avertissements, la conservation d’une garde traversant la borne, le rejet d’une confirmation périmée, la révérification de la couverture et du repos, les contrôles de session et d’organisation, le refus des chevauchements et le retour arrière sur erreur. Un scénario Chrome avec API simulée couvre les détails de garde, la correction d’une cellule, la nouvelle vérification et l’envoi du motif. Les contrôles TypeScript API, BFF et Cloud passent. Les affectations réelles du Plateau et une transaction PostgreSQL de production n’ont pas été exécutées.

La couverture est vérifiée sur les collaborateurs du périmètre de la suggestion. La conservation liée des gardes s’appuie sur le lien de continuation des affectations publiées. Aucun changement de configuration métier, de génération ni d’OR-Tools. Aucun déploiement.
