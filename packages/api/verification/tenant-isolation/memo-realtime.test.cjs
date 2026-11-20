'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
test('memo socket: old pending tickets, callbacks and refresh never reconnect a newer session',async()=>{
  const tickets=[],sockets=[];
  const exports={};
  const source=fs.readFileSync(path.join(__dirname,'../../../cloud/src/service/MemoRealtimeService.ts'),'utf8')
    .replaceAll('import.meta.env','({})'); // Explicit fictitious build environment.
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,URL,window:{location:{origin:'https://fixture.invalid'}},require(name){
      if(name==='@/tools/Fetch.Client')return {default:{defaults:{baseURL:'https://fixture.invalid'}}};
      if(name==='@/service/MemoService')return {default:{createRealtimeTicket(){let resolve;const promise=new Promise(r=>resolve=r);tickets.push({resolve});return promise;}}};
      if(name==='socket.io-client')return {io(){const handlers={};const socket={handlers,auth:{},connects:0,connected:false,on(n,f){handlers[n]=f;},connect(){this.connects++;},removeAllListeners(){},disconnect(){}};sockets.push(socket);return socket;}};
      throw Error('IMPORT_DENIED '+name);
    }
  },{timeout:3000});
  const S=exports.default;let changes=0;
  const a=S.connect('same-user',{onChange(){throw Error('old callback');}});
  S.disconnect();
  const b=S.connect('same-user',{onChange(){changes++;}});
  tickets[1].resolve({realtime_ticket:'B-only'});await b;
  tickets[0].resolve({realtime_ticket:'A-only'});await a;
  assert.equal(sockets.length,1);assert.equal(sockets[0].connects,1);
  const old=sockets[0];const refresh=old.handlers.connect_error(Error('memo_bridge_ticket_invalid'));
  S.disconnect();const next=S.connect('same-user',{onChange(){changes++;}});
  tickets[3].resolve({realtime_ticket:'new-session'});await next;
  tickets[2].resolve({realtime_ticket:'stale-refresh'});await refresh;
  assert.equal(sockets[1].connects,1);assert.equal(sockets[1].auth.realtimeTicket,undefined); // io options own initial auth.
  await old.handlers['memo:changed']({guid:'same-guid'});assert.equal(changes,0);
  await sockets[1].handlers['memo:changed']({guid:'same-guid'});assert.equal(changes,1);
  S.disconnect();
});
