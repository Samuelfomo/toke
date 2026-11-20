-- TOKÉ — Installation B1 tenant pour pgAdmin — 2026-11-13 Africa/Douala.
-- VALIDÉ SOUS RÉSERVES : conformité textuelle vérifiée ; aucune exécution SQL.
-- Ouvrir une nouvelle connexion Query Tool sur LA base tenant autorisée.
-- Compléter les TROIS valeurs NULL ci-dessous avec les noms réels approuvés.
-- NULL signifie non configuré : échec obligatoire, aucun nom fictif fourni.
-- Exécuter le fichier ENTIER, sans sélectionner une portion, hors transaction ouverte.
-- Le login doit pouvoir SET ROLE vers le propriétaire de migration déjà provisionné.
-- Propriétaire : NOLOGIN, non-superuser, sans CREATEROLE ; CREATE/USAGE public,
-- TEMP sur la base, REFERENCES sur les quatre parents, SELECT sur tk_memos,
-- UPDATE(id) sur tk_memos. Runtime distinct, non privilégié, sans CREATE public,
-- ni appartenance au propriétaire ; conserver les contrôles exacts de la source.
-- PostgreSQL avec gen_random_uuid() et parents/types/enum conformes à la source.
-- Aucun rôle ni privilège historique n'est créé/corrigé par cette adaptation.
-- Sauvegarde/restauration et autorisation opérateur requises avant installation.
-- Après erreur : ROLLBACK dans Query Tool, corriger le prérequis, reprendre ENTIER.
-- L'installation conserve les données historiques et ne peuple pas le workflow.
-- Les mots TRUNCATE/DELETE dans triggers et contrôles servent à INTERDIRE ces
-- opérations ; aucune instruction DROP/TRUNCATE de données n'est exécutée.
-- Cinq tables fonctionnelles + registre technique tk_memo_b1_migrations, fidèles à B1.
-- Réexécution admise seulement si version, rôle et manifeste sont identiques.
-- Après succès, contrôle opérateur séparé sous runtime : SELECT public.toke_b1_version();
-- Ne pas activer les flags de lecture dans ce fichier.
-- SHA256 de la source originale : 50385b33e1de63526d9601ebd3286250e449e01a7c73ac1dff228cc5ae05e2ff

-- TOKÉ B1 v1. Manual only; never invoked by existing/bootstrap/provisioning.
-- Same-session confirmations required: toke.migration.expected_database,
-- toke.migration.expected_role, toke.migration.runtime_role.
-- Owner must be a dedicated non-login migration role, runtime a separate non-owner.
-- No historical UPDATE/INSERT, no enum alteration, no automatic backfill.
BEGIN;

-- Configuration manuelle explicite, locale à cette transaction seulement.
DO $pgadmin_configuration$
DECLARE
  base_tenant_attendue text := NULL; -- Remplacer NULL par le nom réel entre apostrophes.
  role_proprietaire_b1 text := NULL; -- Remplacer NULL par le rôle réel NOLOGIN déjà provisionné.
  role_runtime_tenant text := NULL; -- Remplacer NULL par le rôle runtime réel de cette base.
BEGIN
  IF nullif(btrim(base_tenant_attendue),'') IS NULL
     OR nullif(btrim(role_proprietaire_b1),'') IS NULL
     OR nullif(btrim(role_runtime_tenant),'') IS NULL THEN
    RAISE EXCEPTION 'B1_PGADMIN_CONFIGURATION_REQUIRED: renseigner les trois noms réels';
  END IF;
  IF current_database() IS DISTINCT FROM base_tenant_attendue THEN
    RAISE EXCEPTION 'B1_PGADMIN_WRONG_DATABASE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=role_proprietaire_b1)
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=role_runtime_tenant) THEN
    RAISE EXCEPTION 'B1_PGADMIN_EXISTING_ROLES_REQUIRED';
  END IF;
  PERFORM pg_catalog.set_config('toke.migration.expected_database',base_tenant_attendue,true);
  PERFORM pg_catalog.set_config('toke.migration.expected_role',role_proprietaire_b1,true);
  PERFORM pg_catalog.set_config('toke.migration.runtime_role',role_runtime_tenant,true);
  EXECUTE pg_catalog.format('SET LOCAL ROLE %I',role_proprietaire_b1);
END
$pgadmin_configuration$;
-- Fin de l'adaptation pgAdmin ; suite de la migration originale inchangée.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
SET LOCAL search_path = pg_catalog, public;
DO $confirm$
BEGIN
 IF current_database() IS DISTINCT FROM nullif(current_setting('toke.migration.expected_database',true),'')
 OR current_user IS DISTINCT FROM nullif(current_setting('toke.migration.expected_role',true),'')
 OR nullif(current_setting('toke.migration.runtime_role',true),'') IS NULL THEN RAISE EXCEPTION 'B1_EXPLICIT_DATABASE_OWNER_RUNTIME_REQUIRED'; END IF;
END $confirm$;
SELECT pg_advisory_xact_lock(3703, 1);

-- Catalog signature includes all B1 columns/defaults, constraints, indexes,
-- triggers, function definitions and ACL/owners. No data is fingerprinted here.
CREATE OR REPLACE FUNCTION pg_temp.toke_b1_manifest() RETURNS jsonb
LANGUAGE sql STABLE SET search_path = pg_catalog AS $manifest$
 SELECT jsonb_build_object(
 'tables', (SELECT jsonb_agg(jsonb_build_array(c.relname,c.relowner,c.relacl) ORDER BY c.relname)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN
   ('tk_memo_workflows','tk_memo_events','tk_memo_commands','tk_time_raw_observations','tk_time_correction_changes','tk_memo_b1_migrations')),
 'columns', (SELECT jsonb_agg(jsonb_build_array(c.relname,a.attname,a.atttypid,a.atttypmod,a.attnotnull,a.attgenerated,pg_get_expr(d.adbin,d.adrelid)) ORDER BY c.relname,a.attnum)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
   LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
   WHERE n.nspname='public' AND c.relname IN
   ('tk_memo_workflows','tk_memo_events','tk_memo_commands','tk_time_raw_observations','tk_time_correction_changes','tk_memo_b1_migrations')),
 'constraints', (SELECT jsonb_agg(jsonb_build_array(c.relname,k.conname,pg_get_constraintdef(k.oid),k.convalidated) ORDER BY c.relname,k.conname)
   FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN
   ('tk_memo_workflows','tk_memo_events','tk_memo_commands','tk_time_raw_observations','tk_time_correction_changes','tk_memo_b1_migrations')),
 'indexes', (SELECT jsonb_agg(jsonb_build_array(t.relname,c.relname,pg_get_indexdef(i.indexrelid),i.indisvalid,i.indisready) ORDER BY c.relname)
   FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace
   WHERE n.nspname='public' AND t.relname IN
   ('tk_memo_workflows','tk_memo_events','tk_memo_commands','tk_time_raw_observations','tk_time_correction_changes','tk_memo_b1_migrations')),
 'triggers', (SELECT jsonb_agg(jsonb_build_array(c.relname,t.tgname,pg_get_triggerdef(t.oid),t.tgenabled) ORDER BY c.relname,t.tgname)
   FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE NOT t.tgisinternal AND n.nspname='public' AND c.relname IN
   ('tk_memo_workflows','tk_memo_events','tk_memo_commands','tk_time_raw_observations','tk_time_correction_changes')),
 'functions', (SELECT jsonb_agg(jsonb_build_array(p.proname,p.proowner,p.proacl,pg_get_functiondef(p.oid)) ORDER BY p.proname,p.oid)
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'toke_b1_%')
 );
$manifest$;

DO $migration$
DECLARE runtime_name text := nullif(current_setting('toke.migration.runtime_role',true),'');
        runtime_oid oid; owner_oid oid; expected_type oid; item record; t text;
        names text[] := ARRAY['tk_memo_workflows','tk_memo_events','tk_memo_commands','tk_time_raw_observations','tk_time_correction_changes'];
        saved jsonb;
BEGIN
 IF current_database() IS DISTINCT FROM nullif(current_setting('toke.migration.expected_database',true),'')
 OR current_user IS DISTINCT FROM nullif(current_setting('toke.migration.expected_role',true),'')
 OR runtime_name IS NULL THEN RAISE EXCEPTION 'B1_EXPLICIT_DATABASE_OWNER_RUNTIME_REQUIRED'; END IF;
 SELECT oid INTO owner_oid FROM pg_roles WHERE rolname=current_user AND NOT rolcanlogin AND NOT rolsuper AND NOT rolcreaterole;
 SELECT oid INTO runtime_oid FROM pg_roles WHERE rolname=runtime_name AND NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolbypassrls;
 IF owner_oid IS NULL OR runtime_oid IS NULL OR owner_oid=runtime_oid OR pg_has_role(runtime_oid,owner_oid,'MEMBER') THEN
   RAISE EXCEPTION 'B1_DEDICATED_OWNER_AND_RUNTIME_REQUIRED'; END IF;
 IF has_schema_privilege(runtime_oid,'public','CREATE') THEN RAISE EXCEPTION 'B1_RUNTIME_SCHEMA_CREATE_FORBIDDEN'; END IF;
 -- Require real physical parent keys, not guessed Sequelize associations.
 FOR item IN SELECT * FROM (VALUES ('tk_memos','integer'),('xa_users','integer'),('tk_time_entries','integer'),('xa_work_sessions','smallint')) v(tbl,typ)
 LOOP
   expected_type := to_regtype(item.typ);
   IF NOT EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     JOIN pg_attribute a ON a.attrelid=c.oid AND a.attname='id' AND a.atttypid=expected_type AND a.attnotnull
     JOIN pg_constraint k ON k.conrelid=c.oid AND k.contype='p' AND k.conkey=ARRAY[a.attnum]::smallint[]
     WHERE n.nspname='public' AND c.relname=item.tbl AND c.relkind='r') THEN
     RAISE EXCEPTION 'B1_PARENT_INCOMPATIBLE: %',item.tbl;
   END IF;
   IF NOT has_table_privilege(owner_oid,format('public.%I',item.tbl),'REFERENCES') THEN RAISE EXCEPTION 'B1_OWNER_REFERENCES_REQUIRED'; END IF;
   IF (SELECT relowner FROM pg_class WHERE oid=to_regclass('public.'||item.tbl))=runtime_oid THEN
     RAISE EXCEPTION 'B1_RUNTIME_MUST_NOT_OWN_PARENTS'; END IF;
 END LOOP;
 IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid='public.tk_memos'::regclass AND attname='memo_status' AND NOT attisdropped)
 OR NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid='public.tk_memos'::regclass AND attname='validator_user' AND atttypid='integer'::regtype AND NOT attisdropped)
 OR NOT has_table_privilege(owner_oid,'public.tk_memos','SELECT') THEN RAISE EXCEPTION 'B1_MEMO_COLUMNS_OR_READ_REQUIRED'; END IF;
 IF (SELECT array_agg(e.enumlabel::text ORDER BY e.enumlabel::text) FROM pg_attribute a JOIN pg_enum e ON e.enumtypid=a.atttypid WHERE a.attrelid='public.tk_memos'::regclass AND a.attname='memo_status') IS DISTINCT FROM ARRAY['approved','pending','rejected','revoked','submitted']::text[] THEN RAISE EXCEPTION 'B1_MEMO_STATUS_ENUM_INCOMPATIBLE'; END IF;
 -- SELECT FOR UPDATE below requires UPDATE privilege on at least one column.
 IF NOT has_column_privilege(owner_oid,'public.tk_memos','id','UPDATE') THEN RAISE EXCEPTION 'B1_MEMO_LOCK_PRIVILEGE_REQUIRED'; END IF;
 IF to_regclass('public.tk_memo_b1_migrations') IS NOT NULL THEN
   IF (SELECT relowner FROM pg_class WHERE oid='public.tk_memo_b1_migrations'::regclass)<>owner_oid THEN RAISE EXCEPTION 'B1_REGISTRY_OWNER_MISMATCH'; END IF;
   SELECT manifest INTO saved FROM public.tk_memo_b1_migrations WHERE version='b1-v1' AND runtime_role=runtime_name;
   IF saved IS NULL OR saved IS DISTINCT FROM pg_temp.toke_b1_manifest() THEN RAISE EXCEPTION 'B1_INSTALLED_SCHEMA_DRIFT'; END IF;
   FOREACH t IN ARRAY names||ARRAY['tk_memo_b1_migrations'] LOOP
     IF has_table_privilege(runtime_oid,'public.'||t,'INSERT') OR has_table_privilege(runtime_oid,'public.'||t,'UPDATE') OR has_table_privilege(runtime_oid,'public.'||t,'DELETE') OR has_table_privilege(runtime_oid,'public.'||t,'TRUNCATE') OR has_table_privilege(runtime_oid,'public.'||t,'TRIGGER') THEN RAISE EXCEPTION 'B1_RUNTIME_INHERITED_WRITE_PRIVILEGE'; END IF;
   END LOOP;
   RETURN;
 END IF;
 FOREACH t IN ARRAY names LOOP
   IF to_regclass('public.'||t) IS NOT NULL THEN RAISE EXCEPTION 'B1_UNVERSIONED_OBJECT: %',t; END IF;
 END LOOP;
 IF EXISTS(SELECT FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'toke_b1_%') THEN RAISE EXCEPTION 'B1_UNVERSIONED_FUNCTION'; END IF;

 CREATE TABLE public.tk_memo_b1_migrations (
   version text PRIMARY KEY CHECK(version='b1-v1'), runtime_role text NOT NULL,
   installed_at timestamptz NOT NULL DEFAULT clock_timestamp(), manifest jsonb NOT NULL
 );
 CREATE TABLE public.tk_memo_commands (
   command_id uuid PRIMARY KEY, memo_id integer NOT NULL REFERENCES public.tk_memos(id) ON DELETE RESTRICT,
   actor_id integer NOT NULL REFERENCES public.xa_users(id) ON DELETE RESTRICT,
   delegated_actor_ref text CHECK(length(delegated_actor_ref) BETWEEN 1 AND 128),
   action text NOT NULL CHECK(action IN ('OBSERVE_LEGACY_STATE')),
   payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<=16384),
   result jsonb NOT NULL CHECK(jsonb_typeof(result)='object' AND octet_length(result::text)<=16384),
   committed_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(memo_id,command_id)
 );
 CREATE TABLE public.tk_memo_events (
   event_id uuid PRIMARY KEY, memo_id integer NOT NULL REFERENCES public.tk_memos(id) ON DELETE RESTRICT,
   sequence bigint NOT NULL CHECK(sequence>0),
   event_type text NOT NULL CHECK(event_type IN ('SUBMITTED','RESPONSIBILITY_ASSIGNED','RESPONSIBILITY_TRANSFERRED','RESPONSIBILITY_REVIEW_REQUIRED','COMMENTED','DECIDED','REOPENED','REVOKED','TIME_DATA_KEPT','TIME_CORRECTION_APPLIED','LEGACY_STATE_OBSERVED')),
   actor_kind text NOT NULL CHECK(actor_kind IN ('HUMAN','SYSTEM')),
   effective_author_id integer REFERENCES public.xa_users(id) ON DELETE RESTRICT,
   service_actor text CHECK(length(service_actor) BETWEEN 1 AND 128),
   delegated_actor_ref text CHECK(length(delegated_actor_ref) BETWEEN 1 AND 128),
   responsible_user_id integer REFERENCES public.xa_users(id) ON DELETE RESTRICT,
   decision_result text CHECK(decision_result IN ('approved','rejected')),
   occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
   decision_cycle bigint NOT NULL CHECK(decision_cycle>0), version bigint NOT NULL CHECK(version>0),
   previous_event_id uuid, related_event_id uuid,
   command_id uuid NOT NULL, command_event_index smallint NOT NULL CHECK(command_event_index>=0),
   metadata jsonb NOT NULL CHECK(jsonb_typeof(metadata)='object' AND metadata @> '{"schema_version":1}' AND octet_length(metadata::text)<=16384),
   CHECK((actor_kind='HUMAN' AND effective_author_id IS NOT NULL AND service_actor IS NULL)
     OR (actor_kind='SYSTEM' AND effective_author_id IS NULL AND service_actor IS NOT NULL AND delegated_actor_ref IS NULL)),
   CHECK((event_type='DECIDED' AND decision_result IS NOT NULL) OR (event_type<>'DECIDED' AND decision_result IS NULL)),
   CHECK(previous_event_id IS DISTINCT FROM event_id AND related_event_id IS DISTINCT FROM event_id),
   UNIQUE(memo_id,event_id), UNIQUE(memo_id,sequence), UNIQUE(command_id,command_event_index),
   FOREIGN KEY(memo_id,command_id) REFERENCES public.tk_memo_commands(memo_id,command_id) ON DELETE RESTRICT,
   FOREIGN KEY(memo_id,previous_event_id) REFERENCES public.tk_memo_events(memo_id,event_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
   FOREIGN KEY(memo_id,related_event_id) REFERENCES public.tk_memo_events(memo_id,event_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
 );
 CREATE UNIQUE INDEX tk_memo_events_one_decision ON public.tk_memo_events(memo_id,decision_cycle) WHERE event_type='DECIDED';
 CREATE INDEX tk_memo_events_cycles ON public.tk_memo_events(memo_id,decision_cycle,sequence);
 CREATE TABLE public.tk_memo_workflows (
   memo_id integer PRIMARY KEY REFERENCES public.tk_memos(id) ON DELETE RESTRICT,
   responsible_user_id integer REFERENCES public.xa_users(id) ON DELETE RESTRICT,
   responsibility_state text NOT NULL CHECK(responsibility_state IN ('UNRESOLVED','ASSIGNED','REVIEW_REQUIRED')),
   responsibility_reason text CHECK(length(responsibility_reason) BETWEEN 1 AND 128),
   responsibility_provenance jsonb NOT NULL CHECK(jsonb_typeof(responsibility_provenance)='object' AND octet_length(responsibility_provenance::text)<=16384),
   decision_cycle bigint NOT NULL CHECK(decision_cycle>0), version bigint NOT NULL CHECK(version>0),
   last_event_id uuid NOT NULL,
   initial_known_state jsonb NOT NULL CHECK(jsonb_typeof(initial_known_state)='object' AND octet_length(initial_known_state::text)<=16384),
   history_completeness text NOT NULL CHECK(history_completeness IN ('COMPLETE_SINCE_B','LEGACY_INCOMPLETE')),
   CHECK((responsibility_state='ASSIGNED' AND responsible_user_id IS NOT NULL)
     OR (responsibility_state='UNRESOLVED' AND responsible_user_id IS NULL AND responsibility_reason IS NOT NULL)
     OR (responsibility_state='REVIEW_REQUIRED' AND responsibility_reason IS NOT NULL)),
   FOREIGN KEY(memo_id,last_event_id) REFERENCES public.tk_memo_events(memo_id,event_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
 );
 CREATE INDEX tk_memo_workflows_queue ON public.tk_memo_workflows(responsibility_state,responsible_user_id,memo_id);
 CREATE TABLE public.tk_time_raw_observations (
   observation_id uuid PRIMARY KEY,
   entry_id integer REFERENCES public.tk_time_entries(id) ON DELETE RESTRICT,
   session_id smallint REFERENCES public.xa_work_sessions(id) ON DELETE RESTRICT,
   target_key text GENERATED ALWAYS AS (CASE WHEN entry_id IS NOT NULL THEN 'entry:'||entry_id::text ELSE 'session:'||session_id::text END) STORED NOT NULL,
   field text NOT NULL, raw_value timestamptz,
   source text NOT NULL CHECK(source IN ('DEVICE','SERVER','IMPORT','LEGACY_OBSERVED')),
   source_reference text NOT NULL CHECK(length(source_reference) BETWEEN 1 AND 128),
   provenance_quality text NOT NULL CHECK(provenance_quality IN ('RAW_CAPTURED','OBSERVED_ONLY','UNKNOWN')),
   captured_at timestamptz NOT NULL DEFAULT clock_timestamp(),
   metadata jsonb NOT NULL CHECK(jsonb_typeof(metadata)='object' AND octet_length(metadata::text)<=16384),
   CHECK(num_nonnulls(entry_id,session_id)=1),
   CHECK((entry_id IS NOT NULL AND field='clocked_at') OR (session_id IS NOT NULL AND field IN ('session_start_at','session_end_at'))),
   CHECK(source<>'LEGACY_OBSERVED' OR provenance_quality<>'RAW_CAPTURED'),
   UNIQUE(target_key,field,source,source_reference), UNIQUE(observation_id,target_key,field)
 );
 CREATE TABLE public.tk_time_correction_changes (
   change_id uuid PRIMARY KEY, command_id uuid NOT NULL, memo_id integer NOT NULL,
   event_id uuid NOT NULL, decision_event_id uuid,
   no_decision_reason text CHECK(length(no_decision_reason) BETWEEN 1 AND 256),
   entry_id integer REFERENCES public.tk_time_entries(id) ON DELETE RESTRICT,
   session_id smallint REFERENCES public.xa_work_sessions(id) ON DELETE RESTRICT,
   target_key text GENERATED ALWAYS AS (CASE WHEN entry_id IS NOT NULL THEN 'entry:'||entry_id::text ELSE 'session:'||session_id::text END) STORED NOT NULL,
   field text NOT NULL, before_value timestamptz, after_value timestamptz,
   raw_observation_id uuid, previous_change_id uuid, rectifies_change_id uuid,
   actor_id integer NOT NULL REFERENCES public.xa_users(id) ON DELETE RESTRICT,
   delegated_actor_ref text CHECK(length(delegated_actor_ref) BETWEEN 1 AND 128),
   justification text NOT NULL CHECK(length(btrim(justification)) BETWEEN 1 AND 4000),
   occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
   version_before bigint NOT NULL CHECK(version_before>=0), version_after bigint NOT NULL,
   provenance_quality text NOT NULL CHECK(provenance_quality IN ('RAW_CAPTURED','OBSERVED_ONLY','UNKNOWN')),
   metadata jsonb NOT NULL CHECK(jsonb_typeof(metadata)='object' AND octet_length(metadata::text)<=16384),
   CHECK(num_nonnulls(entry_id,session_id)=1),
   CHECK((entry_id IS NOT NULL AND field='clocked_at') OR (session_id IS NOT NULL AND field IN ('session_start_at','session_end_at'))),
   CHECK(before_value IS DISTINCT FROM after_value), CHECK(version_after=version_before+1),
   CHECK(previous_change_id IS DISTINCT FROM change_id AND rectifies_change_id IS DISTINCT FROM change_id),
   CHECK((decision_event_id IS NULL AND no_decision_reason IS NOT NULL) OR (decision_event_id IS NOT NULL AND no_decision_reason IS NULL)),
   CHECK(provenance_quality<>'RAW_CAPTURED' OR raw_observation_id IS NOT NULL),
   UNIQUE(change_id,target_key,field), UNIQUE(command_id,target_key,field), UNIQUE(target_key,field,version_after),
   FOREIGN KEY(memo_id,command_id) REFERENCES public.tk_memo_commands(memo_id,command_id) ON DELETE RESTRICT,
   FOREIGN KEY(memo_id,event_id) REFERENCES public.tk_memo_events(memo_id,event_id) ON DELETE RESTRICT,
   FOREIGN KEY(memo_id,decision_event_id) REFERENCES public.tk_memo_events(memo_id,event_id) ON DELETE RESTRICT,
   FOREIGN KEY(raw_observation_id,target_key,field) REFERENCES public.tk_time_raw_observations(observation_id,target_key,field) ON DELETE RESTRICT,
   FOREIGN KEY(previous_change_id,target_key,field) REFERENCES public.tk_time_correction_changes(change_id,target_key,field) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
   FOREIGN KEY(rectifies_change_id,target_key,field) REFERENCES public.tk_time_correction_changes(change_id,target_key,field) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
 );
 CREATE INDEX tk_time_correction_changes_events ON public.tk_time_correction_changes(memo_id,event_id);

 CREATE FUNCTION public.toke_b1_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
 BEGIN RAISE EXCEPTION 'B1_APPEND_ONLY'; END $fn$;
 FOREACH t IN ARRAY ARRAY['tk_memo_events','tk_memo_commands','tk_time_raw_observations','tk_time_correction_changes'] LOOP
   EXECUTE format('CREATE TRIGGER b1_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.toke_b1_immutable()',t);
 END LOOP;

 -- Deferred cross-table validation: workflow must match the final event, and
 -- initial snapshot can never be replaced even by a future bounded writer.
 CREATE FUNCTION public.toke_b1_workflow_integrity() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $fn$
 DECLARE w public.tk_memo_workflows; e public.tk_memo_events;
 BEGIN
   IF TG_OP='UPDATE' AND (NEW.initial_known_state IS DISTINCT FROM OLD.initial_known_state OR NEW.history_completeness IS DISTINCT FROM OLD.history_completeness) THEN RAISE EXCEPTION 'B1_INITIAL_STATE_IMMUTABLE'; END IF;
   IF TG_OP='UPDATE' AND NEW IS DISTINCT FROM OLD AND (NEW.version<>OLD.version+1 OR NEW.last_event_id IS NOT DISTINCT FROM OLD.last_event_id) THEN RAISE EXCEPTION 'B1_WORKFLOW_ADVANCE_REQUIRES_EVENT'; END IF;
   SELECT * INTO w FROM public.tk_memo_workflows WHERE memo_id=NEW.memo_id;
   SELECT * INTO e FROM public.tk_memo_events WHERE memo_id=w.memo_id ORDER BY sequence DESC LIMIT 1;
   IF e.event_id IS DISTINCT FROM w.last_event_id OR e.version IS DISTINCT FROM w.version OR e.decision_cycle IS DISTINCT FROM w.decision_cycle OR e.responsible_user_id IS DISTINCT FROM w.responsible_user_id THEN
     RAISE EXCEPTION 'B1_WORKFLOW_EVENT_MISMATCH'; END IF;
   RETURN NULL;
 END $fn$;
 CREATE CONSTRAINT TRIGGER b1_workflow_integrity AFTER INSERT OR UPDATE ON public.tk_memo_workflows DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.toke_b1_workflow_integrity();

 CREATE FUNCTION public.toke_b1_event_integrity() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $fn$
 DECLARE prev public.tk_memo_events;
 BEGIN
   IF NEW.actor_kind='HUMAN' AND NOT EXISTS(SELECT FROM public.tk_memo_commands c WHERE c.command_id=NEW.command_id AND c.memo_id=NEW.memo_id AND c.actor_id=NEW.effective_author_id AND c.delegated_actor_ref IS NOT DISTINCT FROM NEW.delegated_actor_ref) THEN RAISE EXCEPTION 'B1_EVENT_COMMAND_ACTOR_MISMATCH'; END IF;
   IF NEW.sequence=1 THEN
     IF NEW.previous_event_id IS NOT NULL THEN RAISE EXCEPTION 'B1_FIRST_EVENT_PREDECESSOR'; END IF;
   ELSE
     SELECT * INTO prev FROM public.tk_memo_events WHERE memo_id=NEW.memo_id AND event_id=NEW.previous_event_id;
     IF prev.sequence IS DISTINCT FROM NEW.sequence-1 OR prev.version>NEW.version OR prev.decision_cycle>NEW.decision_cycle THEN RAISE EXCEPTION 'B1_EVENT_CHAIN_INVALID'; END IF;
   END IF;
   IF NOT EXISTS(SELECT FROM public.tk_memo_workflows w JOIN public.tk_memo_events e ON e.memo_id=w.memo_id AND e.event_id=w.last_event_id
     WHERE w.memo_id=NEW.memo_id AND e.version=w.version AND e.decision_cycle=w.decision_cycle
     AND e.responsible_user_id IS NOT DISTINCT FROM w.responsible_user_id
     AND e.sequence=(SELECT max(sequence) FROM public.tk_memo_events WHERE memo_id=NEW.memo_id)) THEN RAISE EXCEPTION 'B1_EVENT_WITHOUT_PROJECTION'; END IF;
   RETURN NULL;
 END $fn$;
 CREATE CONSTRAINT TRIGGER b1_event_integrity AFTER INSERT ON public.tk_memo_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.toke_b1_event_integrity();

 CREATE FUNCTION public.toke_b1_correction_integrity() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $fn$
 BEGIN
   IF NOT EXISTS(SELECT FROM public.tk_memo_events WHERE memo_id=NEW.memo_id AND event_id=NEW.event_id AND event_type='TIME_CORRECTION_APPLIED' AND command_id=NEW.command_id AND effective_author_id=NEW.actor_id AND delegated_actor_ref IS NOT DISTINCT FROM NEW.delegated_actor_ref) THEN RAISE EXCEPTION 'B1_CORRECTION_EVENT_REQUIRED'; END IF;
   IF NEW.decision_event_id IS NOT NULL AND NOT EXISTS(SELECT FROM public.tk_memo_events WHERE memo_id=NEW.memo_id AND event_id=NEW.decision_event_id AND event_type='DECIDED') THEN RAISE EXCEPTION 'B1_DECISION_EVENT_REQUIRED'; END IF;
   IF NEW.raw_observation_id IS NOT NULL AND NOT EXISTS(SELECT FROM public.tk_time_raw_observations WHERE observation_id=NEW.raw_observation_id AND provenance_quality=NEW.provenance_quality) THEN RAISE EXCEPTION 'B1_RAW_PROVENANCE_MISMATCH'; END IF;
   IF NEW.rectifies_change_id IS NOT NULL AND NOT EXISTS(SELECT FROM public.tk_time_correction_changes WHERE change_id=NEW.rectifies_change_id AND version_after<=NEW.version_before) THEN RAISE EXCEPTION 'B1_RECTIFICATION_MUST_REFERENCE_PAST'; END IF;
   IF NEW.previous_change_id IS NULL THEN
     IF EXISTS(SELECT FROM public.tk_time_correction_changes WHERE target_key=NEW.target_key AND field=NEW.field AND version_after<NEW.version_after) THEN RAISE EXCEPTION 'B1_PREVIOUS_CORRECTION_REQUIRED'; END IF;
   ELSIF NOT EXISTS(SELECT FROM public.tk_time_correction_changes WHERE change_id=NEW.previous_change_id AND version_after=NEW.version_before AND after_value IS NOT DISTINCT FROM NEW.before_value) THEN RAISE EXCEPTION 'B1_CORRECTION_CHAIN_INVALID'; END IF;
   RETURN NULL;
 END $fn$;
 CREATE CONSTRAINT TRIGGER b1_correction_integrity AFTER INSERT ON public.tk_time_correction_changes DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.toke_b1_correction_integrity();

 -- ONLY available B1 write: observe current state now. No responsibility,
 -- decision, correction, reopening or historical data mutation is performed.
 CREATE FUNCTION public.toke_b1_observe_legacy(p_command uuid,p_memo integer,p_actor integer,p_delegated text,p_payload jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
 DECLARE cmd public.tk_memo_commands; snapshot jsonb; ev uuid:=gen_random_uuid(); answer jsonb;
 BEGIN
   IF p_command IS NULL OR p_memo IS NULL OR p_actor IS NULL OR p_payload IS NULL OR p_payload<>'{}'::jsonb THEN RAISE EXCEPTION 'B1_INVALID_OBSERVATION_COMMAND'; END IF;
   -- Serialize same idempotency key even if reused concurrently for another memo.
   PERFORM pg_advisory_xact_lock(hashtextextended(p_command::text,3703));
   SELECT * INTO cmd FROM public.tk_memo_commands WHERE command_id=p_command;
   IF FOUND THEN
     IF cmd.memo_id<>p_memo OR cmd.actor_id<>p_actor OR cmd.delegated_actor_ref IS DISTINCT FROM p_delegated OR cmd.action<>'OBSERVE_LEGACY_STATE' OR cmd.payload<>p_payload THEN RAISE EXCEPTION 'B1_COMMAND_CONFLICT'; END IF;
     RETURN cmd.result;
   END IF;
   SELECT jsonb_build_object('memo_status',m.memo_status::text,'validator_user',m.validator_user,'author_user',to_jsonb(m)->'author_user','target_user',to_jsonb(m)->'target_user','memo_type',to_jsonb(m)->'memo_type','observed_at',clock_timestamp(),'past_decision_date_known',false)
     INTO snapshot FROM public.tk_memos m WHERE m.id=p_memo FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'B1_MEMO_NOT_FOUND'; END IF;
   IF EXISTS(SELECT FROM public.tk_memo_workflows WHERE memo_id=p_memo) THEN RAISE EXCEPTION 'B1_WORKFLOW_ALREADY_EXISTS'; END IF;
   answer:=jsonb_build_object('event_id',ev,'memo_id',p_memo,'decision_cycle',1,'version',1);
   INSERT INTO public.tk_memo_commands(command_id,memo_id,actor_id,delegated_actor_ref,action,payload,result) VALUES(p_command,p_memo,p_actor,p_delegated,'OBSERVE_LEGACY_STATE',p_payload,answer);
   INSERT INTO public.tk_memo_events(event_id,memo_id,sequence,event_type,actor_kind,effective_author_id,delegated_actor_ref,decision_cycle,version,command_id,command_event_index,metadata)
     VALUES(ev,p_memo,1,'LEGACY_STATE_OBSERVED','HUMAN',p_actor,p_delegated,1,1,p_command,0,jsonb_build_object('schema_version',1,'observed_state',snapshot));
   INSERT INTO public.tk_memo_workflows(memo_id,responsibility_state,responsibility_reason,responsibility_provenance,decision_cycle,version,last_event_id,initial_known_state,history_completeness)
     VALUES(p_memo,'UNRESOLVED','LEGACY_NOT_CERTIFIED','{"schema_version":1}',1,1,ev,snapshot,'LEGACY_INCOMPLETE');
   RETURN answer;
 END $fn$;

 CREATE FUNCTION public.toke_b1_version() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
   SELECT version FROM public.tk_memo_b1_migrations WHERE version='b1-v1';
 $fn$;

 -- Explicit ACLs override any ambient default grants.
 FOREACH t IN ARRAY names||ARRAY['tk_memo_b1_migrations'] LOOP
   EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, %I',t,runtime_name);
 END LOOP;
 FOR item IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'toke_b1_%' LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, %I',item.signature,runtime_name);
 END LOOP;
 FOREACH t IN ARRAY names LOOP EXECUTE format('GRANT SELECT ON public.%I TO %I',t,runtime_name); END LOOP;
 EXECUTE format('GRANT EXECUTE ON FUNCTION public.toke_b1_observe_legacy(uuid,integer,integer,text,jsonb) TO %I',runtime_name);
 EXECUTE format('GRANT EXECUTE ON FUNCTION public.toke_b1_version() TO %I',runtime_name);
 FOREACH t IN ARRAY names||ARRAY['tk_memo_b1_migrations'] LOOP
   IF has_table_privilege(runtime_oid,'public.'||t,'INSERT') OR has_table_privilege(runtime_oid,'public.'||t,'UPDATE') OR has_table_privilege(runtime_oid,'public.'||t,'DELETE') OR has_table_privilege(runtime_oid,'public.'||t,'TRUNCATE') OR has_table_privilege(runtime_oid,'public.'||t,'TRIGGER') OR has_table_privilege(runtime_oid,'public.'||t,'REFERENCES') THEN RAISE EXCEPTION 'B1_RUNTIME_INHERITED_WRITE_PRIVILEGE'; END IF;
 END LOOP;
 INSERT INTO public.tk_memo_b1_migrations(version,runtime_role,manifest) VALUES('b1-v1',runtime_name,pg_temp.toke_b1_manifest());
END;
$migration$;
COMMIT;
