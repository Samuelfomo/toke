const {spawnSync}=require('node:child_process');const path=require('node:path');
const tests=['views','payments','money','cash','cash-route','seats'].map(name=>path.join(__dirname,'../tests',name+'.test.cjs'));
for(const name of ['alert-group-migration','employee-leave','renewal-preview','renewal-preparation','scheduled-activation','seat-rollover','cash-installment'])tests.push(path.join(__dirname,name+'.test.cjs'));
for(const file of tests){const result=spawnSync(process.execPath,[file],{stdio:'inherit'});if(result.error||result.status!==0){process.exitCode=1;break;}}
