'use strict';
// Creates its OWN Unix-only Redis. Cannot target an existing server or load .env.
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path'),{spawn}=require('node:child_process');
async function main(){
  if(process.argv.length!==3||process.argv[2]!=='--create-disposable-redis')throw Error('Explicit --create-disposable-redis required');
  const dir=fs.mkdtempSync('/tmp/toke-l3-redis-');fs.chmodSync(dir,0o700);
  const nonce=crypto.randomBytes(24).toString('hex');fs.writeFileSync(path.join(dir,'owner'),nonce,{mode:0o600});
  const socket=path.join(dir,'redis.sock');let server,test,log='';
  const finish=async(child)=>{if(child?.pid&&child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}};
  try{
    server=spawn('redis-server',['--port','0','--unixsocket',socket,'--unixsocketperm','700','--save','','--appendonly','no','--dir',dir],{
      env:{PATH:process.env.PATH},stdio:['ignore','pipe','pipe']});
    server.on('error',e=>{log=e.message;});server.stdout.on('data',x=>{log+=x;});server.stderr.on('data',x=>{log+=x;});
    for(let i=0;i<100&&!fs.existsSync(socket)&&server.exitCode===null;i++)await new Promise(r=>setTimeout(r,20));
    if(!fs.existsSync(socket))throw Error('ISOLATED_REDIS_UNAVAILABLE '+log);
    if(fs.readFileSync(path.join(dir,'owner'),'utf8')!==nonce)throw Error('OWNER_MISMATCH');
    test=spawn(process.execPath,[path.join(__dirname,'scenarios.cjs'),dir,nonce],{
      env:{PATH:process.env.PATH,NODE_ENV:'test'},stdio:'inherit'});
    process.exitCode=await new Promise((resolve,reject)=>{test.once('error',reject);test.once('exit',(code)=>resolve(code??1));});
  }finally{
    await finish(test);await finish(server);
    if(fs.readFileSync(path.join(dir,'owner'),'utf8')!==nonce)throw Error('OWNER_MISMATCH');
    fs.rmSync(dir,{recursive:true});console.log('CLEANUP: owned Redis stopped; private cluster removed; no TCP listener');
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
