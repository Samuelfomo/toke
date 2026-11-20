'use strict';
// Offline filesystem verification only; never imports or starts the worker.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const base=path.resolve(process.argv[2]??path.join(__dirname,'..'));
const manifest=JSON.parse(fs.readFileSync(path.join(base,'DELIVERY_MANIFEST.json'),'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 const f=path.join(dir,e.name);assert.ok(!e.isSymbolicLink(),'unexpected symlink');assert.ok(!e.name.startsWith('.env'),'env file forbidden');
 return e.isDirectory()?walk(f):[path.relative(base,f)];
});}
const actual=walk(base).sort(),expected=[...Object.keys(manifest.files),'DELIVERY_MANIFEST.json','SHA256SUMS'].sort();
assert.deepEqual(actual,expected,'added/missing delivery file');
for(const [file,expectedHash]of Object.entries(manifest.files)){
 assert.ok(!path.isAbsolute(file)&&!file.split('/').includes('..'),'unsafe manifest path');
 assert.equal(hash(path.join(base,file)),expectedHash,file);
}
assert.equal(hash(path.join(base,'worker/MANIFEST.json')),'139115cf53b1cdd42f9c0d65db3a05b7badf48b8dc8d3a1dae2b60ce129db536');
const candidate=JSON.parse(fs.readFileSync(path.join(base,'worker/MANIFEST.json'),'utf8'));
for(const [file,expectedHash]of Object.entries(candidate.files))assert.equal(hash(path.join(base,'worker',file)),expectedHash,file);
console.log('DELIVERY_INTEGRITY_OK; RC5_UNCHANGED; NO_WORKER_STARTED');
