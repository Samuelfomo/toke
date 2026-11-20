# Recette V01 — deuxième défaut worker, indépendant de l’isolation

**État actuel : champ corrigé après autorisation, rotation nominale validée ; défaut d’atomicité SQL confirmé et non corrigé. Les constats initiaux ci-dessous sont conservés comme historique.**

## Reproduction et cause (avant toute correction)

Après le correctif WORKER-IDS autorisé, les groupes sont sélectionnés correctement sur PostgreSQL fictif. Avec une assignation active et deux slots de cycle, `runForTenant()` retourne `processed: 0`, `failed: 1`, erreur : `cycle_length is required to create a RotationAssignmentLog`.

`packages/api/src/automate/rotation.cron.ts` effectue `applyRotationOffset()` puis construit un log sans renseigner `cycle_length`. `RotationAssignmentLogModel.create()` exige ce champ (lignes 96–97) et la colonne PostgreSQL est également NOT NULL. Le setter existant est `RotationAssignmentLog.setCycleLength()` ; le `.setTemplateCount(...)` commenté dans le worker ne correspond à aucun appel exécuté. La même omission existe dans HEAD. Aucun changement de V01 ne l’a introduite.

Conséquence importante : l’UPDATE de l’offset et de `last_advanced_date` précède l’erreur de création du log, sans transaction englobant les deux. La recette vérifie cet état dans chaque base fictive : offset déplacé, date renseignée, aucun log. Un passage ultérieur le même jour peut donc ignorer l’assignation déjà avancée. Aucun croisement A/B observé.

Les anciennes fixtures du log (objet avec méthodes de setters et save simulés) ne contrôlaient pas cette précondition ; leur réussite ne valide pas le parcours PostgreSQL réel.

## État et proposition avant autorisation (historique)

**Aucune correction appliquée à cette anomalie.** WORKER-IDS reste corrigé séparément ; le présent défaut maintient la recette worker et l’intégration globale en échec.

Proposition ciblée : renseigner le champ existant par `.setCycleLength(templateCount)` avant `save()`, en utilisant le nombre réel de slots qui borne le modulo, sans changer le calcul d’offset, la fréquence, le sens, les calendriers ou le schéma. Vérifier une seule rotation/log par tenant et par jour, puis le passage suivant ignoré.

Le traitement atomique d’un éventuel échec SQL lors de l’écriture du log constitue une question métier distincte ; aucune refonte transactionnelle ni modification des signatures n’est décidée dans cette proposition. Un simple remplissage du champ requis ne garantit pas cette atomicité en cas de panne ultérieure.

## Mise à jour après autorisation ciblée

Les sections précédentes décrivent l’état avant autorisation. Le champ est maintenant renseigné par `.setCycleLength(templateCount)` ; patch distinct [WORKER_LOG_CYCLE_LENGTH_FIX.patch](./WORKER_LOG_CYCLE_LENGTH_FIX.patch), sans modification transactionnelle ni schéma.

Correspondance vérifiée : `rotation.cron.ts:225–248` lit les slots puis calcule l’offset par modulo sur leur nombre ; `computeNextOffset` (`:407`) effectue bien ce calcul. `RotationGroups.getCyclesElapsed()` distingue lui aussi nombre de slots et durée/fréquence. Le journal documente le snapshot de la longueur effectivement utilisée par ce tick, pas la durée informative nullable de `rotation_groups.cycle_length`. Le setter du journal copie directement cette valeur dans sa colonne obligatoire. Il n’existe pas d’équivalence générale entre ces deux champs portant le même nom.

Preuve PostgreSQL : groupe informatif fixé à 97, mais 2 slots en A et 3 en B ; journaux persistés avec cycle_length 2 et 3, previous_offset 0/new_offset 1. Un seul journal et avancement par base malgré doubles déclenchements locaux ; passage suivant ignoré. La correction nominale passe.

L’échec SQL volontaire du journal prouve cependant l’absence de transaction englobante. Ce défaut est détaillé et fait l’objet d’une proposition **non implémentée** dans [V01_ANOMALIE_WORKER_ATOMICITE.md](./V01_ANOMALIE_WORKER_ATOMICITE.md). La recette globale reste en échec pour cette atomicité, et non plus pour le champ manquant.

Dernière mise à jour : après autorisation distincte, WORKER_ATOMICITY_FIX.patch rend les écritures atomiques. La dernière recette PostgreSQL préparée passe, y compris les refus SQL du journal et la concurrence multiprocessus ; voir V01_ANOMALIE_WORKER_ATOMICITE.md. Les échecs décrits plus haut sont historiques.
