'use strict';
module.exports={async up(q){await q.sequelize.transaction(async transaction=>{
 const [rows]=await q.sequelize.query("SELECT pg_get_functiondef('public.validate_license_event()'::regprocedure) AS definition",{transaction});
 let definition=rows[0].definition;
 if(definition.includes("NEW.event_type='LICENSE_CREATED'"))return;
 const anchor="IF NEW.event_type='BILLING_MODE_CHANGED' THEN";
 if(definition.split(anchor).length!==2)throw new Error('LicenseEvent validator anchor requires review');
 const branch=`IF NEW.event_type='LICENSE_CREATED' THEN
  IF NEW.previous_payload <> '{}'::jsonb
   OR NOT (NEW.new_payload ?& ARRAY['license_guid','billing_cycle_guid','payment_transaction_guid','billing_mode','license_status'])
   OR NEW.new_payload->>'billing_mode' IS DISTINCT FROM 'PREPAID'
   OR NEW.new_payload->>'license_status' IS DISTINCT FROM 'PENDING_PAYMENT'
   OR jsonb_typeof(NEW.metadata->'request') IS DISTINCT FROM 'object'
   OR jsonb_typeof(NEW.metadata->'snapshot') IS DISTINCT FROM 'object'
   OR NOT EXISTS(SELECT 1 FROM public.xa_global_license l
    JOIN public.xa_billing_cycle c ON c.global_license=l.id
    JOIN public.xa_payment_transaction p ON p.billing_cycle=c.id AND p.source_type='CYCLE'
    WHERE l.id=NEW.global_license AND l.tenant=NEW.tenant
     AND l.guid=(NEW.new_payload->>'license_guid')::integer
     AND c.guid=(NEW.new_payload->>'billing_cycle_guid')::integer
     AND p.guid=(NEW.new_payload->>'payment_transaction_guid')::integer)
   THEN RAISE EXCEPTION 'Invalid initial subscription event'; END IF;
  RETURN NEW;
 END IF;
 `;
 await q.sequelize.query(definition.replace(anchor,branch+anchor),{transaction});
});},async down(){throw new Error('Audit catalog requires a reviewed forward migration');}};
