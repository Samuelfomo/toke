'use strict';
module.exports = {
 async up(q) {
  await q.sequelize.transaction(async transaction => {
   await q.sequelize.query(`
    CREATE TABLE public.xa_commercial_transition (
     id bigserial PRIMARY KEY, global_license integer NOT NULL UNIQUE REFERENCES xa_global_license(id),
     tenant integer NOT NULL REFERENCES xa_tenant(id), actor_user_guid varchar(128) NOT NULL,
     actor_tenant_guid integer NOT NULL, idempotency_key varchar(128) NOT NULL UNIQUE,
     valid_from timestamptz NOT NULL, valid_until timestamptz NOT NULL,
     offered_seats integer NOT NULL CHECK(offered_seats>=5), unit_price_usd numeric(12,2) NOT NULL CHECK(unit_price_usd>0),
     reason text NOT NULL, previous_license jsonb NOT NULL, new_license jsonb NOT NULL,
     created_at timestamptz NOT NULL DEFAULT NOW(), CHECK(valid_until>valid_from)
    );
    CREATE TABLE public.xa_commercial_transition_expiry (
     transition_id bigint PRIMARY KEY REFERENCES xa_commercial_transition(id),
     previous_license jsonb NOT NULL, new_license jsonb NOT NULL,
     actor_type text NOT NULL DEFAULT 'SYSTEM' CHECK(actor_type='SYSTEM'), created_at timestamptz NOT NULL DEFAULT NOW()
    );
    CREATE FUNCTION public.commercial_transition_immutable() RETURNS trigger LANGUAGE plpgsql AS $f$
    BEGIN RAISE EXCEPTION 'Commercial transition history is immutable'; END $f$;
    CREATE TRIGGER commercial_transition_immutable BEFORE UPDATE OR DELETE ON public.xa_commercial_transition
     FOR EACH ROW EXECUTE FUNCTION public.commercial_transition_immutable();
    CREATE TRIGGER commercial_transition_expiry_immutable BEFORE UPDATE OR DELETE ON public.xa_commercial_transition_expiry
     FOR EACH ROW EXECUTE FUNCTION public.commercial_transition_immutable();
   `,{transaction});
  });
 },
 async down(q) {
  const [rows]=await q.sequelize.query('SELECT COUNT(*)::integer AS count FROM public.xa_commercial_transition');
  if(rows[0].count)throw new Error('Cannot remove recorded commercial transitions');
  await q.sequelize.transaction(async transaction=>{
   await q.sequelize.query('DROP TABLE public.xa_commercial_transition_expiry; DROP TABLE public.xa_commercial_transition; DROP FUNCTION public.commercial_transition_immutable();',{transaction});
  });
 }
};
