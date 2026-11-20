# TOKÉ — Nécessité architecturale des cinq tables B1
Date : 2026-11-13, Africa/Douala.
Verdict : **VALIDÉ pour cette analyse statique** ; architecture globale **À SIMPLIFIER**.
Périmètre : module Mémos actuel, consultation B2 et traçabilité ; les corrections horaires futures sont distinguées.

## Décisions
| Table | Décision | Justification technique |
| --- | --- | --- |
| `tk_memo_workflows` | **INDISPENSABLE** | B2 joint cette table pour l'ACL responsable/supérieur. `responsible_user_id`, état et provenance de responsabilité, cycle/version et complétude historique n'existent pas dans `tk_memos`. `validator_user` historique ne constitue pas une certification. |
| `tk_memo_events` | **INDISPENSABLE** | Journal structuré lié au workflow par `last_event_id` et contraintes SQL ; fournit l'historique B2. La timeline JSON `memo_content` ne garantit ni séquence, décision unique par cycle, identité vérifiée ni liens de causalité. Les deux GET ne lisent pas directement ce journal, mais la certification persistée actuelle en dépend. |
| `tk_memo_commands` | **À SIMPLIFIER** | Registre d'idempotence et de résultat transactionnel, utilisé par `toke_b1_observe_legacy` et les FK d'événements. Aucun GET ne le consulte directement et aucun appelant métier de `observeLegacyState()` n'est identifié dans les sources applicatives. Garder une responsabilité technique bornée ; ne pas y recopier systématiquement le contenu du mémo ou tout le journal. |
| `tk_time_raw_observations` | **INUTILE** pour le Mémos actuel | Aucune requête métier de lecture B2 ne l'utilise ; seulement déclarations, validation structurelle et contraintes de fondation. Prépare une preuve horaire brute/provenance pour de futurs correctifs ; elle relève du domaine pointage et ne doit pas être un prérequis fonctionnel de consultation des mémos. |
| `tk_time_correction_changes` | **INUTILE** pour le Mémos actuel | Aucun writer applicatif ni lecteur métier actif identifié pour cette table ; prépare le graphe avant/après des corrections horaires. `tk_memos.affected_entries/affected_session` et `tk_time_entries.memo/correction_reason` couvrent déjà le rattachement, mais pas un journal de corrections certifié : besoin futur distinct, pas nécessité actuelle des GET. |

## Duplications et responsabilités
- Conserver `tk_memos` pour titre/type/statut historique/contenu/cibles ; ne pas recréer ces champs comme seconde source autonome de vérité dans le workflow.
- La provenance de responsabilité et les événements constituent des garanties nouvelles ; ils ne peuvent pas être remplacés par le dernier validateur ou un message JSON.
- État workflow et journal se recouvrent volontairement : projection courante contre historique ; les contraintes SQL doivent garantir leur cohérence.
- Commande et événement doivent rester distincts conceptuellement : déduplication/rejeu contre fait métier. Le payload/résultat ne doit pas devenir une troisième copie de la timeline.
- Observations brutes et changements horaires peuvent être utiles au futur sous-module de correction ; les qualifier INUTILES ici n'autorise ni leur suppression ni la perte d'une preuve existante.

## Dépendance actuelle et portée de la recommandation
`MemoFoundationsPersistence.loadExisting()` vérifie aujourd'hui les cinq tables avant toute lecture : elles sont donc toutes obligatoires **techniquement dans le code livré**, même lorsque seules deux sont directement pertinentes à la lecture/histoire.
La migration B1 et ses FK/triggers constituent un ensemble couplé ; aucune table ne peut être retirée isolément sur la base de ce rapport.
La simplification recommandée est une séparation future entre prérequis de consultation Mémos et fondations de corrections horaires, sans assouplir l'ACL ni remplacer les certificats par des propositions du résolveur.

## Preuves réutilisées et limites
Sources : `tenant/database/data/{memos,time.entries,work.sessions}.db.ts`, `tenant/memos/reads.service.ts`, `tenant/persistence/memos/foundations.{models,persistence}.ts`, `migrations/manual/memo_foundations_b1_v1.sql`.
Rapports réutilisés : `audits/LOT3_ETAPE_B1_VALIDATION.md`, `audits/2026-11-12/TOKE_MEMOS_ETAT_ACTUEL.md`, `audits/2026-11-12/TOKE_MEMOS_B2_POSTGRES_VALIDATION.md`.
Recherche ciblée des références applicatives : aucun branchement des writers horaires B1 n'a été identifié ; les usages SQL et contrôles de structure sont distingués des fonctionnalités effectivement raccordées.
Aucun nouvel audit général, test relancé, accès base/production, changement de code, migration ou modification Git existante. Seul le présent rapport est créé.
