'use strict';
// Compile sources only, never import an application server or load .env.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../../..');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'toke-types-build-'));
for(const name of ['shared','api','backend']){
  const config=path.join(temporary,name+'.json');
  fs.writeFileSync(config,JSON.stringify({extends:path.join(root,'packages',name,'tsconfig.json'),compilerOptions:{
    outDir:path.join(temporary,name),incremental:false,baseUrl:root,
    typeRoots:[path.join(root,'node_modules/@types')],
    ...(name==='shared'?{}:{paths:{'@toke/shared':[path.join(temporary,'shared/index.d.ts')],
      '@toke/api/dist/*':[path.join(temporary,'api/*')]}})
  }}));
  const result=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),'-p',config],{
    stdio:'inherit',env:{PATH:process.env.PATH,NODE_ENV:'test'}
  });
  if(result.status!==0){process.exitCode=result.status||1;console.error('FAIL TYPE BUILD '+name);break;}
  console.log('PASS TYPE BUILD '+name);
}
console.log('LOCAL_ONLY_TYPE_ARTIFACTS '+temporary);
