import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export class OnboardingError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}
export type OnboardingClaim = {
  v: 1;
  purpose: 'TENANT_ONBOARDING';
  tenant: number;
  contact: string;
  exp: number;
  nonce: string;
};
export default class TenantOnboardingToken {
  static contact(email: string) {
    return createHmac('sha256', this.secret())
      .update('contact:' + email.trim().toLowerCase())
      .digest('hex');
  }

  static issue(tenant: number, email: string, now = Date.now()) {
    const c: OnboardingClaim = {
      v: 1,
      purpose: 'TENANT_ONBOARDING',
      tenant,
      contact: this.contact(email),
      exp: Math.floor(now / 1000) + 86400,
      nonce: randomBytes(16).toString('hex'),
    };
    const p = Buffer.from(JSON.stringify(c)).toString('base64url');
    return p + '.' + createHmac('sha256', this.secret()).update(p).digest('base64url');
  }

  static verify(token: unknown, now = Date.now()): OnboardingClaim {
    if (typeof token !== 'string' || token.length > 2048)
      throw new OnboardingError('Invalid onboarding link', 401);
    const parts = token.split('.');
    if (parts.length !== 2 || parts.some((p) => !p || !/^[A-Za-z0-9_-]+$/.test(p)))
      throw new OnboardingError('Invalid onboarding link', 401);
    const expected = createHmac('sha256', this.secret()).update(parts[0]).digest();
    const actual = Buffer.from(parts[1], 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new OnboardingError('Invalid onboarding link', 401);
    let c: any;
    try {
      c = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    } catch {
      throw new OnboardingError('Invalid onboarding link', 401);
    }
    if (
      c.v !== 1 ||
      c.purpose !== 'TENANT_ONBOARDING' ||
      !Number.isSafeInteger(c.tenant) ||
      c.tenant < 100000 ||
      c.tenant > 999999 ||
      !Number.isSafeInteger(c.exp) ||
      c.exp <= Math.floor(now / 1000) ||
      c.exp > Math.floor(now / 1000) + 86400 ||
      typeof c.contact !== 'string' ||
      !/^[a-f0-9]{64}$/.test(c.contact) ||
      typeof c.nonce !== 'string' ||
      !/^[a-f0-9]{32}$/.test(c.nonce)
    )
      throw new OnboardingError('Invalid or expired onboarding link', 401);
    return c;
  }

  static url(token: string) {
    const base = process.env.TOKE_ONBOARDING_URL;
    if (!base) throw new OnboardingError('Onboarding URL missing', 503);
    const u = new URL(base);
    if (u.protocol !== 'https:') throw new OnboardingError('HTTPS onboarding URL required', 503);
    u.hash = 'token=' + encodeURIComponent(token);
    return u.toString();
  }

  private static secret() {
    const s = process.env.TOKE_ONBOARDING_SECRET;
    if (!s || Buffer.byteLength(s) < 32)
      throw new OnboardingError('Onboarding configuration unavailable', 503);
    return s;
  }
}
