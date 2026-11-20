'use strict';
// Source-only execution: closed imports, fake services/storage, no HTTP or database driver.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const vue = require('vue'), pinia = require('pinia');
const storage = new Map();
const localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) };
function load(file, deps, extra = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText, { exports, require(name) { assert.ok(Object.hasOwn(deps,name),'IMPORT_DENIED: '+name); return deps[name]; },
    Date, Buffer, Map, localStorage, console: {log(){},warn(){},error(){}}, ...extra }, {filename:file, timeout:2000});
  return exports;
}
async function main() {
  let now = Date.now();
  class Clock extends Date { static now(){return now;} }
  const {UserSessionService:S} = load('packages/backend/src/tools/user.session.ts', {'node:crypto':require('node:crypto')},
    {Date:Clock,process:{env:{USER_SESSION_SECRET:'fictitious-local-test-secret-at-least-32-bytes'}}});
  const token = S.create('user-A','tenant-A');
  assert.equal(S.verify(token).tenantGuid,'tenant-A');
  assert.equal(S.verify(token.slice(0,-1)+'!'),null);
  now += 86400 * 1000; assert.equal(S.verify(token),null);
  console.log('PASS: real session source, signature, tenant claim and expiry; no token printed');
  now -= 86400 * 1000;
  const {TenantConfig:C}=load('packages/backend/src/tools/tenant.config.ts',{
    '@toke/shared':{HttpStatus:{UNAUTHORIZED:401,FORBIDDEN:403,INTERNAL_ERROR:500}},
    '@toke/api/dist/tools/response.js':{default:{handleError(res,status){res.status=status;}}},
    '@toke/api/dist/tools/glossary.js':{default:{}},'./user.session.js':{UserSessionService:S}
  });
  const anonymous={headers:{'x-api-client':'tenant-A'}};let next=0;
  await C.authenticate(anonymous,{},()=>next++);
  assert.equal(next,1);assert.equal(anonymous.client.reference,'tenant-A');
  const noToken={header:()=>'',client:{reference:'tenant-A'}}, denied={};
  C.authenticateUser(noToken,denied,()=>assert.fail('anonymous user admitted'));
  assert.equal(denied.status,401);
  const wrongTenant={header:()=>`Bearer ${token}`,client:{reference:'tenant-B'}}, mismatch={};
  C.authenticateUser(wrongTenant,mismatch,()=>assert.fail('foreign session admitted'));
  assert.equal(mismatch.status,403);
  console.log('OBSERVED AUTH GAP: tenant header alone passes authenticate used by /list; authenticateUser refuses absent token and wrong tenant');
  let request;
  const RealService=load('packages/cloud/src/service/MemoService.ts',{
    '@/tools/Fetch.Client':{default:{},apiRequest:async config=>{
      request=config;return {success:true,data:{attachments:[{url:'fixture-only'}]}};
    }}
  },{URLSearchParams,FormData:class {append(){} }}).default;
  await RealService.listMemo('manager-A',{offset:25,limit:25,sort:'oldest',search:'fictitious'});
  assert.ok(request.path.includes('sort=oldest'));assert.ok(request.path.includes('offset=25'));
  assert.equal((await RealService.uploadFile({})).url,'fixture-only');
  assert.equal((await RealService.uploadMultipleFiles([{}]))[0].url,'fixture-only');
  for(const file of ['packages/cloud/src/service/MemoService.ts','packages/cloud/src/stores/memoStore.ts',
    'packages/cloud/src/views/memo/memoSidebar.vue','packages/cloud/src/views/memo/memosView.vue'])
    assert.ok(!fs.readFileSync(path.join(root,file),'utf8').includes("'oldest' | 'name'"));
  console.log('PASS: tri recent/oldest, pagination, single/multiple upload envelopes');
  const container=pinia.createPinia();
  container.use(require('pinia-plugin-persistedstate').default);
  vue.createApp({}).use(container);
  pinia.setActivePinia(container);
  storage.set('memo-store',JSON.stringify({memos:[{guid:'obsolete-A'}]}));
  storage.set('theme','keep');
  const {useUserStore}=load('packages/cloud/src/stores/userStore.ts',{
    pinia,vue,'../service/UserService':{default:{}},'@/stores/teamStore':{useTeamStore:()=>({clearCache(){}})}
  });
  const user=useUserStore();
  function login(tenant){user.sessionGeneration++;user.tenant={guid:tenant};user.user={guid:'manager'};user.isAuthenticated=true;}
  const lists=[],details=[],reads=[],callbacks=[];
  const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {resolve,reject,promise};};
  const service={listMemo(){const d=deferred();lists.push(d);return d.promise;},
    getMemoByGuid(){const d=deferred();details.push(d);return d.promise;},
    markAsRead(){const d=deferred();reads.push(d);return d.promise;}};
  const {useMemoStore}=load('packages/cloud/src/stores/memoStore.ts',{
    pinia,vue,'@/stores/userStore':{useUserStore},'@/service/MemoService':{default:service},
    '@/utils/memoLexicon':{formatMemoMessage:x=>x,formatMemoTitle:x=>x},
    '@/service/MemoRealtimeService':{default:{disconnect(){},async connect(user,c){callbacks.push(c);}}}
  });
  const memo=useMemoStore();
  const row=label=>({guid:'same-guid',title:label,created_at:new Date().toISOString(),memo_content:[],is_read:false});
  const page=label=>({data:{memos:{items:[row(label)],pagination:{total:1}}}});
  login('A');
  let pending=memo.loadMemos('manager');user.logout();lists.at(-1).resolve(page('late A'));await pending;
  assert.equal(memo.memos.length,0);
  assert.ok(S.verify(token),'server token revocation is unchanged, pending lot 3');
  login('A');pending=memo.loadMemos('manager');
  login('B');const b=memo.loadMemos('manager');lists.at(-1).resolve(page('B'));await b;
  lists.at(-2).resolve(page('A'));await pending;assert.equal(memo.memos[0].titre,'B');
  assert.equal(memo.rawData.memos.items[0].title,'B');
  // Same tenant/user, new local session generation still invalidates old results.
  pending=memo.loadMemos('manager',true);login('B');lists.at(-1).resolve(page('old B'));await pending;
  assert.equal(memo.memos.length,0);
  // Even explicit clear invalidates a currently pending request.
  pending=memo.loadMemos('manager');memo.clearCache();lists.at(-1).resolve(page('cleared B'));await pending;
  assert.equal(memo.memos.length,0);
  pending=memo.refreshMemo('manager','same-guid');user.logout();details.at(-1).resolve({data:{memo:row('late detail')}});await pending;
  assert.equal(memo.memos.length,0);
  login('A');pending=memo.loadMemos('manager');lists.at(-1).resolve(page('A'));await pending;
  await memo.startRealtime('manager');const old=callbacks.at(-1);
  const event={guid:'same-guid',affectedUserGuids:['manager'],action:'updated',actorUserGuid:'other'};
  pending=old.onChange(event);user.logout();details.at(-1).resolve({data:{memo:row('late event')}});await pending;
  login('B');pending=memo.loadMemos('manager');lists.at(-1).resolve(page('B'));await pending;
  const calls=details.length;await old.onChange({...event,action:'deleted'});await old.onReconnect();old.onConnectionChange(true);
  assert.equal(memo.memos[0].titre,'B');assert.equal(details.length,calls);assert.equal(memo.isRealtimeConnected,false);
  pending=memo.confirmRead('manager','same-guid');login('A');
  const a=memo.loadMemos('manager');lists.at(-1).resolve(page('new A'));await a;
  reads.at(-1).resolve({success:true});await pending;assert.equal(memo.memos[0].isRead,false);
  assert.equal(memo.$persist,undefined);await vue.nextTick();
  assert.equal(localStorage.getItem('memo-store'),null);assert.equal(localStorage.getItem('theme'),'keep');
  user.logout();assert.equal(memo.memos.length,0);assert.equal(memo.employees.length,0);assert.equal(memo.rawData,null);
  console.log('PASS: real stores/plugin logout, late list/detail/read/event, A→B same user/GUID, new session, explicit clear, no persistence and targeted legacy purge');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
