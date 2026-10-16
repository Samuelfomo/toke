'use strict';
module.exports={async up(q){await q.sequelize.transaction(async transaction=>{
 const [rows]=await q.sequelize.query("SELECT pg_get_functiondef('public.validate_license_event()'::regprocedure) AS definition",{transaction});
 const definition=rows[0].definition;if(definition.includes("NEW.event_type='INVOICE_PAYABLE_NORMALIZED'"))return;
 const anchor="IF NEW.event_type='BILLING_MODE_CHANGED' THEN";if(definition.split(anchor).length!==2)throw new Error('LicenseEvent catalog requires review');
 const branch=`IF NEW.event_type='INVOICE_PAYABLE_NORMALIZED' THEN
 IF NOT(NEW.previous_payload ?& ARRAY['billing_cycle_guid','payment_transaction_guid','total_amount_local']) OR NOT(NEW.new_payload ?& ARRAY['billing_cycle_guid','payment_transaction_guid','total_amount_local'])
 OR NEW.previous_payload->>'billing_cycle_guid' IS DISTINCT FROM NEW.new_payload->>'billing_cycle_guid'
 OR NEW.previous_payload->>'payment_transaction_guid' IS DISTINCT FROM NEW.new_payload->>'payment_transaction_guid'
 OR NOT EXISTS(SELECT 1 FROM public.xa_billing_cycle c JOIN public.xa_payment_transaction p ON p.billing_cycle=c.id WHERE c.global_license=NEW.global_license AND c.guid::text=NEW.new_payload->>'billing_cycle_guid' AND p.guid::text=NEW.new_payload->>'payment_transaction_guid' AND c.billing_currency_code='XAF' AND p.currency_code='XAF' AND c.billing_status='PENDING' AND p.transaction_status='PENDING' AND c.total_amount_local=p.amount_local AND c.total_amount_local=(NEW.new_payload->>'total_amount_local')::numeric)
 THEN RAISE EXCEPTION 'Invalid payable normalization event';END IF;
 RETURN NEW;
 END IF;
 `;
 await q.sequelize.query(definition.replace(anchor,branch+anchor),{transaction});
});},async down(){throw new Error('Keep immutable financial audit catalog; use a reviewed forward migration');}};
