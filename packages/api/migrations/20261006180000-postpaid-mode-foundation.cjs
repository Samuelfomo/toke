'use strict';
module.exports={
 async up(q){await q.sequelize.transaction(async transaction=>{
  await q.sequelize.query(`
   ALTER TABLE public.xa_global_license
    ADD COLUMN billing_mode varchar(8) NOT NULL DEFAULT 'PREPAID',
    ADD COLUMN postpaid_from timestamptz;
   ALTER TABLE public.xa_global_license ADD CONSTRAINT license_billing_mode_consistent CHECK (
    (billing_mode='PREPAID' AND postpaid_from IS NULL) OR
    (billing_mode='POSTPAID' AND postpaid_from IS NOT NULL AND billing_cycle_months=1));
   ALTER TABLE public.xa_billing_cycle ADD COLUMN billing_mode varchar(8) NOT NULL DEFAULT 'PREPAID';
   ALTER TABLE public.xa_billing_cycle ADD CONSTRAINT cycle_billing_mode_valid CHECK (billing_mode IN ('PREPAID','POSTPAID'));
   CREATE FUNCTION public.guard_cycle_billing_mode() RETURNS trigger LANGUAGE plpgsql AS $f$
   BEGIN
    IF NEW.billing_mode IS DISTINCT FROM OLD.billing_mode THEN
     RAISE EXCEPTION 'Billing cycle mode is immutable; use a reviewed correction workflow';
    END IF;
    RETURN NEW;
   END $f$;
   CREATE TRIGGER cycle_billing_mode_immutable BEFORE UPDATE ON public.xa_billing_cycle
    FOR EACH ROW EXECUTE FUNCTION public.guard_cycle_billing_mode();
  `,{transaction});
 });},
 async down(){throw new Error('Billing history requires a reviewed forward migration; automatic deletion is forbidden');}
};
