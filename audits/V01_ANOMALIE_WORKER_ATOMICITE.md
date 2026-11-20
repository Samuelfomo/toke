# Worker — atomicité corrigée localement après autorisation

**État : correctif local implémenté et validé sur PostgreSQL fictif. Aucun déploiement autorisé.** Patch autonome : [WORKER_ATOMICITY_FIX.patch](./WORKER_ATOMICITY_FIX.patch), relatif au candidat précédant cette correction ; les patchs WORKER_IDS_FIX et WORKER_LOG_CYCLE_LENGTH_FIX restent distincts et inchangés.

## Défaut initial et preuve avant correction

Le worker exécutait l’UPDATE offset+last_advanced_date puis l’INSERT du journal sans transaction commune. Un trigger refusant le journal dans A puis B prouvait, depuis des connexions indépendantes, un offset/date persistés sans log ; le passage suivant était ignoré. Le test d’acceptation WORKER_ATOMICITY_REQUIRED était rouge. Aucun croisement de bases observé.

## Implémentation et interfaces vérifiées

- `packages/api/src/automate/rotation.cron.ts:122` : une transaction gérée READ COMMITTED par assignation, sur `TenantManager.getConnectionSync()`, gardes V01 actifs.
- `tenant/class/RotationAssignments.ts:42` : relecture active/non supprimée avec `{transaction, lock: transaction.LOCK.UPDATE}`. La date d’avancement est contrôlée **après** l’acquisition du verrou, avant tout calcul ; un autre worker ayant déjà commité provoque un skip.
- `tenant/class/RotationGroups.ts:36` et `:47` : groupe et cardinalité des slots non supprimés relus explicitement sur la même transaction, sans cache d’instance. Les helpers de fréquence, dates, direction et modulo sont inchangés.
- La vérification initiale de groupes existants reste présente, dont le filtre `Op.in` déjà corrigé, pour conserver le comportement antérieur de groupe globalement introuvable. Les décisions sous verrou utilisent toujours les relectures fraîches, jamais ces objets préchargés. Coût SQL accru par assignation, pas de parallélisation du cron ajoutée.
- `RotationAssignments.applyRotationOffset()` → `RotationAssignmentsModel.updateOffsetOnly()` (`:225`) → `BaseModel.updateOne()` : le **même objet transaction** est transmis à l’UPDATE des deux colonnes.
- `RotationAssignmentLog.save()` → `RotationAssignmentLogModel.create()` (`:87`) → génération GUID + `BaseModel.insertOne()` : transaction explicitement transmise au `max('id')` et à l’INSERT. Pas de transaction implicite ni CLS.
- `tenant/database/db.base.ts:41,252` : seules extensions communes nécessaires : argument optionnel `{transaction}` pour insertOne et randomGuidGenerator. Les appels historiques/retours et l’algorithme de GUID restent inchangés ; updateOne/findOne/findAll acceptaient déjà des options.
- Les interfaces worker de sauvegarde reçoivent une transaction optionnelle et un callback interne d’enregistrement de publication. Sans transaction, comportement mémoire historique conservé. Avec transaction, ce callback est requis avant toute écriture ; les mutations mémoire sont préparées mais pas exécutées.

### Confirmation de commit et absence de replay

Sequelize 6.37.8 exécute ses hooks `afterCommit` dans le **finally** de `Transaction.commit()` (`node_modules/sequelize/lib/transaction.js:38–57`), même si commitTransaction échoue. Ils ne peuvent pas, seuls, prouver une confirmation du commit.

Le worker garde donc une file locale de publications (champs offset/date de l’instance et id/GUID du log). Elle n’est exécutée qu’après résolution **réussie** de la transaction gérée (`rotation.cron.ts:166`). processed/skipped sont incrémentés à ce moment. Une erreur UPDATE, GUID, INSERT ou COMMIT traverse le callback et est comptée après rejet ; aucune publication, aucun retry automatique. La file n’est ni globale ni accessible via HTTP ; ses callbacks internes n’effectuent aucun SQL.

Si le commit a réellement eu lieu mais que le signal de réussite est perdu, l’état durable peut être avancé tandis que le résultat rapporte failed. Ce cas n’est pas présenté comme un rollback : pas de rejeu aveugle, réconciliation nécessaire. Les objets du run restent non publiés. Un prochain déclenchement distinct relira l’état réel sous verrou.

## Tests PostgreSQL réellement exécutés

Commande :

```sh
env PATH="/Applications/Postgres.app/Contents/Versions/16/bin:$PATH" node packages/api/verification/tenant-isolation/postgres-integration.cjs --create-disposable-cluster
```

Dernière exécution : **sortie 0**, toutes les suites préparées réussies ; cluster arrêté/supprimé. Node-cron est uniquement un enregistreur inerte, aucun ordonnanceur réel.

- Nominal A/B : groupe informatif à 97, slots A=2/B=3, log.cycle_length=2/3, offset 0→1, date et journal cohérents. Coalescence locale et passage suivant ignoré, un seul journal/avancement.
- `worker-log.postgres.cjs` : refus PostgreSQL BEFORE INSERT du journal et BEFORE UPDATE de l’assignation, chacun dans A puis B, autre tenant exécuté simultanément. Après échec : offset=0/date=NULL, nombre de logs inchangé, instances mémoire inchangées ; autre tenant réussi. Un nouveau déclenchement explicite après suppression du trigger réussit une fois, puis est ignoré.
- Les traces natives enregistrent le PID backend : START TRANSACTION, lecture FOR UPDATE, UPDATE, lecture MAX pour GUID, INSERT et COMMIT/ROLLBACK sont sur **le même backend pour chaque transaction**. L’échec UPDATE ne tente aucun INSERT ; l’échec INSERT déclenche ROLLBACK. Les observations persistantes utilisent des connexions de contrôle indépendantes.
- `worker-atomic-concurrency.postgres.cjs` : deux invocations indépendantes par tenant, sans coalescence du wrapper. Une barrière PostgreSQL externe retient l’assignation A jusqu’à observation de deux sessions attendant réellement FOR UPDATE ; après libération, un seul avancement/log par tenant.
- Deux processus Node distincts rejouent cette course sur les mêmes assignations A/B ; le verrou et la relecture du jour empêchent le double avancement entre processus. `postgres-child.cjs` reste limité au cluster marqué et ferme ses pools avant sortie.
- Transaction non gérée abandonnée après UPDATE et INSERT réels : V01 annule les deux, aucune publication mémoire ; fermeture du pool réussie, génération suivante utilisable.
- Signal de COMMIT incertain : hook de test lançant une erreur **après un COMMIT réellement exécuté**. Le résultat rapporte failed/processed=0, aucune publication mémoire ni second COMMIT ; la connexion de contrôle voit bien les deux écritures durables. C’est une simulation contrôlée de signal perdu, **pas un test de coupure réseau réelle**. L’avertissement Sequelize de destruction de connexion est attendu dans ce scénario.
- Non-régression : 58/58 tests applicatifs, TypeScript API réussi. Les autres suites PostgreSQL préparées (planning/PIN, HTTP, Master/intégrateur, SCRAM, générations/pools, schémas existing) passent aussi. Les sondes framework restent séparées des tests d’acceptation.

## Périmètre, limites et reprise

Sept fichiers applicatifs dans le patch : worker, BaseModel tenant, classes/modèles RotationAssignments et RotationAssignmentLog, classe RotationGroups. Aucun autre service métier, modèle de schéma, contrat HTTP, règle de repos ou de rotation modifié.

Le verrou protège l’assignation contre les avancements concurrents. Il ne prétend pas sérialiser toutes les modifications de configuration des groupes/slots ; celles-ci restent une validation distincte. Les attentes de verrous et les requêtes déjà en vol peuvent prolonger le drainage : aucun kill arbitraire ni retry silencieux ajouté.

Une restauration du code ne restaure pas des données. Ce correctif ne répare pas les anciens journaux manquants et n’invente aucun historique ; une éventuelle réconciliation nécessite une analyse et une autorisation séparées. Aucun accès à ces données de production effectué ici.

L’ensemble AC01–AC40 conserve ses limites explicites dans V01_VALIDATION_POSTGRESQL.md. Aucune autorisation d’inspection ou de déploiement de production n’est déduite de la réussite locale.
