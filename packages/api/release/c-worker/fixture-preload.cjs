'use strict';
// Test-only confinement, never included in the release.
const fs = require('node:fs'),
  path = require('node:path'),
  net = require('node:net'),
  http = require('node:http'),
  https = require('node:https'),
  dns = require('node:dns');
const info = JSON.parse(fs.readFileSync(process.env.C_WORKER_FIXTURE_INFO, 'utf8'));
if (
  !/^\/tmp\/toke-cworker-[A-Za-z0-9]+$/.test(info.root) ||
  fs.readFileSync(path.join(info.root, 'owner'), 'utf8') !== info.nonce
)
  throw Error('FIXTURE_OWNERSHIP_REQUIRED');
const artifactReal = fs.realpathSync(info.artifact);
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  let o = args[0];
  if (Array.isArray(o)) o = o[0];
  const target = typeof o === 'string' ? o : o?.path;
  if (typeof target !== 'string' || !target.startsWith(info.socket + '/.s.PGSQL.'))
    throw Error('FIXTURE_EXTERNAL_NETWORK_DENIED');
  return originalConnect.apply(this, args);
};
http.Server.prototype.listen = https.Server.prototype.listen = function () {
  throw Error('FIXTURE_HTTP_LISTENER_FORBIDDEN');
};
dns.lookup = function () {
  throw Error('FIXTURE_DNS_FORBIDDEN');
};
const guard = (p) => {
  if (typeof p !== 'string') return;
  if (p.startsWith('/opt/toke')) throw Error('FIXTURE_REAL_CACHE_FORBIDDEN');
  if (
    path.basename(p).startsWith('.env') &&
    ((p !== path.join(info.artifact, '.env') && p !== path.join(artifactReal, '.env')) ||
      fs.existsSync(p))
  )
    throw Error('FIXTURE_ENV_FILE_FORBIDDEN');
};
for (const method of ['readFileSync', 'readFile']) {
  const original = fs[method];
  fs[method] = function (p, ...args) {
    guard(p);
    return original.call(this, p, ...args);
  };
}
const read = fs.promises.readFile;
fs.promises.readFile = function (p, ...args) {
  guard(p);
  return read.call(this, p, ...args);
};

// CJS packages must resolve inside the relocated artifact, never a global/workspace fallback.
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (...args) {
  const result = resolve.apply(this, args);
  if (
    typeof result === 'string' &&
    path.isAbsolute(result) &&
    !fs.realpathSync(result).startsWith(artifactReal + path.sep) &&
    result !== path.join(__dirname, 'fixture-driver.mjs')
  )
    throw Error('FIXTURE_DEPENDENCY_ESCAPE ' + result);
  return result;
};
