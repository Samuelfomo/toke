/** Accès technique Toké : authentification indépendante, sans OTP client. */
import crypto from 'node:crypto';

import { NextFunction, Request, Response, Router } from 'express';
import Redis from 'ioredis';
import { QueryTypes } from 'sequelize';
import { Status } from '@toke/shared';

import Tenant from '../class/Tenant.js';
import TenantCacheService from '../../tools/tenant-cache.service.js';
import EmailSender from '../../tools/send.email.service.js';
import TenantManager from '../../tenant/database/db.tenant-manager.js';
import { tableName } from '../../utils/response.model.js';

const router = Router();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 2,
});
redis.on('error', (err) => console.error('[integrator] Redis indisponible:', err.message));
const prefix = 'integrator:v1:';
const allowed = (email: string) =>
  (process.env.INTEGRATOR_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email);
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const key = (kind: string, id: string) => `${prefix}${kind}:${hash(id)}`;
const LIMIT_OTP = 5;

// Réponse identique pour les emails inconnus afin de ne pas divulguer la liste.
router.post('/otp/request', async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254)
    return res.status(400).json({ message: 'Email invalide' });
  try {
    const rateKey = key('request', `${req.ip}:${email}`);
    const attempts = await redis.incr(rateKey);
    if (attempts === 1) await redis.expire(rateKey, 900);
    if (attempts > 5)
      return res.status(429).json({ message: 'Trop de demandes, réessayez plus tard' });
    if (allowed(email)) {
      const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
      const otpKey = key('otp', email);
      await redis.set(
        otpKey,
        JSON.stringify({ digest: hash(`${email}:${otp}`), attempts: 0 }),
        'EX',
        300,
      );
      try {
        await EmailSender.sender(otp, email);
      } catch (error) {
        await redis.del(otpKey);
        throw error;
      }
    }
    return res.json({ message: 'Si cette adresse est autorisée, un code lui a été envoyé.' });
  } catch (error) {
    console.error('[integrator] Echec OTP:', error);
    return res.status(503).json({ message: 'Service de connexion temporairement indisponible' });
  }
});

router.post('/otp/verify', async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const rawOtp = req.body?.otp;
  // Accepte l'OTP JSON sous forme de chaîne ("175761") ou de nombre (175761).
  // Les codes commençant par zéro doivent être envoyés sous forme de chaîne.
  const otp =
    typeof rawOtp === 'string'
      ? rawOtp
      : typeof rawOtp === 'number' && Number.isSafeInteger(rawOtp)
        ? String(rawOtp)
        : '';
  if (!allowed(email) || !/^\d{6}$/.test(otp))
    return res.status(401).json({ message: 'Code invalide ou expiré' });
  try {
    const otpKey = key('otp', email);
    const raw = await redis.get(otpKey);
    if (!raw) return res.status(401).json({ message: 'Code invalide ou expiré' });
    const record = JSON.parse(raw) as { digest: string; attempts: number };
    const attempts = await redis.incr(key('verify', email));
    if (attempts === 1) await redis.expire(key('verify', email), 300);
    if (attempts > LIMIT_OTP || record.attempts >= LIMIT_OTP) {
      await redis.del(otpKey);
      return res.status(429).json({ message: 'Trop de tentatives' });
    }
    const candidate = Buffer.from(hash(`${email}:${otp}`), 'hex');
    const expected = Buffer.from(record.digest, 'hex');
    if (candidate.length !== expected.length || !crypto.timingSafeEqual(candidate, expected)) {
      record.attempts += 1;
      const ttl = await redis.ttl(otpKey);
      if (ttl > 0) await redis.set(otpKey, JSON.stringify(record), 'EX', ttl);
      return res.status(401).json({ message: 'Code invalide ou expiré' });
    }
    // GETDEL évite la réutilisation du code (Redis >= 6.2).
    const consumed = await redis.call('GETDEL', otpKey);
    if (!consumed) return res.status(401).json({ message: 'Code déjà utilisé' });
    const token = crypto.randomBytes(32).toString('base64url');
    await redis.set(
      key('session', token),
      JSON.stringify({ email, createdAt: new Date().toISOString() }),
      'EX',
      8 * 3600,
    );
    await redis.del(key('verify', email));
    return res.json({ token, expiresIn: 8 * 3600 });
  } catch (error) {
    console.error('[integrator] Erreur vérification:', error);
    return res.status(503).json({ message: 'Service indisponible' });
  }
});

async function requireIntegrator(req: Request, res: Response, next: NextFunction) {
  const match = /^Bearer (\S+)$/.exec(req.header('authorization') || '');
  if (!match) return res.status(401).json({ message: 'Session intégrateur requise' });
  try {
    const raw = await redis.get(key('session', match[1]));
    if (!raw || !allowed(JSON.parse(raw).email))
      return res.status(401).json({ message: 'Session expirée' });
    res.locals.integratorSession = JSON.parse(raw);
    res.locals.integratorToken = match[1];
    return next();
  } catch {
    return res.status(503).json({ message: 'Session non vérifiable' });
  }
}

router.get('/session', requireIntegrator, (_req, res) =>
  res.json({ email: res.locals.integratorSession.email }),
);
router.post('/logout', requireIntegrator, async (_req, res) => {
  const tokens = await redis.smembers(key('contexts', res.locals.integratorToken));
  if (tokens.length) await redis.del(...tokens.map((token) => key('context', token)));
  await redis.del(key('contexts', res.locals.integratorToken));
  await redis.del(key('session', res.locals.integratorToken));
  return res.status(204).end();
});

// Attention : un tenant ACTIVE sans base réellement accessible n'est pas proposé.
router.get('/tenants', requireIntegrator, async (_req, res) => {
  try {
    const tenants = await Tenant._list({ status: Status.ACTIVE });
    const results: Array<{ guid: number; name: string; subdomain: string }> = [];
    for (const tenant of tenants || []) {
      const t = tenant.toJSON() as any;
      const subdomain = tenant.getSubdomain();
      const databaseName = tenant.getDatabaseName();
      if (!subdomain || !databaseName) continue;
      try {
        const cfg = await TenantCacheService.getTenantConfig(subdomain);
        if (!cfg || cfg.database !== databaseName) continue;
        const db = await TenantManager.getConnectionForTenant(subdomain, cfg);
        await db.authenticate();
        results.push({ guid: t.guid, name: t.name, subdomain });
      } catch (error) {
        console.warn('[integrator] Tenant non disponible:', subdomain);
      }
    }
    return res.json({ tenants: results });
  } catch (error) {
    console.error('[integrator] Impossible de charger les tenants:', error);
    return res.status(500).json({ message: 'Liste indisponible' });
  }
});

router.get('/tenants/:subdomain/responsibles', requireIntegrator, async (req, res) => {
  try {
    const subdomain = String(req.params.subdomain);
    const tenant = await Tenant._load(subdomain, false, false, true);
    const t = tenant?.toJSON() as any;
    const databaseName = tenant?.getDatabaseName();
    if (!t || t.status !== Status.ACTIVE || !databaseName)
      return res.status(404).json({ message: 'Tenant indisponible' });
    const cfg = await TenantCacheService.getTenantConfig(subdomain);
    if (!cfg || cfg.database !== databaseName)
      return res.status(404).json({ message: 'Tenant indisponible' });
    const db = await TenantManager.getConnectionForTenant(subdomain, cfg);
    await db.authenticate();
    const sql = `SELECT u.guid, u.first_name, u.last_name, u.email, ARRAY_AGG(DISTINCT r.code ORDER BY r.code) AS roles
  FROM "${tableName.USERS}" u JOIN "${tableName.USER_ROLES}" ur
    ON ur."user" = u.id
  JOIN "${tableName.ROLES}" r
    ON r.id = ur.role
  WHERE u.active = true AND u.deleted_at IS NULL AND UPPER(r.code) IN ('MANAGER', 'ADMIN-RH')
  GROUP BY u.id, u.guid, u.first_name, u.last_name, u.email
  ORDER BY u.last_name, u.first_name`;

    const profiles = await db.query(sql, {
      type: QueryTypes.SELECT,
    });

    // const sql = `SELECT DISTINCT u.guid, u.first_name, u.last_name, u.email, r.code AS role
    //              FROM "${tableName.USERS}" u
    //                     JOIN "${tableName.USER_ROLES}" ur ON ur."user" = u.id
    //                     JOIN "${tableName.ROLES}" r ON r.id = ur.role
    //              WHERE u.active = true AND u.deleted_at IS NULL AND UPPER(r.code) IN ('MANAGER', 'ADMIN-RH')
    //              ORDER BY u.last_name, u.first_name, r.code`;
    // const profiles = await db.query(sql, { type: QueryTypes.SELECT });

    return res.json({ tenant: { guid: t.guid, name: t.name, subdomain }, profiles });
  } catch (error) {
    console.error('[integrator] Liste responsables indisponible:', error);
    return res.status(503).json({ message: 'Responsables indisponibles' });
  }
});

// Lot 2 : chaque sélection est revalidée dans la base tenant, jamais acceptée sur simple déclaration du navigateur.
router.post('/context/select', requireIntegrator, async (req: Request, res: Response) => {
  try {
    const subdomain =
      typeof req.body?.subdomain === 'string' ? req.body.subdomain.trim().toLowerCase() : '';
    const rawUserGuid = req.body?.userGuid;

    const userGuid =
      typeof rawUserGuid === 'string'
        ? rawUserGuid.trim()
        : typeof rawUserGuid === 'number' && Number.isSafeInteger(rawUserGuid)
          ? String(rawUserGuid)
          : '';

    const validSubdomain =
      /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/.test(
        subdomain,
      );
    ``;

    if (!validSubdomain || !/^[0-9]+$/.test(userGuid) || !/[1-9]/.test(userGuid)) {
      return res.status(400).json({
        message: 'Sélection invalide',
      });
    }

    const tenant = await Tenant._load(subdomain, false, false, true);
    const t = tenant?.toJSON() as any;
    const databaseName = tenant?.getDatabaseName();
    if (!t || t.status !== Status.ACTIVE || !databaseName)
      return res.status(404).json({ message: 'Tenant indisponible' });
    const cfg = await TenantCacheService.getTenantConfig(subdomain);
    if (!cfg || cfg.database !== databaseName)
      return res.status(404).json({ message: 'Tenant indisponible' });
    const db = await TenantManager.getConnectionForTenant(subdomain, cfg);
    await db.authenticate();
    const sql = `SELECT DISTINCT u.guid, u.email FROM "${tableName.USERS}" u
                                                          JOIN "${tableName.USER_ROLES}" ur ON ur."user" = u.id
                                                          JOIN "${tableName.ROLES}" r ON r.id = ur.role
                 WHERE u.guid = :userGuid
                   AND u.active = true
                   AND u.deleted_at IS NULL
                   AND UPPER(r.code) IN ('MANAGER', 'ADMIN-RH')
                     LIMIT 1`;

    const profiles = (await db.query(sql, {
      replacements: {
        userGuid: String(userGuid),
      },
      type: QueryTypes.SELECT,
    })) as Array<{ guid: string; email: string }>;

    if (!profiles.length) return res.status(403).json({ message: 'Responsable non autorisé' });

    // Reprendre la récupération existante du profil et de son tenant, sans envoyer d'OTP.
    const { UserAuthenticationService } =
      await import('../../tools/user.authentication.service.js');
    const loaded = await UserAuthenticationService.auth(profiles[0].email, subdomain);
    if (loaded.status !== 200 || !loaded.response)
      return res.status(503).json({ message: 'Profil indisponible' });
    const user = loaded.response as any;
    // Vérifier que le service a réellement renvoyé le profil sélectionné.
    if (String(user.guid) !== String(userGuid))
      return res.status(409).json({ message: 'Profil incohérent' });

    const tenantGuid = tenant?.getGuid();

    if (tenantGuid == null) {
      return res.status(404).json({
        message: 'Identifiant du tenant indisponible',
      });
    }

    const contextToken = crypto.randomBytes(32).toString('base64url');

    const tenantData = {
      ...t,
      guid: tenantGuid,
      subdomain: tenant!.getSubdomain(),
    };

    const contextData = {
      session: hash(res.locals.integratorToken),
      subdomain,
      tenantGuid: String(tenantGuid),
      userGuid: String(userGuid),
      user,
      tenant: tenantData,
      selectedAt: new Date().toISOString(),
    };

    await redis.set(key('context', contextToken), JSON.stringify(contextData), 'EX', 3600);

    // const contextToken = crypto.randomBytes(32).toString('base64url');
    //
    // const tenantData = {
    //   ...t,
    //   subdomain: tenant!.getSubdomain(),
    // };
    //
    // const contextData = {
    //   session: hash(res.locals.integratorToken),
    //   subdomain,
    //   userGuid: String(userGuid),
    //   user,
    //   tenant: tenantData,
    //   selectedAt: new Date().toISOString(),
    // };
    //
    // await redis.set(key('context', contextToken), JSON.stringify(contextData), 'EX', 3600);
    //
    await redis.sadd(key('contexts', res.locals.integratorToken), contextToken);
    await redis.expire(key('contexts', res.locals.integratorToken), 8 * 3600);
    console.info('[integrator] Contexte sélectionné', {
      integrator: res.locals.integratorSession.email,
      subdomain,
      userGuid,
    });
    return res.json({ contextToken, expiresIn: 3600, user, tenant: { ...t, subdomain } });
  } catch (error) {
    console.error('[integrator] Sélection impossible', error);
    return res.status(503).json({ message: 'Impossible de sélectionner ce profil' });
  }
});

router.post('/context/leave', requireIntegrator, async (req: Request, res: Response) => {
  const contextToken = typeof req.body?.contextToken === 'string' ? req.body.contextToken : '';
  if (!contextToken) return res.status(204).end();
  const contextKey = key('context', contextToken);
  const raw = await redis.get(contextKey);
  if (raw && JSON.parse(raw).session === hash(res.locals.integratorToken))
    await redis.del(contextKey);
  return res.status(204).end();
});

router.get(
  '/context/:contextToken/profile',
  requireIntegrator,
  async (req: Request, res: Response) => {
    try {
      const contextToken = String(req.params.contextToken);

      const raw = await redis.get(key('context', contextToken));

      if (!raw) {
        return res.status(401).json({ message: 'Contexte expiré' });
      }

      const context = JSON.parse(raw);

      if (context.session !== hash(res.locals.integratorToken)) {
        return res.status(403).json({ message: 'Contexte non autorisé' });
      }

      if (!context.user || !context.tenant) {
        return res.status(409).json({ message: 'Profil à resélectionner' });
      }

      return res.json({ user: context.user, tenant: context.tenant });
    } catch (error) {
      console.error('[integrator] Erreur récupération profil:', error);

      return res.status(503).json({
        message: 'Profil temporairement indisponible',
      });
    }
  },
);

router.get('/context/:contextToken', requireIntegrator, async (req: Request, res: Response) => {
  const raw = await redis.get(key('context', String(req.params.contextToken)));
  if (!raw) return res.status(401).json({ message: 'Contexte expiré' });
  const context = JSON.parse(raw);
  if (context.session !== hash(res.locals.integratorToken))
    return res.status(403).json({ message: 'Contexte non autorisé' });
  return res.json({
    subdomain: context.subdomain,
    tenantGuid: context.tenantGuid ?? context.tenant?.guid,
    userGuid: context.userGuid,
  });
  // return res.json({ subdomain: context.subdomain, userGuid: context.userGuid });
});

export default router;
