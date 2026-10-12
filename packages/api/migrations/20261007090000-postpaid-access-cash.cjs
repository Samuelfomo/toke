'use strict';
module.exports={async up(q){await q.sequelize.transaction(async transaction=>{
 await q.sequelize.query(`
 ALTER FUNCTION public.monthly_license_access(integer,timestamptz) RENAME TO prepaid_monthly_license_access;
 CREATE FUNCTION public.monthly_license_access(p_license integer,p_at timestamptz DEFAULT NOW())
 RETURNS TABLE(allowed boolean,basis text,access_until timestamptz) LANGUAGE plpgsql STABLE AS $f$
 DECLARE l public.xa_global_license%ROWTYPE; grace integer; debt_until timestamptz; closure_until timestamptz;
 BEGIN
  SELECT * INTO l FROM public.xa_global_license WHERE id=p_license;
  IF NOT FOUND THEN RETURN QUERY SELECT false,'LICENSE_NOT_FOUND'::text,NULL::timestamptz; RETURN; END IF;
  IF l.billing_mode='PREPAID' OR (l.postpaid_from IS NOT NULL AND p_at<l.postpaid_from) THEN
   RETURN QUERY SELECT * FROM public.prepaid_monthly_license_access(p_license,p_at); RETURN;
  END IF;
  IF l.license_status NOT IN ('ACTIVE','PENDING_PAYMENT','EXPIRED') THEN
   RETURN QUERY SELECT false,'TECHNICAL_RESTRICTION'::text,NULL::timestamptz; RETURN;
  END IF;
  SELECT grace_days INTO grace FROM public.xa_monthly_license_policy WHERE global_license=p_license;
  IF grace IS NULL OR l.postpaid_from IS NULL OR l.billing_cycle_months<>1 THEN
   RETURN QUERY SELECT false,'POSTPAID_POLICY_REQUIRED'::text,NULL::timestamptz; RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM public.xa_billing_cycle c WHERE c.global_license=p_license AND c.billing_mode='POSTPAID'
    AND c.billing_status<>'COMPLETED' AND c.billing_status NOT IN ('PENDING','PROCESSING','FAILED','OVERDUE')) THEN
   RETURN QUERY SELECT false,'POSTPAID_BILLING_REVIEW'::text,NULL::timestamptz; RETURN;
  END IF;
  SELECT MIN(c.payment_due_date+make_interval(days=>grace)) INTO debt_until
   FROM public.xa_billing_cycle c WHERE c.global_license=p_license AND c.billing_mode='POSTPAID'
   AND c.billing_status IN ('PENDING','PROCESSING','FAILED','OVERDUE');
  -- Missing closure is a data review, never an invented debt or unlimited free access.
  SELECT MAX(r.period_end) INTO closure_until FROM public.xa_renewal_preparation r
   WHERE r.global_license=p_license AND r.snapshot->>'operation'='POSTPAID_MONTH_CLOSURE';
  SELECT (((COALESCE(closure_until,l.postpaid_from) AT TIME ZONE COALESCE(NULLIF(t.timezone,''),'UTC'))
    +INTERVAL '1 month') AT TIME ZONE COALESCE(NULLIF(t.timezone,''),'UTC'))+make_interval(days=>grace)
   INTO closure_until FROM public.xa_tenant t WHERE t.id=l.tenant;
  IF closure_until IS NULL THEN RETURN QUERY SELECT false,'POSTPAID_POLICY_REQUIRED'::text,NULL::timestamptz; RETURN; END IF;
  IF debt_until IS NOT NULL AND p_at>=debt_until THEN
   RETURN QUERY SELECT false,'POSTPAID_ARREARS'::text,debt_until; RETURN;
  END IF;
  IF p_at>=closure_until THEN
   RETURN QUERY SELECT false,'POSTPAID_CLOSURE_REQUIRED'::text,closure_until; RETURN;
  END IF;
  RETURN QUERY SELECT true,CASE WHEN debt_until IS NOT NULL THEN 'POSTPAID_PAYMENT_GRACE' ELSE 'POSTPAID_CONTRACT' END,
   LEAST(closure_until,COALESCE(debt_until,closure_until));
 END $f$;

 -- Keep existing triggers; their functions dispatch to preserved prepaid validators.
 CREATE FUNCTION public.validate_postpaid_cash_installment(NEW public.xa_cash_installment) RETURNS void LANGUAGE plpgsql AS $f$
 DECLARE p public.xa_payment_transaction%ROWTYPE; c public.xa_billing_cycle%ROWTYPE; l public.xa_global_license%ROWTYPE; paid numeric;
 BEGIN
  SELECT * INTO c FROM public.xa_billing_cycle WHERE id=(SELECT billing_cycle FROM public.xa_payment_transaction WHERE id=NEW.payment_transaction);
  IF c.billing_mode IS DISTINCT FROM 'POSTPAID' THEN RAISE EXCEPTION 'Prepaid trigger dispatch misconfigured'; END IF;
  SELECT * INTO l FROM public.xa_global_license WHERE id=c.global_license FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'License missing'; END IF;
  SELECT * INTO c FROM public.xa_billing_cycle WHERE id=c.id FOR UPDATE;
  SELECT * INTO p FROM public.xa_payment_transaction WHERE id=NEW.payment_transaction FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment missing'; END IF;
  IF p.source_type IS DISTINCT FROM 'CYCLE' OR p.transaction_status NOT IN ('PENDING','PROCESSING','FAILED')
   OR c.billing_status NOT IN ('PENDING','PROCESSING','FAILED','OVERDUE') OR NEW.tenant<>l.tenant
   OR NEW.currency_code<>p.currency_code OR p.currency_code<>c.billing_currency_code
   OR p.amount_local<>c.total_amount_local OR p.amount_usd<>c.total_amount_usd OR p.exchange_rate_used<>c.exchange_rate_used
   OR c.period_end>NOW() OR NEW.received_at>NOW() OR NEW.amount_local<=0 OR length(trim(NEW.actor_user_guid))=0
   OR NOT EXISTS(SELECT 1 FROM public.xa_renewal_preparation r WHERE r.billing_cycle=c.id AND r.payment_transaction=p.id AND r.snapshot->>'operation'='POSTPAID_MONTH_CLOSURE')
   OR NOT EXISTS(SELECT 1 FROM public.xa_payment_method m WHERE m.id=p.payment_method AND m.active AND m.method_type='CASH' AND NEW.currency_code=ANY(m.supported_currencies))
   OR EXISTS(SELECT 1 FROM public.xa_cash_receipt WHERE payment_transaction=p.id)
   OR EXISTS(SELECT 1 FROM public.xa_payment_transaction other WHERE other.billing_cycle=c.id AND other.id<>p.id
     AND (EXISTS(SELECT 1 FROM public.xa_cash_installment i WHERE i.payment_transaction=other.id) OR EXISTS(SELECT 1 FROM public.xa_cash_receipt r WHERE r.payment_transaction=other.id)))
   THEN RAISE EXCEPTION 'Invalid postpaid cash installment'; END IF;
  SELECT COALESCE(SUM(amount_local),0) INTO paid FROM public.xa_cash_installment WHERE payment_transaction=p.id;
  IF paid+NEW.amount_local>p.amount_local THEN RAISE EXCEPTION 'Installment exceeds outstanding balance'; END IF;
  RETURN;
 END $f$;
 DO $wrap$
 DECLARE definition text;
 BEGIN
  definition:=pg_get_functiondef('public.validate_cash_installment()'::regprocedure);
  IF position('BEGIN' IN definition)=0 THEN RAISE EXCEPTION 'Installment validator requires review'; END IF;
  definition:=regexp_replace(definition,'BEGIN',
   'BEGIN
 IF EXISTS(SELECT 1 FROM public.xa_payment_transaction p JOIN public.xa_billing_cycle c ON c.id=p.billing_cycle WHERE p.id=NEW.payment_transaction AND c.billing_mode=''POSTPAID'') THEN
 PERFORM public.validate_postpaid_cash_installment(NEW); RETURN NEW; END IF;', '');
  EXECUTE definition;
 END $wrap$;
 CREATE FUNCTION public.validate_postpaid_cash_settlement(NEW public.xa_cash_installment_settlement) RETURNS void LANGUAGE plpgsql AS $f$
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.xa_payment_transaction p JOIN public.xa_billing_cycle c ON c.id=p.billing_cycle
   JOIN public.xa_global_license l ON l.id=c.global_license WHERE p.id=NEW.payment_transaction AND c.billing_mode='POSTPAID'
   AND p.transaction_status='COMPLETED' AND c.billing_status='COMPLETED' AND l.tenant=NEW.tenant
   AND p.amount_local=NEW.amount_local AND p.currency_code=NEW.currency_code
   AND (SELECT SUM(i.amount_local) FROM public.xa_cash_installment i WHERE i.payment_transaction=p.id)=p.amount_local)
   OR NEW.access_action NOT IN ('ACTIVE','MANUAL_REVIEW','NO_CURRENT_COVERAGE')
   OR EXISTS(SELECT 1 FROM public.xa_paid_seat_grant g WHERE g.payment_transaction=NEW.payment_transaction)
   THEN RAISE EXCEPTION 'Invalid postpaid settlement'; END IF;
 END $f$;
 DO $wrap$
 DECLARE definition text;
 BEGIN
  definition:=pg_get_functiondef('public.validate_installment_settlement()'::regprocedure);
  IF position('BEGIN' IN definition)=0 THEN RAISE EXCEPTION 'Settlement validator requires review'; END IF;
  definition:=regexp_replace(definition,'BEGIN',
   'BEGIN
 IF EXISTS(SELECT 1 FROM public.xa_payment_transaction p JOIN public.xa_billing_cycle c ON c.id=p.billing_cycle WHERE p.id=NEW.payment_transaction AND c.billing_mode=''POSTPAID'') THEN
 PERFORM public.validate_postpaid_cash_settlement(NEW); RETURN NEW; END IF;', '');
  EXECUTE definition;
 END $wrap$;
 `,{transaction});
 });},async down(){throw new Error('Use a reviewed forward migration');}};