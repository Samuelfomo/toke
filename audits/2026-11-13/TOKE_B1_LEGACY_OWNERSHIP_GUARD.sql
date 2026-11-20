-- TOKÉ — Garde-fou ciblé, 2026-11-13 ; aucune exécution par Codex.
-- Ne constitue PAS un déblocage de l'installation : le conflit de propriété
-- ne peut pas être corrigé par un simple GRANT ou retrait d'assertion B1.
-- Faits opérateur : base/runtime ci-dessous ; aucune propriété ou capacité changée.
BEGIN TRANSACTION READ ONLY;
SET LOCAL search_path = pg_catalog;
DO $guard$
DECLARE runtime_oid oid; schema_owner oid;
BEGIN
 IF current_database() <> 'demo_test_2_toke100016_a4b3' THEN
   RAISE EXCEPTION 'B1_WRONG_DATABASE';
 END IF;
 SELECT oid INTO runtime_oid FROM pg_roles WHERE rolname='demo_test_2_user_a303';
 SELECT nspowner INTO schema_owner FROM pg_namespace WHERE nspname='public';
 IF runtime_oid IS NULL OR schema_owner IS NULL THEN
   RAISE EXCEPTION 'B1_RUNTIME_OR_SCHEMA_ABSENT';
 END IF;
 IF (SELECT datdba=runtime_oid FROM pg_database WHERE datname=current_database())
    OR runtime_oid=schema_owner OR pg_has_role(runtime_oid,schema_owner,'MEMBER') THEN
   RAISE EXCEPTION 'B1_OWNER_CAN_DROP_PROTECTED_STRUCTURES: installation publique non autorisee sans protection DDL validee ou isolation distincte';
 END IF;
 RAISE NOTICE 'Ownership precheck passed only; run complete B1 prerequisite checks separately';
END
$guard$ LANGUAGE plpgsql;
ROLLBACK;
