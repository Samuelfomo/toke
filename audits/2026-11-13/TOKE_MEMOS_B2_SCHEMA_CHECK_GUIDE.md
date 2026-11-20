# TOKÉ — Précontrôle SQL des prérequis B2

Date : 2026-11-13, Africa/Douala.
Verdict : **VALIDÉ SOUS RÉSERVES pour la préparation du contrôle**. Revue statique seulement : script non exécuté sur PostgreSQL pendant cette mission, aucune entreprise déclarée prête à ce stade.

## Livrables et portée

- `audits/2026-11-13/TOKE_MEMOS_B2_PRODUCTION_SCHEMA_CHECK.sql` : script SQL réutilisable.
- `audits/2026-11-13/TOKE_MEMOS_B2_SCHEMA_CHECK_GUIDE.md` : présent guide.

Seuls ces deux fichiers sont créés. Aucun code applicatif, flag, `.env`, schéma ou droit n'est modifié. Aucun accès à une base locale ou distante, aucune migration, aucun reset Git.

Le manifeste correspond aux sources actuelles : `foundations.models.ts`, `foundations.persistence.ts`, `responsibility.policy.ts`, `reads.service.ts` et déclarations historiques dans `tenant/database/data/`. Il couvre **70 colonnes B1** et **32 colonnes historiques** effectivement nécessaires à la lecture/ACL, sur onze tables.

## Garanties de lecture seule

Le script démarre une transaction `REPEATABLE READ READ ONLY`, limite les délais de requête/verrou et termine par `ROLLBACK`. Il ne contient aucune création d'objet temporaire ou persistant, aucun DML, GRANT, migration ou correction automatique. Le bloc `DO` ne crée pas de fonction persistante ; il lit les catalogues et émet des diagnostics `NOTICE`.

Aucune ligne métier, identité d'utilisateur métier, contenu de mémo ou secret n'est lu/affiché. Seuls base/rôles connectés, version serveur, noms/types de structures et indicateurs de conformité sont affichés. Le seul accès hors catalogue est le marqueur technique B1, via la fonction connue.

Avant cet appel, le script exige une fonction sans argument, scalaire text, SQL STABLE, dont le corps normalisé correspond exactement à la requête de version de la migration locale. Il exige aussi une table ordinaire de marqueur sans RLS et une colonne version text. Une fonction inconnue n'est pas appelée. Une définition équivalente mais écrite différemment peut être refusée : revue manuelle, jamais remplacement automatique.

## Exécution manuelle par l'opérateur

1. Identifier l'entreprise, sa base PostgreSQL et son rôle runtime attendus depuis l'inventaire de déploiement autorisé. Ne pas déduire cette correspondance d'un GUID envoyé par un navigateur.
2. Utiliser une connexion **directement sous le rôle runtime réel**, avec les mêmes droits hérités que l'application. Ne pas lancer sous un superuser ou le propriétaire de migration pour masquer des droits absents. Le script refuse les rôles superuser/bypassrls et la propriété runtime des tables B1.
3. Configurer hors dépôt un service libpq protégé et le mécanisme habituel de mot de passe. Ne pas placer un secret dans la commande ou une URL. Ouvrir une nouvelle connexion dédiée, sans transaction préexistante.
4. Exemple, à adapter au nom réel du service opérateur :

```sh
psql 'service=toke_tenant_runtime_a_verifier' -X -v ON_ERROR_STOP=1 \
  -f audits/2026-11-13/TOKE_MEMOS_B2_PRODUCTION_SCHEMA_CHECK.sql \
  > toke-tenant-schema-check.log 2>&1
```

Cette commande n'a pas été exécutée par Codex. `-X` évite les commandes d'un fichier psqlrc. Les notices sont capturées avec stderr. Ne pas utiliser `--single-transaction` : le script gère sa transaction.

5. Comparer impérativement `connected_database` et `effective_runtime_role` à l'inventaire attendu. `login_role` identifie la connexion initiale ; `read_only` doit être `on`. Une base structurellement conforme mais associée à la mauvaise entreprise n'est pas prête.
6. Exécuter séparément sur chaque base/rôle runtime concerné. Conserver les résultats dans un emplacement opérateur protégé ; ne pas publier une configuration de connexion avec les logs.

## Interprétation

- `PASS B1_VERSION: b1-v1` : fonction reconnue, exécutable, marqueur attendu retourné.
- `PASS SELECT` : SELECT complet sur la table accordé au rôle effectif, y compris héritage/PUBLIC. Ce n'est pas une validation des droits d'écriture.
- `PASS COLUMN` : présence/type conformes ; nullabilité exacte contrôlée pour B1. Pour les colonnes historiques, la nullabilité n'est pas certifiée et les longueurs des chaînes ne sont pas comparées.
- `FAIL` : base **NON PRÊTE**, avec cause structurelle ou de droits à examiner. Les enums historiques doivent contenir les valeurs utilisées par B2. RLS activée ou relation non attendue est bloquante pour cette vérification conservatrice : faire revoir la politique, ne pas la désactiver pour obtenir PASS.
- `SCHEMA_CHECK=NOT_READY` : au moins un contrôle échoue. Les absences peuvent générer plusieurs lignes FAIL pour une même table ; le compteur n'est pas un nombre de migrations manquantes.
- `SCHEMA_CHECK=READY_FOR_OPERATOR_REVIEW` : manifeste demandé conforme sous ce rôle ; **pas une autorisation d'activation**. Le rôle et la base doivent encore être confirmés par l'opérateur.
- Erreur SQL, délai dépassé, permission insuffisante pour le bloc/catalogue ou absence de marqueur final : contrôle **NON CONCLUANT**, entreprise non déclarable prête. Fermer la connexion dédiée ; aucun changement de droit automatique.

**Attention :** `ON_ERROR_STOP` détecte une erreur SQL, mais les FAIL de diagnostic sont des notices. Un code de sortie psql 0 ne suffit pas : vérifier le marqueur final, les FAIL et l'identification. Ne pas automatiser l'activation depuis le seul code de sortie.

Tableau de suivi recommandé : entreprise de l'inventaire, base attendue/observée, rôle attendu/observé, date, marqueur B1, résultat final, causes FAIL, relecteur. Ne saisir ni données métier ni secrets.

## Limites avant déclaration de disponibilité

Ce contrôle ne vérifie pas toutes les FK, contraintes, triggers et empreintes du manifeste de migration B1 ; il ne remplace pas sa procédure de migration. Il ne prouve pas l'existence de responsables certifiés réels, la cohérence des relations métier, les bornes de volumétrie du résolveur, la disponibilité Master/Redis, les sessions ou les ACL fonctionnelles sur données réelles. Il ne mesure pas les performances et ne teste pas le navigateur.

`tk_memo_reads` ne fait pas partie des dépendances de ces deux GET B2 : son absence ne doit pas être confondue avec l'absence des fondations B1. Mutations, médias et suivi de lecture restent hors activation.

Une entreprise n'est candidate à l'activation que si le schéma est conforme sous le bon runtime, l'inventaire est confirmé, les autres prérequis du rapport `TOKE_MEMOS_B2_PRODUCTION_READINESS.md` sont satisfaits et la décision d'exploitation est explicite. Toute correction/migration relève d'une autorisation distincte.

## Vérifications réellement effectuées

Relecture des sources et de la fonction version de la migration ; extraction statique des 70 colonnes B1 ; vérification du manifeste total de 102 colonnes ; assertions hors connexion sur transaction lecture seule, bloc anonyme unique et rollback final. Aucune validation syntaxique par un serveur PostgreSQL ni exécution SQL n'est revendiquée. Les erreurs de génération intermédiaires ont été corrigées avant finalisation ; les assertions statiques finales réussissent.

Fin de mission après ces deux fichiers.
