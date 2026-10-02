'use strict';
module.exports={
 async up(queryInterface){await queryInterface.sequelize.transaction(async transaction=>{
  const run=sql=>queryInterface.sequelize.query(sql,{transaction});
  await run('CREATE SEQUENCE public.xa_renewal_cycle_guid_seq AS integer MINVALUE 100000 MAXVALUE 999999 START 100000 NO CYCLE');
  await run('CREATE SEQUENCE public.xa_renewal_payment_guid_seq AS integer MINVALUE 100000 MAXVALUE 999999 START 100000 NO CYCLE');
  await run(`CREATE TABLE public.xa_renewal_preparation (
   id bigserial PRIMARY KEY, global_license integer NOT NULL REFERENCES public.xa_global_license(id),
   period_start timestamptz NOT NULL, period_end timestamptz NOT NULL CHECK(period_end>period_start),
   billing_cycle integer NOT NULL UNIQUE REFERENCES public.xa_billing_cycle(id),
   payment_transaction integer NOT NULL UNIQUE REFERENCES public.xa_payment_transaction(id),
   payment_method_guid integer NOT NULL, actor_user_guid varchar(128) NOT NULL CHECK(length(trim(actor_user_guid))>0),
   idempotency_key varchar(128) NOT NULL CHECK(length(trim(idempotency_key))>0),
   snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW(),
   UNIQUE(global_license,period_start), UNIQUE(global_license,idempotency_key)
  )`);
  await run(`CREATE FUNCTION public.guard_renewal_preparation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
   RAISE EXCEPTION 'Renewal preparation is immutable'; END $$`);
  await run(`CREATE TRIGGER trigger_renewal_preparation_immutable BEFORE UPDATE OR DELETE ON public.xa_renewal_preparation FOR EACH ROW EXECUTE FUNCTION public.guard_renewal_preparation()`);
 });},
 async down(queryInterface){await queryInterface.sequelize.transaction(async transaction=>{
  const [rows]=await queryInterface.sequelize.query('SELECT COUNT(*) AS count FROM public.xa_renewal_preparation',{transaction});
  if(Number(rows[0].count)>0)throw new Error('Cannot remove populated renewal preparations');
  await queryInterface.sequelize.query('DROP TABLE public.xa_renewal_preparation',{transaction});
  await queryInterface.sequelize.query('DROP SEQUENCE public.xa_renewal_cycle_guid_seq,public.xa_renewal_payment_guid_seq',{transaction});
  await queryInterface.sequelize.query('DROP FUNCTION public.guard_renewal_preparation()',{transaction});
 });}
};
