# Présentation des alertes de planning

La liste et le détail partagent une synthèse des anomalies critiques et
des avertissements. Une indication positive apparaît lorsque les diagnostics
sont disponibles et ne signalent aucune alerte. Les diagnostics absents
laissent la synthèse masquée. Les écarts de couverture déjà décrits dans
les violations ne sont comptés qu’une fois, avec la gravité de la violation.

« Voir les détails » ouvre le panneau existant, qui sépare les anomalies
critiques des avertissements. Les noms, services et dates restent accessibles
lorsqu’ils sont renseignés. Une date liée ouvre la semaine ou la cellule
concernée. Depuis la liste, l’action explicite ouvre directement le panneau.
Le lien « Consulter » ouvre le détail avec le panneau fermé.

Le panneau de publication présente le résultat de la prévalidation, avec
le motif d’un refus visible et les détails complémentaires repliés. Un
avertissement seul laisse la confirmation disponible si l’API autorise
la publication. Le choix d’une autre date et la confirmation restent
explicites. Les composants historiques `SuggestionIssueSummary.vue` et
`SuggestionPublicationBar.vue` sont utilisés par la version archivée du
détail. L’intervention concerne seulement les deux écrans actifs et leur
fonction commune de présentation.

## Vérifications

- TypeScript Cloud réussi.
- Test ciblé du calcul de synthèse réussi, notamment la gravité d’un
  avertissement lié à un écart déjà signalé.
- Chrome sur données fictives réussi. Cas couverts — aucun signalement,
  avertissement seul, anomalie critique, diagnostics absents, blocage
  métier et erreur de prévalidation. Ouverture explicite, fermeture,
  accès à la cellule et état du bouton de confirmation vérifiés.

## Mise en ligne et retour arrière

Après validation, suivre la procédure statique du
[rapport de la liste](TOKE_SUGGESTION_PLANNING_LISTE.md).
En cas de retour arrière, réactiver l’artefact Cloud complet précédent
et vérifier l’accès à la liste et au détail. Aucune migration requise.
Aucun déploiement exécuté.
