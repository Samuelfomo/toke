'use strict';
module.exports={
 async up(q){await q.sequelize.transaction(async transaction=>{
  await q.sequelize.query(`
   CREATE FUNCTION public.guard_postpaid_financial_snapshot() RETURNS trigger LANGUAGE plpgsql AS $f$
   DECLARE frozen boolean;
   BEGIN
    IF TG_TABLE_NAME='xa_billing_cycle' THEN
     frozen:=OLD.billing_mode='POSTPAID';
     IF frozen THEN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Postpaid invoice history cannot be deleted'; END IF;
      IF (to_jsonb(NEW)-ARRAY['billing_status','payment_completed_at','updated_at'])
       IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['billing_status','payment_completed_at','updated_at'])
       THEN RAISE EXCEPTION 'Postpaid invoice snapshot is immutable; use a reviewed correction workflow'; END IF;
     END IF;
    ELSE
     SELECT EXISTS(SELECT 1 FROM public.xa_billing_cycle c WHERE c.id=OLD.billing_cycle AND c.billing_mode='POSTPAID') INTO frozen;
     IF frozen THEN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Postpaid payment history cannot be deleted'; END IF;
      IF (to_jsonb(NEW)-ARRAY['transaction_status','completed_at','failed_at','failure_reason','updated_at'])
       IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['transaction_status','completed_at','failed_at','failure_reason','updated_at'])
       THEN RAISE EXCEPTION 'Postpaid payment amount and source are immutable'; END IF;
     END IF;
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
   END $f$;
   CREATE TRIGGER postpaid_cycle_snapshot_immutable BEFORE UPDATE OR DELETE ON public.xa_billing_cycle
    FOR EACH ROW EXECUTE FUNCTION public.guard_postpaid_financial_snapshot();
   CREATE TRIGGER postpaid_payment_snapshot_immutable BEFORE UPDATE OR DELETE ON public.xa_payment_transaction
    FOR EACH ROW EXECUTE FUNCTION public.guard_postpaid_financial_snapshot();
  `,{transaction});
 });},
 async down(){throw new Error('Financial history requires a reviewed forward migration');}
};
