'use strict';
const assert=require('node:assert/strict');
module.exports=async function(env){
  const {manager,initializer,A,B,cfg,wire}=env;
  const loader=require('./postgres-business-loader.cjs')(env);
  const Memos=loader.load('tenant/class/Memos.ts').default;
  const Reads=loader.load('tenant/class/MemoReads.ts').default;
  const T=loader.load('utils/response.model.ts').tableName;
  const captured=[];
  const scope=(t,f)=>manager.runTenantOperation(t,async()=>{const db=await manager.getConnectionForTenant(t,cfg(t));await initializer.initialize(db);return f(db);});
  await Promise.all([A,B].map(tenant=>scope(tenant,async db=>{
    const user=await initializer.getModel(T.USERS).findOne({where:{guid:'700001'}});
    assert.ok(user,'business user fixture required');
    const Model=initializer.getModel(T.MEMOS);
    const memo=await Model.create({guid:'899901',author_user:user.id,target_user:null,validator_user:null,
      memo_type:Model.rawAttributes.memo_type.values[0],memo_status:Model.rawAttributes.memo_status.values[0],
      title:'Only '+tenant,memo_content:[],auto_generated:false},{validate:false});
    const result=await Memos._markAsRead(memo.guid,user.id,user.guid);
    assert.equal(result.is_read,true);
    await Promise.all([Reads._markRead(memo.id,user.id,new Date()),Reads._markRead(memo.id,user.id,new Date())]);
    assert.equal(await initializer.getModel(T.MEMO_READS).count({where:{memo_id:memo.id,user_id:user.id}}),1);
    const outsider=await initializer.getModel(T.USERS).findOne({where:{guid:'700002'}});
    await assert.rejects(Memos._markAsRead(memo.guid,outsider.id,outsider.guid),/MEMO_ACCESS_DENIED/);
    assert.equal(await initializer.getModel(T.MEMO_READS).count({where:{memo_id:memo.id,user_id:outsider.id}}),0);
    assert.equal((await Model.findOne({where:{guid:'899901'}})).title,'Only '+tenant);
    captured.push({tenant,instance:new Reads(),id:memo.id,user:user.id});
    await assert.rejects(db.transaction(async transaction=>{
      await db.query('DROP TABLE "tk_memo_reads"',{transaction});
      // An absent table does not disable historical memo rows, but read-status SQL fails.
      assert.ok(await Model.findByPk(memo.id,{transaction}));
      await db.query('SELECT * FROM "tk_memo_reads"',{transaction});
    }),/tk_memo_reads/);
    assert.equal(await initializer.getModel(T.MEMO_READS).count({where:{memo_id:memo.id}}),1);
  })));
  for(const item of captured){
    const count=wire.length;
    await assert.rejects(item.instance.saveRead(item.id,item.user,new Date()),/TENANT_CONTEXT_MISSING|TENANT_CONTEXT_CLOSED/);
    await assert.rejects(scope(item.tenant===A?B:A,()=>item.instance.saveRead(item.id,item.user,new Date())),/TENANT_.*MISMATCH/);
    assert.equal(wire.length,count,'refused raw SQL must not reach driver');
  }
  console.log('PASS MEMOS PG: actual classes/raw upsert concurrent A/B, unique read row, outsider refused, captured wrong-context SQL refused; missing table fails SQL without losing memo rows; fixture DROP rolled back');
};
