'use strict';
// Forward-only amendment to lot 42.6: avoid rewriting a migration already applied.
module.exports = { async up(q) { await q.sequelize.transaction(async transaction => {
await q.sequelize.query(`
        CREATE OR REPLACE FUNCTION public.monthly_license_access(p_license integer,p_at timestamptz DEFAULT NOW())
        RETURNS TABLE(allowed boolean,basis text,access_until timestamptz)
        LANGUAGE plpgsql STABLE AS $f$
        DECLARE decision record; due_at timestamptz;
        BEGIN
          -- An unpaid, issued regularization takes precedence over financial access grants,
          -- but never masks a technical suspension or tenant restriction.
          SELECT * INTO decision FROM public.monthly_license_access_before_426(p_license,p_at);
          IF NOT FOUND THEN RETURN; END IF;
          IF decision.basis='TECHNICAL_RESTRICTION' OR decision.basis='LICENSE_NOT_FOUND' THEN
            RETURN QUERY SELECT decision.allowed,decision.basis,decision.access_until; RETURN;
          END IF;
          SELECT MIN(a.payment_due_date) INTO due_at
          FROM public.xa_license_adjustment a
          WHERE a.global_license=p_license AND a.adjustment_kind='USAGE_REGULARIZATION'
            AND a.invoice_sent_at IS NOT NULL AND a.payment_due_date IS NOT NULL
            AND a.payment_due_date<=p_at AND (a.payment_status::text IS DISTINCT FROM 'COMPLETED'
              OR NOT EXISTS (SELECT 1 FROM public.xa_payment_transaction p
                WHERE p.adjustment=a.id AND p.source_type='ADJUSTMENT' AND p.billing_cycle IS NULL
                  AND p.transaction_status::text='COMPLETED')); 
          IF due_at IS NOT NULL THEN
            RETURN QUERY SELECT false,'USAGE_REGULARIZATION_OVERDUE'::text,due_at; RETURN;
          END IF;
          RETURN QUERY SELECT decision.allowed,decision.basis,decision.access_until;
        END $f$;
`,{transaction});
}); }, async down() { throw new Error('Forward migration required; preserve financial access history'); } };
