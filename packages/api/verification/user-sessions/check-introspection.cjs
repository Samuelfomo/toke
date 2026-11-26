'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { createHmac } = require('node:crypto');
const dotenv = require('dotenv');

const clients = ['api-backend', 'api-tenant'];
const fields = ['USER_SESSION_MASTER_URL', 'USER_SESSION_SERVICE_KEY', 'USER_SESSION_SERVICE_SECRET'];
const processes = ['api-master', ...clients];

function pm2Processes() {
  return JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
}

function config(app, useFile = false) {
  const env = app.pm2_env;
  const file = path.join(env.pm_cwd, '.env');
  const defaults = fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
  const keys = app.name === 'api-master' ? ['USER_SESSION_SERVICE_KEYS'] : fields;
  return Object.fromEntries(keys.map(key => [key,
    String(useFile ? defaults[key] ?? '' : env[key] ?? env.env?.[key] ?? defaults[key] ?? '').trim(),
  ]));
}

function masterUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error('invalid_url');
  return url;
}

function restart(name, values) {
  const runtime = Object.fromEntries(['PATH', 'HOME', 'USER', 'PM2_HOME']
    .filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
  execFileSync('pm2', ['restart', name, '--update-env'], { env: { ...runtime, ...values }, stdio: 'pipe' });
}

async function probe(config) {
  if (fields.some(key => !config[key])) return 'configuration_missing';
  let url;
  try { url = masterUrl(config.USER_SESSION_MASTER_URL); } catch { return 'configuration_invalid'; }
  const timestamp = String(Math.floor(Date.now() / 1000));
  const key = config.USER_SESSION_SERVICE_KEY;
  const signature = createHmac('sha256', Buffer.from(config.USER_SESSION_SERVICE_SECRET, 'base64'))
    .update(key + timestamp).digest('base64');
  try {
    const response = await fetch(url.href.replace(/\/$/, '') + '/auth/session/introspect', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(3000),
      headers: { 'Content-Type': 'application/json', 'x-api-key': key,
        'x-api-timestamp': timestamp, 'x-api-signature': signature },
      // Deliberately invalid body to test the technical guard without opening Redis.
      body: JSON.stringify({ token: null, tenantGuid: '100014' }),
    });
    const code = (await response.json().catch(() => null))?.error?.code;
    if (response.status === 401 && code === 'invalid_user_session') return 'technical_credentials_accepted';
    if (code === 'session_service_unauthorized' || code === 'session_service_configuration_missing')
      return code;
    return 'unexpected_http_' + response.status;
  } catch { return 'master_unreachable'; }
}

async function main() {
  const apps = pm2Processes();
  const [mode, name] = process.argv.slice(2);
  if (mode === '--repair-tenant' && name === undefined) {
    await repairTenant(apps);
    return;
  }
  if (mode === '--reload' && processes.includes(name)) {
    const selected = apps.filter(app => app.name === name);
    if (selected.length !== 1) throw new Error('ambiguous_process');
    const values = config(selected[0], true);
    if (Object.values(values).some(value => !value)) throw new Error('missing_dotenv_value');
    if (name !== 'api-master') {
      masterUrl(values.USER_SESSION_MASTER_URL);
      if (await probe(values) !== 'technical_credentials_accepted')
        throw new Error('new_credentials_not_accepted_by_master');
    }
    restart(name, values);
    console.log(name + ': restarted');
    return;
  }
  if (mode !== undefined) throw new Error('invalid_arguments');
  const masters = apps.filter(app => app.name === 'api-master');
  const master = masters.length === 1 ? masters[0] : null;
  const allowlist = master ? config(master).USER_SESSION_SERVICE_KEYS.split(',').map(key => key.trim()) : null;
  let registry = null;
  if (master) {
    try { registry = JSON.parse(fs.readFileSync(path.join(master.pm2_env.pm_cwd, 'cache', 'clients.json'))); }
    catch { /* The online probe remains authoritative. */ }
  }
  for (const name of processes) {
    const matches = apps.filter(app => app.name === name);
    if (!matches.length) console.log(JSON.stringify({ service: name, present: false }));
    for (const app of matches) {
      const values = config(app);
      const fileValues = config(app, true);
      const result = { service: name, id: app.pm_id, cwd: app.pm2_env.pm_cwd,
        status: app.pm2_env.status, production: app.pm2_env.NODE_ENV === 'production',
        overridesDotenv: Object.keys(values).some(key => fileValues[key] && values[key] !== fileValues[key]) };
      if (name === 'api-master') result.allowlistConfigured = Boolean(values.USER_SESSION_SERVICE_KEYS);
      else {
        result.keyAllowlistedOnLocalMaster = allowlist && Boolean(values.USER_SESSION_SERVICE_KEY) &&
          allowlist.includes(values.USER_SESSION_SERVICE_KEY);
        if (registry) {
          const entry = Object.hasOwn(registry, values.USER_SESSION_SERVICE_KEY)
            ? registry[values.USER_SESSION_SERVICE_KEY] : null;
          result.localRegistryClientActive = entry?.active === true;
          result.localRegistrySignatureMatches = Boolean(entry?.secret && values.USER_SESSION_SERVICE_SECRET &&
            Buffer.from(entry.secret, 'base64').equals(Buffer.from(values.USER_SESSION_SERVICE_SECRET, 'base64')));
        }
        result.probe = await probe(values);
      }
      console.log(JSON.stringify(result));
    }
  }
}

function onlyProcess(apps, name) {
  const matches = apps.filter(app => app.name === name && app.pm2_env.status === 'online');
  if (matches.length !== 1 || apps.filter(app => app.name === name).length !== 1)
    throw new Error('ambiguous_process');
  return matches[0];
}

function persistTenantCredentials(file, credentials) {
  const original = fs.readFileSync(file, 'utf8');
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.uid !== process.getuid()) throw new Error('tenant_env_owner_mismatch');
  const parsed = dotenv.parse(original);
  let revised = original;
  for (const [key, value] of Object.entries(credentials)) {
    const pattern = new RegExp(`^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*(?:=|:[ \\t]+)[^\\r\\n]*`, 'gm');
    const definitions = [...original.matchAll(pattern)];
    if (definitions.length > 1 || (definitions.length === 1 && dotenv.parse(definitions[0][0])[key] !== parsed[key]))
      throw new Error('unsupported_tenant_env_definition');
    const assignment = `${key}="${value}"`;
    revised = definitions.length ? revised.replace(pattern, () => assignment) : revised.trimEnd() + '\n' + assignment + '\n';
  }
  const updated = dotenv.parse(revised);
  if (Object.entries(parsed).some(([key, value]) => updated[key] !== (credentials[key] ?? value)) ||
      Object.entries(credentials).some(([key, value]) => updated[key] !== value))
    throw new Error('unsupported_tenant_env_definition');
  if (revised === original) return;

  const dir = fs.mkdtempSync(path.join(path.dirname(file), '.introspection-'));
  try {
    const temp = path.join(dir, 'env');
    fs.writeFileSync(temp, revised, { flag: 'wx', mode: 0o600 });
    fs.chownSync(temp, stat.uid, stat.gid);
    fs.chmodSync(temp, stat.mode & 0o660);
    if (fs.readFileSync(file, 'utf8') !== original) throw new Error('tenant_env_changed');
    fs.renameSync(temp, file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function repairTenant(apps) {
  const master = onlyProcess(apps, 'api-master');
  const bff = onlyProcess(apps, 'api-backend');
  const tenant = onlyProcess(apps, 'api-tenant');
  const trusted = config(bff);
  const current = config(tenant);
  const key = current.USER_SESSION_SERVICE_KEY;
  const allowlist = config(master).USER_SESSION_SERVICE_KEYS.split(',').map(value => value.trim());
  if (!/^[A-Za-z0-9._~+/=-]+$/.test(key) || !allowlist.includes(key)) throw new Error('tenant_key_not_allowlisted');
  if (masterUrl(current.USER_SESSION_MASTER_URL).href.replace(/\/$/, '') !==
      masterUrl(trusted.USER_SESSION_MASTER_URL).href.replace(/\/$/, '') ||
      await probe(trusted) !== 'technical_credentials_accepted')
    throw new Error('master_target_not_confirmed');
  const registry = JSON.parse(fs.readFileSync(path.join(master.pm2_env.pm_cwd, 'cache', 'clients.json'), 'utf8'));
  const record = Object.hasOwn(registry, key) ? registry[key] : null;
  const secret = record?.secret;
  if (record?.active !== true || typeof secret !== 'string' || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(secret) ||
      !Buffer.from(secret, 'base64').length)
    throw new Error('tenant_registry_secret_unavailable');
  const credentials = { USER_SESSION_SERVICE_KEY: key, USER_SESSION_SERVICE_SECRET: secret };
  if (await probe({ ...current, ...credentials }) !== 'technical_credentials_accepted')
    throw new Error('new_credentials_not_accepted_by_master');

  const file = fs.realpathSync(path.join(tenant.pm2_env.pm_cwd, '.env'));
  if (fs.existsSync(path.join(bff.pm2_env.pm_cwd, '.env')) &&
      file === fs.realpathSync(path.join(bff.pm2_env.pm_cwd, '.env')))
    throw new Error('shared_bff_env');
  persistTenantCredentials(file, credentials);
  if (current.USER_SESSION_SERVICE_SECRET !== secret) {
    console.log('api-tenant: configuration persistée');
    restart('api-tenant', credentials);
  }
  let effective = pm2Processes();
  for (let retry = 0; retry < 10 && !effective.some(app =>
    app.name === 'api-tenant' && app.pm2_env.status === 'online'); retry++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    effective = pm2Processes();
  }
  const checks = await Promise.all(clients.map(async service => ({
    service, probe: await probe(config(onlyProcess(effective, service))),
  })));
  for (const result of checks) console.log(JSON.stringify(result));
  if (checks.some(result => result.probe !== 'technical_credentials_accepted')) process.exitCode = 1;
}

main().catch(error => {
  const safe = ['ambiguous_process', 'missing_dotenv_value', 'new_credentials_not_accepted_by_master', 'invalid_arguments',
    'tenant_key_not_allowlisted', 'master_target_not_confirmed', 'tenant_registry_secret_unavailable',
    'tenant_env_owner_mismatch', 'unsupported_tenant_env_definition', 'tenant_env_changed', 'shared_bff_env'];
  console.error(safe.includes(error.message) ? error.message : 'Vérification PM2 impossible');
  process.exitCode = 1;
});
