"use strict";
// Master only. Preserve original function definitions and column settings.
const functions = ["public.update_activity_monitoring(integer,date)", "public.employee_license_activity_trigger()", "public.employee_license_fraud_detection_trigger()"];
module.exports = {
 async up(queryInterface) {
  const db = queryInterface.sequelize;
  await db.transaction(async transaction => {
   const run = sql => db.query(sql, { transaction });
   await run(`CREATE TABLE public.xa_license_trigger_repair_backup (kind text NOT NULL, key text NOT NULL, payload jsonb NOT NULL, PRIMARY KEY(kind,key))`);
   for (const signature of functions) {
    await db.query(`INSERT INTO public.xa_license_trigger_repair_backup VALUES ('function', :signature, to_jsonb(pg_get_functiondef(CAST(:signature AS regprocedure))))`, { replacements: { signature }, transaction });
   }
   await run(`INSERT INTO public.xa_license_trigger_repair_backup
    SELECT 'column', table_name || '.' || column_name,
      jsonb_build_object('default', column_default, 'nullable', is_nullable)
    FROM information_schema.columns WHERE table_schema='public' AND (
      (table_name='xa_activity_monitoring' AND column_name IN ('guid','last_punch_date')) OR
      (table_name='xa_fraud_detection_log' AND column_name IN ('guid','created_at','updated_at')))`);
   await run(`DO $$ DECLARE definition text; BEGIN
    definition := pg_get_functiondef('public.update_activity_monitoring(integer,date)'::regprocedure);
    definition := replace(definition, 'calculated_status,', 'calculated_status::text::public.enum_xa_activity_monitoring_status_at_date,');
    EXECUTE definition;
    definition := pg_get_functiondef('public.employee_license_fraud_detection_trigger()'::regprocedure);
    definition := replace(definition, 'affected_employees JSONB;', 'affected_employees varchar[];');
    IF position('affected_employees JSONB;' IN definition) > 0 THEN RAISE EXCEPTION 'Uncorrected array declaration'; END IF;
    IF position('public.enum_xa_fraud_detection_log_risk_level' IN definition)=0 THEN
      definition := replace(definition, 'risk_level_enum', 'public.enum_xa_fraud_detection_log_risk_level');
    END IF;
    IF position('public.enum_xa_fraud_detection_log_detection_type' IN definition)=0 THEN
      definition := replace(definition, 'fraud_detection_enum', 'public.enum_xa_fraud_detection_log_detection_type');
    END IF;
    EXECUTE definition;
   END $$`);
   await run(`CREATE OR REPLACE FUNCTION public.employee_license_activity_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
     IF TG_OP='INSERT' THEN
      IF NEW.last_activity_date IS NOT NULL THEN PERFORM public.update_activity_monitoring(NEW.id,CURRENT_DATE); END IF;
     ELSIF TG_OP='UPDATE' THEN
      IF (NEW.last_activity_date IS NOT NULL AND (OLD.last_activity_date IS NULL OR NEW.last_activity_date>OLD.last_activity_date))
       OR OLD.contractual_status IS DISTINCT FROM NEW.contractual_status
       OR OLD.declared_long_leave IS DISTINCT FROM NEW.declared_long_leave THEN
        PERFORM public.update_activity_monitoring(NEW.id,CURRENT_DATE);
      END IF;
     END IF;
     RETURN NEW;
    END $$`);
   await run(`ALTER TABLE public.xa_activity_monitoring ALTER COLUMN guid SET DEFAULT gen_random_uuid(), ALTER COLUMN last_punch_date DROP NOT NULL`);
   await run(`ALTER TABLE public.xa_fraud_detection_log ALTER COLUMN guid SET DEFAULT gen_random_uuid(), ALTER COLUMN created_at SET DEFAULT NOW(), ALTER COLUMN updated_at SET DEFAULT NOW()`);
   // Align the current billing view with the date-aware rule validated on the test copy.
   await run(`INSERT INTO public.xa_license_trigger_repair_backup VALUES ('view','billing',to_jsonb(pg_get_viewdef('public.xa_employee_license_with_billing_status'::regclass,true)))`);
   await run(`DO $$ DECLARE cols text; BEGIN
    SELECT string_agg(format('el.%I',attname),', ' ORDER BY attnum) INTO cols FROM pg_attribute
    WHERE attrelid='public.xa_employee_license_with_billing_status'::regclass AND attnum>0 AND NOT attisdropped AND attname<>'computed_billing_status';
    EXECUTE 'CREATE OR REPLACE VIEW public.xa_employee_license_with_billing_status AS SELECT ' || cols || ', CASE
     WHEN el.contractual_status=''TERMINATED'' THEN ''TERMINATED''
     WHEN el.contractual_status=''ACTIVE'' AND el.declared_long_leave=false AND el.activation_date<=NOW()
       AND (el.deactivation_date IS NULL OR el.deactivation_date>NOW()) THEN ''BILLABLE''
     ELSE ''NON_BILLABLE'' END::public.billing_status_computed_enum AS computed_billing_status FROM public.xa_employee_license el';
   END $$`);
  });
 },
 async down(queryInterface) {
  const db=queryInterface.sequelize;
  await db.transaction(async transaction => {
   await db.query(`DO $$ DECLARE item record; tbl text; col text; BEGIN
    FOR item IN SELECT * FROM public.xa_license_trigger_repair_backup WHERE kind='function' LOOP EXECUTE item.payload #>> '{}'; END LOOP;
    FOR item IN SELECT * FROM public.xa_license_trigger_repair_backup WHERE kind='column' LOOP
     tbl:=split_part(item.key,'.',1); col:=split_part(item.key,'.',2);
     IF item.payload->>'default' IS NULL THEN EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT',tbl,col);
     ELSE EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT %s',tbl,col,item.payload->>'default'); END IF;
     IF item.payload->>'nullable'='NO' THEN EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET NOT NULL',tbl,col); END IF;
    END LOOP;
    SELECT * INTO STRICT item FROM public.xa_license_trigger_repair_backup WHERE kind='view';
    EXECUTE 'CREATE OR REPLACE VIEW public.xa_employee_license_with_billing_status AS ' || (item.payload #>> '{}');
   END $$`,{transaction});
   await db.query('DROP TABLE public.xa_license_trigger_repair_backup',{transaction});
  });
 }
};
