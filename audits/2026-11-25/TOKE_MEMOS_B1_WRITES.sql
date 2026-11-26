-- Renseigner la base attendue. Exécuter le fichier entier en tant que postgres.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
DO $$
DECLARE expected_database text := 'demo_test_2_toke100016_a4b3';
BEGIN
  IF current_database() IS DISTINCT FROM expected_database
  THEN RAISE EXCEPTION 'MEMO_EXPLICIT_DATABASE_REQUIRED'; END IF;
  IF current_user <> 'postgres' OR session_user <> 'postgres'
     OR public.toke_b1_version() IS DISTINCT FROM 'b1-v1'
     OR NOT EXISTS (SELECT FROM public.tk_memo_b1_migrations
                    WHERE version='b1-v1' AND installation_profile='PGADMIN_POSTGRES_LEGACY_OWNER')
  THEN RAISE EXCEPTION 'MEMO_B1_PROFILE_REQUIRED'; END IF;
END $$;

ALTER TABLE public.tk_memo_commands DROP CONSTRAINT tk_memo_commands_action_check,
  ADD CONSTRAINT tk_memo_commands_action_check CHECK (action IN
    ('OBSERVE_LEGACY_STATE','CREATE','EDIT','SUBMIT','REPLY','APPROVE','REJECT','REVOKE'));
ALTER TABLE public.tk_memo_events DROP CONSTRAINT tk_memo_events_event_type_check,
  ADD CONSTRAINT tk_memo_events_event_type_check CHECK (event_type IN
    ('DRAFT_CREATED','EDITED','SUBMITTED','RESPONSIBILITY_ASSIGNED','RESPONSIBILITY_TRANSFERRED',
     'RESPONSIBILITY_REVIEW_REQUIRED','COMMENTED','DECIDED','REOPENED','REVOKED',
     'TIME_DATA_KEPT','TIME_CORRECTION_APPLIED','LEGACY_STATE_OBSERVED'));

CREATE OR REPLACE FUNCTION public.toke_b1_write_memo(
  p_command uuid, p_action text, p_guid text, p_tenant text, p_actor integer,
  p_delegated text, p_version bigint, p_payload jsonb, p_responsible integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
  m public.tk_memos; w public.tk_memo_workflows; c public.tk_memo_commands;
  baseline jsonb; answer jsonb; message jsonb; actor_guid text;
  ev uuid := gen_random_uuid(); seq bigint := 1; v bigint := 1;
  event_type text; decision text; related uuid; responsible integer;
  stamp timestamptz := clock_timestamp();
BEGIN
  IF p_command IS NULL OR p_guid IS NULL OR p_tenant IS NULL OR p_action IS NULL OR
     p_action NOT IN ('CREATE','EDIT','SUBMIT','REPLY','APPROVE','REJECT','REVOKE') OR
     jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR octet_length(p_payload::text)>16384
  THEN RAISE EXCEPTION 'MEMO_INVALID'; END IF;
  SELECT u.guid INTO actor_guid FROM public.xa_users u
    WHERE u.id=p_actor AND u.tenant::text=p_tenant AND u.active AND u.deleted_at IS NULL
    AND EXISTS (SELECT FROM public.xa_user_roles ur JOIN public.xa_roles r ON r.id=ur.role
                WHERE ur."user"=u.id AND r.code IN ('MANAGER','ADMIN-RH'));
  IF actor_guid IS NULL THEN RAISE EXCEPTION 'MEMO_FORBIDDEN'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_command::text, 0));
  SELECT * INTO c FROM public.tk_memo_commands WHERE command_id=p_command;
  IF FOUND THEN
    IF c.actor_id=p_actor AND c.delegated_actor_ref IS NOT DISTINCT FROM p_delegated
       AND c.action=p_action AND c.payload=p_payload AND c.result->>'guid'=p_guid
    THEN RETURN c.result; END IF;
    RAISE EXCEPTION 'MEMO_CONFLICT';
  END IF;
  IF p_action IN ('CREATE','EDIT','REPLY') THEN
    IF length(btrim(coalesce(p_payload->>'text',''))) NOT BETWEEN 1 AND 3000
    THEN RAISE EXCEPTION 'MEMO_INVALID'; END IF;
    message := jsonb_build_object('created_at',stamp,'user',actor_guid,
      'type',CASE WHEN p_action='REPLY' THEN 'response' ELSE 'initial' END,
      'message',jsonb_build_array(jsonb_build_object('type','text','content',p_payload->>'text')));
  END IF;
  IF p_action IN ('CREATE','EDIT') AND
    length(btrim(coalesce(p_payload->>'title',''))) NOT BETWEEN 1 AND 200
  THEN RAISE EXCEPTION 'MEMO_INVALID'; END IF;
  IF p_action='CREATE' THEN
    IF NOT EXISTS (SELECT FROM public.xa_users WHERE id=(p_payload->>'targetId')::integer
        AND id<>p_actor AND tenant::text=p_tenant AND active AND deleted_at IS NULL)
    THEN RAISE EXCEPTION 'MEMO_FORBIDDEN'; END IF;
    IF coalesce(p_payload->>'type','') NOT IN
      ('other','delay_justification','absence_justification','correction_request','session_closure')
    THEN RAISE EXCEPTION 'MEMO_INVALID'; END IF;
    -- Use the installed enum type without assuming its Sequelize-generated name.
    m := jsonb_populate_record(NULL::public.tk_memos,jsonb_build_object('memo_type',p_payload->>'type'));
    INSERT INTO public.tk_memos(guid,author_user,target_user,memo_type,memo_status,title,
      memo_content,manager,auto_generated,created_at,updated_at)
    VALUES(p_guid,p_actor,(p_payload->>'targetId')::integer,m.memo_type,'pending',p_payload->>'title',
      jsonb_build_array(message),true,false,stamp,stamp) RETURNING * INTO m;
    event_type := 'DRAFT_CREATED';
  ELSE
    SELECT * INTO m FROM public.tk_memos WHERE guid=p_guid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'MEMO_NOT_FOUND'; END IF;
    SELECT * INTO w FROM public.tk_memo_workflows WHERE memo_id=m.id FOR UPDATE;
    IF p_version IS DISTINCT FROM w.version THEN RAISE EXCEPTION 'MEMO_CONFLICT'; END IF;
    IF w.memo_id IS NOT NULL THEN
      SELECT sequence+1 INTO seq FROM public.tk_memo_events WHERE event_id=w.last_event_id;
      v := w.version+1;
    END IF;
    responsible := w.responsible_user_id;
    IF p_action IN ('EDIT','SUBMIT') THEN
      IF m.author_user<>p_actor OR m.memo_status<>'pending' OR m.auto_generated
         OR w.history_completeness IS DISTINCT FROM 'COMPLETE_SINCE_B'
      THEN RAISE EXCEPTION 'MEMO_FORBIDDEN'; END IF;
      IF p_action='EDIT' THEN
        UPDATE public.tk_memos SET title=p_payload->>'title',memo_content=jsonb_build_array(message),
          updated_at=stamp WHERE id=m.id;
        event_type := 'EDITED';
      ELSE
        IF NOT EXISTS (SELECT FROM public.xa_users WHERE id=m.target_user
                         AND tenant::text=p_tenant AND active AND deleted_at IS NULL)
        THEN RAISE EXCEPTION 'MEMO_FORBIDDEN'; END IF;
        responsible := p_responsible;
        IF responsible IS NOT NULL AND NOT EXISTS (
          SELECT FROM public.xa_users u JOIN public.xa_user_roles ur ON ur."user"=u.id
            JOIN public.xa_roles r ON r.id=ur.role
          WHERE u.id=responsible AND u.tenant::text=p_tenant AND u.active AND u.deleted_at IS NULL
            AND r.code IN ('MANAGER','ADMIN-RH'))
        THEN RAISE EXCEPTION 'MEMO_FORBIDDEN'; END IF;
        UPDATE public.tk_memos SET memo_status='submitted',updated_at=stamp WHERE id=m.id;
        event_type := 'SUBMITTED';
      END IF;
    ELSIF p_action='REPLY' THEN
      IF m.memo_status NOT IN ('pending','submitted')
        OR (m.memo_status='pending' AND w.history_completeness IS NOT DISTINCT FROM 'COMPLETE_SINCE_B')
        OR NOT (m.author_user=p_actor OR m.target_user IS NOT DISTINCT FROM p_actor
          OR (w.responsibility_state IS NOT DISTINCT FROM 'ASSIGNED' AND responsible IS NOT DISTINCT FROM p_actor))
      THEN RAISE EXCEPTION 'MEMO_FORBIDDEN'; END IF;
      IF jsonb_typeof(m.memo_content) IS DISTINCT FROM 'array'
      THEN RAISE EXCEPTION 'MEMO_CONFLICT'; END IF;
      UPDATE public.tk_memos SET memo_content=memo_content||jsonb_build_array(message),updated_at=stamp WHERE id=m.id;
      event_type := 'COMMENTED';
    ELSIF p_action IN ('APPROVE','REJECT') THEN
      IF m.memo_status NOT IN ('pending','submitted') OR w.responsibility_state IS DISTINCT FROM 'ASSIGNED'
         OR responsible IS DISTINCT FROM p_actor THEN RAISE EXCEPTION 'MEMO_FORBIDDEN'; END IF;
      decision := CASE p_action WHEN 'APPROVE' THEN 'approved' ELSE 'rejected' END;
      m.memo_status := CASE p_action WHEN 'APPROVE' THEN 'approved' ELSE 'rejected' END;
      UPDATE public.tk_memos SET memo_status=m.memo_status,validator_user=p_actor,updated_at=stamp WHERE id=m.id;
      event_type := 'DECIDED';
    ELSE
      IF m.memo_status IN ('approved','rejected') THEN
        SELECT e.event_id INTO related FROM public.tk_memo_events e
          WHERE e.memo_id=m.id AND e.decision_cycle=w.decision_cycle AND e.event_type='DECIDED'
            AND e.effective_author_id=p_actor;
        IF related IS NULL OR responsible IS DISTINCT FROM p_actor
          OR w.responsibility_state IS DISTINCT FROM 'ASSIGNED' THEN RAISE EXCEPTION 'MEMO_FORBIDDEN'; END IF;
      ELSIF m.auto_generated OR m.author_user<>p_actor OR m.memo_status NOT IN ('pending','submitted') THEN
        RAISE EXCEPTION 'MEMO_FORBIDDEN';
      END IF;
      UPDATE public.tk_memos SET memo_status='revoked',updated_at=stamp WHERE id=m.id;
      event_type := 'REVOKED';
    END IF;
  END IF;

  baseline := jsonb_build_object('schema_version',1,'memo_status',m.memo_status,'title',m.title);
  answer := jsonb_build_object('guid',p_guid,'version',v::text);
  INSERT INTO public.tk_memo_commands(command_id,memo_id,actor_id,delegated_actor_ref,action,payload,result)
    VALUES(p_command,m.id,p_actor,p_delegated,p_action,p_payload,answer);
  INSERT INTO public.tk_memo_events(event_id,memo_id,sequence,event_type,actor_kind,effective_author_id,
    delegated_actor_ref,responsible_user_id,decision_result,decision_cycle,version,previous_event_id,
    related_event_id,command_id,command_event_index,metadata)
    VALUES(ev,m.id,seq,event_type,'HUMAN',p_actor,p_delegated,responsible,decision,
      coalesce(w.decision_cycle,1),v,w.last_event_id,related,p_command,0,'{"schema_version":1}');
  IF w.memo_id IS NULL THEN
    INSERT INTO public.tk_memo_workflows(memo_id,responsibility_state,responsibility_reason,
      responsibility_provenance,decision_cycle,version,last_event_id,initial_known_state,history_completeness)
    VALUES(m.id,'UNRESOLVED',CASE WHEN p_action='CREATE' THEN 'DRAFT' ELSE 'LEGACY_NOT_CERTIFIED' END,
      '{"schema_version":1}',1,v,ev,baseline,CASE WHEN p_action='CREATE' THEN 'COMPLETE_SINCE_B' ELSE 'LEGACY_INCOMPLETE' END);
  ELSE
    UPDATE public.tk_memo_workflows SET version=v,last_event_id=ev,
      responsible_user_id=responsible,
      responsibility_state=CASE WHEN p_action<>'SUBMIT' THEN w.responsibility_state
        WHEN responsible IS NULL THEN 'UNRESOLVED' ELSE 'ASSIGNED' END,
      responsibility_reason=CASE WHEN p_action<>'SUBMIT' THEN w.responsibility_reason
        WHEN responsible IS NULL THEN 'NO_RELIABLE_MANAGER' ELSE 'SUBMISSION_ORG_POLICY' END,
      responsibility_provenance=CASE WHEN p_action='SUBMIT' THEN
        jsonb_build_object('schema_version',1,'source','MEMO_ORGANIZATION','actor_id',p_actor)
        ELSE w.responsibility_provenance END
    WHERE memo_id=m.id;
  END IF;
  RETURN answer;
END $$;

REVOKE ALL ON FUNCTION public.toke_b1_write_memo(uuid,text,text,text,integer,text,bigint,jsonb,integer) FROM PUBLIC;
DO $$
DECLARE runtime_name text;
BEGIN
  SELECT runtime_role INTO STRICT runtime_name FROM public.tk_memo_b1_migrations WHERE version='b1-v1';
  IF runtime_name='postgres' OR NOT EXISTS (SELECT FROM pg_roles WHERE rolname=runtime_name AND NOT rolsuper)
  THEN RAISE EXCEPTION 'MEMO_INVALID_RUNTIME_ROLE'; END IF;
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.toke_b1_write_memo(uuid,text,text,text,integer,text,bigint,jsonb,integer) TO %I',runtime_name);
  IF EXISTS (
    SELECT FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) acl
    WHERE p.oid='public.toke_b1_write_memo(uuid,text,text,text,integer,text,bigint,jsonb,integer)'::regprocedure
      AND acl.grantee NOT IN (p.proowner, (SELECT oid FROM pg_roles WHERE rolname=runtime_name))
  ) THEN RAISE EXCEPTION 'MEMO_UNEXPECTED_EXECUTE_GRANT'; END IF;
END $$;
COMMIT;
