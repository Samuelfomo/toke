'use strict';
// Actual production active-account resolver and actual User/Sequelize/pg, only
// the Master catalog/cache metadata is a fixture. No Redis/HTTP can be opened.
const assert=require('node:assert/strict');
module.exports=async function(env){
 const {manager,initializer,cfg,A,B,wire}=env;
 const business=require('./postgres-business-loader.cjs')(env);
 const User=business.load('tenant/class/User.ts').default;
 const {tableName:T}=business.load('utils/response.model.ts');
 const refs=new Map([[A,'100001'],[B,'100002']]);let masterActive=true,cacheContradiction=false;
 const load=require('../user-sessions/load.cjs')({shared:business.shared,overrides:{
  'packages/api/src/master/class/Tenant.ts':{default:{_load:async(guid,byGuid)=>{
    assert.equal(byGuid,true);const domain=[...refs].find(([,ref])=>ref===guid)?.[0];
    return domain?{getStatus:()=>masterActive?business.shared.Status.ACTIVE:business.shared.Status.INACTIVE,getSubdomain:()=>domain}:null;
  }}},
  'packages/api/src/tenant/class/User.ts':{default:User},
  'packages/api/src/tenant/database/db.tenant-manager.ts':{default:manager},
  'packages/api/src/tenant/database/db.initializer.ts':{TableInitializer:initializer},
  'packages/api/src/tools/tenant-cache.service.ts':{default:{getTenantConfig:async domain=>({...cfg(domain),active:true,reference:cacheContradiction?'999999':refs.get(domain)})}},
 }});
 const {assertManagerIdentityActive:verify}=load('packages/api/src/tools/user-session.runtime.ts');
 const identity=domain=>({userGuid:'700002',tenantGuid:refs.get(domain),subdomain:domain});
 const change=(domain,patch)=>manager.runTenantOperation(domain,async()=>{
   const db=await manager.getConnectionForTenant(domain,cfg(domain));await initializer.initialize(db);
   return initializer.getModel(T.USERS).update(patch,{where:{guid:'700002'}});
 });
 await Promise.all(Array.from({length:12},(_,i)=>verify(identity(i%2?A:B))));
 await change(A,{active:false});
 try{await assert.rejects(verify(identity(A)),e=>e.status===401);await verify(identity(B));}
 finally{await change(A,{active:true});}
 await change(A,{deleted_at:new Date()});
 try{await assert.rejects(verify(identity(A)),e=>e.status===401);await verify(identity(B));}
 finally{await change(A,{deleted_at:null});}
 masterActive=false;let before=wire.length;
 try{await assert.rejects(verify(identity(A)),e=>e.status===401);assert.equal(wire.length,before);}
 finally{masterActive=true;}
 cacheContradiction=true;before=wire.length;
 try{await assert.rejects(verify(identity(A)),e=>e.status===401);assert.equal(wire.length,before);}
 finally{cacheContradiction=false;}
 assert.throws(()=>manager.getCurrentTenant(),/TENANT_CONTEXT_MISSING/);
 console.log('PASS LOT3 ACTIVE ACCOUNT: actual resolver/User/Sequelize/pg A/B concurrently; inactive/deleted A denied, B retained; contradictory Master/cache denied before tenant SQL; no context retained');
};
