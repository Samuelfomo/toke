'use strict';
module.exports={
 async up(q){await q.sequelize.transaction(async transaction=>{
  await q.sequelize.query(`
   CREATE TABLE xa_monthly_license_policy (
    global_license integer PRIMARY KEY REFERENCES xa_global_license(id), grace_days integer NOT NULL DEFAULT 7 CHECK(grace_days BETWEEN 0 AND 30),
    actor_user_guid varchar(128) NOT NULL, actor_tenant_guid integer NOT NULL, idempotency_key varchar(128) NOT NULL UNIQUE,
    previous_license jsonb NOT NULL, new_license jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW()
   );
   CREATE TABLE xa_cash_installment (
    id bigserial PRIMARY KEY, payment_transaction integer NOT NULL REFERENCES xa_payment_transaction(id),
    tenant integer NOT NULL REFERENCES xa_tenant(id), actor_user_guid varchar(128) NOT NULL,
    amount_local numeric(12,2) NOT NULL CHECK(amount_local>0), currency_code varchar(3) NOT NULL,
    receipt_reference varchar(128) NOT NULL UNIQUE, idempotency_key varchar(128) NOT NULL UNIQUE,
    received_at timestamptz NOT NULL, confirmed_at timestamptz NOT NULL DEFAULT NOW()
   );
   CREATE INDEX idx_cash_installment_payment ON xa_cash_installment(payment_transaction);
   CREATE TABLE xa_cash_installment_settlement (
    payment_transaction integer PRIMARY KEY REFERENCES xa_payment_transaction(id), tenant integer NOT NULL REFERENCES xa_tenant(id),
    amount_local numeric(12,2) NOT NULL, currency_code varchar(3) NOT NULL, access_action varchar(40) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW()
   );
   CREATE TABLE xa_monthly_license_status_event (
    id bigserial PRIMARY KEY, global_license integer NOT NULL REFERENCES xa_global_license(id),
    previous_status text NOT NULL, new_status text NOT NULL, reason text NOT NULL,
    actor_type text NOT NULL DEFAULT 'SYSTEM' CHECK(actor_type='SYSTEM'), created_at timestamptz NOT NULL DEFAULT NOW()
   );
   CREATE FUNCTION monthly_financial_immutable() RETURNS trigger LANGUAGE plpgsql AS $f$
   BEGIN RAISE EXCEPTION 'Monthly financial history is immutable'; END $f$;
   CREATE TRIGGER monthly_policy_immutable BEFORE UPDATE OR DELETE ON xa_monthly_license_policy FOR EACH ROW EXECUTE FUNCTION monthly_financial_immutable();
   CREATE TRIGGER cash_installment_immutable BEFORE UPDATE OR DELETE ON xa_cash_installment FOR EACH ROW EXECUTE FUNCTION monthly_financial_immutable();
   CREATE TRIGGER cash_settlement_immutable BEFORE UPDATE OR DELETE ON xa_cash_installment_settlement FOR EACH ROW EXECUTE FUNCTION monthly_financial_immutable();
   CREATE TRIGGER monthly_status_immutable BEFORE UPDATE OR DELETE ON xa_monthly_license_status_event FOR EACH ROW EXECUTE FUNCTION monthly_financial_immutable();

   CREATE FUNCTION validate_cash_installment() RETURNS trigger LANGUAGE plpgsql AS $f$
   DECLARE p xa_payment_transaction%ROWTYPE; c xa_billing_cycle%ROWTYPE; tenant_id integer; billing_timezone text; paid numeric;
   BEGIN
    SELECT * INTO p FROM xa_payment_transaction WHERE id=NEW.payment_transaction FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payment missing'; END IF;
    IF p.source_type <> 'CYCLE' OR p.transaction_status NOT IN ('PENDING','PROCESSING','FAILED') THEN RAISE EXCEPTION 'Payment not available for installments'; END IF;
    SELECT * INTO c FROM xa_billing_cycle WHERE id=p.billing_cycle FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Billing cycle missing'; END IF;
    SELECT gl.tenant,COALESCE(NULLIF(t.timezone,''),'UTC') INTO tenant_id,billing_timezone FROM xa_global_license gl JOIN xa_tenant t ON t.id=gl.tenant WHERE gl.id=c.global_license;
    IF NOT EXISTS(SELECT 1 FROM xa_monthly_license_policy WHERE global_license=c.global_license)
     OR NOT EXISTS(SELECT 1 FROM xa_renewal_preparation rp JOIN xa_commercial_transition tr ON tr.global_license=c.global_license
      WHERE rp.billing_cycle=c.id AND c.period_start>=tr.valid_until)
     OR c.period_end<>(((c.period_start AT TIME ZONE billing_timezone)+INTERVAL '1 month') AT TIME ZONE billing_timezone)
     OR NEW.tenant<>tenant_id OR c.total_amount_local<>p.amount_local OR c.total_amount_usd<>p.amount_usd
     OR c.billing_currency_code<>p.currency_code OR c.exchange_rate_used<>p.exchange_rate_used
     OR NEW.currency_code<>p.currency_code OR NEW.received_at>NOW() OR length(trim(NEW.actor_user_guid))=0
     OR c.billing_status NOT IN ('PENDING','PROCESSING','FAILED','OVERDUE') THEN RAISE EXCEPTION 'Invalid installment context'; END IF;
    IF NOT EXISTS(SELECT 1 FROM xa_payment_method m WHERE m.id=p.payment_method AND m.active AND m.method_type='CASH'
      AND (cardinality(m.supported_currencies)=0 OR NEW.currency_code=ANY(m.supported_currencies)))
      OR EXISTS(SELECT 1 FROM xa_cash_receipt WHERE payment_transaction=p.id) THEN RAISE EXCEPTION 'Cash installment conflicts with payment channel'; END IF;
    IF EXISTS(SELECT 1 FROM xa_payment_transaction other WHERE other.billing_cycle=c.id AND other.id<>p.id
     AND (EXISTS(SELECT 1 FROM xa_cash_installment i WHERE i.payment_transaction=other.id) OR EXISTS(SELECT 1 FROM xa_cash_receipt r WHERE r.payment_transaction=other.id))) THEN RAISE EXCEPTION 'Another payment collects this cycle'; END IF;
    SELECT COALESCE(sum(amount_local),0) INTO paid FROM xa_cash_installment WHERE payment_transaction=p.id;
    IF paid+NEW.amount_local>p.amount_local THEN RAISE EXCEPTION 'Installment exceeds outstanding balance'; END IF;
    RETURN NEW;
   END $f$;
   CREATE TRIGGER cash_installment_validate BEFORE INSERT ON xa_cash_installment FOR EACH ROW EXECUTE FUNCTION validate_cash_installment();

   CREATE FUNCTION guard_installment_financial_changes() RETURNS trigger LANGUAGE plpgsql AS $f$
   BEGIN
    IF TG_TABLE_NAME='xa_cash_receipt' THEN
     IF EXISTS(SELECT 1 FROM xa_cash_installment WHERE payment_transaction=NEW.payment_transaction OR payment_transaction IN (SELECT other.id FROM xa_payment_transaction other WHERE other.billing_cycle=(SELECT p.billing_cycle FROM xa_payment_transaction p WHERE p.id=NEW.payment_transaction))) THEN RAISE EXCEPTION 'Use installment settlement for this payment'; END IF;
     RETURN NEW;
    ELSIF TG_TABLE_NAME='xa_payment_transaction' THEN
     IF EXISTS(SELECT 1 FROM xa_cash_installment WHERE payment_transaction=OLD.id) THEN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Payment with receipts cannot be deleted'; END IF;
      IF (NEW.amount_local,NEW.amount_usd,NEW.currency_code,NEW.exchange_rate_used,NEW.billing_cycle,NEW.adjustment,NEW.source_type,NEW.payment_method,NEW.payment_reference)
       IS DISTINCT FROM (OLD.amount_local,OLD.amount_usd,OLD.currency_code,OLD.exchange_rate_used,OLD.billing_cycle,OLD.adjustment,OLD.source_type,OLD.payment_method,OLD.payment_reference)
       THEN RAISE EXCEPTION 'Payment amounts and source are frozen after receipt'; END IF;
      IF NEW.transaction_status NOT IN ('PENDING','PROCESSING','FAILED','COMPLETED') THEN RAISE EXCEPTION 'Refund requires a dedicated correction workflow'; END IF;
      IF NEW.transaction_status='COMPLETED' AND (SELECT COALESCE(sum(amount_local),0) FROM xa_cash_installment WHERE payment_transaction=OLD.id)<>OLD.amount_local THEN RAISE EXCEPTION 'Outstanding balance remains'; END IF;
      IF OLD.transaction_status='COMPLETED' AND NEW.transaction_status<>'COMPLETED' THEN RAISE EXCEPTION 'Settled payment cannot be reopened'; END IF;
     END IF;
    ELSE
     IF EXISTS(SELECT 1 FROM xa_payment_transaction p JOIN xa_cash_installment i ON i.payment_transaction=p.id WHERE p.billing_cycle=OLD.id) THEN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Cycle with receipts cannot be deleted'; END IF;
      IF (to_jsonb(NEW)-ARRAY['billing_status','payment_completed_at','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['billing_status','payment_completed_at','updated_at']) THEN RAISE EXCEPTION 'Cycle is frozen after receipt'; END IF;
      IF NEW.billing_status='COMPLETED' AND NOT EXISTS(SELECT 1 FROM xa_payment_transaction p WHERE p.billing_cycle=OLD.id AND p.transaction_status='COMPLETED'
       AND (SELECT sum(i.amount_local) FROM xa_cash_installment i WHERE i.payment_transaction=p.id)=OLD.total_amount_local) THEN RAISE EXCEPTION 'Cycle balance remains'; END IF;
      IF OLD.billing_status='COMPLETED' AND NEW.billing_status<>'COMPLETED' THEN RAISE EXCEPTION 'Settled cycle cannot be reopened'; END IF;
     END IF;
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
   END $f$;
   CREATE TRIGGER cash_full_receipt_guard BEFORE INSERT ON xa_cash_receipt FOR EACH ROW EXECUTE FUNCTION guard_installment_financial_changes();
   CREATE TRIGGER payment_installment_guard BEFORE UPDATE OR DELETE ON xa_payment_transaction FOR EACH ROW EXECUTE FUNCTION guard_installment_financial_changes();
   CREATE TRIGGER cycle_installment_guard BEFORE UPDATE OR DELETE ON xa_billing_cycle FOR EACH ROW EXECUTE FUNCTION guard_installment_financial_changes();

   CREATE FUNCTION validate_installment_settlement() RETURNS trigger LANGUAGE plpgsql AS $f$
   BEGIN
    IF NOT EXISTS(SELECT 1 FROM xa_payment_transaction p JOIN xa_billing_cycle c ON c.id=p.billing_cycle
     JOIN xa_global_license l ON l.id=c.global_license JOIN xa_paid_seat_grant g ON g.payment_transaction=p.id
     WHERE p.id=NEW.payment_transaction AND p.transaction_status='COMPLETED' AND c.billing_status='COMPLETED'
      AND l.tenant=NEW.tenant AND p.amount_local=NEW.amount_local AND p.currency_code=NEW.currency_code
      AND (SELECT SUM(i.amount_local) FROM xa_cash_installment i WHERE i.payment_transaction=p.id)=p.amount_local)
     OR EXISTS(SELECT 1 FROM xa_cash_receipt r WHERE r.payment_transaction=NEW.payment_transaction)
     THEN RAISE EXCEPTION 'Installment settlement must match confirmed receipts and paid capacity'; END IF;
    IF NEW.access_action NOT IN ('ACTIVE','SCHEDULED','MANUAL_REVIEW','NO_CURRENT_COVERAGE') THEN RAISE EXCEPTION 'Invalid settlement access action'; END IF;
    RETURN NEW;
   END $f$;
   CREATE TRIGGER installment_settlement_validate BEFORE INSERT ON xa_cash_installment_settlement FOR EACH ROW EXECUTE FUNCTION validate_installment_settlement();

   CREATE VIEW xa_confirmed_cash_payment AS
    SELECT payment_transaction,tenant,amount_local,currency_code,access_action FROM xa_cash_receipt
    UNION ALL SELECT payment_transaction,tenant,amount_local,currency_code,access_action FROM xa_cash_installment_settlement;
   CREATE VIEW xa_payment_balance AS
    SELECT p.id,p.guid,p.billing_cycle,p.amount_local AS due_local,p.currency_code,
     CASE WHEN EXISTS(SELECT 1 FROM xa_cash_receipt r WHERE r.payment_transaction=p.id) THEN p.amount_local
      ELSE COALESCE((SELECT SUM(i.amount_local) FROM xa_cash_installment i WHERE i.payment_transaction=p.id),0) END AS received_local,
     p.amount_local-CASE WHEN EXISTS(SELECT 1 FROM xa_cash_receipt r WHERE r.payment_transaction=p.id) THEN p.amount_local
      ELSE COALESCE((SELECT SUM(i.amount_local) FROM xa_cash_installment i WHERE i.payment_transaction=p.id),0) END AS outstanding_local
    FROM xa_payment_transaction p WHERE p.source_type='CYCLE';

   CREATE FUNCTION monthly_license_access(p_license integer,p_at timestamptz DEFAULT NOW())
    RETURNS TABLE(allowed boolean,basis text,access_until timestamptz) LANGUAGE sql STABLE AS $f$
    WITH l AS(SELECT gl.*,pol.grace_days FROM xa_global_license gl JOIN xa_monthly_license_policy pol ON pol.global_license=gl.id WHERE gl.id=p_license),
    paid AS(SELECT MAX(g.valid_until) AS until FROM xa_paid_seat_grant g WHERE g.global_license=p_license AND g.source_type='CYCLE' AND g.valid_from<=p_at AND p_at<g.valid_until),
    offered AS(SELECT MAX(t.valid_until) AS until FROM xa_commercial_transition t WHERE t.global_license=p_license AND t.valid_from<=p_at AND p_at<t.valid_until),
    prior AS(SELECT MAX(d) AS until FROM (
     SELECT valid_until AS d FROM xa_commercial_transition WHERE global_license=p_license AND valid_until<=p_at
     UNION ALL SELECT valid_until FROM xa_paid_seat_grant WHERE global_license=p_license AND source_type='CYCLE' AND valid_until<=p_at) s),
    decision AS(SELECT l.license_status,paid.until AS paid_until,offered.until AS offered_until,
     CASE WHEN prior.until=l.current_period_end AND p_at<prior.until+make_interval(days=>l.grace_days) THEN prior.until+make_interval(days=>l.grace_days) END AS grace_until
     FROM l CROSS JOIN paid CROSS JOIN offered CROSS JOIN prior)
    SELECT license_status IN ('ACTIVE','PENDING_PAYMENT','EXPIRED') AND COALESCE(paid_until,offered_until,grace_until) IS NOT NULL,
     CASE WHEN license_status NOT IN ('ACTIVE','PENDING_PAYMENT','EXPIRED') THEN 'TECHNICAL_RESTRICTION'
      WHEN paid_until IS NOT NULL THEN 'PAID' WHEN offered_until IS NOT NULL THEN 'COMMERCIAL_TRANSITION'
      WHEN grace_until IS NOT NULL THEN 'PAYMENT_GRACE' ELSE 'PAYMENT_REQUIRED' END,
     CASE WHEN license_status IN ('ACTIVE','PENDING_PAYMENT','EXPIRED') THEN COALESCE(paid_until,offered_until,grace_until) END FROM decision;
   $f$;
  `,{transaction});
 });},
 async down(){throw new Error('Monthly financial history requires a forward migration; automatic deletion is forbidden');}
};
