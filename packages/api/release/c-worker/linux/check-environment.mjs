// Linux fixture only. Reads candidate bytes, never a Toké configuration.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const candidate='/candidate';
assert.equal(process.platform,'linux');
assert.equal(process.arch,'x64');
assert.equal(process.version,'v20.18.0');
const manifestBytes=fs.readFileSync(path.join(candidate,'MANIFEST.json'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(manifestBytes),'139115cf53b1cdd42f9c0d65db3a05b7badf48b8dc8d3a1dae2b60ce129db536');
const manifest=JSON.parse(manifestBytes);
for(const [file,expected]of Object.entries(manifest.files))assert.equal(hash(fs.readFileSync(path.join(candidate,file))),expected,file);
const require=createRequire(path.join(candidate,'package.json'));
const bcrypt=require('bcrypt');
const nativePath=require('node-gyp-build').path(path.dirname(require.resolve('bcrypt/package.json')));
assert.ok(nativePath.includes('/prebuilds/linux-x64/'));
const sample='C_WORKER_LINUX_FIXTURE_ONLY';
const digest=await bcrypt.hash(sample,4);
assert.equal(await bcrypt.compare(sample,digest),true);
assert.equal(await bcrypt.compare('DIFFERENT_FIXTURE_ONLY',digest),false);
const osRelease=Object.fromEntries(fs.readFileSync('/etc/os-release','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^"|"$/g,'')];}));
assert.equal(osRelease.ID,'ubuntu');assert.equal(osRelease.VERSION_ID,'24.04');
console.log(JSON.stringify({
 os:osRelease.PRETTY_NAME,kernel:os.release(),architecture:process.arch,node:process.version,
 nodeABI:process.versions.modules,napi:process.versions.napi,
 libc:execFileSync('getconf',['GNU_LIBC_VERSION'],{encoding:'utf8'}).trim(),
 postgresql:execFileSync('postgres',['--version'],{encoding:'utf8'}).trim(),
 uid:process.getuid(),interfaces:Object.keys(os.networkInterfaces()),
 originalManifestSHA256:hash(manifestBytes),candidateFilesVerified:Object.keys(manifest.files).length,
 bcryptVersion:require('bcrypt/package.json').version,
 nativeBinary:path.relative(candidate,nativePath),nativeSHA256:hash(fs.readFileSync(nativePath)),
 nativeHashAndCompare:'PASS',candidateUnmodified:true
},null,2));
