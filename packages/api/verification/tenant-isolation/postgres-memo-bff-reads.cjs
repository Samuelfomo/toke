'use strict';
// Only called by the reviewed disposable-cluster harness. No environment files,
// public endpoint, connection string or independent database connection.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict'),express=require('express');
module.exports=async function({base,listen,localFetch,serviceHeaders,tokens,tenants,fixtures,cfg,sessionEnv,makeSessionLoader,sourceEnvironment}){
 const oldLocal=sourceEnvironment.MEMO_B2_LOCAL_READS;
 delete sourceEnvironment.MEMO_B2_LOCAL_READS;
 sourceEnvironment.MEMO_B2_MANAGER_READS='1';
 const bffEnv={NODE_ENV:'test',MEMO_B2_MANAGER_READS:'1'};
 const sessionLoad=makeSessionLoader({env:sessionEnv,fetch:localFetch});
 const {TenantConfig}=sessionLoad('packages/backend/src/tools/tenant.config.ts');
 const source=fs.readFileSync(path.resolve(__dirname,'../../../backend/src/tools/memo-manager-reads.ts'),'utf8');
 const exports={};
 const upstreamCalls=[];
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,process:{env:bffEnv},console,
  require(name){
   assert.equal(name,'./api.factory.js');
   return {getApiClient:async reference=>{
    const tenant=tenants.find(t=>cfg(t).reference===reference);assert.ok(tenant);
    return {get:async(route,options)=>{
     assert.ok(route==='/memo/list'||/^\/memo\/\d+$/.test(route));
     const url=base+route+'?'+new URLSearchParams(options.params);
     upstreamCalls.push({tenant,proof:options.headers['x-toke-user-session']});
     const response=await localFetch(url,{headers:{...serviceHeaders(),'x-api-tenant':tenant,...options.headers}});
     const data=await response.json();
     if(!response.ok)throw {response:{status:response.status,data}};
     return {data};
    }};
   }};
  },
 },{filename:'memo-manager-reads.ts',timeout:4000});
 const app=express();
 app.use('/memo',TenantConfig.authenticate,TenantConfig.authenticateUser,exports.memoManagerReads,(_req,res)=>res.status(503).json({success:false,error:{code:'memo_permissions_pending'}}));
 const bff=await listen(app);
 const call=async(route,t,name,headers={})=>{
  const response=await localFetch(bff+route,{headers:{'x-api-client':cfg(t).reference,Authorization:'Bearer '+tokens[t+name],...headers}});
  return {status:response.status,body:await response.json()};
 };
 try{
  for(const t of tenants){
   const f=fixtures[t];
   const list=(name,query='')=>call('/memo/list'+query,t,name);
   for(const [name,count]of [['direct',3],['employee',4],['senior',1],['outsider',0]]){
    const result=await list(name);assert.equal(result.status,200);assert.equal(result.body.data.memos.pagination.total,count);
    assert.equal(result.body.data.memos.items.length,count);
    assert.ok(result.body.data.memos.items.every(m=>m.title.startsWith(t+':')));
   }
   for(const [name,memo]of [['direct','author'],['direct','target'],['direct','certified'],['senior','certified'],['employee','legacy']]){
    const result=await call('/memo/'+f.memos[memo].guid,t,name);assert.equal(result.status,200);assert.equal(result.body.data.memo.guid,f.memos[memo].guid);
    assert.equal(result.body.data.memo.capabilities.validate,false);
    assert.ok(!JSON.stringify(result.body).includes('SECRET_MEDIA'));
   }
   for(const [name,memo]of [['outsider','certified'],['direct','legacy'],['direct','foreign'],['senior','author']])assert.equal((await call('/memo/'+f.memos[memo].guid,t,name)).status,404);
   const denied=await call('/memo/'+f.memos.certified.guid,t,'outsider'),missing=await call('/memo/999999999',t,'outsider');assert.deepEqual(denied,missing);
   const first=await list('direct','?limit=1&offset=0&sort=recent'),second=await list('direct','?limit=1&offset=1&sort=recent');
   assert.equal(first.body.data.memos.pagination.total,3);assert.equal(second.body.data.memos.pagination.offset,1);
   assert.notEqual(first.body.data.memos.items[0].guid,second.body.data.memos.items[0].guid);
   const asc=await list('direct','?sort=oldest'),desc=await list('direct','?sort=recent');
   assert.deepEqual(asc.body.data.memos.items.map(m=>m.guid).reverse(),desc.body.data.memos.items.map(m=>m.guid));
   assert.equal((await list('direct','?memo_status=submitted')).body.data.memos.pagination.total,1);
   assert.equal((await list('direct','?search='+encodeURIComponent(t+':target'))).body.data.memos.pagination.total,1);
   assert.equal((await list('direct','?limit=0')).status,400);
   assert.equal((await list('direct','?supervisor='+f.users.senior.guid)).status,403);
   assert.equal((await call('/memo/list',t,'direct',{Authorization:''})).status,401);
   assert.equal((await call('/memo/list',t,'direct',{'x-integrator-context':'synthetic-test-context'})).status,401);
   const other=tenants.find(x=>x!==t);
   assert.equal((await call('/memo/list',t,'direct',{'x-api-client':cfg(other).reference})).status,403);
   assert.equal((await call('/memo/'+f.memos.certified.guid,t,'direct',{'x-api-client':cfg(other).reference})).status,403);
   const valid=await call('/memo/list',t,'direct',{'x-toke-user-session':'spoof-test-header'});
   assert.equal(valid.status,200);assert.equal(upstreamCalls.at(-1).proof,tokens[t+'direct']);
   for(const route of ['/memo/summary','/memo/realtime-ticket','/memo/'+f.memos.certified.guid+'/events'])assert.equal((await call(route,t,'direct')).body.error.code,'memo_permissions_pending');
   console.log('PASS BFF+API+PG '+t+': author, target, certified responsible, current superior, outsider, opaque404, cross-tenant, no session, filters, pagination, proof relay, closed other GETs');
  }
  sourceEnvironment.NODE_ENV='production';
  assert.equal((await call('/memo/list',tenants[0],'direct')).body.error.code,'memo_permissions_pending');
  sourceEnvironment.NODE_ENV='test';bffEnv.NODE_ENV='production';
  assert.equal((await call('/memo/list',tenants[0],'direct')).body.error.code,'memo_permissions_pending');
  console.log('PASS BFF+API+PG: independent production locks preserved');
 }finally{
  sourceEnvironment.NODE_ENV='test';delete sourceEnvironment.MEMO_B2_MANAGER_READS;
  if(oldLocal!==undefined)sourceEnvironment.MEMO_B2_LOCAL_READS=oldLocal;
 }
};
