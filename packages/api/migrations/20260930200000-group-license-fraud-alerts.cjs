'use strict';
// Master only. One alert per statement / tenant / detection type / severity.
module.exports = {
 async up(queryInterface) {
  const db=queryInterface.sequelize;
  await db.transaction(async transaction => {
   const run=sql=>db.query(sql,{transaction});
   await run(`CREATE TABLE public.xa_license_alert_group_backup (singleton boolean PRIMARY KEY CHECK(singleton), definition text NOT NULL)`);
   await run(`INSERT INTO public.xa_license_alert_group_backup VALUES(true,pg_get_functiondef('public.employee_license_fraud_detection_trigger()'::regprocedure))`);
   await run(`CREATE TABLE public.xa_license_alert_operation (
    transaction_id xid8 NOT NULL,
    statement_time timestamptz NOT NULL,
    tenant integer NOT NULL,
    detection_type text NOT NULL,
    risk_level text NOT NULL,
    PRIMARY KEY(transaction_id,statement_time,tenant,detection_type,risk_level)
   )`);
   await run(`CREATE FUNCTION public.group_license_fraud_alert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
     INSERT INTO public.xa_license_alert_operation(transaction_id,statement_time,tenant,detection_type,risk_level)
     VALUES(pg_current_xact_id(),statement_timestamp(),NEW.tenant,NEW.detection_type::text,NEW.risk_level::text)
     ON CONFLICT DO NOTHING;
     IF NOT FOUND THEN RETURN NULL; END IF;
     RETURN NEW;
    END $$`);
   await run(`CREATE TRIGGER trigger_group_license_fraud_alert BEFORE INSERT ON public.xa_fraud_detection_log FOR EACH ROW EXECUTE FUNCTION public.group_license_fraud_alert()`);
   const [rows]=await run(`SELECT definition FROM public.xa_license_alert_group_backup WHERE singleton`);
   let definition=rows[0].definition;
   // INSERT with suppressed BEFORE trigger sets FOUND=false, so do not announce a duplicate.
   definition=definition.replace(/RAISE NOTICE[\s\S]*?;/g, notice => {
    notice=notice.replace(/%\.1f%%/g,'%%%')
      .replace(/\bpercentage_long_leave\b/g,'round(percentage_long_leave, 1)')
      .replace(/\bpercentage_deactivated\b/g,'round(percentage_deactivated, 1)');
    return `IF FOUND THEN ${notice} END IF;`;
   });
   await run(definition);
  });
 },
 async down(queryInterface) {
  const db=queryInterface.sequelize;
  await db.transaction(async transaction=> {
   const run=sql=>db.query(sql,{transaction});
   await run('DROP TRIGGER trigger_group_license_fraud_alert ON public.xa_fraud_detection_log');
   await run('DROP FUNCTION public.group_license_fraud_alert()');
   const [rows]=await run('SELECT definition FROM public.xa_license_alert_group_backup WHERE singleton');
   if(rows.length!==1) throw new Error('Original fraud trigger definition is missing');
   await run(rows[0].definition);
   await run('DROP TABLE public.xa_license_alert_operation');
   await run('DROP TABLE public.xa_license_alert_group_backup');
  });
 }
};
