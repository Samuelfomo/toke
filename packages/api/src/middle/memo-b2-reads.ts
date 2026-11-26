import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { createHash } from 'node:crypto';

import { sessionClientFromEnvironment } from '../tools/user-session.client.js';
import { SessionError, type SessionPrincipal } from '../tools/user-session.authority.js';
import CredentialExtractorService from '../tools/credential-extractor.service.js';
import {
  MemoReadError,
  type MemoReadPrincipal,
  type MemoReadSelection,
  MemoReadsService,
} from '../tenant/memos/reads.service.js';
import { createApiClient } from '../utils/axios.config.js';

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
  verifyDelegation?: typeof verifyMemoDelegation;
  tenant: RequestHandler;
  read: typeof MemoReadsService.read;
  write?: (principal: MemoReadPrincipal, route: 'recipients' | 'commands', body: unknown) => Promise<unknown>;
  select?: typeof selectMemoB2Read;
}

async function verifyMemoDelegation(token: string, context: string, subdomain: string): Promise<MemoReadPrincipal> {
  const { USER_SESSION_MASTER_URL: url, USER_SESSION_SERVICE_KEY: key, USER_SESSION_SERVICE_SECRET: secret } = process.env;
  if (!url || !key || !secret) throw new SessionError(503, 'session_service_configuration_missing');
  const { data } = await createApiClient(url, secret, key)
    .get(`/integrator/context/${encodeURIComponent(context)}`, {
      headers: { Authorization: `Bearer ${token}` }, timeout: 5000, maxRedirects: 0,
    }).catch((error) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403) throw new SessionError(status, 'invalid_integrator_context');
      throw new SessionError(503, 'session_authority_unavailable');
    });
  const tenantGuid = String(data?.tenantGuid ?? '');
  const userGuid = String(data?.userGuid ?? '');
  if (data?.subdomain !== subdomain || !/^[1-9][0-9]{0,29}$/.test(tenantGuid) ||
    !(/^[0-9]{1,255}$/.test(userGuid) || /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(userGuid)))
    throw new SessionError(403, 'tenant_session_mismatch');
  return { kind: 'delegated-integrator', userGuid, tenantGuid, subdomain,
    auditRef: 'integrator-session:' + createHash('sha256').update(token).digest('hex') };
}
export function createMemoB2ReadGateway(deps: Dependencies): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const receipt = req.method === 'PATCH' ? req.path.match(new RegExp('^/memo/(' + guid + ')/read$')) : null;
    const selection: MemoReadSelection | null = receipt
      ? { kind: 'mark-read', guid: receipt[1], seenAt: req.body?.seen_at }
      : req.method === 'GET' && req.path === '/memo/state' ? { kind: 'state' }
        : (deps.select ?? selectMemoB2Read)(req.path, req.method);
    const writeRoute = req.path === '/memo/commands' && req.method === 'POST' ? 'commands'
      : req.path === '/memo/recipients' && req.method === 'GET' ? 'recipients' : null;
    if (!deps.enabled() || (!selection && !(writeRoute && deps.write))) {
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
      const integratorToken = req.header('x-toke-integrator-session');
      const context = req.header('x-integrator-context');
      const subdomain = CredentialExtractorService.extractCredentials(req).subdomain;
      if (!subdomain) throw new SessionError(403, 'tenant_session_mismatch');
      let principal: MemoReadPrincipal;
      if (token && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token) && !integratorToken && !context) {
        principal = await deps.verify(token, subdomain);
      } else if (!token && integratorToken && /^[A-Za-z0-9_-]+$/.test(integratorToken) &&
        context && /^[A-Za-z0-9_-]{32,128}$/.test(context) && deps.verifyDelegation) {
        principal = await deps.verifyDelegation(integratorToken, context, subdomain);
      } else {
        throw new SessionError(401, 'user_token_required');
      }
      if (principal.subdomain !== subdomain) throw new SessionError(403, 'tenant_session_mismatch');
      const filters: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.query)) {
        if (typeof v !== 'string') throw new MemoReadError(400, 'memo_read_query_invalid');
        filters[k] = v;
      }
      for (const [k, v] of Object.entries(selection?.filters ?? {})) {
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
          if (principal.kind === 'manager' && principal.exp <= Math.floor(Date.now() / 1000))
            throw new SessionError(401, 'invalid_user_session');
          const data = writeRoute && deps.write
            ? await deps.write(principal, writeRoute, req.body)
            : await deps.read(principal, { ...selection!, filters });
          if (!writeRoute && principal.kind === 'manager' && principal.exp <= Math.floor(Date.now() / 1000))
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
  verifyDelegation: verifyMemoDelegation,
  tenant: tenantMiddleware,
  read: (principal, selection) => MemoReadsService.read(principal, selection),
  write: async (principal, route, body) => {
    const { MemoWritesService } = await import('../tenant/memos/writes.service.js');
    return MemoWritesService.run(principal, route, body);
  },
});
