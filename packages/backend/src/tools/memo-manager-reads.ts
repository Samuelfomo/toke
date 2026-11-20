import type { RequestHandler } from 'express';
import { getApiClient } from './api.factory.js';

/** Explicit two-route opening; all other paths continue to the existing lock. */
export const memoManagerReads: RequestHandler = async (req, res, next) => {
  const environment = process.env.NODE_ENV;
  const enabled = (['test', 'development'].includes(environment ?? '') &&
    process.env.MEMO_B2_MANAGER_READS === '1') ||
    (environment === 'production' && process.env.MEMO_B2_PRODUCTION_MANAGER_READS === '1');
  const detail = /^\/(?:[1-9][0-9]{0,127}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(req.path);
  if (!enabled || req.method !== 'GET' || (req.path !== '/list' && !detail)) return next();
  res.setHeader('Cache-Control', 'no-store');
  try {
    const principal = res.locals.userSession;
    const tenant = (req as any).client?.reference;
    const token = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(req.header('authorization') || '')?.[1];
    if (!principal || !token || req.header('x-integrator-context'))
      return void res.status(401).json({ success: false, error: { code: 'user_token_required' } });
    if (String(tenant) !== principal.tenantGuid)
      return void res.status(403).json({ success: false, error: { code: 'tenant_session_mismatch' } });
    const api = await getApiClient(String(tenant));
    const response = await api.get('/memo' + req.path, {
      params: req.query,
      // Never relay a browser-supplied internal proof or a GUID as identity.
      headers: { 'x-toke-user-session': token },
    });
    const data = response.data?.data;
    const present = (memo: any) => ({
      ...memo,
      author_user: memo.author_guid ? { guid: memo.author_guid, first_name: '', last_name: '' } : null,
      target_user: memo.target_guid ? { guid: memo.target_guid, first_name: '', last_name: '' } : null,
      memo_content: memo.exchanges ?? [],
    });
    if (response.data?.success !== true || !data ||
        (req.path === '/list' ? !Array.isArray(data.memos) : !data.memo?.guid))
      return void res.status(503).json({ success: false, error: { code: 'memo_read_invalid_response' } });
    // Preserve the existing Cloud envelope without adding unauthorized profile data.
    res.json({ success: true, data: req.path === '/list'
      ? { memos: { items: data.memos.map(present), pagination: { total: data.total, offset: data.offset, limit: data.limit } } }
      : { ...data, memo: present(data.memo) } });
  } catch (error: any) {
    const status = error?.response?.status;
    res.status([400, 401, 403, 404, 503].includes(status) ? status : 503).json({
      success: false,
      error: { code: error?.response?.data?.error?.code ?? 'memo_read_unavailable' },
    });
  }
};
