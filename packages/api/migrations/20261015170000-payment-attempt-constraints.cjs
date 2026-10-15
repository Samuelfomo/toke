'use strict';
module.exports={async up(q){await q.sequelize.transaction(async transaction=>{
 await q.sequelize.query(`
 DO $$ BEGIN IF to_regclass('public.xa_payment_attempt') IS NULL THEN RAISE EXCEPTION 'Synchronize PaymentAttemptDbStructure before this migration'; END IF; END $$;
 CREATE SEQUENCE public.xa_payment_attempt_guid_seq AS integer MINVALUE 100000 MAXVALUE 999999 START 100000 NO CYCLE;
 ALTER TABLE public.xa_payment_attempt ALTER COLUMN guid SET DEFAULT nextval('public.xa_payment_attempt_guid_seq');
 ALTER SEQUENCE public.xa_payment_attempt_guid_seq OWNED BY public.xa_payment_attempt.guid;
 ALTER TABLE public.xa_payment_attempt
 ADD CONSTRAINT payment_attempt_guid_range CHECK(guid BETWEEN 100000 AND 999999),
 ADD CONSTRAINT payment_attempt_environment CHECK(environment IN ('TEST','LIVE')),
 ADD CONSTRAINT payment_attempt_provider CHECK(provider='KPAY' AND operator IN ('MTN_MOMO_CMR','ORANGE_CMR')),
 ADD CONSTRAINT payment_attempt_status CHECK(status IN ('CREATED','UNKNOWN','PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED')),
 ADD CONSTRAINT payment_attempt_amount CHECK(currency_code='XAF' AND amount_local>0 AND amount_local=trunc(amount_local)),
 ADD CONSTRAINT payment_attempt_phone CHECK(phone_number ~ '^2376[0-9]{8}$'),
 ADD CONSTRAINT payment_attempt_key CHECK(idempotency_key ~ '^[A-Za-z0-9_:-]{8,128}$'),
 ADD CONSTRAINT payment_attempt_external CHECK(length(trim(external_id))>0),
 ADD CONSTRAINT payment_attempt_dates CHECK(updated_at>=created_at AND (completed_at IS NULL OR completed_at>=created_at) AND (failed_at IS NULL OR failed_at>=created_at)),
 ADD CONSTRAINT payment_attempt_terminal CHECK((status='COMPLETED' AND completed_at IS NOT NULL AND failed_at IS NULL AND provider_payment_id IS NOT NULL AND length(trim(provider_payment_id))>0) OR (status IN ('FAILED','CANCELLED') AND failed_at IS NOT NULL AND completed_at IS NULL AND failure_reason IS NOT NULL AND length(trim(failure_reason))>0) OR (status IN ('CREATED','UNKNOWN','PENDING','PROCESSING') AND completed_at IS NULL AND failed_at IS NULL)),
 ADD CONSTRAINT payment_attempt_operation UNIQUE(payment_transaction,idempotency_key);
 CREATE UNIQUE INDEX payment_attempt_provider_id ON public.xa_payment_attempt(provider,environment,provider_payment_id) WHERE provider_payment_id IS NOT NULL;
 CREATE UNIQUE INDEX payment_attempt_one_open ON public.xa_payment_attempt(payment_transaction) WHERE status IN ('CREATED','UNKNOWN','PENDING','PROCESSING');
 CREATE UNIQUE INDEX payment_attempt_one_success ON public.xa_payment_attempt(payment_transaction) WHERE status='COMPLETED';
 CREATE INDEX payment_attempt_reconciliation ON public.xa_payment_attempt(status,updated_at) WHERE status IN ('CREATED','UNKNOWN','PENDING','PROCESSING');
 CREATE FUNCTION public.guard_payment_attempt() RETURNS trigger LANGUAGE plpgsql AS $f$
 BEGIN
 IF TG_OP IN ('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'Payment attempts cannot be deleted'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'CREATED' OR NEW.provider_payment_id IS NOT NULL OR NEW.provider_reference IS NOT NULL THEN RAISE EXCEPTION 'Attempt must start as CREATED'; END IF;
 ELSE
  IF ROW(NEW.id,NEW.guid,NEW.payment_transaction,NEW.provider,NEW.operator,NEW.environment,NEW.external_id,NEW.idempotency_key,NEW.phone_number,NEW.amount_local,NEW.currency_code,NEW.created_at)
   IS DISTINCT FROM ROW(OLD.id,OLD.guid,OLD.payment_transaction,OLD.provider,OLD.operator,OLD.environment,OLD.external_id,OLD.idempotency_key,OLD.phone_number,OLD.amount_local,OLD.currency_code,OLD.created_at) THEN RAISE EXCEPTION 'Attempt identity and submitted data are immutable'; END IF;
  IF OLD.status IN ('COMPLETED','FAILED','CANCELLED') AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Terminal attempt requires manual reconciliation'; END IF;
  IF OLD.provider_payment_id IS NOT NULL AND NEW.provider_payment_id IS DISTINCT FROM OLD.provider_payment_id THEN RAISE EXCEPTION 'Provider payment identity is immutable'; END IF;
  IF OLD.provider_reference IS NOT NULL AND NEW.provider_reference IS DISTINCT FROM OLD.provider_reference THEN RAISE EXCEPTION 'Provider reference is immutable'; END IF;
  IF (OLD.status='PROCESSING' AND NEW.status IN ('CREATED','PENDING')) OR (OLD.status<> 'CREATED' AND NEW.status='CREATED') THEN RAISE EXCEPTION 'Attempt status cannot regress'; END IF;
 END IF;
 RETURN NEW;
 END $f$;
 CREATE TRIGGER payment_attempt_guard BEFORE INSERT OR UPDATE OR DELETE ON public.xa_payment_attempt FOR EACH ROW EXECUTE FUNCTION public.guard_payment_attempt();
 CREATE TRIGGER payment_attempt_no_truncate BEFORE TRUNCATE ON public.xa_payment_attempt FOR EACH STATEMENT EXECUTE FUNCTION public.guard_payment_attempt();
 `,{transaction});
 });},async down(){throw new Error('Payment attempt history must be preserved; use a reviewed forward migration');}};
