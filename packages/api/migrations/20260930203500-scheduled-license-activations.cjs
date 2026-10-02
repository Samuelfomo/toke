'use strict';
module.exports={
 async up(queryInterface){await queryInterface.sequelize.transaction(async transaction=>{
  const run=sql=>queryInterface.sequelize.query(sql,{transaction});
  await run(`CREATE TABLE public.xa_license_cycle_activation (
   id bigserial PRIMARY KEY, global_license integer NOT NULL REFERENCES public.xa_global_license(id),
   billing_cycle integer NOT NULL UNIQUE REFERENCES public.xa_billing_cycle(id),
   payment_transaction integer NOT NULL UNIQUE REFERENCES public.xa_payment_transaction(id),
   activated_at timestamptz NOT NULL DEFAULT NOW(), actor_type text NOT NULL DEFAULT 'SYSTEM' CHECK(actor_type='SYSTEM'),
   previous_license jsonb NOT NULL, new_license jsonb NOT NULL
  )`);
  await run(`CREATE FUNCTION public.guard_license_cycle_activation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
   RAISE EXCEPTION 'License activation history is immutable'; END $$`);
  await run(`CREATE TRIGGER trigger_license_cycle_activation_immutable BEFORE UPDATE OR DELETE ON public.xa_license_cycle_activation FOR EACH ROW EXECUTE FUNCTION public.guard_license_cycle_activation()`);
 });},
 async down(queryInterface){await queryInterface.sequelize.transaction(async transaction=>{
  const [rows]=await queryInterface.sequelize.query('SELECT COUNT(*) AS count FROM public.xa_license_cycle_activation',{transaction});
  if(Number(rows[0].count)>0)throw new Error('Cannot remove populated activation history');
  await queryInterface.sequelize.query('DROP TABLE public.xa_license_cycle_activation',{transaction});
  await queryInterface.sequelize.query('DROP FUNCTION public.guard_license_cycle_activation()',{transaction});
 });}
};
