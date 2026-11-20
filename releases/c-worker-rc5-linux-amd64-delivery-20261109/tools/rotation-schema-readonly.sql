-- Read-only operator checklist. All statements are SELECT/WITH SELECT.
-- Run once per approved tenant connection, never with an inline password.
-- Required psql variable: worker_role = technical PostgreSQL role used by worker.
-- Metadata contract derived from the rc5-compatible local declarations; no data rows exported.
SELECT current_database() AS database_name, current_setting('server_version') AS postgres_version;
WITH expected(table_name,column_name,family,required_not_null,enum_labels) AS (VALUES
  ('xa_rotation_groups','id','INTEGER',true,'[]'::jsonb),
  ('xa_rotation_groups','guid','STRING',true,'[]'::jsonb),
  ('xa_rotation_groups','tenant','STRING',true,'[]'::jsonb),
  ('xa_rotation_groups','name','STRING',true,'[]'::jsonb),
  ('xa_rotation_groups','cycle_length','INTEGER',false,'[]'::jsonb),
  ('xa_rotation_groups','cycle_unit','ENUM',true,'["day","week"]'::jsonb),
  ('xa_rotation_groups','direction','ENUM',true,'["forward","backward"]'::jsonb),
  ('xa_rotation_groups','auto_advance','BOOLEAN',true,'[]'::jsonb),
  ('xa_rotation_groups','rotation_step','INTEGER',true,'[]'::jsonb),
  ('xa_rotation_groups','start_date','DATEONLY',true,'[]'::jsonb),
  ('xa_rotation_groups','active','BOOLEAN',true,'[]'::jsonb),
  ('xa_rotation_groups','deleted_at','DATE',false,'[]'::jsonb),
  ('xa_rotation_groups','created_at','DATE',true,'[]'::jsonb),
  ('xa_rotation_groups','updated_at','DATE',true,'[]'::jsonb),
  ('xa_rotation_assignments','id','INTEGER',true,'[]'::jsonb),
  ('xa_rotation_assignments','guid','STRING',true,'[]'::jsonb),
  ('xa_rotation_assignments','family','ENUM',true,'["user","group"]'::jsonb),
  ('xa_rotation_assignments','related','STRING',true,'[]'::jsonb),
  ('xa_rotation_assignments','rotation_group','INTEGER',true,'[]'::jsonb),
  ('xa_rotation_assignments','offset','INTEGER',true,'[]'::jsonb),
  ('xa_rotation_assignments','assigned_by','INTEGER',true,'[]'::jsonb),
  ('xa_rotation_assignments','active','BOOLEAN',true,'[]'::jsonb),
  ('xa_rotation_assignments','assigned_at','DATE',true,'[]'::jsonb),
  ('xa_rotation_assignments','last_advanced_date','DATEONLY',false,'[]'::jsonb),
  ('xa_rotation_assignments','deleted_at','DATE',false,'[]'::jsonb),
  ('xa_rotation_assignments','created_at','DATE',true,'[]'::jsonb),
  ('xa_rotation_assignments','updated_at','DATE',true,'[]'::jsonb),
  ('xa_rotation_assignment_log','id','INTEGER',true,'[]'::jsonb),
  ('xa_rotation_assignment_log','guid','STRING',true,'[]'::jsonb),
  ('xa_rotation_assignment_log','rotation_assignment','INTEGER',true,'[]'::jsonb),
  ('xa_rotation_assignment_log','previous_offset','INTEGER',true,'[]'::jsonb),
  ('xa_rotation_assignment_log','new_offset','INTEGER',true,'[]'::jsonb),
  ('xa_rotation_assignment_log','cycle_length','INTEGER',true,'[]'::jsonb),
  ('xa_rotation_assignment_log','executed_at','DATE',true,'[]'::jsonb),
  ('xa_rotation_group_template','id','INTEGER',true,'[]'::jsonb),
  ('xa_rotation_group_template','guid','STRING',true,'[]'::jsonb),
  ('xa_rotation_group_template','rotation_group','INTEGER',true,'[]'::jsonb),
  ('xa_rotation_group_template','position','INTEGER',true,'[]'::jsonb),
  ('xa_rotation_group_template','template_snapshot','JSONB',true,'[]'::jsonb),
  ('xa_rotation_group_template','source_template','INTEGER',false,'[]'::jsonb),
  ('xa_rotation_group_template','source_template_guid','STRING',false,'[]'::jsonb),
  ('xa_rotation_group_template','deleted_at','DATE',false,'[]'::jsonb),
  ('xa_rotation_group_template','created_at','DATE',true,'[]'::jsonb),
  ('xa_rotation_group_template','updated_at','DATE',true,'[]'::jsonb)
), inspected AS (
 SELECT e.*, a.attname IS NULL AS missing,
        format_type(a.atttypid,a.atttypmod) AS actual_type,
        e.required_not_null AND NOT COALESCE(a.attnotnull,false) AS missing_not_null,
        CASE WHEN a.attname IS NULL THEN false
             WHEN e.family='ENUM' THEN t.typtype<>'e' OR NOT e.enum_labels <@
               COALESCE((SELECT jsonb_agg(enumlabel::text ORDER BY enumsortorder)
                         FROM pg_enum WHERE enumtypid=t.oid),'[]'::jsonb)
             ELSE t.typname IS DISTINCT FROM CASE e.family
               WHEN 'INTEGER' THEN 'int4' WHEN 'SMALLINT' THEN 'int2'
               WHEN 'BIGINT' THEN 'int8' WHEN 'BOOLEAN' THEN 'bool'
               WHEN 'DATE' THEN 'timestamptz' WHEN 'DATEONLY' THEN 'date'
               WHEN 'STRING' THEN 'varchar' WHEN 'TEXT' THEN 'text'
               WHEN 'JSONB' THEN 'jsonb' WHEN 'JSON' THEN 'json'
               ELSE 'UNREVIEWED_EXPECTED_TYPE' END END AS incompatible_type
 FROM expected e
 LEFT JOIN pg_namespace n ON n.nspname='public'
 LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=e.table_name AND c.relkind IN ('r','p')
 LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attname=e.column_name AND NOT a.attisdropped
 LEFT JOIN pg_type t ON t.oid=a.atttypid
)
SELECT table_name,count(*) AS expected_columns,
 count(*) FILTER(WHERE missing) AS missing_columns,
 count(*) FILTER(WHERE NOT missing AND missing_not_null) AS required_not_null_missing,
 count(*) FILTER(WHERE incompatible_type) AS incompatible_types,
 COALESCE(jsonb_agg(jsonb_build_object('column',column_name,'actual_type',actual_type,
    'missing',missing,'nullability',missing_not_null,'type_mismatch',incompatible_type))
    FILTER(WHERE missing OR missing_not_null OR incompatible_type),'[]'::jsonb) AS review
FROM inspected GROUP BY table_name ORDER BY table_name;

SELECT c.relname,k.conname,k.contype,pg_get_constraintdef(k.oid) AS definition,k.convalidated
FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('xa_rotation_groups','xa_rotation_group_template','xa_rotation_assignments','xa_rotation_assignment_log')
 AND k.contype IN ('p','f','u') ORDER BY c.relname,k.conname;

SELECT c.relname,idx.relname AS index_name,i.indisunique,i.indisvalid,i.indisready,
 i.indpred IS NOT NULL AS partial_index,i.indexprs IS NOT NULL AS expression_index
FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_class idx ON idx.oid=i.indexrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('xa_rotation_groups','xa_rotation_group_template','xa_rotation_assignments','xa_rotation_assignment_log')
ORDER BY c.relname,idx.relname;

SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,
 (SELECT count(*) FROM pg_trigger tr WHERE tr.tgrelid=c.oid AND NOT tr.tgisinternal) AS custom_trigger_count,
 has_schema_privilege(:'worker_role','public','USAGE') AS schema_usage,
 has_table_privilege(:'worker_role',c.oid,'SELECT') AS worker_select,
 has_table_privilege(:'worker_role',c.oid,'UPDATE') AS worker_table_update,
 has_table_privilege(:'worker_role',c.oid,'INSERT') AS worker_table_insert
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('xa_rotation_groups','xa_rotation_group_template','xa_rotation_assignments','xa_rotation_assignment_log')
ORDER BY c.relname;

SELECT column_name,has_column_privilege(:'worker_role','public.xa_rotation_assignments',column_name,'UPDATE') AS worker_update
FROM (VALUES ('offset'),('last_advanced_date'),('updated_at')) AS required(column_name);
SELECT pg_get_serial_sequence('public.xa_rotation_assignment_log','id') IS NOT NULL AS sequence_present,
 has_sequence_privilege(:'worker_role',pg_get_serial_sequence('public.xa_rotation_assignment_log','id'),'USAGE') AS worker_sequence_usage;
-- No grant/migration/row correction is performed by this file. Any mismatch requires review.
