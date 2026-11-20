-- TOKÉ — Provisionnement B1, 2026-11-13 Africa/Douala.
-- SQL PostgreSQL pur ; AUCUNE execution par Codex.
-- Source des exigences : TOKE_INSTALLATION_MEMOS_B1_TENANT.sql et migration B1 v1.
-- Un fichier reutilisable, a executer ENTIER dans CHAQUE base tenant (six executions).
-- SQL ordinaire ne peut pas commuter la connexion pgAdmin vers une autre base.
-- Renseigner ci-dessous les SIX noms reels approuves : aucune detection automatique.
-- Tableau vide = non configure : echec avant toute modification.
-- Utiliser postgres superuser, connexion dediee sans transaction ouverte.
-- Conserver les proprietes base/schema/tables, mots de passe et donnees historiques.
-- IMPORTANT : B1 refuse un runtime proprietaire d'une TABLE PARENTE, meme si la
-- propriete de sa BASE est acceptee. Ce fichier refuse ce cas sans contourner B1.
-- Runtime sans CREATE effectif sur public requis : pas de REVOKE global automatique.
-- Si un controle echoue : ROLLBACK puis examen operateur ; aucune correction implicite.
-- Apres succes : installer B1 separement dans la MEME base avec les trois noms reels
-- (base courante, toke_b1_migrator, runtime affiche). Aucun appel de migration ici.
-- Aucun GRANT a postgres requis : un superuser peut deja SET ROLE toke_b1_migrator.
-- Aucun ajout d'appartenance runtime -> migrator n'est permis.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
SET LOCAL search_path = pg_catalog;
DO $provision$
DECLARE
    bases_tenant text[] := ARRAY[
  'imediatis_toke100001_8f6b',
  'imediatis_sarl_toke100014_66a2',
  'demo_test_2_toke100016_a4b3',
  'pharmacie_du_plateau_dla_toke100017_3e41',
  'global_learning___technology_toke100020_3e39',
  'demo_toke_toke100021_d02e'
    ];
  migrator_name constant text := 'toke_b1_migrator';
  migrator_oid oid;
  runtime_oid oid;
  runtime_name text;
  target record;
  parent record;
  rel oid;
  role_definition record;
BEGIN
  IF session_user <> 'postgres' OR current_user <> 'postgres'
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper) THEN
    RAISE EXCEPTION 'B1_POSTGRES_SUPERUSER_REQUIRED';
  END IF;
  IF coalesce(cardinality(bases_tenant),0) <> 6
     OR (SELECT count(DISTINCT name) FROM unnest(bases_tenant) AS x(name)) <> 6
     OR EXISTS (SELECT 1 FROM unnest(bases_tenant) AS x(name) WHERE name IS NULL OR btrim(name)='') THEN
    RAISE EXCEPTION 'B1_SIX_EXPLICIT_DISTINCT_DATABASE_NAMES_REQUIRED';
  END IF;
  IF NOT current_database()=ANY(bases_tenant) THEN
    RAISE EXCEPTION 'B1_CURRENT_DATABASE_NOT_IN_APPROVED_LIST';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(bases_tenant) AS x(name)
     LEFT JOIN pg_database d ON d.datname=x.name
     WHERE d.oid IS NULL OR d.datistemplate OR NOT d.datallowconn) THEN
    RAISE EXCEPTION 'B1_SIX_EXISTING_CONNECTABLE_NON_TEMPLATE_DATABASES_REQUIRED';
  END IF;
  -- Les proprietaires de BASES sont les runtimes, suivant le contrat operateur.
  -- Controle global des six roles ; controle des schemas/tables dans la base courante.
  FOR target IN
    SELECT d.datname,r.* FROM pg_database d JOIN pg_roles r ON r.oid=d.datdba
    WHERE d.datname=ANY(bases_tenant)
  LOOP
    IF target.rolname=migrator_name OR target.rolsuper OR target.rolcreaterole
       OR target.rolcreatedb OR target.rolbypassrls THEN
      RAISE EXCEPTION 'B1_DATABASE_RUNTIME_ROLE_INCOMPATIBLE: %',target.datname;
    END IF;
  END LOOP;
  SELECT r.oid,r.rolname INTO runtime_oid,runtime_name
    FROM pg_database d JOIN pg_roles r ON r.oid=d.datdba WHERE d.datname=current_database();
  IF to_regnamespace('public') IS NULL THEN RAISE EXCEPTION 'B1_PUBLIC_SCHEMA_REQUIRED'; END IF;
  IF has_schema_privilege(runtime_oid,'public','CREATE') THEN
    RAISE EXCEPTION 'B1_RUNTIME_SCHEMA_CREATE_FORBIDDEN: inspect effective grants/ownership; no automatic change';
  END IF;
  FOR parent IN SELECT * FROM (VALUES
    ('tk_memos','integer'),('xa_users','integer'),('tk_time_entries','integer'),('xa_work_sessions','smallint')
  ) AS expected(table_name,id_type)
  LOOP
    rel := to_regclass(format('public.%I',parent.table_name));
    IF rel IS NULL OR NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid
      JOIN pg_constraint k ON k.conrelid=c.oid AND k.contype='p'
        AND k.conkey=ARRAY[a.attnum]::smallint[]
      WHERE c.oid=rel AND c.relkind='r' AND a.attname='id'
        AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull
        AND a.atttypid=to_regtype(parent.id_type)
    ) THEN RAISE EXCEPTION 'B1_PARENT_INCOMPATIBLE: %',parent.table_name; END IF;
    IF (SELECT relowner FROM pg_class WHERE oid=rel)=runtime_oid THEN
      RAISE EXCEPTION 'B1_RUNTIME_MUST_NOT_OWN_PARENTS: %; historical ownership preserved',parent.table_name;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='public.tk_memos'::regclass
      AND attname='validator_user' AND atttypid='integer'::regtype AND NOT attisdropped)
     OR (SELECT array_agg(e.enumlabel::text ORDER BY e.enumlabel::text)
         FROM pg_attribute a JOIN pg_enum e ON e.enumtypid=a.atttypid
         WHERE a.attrelid='public.tk_memos'::regclass AND a.attname='memo_status' AND NOT a.attisdropped)
        IS DISTINCT FROM ARRAY['approved','pending','rejected','revoked','submitted']::text[] THEN
    RAISE EXCEPTION 'B1_MEMO_COLUMNS_OR_ENUM_INCOMPATIBLE';
  END IF;
  SELECT oid INTO migrator_oid FROM pg_roles WHERE rolname=migrator_name;
  IF migrator_oid IS NOT NULL THEN
    SELECT * INTO role_definition FROM pg_roles WHERE oid=migrator_oid;
    IF role_definition.rolcanlogin OR role_definition.rolsuper OR role_definition.rolcreaterole
       OR role_definition.rolcreatedb OR role_definition.rolbypassrls OR role_definition.rolreplication
       OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member=migrator_oid) THEN
      RAISE EXCEPTION 'B1_EXISTING_MIGRATOR_INCOMPATIBLE: no ALTER ROLE performed';
    END IF;
    FOR target IN SELECT d.datname,d.datdba FROM pg_database d WHERE d.datname=ANY(bases_tenant) LOOP
      IF pg_has_role(target.datdba,migrator_oid,'MEMBER') THEN
        RAISE EXCEPTION 'B1_RUNTIME_MIGRATOR_MEMBERSHIP_FORBIDDEN: %',target.datname;
      END IF;
    END LOOP;
    IF to_regclass('public.tk_memo_b1_migrations') IS NOT NULL AND
       (SELECT relowner FROM pg_class WHERE oid='public.tk_memo_b1_migrations'::regclass)<>migrator_oid THEN
      RAISE EXCEPTION 'B1_REGISTRY_OWNER_MISMATCH: no ownership transfer';
    END IF;
  ELSE
    IF to_regclass('public.tk_memo_b1_migrations') IS NOT NULL THEN
      RAISE EXCEPTION 'B1_EXISTING_INSTALLATION_REQUIRES_OWNER_REVIEW';
    END IF;
    CREATE ROLE toke_b1_migrator NOLOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB
      NOREPLICATION NOBYPASSRLS NOINHERIT;
    SELECT oid INTO migrator_oid FROM pg_roles WHERE rolname=migrator_name;
  END IF;
  -- Tous les controles precedents doivent reussir avant les droits locaux.
  -- TEMP : fonction pg_temp de manifeste. CONNECT non necessaire au role NOLOGIN
  -- execute via SET ROLE dans une connexion postgres deja ouverte.
  EXECUTE format('GRANT TEMPORARY ON DATABASE %I TO %I',current_database(),migrator_name);
  EXECUTE format('GRANT USAGE, CREATE ON SCHEMA public TO %I',migrator_name);
  FOR parent IN SELECT * FROM (VALUES ('tk_memos'),('xa_users'),('tk_time_entries'),('xa_work_sessions')) AS x(table_name) LOOP
    EXECUTE format('GRANT REFERENCES ON TABLE public.%I TO %I',parent.table_name,migrator_name);
  END LOOP;
  EXECUTE format('GRANT SELECT ON TABLE public.tk_memos TO %I',migrator_name);
  EXECUTE format('GRANT UPDATE (id) ON TABLE public.tk_memos TO %I',migrator_name);
  IF NOT has_database_privilege(migrator_oid,current_database(),'TEMP')
     OR NOT has_schema_privilege(migrator_oid,'public','USAGE')
     OR NOT has_schema_privilege(migrator_oid,'public','CREATE')
     OR NOT has_table_privilege(migrator_oid,'public.tk_memos','SELECT')
     OR NOT has_column_privilege(migrator_oid,'public.tk_memos','id','UPDATE') THEN
    RAISE EXCEPTION 'B1_PROVISIONING_POSTCHECK_FAILED';
  END IF;
  FOR parent IN SELECT * FROM (VALUES ('tk_memos'),('xa_users'),('tk_time_entries'),('xa_work_sessions')) AS x(table_name) LOOP
    IF NOT has_table_privilege(migrator_oid,format('public.%I',parent.table_name),'REFERENCES') THEN
      RAISE EXCEPTION 'B1_PROVISIONING_REFERENCES_POSTCHECK_FAILED';
    END IF;
  END LOOP;
  EXECUTE format('SET LOCAL ROLE %I',migrator_name);
  IF current_user<>migrator_name THEN RAISE EXCEPTION 'B1_SET_ROLE_POSTCHECK_FAILED'; END IF;
  EXECUTE 'SET LOCAL ROLE postgres';
  RAISE NOTICE 'B1_PROVISIONED database=% runtime=% migrator=%; repeat separately on all six approved databases',current_database(),runtime_name,migrator_name;
END
$provision$ LANGUAGE plpgsql;
COMMIT;
