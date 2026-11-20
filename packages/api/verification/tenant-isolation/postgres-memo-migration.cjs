'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async function(env){
  const {localPG,cfg,A,B,socket,port,root,nonce}=env;
  assert.equal(fs.readFileSync(path.join(root,'owner'),'utf8'),nonce);
  const portable=fs.readFileSync(path.join(__dirname,'../../migrations/manual/memo_reads_v1.sql'),'utf8');
  const draft=fs.readFileSync(path.join(__dirname,'../../../../audits/MEMOREADS_MIGRATION_FICTIVE_PROPOSITION.sql'),'utf8');
  await Promise.all([A,B].map(async tenant=>{
    const config=cfg(tenant);
    const db=new localPG.Client({host:socket,port,database:config.database,user:config.username,password:config.password});
    const fixtureAdmin=new localPG.Client({host:socket,port,database:config.database,user:'v01_control',password:''});
    await db.connect();
    await fixtureAdmin.connect();
    const run=async sql=>{try{await db.query(sql);}catch(e){await db.query('ROLLBACK');throw e;}};
    try{
      const rows=(await db.query('SELECT * FROM public.tk_memo_reads ORDER BY id')).rows;
      await db.query('DROP TABLE public.tk_memo_reads'); // Only the owned fictitious table.
      // The original cluster-marker draft reads privileged PG settings. Verify
      // it with fixture control only; the portable migration uses the real tenant role.
      await fixtureAdmin.query(draft);
      await fixtureAdmin.query(draft);
      await fixtureAdmin.query('DROP TABLE public.tk_memo_reads');
      await assert.rejects(run(portable),/EXPLICIT_DATABASE_AND_ROLE/);
      await db.query("SELECT set_config('toke.migration.expected_database',$1,false),set_config('toke.migration.expected_role',$2,false)",[config.database,config.username]);
      await run(portable);
      // Restore fictitious rows, then rerun and verify no data rewrite.
      for(const row of rows) await db.query('INSERT INTO public.tk_memo_reads(id,memo_id,user_id,read_at) VALUES($1,$2,$3,$4)',[row.id,row.memo_id,row.user_id,row.read_at]);
      const before=(await db.query('SELECT * FROM public.tk_memo_reads ORDER BY id')).rows;
      await run(portable);assert.deepEqual((await db.query('SELECT * FROM public.tk_memo_reads ORDER BY id')).rows,before);
      await db.query("SELECT setval(pg_get_serial_sequence('public.tk_memo_reads','id'),COALESCE((SELECT max(id) FROM public.tk_memo_reads),0)+1,false)");
      const parent=(await db.query("SELECT id,author_user FROM public.tk_memos WHERE guid='899901'")).rows[0];
      await db.query('BEGIN');
      const inserted=(await db.query('INSERT INTO public.tk_memo_reads(memo_id,user_id) VALUES($1,$2) ON CONFLICT(memo_id,user_id) DO UPDATE SET read_at=EXCLUDED.read_at RETURNING id',[parent.id,parent.author_user])).rows[0];
      assert.ok(BigInt(inserted.id)>0n);await db.query('ROLLBACK');
      await assert.rejects(run('BEGIN; INSERT INTO public.tk_memo_reads(memo_id,user_id) VALUES(-999,-999);COMMIT;'),e=>e.code==='23503');
      await assert.rejects(run('BEGIN; INSERT INTO public.tk_memo_reads(memo_id,user_id) VALUES(NULL,NULL);COMMIT;'),e=>e.code==='23502');
      await assert.rejects(run(`BEGIN;
        INSERT INTO public.tk_memo_reads(memo_id,user_id) VALUES(${parent.id},${parent.author_user}) ON CONFLICT(memo_id,user_id) DO NOTHING;
        INSERT INTO public.tk_memo_reads(memo_id,user_id) VALUES(${parent.id},${parent.author_user});COMMIT;`),e=>e.code==='23505');
      await db.query('BEGIN');
      await db.query('INSERT INTO public.tk_memo_reads(memo_id,user_id) VALUES($1,$2) ON CONFLICT(memo_id,user_id) DO NOTHING',[parent.id,parent.author_user]);
      await db.query('DELETE FROM public.tk_memos WHERE id=$1',[parent.id]);
      assert.equal((await db.query('SELECT FROM public.tk_memo_reads WHERE memo_id=$1',[parent.id])).rowCount,0);
      await db.query('ROLLBACK');
      await db.query('DROP INDEX public.uq_tk_memo_reads_memo_user');
      await db.query('CREATE INDEX uq_tk_memo_reads_memo_user ON public.tk_memo_reads(memo_id)');
      await assert.rejects(run(portable),/MEMOREADS_INDEX_INCOMPATIBLE/);
      await db.query('DROP INDEX public.uq_tk_memo_reads_memo_user');
      await run(portable);
      // Existing incompatible columns are refused and left untouched.
      await db.query('ALTER TABLE public.tk_memo_reads RENAME COLUMN read_at TO fixture_incompatible');
      await assert.rejects(run(portable),/MEMOREADS_.*(COLUMN|INCOMPATIBLE)/);
      assert.ok((await db.query("SELECT FROM information_schema.columns WHERE table_name='tk_memo_reads' AND column_name='fixture_incompatible'")).rowCount);
      await db.query('ALTER TABLE public.tk_memo_reads RENAME COLUMN fixture_incompatible TO read_at');
      // Failure after CREATE TABLE must roll back even the new table and sequence.
      await db.query('DROP TABLE public.tk_memo_reads');
      await assert.rejects(run(portable.replace('CREATE UNIQUE INDEX IF NOT EXISTS',()=>"DO $$ BEGIN RAISE EXCEPTION 'FIXTURE_MIGRATION_FAILURE'; END $$;\nCREATE UNIQUE INDEX IF NOT EXISTS")),/FIXTURE_MIGRATION_FAILURE/);
      assert.equal((await db.query("SELECT to_regclass('public.tk_memo_reads') AS t")).rows[0].t,null);
      assert.equal((await db.query("SELECT to_regclass('public.tk_memo_reads_id_seq') AS t")).rows[0].t,null);
      await run(portable);
      await run(portable);
    }finally{await db.end();await fixtureAdmin.end();}
  }));
  console.log('PASS MEMOREADS MIGRATION: draft + portable A/B, non-superuser tenant DDL/sequence/upsert, idempotence/data preserved, FK/NOT NULL, incompatible table refused, injected failure rolls back new table/sequence');
};
