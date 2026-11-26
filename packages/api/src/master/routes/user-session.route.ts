import { Router, Request, Response, NextFunction } from 'express';
import ClientCacheService from '../../tools/client.cache.service.js';
import { ApiKeyManager } from '../../tools/api-key-manager.js';
import { SessionError } from '../../tools/user-session.authority.js';
import { managerSessionAuthority } from '../../tools/user-session.runtime.js';

export function sessionFailure(res: Response, error: unknown): void {
  const failure = error instanceof SessionError ? error : new SessionError(503, 'session_authority_unavailable');
  res.setHeader('Cache-Control', 'no-store');
  res.status(failure.status).json({ success: false, error: { code: failure.code, message: failure.code } });
}
// Deliberately verifies even a root client: ServerAuth's root shortcut is not authority here.
export async function authenticateSessionService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deny = (reason: string): never => {
      console.warn('[user-session] Technical introspection rejected', { reason });
      throw new SessionError(401, 'session_service_unauthorized');
    };
    const allowed = (process.env.USER_SESSION_SERVICE_KEYS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!allowed.length) throw new SessionError(503, 'session_service_configuration_missing');
    const key = req.header('x-api-key') || '';
    const timestamp = req.header('x-api-timestamp') || '';
    const signature = req.header('x-api-signature') || '';
    if (!allowed.includes(key)) deny('key_not_allowlisted');
    if (!/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 60)
      deny('timestamp_invalid');
    const client = await ClientCacheService.getClientConfig(key);
    if (!client?.active) return deny('client_not_active_or_registered');
    if (!ApiKeyManager.verify(signature, key, timestamp, client.secret)) deny('signature_invalid');
    next();
  } catch (error) { sessionFailure(res, error); }
}
const router = Router();
router.use(authenticateSessionService);
router.post('/introspect', async (req, res) => {
  try {
    if (typeof req.body?.token !== 'string' ||
      (req.body.tenantGuid !== undefined && typeof req.body.tenantGuid !== 'string') ||
      (req.body.subdomain !== undefined && typeof req.body.subdomain !== 'string'))
      throw new SessionError(401, 'invalid_user_session');
    const principal = await (await managerSessionAuthority()).introspect(req.body.token, req.body.tenantGuid, req.body.subdomain);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: { principal } });
  } catch (error) { sessionFailure(res, error); }
});
router.post('/logout', async (req, res) => {
  try {
    await (await managerSessionAuthority()).logout(req.body?.token);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: { revoked: true } });
  } catch (error) { sessionFailure(res, error); }
});
export default router;
