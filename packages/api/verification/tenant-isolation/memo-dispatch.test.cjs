'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
test('memo request queued in Axios cannot be dispatched using a newer tenant session',async()=>{
  const user={tenant:{guid:'A'},user:{guid:'same-user'},sessionGeneration:1};
  const exports={};let sent=0;
  const axios=require('axios');
  const realCreate=axios.create.bind(axios);
  const fakeAxios={...axios,create(config){return realCreate({...config,adapter:async config=>{sent++;return {status:200,statusText:'OK',data:{success:true},headers:{},config};}});}};
  const source=fs.readFileSync(path.join(__dirname,'../../../cloud/src/tools/Fetch.Client.ts'),'utf8').replaceAll('import.meta.env','({VITE_URL:"fixture.invalid"})');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,localStorage:{getItem:()=>null},require(name){
      if(name==='axios')return {__esModule:true,default:fakeAxios};
      if(name==='@/stores/userStore')return {useUserStore:()=>user};
      if(name==='@/service/IntegratorService')return {integratorStorage:{context:()=>null,token:()=>null}};
      throw Error('IMPORT_DENIED '+name);
    }
  },{timeout:3000});
  const request=exports.apiRequest({path:'/memo/list',method:'GET'});
  user.tenant={guid:'B'};user.sessionGeneration++;
  await assert.rejects(request,e=>e.code==='memo_session_changed');
  assert.equal(sent,0);
});
