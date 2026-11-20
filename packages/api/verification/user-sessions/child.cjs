'use strict';
const fs=require('node:fs'),path=require('node:path'),Redis=require('ioredis');
const [dir,nonce]=process.argv.slice(2);
if(!/^\/tmp\/toke-l3-redis-[A-Za-z0-9]+$/.test(dir)||fs.readFileSync(path.join(dir,'owner'),'utf8')!==nonce)throw Error('ISOLATION_DENIED');
const redis=new Redis({path:path.join(dir,'redis.sock'),enableOfflineQueue:false,lazyConnect:true,retryStrategy:()=>null});
const load=require('./load.cjs')();const {UserSessionAuthority}=load('packages/api/src/tools/user-session.authority.ts');
const authority=new UserSessionAuthority(redis,'FAKE_ONLY_SESSION_KEY_01234567890123456789',async()=>{});
redis.connect().then(()=>{process.send({ready:true});process.once('message',async({otp})=>{
  try{await authority.consume(otp);process.send({status:200});}catch(e){process.send({status:e.status||500});}
  finally{redis.disconnect();process.disconnect();}
});}).catch(()=>process.exit(1));
