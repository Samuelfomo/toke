import type { NextFunction, Request, Response } from 'express';

import { IntegratorService } from '../services/integrator.service.js';

/** Affects only requests that explicitly carry a delegated integrator context. */
export async function integratorDelegation(req: Request, res: Response, next: NextFunction) {
  const contextToken = req.header('x-integrator-context');
  if (!contextToken) return next();
  const auth = /^Bearer ([A-Za-z0-9_-]+)$/.exec(req.header('authorization') || '');
  if (!auth || !/^[A-Za-z0-9_-]{32,128}$/.test(contextToken)) {
    return res.status(401).json({ message: 'Session technique invalide' });
  }
  try {
    const result = await IntegratorService.forward(
      'get',
      `/context/${encodeURIComponent(contextToken)}`,
      auth[1],
    );
    if (result.status !== 200)
      return res.status(401).json({ message: 'Session technique expirée ou révoquée' });

    const context = result.data as {
      subdomain?: string;
      userGuid?: string | number;
      tenantGuid?: string | number;
    };
    if (!context.subdomain || !context.tenantGuid || !context.userGuid) {
      return res.status(403).json({ message: 'Contexte technique incomplet' });
    }
    const provided = req.header('x-api-client');
    if (provided && provided !== String(context.tenantGuid)) {
      return res.status(403).json({ message: 'Entreprise différente du contexte technique' });
    }
    req.headers['x-api-client'] = String(context.tenantGuid);
    res.locals.integratorDelegation = {
      subdomain: context.subdomain,
      userGuid: String(context.userGuid),
    };
    return next();
  } catch (error) {
    console.error('[integrator] Validation du contexte impossible', error);
    return res.status(503).json({ message: 'Validation technique indisponible' });
  }
}
