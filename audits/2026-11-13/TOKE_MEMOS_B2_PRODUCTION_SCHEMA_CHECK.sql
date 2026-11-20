-- TOKÉ 2026-11-13. Manual preflight as the ACTUAL runtime role on one tenant DB.
-- Only catalogues and the known version function; no DDL/DML, business rows or fixes.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '2s';
SET LOCAL search_path = pg_catalog;
SET LOCAL client_min_messages = notice;
SELECT current_database() AS connected_database, session_user AS login_role,
       current_user AS effective_runtime_role,
       current_setting('transaction_read_only') AS read_only,
       current_setting('server_version') AS server_version;
DO $check$
DECLARE
 failures integer := 0;
 r record; p record; relation_oid oid; fn oid;
 actual_type text; actual_notnull boolean; ok boolean;
 version_value text; expected_labels text[];
BEGIN
 IF current_setting('transaction_read_only') <> 'on' THEN
   RAISE EXCEPTION 'READ_ONLY_TRANSACTION_REQUIRED';
 END IF;
 SELECT rolsuper OR rolbypassrls INTO ok FROM pg_roles WHERE rolname=current_user;
 IF coalesce(ok,true) THEN
   failures := failures+1;
   RAISE NOTICE 'FAIL RUNTIME_ROLE: superuser/bypassrls is not representative';
 END IF;
 IF NOT has_schema_privilege(current_user,'public','USAGE') THEN
   failures := failures+1; RAISE NOTICE 'FAIL public: USAGE missing';
 END IF;
 fn := to_regprocedure('public.toke_b1_version()');
 IF fn IS NULL THEN
   failures := failures+1; RAISE NOTICE 'FAIL B1_VERSION: absent';
 ELSE
   SELECT prokind,prorettype,proretset,provolatile,prosrc,
     (SELECT lanname FROM pg_language WHERE oid=prolang) AS language
     INTO p FROM pg_proc WHERE oid=fn;
   IF p.prokind <> 'f' OR p.prorettype <> 'text'::regtype OR p.proretset
      OR p.provolatile <> 's' OR p.language <> 'sql'
      OR regexp_replace(btrim(p.prosrc),'[[:space:];]','','g') <>
         'SELECTversionFROMpublic.tk_memo_b1_migrationsWHEREversion=''b1-v1''' THEN
     failures := failures+1;
     RAISE NOTICE 'FAIL B1_VERSION: unknown signature/body; NOT invoked';
   ELSIF NOT EXISTS (
     SELECT 1 FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid
     WHERE c.oid=to_regclass('public.tk_memo_b1_migrations')
       AND c.relkind='r' AND NOT c.relrowsecurity
       AND a.attname='version' AND a.attnum>0 AND NOT a.attisdropped
       AND a.atttypid='text'::regtype
   ) THEN
     failures := failures+1; RAISE NOTICE 'FAIL B1_VERSION: unexpected marker table; NOT invoked';
   ELSIF NOT has_function_privilege(current_user,fn,'EXECUTE') THEN
     failures := failures+1; RAISE NOTICE 'FAIL B1_VERSION: EXECUTE missing';
   ELSE
     BEGIN
       EXECUTE 'SELECT public.toke_b1_version()' INTO version_value;
       IF version_value IS DISTINCT FROM 'b1-v1' THEN
         failures := failures+1; RAISE NOTICE 'FAIL B1_VERSION: expected marker not returned';
       ELSE RAISE NOTICE 'PASS B1_VERSION: b1-v1'; END IF;
     EXCEPTION WHEN OTHERS THEN
       failures := failures+1;
       RAISE NOTICE 'FAIL B1_VERSION: SQLSTATE=% (no payload printed)',SQLSTATE;
     END;
   END IF;
 END IF;
 FOR r IN SELECT * FROM (VALUES
   ('tk_memo_workflows'),('tk_memo_events'),('tk_memo_commands'),
   ('tk_time_raw_observations'),('tk_time_correction_changes'),
   ('tk_memos'),('xa_users'),('xa_user_roles'),('xa_roles'),('xa_org_hierarchy'),('xa_groups')
 ) AS expected(table_name) LOOP
   relation_oid := to_regclass(format('public.%I',r.table_name));
   IF relation_oid IS NULL THEN
     failures := failures+1; RAISE NOTICE 'FAIL TABLE %: absent',r.table_name; CONTINUE;
   END IF;
   SELECT relkind IN ('r','p') AND NOT relrowsecurity INTO ok FROM pg_class WHERE oid=relation_oid;
   IF NOT coalesce(ok,false) THEN
     failures := failures+1; RAISE NOTICE 'FAIL TABLE %: unexpected relation kind or RLS requires review',r.table_name;
   END IF;
   IF NOT has_table_privilege(current_user,relation_oid,'SELECT') THEN
     failures := failures+1; RAISE NOTICE 'FAIL TABLE %: full SELECT missing',r.table_name;
   ELSE RAISE NOTICE 'PASS SELECT %',r.table_name; END IF;
   IF r.table_name IN ('tk_memo_workflows','tk_memo_events','tk_memo_commands','tk_time_raw_observations','tk_time_correction_changes')
      AND (SELECT relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) FROM pg_class WHERE oid=relation_oid) THEN
     failures := failures+1; RAISE NOTICE 'FAIL OWNER %: migration owner is not runtime',r.table_name;
   END IF;
 END LOOP;
 -- B1 exact types/nullability; historical ACL columns exact source types except string length.
 FOR r IN SELECT * FROM (VALUES
   ('tk_memo_workflows','memo_id','int4',false),
   ('tk_memo_workflows','responsible_user_id','int4',true),
   ('tk_memo_workflows','responsibility_state','text',false),
   ('tk_memo_workflows','responsibility_reason','text',true),
   ('tk_memo_workflows','history_completeness','text',false),
   ('tk_memo_workflows','responsibility_provenance','jsonb',false),
   ('tk_memo_workflows','initial_known_state','jsonb',false),
   ('tk_memo_workflows','decision_cycle','int8',false),
   ('tk_memo_workflows','version','int8',false),
   ('tk_memo_workflows','last_event_id','uuid',false),
   ('tk_memo_events','event_id','uuid',false),
   ('tk_memo_events','previous_event_id','uuid',true),
   ('tk_memo_events','related_event_id','uuid',true),
   ('tk_memo_events','command_id','uuid',false),
   ('tk_memo_events','memo_id','int4',false),
   ('tk_memo_events','effective_author_id','int4',true),
   ('tk_memo_events','responsible_user_id','int4',true),
   ('tk_memo_events','sequence','int8',false),
   ('tk_memo_events','decision_cycle','int8',false),
   ('tk_memo_events','version','int8',false),
   ('tk_memo_events','command_event_index','int2',false),
   ('tk_memo_events','event_type','text',false),
   ('tk_memo_events','actor_kind','text',false),
   ('tk_memo_events','service_actor','text',true),
   ('tk_memo_events','delegated_actor_ref','text',true),
   ('tk_memo_events','decision_result','text',true),
   ('tk_memo_events','occurred_at','timestamptz',false),
   ('tk_memo_events','metadata','jsonb',false),
   ('tk_memo_commands','command_id','uuid',false),
   ('tk_memo_commands','memo_id','int4',false),
   ('tk_memo_commands','actor_id','int4',false),
   ('tk_memo_commands','delegated_actor_ref','text',true),
   ('tk_memo_commands','action','text',false),
   ('tk_memo_commands','payload','jsonb',false),
   ('tk_memo_commands','result','jsonb',false),
   ('tk_memo_commands','committed_at','timestamptz',false),
   ('tk_time_raw_observations','observation_id','uuid',false),
   ('tk_time_raw_observations','entry_id','int4',true),
   ('tk_time_raw_observations','session_id','int2',true),
   ('tk_time_raw_observations','target_key','text',false),
   ('tk_time_raw_observations','field','text',false),
   ('tk_time_raw_observations','source','text',false),
   ('tk_time_raw_observations','source_reference','text',false),
   ('tk_time_raw_observations','provenance_quality','text',false),
   ('tk_time_raw_observations','raw_value','timestamptz',true),
   ('tk_time_raw_observations','captured_at','timestamptz',false),
   ('tk_time_raw_observations','metadata','jsonb',false),
   ('tk_time_correction_changes','change_id','uuid',false),
   ('tk_time_correction_changes','command_id','uuid',false),
   ('tk_time_correction_changes','event_id','uuid',false),
   ('tk_time_correction_changes','decision_event_id','uuid',true),
   ('tk_time_correction_changes','raw_observation_id','uuid',true),
   ('tk_time_correction_changes','previous_change_id','uuid',true),
   ('tk_time_correction_changes','rectifies_change_id','uuid',true),
   ('tk_time_correction_changes','memo_id','int4',false),
   ('tk_time_correction_changes','entry_id','int4',true),
   ('tk_time_correction_changes','actor_id','int4',false),
   ('tk_time_correction_changes','session_id','int2',true),
   ('tk_time_correction_changes','no_decision_reason','text',true),
   ('tk_time_correction_changes','target_key','text',false),
   ('tk_time_correction_changes','field','text',false),
   ('tk_time_correction_changes','delegated_actor_ref','text',true),
   ('tk_time_correction_changes','justification','text',false),
   ('tk_time_correction_changes','provenance_quality','text',false),
   ('tk_time_correction_changes','before_value','timestamptz',true),
   ('tk_time_correction_changes','after_value','timestamptz',true),
   ('tk_time_correction_changes','occurred_at','timestamptz',false),
   ('tk_time_correction_changes','version_before','int8',false),
   ('tk_time_correction_changes','version_after','int8',false),
   ('tk_time_correction_changes','metadata','jsonb',false),
   ('tk_memos','id','int4',NULL),
   ('tk_memos','guid','string',NULL),
   ('tk_memos','author_user','int4',NULL),
   ('tk_memos','target_user','int4',NULL),
   ('tk_memos','validator_user','int4',NULL),
   ('tk_memos','memo_status','enum_status',NULL),
   ('tk_memos','memo_type','enum_type',NULL),
   ('tk_memos','title','string',NULL),
   ('tk_memos','created_at','timestamptz',NULL),
   ('tk_memos','incident_datetime','timestamptz',NULL),
   ('tk_memos','auto_generated','bool',NULL),
   ('tk_memos','details','text',NULL),
   ('tk_memos','memo_content','jsonb',NULL),
   ('xa_users','id','int4',NULL),
   ('xa_users','guid','string',NULL),
   ('xa_users','tenant','string',NULL),
   ('xa_users','active','bool',NULL),
   ('xa_users','deleted_at','timestamptz',NULL),
   ('xa_user_roles','user','int4',NULL),
   ('xa_user_roles','role','int2',NULL),
   ('xa_roles','id','int2',NULL),
   ('xa_roles','code','string',NULL),
   ('xa_org_hierarchy','id','int2',NULL),
   ('xa_org_hierarchy','subordinate','int4',NULL),
   ('xa_org_hierarchy','supervisor','int4',NULL),
   ('xa_org_hierarchy','relationship_type','string',NULL),
   ('xa_org_hierarchy','effective_from','date',NULL),
   ('xa_org_hierarchy','effective_to','date',NULL),
   ('xa_groups','id','int4',NULL),
   ('xa_groups','manager','int4',NULL),
   ('xa_groups','members','jsonb',NULL),
   ('xa_groups','deleted_at','timestamptz',NULL)
 ) AS expected(table_name,column_name,expected_type,nullable) LOOP
   relation_oid := to_regclass(format('public.%I',r.table_name));
   SELECT t.typname,a.attnotnull INTO actual_type,actual_notnull
     FROM pg_attribute a JOIN pg_type t ON t.oid=a.atttypid
     WHERE a.attrelid=relation_oid AND a.attname=r.column_name AND a.attnum>0 AND NOT a.attisdropped;
   ok := FOUND;
   IF NOT ok THEN
     failures := failures+1; RAISE NOTICE 'FAIL COLUMN %.%: absent',r.table_name,r.column_name; CONTINUE;
   END IF;
   IF r.expected_type='string' THEN ok := actual_type IN ('text','varchar','bpchar');
   ELSIF r.expected_type IN ('enum_status','enum_type') THEN
     expected_labels := CASE r.expected_type WHEN 'enum_status'
       THEN ARRAY['submitted','pending','approved','rejected','revoked']
       ELSE ARRAY['delay_justification','absence_justification','correction_request','session_closure','auto_generated','other'] END;
     SELECT t.typtype='e' AND NOT EXISTS (
       SELECT 1 FROM unnest(expected_labels) AS required(label)
       WHERE NOT EXISTS (SELECT 1 FROM pg_enum e WHERE e.enumtypid=t.oid AND e.enumlabel=required.label)
     ) INTO ok FROM pg_type t JOIN pg_attribute a ON a.atttypid=t.oid
       WHERE a.attrelid=relation_oid AND a.attname=r.column_name AND NOT a.attisdropped;
   ELSE ok := actual_type=r.expected_type; END IF;
   IF NOT coalesce(ok,false) OR (r.nullable IS NOT NULL AND actual_notnull IS DISTINCT FROM (NOT r.nullable)) THEN
     failures := failures+1;
     RAISE NOTICE 'FAIL COLUMN %.%: incompatible type/nullability; actual type=%',r.table_name,r.column_name,actual_type;
   ELSE RAISE NOTICE 'PASS COLUMN %.%',r.table_name,r.column_name; END IF;
 END LOOP;
 IF failures=0 THEN
   RAISE NOTICE 'SCHEMA_CHECK=READY_FOR_OPERATOR_REVIEW; confirm database/runtime identity; not activation approval';
 ELSE RAISE NOTICE 'SCHEMA_CHECK=NOT_READY; failures=%; no correction performed',failures;
 END IF;
END
$check$ LANGUAGE plpgsql;
ROLLBACK;
