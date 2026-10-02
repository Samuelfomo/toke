const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
let source=stripTypeScriptTypes(fs.readFileSync(require('node:path').join(__dirname,'../master/services/commercial-transition.ts'),'utf8'),{mode:'transform'}).replace(/export /g,'');
source+='\nthis.api={applyCommercialTransition,expireCommercialTransitions};';
const context={};vm.createContext(context);vm.runInContext(source,context);
const {applyCommercialTransition,expireCommercialTransitions}=context.api;
function fixture(){
 const state={license:{id:1,tenant:14,guid:100020,license_status:'ACTIVE',minimum_seats:5,base_price_usd:'199.99'},transitions:[],expiries:[],paid:false};
 const db={async transaction(fn){const snapshot=JSON.stringify(state);try{return await fn({});}catch(e){Object.assign(state,JSON.parse(snapshot));throw e;}},async query(sql,{replacements:r={}}={}){
  if(sql.includes('SELECT id FROM xa_tenant'))return [[{id:14}]];
  if(sql.includes('SELECT * FROM xa_global_license'))return [[state.license]];
  if(sql.includes('SELECT * FROM xa_commercial_transition'))return [state.transitions];
  if(sql.includes(' AS allowed'))return [[{allowed:true}]];
  if(sql.includes('FROM xa_paid_seat_grant'))return [state.paid?[{id:1}]:[]];
  if(sql.includes('SELECT id FROM xa_renewal_preparation'))return [[]];
  if(sql.includes('COUNT(*)'))return [[{count:2}]];
  if(sql.includes('SET base_price_usd')){state.license={...state.license,base_price_usd:r.price,current_period_start:r.start,current_period_end:r.end,next_renewal_date:r.end};return [[state.license]];}
  if(sql.includes('INSERT INTO xa_commercial_transition(')){state.transitions.push({id:1,global_license:1,idempotency_key:r.key,actor_user_guid:r.actor,actor_tenant_guid:r.actorTenant,unit_price_usd:r.price,valid_from:r.start,valid_until:r.end,reason:r.reason});return [[]];}
  if(sql.includes('SELECT gl.*'))return [state.expiries.length?[]:[{...state.license,transition_id:1}]];
  if(sql.includes("license_status='EXPIRED'")){state.license={...state.license,license_status:'EXPIRED'};return [[state.license]];}
  if(sql.includes('INSERT INTO xa_commercial_transition_expiry')){state.expiries.push(r);return [[]];}
  throw Error('Unexpected SQL: '+sql);
 }};return {state,db};
}
(async()=>{
 const input={tenantGuids:[100014],actorUserGuid:'7173056141612204',actorTenantGuid:100014,validFrom:new Date('2026-10-01T00:00:00+01:00'),validUntil:new Date('2026-11-01T00:00:00+01:00'),unitPriceUsd:'3.00',reason:'Octobre offert',key:'TEST'};
 const f=fixture();const [first]=await applyCommercialTransition(f.db,input);assert.equal(first.offered_seats,5);assert.equal(f.state.license.base_price_usd,'3.00');
 assert.equal((await applyCommercialTransition(f.db,input))[0].replayed,true);
 await assert.rejects(()=>applyCommercialTransition(f.db,{...input,unitPriceUsd:'4.00'}),/conflict/);
 assert.equal(f.state.transitions.length,1);
 assert.equal(await expireCommercialTransitions(f.db),1);assert.equal(f.state.license.license_status,'EXPIRED');assert.equal(await expireCommercialTransitions(f.db),0);
 const paid=fixture();paid.state.paid=true;assert.equal(await expireCommercialTransitions(paid.db),1);assert.equal(paid.state.license.license_status,'ACTIVE');
 const suspended=fixture();suspended.state.license.license_status='SUSPENDED';await assert.rejects(()=>applyCommercialTransition(suspended.db,input),/restriction/);await expireCommercialTransitions(suspended.db);assert.equal(suspended.state.license.license_status,'SUSPENDED');
 console.log('PASS : tarif, minimum, auteur, rejeu, conflit, expiration, paiement et restriction technique ; SQL simulé.');
})().catch(e=>{console.error(e);process.exitCode=1;});
