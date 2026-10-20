'use strict';
module.exports={async up(q){await q.sequelize.transaction(async transaction=>{
 const [rows]=await q.sequelize.query("SELECT pg_get_functiondef('public.validate_license_event()'::regprocedure) AS definition",{transaction});
 const source=rows[0].definition,anchor="IF NEW.event_type='BILLING_MODE_CHANGED' THEN";
 if(source.includes("NEW.event_type='USAGE_REGULARIZATION_ISSUED'"))throw new Error('Catalog already changed outside this migration; review before applying');
 if(source.split(anchor).length!==2)throw new Error('License event catalog anchor requires review');
 const branch=`IF NEW.event_type='USAGE_REGULARIZATION_ISSUED' THEN
  IF NEW.previous_payload<>'{}'::jsonb OR NEW.actor_type<>'USER'
   OR NOT(NEW.new_payload ?& ARRAY['adjustment_guid','payment_transaction_guid','billing_cycle_guid','adjustment_kind',
     'period_start','period_end','payment_due_date','total_amount_local','billing_currency_code','payment_status'])
   OR NEW.new_payload->>'adjustment_kind' IS DISTINCT FROM 'USAGE_REGULARIZATION'
   OR NEW.new_payload->>'payment_status' IS DISTINCT FROM 'PENDING'
   OR jsonb_typeof(NEW.metadata->'request') IS DISTINCT FROM 'object'
   OR jsonb_typeof(NEW.metadata->'snapshot') IS DISTINCT FROM 'object'
   OR NEW.metadata->'snapshot'->>'data_completeness' IS DISTINCT FROM 'ADMIN_ATTESTED'
   OR jsonb_typeof(NEW.metadata->'snapshot'->'employees') IS DISTINCT FROM 'array'
   OR COALESCE(length(trim(NEW.metadata->'request'->>'coverage_reference')),0)=0
   OR NEW.metadata->'snapshot'->>'coverage_reference' IS DISTINCT FROM NEW.metadata->'request'->>'coverage_reference'
   OR NOT EXISTS(
    SELECT 1 FROM public.xa_license_adjustment a
    JOIN public.xa_billing_cycle c ON c.id=a.billing_cycle
    JOIN public.xa_global_license l ON l.id=a.global_license
    JOIN public.xa_tenant t ON t.id=l.tenant
    JOIN public.xa_payment_transaction p ON p.adjustment=a.id AND p.source_type='ADJUSTMENT' AND p.billing_cycle IS NULL
    JOIN public.xa_payment_method m ON m.id=p.payment_method
    WHERE a.global_license=NEW.global_license AND l.tenant=NEW.tenant AND c.global_license=l.id
     AND a.adjustment_kind='USAGE_REGULARIZATION' AND a.months_remaining=1
     AND a.guid=(NEW.new_payload->>'adjustment_guid')::integer
     AND p.guid=(NEW.new_payload->>'payment_transaction_guid')::integer
     AND c.guid=(NEW.new_payload->>'billing_cycle_guid')::integer
     AND a.period_start=(NEW.new_payload->>'period_start')::timestamptz
     AND a.period_end=(NEW.new_payload->>'period_end')::timestamptz
     AND a.payment_due_date=(NEW.new_payload->>'payment_due_date')::timestamptz
     AND a.invoice_sent_at=NEW.effective_at AND a.invoice_sent_at=NEW.occurred_at
     AND a.payment_status::text='PENDING' AND p.transaction_status::text='PENDING'
     AND a.total_amount_local=(NEW.new_payload->>'total_amount_local')::numeric
     AND a.billing_currency_code=NEW.new_payload->>'billing_currency_code'
     AND p.amount_local=a.total_amount_local AND p.amount_usd=a.total_amount_usd
     AND p.currency_code=a.billing_currency_code AND p.exchange_rate_used=a.exchange_rate_used
     AND t.guid=(NEW.metadata->'request'->>'tenant_guid')::integer
     AND l.guid=(NEW.metadata->'request'->>'license_guid')::integer
     AND c.guid=(NEW.metadata->'request'->>'billing_cycle_guid')::integer
     AND m.guid=(NEW.metadata->'request'->>'payment_method_guid')::integer
     AND a.employees_added_count=(NEW.metadata->'snapshot'->>'surplus_seats')::integer
     AND (NEW.metadata->'snapshot'->>'billable_employees')::integer-
         (NEW.metadata->'snapshot'->>'paid_seats')::integer=a.employees_added_count
     AND a.period_start=(NEW.metadata->'request'->>'period_start')::timestamptz
     AND a.period_end=(NEW.metadata->'request'->>'period_end')::timestamptz
     AND a.price_per_employee_usd=(NEW.metadata->'snapshot'->>'unit_price_usd')::numeric
     AND a.exchange_rate_used=(NEW.metadata->'snapshot'->>'exchange_rate_used')::numeric
     AND a.billing_currency_code=NEW.metadata->'snapshot'->>'billing_currency_code'
     AND a.subtotal_usd=(NEW.metadata->'snapshot'->>'subtotal_usd')::numeric
     AND a.tax_amount_usd=(NEW.metadata->'snapshot'->>'tax_amount_usd')::numeric
     AND a.total_amount_usd=(NEW.metadata->'snapshot'->>'total_amount_usd')::numeric
     AND a.subtotal_local=(NEW.metadata->'snapshot'->>'subtotal_local')::numeric
     AND a.tax_amount_local=(NEW.metadata->'snapshot'->>'tax_amount_local')::numeric
     AND (SELECT COUNT(*) FROM jsonb_array_elements(NEW.metadata->'snapshot'->'employees') e
          WHERE (e->>'active_days')::integer>0)=(NEW.metadata->'snapshot'->>'billable_employees')::integer
     AND (SELECT COUNT(DISTINCT e->>'employee_license_guid') FROM jsonb_array_elements(NEW.metadata->'snapshot'->'employees') e)
          =jsonb_array_length(NEW.metadata->'snapshot'->'employees')
     AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.metadata->'snapshot'->'employees') e
         WHERE NOT EXISTS(SELECT 1 FROM public.xa_employee_license el WHERE el.global_license=NEW.global_license
           AND el.guid=(e->>'employee_license_guid')::integer))
     AND a.total_amount_local=(NEW.metadata->'snapshot'->>'total_amount_local')::numeric
   ) THEN RAISE EXCEPTION 'Invalid monthly regularization issuance event'; END IF;
  RETURN NEW;
 END IF;
 `;
 await q.sequelize.query(source.replace(anchor,branch+anchor),{transaction});
 await q.sequelize.query(`
 CREATE FUNCTION public.require_regularization_audit() RETURNS trigger LANGUAGE plpgsql AS $f$
 BEGIN
  IF NEW.adjustment_kind='USAGE_REGULARIZATION' AND NOT EXISTS(
    SELECT 1 FROM public.xa_license_event e WHERE e.global_license=NEW.global_license
      AND e.event_type='USAGE_REGULARIZATION_ISSUED' AND e.new_payload->>'adjustment_guid'=NEW.guid::text
  ) THEN RAISE EXCEPTION 'Regularization issuance audit must commit with the invoice'; END IF;
  RETURN NULL;
 END $f$;
 CREATE CONSTRAINT TRIGGER regularization_audit_required AFTER INSERT ON public.xa_license_adjustment
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.require_regularization_audit();
 CREATE FUNCTION public.guard_regularization_payment() RETURNS trigger LANGUAGE plpgsql AS $f$
 DECLARE a record;
 BEGIN
  IF TG_OP='TRUNCATE' THEN
   IF EXISTS(SELECT 1 FROM public.xa_payment_transaction p JOIN public.xa_license_adjustment a ON a.id=p.adjustment
       WHERE a.adjustment_kind='USAGE_REGULARIZATION') THEN RAISE EXCEPTION 'Regularization payments prevent truncation'; END IF;
   RETURN NULL;
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') THEN
   SELECT * INTO a FROM public.xa_license_adjustment WHERE id=OLD.adjustment AND adjustment_kind='USAGE_REGULARIZATION';
   IF FOUND THEN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Regularization payment cannot be deleted'; END IF;
    IF ROW(NEW.guid,NEW.source_type,NEW.billing_cycle,NEW.adjustment,NEW.amount_usd,NEW.amount_local,NEW.currency_code,
        NEW.exchange_rate_used,NEW.payment_method,NEW.payment_reference,NEW.initiated_at)
      IS DISTINCT FROM ROW(OLD.guid,OLD.source_type,OLD.billing_cycle,OLD.adjustment,OLD.amount_usd,OLD.amount_local,OLD.currency_code,
        OLD.exchange_rate_used,OLD.payment_method,OLD.payment_reference,OLD.initiated_at)
      THEN RAISE EXCEPTION 'Issued regularization payment terms are immutable'; END IF;
    IF OLD.transaction_status::text='COMPLETED' AND NEW.transaction_status IS DISTINCT FROM OLD.transaction_status THEN
      RAISE EXCEPTION 'Settled regularization requires a compensating audited operation';
    END IF;
   END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  SELECT * INTO a FROM public.xa_license_adjustment WHERE id=NEW.adjustment AND adjustment_kind='USAGE_REGULARIZATION';
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF NEW.source_type<>'ADJUSTMENT' OR NEW.billing_cycle IS NOT NULL OR NEW.amount_usd<>a.total_amount_usd
    OR NEW.amount_local<>a.total_amount_local OR NEW.currency_code<>a.billing_currency_code OR NEW.exchange_rate_used<>a.exchange_rate_used
    THEN RAISE EXCEPTION 'Regularization payment must match its invoice'; END IF;
  IF NEW.transaction_status::text IN ('CANCELLED','REFUNDED') THEN RAISE EXCEPTION 'Use a compensating audited operation'; END IF;
  IF NEW.transaction_status::text='COMPLETED' AND NOT EXISTS(
   SELECT 1 FROM public.xa_cash_receipt r JOIN public.xa_payment_method m ON m.id=NEW.payment_method
   WHERE r.payment_transaction=NEW.id AND r.tenant=(SELECT tenant FROM public.xa_global_license WHERE id=a.global_license)
    AND r.amount_local=NEW.amount_local AND r.currency_code=NEW.currency_code AND m.method_type='CASH'
    AND r.access_action='DEBT_SETTLED_NO_NEW_RIGHTS') THEN
      RAISE EXCEPTION 'Dedicated regularization settlement proof required';
  END IF;
  RETURN NEW;
 END $f$;
 CREATE TRIGGER regularization_payment_guard BEFORE INSERT OR UPDATE OR DELETE ON public.xa_payment_transaction
  FOR EACH ROW EXECUTE FUNCTION public.guard_regularization_payment();
 CREATE TRIGGER regularization_payment_no_truncate BEFORE TRUNCATE ON public.xa_payment_transaction
  FOR EACH STATEMENT EXECUTE FUNCTION public.guard_regularization_payment();
 CREATE FUNCTION public.guard_regularization_status() RETURNS trigger LANGUAGE plpgsql AS $f$
 BEGIN
  IF NEW.adjustment_kind<>'USAGE_REGULARIZATION' THEN RETURN NEW; END IF;
  IF NEW.payment_status::text IN ('CANCELLED','REFUNDED') THEN RAISE EXCEPTION 'Use a compensating audited operation'; END IF;
  IF NEW.payment_status::text='COMPLETED' AND NOT EXISTS(
    SELECT 1 FROM public.xa_payment_transaction p WHERE p.adjustment=NEW.id AND p.source_type='ADJUSTMENT'
      AND p.transaction_status::text='COMPLETED' AND p.amount_local=NEW.total_amount_local AND p.amount_usd=NEW.total_amount_usd)
    THEN RAISE EXCEPTION 'Regularization is not financially settled'; END IF;
  IF TG_OP='UPDATE' AND OLD.payment_status::text='COMPLETED' AND NEW.payment_status IS DISTINCT FROM OLD.payment_status
    THEN RAISE EXCEPTION 'Settled regularization cannot be reopened'; END IF;
  RETURN NEW;
 END $f$;
 CREATE TRIGGER regularization_status_guard BEFORE INSERT OR UPDATE ON public.xa_license_adjustment
  FOR EACH ROW EXECUTE FUNCTION public.guard_regularization_status();
 CREATE FUNCTION public.prevent_consumed_month_grant() RETURNS trigger LANGUAGE plpgsql AS $f$
 BEGIN
  IF EXISTS(SELECT 1 FROM public.xa_license_adjustment WHERE id=NEW.adjustment AND adjustment_kind='USAGE_REGULARIZATION')
   OR EXISTS(SELECT 1 FROM public.xa_payment_transaction p JOIN public.xa_license_adjustment a ON a.id=p.adjustment
       WHERE p.id=NEW.payment_transaction AND a.adjustment_kind='USAGE_REGULARIZATION')
   THEN RAISE EXCEPTION 'Consumed-month regularization cannot create future seat rights'; END IF;
  RETURN NEW;
 END $f$;
 CREATE TRIGGER consumed_month_no_grant BEFORE INSERT OR UPDATE ON public.xa_paid_seat_grant
  FOR EACH ROW EXECUTE FUNCTION public.prevent_consumed_month_grant();
 `,{transaction});
});},async down(){throw new Error('Do not remove issued debt audit or settlement protections; use a forward migration');}};
