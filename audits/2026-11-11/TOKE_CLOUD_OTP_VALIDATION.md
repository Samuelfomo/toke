# TOKÉ — Validation locale des OTP Cloud

- Date : 2026-11-11, fuseau Africa/Douala.
- Verdict : **VALIDÉ** pour la correction locale ciblée, selon les tests ci-dessous.

## Objectif et comportement précédent

Aligner le contrôleur Cloud sur le contrat existant : un OTP est une chaîne de six chiffres ASCII, répétitions et suites comprises. Le serveur décide si ce code est valide ou expiré.

Le contrôleur acceptait des longueurs de quatre à huit chiffres et refusait les répétitions et suites avant l'appel au service. Un code serveur correctement formaté, tel que `000000`, `111111` ou `123456`, pouvait donc être bloqué localement.

## Correction implémentée

Dans `validateOtp()`, le contrôle de présence est conservé et les autres contrôles sont remplacés par le format strict `/^\d{6}$/`. La méthode de détection des suites et répétitions est supprimée. Les valeurs de configuration de longueur sont alignées sur six ; le format serveur reste imposé par l'expression régulière, indépendamment de `updateConfig()`.

Les codes sont transmis comme chaînes, sans conversion numérique : les zéros initiaux sont conservés. Les espaces, lettres, caractères numériques non ASCII et longueurs différentes de six sont refusés. Aucun nettoyage silencieux n'est ajouté.

L'appel existant à `AuthService.verifyOtp(otp)` et le traitement de sa réponse restent inchangés. Aucun contrôle local de validité ou d'expiration n'est ajouté ; ces décisions restent côté serveur.

## Fichiers modifiés ou créés

| Fichier | Action |
| --- | --- |
| `packages/cloud/src/ctrl/otpCtrl.ts` | Validation limitée à la présence et au format de six chiffres ; suppression du refus des suites et répétitions. |
| `packages/cloud/verification/otp.test.cjs` | Nouveau fichier de tests ciblant la méthode publique du contrôleur. |
| `audits/2026-11-11/TOKE_CLOUD_OTP_VALIDATION.md` | Présent rapport. |

Le contrôleur était déjà ajouté à l'index avant cette intervention. La correction a été appliquée au fichier de travail sans modifier l'index. Aucun reset, nettoyage destructif ou déplacement de fichier n'a été effectué.

## Tests réellement exécutés

Depuis la racine du dépôt :

```sh
node --test packages/cloud/verification/otp.test.cjs
```

Résultat : **20 tests réussis, 0 échec**, code de sortie 0.

- Six codes correctement formatés atteignent le service simulé inchangés : `000000`, `111111`, `123456`, `654321`, `012345`, `938207`. Le succès du service est respecté et le transfert existant vers le store est observé via une simulation.
- Douze formats invalides sont refusés sans appel au service ni au store : vide, espaces seuls, longueurs de quatre/cinq/sept/huit chiffres, lettre, espace interne, espace final ou initial, saut de ligne final, chiffres pleine chasse.
- Deux refus simulés du service, « Code OTP incorrect » et « Code OTP expiré », restent des échecs, sans enregistrement d'authentification. Le code `000000` atteint bien le service dans ces deux cas.

Les tests chargent le vrai contrôleur transpilé par TypeScript. Le service d'authentification et le store sont remplacés par des simulations ; toute dépendance inattendue provoque un échec de chargement. Aucun client HTTP ni appel réseau réel n'est utilisé.

## Vérification Git et portée

Commande exécutée :

```sh
git diff --check -- packages/cloud/src/ctrl/otpCtrl.ts
```

Résultat : code de sortie 0, aucune erreur d'espacement. Le diff du contrôleur a été relu et l'état Git des trois fichiers de cette mission a été examiné.

Aucune vérification TypeScript globale, aucun build et aucun test navigateur ou de bout en bout n'ont été exécutés pendant cette mission. La transpilation utilisée par les tests ne remplace pas une vérification de types globale.

## Limites et sujets hors périmètre

La validité et l'expiration côté serveur sont simulées dans les tests ; aucun comportement d'un déploiement réel n'est revendiqué. La saisie dans la vue Vue et les mécanismes existants de tentatives ne sont pas modifiés ni validés par cette suite.

Aucune modification des API, du BFF, des sessions, des URLs, de Nginx ou de la configuration réseau. Aucune modification du parcours de déconnexion. Aucun accès production. Les travaux Git préexistants ont été préservés.
