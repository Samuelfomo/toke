import { createHash } from 'node:crypto';

import Redis from 'ioredis';

type ResendScope = 'CONTACT' | 'IP';

export default class OnboardingResendLimit {
  private static client: Redis | null = null;

  /**
   * Vérifie si un renvoi est autorisé.
   *
   * CONTACT :
   * - cooldown : 5 minutes
   * - maximum : 5 demandes
   * - fenêtre : 24 heures
   *
   * IP :
   * - cooldown : 1 seconde
   * - maximum : 10 demandes
   * - fenêtre : 60 secondes
   */
  static async allow(scope: ResendScope, value: string): Promise<boolean> {
    const normalizedValue = value.trim().toLowerCase();

    const hash = createHash('sha256').update(normalizedValue).digest('hex');

    const prefix = `toke:onboarding:resend:${scope}:${hash}`;

    const cooldownSeconds = scope === 'CONTACT' ? 300 : 1;
    const maximumAttempts = scope === 'CONTACT' ? 5 : 10;
    const windowSeconds = scope === 'CONTACT' ? 86400 : 60;

    const cooldownKey = `${prefix}:cooldown`;
    const windowKey = `${prefix}:window`;

    const luaScript = [
      "local used = tonumber(redis.call('GET', KEYS[2]) or '0')",
      'local maximum = tonumber(ARGV[2])',
      "local cooldownExists = redis.call('EXISTS', KEYS[1])",
      '',
      'if used >= maximum then',
      '  return 0',
      'end',
      '',
      'if cooldownExists == 1 then',
      '  return 0',
      'end',
      '',
      "redis.call('SET', KEYS[1], '1', 'EX', ARGV[1])",
      "local count = redis.call('INCR', KEYS[2])",
      '',
      'if count == 1 then',
      "  redis.call('EXPIRE', KEYS[2], ARGV[3])",
      'end',
      '',
      'return 1',
    ].join('\n');

    const result = await this.redis().eval(
      luaScript,
      2,
      cooldownKey,
      windowKey,
      String(cooldownSeconds),
      String(maximumAttempts),
      String(windowSeconds),
    );

    return Number(result) === 1;
  }

  private static redis(): Redis {
    if (!this.client) {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        commandTimeout: 3000,
      });

      this.client.on('error', (error) => {
        console.error('[OnboardingResendLimit] Redis error:', error.message);
      });
    }

    return this.client;
  }
}
