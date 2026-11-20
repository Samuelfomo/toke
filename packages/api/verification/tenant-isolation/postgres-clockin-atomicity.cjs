'use strict';
const assert=require('node:assert/strict');
module.exports=async function(env){
  const {A,B,scope,initializer,T,cfg,wire,post,P,effects,fixtures,controls}=env;
  const tables=[T.WORK_SESSIONS,T.TIME_ENTRIES,T.MEMOS,T.FRAUD_ALERTS];
  const snapshot=tenant=>scope(tenant,async()=>JSON.stringify(await Promise.all(tables.map(t=>initializer.getModel(t).findAll({raw:true,order:[['id','ASC']]})))));
  const counters=tenant=>[effects.get(tenant+'activity')||0,effects.get(tenant+'notification')||0];
  function transactionTrace(start,tenant,end){
    const trace=wire.slice(start).filter(q=>q.database===cfg(tenant).database);
    const begin=trace.findIndex(q=>/^START TRANSACTION/i.test(q.text));
    const finish=trace.findIndex((q,i)=>i>begin&&/^(COMMIT|ROLLBACK)/i.test(q.text));
    assert.ok(begin>=0&&finish>begin,'managed transaction must terminate');
    assert.match(trace[finish].text,new RegExp('^'+end,'i'));
    assert.ok(trace.slice(begin,finish+1).every(q=>q.pid===trace[begin].pid),'every SQL in the unit, including reads and GUIDs, uses the owned physical transaction');
    return trace;
  }
  for(const tenant of [A,B])await scope(tenant,async()=>{
    await initializer.getModel(T.USERS).update({device_token:tenant},{where:{id:fixtures.get(tenant).managerUser.id}});
  });
  let tick=180;
  for(const [table,operation]of [[T.WORK_SESSIONS,'INSERT'],[T.TIME_ENTRIES,'INSERT'],[T.MEMOS,'INSERT'],[T.FRAUD_ALERTS,'INSERT'],[T.WORK_SESSIONS,'UPDATE']]){
    for(const [index,tenant]of [A,B].entries()){
      const before=await snapshot(tenant),beforeEffects=counters(tenant),control=controls[index];
      await control.query("CREATE FUNCTION public.v01_clockin_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'V01_CLOCKIN_SQL_FAILURE'; END $$");
      try{
        await control.query(`CREATE TRIGGER v01_clockin_failure BEFORE ${operation} ON "${table}" FOR EACH ROW EXECUTE FUNCTION public.v01_clockin_failure()`);
        const start=wire.length;
        const result=await post(tenant,P.CLOCK_IN,tick++,{latitude:2.5});
        assert.ok(result.status>=400,JSON.stringify(result.body));assert.match(JSON.stringify(result.body),/V01_CLOCKIN_SQL_FAILURE/);
        transactionTrace(start,tenant,'ROLLBACK');
        assert.equal(await snapshot(tenant),before,table+' '+operation+' must restore all rows, including previous-session correction');
        assert.deepEqual(counters(tenant),beforeEffects,'no FCM/activity for rolled back work');
      }finally{
        await control.query(`DROP TRIGGER IF EXISTS v01_clockin_failure ON "${table}"`);
        await control.query('DROP FUNCTION public.v01_clockin_failure()');
      }
    }
  }
  console.log('PASS CLOCK_IN ATOMICITY: session/entry/memo/alert INSERT and previous-session UPDATE failures restore full A/B snapshots, one physical transaction for all SQL, zero external effects');
  // Hold each employee row so both HTTP requests reach the transaction concurrently.
  for(const [index,tenant]of [A,B].entries()){
    const control=controls[index],id=fixtures.get(tenant).employee.id;
    const db=await scope(tenant,db=>db);
    const userModel=await scope(tenant,()=>initializer.getModel(T.USERS));
    let release,arrived;
    const gate=new Promise(resolve=>release=resolve),both=new Promise(resolve=>arrived=resolve);
    let admissions=0;
    db.addHook('beforeQuery','v01-clockin-barrier',async options=>{
      if(options.transaction && options.lock && options.model===userModel){
        admissions++;if(admissions===2)arrived();await gate;
      }
    });
    const baseline=await scope(tenant,()=>initializer.getModel(T.TIME_ENTRIES).count());
    const beforeEffects=counters(tenant);
    const body={latitude:2.5,external_id:String(index+1).padStart(26,'0')};
    const settled=p=>p.then(result=>({result}),error=>({error}));
    const first=settled(post(tenant,P.CLOCK_IN,200,body)),second=settled(post(tenant,P.CLOCK_IN,200,body));
    let waiting=false,timer,locked=false;
    try{
      await Promise.race([both,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('HTTP requests did not reach CLOCK_IN lock after authentication')),8000);})]);
      clearTimeout(timer);
      await control.query('BEGIN');locked=true;
      await control.query(`SELECT id FROM "${T.USERS}" WHERE id=$1 FOR UPDATE`,[id]);
      release();
      for(let i=0;i<400;i++){
        await control.query('SELECT pg_stat_clear_snapshot()');
        const result=await control.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=$1 AND wait_event_type='Lock' AND query LIKE '%FOR UPDATE%'",[cfg(tenant).database]);
        if(result.rows[0].n>=2){waiting=true;break;}
        await new Promise(r=>setTimeout(r,10));
      }
    }finally{
      clearTimeout(timer);release();
      if(locked)await control.query('COMMIT');
      db.removeHook('beforeQuery','v01-clockin-barrier');
    }
    const settledResults=await Promise.all([first,second]);
    assert.ok(settledResults.every(r=>!r.error),JSON.stringify(settledResults.map(r=>r.error?.message)));
    const results=settledResults.map(r=>r.result);
    assert.ok(waiting,'two HTTP transactions must actually wait on the same user lock; status '+JSON.stringify(results.map(r=>r.status)));
    assert.deepEqual(results.map(r=>r.status).sort(),[200,201],JSON.stringify(results));
    assert.equal(results[0].body.data.entry.guid,results[1].body.data.entry.guid);
    assert.equal(await scope(tenant,()=>initializer.getModel(T.TIME_ENTRIES).count()),baseline+1);
    assert.deepEqual(counters(tenant),[beforeEffects[0]+1,beforeEffects[1]+1],'one activity and one FCM after successful commit, none for replay');
  }
  const concurrent=await Promise.all([A,B].map(t=>post(t,P.CLOCK_IN,210,{latitude:2.5})));
  assert.ok(concurrent.every(r=>r.status===201),JSON.stringify(concurrent));
  console.log('PASS CLOCK_IN CONCURRENCY: real HTTP row-lock waiters, same external id commits once then verified replay; simultaneous A/B writes stay isolated');
  // Real COMMIT followed by simulated loss of its successful outcome.
  const db=await scope(A,db=>db),start=wire.length,before=await scope(A,()=>initializer.getModel(T.TIME_ENTRIES).count()),beforeEffects=counters(A);
  let failures=0;
  db.addHook('afterQuery','v01-clockin-unknown',(_options,query)=>{if(/^COMMIT;?$/i.test(query.sql)){failures++;throw Error('V01_CLOCKIN_COMMIT_UNKNOWN');}});
  let result;
  try{result=await post(A,P.CLOCK_IN,220,{latitude:2.5});}finally{db.removeHook('afterQuery','v01-clockin-unknown');}
  assert.ok(result.status>=400);assert.match(JSON.stringify(result.body),/V01_CLOCKIN_COMMIT_UNKNOWN/);
  assert.equal(failures,1);assert.equal(wire.slice(start).filter(q=>q.database===cfg(A).database&&/^COMMIT;?$/i.test(q.text)).length,1);
  assert.equal(await scope(A,()=>initializer.getModel(T.TIME_ENTRIES).count()),before+1,'commit happened; do not describe this as rollback');
  assert.deepEqual(counters(A),beforeEffects,'no response-success/notification publication without confirmed commit');
  console.log('PASS CLOCK_IN COMMIT OUTCOME: actual commit plus simulated acknowledgement error, no automatic replay or external publication; durable state identified honestly');
};
