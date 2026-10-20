'use strict';
// Forward-only amendment. The due date is the immutable date recorded at issuance.
module.exports = {
  async up(q) {
    await q.sequelize.transaction(async transaction => {
      await q.sequelize.query(`
        CREATE OR REPLACE FUNCTION public.monthly_license_access(p_license integer,p_at timestamptz DEFAULT NOW())
        RETURNS TABLE(allowed boolean,basis text,access_until timestamptz)
        LANGUAGE plpgsql STABLE AS $f$
        DECLARE decision record; due_at timestamptz;
        BEGIN
          SELECT * INTO decision FROM public.monthly_license_access_before_426(p_license,p_at);
          IF NOT FOUND THEN RETURN; END IF;
          IF decision.basis IN ('TECHNICAL_RESTRICTION','LICENSE_NOT_FOUND') THEN
            RETURN QUERY SELECT decision.allowed,decision.basis,decision.access_until; RETURN;
          END IF;
          SELECT MIN(a.payment_due_date) INTO due_at
          FROM public.xa_license_adjustment a
          WHERE a.global_license=p_license
            AND a.adjustment_kind='USAGE_REGULARIZATION'
            AND a.invoice_sent_at IS NOT NULL
            AND a.payment_due_date IS NOT NULL
            AND p_at >= a.payment_due_date
            AND (
              a.payment_status::text IS DISTINCT FROM 'COMPLETED'
              OR NOT EXISTS (
                SELECT 1 FROM public.xa_payment_transaction p
                WHERE p.adjustment=a.id
                  AND p.source_type='ADJUSTMENT'
                  AND p.billing_cycle IS NULL
                  AND p.transaction_status::text='COMPLETED'
                  AND p.amount_usd=a.total_amount_usd
                  AND p.amount_local=a.total_amount_local
                  AND p.currency_code=a.billing_currency_code
                  AND p.exchange_rate_used=a.exchange_rate_used
              )
            );
          IF due_at IS NOT NULL THEN
            RETURN QUERY SELECT false,'USAGE_REGULARIZATION_OVERDUE'::text,due_at; RETURN;
          END IF;
          RETURN QUERY SELECT decision.allowed,decision.basis,decision.access_until;
        END $f$;
      `, {transaction});
    });
  },
  async down() {
    throw new Error('Forward-only financial access correction: do not silently revert');
  },
};
