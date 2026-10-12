'use strict';
module.exports={async up(q){await q.sequelize.transaction(async transaction=>{
 await q.sequelize.query(`
 CREATE SEQUENCE public.xa_license_event_guid_seq AS integer MINVALUE 100000 MAXVALUE 999999 START 100000 NO CYCLE;
 CREATE TABLE IF NOT EXISTS public.xa_license_event (
  id bigserial PRIMARY KEY,guid integer NOT NULL DEFAULT nextval('public.xa_license_event_guid_seq') UNIQUE,
  tenant integer NOT NULL REFERENCES public.xa_tenant(id),global_license integer NOT NULL REFERENCES public.xa_global_license(id),
  event_type varchar(64) NOT NULL,operation_key varchar(128) NOT NULL,actor_type varchar(8) NOT NULL,actor_user_guid varchar(128),
  occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,effective_at timestamptz NOT NULL,
  previous_payload jsonb NOT NULL,new_payload jsonb NOT NULL,reason text NOT NULL,metadata jsonb NOT NULL DEFAULT '{}'
 );
 ALTER TABLE public.xa_license_event ADD CONSTRAINT license_event_operation_unique UNIQUE(global_license,event_type,operation_key);
 ALTER TABLE public.xa_license_event ADD CONSTRAINT license_event_guid_range CHECK(guid BETWEEN 100000 AND 999999);
 ALTER TABLE public.xa_license_event ADD CONSTRAINT license_event_actor CHECK(
  (actor_type='USER' AND actor_user_guid IS NOT NULL AND length(trim(actor_user_guid))>0) OR
  (actor_type='SYSTEM' AND actor_user_guid IS NULL));
 ALTER TABLE public.xa_license_event ADD CONSTRAINT license_event_text CHECK(length(trim(operation_key))>0 AND length(trim(reason))>0);
 ALTER TABLE public.xa_license_event ADD CONSTRAINT license_event_payload_objects CHECK(
  jsonb_typeof(previous_payload)='object' AND jsonb_typeof(new_payload)='object' AND jsonb_typeof(metadata)='object');
 CREATE FUNCTION public.validate_license_event() RETURNS trigger LANGUAGE plpgsql AS $f$
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.xa_global_license l WHERE l.id=NEW.global_license AND l.tenant=NEW.tenant)
   THEN RAISE EXCEPTION 'Event license does not belong to tenant'; END IF;
  IF NEW.event_type='BILLING_MODE_CHANGED' THEN
   IF NOT (NEW.previous_payload ?& ARRAY['billing_mode','postpaid_from']) OR NOT (NEW.new_payload ?& ARRAY['billing_mode','postpaid_from'])
    OR NEW.previous_payload->>'billing_mode' IS NULL OR NEW.new_payload->>'billing_mode' IS NULL
    OR NEW.previous_payload->>'billing_mode' NOT IN ('PREPAID','POSTPAID')
    OR NEW.new_payload->>'billing_mode' NOT IN ('PREPAID','POSTPAID')
    OR (NEW.new_payload->>'billing_mode'='POSTPAID' AND
       (NEW.new_payload->>'postpaid_from' IS NULL OR (NEW.new_payload->>'postpaid_from')::timestamptz<>NEW.effective_at))
    THEN RAISE EXCEPTION 'Invalid billing mode event payload'; END IF;
  ELSIF NEW.event_type='LEGACY_CYCLE_EXCLUDED' THEN
   IF NOT (NEW.previous_payload ?& ARRAY['billing_cycle_guid','billing_status']) OR NOT (NEW.new_payload ?& ARRAY['billing_cycle_guid','billing_status'])
    OR NEW.previous_payload->>'billing_status' IS DISTINCT FROM 'PENDING'
    OR NEW.new_payload->>'billing_status' IS DISTINCT FROM 'CANCELLED'
    OR NEW.previous_payload->>'billing_cycle_guid' IS DISTINCT FROM NEW.new_payload->>'billing_cycle_guid'
    THEN RAISE EXCEPTION 'Invalid legacy exclusion event payload'; END IF;
  ELSIF NEW.event_type='LICENSE_STATUS_CHANGED' THEN
   IF NOT (NEW.previous_payload ? 'license_status') OR NOT (NEW.new_payload ? 'license_status')
    OR COALESCE(NEW.previous_payload->>'license_status','')='' OR COALESCE(NEW.new_payload->>'license_status','')=''
    THEN RAISE EXCEPTION 'Invalid status event payload'; END IF;
  ELSE RAISE EXCEPTION 'Event type is not in the approved catalog'; END IF;
  RETURN NEW;
 END $f$;
 CREATE FUNCTION public.license_event_append_only() RETURNS trigger LANGUAGE plpgsql AS $f$
 BEGIN RAISE EXCEPTION 'License events are append-only; correction requires a compensating event'; END $f$;
 CREATE TRIGGER license_event_validate BEFORE INSERT ON public.xa_license_event FOR EACH ROW EXECUTE FUNCTION public.validate_license_event();
 CREATE TRIGGER license_event_immutable BEFORE UPDATE OR DELETE ON public.xa_license_event FOR EACH ROW EXECUTE FUNCTION public.license_event_append_only();
 CREATE TRIGGER license_event_no_truncate BEFORE TRUNCATE ON public.xa_license_event FOR EACH STATEMENT EXECUTE FUNCTION public.license_event_append_only();
 `,{transaction});
 });},async down(){throw new Error('Do not delete license audit; use a reviewed forward migration');}};
