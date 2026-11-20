import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export class SessionError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}
export interface SessionPrincipal {
  v: 2; kind: 'manager'; iss: 'toke-master'; aud: 'toke-user-session'; kid: 'v2';
  sid: string; userGuid: string; tenantGuid: string; subdomain: string; iat: number; exp: number;
}
export interface ManagerChallenge {
  user: { guid: string | number; [key: string]: unknown };
  tenant: { guid: string | number; subdomain: string; [key: string]: unknown };
}
export interface SessionRedis {
  get(key: string): Promise<string | null>;
  eval(script: string, numberOfKeys: number, ...args: (string | number)[]): Promise<unknown>;
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const validId = (value: unknown): value is string => typeof value === 'string' && /^[1-9][0-9]{0,29}$/.test(value);
// User.guid is VARCHAR(255): current rows may use numeric GUIDs (including the
// generator's leading zero) or UUIDs from the model's UUIDV4 default.
const validUserGuid = (value: unknown): value is string => typeof value === 'string' && value.length <= 255 &&
  (/^[0-9]+$/.test(value) || /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value));
const prefix = 'toke:auth:{manager-v2}:'; // Shared hash slot for atomic scripts, including Redis Cluster.

/** No env, network or DB at import time. Only Master may construct an authority. */
export class UserSessionAuthority {
  constructor(private readonly redis: SessionRedis, private readonly secret: string,
    private readonly active: (identity: { userGuid: string; tenantGuid: string; subdomain: string }) => Promise<void>,
    private readonly clock: () => number = () => Math.floor(Date.now() / 1000)) {
    if (Buffer.byteLength(secret) < 32) throw new SessionError(503, 'session_configuration_invalid');
  }
  private digest(value: string) { return createHmac('sha256', this.secret).update(value).digest('hex'); }
  private async command<T>(work: () => Promise<T>): Promise<T> {
    try { return await work(); } catch (error) {
      if (error instanceof SessionError) throw error;
      throw new SessionError(503, 'session_registry_unavailable');
    }
  }
  private identity(data: ManagerChallenge) {
    const identity = { userGuid: String(data.user?.guid ?? ''), tenantGuid: String(data.tenant?.guid ?? ''), subdomain: data.tenant?.subdomain };
    if (!validUserGuid(identity.userGuid) || !validId(identity.tenantGuid) ||
      typeof identity.subdomain !== 'string' || !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/.test(identity.subdomain))
      throw new SessionError(401, 'invalid_session_identity');
    return identity;
  }
  async limit(bucket: string, maximum: number, seconds: number): Promise<void> {
    const count = await this.command(() => this.redis.eval(`local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n`, 1,
      prefix + 'limit:' + hash(bucket), seconds));
    if (Number(count) > maximum) throw new SessionError(429, 'session_rate_limited');
  }
  async issueChallenge(email: string, data: ManagerChallenge): Promise<string> {
    this.identity(data);
    const index = prefix + 'challenge-email:' + this.digest(email.toLowerCase());
    const raw = JSON.stringify({ data, nonce: randomBytes(32).toString('hex') });
    for (let attempt = 0; attempt < 10; attempt++) {
      const otp = String(randomInt(0, 1000000)).padStart(6, '0');
      const key = prefix + 'challenge:' + this.digest(otp);
      const ok = await this.command(() => this.redis.eval(`
        if redis.call('EXISTS',KEYS[1])==1 then return 0 end
        local old=redis.call('GET',KEYS[2]);
        redis.call('SET',KEYS[1],ARGV[1],'EX',300);
        redis.call('SET',KEYS[2],KEYS[1],'EX',300);
        if old and old~=KEYS[1] then redis.call('DEL',old) end; return 1`, 2, key, index, raw));
      if (Number(ok) === 1) return otp;
    }
    throw new SessionError(503, 'otp_generation_failed');
  }
  async pendingChallenge(email: string): Promise<ManagerChallenge | null> {
    const key = await this.command(() => this.redis.get(prefix + 'challenge-email:' + this.digest(email.toLowerCase())));
    if (!key || !key.startsWith(prefix + 'challenge:')) return null;
    const raw = await this.command(() => this.redis.get(key));
    return raw ? JSON.parse(raw).data : null;
  }
  async cancelChallenge(otp: string): Promise<void> {
    await this.command(() => this.redis.eval(`return redis.call('DEL',KEYS[1])`, 1, prefix + 'challenge:' + this.digest(otp)));
  }
  async consume(otp: string): Promise<ManagerChallenge & { access_token: string; token_type: 'Bearer'; expires_in: number }> {
    if (!/^\d{6}$/.test(otp)) throw new SessionError(401, 'otp_invalid_or_expired');
    const key = prefix + 'challenge:' + this.digest(otp);
    const raw = await this.command(() => this.redis.get(key));
    if (!raw) throw new SessionError(401, 'otp_invalid_or_expired');
    const { data } = JSON.parse(raw) as { data: ManagerChallenge };
    const identity = this.identity(data);
    await this.active(identity);
    const now = this.clock();
    const principal: SessionPrincipal = { v: 2, kind: 'manager', iss: 'toke-master', aud: 'toke-user-session', kid: 'v2',
      ...identity, sid: randomBytes(32).toString('base64url'), iat: now, exp: now + 86400 };
    const payload = Buffer.from(JSON.stringify(principal)).toString('base64url');
    const token = payload + '.' + createHmac('sha256', this.secret).update(payload).digest('base64url');
    const record = JSON.stringify({ principal, digest: hash(token), state: 'active' });
    const result = await this.command(() => this.redis.eval(`
      if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end
      if not redis.acl_check_cmd('SET',KEYS[2],ARGV[2],'NX','EX',ARGV[3]) or not redis.acl_check_cmd('DEL',KEYS[1]) then
        return redis.error_reply('SESSION_WRITE_PERMISSION_DENIED') end
      local ok=redis.call('SET',KEYS[2],ARGV[2],'NX','EX',ARGV[3]);
      if not ok then return -1 end
      redis.call('DEL',KEYS[1]); return 1`, 2, key, prefix + 'session:' + hash(principal.sid), raw, record, 86400));
    if (Number(result) !== 1) throw new SessionError(401, 'otp_invalid_or_expired');
    return { ...data, access_token: token, token_type: 'Bearer', expires_in: 86400 };
  }
  private decode(token: string, allowExpired = false): SessionPrincipal {
    if (typeof token !== 'string' || token.length > 4096 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token))
      throw new SessionError(401, 'invalid_user_session');
    const [payload, signature] = token.split('.');
    const expected = createHmac('sha256', this.secret).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected) || actual.toString('base64url') !== signature)
      throw new SessionError(401, 'invalid_user_session');
    let p: SessionPrincipal;
    try { p = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
    catch { throw new SessionError(401, 'invalid_user_session'); }
    if (!p || p.v !== 2 || p.kind !== 'manager' || p.iss !== 'toke-master' || p.aud !== 'toke-user-session' || p.kid !== 'v2' ||
      !validUserGuid(p.userGuid) || !validId(p.tenantGuid) || typeof p.subdomain !== 'string' || !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/.test(p.subdomain) ||
      typeof p.sid !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(p.sid) || !Number.isSafeInteger(p.iat) || !Number.isSafeInteger(p.exp) ||
      p.iat < 0 || p.iat > this.clock() + 30 || p.exp <= p.iat || p.exp - p.iat > 86400 || (!allowExpired && p.exp <= this.clock()))
      throw new SessionError(401, 'invalid_user_session');
    return p;
  }
  async introspect(token: string, tenantGuid?: string, subdomain?: string): Promise<Readonly<SessionPrincipal>> {
    const p = this.decode(token);
    if ((!tenantGuid && !subdomain) || (tenantGuid && p.tenantGuid !== tenantGuid) || (subdomain && p.subdomain !== subdomain))
      throw new SessionError(403, 'tenant_session_mismatch');
    const raw = await this.command(() => this.redis.get(prefix + 'session:' + hash(p.sid)));
    if (!raw) throw new SessionError(401, 'invalid_user_session');
    let record;
    try { record = JSON.parse(raw); } catch { throw new SessionError(503, 'session_registry_invalid'); }
    if (record.state !== 'active' || record.digest !== hash(token) || JSON.stringify(record.principal) !== JSON.stringify(p))
      throw new SessionError(401, 'invalid_user_session');
    await this.active(p);
    // An active-user DB check can await: check revocation again before returning.
    if (p.exp <= this.clock() || await this.command(() => this.redis.get(prefix + 'session:' + hash(p.sid))) !== raw)
      throw new SessionError(401, 'invalid_user_session');
    return Object.freeze(p);
  }
  async logout(token: string): Promise<void> {
    const p = this.decode(token, true);
    const result = await this.command(() => this.redis.eval(`
      local raw=redis.call('GET',KEYS[1]); if not raw then return 0 end
      local r=cjson.decode(raw); if r.digest~=ARGV[1] then return -1 end
      r.state='revoked'; local ttl=redis.call('PTTL',KEYS[1]);
      if ttl>0 then redis.call('SET',KEYS[1],cjson.encode(r),'PX',ttl) end; return 1`, 1,
      prefix + 'session:' + hash(p.sid), hash(token)));
    if (Number(result) < 0) throw new SessionError(401, 'invalid_user_session');
  }
}
