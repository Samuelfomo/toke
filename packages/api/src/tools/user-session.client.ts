import { createHmac } from 'node:crypto';
import type { SessionPrincipal } from './user-session.authority.js';
import { SessionError } from './user-session.authority.js';

// User.guid is VARCHAR(255), generated as either a numeric string (which may
// start with zero) or a UUID. Tenant GUIDs remain strictly numeric below.
const validUserGuid = (value: unknown): value is string => typeof value === 'string' && value.length <= 255 &&
  (/^[0-9]+$/.test(value) || /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value));

/** Service credentials and human proof travel separately. No dotenv or eager connection. */
export class UserSessionClient {
  private readonly url: string;
  private readonly key: string;
  private readonly secret: string;

  constructor(url: string, key: string, secret: string) {
    this.url = url.trim();
    this.key = key.trim();
    this.secret = secret.trim();
    if (!this.url || !this.key || !this.secret) throw new SessionError(503, 'session_service_configuration_missing');
    let parsed: URL;
    try { parsed = new URL(this.url); }
    catch { throw new SessionError(503, 'session_service_configuration_invalid'); }
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash)
      throw new SessionError(503, 'session_service_configuration_invalid');
  }
  private async request(action: 'introspect' | 'logout', body: object): Promise<any> {
    const timestamp = String(Math.floor(Date.now() / 1000));
    let response: Response;
    try {
      response = await fetch(this.url.replace(/\/$/, '') + '/auth/session/' + action, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(2500),
        headers: { 'content-type': 'application/json', 'x-api-key': this.key, 'x-api-timestamp': timestamp,
          'x-api-signature': createHmac('sha256', Buffer.from(this.secret, 'base64')).update(this.key + timestamp).digest('base64') },
        body: JSON.stringify(body),
      });
    } catch { throw new SessionError(503, 'session_authority_unavailable'); }
    if (!response.ok) {
      // An invalid service credential is an infrastructure failure for the caller,
      // not proof that its user's session expired.
      let code: string | undefined;
      try { code = (await response.json())?.error?.code; } catch { /* Fail closed. */ }
      if (action === 'introspect' &&
          (code === 'session_service_unauthorized' || code === 'session_service_configuration_missing')) {
        throw new SessionError(503, code);
      }
      const status = response.status === 401 && ['invalid_user_session', 'session_account_unavailable'].includes(code || '') ? 401
        : response.status === 403 && code === 'tenant_session_mismatch' ? 403 : 503;
      throw new SessionError(status, status === 503 ? 'session_authority_unavailable' : 'invalid_user_session');
    }
    try { return await response.json(); } catch { throw new SessionError(503, 'session_authority_invalid_response'); }
  }
  async verify(token: string, tenantGuid?: string, subdomain?: string): Promise<Readonly<SessionPrincipal>> {
    const result = await this.request('introspect', { token, tenantGuid, subdomain });
    const p = result?.data?.principal as SessionPrincipal;
    const now = Math.floor(Date.now() / 1000);
    if (!p || p.v !== 2 || p.kind !== 'manager' || p.iss !== 'toke-master' || p.aud !== 'toke-user-session' ||
      p.kid !== 'v2' || !validUserGuid(p.userGuid) ||
      typeof p.tenantGuid !== 'string' || !/^[1-9][0-9]{0,29}$/.test(p.tenantGuid) ||
      typeof p.subdomain !== 'string' || !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/.test(p.subdomain) ||
      typeof p.sid !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(p.sid) ||
      !Number.isSafeInteger(p.iat) || !Number.isSafeInteger(p.exp) || p.iat > now + 30 || p.exp <= now || p.exp <= p.iat || p.exp - p.iat > 86400)
      throw new SessionError(503, 'session_authority_invalid_response');
    if ((!tenantGuid && !subdomain) || (tenantGuid && p.tenantGuid !== tenantGuid) || (subdomain && p.subdomain !== subdomain))
      throw new SessionError(403, 'tenant_session_mismatch');
    return Object.freeze(p);
  }
  async logout(token: string): Promise<void> { await this.request('logout', { token }); }
}
export function sessionClientFromEnvironment(): UserSessionClient {
  return new UserSessionClient(process.env.USER_SESSION_MASTER_URL || '', process.env.USER_SESSION_SERVICE_KEY || '', process.env.USER_SESSION_SERVICE_SECRET || '');
}
