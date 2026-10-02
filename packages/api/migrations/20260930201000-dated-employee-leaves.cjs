'use strict';
module.exports={
 async up(queryInterface){
  const db=queryInterface.sequelize;
  await db.transaction(async transaction=>{
   const run=sql=>db.query(sql,{transaction});
   await run(`CREATE TABLE public.xa_employee_leave (
    id bigserial PRIMARY KEY, guid uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    employee_license integer NOT NULL REFERENCES public.xa_employee_license(id),
    valid_from timestamptz NOT NULL, valid_until timestamptz NOT NULL,
    leave_type text NOT NULL CHECK(leave_type IN ('PARENTAL','MEDICAL','TECHNICAL','SABBATICAL','OTHER')),
    reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 500),
    declared_by_user_guid varchar(128) NOT NULL CHECK(length(trim(declared_by_user_guid))>0),
    declared_at timestamptz NOT NULL DEFAULT NOW(),
    idempotency_key varchar(128) NOT NULL CHECK(length(trim(idempotency_key))>0),
    cancelled_at timestamptz, cancelled_by_user_guid varchar(128), cancellation_reason text,
    UNIQUE(employee_license,idempotency_key), CHECK(valid_from<valid_until),
    CHECK((cancelled_at IS NULL AND cancelled_by_user_guid IS NULL AND cancellation_reason IS NULL) OR
      (cancelled_at IS NOT NULL AND cancelled_by_user_guid IS NOT NULL AND cancellation_reason IS NOT NULL AND length(trim(cancelled_by_user_guid))>0 AND length(trim(cancellation_reason)) BETWEEN 1 AND 500))
   )`);
   await run(`CREATE INDEX idx_employee_leave_period ON public.xa_employee_leave(employee_license,valid_from,valid_until) WHERE cancelled_at IS NULL`);
   await run(`CREATE FUNCTION public.guard_employee_leave_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Leave history cannot be deleted'; END IF;
    IF TG_OP='UPDATE' THEN
     IF (to_jsonb(NEW)-'cancelled_at'-'cancelled_by_user_guid'-'cancellation_reason') IS DISTINCT FROM
        (to_jsonb(OLD)-'cancelled_at'-'cancelled_by_user_guid'-'cancellation_reason') OR OLD.cancelled_at IS NOT NULL
        OR NEW.cancelled_at IS NULL THEN RAISE EXCEPTION 'Only first cancellation is permitted'; END IF;
    ELSE
     PERFORM id FROM public.xa_employee_license WHERE id=NEW.employee_license FOR UPDATE;
     IF NEW.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'New leave cannot be cancelled'; END IF;
     IF EXISTS(SELECT 1 FROM public.xa_employee_leave WHERE employee_license=NEW.employee_license AND cancelled_at IS NULL
       AND valid_from<NEW.valid_until AND NEW.valid_from<valid_until) THEN RAISE EXCEPTION 'Overlapping leave'; END IF;
    END IF;
    RETURN NEW;
   END $$`);
   await run(`CREATE TRIGGER trigger_employee_leave_history BEFORE INSERT OR UPDATE OR DELETE ON public.xa_employee_leave FOR EACH ROW EXECUTE FUNCTION public.guard_employee_leave_history()`);
   await run(`CREATE FUNCTION public.license_employee_billing_status(p_employee integer,p_at timestamptz)
    RETURNS public.billing_status_computed_enum LANGUAGE sql STABLE AS $$
     SELECT (CASE WHEN el.contractual_status='TERMINATED' THEN 'TERMINATED'
      WHEN el.contractual_status<>'ACTIVE' OR el.activation_date>p_at OR el.activation_date IS NULL
       OR (el.deactivation_date IS NOT NULL AND el.deactivation_date<=p_at) THEN 'NON_BILLABLE'
      WHEN EXISTS(SELECT 1 FROM public.xa_employee_leave l WHERE l.employee_license=el.id AND l.cancelled_at IS NULL
       AND l.valid_from<=p_at AND p_at<l.valid_until) THEN 'NON_BILLABLE'
      WHEN el.declared_long_leave AND NOT EXISTS(SELECT 1 FROM public.xa_employee_leave l WHERE l.employee_license=el.id)
       THEN 'NON_BILLABLE'
      ELSE 'BILLABLE' END)::public.billing_status_computed_enum
     FROM public.xa_employee_license el WHERE el.id=p_employee
    $$`);
   await run(`CREATE TABLE public.xa_dated_leave_view_backup(singleton boolean PRIMARY KEY CHECK(singleton),definition text NOT NULL)`);
   await run(`INSERT INTO public.xa_dated_leave_view_backup VALUES(true,pg_get_viewdef('public.xa_employee_license_with_billing_status'::regclass,true))`);
   await run(`DO $$ DECLARE cols text; BEGIN
    SELECT string_agg(format('el.%I',attname),', ' ORDER BY attnum) INTO cols FROM pg_attribute
    WHERE attrelid='public.xa_employee_license_with_billing_status'::regclass AND attnum>0 AND NOT attisdropped AND attname<>'computed_billing_status';
    EXECUTE 'CREATE OR REPLACE VIEW public.xa_employee_license_with_billing_status AS SELECT ' || cols ||
      ', public.license_employee_billing_status(el.id,NOW()) AS computed_billing_status FROM public.xa_employee_license el';
   END $$`);
  });
 },
 async down(queryInterface){
  const db=queryInterface.sequelize;
  await db.transaction(async transaction=>{
   const run=sql=>db.query(sql,{transaction});
   const [rows]=await run('SELECT COUNT(*) AS count FROM public.xa_employee_leave');
   if(Number(rows[0].count)>0)throw new Error('Cannot remove populated leave history');
   const [backup]=await run('SELECT definition FROM public.xa_dated_leave_view_backup WHERE singleton');
   if(backup.length!==1)throw new Error('Missing view snapshot');
   await run('CREATE OR REPLACE VIEW public.xa_employee_license_with_billing_status AS '+backup[0].definition);
   await run('DROP FUNCTION public.license_employee_billing_status(integer,timestamptz)');
   await run('DROP TABLE public.xa_employee_leave');
   await run('DROP FUNCTION public.guard_employee_leave_history()');
   await run('DROP TABLE public.xa_dated_leave_view_backup');
  });
 }
};
