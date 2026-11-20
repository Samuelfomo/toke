import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { sessionClientFromEnvironment } from '../tools/user-session.client.js';
import { SessionError, type SessionPrincipal } from '../tools/user-session.authority.js';
import CredentialExtractorService from '../tools/credential-extractor.service.js';
import {
  MemoReadError,
  type MemoReadSelection,
  MemoReadsService,
} from '../tenant/memos/reads.service.js';

import { tenantMiddleware } from './tenant.middleware.js';

const guid =
  '(?:[1-9][0-9]{0,127}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})';
/** Exact allowlist. All other routes still reach the unchanged stage A lock. */
export function selectMemoB2Read(path: string, method: string): MemoReadSelection | null {
  if (method !== 'GET') return null;
  if (['/memo', '/memo/', '/memo/list'].includes(path)) return { kind: 'list' };
  if (path === '/memo/statistics/overview') return { kind: 'statistics' };
  const specialized: Record<string, Record<string, string>> = {
    '/memo/my-created': {},
    '/memo/my-memos': {},
    '/memo/pending': { memo_status: 'pending' },
    '/memo/pending-validation': { memo_status: 'submitted', responsibility_state: 'ASSIGNED' },
    '/memo/auto-generated': { auto_generated: 'true' },
  };
  if (Object.hasOwn(specialized, path)) return { kind: 'list', filters: specialized[path] };
  let m = path.match(/^\/memo\/(type|status)\/([a-z_]+)\/list$/);
  if (m)
    return { kind: 'list', filters: { [m[1] === 'type' ? 'memo_type' : 'memo_status']: m[2] } };
  m = path.match(new RegExp('^/memo/(target|validator)/(' + guid + ')/list$'));
  if (m)
    return {
      kind: 'list',
      filters: { [m[1] === 'target' ? 'target_user' : 'validator_user']: m[2] },
    };
  m = path.match(new RegExp('^/memo/(' + guid + ')(?:/(events))?$'));
  if (m) return { kind: m[2] ? 'events' : 'detail', guid: m[1] };
  return null;
}
interface Dependencies {
  enabled: () => boolean;
  verify: (token: string, tenant: string) => Promise<Readonly<SessionPrincipal>>;
  tenant: RequestHandler;
  read: typeof MemoReadsService.read;
  select?: typeof selectMemoB2Read;
}
export function createMemoB2ReadGateway(deps: Dependencies): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const selection = (deps.select ?? selectMemoB2Read)(req.path, req.method);
    if (!deps.enabled() || !selection) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    const fail = (error: unknown) => {
      if (res.destroyed || res.writableEnded) return;
      if (res.headersSent) {
        next(error);
        return;
      }
      const known = error instanceof SessionError || error instanceof MemoReadError;
      res
        .status(known ? error.status : 503)
        .json({ success: false, error: { code: known ? error.code : 'memo_read_unavailable' } });
    };
    try {
      const token = req.header('x-toke-user-session');
      if (
        !token ||
        !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token) ||
        req.header('x-toke-integrator-session') ||
        req.header('x-integrator-context')
      )
        throw new SessionError(401, 'user_token_required');
      const subdomain = CredentialExtractorService.extractCredentials(req).subdomain;
      if (!subdomain) throw new SessionError(403, 'tenant_session_mismatch');
      const principal = await deps.verify(token, subdomain);
      if (principal.subdomain !== subdomain) throw new SessionError(403, 'tenant_session_mismatch');
      const filters: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.query)) {
        if (typeof v !== 'string') throw new MemoReadError(400, 'memo_read_query_invalid');
        filters[k] = v;
      }
      for (const [k, v] of Object.entries(selection.filters ?? {})) {
        if (filters[k] !== undefined && filters[k] !== v)
          throw new MemoReadError(400, 'memo_read_query_invalid');
        filters[k] = v;
      }
      if (req.path === '/memo/my-memos') filters.participant_self = 'true';
      if (req.path === '/memo/my-created') filters.author_user = principal.userGuid;
      // A decision queue is strictly the current responsible's queue, not a superior's.
      if (req.path === '/memo/pending-validation') filters.responsible_self = 'true';
      await deps.tenant(req, res, (error?: unknown) => {
        if (error) {
          fail(error);
          return;
        }
        void (async () => {
          if (
            req.tenant?.subdomain !== principal.subdomain ||
            String(req.tenant?.config?.reference) !== principal.tenantGuid
          )
            throw new SessionError(403, 'tenant_session_mismatch');
          const data = await deps.read(principal, { ...selection, filters });
          if (principal.exp <= Math.floor(Date.now() / 1000))
            throw new SessionError(401, 'invalid_user_session');
          res.json({ success: true, data });
        })().catch(fail);
      });
    } catch (error) {
      fail(error);
    }
  };
}

export const memoB2ReadGateway = createMemoB2ReadGateway({
  enabled: () =>
    (['test', 'development'].includes(process.env.NODE_ENV ?? '') &&
      (process.env.MEMO_B2_LOCAL_READS === '1' || process.env.MEMO_B2_MANAGER_READS === '1')) ||
    (process.env.NODE_ENV === 'production' && process.env.MEMO_B2_PRODUCTION_MANAGER_READS === '1'),
  select: (path, method) => {
    // Production always uses the two-route selector, even if old local flags remain.
    if (process.env.NODE_ENV === 'production' || process.env.MEMO_B2_MANAGER_READS === '1') {
      if (
        method !== 'GET' ||
        (path !== '/memo/list' && !new RegExp('^/memo/(' + guid + ')$').test(path))
      )
        return null;
    }
    return selectMemoB2Read(path, method);
  },
  verify: (token, subdomain) => sessionClientFromEnvironment().verify(token, undefined, subdomain),
  tenant: tenantMiddleware,
  read: (principal, selection) => MemoReadsService.read(principal, selection),
});
