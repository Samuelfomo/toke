import { Request, Response, Router } from 'express';

import { IntegratorService } from '../services/integrator.service.js';

const router = Router();
const bearer = (req: Request) => {
  const match = /^Bearer (\S+)$/.exec(req.header('authorization') || '');
  return match?.[1];
};
const relay = async (req: Request, res: Response, path: string, requiresSession = true) => {
  const token = bearer(req);
  if (requiresSession && !token)
    return res.status(401).json({ message: 'Session intégrateur requise' });
  const method = req.method.toLowerCase() === 'get' ? 'get' : 'post';
  const result = await IntegratorService.forward(method, path, token, req.body);
  return res.status(result.status).send(result.data);
};

router.post('/otp/request', (req, res) => relay(req, res, '/otp/request', false));
router.post('/otp/verify', (req, res) => relay(req, res, '/otp/verify', false));
router.get('/session', (req, res) => relay(req, res, '/session'));
router.get('/tenants', (req, res) => relay(req, res, '/tenants'));
router.get('/tenants/:subdomain/responsibles', (req, res) => {
  const subdomain = req.params.subdomain;
  if (
    typeof subdomain !== 'string' ||
    !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i.test(
      subdomain,
    )
  ) {
    return res.status(400).json({ message: 'Tenant invalide' });
  }
  return relay(req, res, `/tenants/${encodeURIComponent(subdomain)}/responsibles`);
});
router.post('/logout', (req, res) => relay(req, res, '/logout'));

router.post('/context/select', (req, res) => relay(req, res, '/context/select'));
router.get('/context/:contextToken/profile', (req, res) => {
  const contextToken = String(req.params.contextToken);
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(contextToken))
    return res.status(400).json({ message: 'Contexte invalide' });
  return relay(req, res, `/context/${encodeURIComponent(contextToken)}/profile`);
});
router.post('/context/leave', (req, res) => relay(req, res, '/context/leave'));
router.get('/context/:contextToken', (req, res) => {
  const contextToken = String(req.params.contextToken);
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(contextToken))
    return res.status(400).json({ message: 'Contexte invalide' });
  return relay(req, res, `/context/${encodeURIComponent(contextToken)}`);
});
export default router;

// import { Request, Response, Router } from 'express';
//
// import { IntegratorService } from '../services/integrator.service.js';
//
// const router = Router();
// const bearer = (req: Request) => {
//   const match = /^Bearer (\S+)$/.exec(req.header('authorization') || '');
//   return match?.[1];
// };
// const relay = async (req: Request, res: Response, path: string, requiresSession = true) => {
//   const token = bearer(req);
//   if (requiresSession && !token)
//     return res.status(401).json({ message: 'Session intégrateur requise' });
//   const method = req.method.toLowerCase() === 'get' ? 'get' : 'post';
//   const result = await IntegratorService.forward(method, path, token, req.body);
//   return res.status(result.status).send(result.data);
// };
//
// router.post('/otp/request', (req, res) => relay(req, res, '/otp/request', false));
// router.post('/otp/verify', (req, res) => relay(req, res, '/otp/verify', false));
// router.get('/session', (req, res) => relay(req, res, '/session'));
// router.get('/tenants', (req, res) => relay(req, res, '/tenants'));
// router.get('/tenants/:subdomain/responsibles', (req, res) => {
//   const subdomain = req.params.subdomain;
//
//   const validSubdomain =
//     typeof subdomain === 'string' &&
//     /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i.test(
//       subdomain,
//     );
//
//   if (!validSubdomain) {
//     return res.status(400).json({
//       message: 'Tenant invalide',
//     });
//   }
//
//   return relay(req, res, `/tenants/${encodeURIComponent(subdomain)}/responsibles`);
// });
// router.post('/logout', (req, res) => relay(req, res, '/logout'));
//
// router.post('/context/select', (req, res) => relay(req, res, '/context/select'));
// router.post('/context/leave', (req, res) => relay(req, res, '/context/leave'));
// router.get('/context/:contextToken', (req, res) => {
//   const contextToken = String(req.params.contextToken);
//   if (!/^[A-Za-z0-9_-]{32,128}$/.test(contextToken))
//     return res.status(400).json({ message: 'Contexte invalide' });
//   return relay(req, res, `/context/${encodeURIComponent(contextToken)}`);
// });
// export default router;
