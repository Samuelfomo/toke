'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'../../../..');
module.exports=function loader({env={},overrides={},fetch:localFetch,shared}={}){
  const cache=new Map();
  const allowed=new Set([
    'packages/api/src/tools/user-session.authority.ts','packages/api/src/tools/user-session.client.ts',
    'packages/api/src/tools/api-key-manager.ts','packages/api/src/master/routes/user-session.route.ts',
    'packages/api/src/middle/manager-session.ts','packages/api/src/tools/credential-extractor.service.ts',
    'packages/backend/src/tools/user.session.ts','packages/backend/src/tools/tenant.config.ts',
    'packages/api/src/tools/user-session.runtime.ts',
  ]);
  function load(rel){
    if(Object.hasOwn(overrides,rel)){const value=overrides[rel];return value&&Object.hasOwn(value,'default')?{__esModule:true,...value}:value;}
    if(!allowed.has(rel))throw Error('SOURCE_DENIED '+rel);
    if(cache.has(rel))return cache.get(rel);
    const exports={};cache.set(rel,exports);
    const source=ts.transpileModule(fs.readFileSync(path.join(root,rel),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    vm.runInNewContext(source,{exports,Buffer,Date,Promise,URL,AbortSignal,fetch:localFetch,console:{log(){},error(){}},
      process:{env:Object.freeze({...env})},require(name){
        if(['node:crypto','crypto','express'].includes(name))return require(name);
        if(name==='@toke/shared')return shared||{HttpStatus:{UNAUTHORIZED:401,FORBIDDEN:403,INTERNAL_ERROR:500}};
        if(name==='ioredis')return class{constructor(){throw Error('REDIS_CONSTRUCTION_DENIED_IN_SOURCE_LOADER');}};
        if(name==='@toke/api/dist/tools/response.js')return {__esModule:true,default:{handleError(res,status,error){res.status(status).json({success:false,error});}}};
        if(name==='@toke/api/dist/tools/glossary.js')return {__esModule:true,default:{}};
        if(name==='@toke/api/dist/tools/user-session.client.js')return load('packages/api/src/tools/user-session.client.ts');
        if(name.startsWith('.'))return load(path.posix.normalize(path.posix.join(path.posix.dirname(rel),name.replace(/\.js$/,'.ts'))));
        throw Error('DEPENDENCY_DENIED '+name);
      }},{filename:rel,timeout:4000});
    return exports;
  }
  return load;
};
