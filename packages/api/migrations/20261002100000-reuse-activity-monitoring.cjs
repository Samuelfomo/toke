'use strict';
module.exports={
 async up(queryInterface){
  await queryInterface.sequelize.transaction(async transaction=>{
   await queryInterface.sequelize.query(`
   DO $$ BEGIN
    IF to_regclass('public.xa_activity_monitoring') IS NULL OR to_regclass('public.xa_employee_leave') IS NULL THEN
      RAISE EXCEPTION 'Existing activity monitoring and dated leaves are required';
    END IF;
   END $$;

   CREATE OR REPLACE FUNCTION public.calculate_punch_counts(p_employee_license_id integer,p_reference_date date DEFAULT CURRENT_DATE)
   RETURNS TABLE(punch_count_7_days integer,punch_count_30_days integer,last_punch_date timestamptz)
   LANGUAGE sql STABLE AS $$
    SELECT COUNT(*) FILTER(WHERE am.monitoring_date>=p_reference_date-6)::integer,
      COUNT(*) FILTER(WHERE am.monitoring_date>=p_reference_date-29)::integer,MAX(am.last_punch_date)
    FROM public.xa_activity_monitoring am
    JOIN public.xa_employee_license el ON el.id=am.employee_license
    JOIN public.xa_global_license gl ON gl.id=el.global_license JOIN public.xa_tenant t ON t.id=gl.tenant
    WHERE am.employee_license=p_employee_license_id AND am.monitoring_date<=p_reference_date
      AND (am.last_punch_date AT TIME ZONE COALESCE(t.timezone,'UTC'))::date=am.monitoring_date;
   $$;

   CREATE OR REPLACE FUNCTION public.update_activity_monitoring(p_employee_license_id integer,p_monitoring_date date DEFAULT CURRENT_DATE)
   RETURNS void LANGUAGE plpgsql AS $$
   DECLARE stats record; absence integer; daily_punch timestamptz;
   BEGIN
    SELECT * INTO stats FROM public.calculate_punch_counts(p_employee_license_id,p_monitoring_date);
    SELECT last_punch_date INTO daily_punch FROM public.xa_activity_monitoring
      WHERE employee_license=p_employee_license_id AND monitoring_date=p_monitoring_date;
    IF stats.last_punch_date IS NULL THEN absence:=999;
    ELSE
      SELECT GREATEST(0,p_monitoring_date-(stats.last_punch_date AT TIME ZONE COALESCE(t.timezone,'UTC'))::date)
      INTO absence FROM public.xa_employee_license el JOIN public.xa_global_license gl ON gl.id=el.global_license
      JOIN public.xa_tenant t ON t.id=gl.tenant WHERE el.id=p_employee_license_id;
    END IF;
    INSERT INTO public.xa_activity_monitoring(guid,employee_license,monitoring_date,last_punch_date,
      punch_count_7_days,punch_count_30_days,consecutive_absent_days,status_at_date,created_at,updated_at)
    VALUES(gen_random_uuid(),p_employee_license_id,p_monitoring_date,daily_punch,
      stats.punch_count_7_days,stats.punch_count_30_days,absence,
      public.determine_activity_status(stats.punch_count_7_days,absence,p_employee_license_id)::text::public.enum_xa_activity_monitoring_status_at_date,NOW(),NOW())
    ON CONFLICT(employee_license,monitoring_date) DO UPDATE SET
      punch_count_7_days=EXCLUDED.punch_count_7_days,punch_count_30_days=EXCLUDED.punch_count_30_days,
      consecutive_absent_days=EXCLUDED.consecutive_absent_days,status_at_date=EXCLUDED.status_at_date,updated_at=NOW();
    -- Ne jamais remplacer la trace d'un jour par la dernière activité d'un autre jour.
   END $$;

   CREATE OR REPLACE FUNCTION public.record_monitoring_activity(p_employee_license_id integer,p_occurred_at timestamptz)
   RETURNS void LANGUAGE plpgsql AS $$
   DECLARE e record; activity_day date; d date;
   BEGIN
    SELECT el.*,COALESCE(t.timezone,'UTC') AS zone INTO e FROM public.xa_employee_license el
      JOIN public.xa_global_license gl ON gl.id=el.global_license JOIN public.xa_tenant t ON t.id=gl.tenant
      WHERE el.id=p_employee_license_id FOR UPDATE OF el;
    IF NOT FOUND OR p_occurred_at IS NULL OR p_occurred_at>NOW() OR p_occurred_at<e.activation_date
      OR (e.deactivation_date IS NOT NULL AND p_occurred_at>=e.deactivation_date) THEN
      RAISE EXCEPTION 'Invalid employee activity date';
    END IF;
    activity_day:=(p_occurred_at AT TIME ZONE e.zone)::date;
    INSERT INTO public.xa_activity_monitoring(guid,employee_license,monitoring_date,last_punch_date,
      punch_count_7_days,punch_count_30_days,consecutive_absent_days,status_at_date,created_at,updated_at)
    VALUES(gen_random_uuid(),e.id,activity_day,p_occurred_at,0,0,0,'ACTIVE',NOW(),NOW())
    ON CONFLICT(employee_license,monitoring_date) DO UPDATE SET
      last_punch_date=CASE WHEN (xa_activity_monitoring.last_punch_date AT TIME ZONE e.zone)::date=activity_day
        THEN GREATEST(xa_activity_monitoring.last_punch_date,EXCLUDED.last_punch_date) ELSE EXCLUDED.last_punch_date END,
      updated_at=NOW();
    -- Recalcule seulement les jours impactés : 30 jours calendaires, sans incrément de compteur.
    FOR d IN SELECT monitoring_date FROM public.xa_activity_monitoring
      WHERE employee_license=e.id AND monitoring_date>=activity_day AND monitoring_date<=activity_day+29
      ORDER BY monitoring_date LOOP
      PERFORM public.update_activity_monitoring(e.id,d);
    END LOOP;
   END $$;

   CREATE OR REPLACE FUNCTION public.employee_license_activity_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
   BEGIN
    IF TG_OP='INSERT' THEN
      IF NEW.last_activity_date IS NOT NULL THEN PERFORM public.record_monitoring_activity(NEW.id,NEW.last_activity_date); END IF;
    ELSIF NEW.last_activity_date IS NOT NULL AND NEW.last_activity_date IS DISTINCT FROM OLD.last_activity_date THEN
      PERFORM public.record_monitoring_activity(NEW.id,NEW.last_activity_date);
    END IF;
    RETURN NEW;
   END $$;

   CREATE OR REPLACE FUNCTION public.preserve_monitoring_activity_day() RETURNS trigger LANGUAGE plpgsql AS $$
   DECLARE zone text;
   BEGIN
    SELECT COALESCE(t.timezone,'UTC') INTO zone FROM public.xa_employee_license el
      JOIN public.xa_global_license gl ON gl.id=el.global_license JOIN public.xa_tenant t ON t.id=gl.tenant
      WHERE el.id=OLD.employee_license;
    IF (OLD.last_punch_date AT TIME ZONE zone)::date=OLD.monitoring_date THEN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Observed daily activity cannot be deleted'; END IF;
      IF NEW.employee_license IS DISTINCT FROM OLD.employee_license OR NEW.monitoring_date IS DISTINCT FROM OLD.monitoring_date
        OR NEW.guid IS DISTINCT FROM OLD.guid OR NEW.last_punch_date IS NULL
        OR (NEW.last_punch_date AT TIME ZONE zone)::date<>OLD.monitoring_date OR NEW.last_punch_date<OLD.last_punch_date THEN
        RAISE EXCEPTION 'Observed daily activity cannot be moved or erased';
      END IF;
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
   END $$;
   DROP TRIGGER IF EXISTS preserve_monitoring_activity_day ON public.xa_activity_monitoring;
   CREATE TRIGGER preserve_monitoring_activity_day BEFORE UPDATE OR DELETE ON public.xa_activity_monitoring
     FOR EACH ROW EXECUTE FUNCTION public.preserve_monitoring_activity_day();

   -- Si le lot22 a été exécuté, reprendre ses signaux sans supprimer son historique.
   DO $$ DECLARE ev record; BEGIN
    IF to_regclass('public.xa_license_activity_event') IS NOT NULL THEN
      FOR ev IN EXECUTE 'SELECT employee_license,occurred_at FROM public.xa_license_activity_event ORDER BY occurred_at,id' LOOP
        PERFORM public.record_monitoring_activity(ev.employee_license,ev.occurred_at);
      END LOOP;
    END IF;
   END $$;
   `,{transaction});
  });
 },
 async down(){throw new Error('Restore the saved function definitions deliberately; observed activity history must not be removed automatically');}
};
