import { NextFunction, Request, Response } from 'express';
import { HttpStatus, TimezoneConfigUtils } from '@toke/shared';

import R from '../tools/response.js';

/**
 * Middleware de validation des méthodes HTTP
 * Usage : Ensure.delete(), Ensure.put(), etc.
 */
export default class Ensure {
  /**
   * Assure que la requête est GET
   */
  static get() {
    return Ensure.validateMethod('GET');
  }

  // ===========================
  // MÉTHODES HTTP COURANTES
  // ===========================

  /**
   * Assure que la requête est POST
   */
  static post() {
    return Ensure.validateMethod('POST');
  }

  /**
   * Assure que la requête est PUT
   */
  static put() {
    return Ensure.validateMethod('PUT');
  }

  /**
   * Assure que la requête est DELETE
   */
  static delete() {
    return Ensure.validateMethod('DELETE');
  }

  /**
   * Assure que la requête est PATCH
   */
  static patch() {
    return Ensure.validateMethod('PATCH');
  }

  /**
   * Assure que la requête est HEAD
   */
  static head() {
    return Ensure.validateMethod('HEAD');
  }

  /**
   * Assure que la requête est OPTIONS
   */
  static options() {
    return Ensure.validateMethod('OPTIONS');
  }

  /**
   * Valide plusieurs méthodes autorisées
   * Usage: Ensure.anyOf(['GET', 'POST'])
   */
  static anyOf(allowedMethods: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!allowedMethods.includes(req.method)) {
        console.warn(
          `⚠️ HTTP Method not in allowed list: ${req.method} not in [${allowedMethods.join(', ')}] on ${req.originalUrl}`,
        );

        return R.handleError(res, HttpStatus.METHOD_NOT_ALLOWED, {
          code: 'method_not_allowed',
          message: `This endpoint only accepts: ${allowedMethods.join(', ')}`,
        });
      }
      next();
    };
  }

  // ===========================
  // MÉTHODES AVANCÉES
  // ===========================

  /**
   * Rejette certaines méthodes
   * Usage : Ensure.reject(['OPTIONS', 'TRACE'])
   */
  static reject(rejectedMethods: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (rejectedMethods.includes(req.method)) {
        console.warn(`⚠️ HTTP Method rejected: ${req.method} is forbidden on ${req.originalUrl}`);

        return R.handleError(res, HttpStatus.METHOD_NOT_ALLOWED, {
          code: 'method_forbidden',
          message: `Method ${req.method} is not allowed on this endpoint`,
        });
      }
      next();
    };
  }

  /**
   * Validation avec message personnalisé
   * Usage: Ensure.custom('PUT', 'Only modifications allowed here')
   */
  static custom(expectedMethod: string, customMessage: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (req.method !== expectedMethod) {
        console.warn(
          `⚠️ Custom validation failed: ${req.method} !== ${expectedMethod} on ${req.originalUrl}`,
        );

        return R.handleError(res, HttpStatus.METHOD_NOT_ALLOWED, {
          code: 'method_not_allowed',
          message: customMessage,
        });
      }
      next();
    };
  }

  /**
   * Mode strict: bloque toutes les méthodes non-standard
   * Usage: Ensure.strict() - autorise seulement GET, POST, PUT, DELETE, PATCH
   */
  static strict() {
    const standardMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

    return (req: Request, res: Response, next: NextFunction): void => {
      if (!standardMethods.includes(req.method)) {
        console.error(
          `🚨 Non-standard HTTP method detected: ${req.method} on ${req.originalUrl} from ${req.ip}`,
        );

        return R.handleError(res, HttpStatus.METHOD_NOT_ALLOWED, {
          code: 'non_standard_method',
          message: 'Only standard HTTP methods are allowed',
        });
      }
      next();
    };
  }

  // ===========================
  // MÉTHODES UTILITAIRES
  // ===========================

  /**
   * Mode développement: log toutes les requêtes mais n'en bloque aucune
   * Usage: Ensure.dev(expectedMethod)
   */
  static dev(expectedMethod: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (req.method !== expectedMethod) {
        console.log(
          `🔍 DEV MODE: Method mismatch detected but allowed - ${req.method} !== ${expectedMethod} on ${req.originalUrl}`,
        );
      } else {
        console.log(`✅ DEV MODE: Correct method - ${req.method} on ${req.originalUrl}`);
      }
      next();
    };
  }

  /**
   * Validation conditionnelle basée sur l'environnement
   * Usage: Ensure.envBased('PUT') - strict en prod, permissif en dev
   */
  static envBased(expectedMethod: string) {
    if (process.env.NODE_ENV === 'production') {
      return Ensure.validateMethod(expectedMethod);
    } else {
      return Ensure.dev(expectedMethod);
    }
  }

  /**
   * Méthode générique de validation
   */
  private static validateMethod(expectedMethod: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (req.method !== expectedMethod) {
        console.warn(
          `⚠️ HTTP Method mismatch: ${req.method} !== ${expectedMethod} on ${req.originalUrl} from ${req.ip}`,
        );

        // Log d'audit pour sécurité
        console.error(`🚨 SECURITY ALERT: Wrong HTTP method attempted`, {
          expected: expectedMethod,
          received: req.method,
          url: req.originalUrl,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: TimezoneConfigUtils.getCurrentTime().toISOString(),
        });

        return R.handleError(res, HttpStatus.METHOD_NOT_ALLOWED, {
          code: 'method_not_allowed',
          message: `This endpoint only accepts ${expectedMethod} requests`,
        });
      }

      // Optionnel: Log des accès valides (pour debug)
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ ${expectedMethod} ${req.originalUrl} - Method validated`);
      }

      next();
    };
  }
}
