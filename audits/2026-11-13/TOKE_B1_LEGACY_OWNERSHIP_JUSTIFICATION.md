# TOKÉ — Propriété historique et intégrité B1
Date : 2026-11-13, Africa/Douala. Verdict : **NON VALIDÉ pour un déblocage sûr par retrait du contrôle CREATE**.
Faits repris : base demo_test_2_toke100016_a4b3, runtime demo_test_2_user_a303, propriétaire effectif de public.
Le droit CREATE permet aussi des surcharges d'objets ; public dans les search_path des fonctions privilégiées aggrave le risque.
Le propriétaire de schéma peut supprimer une table tierce et le schéma en cascade : séparer seulement les propriétaires des tables ne suffit pas.
Le propriétaire de base conserve également la possibilité de supprimer sa base ; aucune promesse d'immutabilité absolue ne peut l'ignorer.
Les triggers B1 interdisent UPDATE/DELETE/TRUNCATE, pas ces suppressions DDL ; retirer B1_RUNTIME_SCHEMA_CREATE_FORBIDDEN serait insuffisant.
Le garde-fou SQL fourni refuse explicitement le cas confirmé ; il ne provisionne rien et ne prétend pas installer B1.
Solution cible concrète : isoler B1 dans une base protégée, appartenant au migrateur, avec un rôle applicatif B1 distinct sans capacité DDL.
Les propriétaires et CREATE historiques restent alors inchangés dans les bases tenant ; les échanges inter-bases exigent un raccordement explicite.
Un schéma privé dans la même base améliore la séparation mais ne garantit pas, seul, les dépendances historiques ni la survie face au propriétaire de base.
Une alternative par garde DDL superuser demanderait une conception/test ciblés et ne couvrirait pas DROP DATABASE ; elle n'est pas livrée sans validation.
Les scripts d'installation/provisionnement existants et la migration originale sont conservés ; aucune assertion n'est silencieusement désactivée.
Vérifications : lecture ciblée des scripts existants et documentation PostgreSQL 16 DROP SCHEMA/DROP TABLE ; aucun test ni SQL exécuté.
Sources : https://www.postgresql.org/docs/16/sql-dropschema.html ; https://www.postgresql.org/docs/16/sql-droptable.html
