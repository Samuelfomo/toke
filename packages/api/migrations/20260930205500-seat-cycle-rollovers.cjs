'use strict';
module.exports={
 async up(queryInterface){await queryInterface.sequelize.transaction(async transaction=>{
  const run=sql=>queryInterface.sequelize.query(sql,{transaction});
  await run(`ALTER TABLE public.xa_seat_assignment
   ALTER COLUMN assigned_by_user_guid DROP NOT NULL,
   ADD COLUMN assignment_origin text NOT NULL DEFAULT 'USER' CHECK(assignment_origin IN ('USER','SYSTEM')),
   ADD COLUMN previous_assignment bigint REFERENCES public.xa_seat_assignment(id),
   ADD CONSTRAINT seat_assignment_actor CHECK(
    (assignment_origin='USER' AND assigned_by_user_guid IS NOT NULL) OR
    (assignment_origin='SYSTEM' AND assigned_by_user_guid IS NULL AND previous_assignment IS NOT NULL)),
   ADD CONSTRAINT seat_assignment_continuation_unique UNIQUE(previous_assignment,billing_cycle)`);
  await run(`CREATE TABLE public.xa_seat_cycle_rollover (
   id bigserial PRIMARY KEY, global_license integer NOT NULL REFERENCES public.xa_global_license(id),
   billing_cycle integer NOT NULL UNIQUE REFERENCES public.xa_billing_cycle(id),
   processed_at timestamptz NOT NULL DEFAULT NOW(), actor_type text NOT NULL DEFAULT 'SYSTEM' CHECK(actor_type='SYSTEM'),
   carried_count integer NOT NULL CHECK(carried_count>=0), details jsonb NOT NULL
  )`);
  await run(`CREATE FUNCTION public.guard_seat_cycle_rollover() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
   RAISE EXCEPTION 'Seat rollover history is immutable'; END $$`);
  await run(`CREATE TRIGGER trigger_seat_cycle_rollover_immutable BEFORE UPDATE OR DELETE ON public.xa_seat_cycle_rollover FOR EACH ROW EXECUTE FUNCTION public.guard_seat_cycle_rollover()`);
 });},
 async down(queryInterface){await queryInterface.sequelize.transaction(async transaction=>{
  const [rows]=await queryInterface.sequelize.query(`SELECT
   (SELECT COUNT(*) FROM public.xa_seat_cycle_rollover)+(SELECT COUNT(*) FROM public.xa_seat_assignment WHERE assignment_origin='SYSTEM') AS count`,{transaction});
  if(Number(rows[0].count)>0)throw new Error('Cannot remove recorded seat continuations');
  await queryInterface.sequelize.query('DROP TABLE public.xa_seat_cycle_rollover; DROP FUNCTION public.guard_seat_cycle_rollover()',{transaction});
  await queryInterface.sequelize.query(`ALTER TABLE public.xa_seat_assignment DROP CONSTRAINT seat_assignment_actor,
   DROP CONSTRAINT seat_assignment_continuation_unique,DROP COLUMN previous_assignment,DROP COLUMN assignment_origin,
   ALTER COLUMN assigned_by_user_guid SET NOT NULL`,{transaction});
 });}
};
