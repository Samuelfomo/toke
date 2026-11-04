# Recherche des équipes et des employés

## Objectif

Permettre de retrouver directement un employé par son nom depuis la liste du module Équipe, tout en conservant la recherche des équipes.

## Fichiers concernés

- `packages/cloud/src/views/equipe.vue` : interface, filtrage et gestion de l'ouverture des équipes.
- `codex_md/recherche-equipes-employes.md` : documentation des ajustements.

## Ajustements apportés

- Le champ affiche « Rechercher une équipe ou un employé… » et dispose de davantage de largeur.
- La recherche porte également sur les noms et prénoms des membres disponibles dans la liste : groupes, membres sans groupe et membres des sous-équipes affichées.
- Elle accepte les correspondances partielles, ignore la casse, les accents et les espaces superflus. Les deux ordres « prénom nom » et « nom prénom » sont acceptés.
- Si le nom ou le sous-titre d'une équipe correspond, celle-ci conserve tous ses membres.
- Sinon, seuls les membres dont le nom correspond apparaissent sous leur équipe. La recherche par nom du responsable reste disponible.
- Les équipes contenant des résultats s'ouvrent automatiquement. L'utilisateur peut ensuite les replier.
- Les pages principale et locales reviennent à la première page lorsque les résultats changent, pour éviter de masquer une correspondance située derrière une ancienne page.
- Effacer la recherche restaure les équipes ouvertes avant la recherche.
- Le clic sur un employé conserve l'ouverture existante de sa fiche.
- Les filtres de statut et de département continuent de sélectionner les équipes avant l'application de la recherche.

Les compteurs des équipes conservent leurs effectifs totaux ; la pagination des membres porte sur les membres visibles après recherche.

## Exemple

Pour une équipe « Commerciale » contenant Paul Ékoto et Anne Mballa :

- `ekoto` ou `Ékoto Paul` affiche l'équipe ouverte avec Paul uniquement.
- `commerciale` affiche l'équipe ouverte avec ses deux membres.
- Une recherche sans correspondance affiche le message « Aucun résultat » existant.

## Périmètre

La recherche utilise les données déjà chargées et représentées dans la liste. Aucun changement de l'API ni requête supplémentaire n'est introduit.

## Vérifications

- Huit scénarios exécutés sur la logique extraite du composant : liste sans recherche, nom inversé avec accents et espaces, équipe complète, employé dans plusieurs groupes, absence de résultat, espaces seuls, statut et département.
- Vérification de l'ouverture automatique, de la remise à zéro des pages et de la restauration de l'état d'ouverture.
- `npm run type-check --workspace=@toke/cloud` : réussi.
- `git diff --check` : réussi.
- Vérification visuelle dans le navigateur non réalisée.
