import type { Request, Response, NextFunction } from 'express';
import { sessionClientFromEnvironment } from '../tools/user-session.client.js';
import { SessionError } from '../tools/user-session.authority.js';
import CredentialExtractorService from '../tools/credential-extractor.service.js';

/** Stage A closes memo business HTTP surfaces until their ACL contract is implemented. */
export async function managerSessionBoundary(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!/^\/(memo|upload)(\/|$)/i.test(req.path)) { next(); return; }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const token = req.header('x-toke-user-session');
    if (!token || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token) || req.header('x-toke-integrator-session') || req.header('x-integrator-context'))
      throw new SessionError(401, 'user_token_required');
    const subdomain = CredentialExtractorService.extractCredentials(req).subdomain;
    if (!subdomain) throw new SessionError(403, 'tenant_session_mismatch');
    const principal = await sessionClientFromEnvironment().verify(token, undefined, subdomain);
    res.locals.userSession = principal;
    // Deliberately not next(): D1–D7, media ACL and delegated grants are not approved yet.
    throw new SessionError(503, 'memo_permissions_pending');
  } catch (error) {
    const failure = error instanceof SessionError ? error : new SessionError(503, 'session_authority_unavailable');
    res.status(failure.status).json({ success: false, error: { code: failure.code } });
  }
}
