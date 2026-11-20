'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parse,compileScript}=require('@vue/compiler-sfc'),ts=require('typescript'),vue=require('vue');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function setup(name,props,{memo,service,user={}}){
  const disposed=[],exports={},emitted=[];
  const file=path.join(__dirname,'../../../cloud/src/views/memo',name+'.vue');
  const compiled=compileScript(parse(fs.readFileSync(file,'utf8'),{filename:file}).descriptor,{id:'fixture'}).content;
  const deps={vue:{...vue,onMounted(){},onUnmounted(f){disposed.push(f);}},
    '@/stores/memoStore':{useMemoStore:()=>memo},'@/stores/userStore':{useUserStore:()=>user},
    '@/service/MemoService':{default:service},'@/utils/memoLexicon':{formatMemoMessage:x=>x,formatMemoTitle:x=>x},
    'vue-router':{useRouter:()=>({})},'@/stores/teamStore':{useTeamStore:()=>({team:[],loadTeam:async()=>{}})},
    './memoChat.vue':{default:{}},'./AuthenticatedMedia.vue':{default:{}},'../../assets/css/toke-memo-08.css':{}};
  vm.runInNewContext(ts.transpileModule(compiled,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,Date,Map,URL:{createObjectURL(){throw Error('STALE_BLOB_CREATED');},revokeObjectURL(){}},
    console,require(n){assert.ok(Object.hasOwn(deps,n),'IMPORT_DENIED '+n);return deps[n];}
  },{timeout:3000});
  const state=exports.default.setup(props,{expose(){},emit(...args){emitted.push(args);}});
  return {state,emitted,unmount(){disposed.forEach(f=>f());}};
}
test('memo detail component ignores pending load after session change and unmount',async()=>{
  const wait=deferred();const memo={sessionKey:'A',isCacheValid:true,getMemoByGuid:()=>null,refreshMemo:()=>wait.promise};
  const c=setup('memoDetailChat',{memoGuid:'same',managerGuid:'manager'},{memo,service:{}});
  const load=c.state.chargerMemo();memo.sessionKey='B';c.unmount();wait.resolve({guid:'same',titre:'old A'});await load;
  assert.equal(c.state.memo.value,null);assert.equal(c.emitted.length,0);
});
test('authenticated media never creates a blob URL for an old session response',async()=>{
  const wait=deferred();const memo={sessionKey:'A'};
  const c=setup('AuthenticatedMedia',{url:'/fixture.png'},{memo,service:{loadFiles:()=>wait.promise}});
  const load=c.state.loadMedia();memo.sessionKey='B';c.unmount();wait.resolve({});await load;
  assert.equal(c.state.mediaUrl.value,undefined);
});
