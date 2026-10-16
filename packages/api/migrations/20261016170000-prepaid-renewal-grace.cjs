'use strict';
module.exports = {
 async up(q) {
  await q.sequelize.transaction(async transaction => {
   await q.sequelize.query(`
    ALTER FUNCTION public.prepaid_monthly_license_access(integer,timestamptz)
      RENAME TO prepaid_monthly_license_access_before_lot42;
    CREATE FUNCTION public.prepaid_monthly_license_access(p_license integer,p_at timestamptz DEFAULT NOW())
    RETURNS TABLE(allowed boolean,basis text,access_until timestamptz)
    LANGUAGE plpgsql STABLE AS $f$
    DECLARE l record; old_decision record; until_paid timestamptz; until_offer timestamptz; until_grace timestamptz;
    BEGIN
      SELECT gl.*,t.timezone,t.status AS tenant_status INTO l
      FROM public.xa_global_license gl JOIN public.xa_tenant t ON t.id=gl.tenant WHERE gl.id=p_license;
      IF NOT FOUND THEN RETURN; END IF;
      IF l.tenant_status::text<>'ACTIVE' OR l.license_status::text NOT IN ('ACTIVE','PENDING_PAYMENT','EXPIRED') THEN
        RETURN QUERY SELECT false,'TECHNICAL_RESTRICTION'::text,NULL::timestamptz; RETURN;
      END IF;
      SELECT * INTO old_decision FROM public.prepaid_monthly_license_access_before_lot42(p_license,p_at);
      -- La grâce de renouvellement est fixée à sept jours, même si une ancienne politique avait une autre valeur.
      IF old_decision.allowed IS TRUE AND old_decision.basis<>'PAYMENT_GRACE' THEN
        RETURN QUERY SELECT old_decision.allowed,old_decision.basis,old_decision.access_until; RETURN;
      END IF;
      SELECT MAX(g.valid_until) INTO until_paid
      FROM public.xa_paid_seat_grant g JOIN public.xa_billing_cycle c ON c.id=g.billing_cycle
      JOIN public.xa_payment_transaction p ON p.id=g.payment_transaction
      WHERE g.global_license=p_license AND g.source_type='CYCLE' AND g.valid_from<=p_at AND p_at<g.valid_until
        AND c.global_license=p_license AND c.billing_status::text='COMPLETED'
        AND p.billing_cycle=c.id AND p.source_type='CYCLE' AND p.transaction_status::text='COMPLETED';
      SELECT MAX(tr.valid_until) INTO until_offer FROM public.xa_commercial_transition tr
      WHERE tr.global_license=p_license AND tr.valid_from<=p_at AND p_at<tr.valid_until;
      IF until_paid IS NOT NULL OR until_offer IS NOT NULL THEN
        RETURN QUERY SELECT true,CASE WHEN until_paid IS NOT NULL THEN 'PAID'::text ELSE 'COMMERCIAL_TRANSITION'::text END,
          COALESCE(until_paid,until_offer); RETURN;
      END IF;
      IF p_at>=l.current_period_end AND (
        EXISTS(SELECT 1 FROM public.xa_paid_seat_grant g JOIN public.xa_billing_cycle c ON c.id=g.billing_cycle
          JOIN public.xa_payment_transaction p ON p.id=g.payment_transaction
          WHERE g.global_license=p_license AND g.source_type='CYCLE' AND g.valid_until=l.current_period_end
            AND c.global_license=p_license AND c.billing_status::text='COMPLETED'
            AND p.billing_cycle=c.id AND p.source_type='CYCLE' AND p.transaction_status::text='COMPLETED')
        OR EXISTS(SELECT 1 FROM public.xa_commercial_transition tr WHERE tr.global_license=p_license AND tr.valid_until=l.current_period_end)
      ) THEN
        until_grace:=((l.current_period_end AT TIME ZONE COALESCE(NULLIF(l.timezone,''),'UTC'))+INTERVAL '7 days') AT TIME ZONE COALESCE(NULLIF(l.timezone,''),'UTC');
        IF p_at<until_grace THEN
          RETURN QUERY SELECT true,'PAYMENT_GRACE'::text,until_grace; RETURN;
        END IF;
      END IF;
      RETURN QUERY SELECT false,'PAYMENT_REQUIRED'::text,NULL::timestamptz;
    END $f$;
   `, {transaction});
  });
 },
 async down() { throw new Error('Forward migration required: do not silently restore old commercial grace rules'); }
};
