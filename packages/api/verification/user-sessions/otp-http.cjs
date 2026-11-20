'use strict';
// Execute the exact selected router registrations, without importing other
// routes, dotenv, databases, SMTP or application entrypoints.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict'),express=require('express'),crypto=require('node:crypto');
module.exports=async function({app,master,masterExports,authority,loadBff,fetch,serviceKey,serviceSecret,profile}){
 const root=path.resolve(__dirname,'../../../..'),messages=new Map();
 const R={handleSuccess:(res,data)=>res.status(200).json({success:true,data}),handleCreated:(res,data)=>res.status(201).json({success:true,data}),handleError:(res,status,error)=>res.status(status).json({success:false,error})};
 const common={Router:express.Router,Ensure:{post:()=>((req,res,next)=>next()),get:()=>((req,res,next)=>next())},R,
  HttpStatus:{SUCCESS:200,CREATED:201,UNAUTHORIZED:401,INTERNAL_ERROR:500,BAD_REQUEST:400},TENANT_CODES:{},TENANT_ERRORS:{},
  TenantValidationUtils:{validateBillingEmail:value=>typeof value==='string'&&value.endsWith('@fiction.invalid'),validateKey:value=>value==='A'}};
 function extract(rel,paths,bindings){
   const source=fs.readFileSync(path.join(root,rel),'utf8'),ast=ts.createSourceFile(rel,source,ts.ScriptTarget.Latest,true),selected=[];
   for(const node of ast.statements){const call=node.expression;if(!call||!ts.isCallExpression(call)||!ts.isPropertyAccessExpression(call.expression)||call.expression.expression.getText(ast)!=='router')continue;const arg=call.arguments[0];if(arg&&ts.isStringLiteral(arg)&&paths.includes(arg.text))selected.push(node.getText(ast));}
   assert.equal(selected.length,paths.length);
   const sandbox={...common,...bindings,exports:{},Buffer,Date,console:{log(){},error(){}}};
   vm.runInNewContext(ts.transpileModule('const router=Router();\n'+selected.join('\n')+'\nexports.router=router;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox,{filename:rel,timeout:3000});
   return sandbox.exports.router;
 }
 const masterRouter=extract('packages/api/src/master/routes/tenant.route.ts',['/auth','/retry','/verify-otp/:otp'],{
   Tenant:{_load:async code=>code==='A'?{getGuid:()=>100001,getSubdomain:()=>profile().tenant.subdomain,toJSON:()=>profile().tenant}:null},
   UserAuthenticationService:{auth:async()=>({status:200,response:profile().user})},
   managerSessionAuthority:async()=>authority,SessionError:masterExports.SessionError,
   sessionFailure:masterExports.sessionFailure,EmailSender:{sender:async(otp,email)=>messages.set(email,otp)},
 });
 app.use('/tenant',masterExports.authenticateSessionService,masterRouter);
 const upstream=async(method,url,body)=>{const timestamp=String(Math.floor(Date.now()/1000));const r=await fetch(master+url,{method,headers:{'content-type':'application/json','x-api-key':serviceKey,'x-api-timestamp':timestamp,'x-api-signature':crypto.createHmac('sha256',Buffer.from(serviceSecret,'base64')).update(serviceKey+timestamp).digest('base64')},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();return{status:r.status,response:data.success?data.data:data};};
 const bffRouter=extract('packages/backend/src/routes/tenant.route.ts',['/auth','/retry','/verify-otp/:otp','/session/logout'],{
   TenantService:{authenticate:body=>upstream('POST','/tenant/auth',body),retryAuthenticate:email=>upstream('POST','/tenant/retry',{email}),loadTenant:otp=>upstream('GET','/tenant/verify-otp/'+otp)},
   UserSessionService:loadBff('packages/backend/src/tools/user.session.ts').UserSessionService,
 });
 app.use('/bff/tenant',bffRouter);
 const call=(url,body,token)=>fetch(master+'/bff/tenant'+url,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 let response=await call('/auth',{email:'http@fiction.invalid',code:'A'});assert.equal(response.status,201);
 const first=messages.get('http@fiction.invalid');assert.match(first,/^\d{6}$/);
 response=await call('/retry',{email:'http@fiction.invalid'});assert.equal(response.status,201);
 const otp=messages.get('http@fiction.invalid');assert.equal((await call('/verify-otp/'+first)).status,401);
 response=await call('/verify-otp/'+otp);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const data=(await response.json()).data;assert.equal(data.user.guid,'200001');assert.equal(String(data.tenant.guid),'100001');assert.equal(data.expires_in,86400);assert.equal(data.token_type,'Bearer');
 await authority.introspect(data.access_token,'100001');assert.equal((await call('/verify-otp/'+otp)).status,401);
 response=await call('/session/logout',{},data.access_token);assert.equal(response.status,200);await assert.rejects(authority.introspect(data.access_token,'100001'),e=>e.status===401);
};
