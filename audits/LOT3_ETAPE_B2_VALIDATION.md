# TOKÉ — Lot 3 / étape B2 : responsabilité et consultation

9 novembre 2026. **Verdict : VALIDÉ SOUS RÉSERVES.** Les derniers tests de compatibilité demandés ont réussi sur PostgreSQL A/B. Le dernier passage complet B2 est réussi ; deux ajustements de présentation et des assertions supplémentaires ajoutés ensuite n’ont pas bénéficié d’un nouveau passage PostgreSQL/HTTP. B2 ne constitue pas une autorisation de release. B3, B4 et lot 4 non commencés ; V01 reste clôturé sous ses réserves antérieures.

Références : [contrat](./LOT3_CONTRAT_IMPLEMENTATION.md), [plan B](./LOT3_ETAPE_B_PLAN_IMPLEMENTATION.md), [B1](./LOT3_ETAPE_B1_VALIDATION.md). La préparation de release est analysée séparément dans [TOKE_PREMIERE_RELEASE_PLAN.md](./TOKE_PREMIERE_RELEASE_PLAN.md).

## 1. Fichiers réellement créés/modifiés pendant B2

| Fichier | Intervention |
|---|---|
| `packages/api/src/tenant/memos/responsibility.policy.ts` | Création : snapshot PostgreSQL de l’organisation, résolveur déterministe et calcul des supérieurs autorisés. |
| `packages/api/src/tenant/memos/reads.service.ts` | Création : politique ACL centrale, listes/détail/historique/statistiques sous transaction de lecture ; projection de responsabilité. |
| `packages/api/src/middle/memo-b2-reads.ts` | Création : liste fermée de routes GET locales, preuve A indépendante, middleware tenant existant et contrôle référence tenant. |
| `packages/api/src/tenant/app.ts` | Ajout uniquement d’un import et du montage `memoB2ReadGateway` après ServerAuth, avant `managerSessionBoundary`. Les changements antérieurs de ce fichier sont préservés. |
| `packages/api/verification/tenant-isolation/postgres-memo-b2.cjs` | Création : banc A/B jetable, Redis privé, vrais transports HTTP et lectures SQL. |
| `audits/LOT3_ETAPE_B2_VALIDATION.md` | Création : présent rapport, preuves et réserves. |

La reprise finale de priorité n’a modifié **aucune source applicative ou de test supplémentaire** : seulement les deux rapports demandés. Aucun changement de fichier .env, configuration réelle, schéma historique, Master/provisioning, worker, CLOCK_IN, Shared, BFF ou Cloud. Les fichiers B1 et les sources A/V01 protégées restent identiques à leurs empreintes relevées avant B2. Aucun reset/clean Git.

## 2. Résolveur : proposition calculée, sans affectation

`loadMemoOrganization` lit les vrais utilisateurs, rôles/affectations, liens `xa_org_hierarchy` et groupes `xa_groups` sur la connexion tenant gardée V01. Date serveur en Africa/Douala ; comparaison inclusive des dates DATEONLY (`effective_from <= jour`, `effective_to IS NULL OR >= jour`). Aucun cache positif inter-requêtes.

- Utilisateur actif, non supprimé et rattaché à la référence tenant ; manager éligible : rôle MANAGER ou ADMIN-RH courant. Les rôles ne donnent pas une supervision globale.
- Seuls les DIRECT_REPORT sont des liens hiérarchiques. Un direct fiable unique prime sur les groupes et sur tout `assigned_by` divergent. Plusieurs personnes au niveau direct : UNRESOLVED ; aucune sélection par ordre SQL/GUID/date la plus récente.
- Sans direct applicable, groupes non supprimés et membres actifs ; le schéma n’a pas de colonne groupe.active. Convention historique conservée : champ member.active absent admis, false exclu. Une date joined_at future ne donne pas une appartenance présente. Structure invalide, dates incohérentes, doublon du membre, manager inactif/non habilité ou cycle : REVIEW_REQUIRED conservateur.
- Plusieurs groupes avec le même manager sont dédupliqués ; plusieurs managers distincts : UNRESOLVED. Aucun candidat : UNRESOLVED.
- Les cycles sont recherchés dans les liens directs accessibles ; profondeur bornée à 256, dépassement refusé. Les snapshots sont bornés à 20 000 lignes par ensemble ; dépassement => indisponibilité fermée, jamais sélection d’un sous-ensemble tronqué.

Le résultat porte `proposalOnly:true`. **Il n’est pas un certificat de responsabilité et n’accorde aucun droit HTTP.** B2 ne soumet pas de mémo et ne persiste aucune attribution. Un manager de groupe ne devient jamais le supérieur d’un autre manager.

## 3. Matrice centrale de consultation

Prérequis commun : preuve utilisateur A vérifiée indépendamment par l’API, tenant de la preuve = routage = portée V01 = référence de configuration ; utilisateur relu actif/non supprimé dans PostgreSQL, avec référence tenant concordante.

| Relation réelle au mémo | Consultation B2 | Commentaire / décision / correction / transfert |
|---|---|---|
| Auteur courant authentifié | Oui | Fermés |
| Collaborateur cible authentifié | Oui | Fermés |
| Responsable persisté dans workflow ASSIGNED, compte/rôle manager encore éligible | Oui | Fermés |
| Supérieur courant du responsable certifié, par chaîne DIRECT_REPORT active unique, valide et sans cycle | Oui | Fermés |
| Ancien validator_user seul | Non | Fermés |
| Manager proposé par le résolveur, sans workflow certifié | Non, sauf auteur/cible | Fermés |
| Manager de groupe / autre branche / assigned_by seul | Non, sauf autre relation autorisée indépendante | Fermés |
| Workflow absent, UNRESOLVED ou REVIEW_REQUIRED | Auteur/cible seulement ; aucune supervision déduite | Fermés |
| Compte inactif/supprimé, session absente/expirée/révoquée, mauvais tenant | Refus | Fermés |

La supervision est calculée à partir du **responsable figé**, jamais en réattribuant le dossier d’après l’équipe actuelle du collaborateur. Le changement de groupe ne crée pas de nouveau responsable sur un ancien mémo. La suppression/expiration d’un lien supérieur supprime ce droit de supervision à la lecture suivante. Une chaîne ambiguë/incohérente n’accorde aucune supervision.

La condition SQL est : auteur OU cible OU (workflow ASSIGNED ET responsable appartenant à l’ensemble des responsabilités accessibles au principal). Elle précède filtres, GROUP BY, COUNT, LIMIT/OFFSET. Jointure externe univoque sur workflow ; aucune multiplication par les événements. Données et comptages sont lus dans le même snapshot REPEATABLE READ, explicitement READ ONLY.

404 identique pour mémo inexistant et inaccessible. Aucun contenu d’erreur SQL renvoyé ; panne/schéma non prêt => 503 générique. Les GUID de filtres réduisent le périmètre, ils ne prouvent aucun droit. Un `supervisor` différent du principal est refusé. Paramètres inconnus ou non scalaires refusés ; paramètres SQL liés ; tri fermé et pagination bornée.

## 4. Routes préparées et activation strictement locale

Le montage applicatif ne modifie pas le verrou A. L’accès B2 exige **à la fois** `NODE_ENV=test` ou `development` et `MEMO_B2_LOCAL_READS=1`, ainsi que ServerAuth et preuve A. Sans activation, ou en production même avec ce flag, le traitement revient au verrou `memo_permissions_pending`. Aucun fichier d’environnement réel n’a été configuré.

| GET Tenant autorisé localement | Périmètre |
|---|---|
| `/memo`, `/memo/`, `/memo/list` | Liste ACL, compte exact de l’ensemble filtré puis pagination stable date/id. |
| `/memo/my-created` | Auteur = principal, dans l’ACL. |
| `/memo/my-memos` | Auteur/cible = principal ; pas toute la file de supervision. |
| `/memo/pending` | Statut SQL pending, sans le confondre avec submitted. |
| `/memo/pending-validation` | submitted + ASSIGNED + responsable = principal ; un supérieur ne reçoit pas une file « à valider ». Aucune mutation autorisée. |
| `/memo/auto-generated` | auto_generated=true dans l’ACL. |
| `/memo/type/:type/list`, `/memo/status/:status/list` | Types/statuts fermés, ACL commune. |
| `/memo/target/:guid/list`, `/memo/validator/:guid/list` | Filtre sur la relation persistée **à l’intérieur** de l’ACL. Le second n’accorde aucun droit au dernier validateur. |
| `/memo/statistics/overview` | Total et répartitions calculés uniquement sur les mémos autorisés ; aucun total tenant en fallback. |
| `/memo/:guid` | Détail autorisé, statut, responsabilité, échanges textuels disponibles et complétude. |
| `/memo/:guid/events` | Événements autorisés, ordre sequence et curseur after ; métadonnées générales/commandes non exposées. |

Les GUID admis par la nouvelle liste de routes sont les identifiants numériques historiques ou UUID ; les autres formats/alias non validés restent fermés. Le BFF mémos reste intégralement fermé ; aucun branchement Cloud ou nouveau format du BFF n’est livré. Les réponses locales B2 sont une projection réduite, pas une revendication de compatibilité avec toute l’ancienne enveloppe Cloud.

**Toujours fermés** : toutes mutations POST/PUT/PATCH/DELETE, marquage lu, réponses/commentaires, validation/rejet/lot, réouverture/escalade/transfert, corrections ; uploads/téléchargements/pièces, tickets et émissions mémos Socket.IO ; revision/requirement, urgent, escalated-to-me, préventifs/correctifs et listes session/date non explicitement admises, analyses tierces et maintenance. HEAD n’est pas traité comme GET. Les capacités renvoyées indiquent toutes ces actions à false.

Les messages LINK et champs médias ne sont pas exposés par la projection des échanges ; aucun proxy de fichier n’est ouvert. Les fermetures SocketAuth/MemoEventsService et du BFF sont inchangées. Aucun test Socket.IO réseau complet nouveau n’est revendiqué ; B2 ne l’active pas. Les statuts de lecture ne sont pas ouverts faute de recette ACL complète de leur mutation ; aucune écriture MemoReads n’est effectuée.

## 5. B1 et compatibilité historique

Le service utilise `MemoFoundationsPersistence.loadExisting` inchangé. Schéma absent/incompatible : refus, aucune création ou sync. Les lectures ne prennent pas en charge un dossier par écriture implicite : ni `observeLegacyState`, ni INSERT/UPDATE de workflow, événement ou commande. Aucun nouveau rôle SQL, fonction de mutation ou migration B2.

Représentation : statut SQL original inchangé parmi les cinq existants, responsabilité distincte et libellé « Responsable à désigner », motif et complétude LEGACY_INCOMPLETE lorsque le workflow manque. Un responsable certifié devenu inactif/non éligible est présenté REVIEW_REQUIRED, sans mise à jour silencieuse du workflow. L’ancien responsable reste identifiable dans la preuve persistée.

Les APPROVED/REJECTED et échanges existants sont conservés. Les messages hérités sont présentés comme tels (`authorship_verified:false`) ; ils ne sont pas convertis en DECIDED. Un historique dédié absent reste vide et explicitement incomplet. Ni validator_user ni une relation expirée ne reconstruisent une ancienne responsabilité.

Les fixtures A/B comprennent : mémos sans workflow avec/sans validator, APPROVED/REJECTED ; workflow UNRESOLVED créé **explicitement par la fonction bornée B1 dans la préparation du test** ; et un workflow ASSIGNED synthétique préchargé sous propriétaire migration pour exercer la lecture d’un futur état certifié. Ce dernier respecte les contraintes physiques B1, sans désactiver de garde ; ce n’est pas un producteur d’attribution métier livré ni une preuve de la future commande d’assignation. Le CHECK des commandes reste celui de B1. Les données sont fictives et neuves ; aucun ancien mémo réel n’est modifié/backfillé.

## 6. Tests exécutés et niveau de preuve

PostgreSQL 16.15, schémas réels bootstrapés dans un **nouveau** cluster privé A/B sans TCP, migration B1 originale exécutée sous NOLOGIN migrate_a/b ; runtime_a/b non propriétaires, SELECT seulement sur les fondations. Redis privé sur socket Unix ; Master/API HTTP en boucle locale sur ports aléatoires autorisés. Aucun .env réel, connexion production, ordonnanceur réel ou notification externe.

Commande B2 :

```sh
PATH="/Applications/Postgres.app/Contents/Versions/16/bin:$PATH" node packages/api/verification/tenant-isolation/postgres-memo-b2.cjs --create-disposable-cluster
```

| Vérification | Preuve / résultat du dernier passage réussi |
|---|---|
| Direct unique ; groupe unique sans direct ; direct/groupe divergents | Vraies lectures PG A et B, PASS. |
| assigned_by divergent | Affectation du rôle salarié vers un autre manager dans la fixture ; direct fiable toujours prioritaire, absence de liens ne crée pas de responsabilité. PG A/B, PASS. |
| Directs contradictoires, groupes distincts concurrents | UNRESOLVED sans départage. PG A/B, PASS. |
| Plusieurs groupes même manager, active absent/false, adhésion future | Déduplication/convention historique/exclusion ; PG A/B, PASS. |
| Dates expirées/inversées, non DIRECT_REPORT, cycle, inactif et retrait du rôle | UNRESOLVED/REVIEW_REQUIRED selon l’anomalie ; PG A/B, PASS. |
| Auteur, cible, responsable, supérieur ; autre branche/non-participant | ACL sur vrais mémos PG, PASS. |
| Supervision fondée seulement sur groupe ou lien matrix ; cycle entre managers | Aucun droit ; PG A/B, PASS. |
| Workflow absent ou explicitement UNRESOLVED, ancien validator sans mandat, APPROVED/REJECTED | Pas d’attribution ni de DECIDED inventé ; PG A/B, PASS. |
| Changement de groupe, responsable inactif, lien supérieur supprimé/expiré | Pas de reprise rétroactive ; perte d’accès dérivé ; PG A/B, PASS. |
| Pagination/statistiques, historique | Comptages ACL, page d’un élément, historique accessible/inaccessible ; PG puis HTTP, PASS. |
| Identité falsifiée, preuve absente/GUID seul, mauvais tenant, accès API direct | Véritable client d’introspection A et HTTP/API, codes 401/403/404 attendus ; PASS. |
| Session révoquée et réellement expirée | Autorité A inchangée + vrai Redis ; expiration par horloge contrôlée de l’émetteur et signature valide, refus par Master courant ; PASS. |
| Routes spécialisées, mutations/médias fermés, flag absent/production | HTTP réel, liste de routes et verrous, PASS au dernier passage. Renforcement final des assertions de contenu par route non rejoué, voir réserve. |
| Intégrité B1, absence de backfill | Nombres workflow/événement/commande stables, lignes Memos comparées intégralement, UPDATE/DELETE runtime refusés ; PASS. |
| Isolation | Mauvais tenant refusé et CONNECT SQL runtime A vers B refusé ; guards V01 inchangés. PASS. |

Dans ce banc, la signature HMAC, le client d’introspection, le routeur Master de sessions, ServerAuth, le middleware tenant, le service de lecture, Sequelize/pg/PostgreSQL et Redis sont réels. La configuration des tenants et le catalogue des clients techniques sont des fixtures injectées. Le contrôle actif des comptes utilisé par l’autorité de test effectue de vraies lectures PG ; le catalogue Master complet/SMTP n’est pas déployé. Le serveur `App` complet n’est pas lancé : son montage est relu statiquement, les middlewares sélectionnés sont exécutés par Express réel.

Régressions séparées effectivement exécutées pendant B2 :

- Banc B1 **inchangé**, nouvelle paire A/B : sortie 0, tous groupes d’intégrité/idempotence/immutabilité/rollback/existing réussis.
- `node packages/api/verification/user-sessions/run.cjs --create-disposable-redis` : **20 scénarios réussis**, sortie 0 ; ses résolveurs actifs sont des fixtures, pas une preuve PG supplémentaire.
- `node --test` sur `acceptance.test.cjs`, `guarded-orm.test.cjs`, `lifecycle.test.cjs`, `actual-http.test.cjs` : **42/42**, sortie 0. Infrastructure simulée/pilote inerte et dispatch Express selon chaque test ; ce résultat ne recertifie pas toute V01.
- TypeScript API final sans émission et syntaxe Node du banc : réussis, sortie 0. Aucun build/destruction de dist.

Aucune suite globale provisioning n’a été relancée ; le défaut PROVISIONING_RECOVERY_REQUIRED reste distinct et n’est ni corrigé ni déclaré vert. Les premiers essais B2 ont corrigé des fixtures (unicité couleur/groupe, interop du chargeur et rôle d’inspection), sans assouplir de contrainte ni donner un droit d’écriture au runtime.

### Trace durable du dernier passage complet réussi

```text
postgres (PostgreSQL) 16.15 (Postgres.app)
PASS PG a.v01.invalid: manager direct unique
PASS PG a.v01.invalid: groupe seul
PASS PG a.v01.invalid: direct prioritaire sur groupe divergent
PASS PG a.v01.invalid: directs contradictoires
PASS PG a.v01.invalid: groupes concurrents
PASS PG a.v01.invalid: membre inactif
PASS PG a.v01.invalid: direct expiré et non DIRECT_REPORT
PASS PG a.v01.invalid: cycle
PASS PG a.v01.invalid: manager inactif
PASS PG a.v01.invalid: groupes multiples même manager
PASS PG a.v01.invalid: adhésion future
PASS PG a.v01.invalid: rôle manager retiré
PASS PG a.v01.invalid: intervalle incohérent
PASS PG a.v01.invalid: central ACL, author/target/responsible/superior, history, no validator fallback, pagination/statistics, inactive/deleted/expired relation, changed group, zero writes
PASS PG b.v01.invalid: manager direct unique
PASS PG b.v01.invalid: groupe seul
PASS PG b.v01.invalid: direct prioritaire sur groupe divergent
PASS PG b.v01.invalid: directs contradictoires
PASS PG b.v01.invalid: groupes concurrents
PASS PG b.v01.invalid: membre inactif
PASS PG b.v01.invalid: direct expiré et non DIRECT_REPORT
PASS PG b.v01.invalid: cycle
PASS PG b.v01.invalid: manager inactif
PASS PG b.v01.invalid: groupes multiples même manager
PASS PG b.v01.invalid: adhésion future
PASS PG b.v01.invalid: rôle manager retiré
PASS PG b.v01.invalid: intervalle incohérent
PASS PG b.v01.invalid: central ACL, author/target/responsible/superior, history, no validator fallback, pagination/statistics, inactive/deleted/expired relation, changed group, zero writes
Mon, 09 Nov 2026 09:04:37 GMT router deprecated handlers that are Promise-like are deprecated, use a native Promise instead at node_modules/router/index.js:342:13
Mon, 09 Nov 2026 09:04:37 GMT router deprecated handlers that are Promise-like are deprecated, use a native Promise instead at node_modules/router/lib/route.js:157:13
PASS HTTP a.v01.invalid: real A/Redis verification, independent Tenant auth, direct API proof, scoped reads, opaque404, forged GUID, bad tenant, closed mutations/media
PASS HTTP b.v01.invalid: real A/Redis verification, independent Tenant auth, direct API proof, scoped reads, opaque404, forged GUID, bad tenant, closed mutations/media
PASS B2: actual PostgreSQL A/B, private Redis and signed Master/API HTTP; B1 remains immutable; no backfill, no business mutation, no public unlock
```

## 7. Réserve précise sur la version finale et arrêt

Après ce passage réussi, seules les évolutions suivantes ont été ajoutées :

- Présentation : motif RESPONSIBLE_UNAVAILABLE au lieu de WORKFLOW_ABSENT pour le responsable indisponible et présence de history_completeness dans les éléments de liste.
- Tests : vérification renforcée du contenu ACL de chaque liste spécialisée et de certains totaux, variantes racine/casse/slash final.

Le résolveur, la condition SQL ACL, les contrôles de session, la transaction READ ONLY et les trois cas de compatibilité demandés sont ceux du passage réussi. **Le rejeu complet de ces derniers ajustements n’a pas été exécuté.** La revue automatique d’autorisation du lancement PostgreSQL a échoué sur la limite d’usage avant exécution, sans décision d’insécurité ; aucune tentative de contournement. Cette réserve interdit d’assimiler les empreintes actuelles à un artefact intégralement retesté.

Aucun défaut de permission B2 n’est connu sur les scénarios exécutés. Limites conservées : activation locale seulement, BFF fermé, aucune assignation persistable par B2, médias/lecture mutante/Socket.IO hors recette, bornes de volumétrie, snapshot d’autorisation par requête et absence de test de charge. Les droits ne constituent pas une révocation rétroactive d’octets déjà reçus.

**Arrêt B2 : VALIDÉ SOUS RÉSERVES, avec rejeu final bloqué et approbation métier/formelle de B2 encore attendue.** Aucun passage à B3/B4/lot 4. Aucun déploiement, migration réelle ou changement de V01.

## 8. Empreintes actuelles et intégrité des références protégées

Ces empreintes identifient la version finale locale, y compris les retouches non rejouées ; elles ne sont pas présentées comme celles du dernier passage PostgreSQL.

| Fichier B2 | SHA-256 |
|---|---|
| `packages/api/src/tenant/memos/responsibility.policy.ts` | `ff6aa9ebf0072097dbaa907797b9e553009839189484c5fb4c2db70d962db442` |
| `packages/api/src/tenant/memos/reads.service.ts` | `eecaabba27563eff951144ba174f2e55499ad10b9ede6ddacd07e55bf7787dae` |
| `packages/api/src/middle/memo-b2-reads.ts` | `e1a8bf9b5602a677eae6eae4ce85375031397b44cb8000d5cdf5e7378d3190ab` |
| `packages/api/src/tenant/app.ts` | `de6c34baa37b4cf09e0505cb9d6caa12e22efad46a960971cd1615744e6fa6e8` |
| `packages/api/verification/tenant-isolation/postgres-memo-b2.cjs` | `8d4291369a6638cdaab8c83ad0edc625bf23dcdd18d48ce20bab50799658bda0` |

Contrôle final : les 19 références B1/A/V01/routes historiques/worker/CLOCK_IN relevées avant B2 restent identiques ; aucun cluster B2 marqué restant. SHA-256 du journal complet réussi reproduit ci-dessus : `5c4dd234a2ddb424b138eb12a6c981dfb1bcbe47e21ffe574059da22df2c5fde`.
