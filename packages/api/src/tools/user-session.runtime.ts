import Redis from 'ioredis';
import { Status } from '@toke/shared';
import Tenant from '../master/class/Tenant.js';
import User from '../tenant/class/User.js';
import TenantManager from '../tenant/database/db.tenant-manager.js';
import { TableInitializer } from '../tenant/database/db.initializer.js';
import TenantCacheService from './tenant-cache.service.js';
import { SessionError, UserSessionAuthority } from './user-session.authority.js';

let instance: Promise<UserSessionAuthority> | undefined;
export async function assertManagerIdentityActive(identity: { userGuid: string; tenantGuid: string; subdomain: string }): Promise<void> {
  const tenant = await Tenant._load(identity.tenantGuid, true);
  if (!tenant || tenant.getStatus() !== Status.ACTIVE || tenant.getSubdomain() !== identity.subdomain)
    throw new SessionError(401, 'session_account_unavailable');
  const config = await TenantCacheService.getTenantConfig(identity.subdomain);
  if (!config || !config.active || String(config.reference) !== identity.tenantGuid)
    throw new SessionError(401, 'session_account_unavailable');
  await TenantManager.runTenantOperation(identity.subdomain, async () => {
    const connection = await TenantManager.getConnectionForTenant(identity.subdomain, config);
    await TableInitializer.initialize(connection);
    const user = await User._load(identity.userGuid, true);
    // User._load uses UserModel's default deleted_at IS NULL filter.
    if (!user || !user.isActive())
      throw new SessionError(401, 'session_account_unavailable');
  });
}
export function managerSessionAuthority(): Promise<UserSessionAuthority> {
  if (!instance) instance = (async () => {
    const secret = process.env.USER_SESSION_SECRET || '';
    const socket = process.env.USER_SESSION_REDIS_SOCKET;
    const host = process.env.USER_SESSION_REDIS_HOST;
    if (Buffer.byteLength(secret) < 32 || (!socket && !host)) throw new SessionError(503, 'session_configuration_missing');
    const redis = new Redis({ ...(socket ? { path: socket } : { host, port: Number(process.env.USER_SESSION_REDIS_PORT || 6379) }),
      username: process.env.USER_SESSION_REDIS_USERNAME, password: process.env.USER_SESSION_REDIS_PASSWORD,
      ...(process.env.USER_SESSION_REDIS_TLS === 'true' ? { tls: {} } : {}),
      lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1, connectTimeout: 1500, commandTimeout: 2000,
      retryStrategy: () => null, autoResendUnfulfilledCommands: false });
    redis.on('error', () => {}); // No secrets/connection strings in logs.
    redis.once('end', () => { instance = undefined; });
    try { await redis.connect(); return new UserSessionAuthority(redis, secret, assertManagerIdentityActive); }
    catch { redis.disconnect(); throw new SessionError(503, 'session_registry_unavailable'); }
  })().catch(error => { instance = undefined; throw error; });
  return instance;
}
