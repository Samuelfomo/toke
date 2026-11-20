-- Migration manuelle additive MemoReads v1. Aucun lanceur automatique.
-- Valider cible et rôle via set_config dans LA MEME session avant exécution.
-- Testée uniquement sur cluster fictif ; toute utilisation réelle exige autorisation.
-- Schéma public et noms physiques du candidat local ; aucune donnée historique inventée.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
SET LOCAL search_path = pg_catalog, public;
DO $$
BEGIN
  IF current_database() IS DISTINCT FROM nullif(current_setting('toke.migration.expected_database', true),'')
     OR current_user IS DISTINCT FROM nullif(current_setting('toke.migration.expected_role', true),'') THEN
    RAISE EXCEPTION 'EXPLICIT_DATABASE_AND_ROLE_CONFIRMATION_REQUIRED';
  END IF;
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('tk_memos','xa_users') AND c.relkind='r') <> 2 THEN
    RAISE EXCEPTION 'MEMOREADS_PARENT_TABLES_REQUIRED';
  END IF;
END $$;
SELECT pg_advisory_xact_lock(3702, 1);
-- Les FK exigent les PK historiques correspondantes. Toute incompatibilité annule le DDL.
CREATE TABLE IF NOT EXISTS public.tk_memo_reads (
  id BIGSERIAL PRIMARY KEY,
  memo_id INTEGER NOT NULL REFERENCES public.tk_memos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id INTEGER NOT NULL REFERENCES public.xa_users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DO $$
DECLARE n integer;
        seq text;
BEGIN
  IF (SELECT relowner FROM pg_class WHERE oid='public.tk_memo_reads'::regclass)
       <> (SELECT oid FROM pg_roles WHERE rolname=current_user) THEN
    RAISE EXCEPTION 'MEMOREADS_OWNER_MISMATCH';
  END IF;
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='tk_memo_reads'
    AND column_name NOT IN ('id','memo_id','user_id','read_at') AND is_nullable='NO' AND column_default IS NULL) THEN
    RAISE EXCEPTION 'MEMOREADS_EXTRA_REQUIRED_COLUMN';
  END IF;
  seq := pg_get_serial_sequence('public.tk_memo_reads','id');
  IF seq IS NULL OR NOT has_sequence_privilege(current_user,seq,'USAGE')
     OR NOT has_sequence_privilege(current_user,seq,'SELECT') THEN
    RAISE EXCEPTION 'MEMOREADS_SEQUENCE_REQUIRED';
  END IF;
  SELECT count(*) INTO n FROM information_schema.columns
  WHERE table_schema='public' AND table_name='tk_memo_reads'
    AND is_nullable='NO' AND
    ((column_name='id' AND data_type='bigint' AND column_default LIKE 'nextval(%')
     OR (column_name IN ('memo_id','user_id') AND data_type='integer')
     OR (column_name='read_at' AND data_type='timestamp with time zone'
         AND column_default IN ('now()', 'CURRENT_TIMESTAMP')));
  IF n <> 4 THEN RAISE EXCEPTION 'MEMOREADS_COLUMNS_INCOMPATIBLE'; END IF;
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conrelid='public.tk_memo_reads'::regclass
    AND contype='p' AND conkey=ARRAY[(SELECT attnum FROM pg_attribute
      WHERE attrelid='public.tk_memo_reads'::regclass AND attname='id')]::smallint[])
  THEN RAISE EXCEPTION 'MEMOREADS_PK_INCOMPATIBLE'; END IF;
  SELECT count(*) INTO n FROM pg_constraint c
  WHERE c.conrelid='public.tk_memo_reads'::regclass AND c.contype='f'
    AND c.convalidated AND c.confdeltype='c' AND c.confupdtype='c'
    AND ((c.confrelid='public.tk_memos'::regclass AND
      c.conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=c.conrelid AND attname='memo_id')]::smallint[])
      OR (c.confrelid='public.xa_users'::regclass AND
      c.conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=c.conrelid AND attname='user_id')]::smallint[]))
    AND c.confkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=c.confrelid AND attname='id')]::smallint[];
  IF n <> 2 THEN RAISE EXCEPTION 'MEMOREADS_FK_INCOMPATIBLE'; END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tk_memo_reads_memo_user ON public.tk_memo_reads(memo_id,user_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_index i WHERE i.indexrelid=to_regclass('public.uq_tk_memo_reads_memo_user')
    AND i.indrelid='public.tk_memo_reads'::regclass AND i.indisunique AND i.indisvalid AND i.indisready
    AND i.indimmediate AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=2 AND i.indnatts=2
    AND i.indkey::text=(SELECT string_agg(attnum::text,' ' ORDER BY array_position(ARRAY['memo_id','user_id'],attname::text))
      FROM pg_attribute WHERE attrelid='public.tk_memo_reads'::regclass AND attname IN ('memo_id','user_id')))
  THEN RAISE EXCEPTION 'MEMOREADS_INDEX_INCOMPATIBLE'; END IF;
END $$;
DO $$
BEGIN
  IF NOT (has_table_privilege(current_user,'public.tk_memo_reads','SELECT')
    AND has_table_privilege(current_user,'public.tk_memo_reads','INSERT')
    AND has_table_privilege(current_user,'public.tk_memo_reads','UPDATE')) THEN
    RAISE EXCEPTION 'MEMOREADS_TABLE_PRIVILEGES_REQUIRED';
  END IF;
END $$;
COMMIT;
-- Vérifications catalogues et droits dans la transaction avant commit déjà effectuées.
-- Aucune suppression automatique de table ni de données au rollback de version.
