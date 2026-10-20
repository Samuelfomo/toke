'use strict';
module.exports={async up(q){await q.sequelize.transaction(async transaction=>{
 const [rows]=await q.sequelize.query("SELECT pg_get_functiondef('public.validate_license_event()'::regprocedure) AS definition",{transaction});
 const source=rows[0].definition,anchor="IF NEW.event_type='BILLING_MODE_CHANGED' THEN";
 if(source.includes("NEW.event_type='USAGE_REGULARIZATION_SETTLED'"))throw new Error('Settlement catalog already present; review migration history');
 if(!source.includes("NEW.event_type='USAGE_REGULARIZATION_ISSUED'") || source.split(anchor).length!==2)
  throw new Error('Lot 42.4 catalog required');
 const branch=`IF NEW.event_type='USAGE_REGULARIZATION_SETTLED' THEN
  IF NEW.actor_type<>'USER'
   OR NOT(NEW.previous_payload ?& ARRAY['payment_status','transaction_status'])
   OR NEW.previous_payload->>'payment_status' NOT IN ('PENDING','PROCESSING','FAILED','OVERDUE')
   OR NEW.previous_payload->>'transaction_status' NOT IN ('PENDING','PROCESSING','FAILED')
   OR NOT(NEW.new_payload ?& ARRAY['adjustment_guid','payment_transaction_guid','payment_status','transaction_status',
     'amount_local','currency_code','receipt_reference','received_at','access_action'])
   OR NEW.new_payload->>'payment_status' IS DISTINCT FROM 'COMPLETED'
   OR NEW.new_payload->>'transaction_status' IS DISTINCT FROM 'COMPLETED'
   OR NEW.new_payload->>'access_action' IS DISTINCT FROM 'DEBT_SETTLED_NO_NEW_RIGHTS'
   OR NOT EXISTS(
    SELECT 1 FROM public.xa_license_adjustment a
    JOIN public.xa_global_license l ON l.id=a.global_license
    JOIN public.xa_payment_transaction p ON p.adjustment=a.id
    JOIN public.xa_cash_receipt r ON r.payment_transaction=p.id
    JOIN public.xa_payment_method m ON m.id=p.payment_method
    WHERE a.global_license=NEW.global_license AND l.tenant=NEW.tenant AND r.tenant=NEW.tenant
     AND a.adjustment_kind='USAGE_REGULARIZATION'
     AND a.guid=(NEW.new_payload->>'adjustment_guid')::integer
     AND p.guid=(NEW.new_payload->>'payment_transaction_guid')::integer
     AND p.source_type='ADJUSTMENT' AND p.billing_cycle IS NULL AND m.method_type='CASH' AND m.active
     AND p.currency_code=ANY(m.supported_currencies)
     AND p.transaction_status::text='COMPLETED' AND a.payment_status::text='COMPLETED'
     AND p.amount_local=a.total_amount_local AND p.amount_usd=a.total_amount_usd
     AND r.amount_local=p.amount_local AND r.currency_code=p.currency_code
     AND r.amount_local=(NEW.new_payload->>'amount_local')::numeric
     AND r.currency_code=NEW.new_payload->>'currency_code'
     AND r.receipt_reference=NEW.new_payload->>'receipt_reference'
     AND r.received_at=(NEW.new_payload->>'received_at')::timestamptz
     AND r.idempotency_key=NEW.operation_key AND r.actor_user_guid=NEW.actor_user_guid
     AND r.access_action='DEBT_SETTLED_NO_NEW_RIGHTS'
     AND p.completed_at=r.confirmed_at AND a.payment_completed_at=r.confirmed_at
     AND NEW.effective_at=r.confirmed_at
   ) THEN RAISE EXCEPTION 'Invalid regularization settlement event'; END IF;
  RETURN NEW;
 END IF;
 `;
 await q.sequelize.query(source.replace(anchor,branch+anchor),{transaction});
 await q.sequelize.query(`
 CREATE FUNCTION public.require_regularization_settlement_audit() RETURNS trigger LANGUAGE plpgsql AS $f$
 BEGIN
  IF EXISTS(SELECT 1 FROM public.xa_payment_transaction p
    JOIN public.xa_license_adjustment a ON a.id=p.adjustment
    WHERE p.id=NEW.payment_transaction AND a.adjustment_kind='USAGE_REGULARIZATION')
   AND NOT EXISTS(
    SELECT 1 FROM public.xa_payment_transaction p
    JOIN public.xa_license_adjustment a ON a.id=p.adjustment
    JOIN public.xa_global_license l ON l.id=a.global_license
    JOIN public.xa_license_event e ON e.global_license=l.id AND e.event_type='USAGE_REGULARIZATION_SETTLED'
    WHERE p.id=NEW.payment_transaction AND p.source_type='ADJUSTMENT'
     AND p.transaction_status::text='COMPLETED' AND a.payment_status::text='COMPLETED'
     AND e.new_payload->>'payment_transaction_guid'=p.guid::text
     AND e.operation_key=NEW.idempotency_key AND e.actor_user_guid=NEW.actor_user_guid
     AND NEW.tenant=l.tenant AND NEW.amount_local=p.amount_local AND NEW.currency_code=p.currency_code
     AND NEW.access_action='DEBT_SETTLED_NO_NEW_RIGHTS'
   ) THEN RAISE EXCEPTION 'Receipt, settlement and audit must commit together'; END IF;
  RETURN NULL;
 END $f$;
 CREATE CONSTRAINT TRIGGER regularization_settlement_audit_required AFTER INSERT ON public.xa_cash_receipt
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.require_regularization_settlement_audit();
 `,{transaction});
});},async down(){throw new Error('Settlements are immutable; use a forward migration');}};
