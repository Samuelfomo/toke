'use strict';
// Operator-only read commands. No pm2 main import, daemon launch, environment dump,
// process start/stop, credential/configuration read, or filesystem write.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const [pkgFile,socketPath]=process.argv.slice(2);
if(!pkgFile||!socketPath||!path.isAbsolute(pkgFile)||!path.isAbsolute(socketPath))throw Error('USAGE: node pm2-readonly.cjs <absolute-pm2-package.json> <existing-rpc.sock>');
const metadata=JSON.parse(fs.readFileSync(pkgFile,'utf8'));
if(metadata.name!=='pm2'||!fs.statSync(socketPath).isSocket())throw Error('PM2_EXISTING_PACKAGE_AND_SOCKET_REQUIRED');
const req=createRequire(pkgFile),axon=req('pm2-axon'),rpc=req('pm2-axon-rpc');
const sock=axon.socket('req'),client=new rpc.Client(sock);
let finished=false;
const timeout=setTimeout(()=>finish(true),5000);
function finish(failed,data){if(finished)return;finished=true;clearTimeout(timeout);sock.close();
 if(failed){console.error('PM2_READONLY_UNAVAILABLE: no daemon started; no fallback dump');process.exitCode=1;}
 else console.log(JSON.stringify(data,null,2));
}
sock.on('error',()=>finish(true));
sock.once('connect',()=>client.call('getVersion',{},(error,version)=>{
 if(error)return finish(true);
 client.call('getMonitorData',{},(error,processes)=>{
  if(error||!Array.isArray(processes))return finish(true);
  const matches=processes.filter(p=>p.name==='toke-rotation'||/(?:^|\/)(?:automate|rotation\.cron)\.(?:m?js|cjs)$/.test(p.pm2_env?.pm_exec_path??''));
  const safe=matches.map(p=>{const e=p.pm2_env??{};return {
   name:p.name,namespace:e.namespace??null,pm_id:p.pm_id,pid:p.pid,
   status:e.status,script:e.pm_exec_path,cwd:e.pm_cwd,
   interpreter:e.exec_interpreter,nodeVersionRecorded:e.node_version??null,
   mode:e.exec_mode,instances:e.instances??null,
   kill_timeout:e.kill_timeout??null,autorestart:e.autorestart??null
  };});
  finish(false,{pm2InstalledVersion:metadata.version,pm2DaemonVersion:version,
   scope:'only this existing PM2 daemon; other users/hosts/cron require operator confirmation',
   matchingProcesses:safe,matchingLivePidCount:safe.filter(p=>p.pid>0).length});
 });
}));
sock.connect(socketPath);
