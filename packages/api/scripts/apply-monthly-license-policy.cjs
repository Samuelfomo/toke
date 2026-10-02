const {Sequelize,QueryTypes}=require('/opt/toke/node_modules/sequelize');
const db=new Sequelize('toke_master','postgres',null,{host:'/var/run/postgresql',port:5432,dialect:'postgres',logging:false});
(async()=>{try{
 if(process.argv[2]!=='--apply')throw Error('Explicit --apply required');
 const [r]=await db.query('SELECT current_database() AS name',{type:QueryTypes.SELECT});if(r.name!=='toke_master')throw Error('Wrong database');
 const {applyMonthlyPolicy}=await import('/opt/toke/packages/api/dist/master/services/monthly-license-policy.js');
 console.table(await applyMonthlyPolicy(db,{tenantGuids:[100014,100001,100016,100008,100017,100020],actorUserGuid:'7173056141612204',actorTenantGuid:100014}));
}catch(e){console.error('ARRÊT :',e.message);process.exitCode=1;}finally{await db.close();}})();
