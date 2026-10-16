'use strict';
module.exports={async up(q){await q.sequelize.transaction(async transaction=>{
 await q.sequelize.query(`
 ALTER TABLE public.xa_license_adjustment
  ADD COLUMN IF NOT EXISTS billing_cycle integer REFERENCES public.xa_billing_cycle(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS adjustment_kind varchar(32) NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN IF NOT EXISTS period_start timestamptz,
  ADD COLUMN IF NOT EXISTS period_end timestamptz,
  ADD COLUMN IF NOT EXISTS payment_due_date timestamptz;
 ALTER TABLE public.xa_license_adjustment ADD CONSTRAINT adjustment_cycle_kind CHECK(
  adjustment_kind IN ('LEGACY','USAGE_REGULARIZATION','FUTURE_CAPACITY'));
 ALTER TABLE public.xa_license_adjustment ADD CONSTRAINT adjustment_cycle_fields CHECK(
  (adjustment_kind='LEGACY' AND billing_cycle IS NULL AND period_start IS NULL AND period_end IS NULL AND payment_due_date IS NULL)
  OR (adjustment_kind<>'LEGACY' AND billing_cycle IS NOT NULL AND period_start IS NOT NULL AND period_end IS NOT NULL AND period_end>period_start
    AND payment_due_immediately=false
    AND (adjustment_kind='FUTURE_CAPACITY' OR (invoice_sent_at IS NOT NULL AND payment_due_date IS NOT NULL AND months_remaining=1))));
 CREATE UNIQUE INDEX IF NOT EXISTS uq_adjustment_monthly_regularization
  ON public.xa_license_adjustment(global_license,period_start) WHERE adjustment_kind='USAGE_REGULARIZATION';
 CREATE FUNCTION public.guard_adjustment_cycle_foundation() RETURNS trigger LANGUAGE plpgsql AS $f$
 DECLARE c record; zone text;
 BEGIN
  IF TG_OP='TRUNCATE' THEN
    IF EXISTS(SELECT 1 FROM public.xa_license_adjustment WHERE adjustment_kind<>'LEGACY') THEN
      RAISE EXCEPTION 'Structured adjustments prevent truncation';
    END IF;
    RETURN NULL;
  END IF;
  IF TG_OP='DELETE' THEN
    IF OLD.adjustment_kind<>'LEGACY' THEN RAISE EXCEPTION 'Structured adjustments cannot be deleted'; END IF;
    RETURN OLD;
  END IF;
  IF TG_OP='UPDATE' AND OLD.adjustment_kind<>'LEGACY' AND (
    ROW(NEW.guid,NEW.global_license,NEW.billing_cycle,NEW.adjustment_kind,NEW.period_start,NEW.period_end,NEW.payment_due_date,
      NEW.employees_added_count,NEW.months_remaining,NEW.price_per_employee_usd,NEW.subtotal_usd,NEW.tax_amount_usd,NEW.total_amount_usd,
      NEW.billing_currency_code,NEW.exchange_rate_used,NEW.subtotal_local,NEW.tax_amount_local,NEW.total_amount_local,NEW.tax_rules_applied,
      NEW.adjustment_date,NEW.invoice_sent_at,NEW.payment_due_immediately)
    IS DISTINCT FROM
    ROW(OLD.guid,OLD.global_license,OLD.billing_cycle,OLD.adjustment_kind,OLD.period_start,OLD.period_end,OLD.payment_due_date,
      OLD.employees_added_count,OLD.months_remaining,OLD.price_per_employee_usd,OLD.subtotal_usd,OLD.tax_amount_usd,OLD.total_amount_usd,
      OLD.billing_currency_code,OLD.exchange_rate_used,OLD.subtotal_local,OLD.tax_amount_local,OLD.total_amount_local,OLD.tax_rules_applied,
      OLD.adjustment_date,OLD.invoice_sent_at,OLD.payment_due_immediately)) THEN
    RAISE EXCEPTION 'Issued structured adjustment terms are immutable';
  END IF;
  IF TG_OP='UPDATE' AND OLD.adjustment_kind='LEGACY' AND NEW.adjustment_kind<>'LEGACY' THEN
    RAISE EXCEPTION 'Legacy adjustments require an explicit audited replacement, not reclassification';
  END IF;
  IF NEW.adjustment_kind='LEGACY' THEN RETURN NEW; END IF;
  SELECT bc.*,l.billing_mode AS license_billing_mode,t.timezone INTO c
   FROM public.xa_billing_cycle bc JOIN public.xa_global_license l ON l.id=bc.global_license
   JOIN public.xa_tenant t ON t.id=l.tenant WHERE bc.id=NEW.billing_cycle;
  IF NOT FOUND OR c.global_license<>NEW.global_license OR c.billing_mode<>'PREPAID' OR (TG_OP='INSERT' AND c.license_billing_mode<>'PREPAID') THEN
    RAISE EXCEPTION 'Structured adjustment requires its own prepaid license cycle';
  END IF;
  zone:=COALESCE(NULLIF(c.timezone,''),'UTC');
  IF NEW.period_start<c.period_start OR NEW.period_end>c.period_end THEN RAISE EXCEPTION 'Adjustment outside contract period'; END IF;
  IF NEW.adjustment_kind='USAGE_REGULARIZATION' THEN
    IF TG_OP='INSERT' AND (NEW.invoice_sent_at>CURRENT_TIMESTAMP OR NEW.invoice_sent_at<NEW.period_end) THEN
      RAISE EXCEPTION 'Regularization issuance must occur after cycle closure, without a future timestamp';
    END IF;
    IF NEW.period_end>CURRENT_TIMESTAMP OR NOT EXISTS(
      SELECT 1 FROM generate_series(0,11) AS month_index(n)
       WHERE NEW.period_start=((c.period_start AT TIME ZONE zone)+make_interval(months=>n)) AT TIME ZONE zone
       AND NEW.period_end=((c.period_start AT TIME ZONE zone)+make_interval(months=>n+1)) AT TIME ZONE zone
    ) THEN RAISE EXCEPTION 'Closed anchored monthly cycle required'; END IF;
    IF NEW.payment_due_date IS DISTINCT FROM ((NEW.invoice_sent_at AT TIME ZONE zone)+INTERVAL '7 days') AT TIME ZONE zone THEN
      RAISE EXCEPTION 'Regularization due seven local calendar days after issuance';
    END IF;
  ELSE
    IF TG_OP='INSERT' AND NEW.period_start<CURRENT_TIMESTAMP THEN RAISE EXCEPTION 'Future capacity cannot be backdated'; END IF;
    IF NEW.payment_due_date IS NOT NULL THEN RAISE EXCEPTION 'Optional future capacity must not create a mandatory debt deadline'; END IF;
  END IF;
  RETURN NEW;
 END $f$;
 CREATE TRIGGER adjustment_cycle_foundation_guard BEFORE INSERT OR UPDATE OR DELETE ON public.xa_license_adjustment
  FOR EACH ROW EXECUTE FUNCTION public.guard_adjustment_cycle_foundation();
 CREATE TRIGGER adjustment_cycle_no_truncate BEFORE TRUNCATE ON public.xa_license_adjustment
  FOR EACH STATEMENT EXECUTE FUNCTION public.guard_adjustment_cycle_foundation();
 `,{transaction});
});},async down(){throw new Error('Do not remove financial period metadata; use a reviewed forward migration');}};
