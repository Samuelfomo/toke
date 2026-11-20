const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createPinia, setActivePinia } = require('pinia');
function load(file, mocks = {}, fallback) {
  const source = fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8').replaceAll('import.meta.env.VITE_URL', '"unused.invalid"');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('require','module','exports',js)(name => {
    if (name === 'pinia' || name === 'vue') return require(name);
    if (name in mocks) return mocks[name];
    if (fallback) return fallback(name);
    throw Error(`Unexpected dependency ${name}`);
  }, module, module.exports);
  return module.exports;
}
function storage() { const map=new Map(); return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}; }
const token='c'.repeat(43);
const profile={user:{guid:'7',first_name:'Delegate'},tenant:{guid:'8',subdomain:'tenant.example',name:'Tenant'}};
const context={userGuid:'7',tenantGuid:'8',subdomain:'tenant.example'};
function setup(overrides={}) {
  global.localStorage=storage();global.sessionStorage=storage();setActivePinia(createPinia());
  let session='integrator-session',current=null,clears=0;const calls=[];
  const integratorStorage={token:()=>session,email:()=>'',context:()=>current,setContext:v=>current=v,clearContext:()=>current=null,clear:()=>{session=null;current=null},setToken:v=>session=v};
  const service={
    select:async(...args)=>{calls.push(['select',...args]);return {contextToken:token,expiresIn:3600}},
    tenants:async()=>({tenants:[{guid:'8',subdomain:'tenant.example',name:'Tenant'}]}),responsibles:async()=>({profiles:[{guid:'7'}]}),
    context:async()=>context,profile:async()=>profile,session:async()=>({email:'operator@example.invalid'}),
    leave:async t=>{calls.push(['leave',t,session])},logout:async()=>{},...overrides,
  };
  let integratorModule;
  const users=load('stores/userStore.ts',{
    '../service/UserService':{default:{listSubordinates:async()=>({success:true,data:{hierarchy:[]}})}},
    '@/utils/sessionExpiry':load('utils/sessionExpiry.ts'),
    '@/stores/teamStore':{useTeamStore:()=>({clearCache(){clears++}})},
    './integratorStore':{useIntegratorStore:()=>integratorModule.useIntegratorStore()},
  });
  integratorModule=load('stores/integratorStore.ts',{'@/service/IntegratorService':{IntegratorService:service,integratorStorage},'@/stores/userStore':users});
  const store=integratorModule.useIntegratorStore(),user=users.useUserStore();
  store.selectedTenant={guid:'8',subdomain:'tenant.example',name:'Tenant'};
  let guard;
  load('router.ts',{'@/stores/integratorStore':integratorModule,'@/stores/userStore':users,'vue-router':{createWebHistory:()=>({}),createRouter:()=>({beforeEach(fn){guard=fn}})}} ,()=>({default:{},planningRoutes:[]}));
  return {store,user,calls,integratorStorage,guard,clears:()=>clears};
}
test('selection opens a distinct delegated profile and server-validated dashboard; manager storage untouched',async()=>{
 const c=setup();localStorage.setItem('auth_token','existing-manager-token');localStorage.setItem('authData','original-cache');
 await c.store.enterProfile({guid:'7'});
 assert.equal(c.user.user.guid,'7');assert.equal(c.user.delegatedContext,true);
 assert.equal(localStorage.getItem('auth_token'),'existing-manager-token');assert.equal(localStorage.getItem('authData'),'original-cache');
 let destination='pending';await c.guard({path:'/dashboard',meta:{requiresAuth:true}},{},arg=>destination=arg);
 assert.equal(destination,undefined);assert.equal(c.integratorStorage.context(),token);
});
test('dashboard reload restores profile only through server context validation',async()=>{
 const c=setup();c.integratorStorage.setContext(token);c.store.activeContext=token;
 let destination;await c.guard({path:'/dashboard',meta:{requiresAuth:true}},{},arg=>destination=arg);
 assert.equal(destination,undefined);assert.equal(c.user.user.guid,'7');assert.equal(c.user.delegatedContext,true);
});
for(const [name,overrides] of [
 ['missing context token',{select:async()=>({})}],
 ['missing profile',{profile:async()=>({tenant:profile.tenant})}],
 ['wrong tenant',{context:async()=>({...context,tenantGuid:'99'})}],
 ['wrong user',{context:async()=>({...context,userGuid:'99'})}],
 ['server context refusal',{context:async()=>{throw Error('unauthorized')}}],
])test(name+' cannot open workspace',async()=>{
 const c=setup(overrides);await assert.rejects(c.store.enterProfile({guid:'7'}));
 assert.equal(c.integratorStorage.context(),null);assert.equal(c.user.delegatedContext,false);
 if(name!=='missing context token')assert.equal(c.calls.some(x=>x[0]==='leave'),true);
});
test('leave uses integrator context lifecycle and never revokes manager session',async()=>{
 const c=setup();await c.store.enterProfile({guid:'7'});
 const result=await c.user.logout();
 assert.equal(result.revoked,false);assert.equal(c.user.delegatedContext,false);assert.equal(c.integratorStorage.context(),null);
 assert.deepEqual(c.calls.at(-1),['leave',token,'integrator-session']);assert.equal(c.clears(),2);
});
test('leave failure is propagated and context remains for retry',async()=>{
 const c=setup({leave:async()=>{throw Error('offline')}});await c.store.enterProfile({guid:'7'});
 await assert.rejects(c.store.releaseContext(),/offline/);assert.equal(c.integratorStorage.context(),token);assert.equal(c.user.delegatedContext,true);
});
test('server-rejected dashboard context cannot pass route guard',async()=>{
 let fail=false;const c=setup({context:async()=>{if(fail)throw Error('expired');return context}});
 await c.store.enterProfile({guid:'7'});fail=true;
 let destination;await c.guard({path:'/dashboard',meta:{requiresAuth:true}},{},arg=>destination=arg);
 assert.equal(destination,'/integrateur/tenants');
});
test('actual leave HTTP contract sends integrator bearer and body context, requires 204',async()=>{
 let status=204;const calls=[];
 const client={post:async(...args)=>{calls.push(args);return {status,data:undefined}}};
 const {IntegratorService,integratorStorage}=load('service/IntegratorService.ts',{axios:{default:{create:()=>client}}});
 integratorStorage.setToken('real-integrator-session');await IntegratorService.leave(token);
 assert.deepEqual(calls[0],['/context/leave',{contextToken:token},{headers:{Authorization:'Bearer real-integrator-session'}}]);
 status=200;await assert.rejects(IntegratorService.leave(token),/non confirmée/);
});

test('company selection resolves only a tenant returned by server',async()=>{
 const c=setup();await c.store.loadResponsibles('8');assert.equal(c.store.selectedTenant.subdomain,'tenant.example');assert.equal(c.store.responsibles[0].guid,'7');
 await assert.rejects(c.store.loadResponsibles('999'),/plus disponible/);
});
test('leaving delegated profile restores valid manager cache without revoking it',async()=>{
 const c=setup();const exp=Math.floor(Date.now()/1000)+86400;
 const managerToken=Buffer.from(JSON.stringify({exp})).toString('base64url')+'.signature';
 await c.user.setAuthData({success:true,data:{user:{guid:'manager'},tenant:{guid:'manager-tenant'},access_token:managerToken,expires_in:86400}});
 const original=localStorage.getItem('authData');await c.store.enterProfile({guid:'7'});await c.store.releaseContext();
 assert.equal(c.user.user.guid,'manager');assert.equal(c.user.tenant.guid,'manager-tenant');assert.equal(c.user.isAuthenticated,true);
 assert.equal(localStorage.getItem('auth_token'),managerToken);assert.equal(localStorage.getItem('authData'),original);
});
