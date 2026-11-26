import type { RequestHandler } from 'express';
import { getApiClient } from './api.factory.js';
import { MemoSocketBridgeService } from '../services/memo.socket.bridge.service.js';

/** Explicit B2 reads and B1 workflow commands. */
export const memoManagerReads: RequestHandler = async (req, res, next) => {
  const environment = process.env.NODE_ENV;
  const enabled = (['test', 'development'].includes(environment ?? '') &&
    process.env.MEMO_B2_MANAGER_READS === '1') ||
    (environment === 'production' && process.env.MEMO_B2_PRODUCTION_MANAGER_READS === '1');
  const detail = /^\/(?:[1-9][0-9]{0,127}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(req.path);
  const reads = req.method === 'GET' && (req.path === '/list' || detail);
  const workflow = (req.method === 'POST' && req.path === '/commands') ||
    (req.method === 'GET' && req.path === '/recipients');
  const state = req.method === 'GET' && req.path === '/state';
  const receipt = req.method === 'PATCH' && req.path.endsWith('/read') && Boolean(
    /^\/(?:[1-9][0-9]{0,127}|[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})\/read$/.test(req.path),
  );
  const ticket = req.method === 'POST' && req.path === '/realtime-ticket';
  if (!enabled || (!reads && !workflow && !state && !receipt && !ticket)) return next();
  res.setHeader('Cache-Control', 'no-store');
  try {
    const principal = res.locals.userSession;
    const tenant = (req as any).client?.reference;
    const authorization = req.header('authorization') || '';
    const context = req.header('x-integrator-context');
    const delegation = res.locals.integratorDelegation;
    let headers: Record<string, string>;
    if (context) {
      const token = /^Bearer ([A-Za-z0-9_-]+)$/.exec(authorization)?.[1];
      if (!delegation || !token)
        return void res.status(401).json({ success: false, error: { code: 'user_token_required' } });
      headers = { 'x-toke-integrator-session': token, 'x-integrator-context': context };
    } else {
      const token = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(authorization)?.[1];
      if (!principal || !token)
        return void res.status(401).json({ success: false, error: { code: 'user_token_required' } });
      if (String(tenant) !== principal.tenantGuid)
        return void res.status(403).json({ success: false, error: { code: 'tenant_session_mismatch' } });
      headers = { 'x-toke-user-session': token };
    }
    const api = await getApiClient(String(tenant));
    const options = { params: req.query, headers, maxRedirects: 0 };
    if (ticket) {
      const realtimeTicket = await MemoSocketBridgeService.createBridgeTicket(async () => {
        const response = await api.get('/memo/state', { headers, maxRedirects: 0, timeout: 10000 });
        return response.data?.data;
      });
      res.json({ success: true, data: realtimeTicket });
      return;
    }
    const response = req.method === 'POST'
      ? await api.post('/memo/commands', req.body, options)
      : receipt ? await api.patch('/memo' + req.path, { seen_at: req.body?.seen_at }, options)
        : await api.get('/memo' + req.path, options);
    if (workflow || state || receipt) {
      res.status(response.status).json(response.data);
      return;
    }
    const data = response.data?.data;
    const present = (memo: any) => ({
      ...memo,
      author_user: memo.author_user ?? (memo.author_guid ? { guid: memo.author_guid } : null),
      target_user: memo.target_user ?? (memo.target_guid ? { guid: memo.target_guid } : null),
      memo_content: memo.exchanges ?? [],
    });
    if (response.data?.success !== true || !data ||
        (req.path === '/list' ? !Array.isArray(data.memos) : !data.memo?.guid))
      return void res.status(503).json({ success: false, error: { code: 'memo_read_invalid_response' } });
    // Preserve the existing Cloud envelope for the authorized projection.
    res.json({ success: true, data: req.path === '/list'
      ? { writesEnabled: data.writesEnabled === true, receiptsEnabled: data.receiptsEnabled === true, memos: { items: data.memos.map(present), pagination: { total: data.total, offset: data.offset, limit: data.limit } } }
      : { ...data, memo: present(data.memo) } });
  } catch (error: any) {
    const status = error?.response?.status;
    res.status([400, 401, 403, 404, 409, 503].includes(status) ? status : 503).json({
      success: false,
      error: { code: error?.response?.data?.error?.code ?? 'memo_read_unavailable' },
    });
  }
};
