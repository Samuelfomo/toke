import { Request, Response, Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Sponsor from '../class/Sponsor.js';
import { InvitationStatus } from '../database/data/sponsor.db.js';
import R from '../../tools/response.js';
import Ensure from '../../middle/ensured-routes.js';

const router = Router();

// region VALIDATION HELPERS

/**
 * Valide le format du GUID (6 chiffres)
 */
const validateGuid = (guid: string): boolean => {
  return /^\d{6}$/.test(guid);
};

/**
 * Valide le format du numéro de téléphone
 */
const validatePhoneNumber = (phone: string): boolean => {
  return phone.length >= 5 && phone.length <= 50;
};

/**
 * Valide la structure des metadata
 */
const validateMetadata = (metadata: any): { valid: boolean; error?: string } => {
  // Vérification de base
  if (!metadata || typeof metadata !== 'object') {
    return { valid: false, error: 'Metadata must be an object' };
  }

  // Champs obligatoires
  const requiredFields = ['affiliate', 'lead', 'tenant'];
  for (const field of requiredFields) {
    if (!metadata[field]) {
      return { valid: false, error: `Metadata.${field} is required` };
    }
  }

  // ✅ affiliate et lead doivent être des chaînes non vides
  if (typeof metadata.affiliate !== 'string' || metadata.affiliate.trim() === '') {
    return { valid: false, error: 'Metadata.affiliate must be a non-empty string' };
  }
  if (typeof metadata.lead !== 'string' || metadata.lead.trim() === '') {
    return { valid: false, error: 'Metadata.lead must be a non-empty string' };
  }

  // ✅ tenant doit être un objet avec un sous-domaine valide
  if (typeof metadata.tenant !== 'object' || !metadata.tenant.subdomain) {
    return { valid: false, error: 'Metadata.tenant must be an object with a valid subdomain' };
  }

  const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
  if (!subdomainRegex.test(metadata.tenant.subdomain.toLowerCase())) {
    return { valid: false, error: 'Metadata.tenant.subdomain must be a valid subdomain' };
  }

  // Optionnel : vérifie si le tenant contient les autres champs utiles
  const tenantRequiredFields = ['name', 'country', 'email', 'phone'];
  for (const field of tenantRequiredFields) {
    if (!metadata.tenant[field]) {
      return { valid: false, error: `Metadata.tenant.${field} is required` };
    }
  }

  // Validation du champ user (optionnel)
  if (metadata.user !== null && metadata.user !== undefined) {
    if (typeof metadata.user !== 'number' && typeof metadata.user !== 'string') {
      return { valid: false, error: 'Metadata.user must be a number or string if provided' };
    }
  }

  // Validation des GUIDs (affiliate et lead)
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!guidRegex.test(metadata.affiliate)) {
    return { valid: false, error: 'Metadata.affiliate must be a valid GUID' };
  }
  if (!guidRegex.test(metadata.lead)) {
    return { valid: false, error: 'Metadata.lead must be a valid GUID' };
  }

  return { valid: true };
};

// region ROUTES

/**
 * GET / - Lister toutes les invitations
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const paginationOptions = { offset, limit };
    const invitations = await Sponsor._list({}, paginationOptions);

    const response = {
      invitations: {
        pagination: {
          offset,
          limit,
          count: invitations?.length || 0,
        },
        items: invitations?.map((inv) => inv.toJSON()) || [],
      },
    };

    R.handleSuccess(res, response);
  } catch (error: any) {
    console.error('❌ Erreur listing invitations:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'listing_failed',
      message: 'Failed to list invitations',
    });
  }
});

/**
 * GET /status/:status - Lister les invitations par statut
 */
router.get('/status/:status', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { status } = req.params;

    // Valider que le statut est valide
    if (!Object.values(InvitationStatus).includes(status as InvitationStatus)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_status',
        message: `Invalid status. Must be one of: ${Object.values(InvitationStatus).join(', ')}`,
      });
    }

    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const paginationOptions = { offset, limit };
    const invitations = await Sponsor._listByStatus(status as InvitationStatus, paginationOptions);

    const response = {
      invitations: {
        status,
        pagination: {
          offset,
          limit,
          count: invitations?.length || 0,
        },
        items: invitations?.map((inv) => inv.toJSON()) || [],
      },
    };

    R.handleSuccess(res, response);
  } catch (error: any) {
    console.error('❌ Erreur recherche par statut:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'status_search_failed',
      message: `Failed to search invitations by status: ${req.params.status}`,
    });
  }
});

/**
 * GET /phone/:phone - Rechercher une invitation par numéro de téléphone
 */
router.get('/phone/:phone', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;

    if (!validatePhoneNumber(phone)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_phone',
        message: 'Phone number must be between 5 and 50 characters',
      });
    }

    const invitation = await Sponsor._load(phone, false, true);

    if (!invitation) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'invitation_not_found',
        message: `Invitation with phone number '${phone}' not found`,
      });
    }

    R.handleSuccess(res, invitation.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur recherche par téléphone:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'phone_search_failed',
      message: 'Failed to search invitation by phone number',
    });
  }
});

/**
 * POST / - Créer une nouvelle invitation
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { phone_number, metadata } = req.body;

    // Validation du numéro de téléphone
    if (!phone_number || !validatePhoneNumber(phone_number)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_phone',
        message: 'Phone number is required and must be between 5 and 50 characters',
      });
    }

    console.log(phone_number, metadata);

    // Validation des metadata
    // const metadataValidation = validateMetadata(metadata);
    // if (!metadataValidation.valid) {
    //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
    //     code: 'invalid_metadata',
    //     message: metadataValidation.error,
    //   });
    // }

    const invitation = new Sponsor().setPhoneNumber(phone_number).setMetadata(metadata);

    await invitation.save();

    console.log(`✅ Invitation créée: ${phone_number} (GUID: ${invitation.getGuid()})`);

    return R.handleCreated(res, invitation.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur création invitation:', error.message);

    if (error.message.includes('already exists')) {
      R.handleError(res, HttpStatus.CONFLICT, {
        code: 'phone_already_exists',
        message: error.message,
      });
    } else {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'creation_failed',
        message: error.message,
      });
    }
  }
});

/**
 * PUT /:guid - Modifier une invitation par GUID
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_guid',
        message: 'GUID must be exactly 6 digits',
      });
    }

    const invitation = await Sponsor._load(parseInt(guid), true);

    if (!invitation) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'invitation_not_found',
        message: 'Invitation not found',
      });
    }

    const { phone_number, status, metadata } = req.body;

    // Mise à jour des champs fournis
    if (phone_number !== undefined) {
      if (!validatePhoneNumber(phone_number)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'invalid_phone',
          message: 'Phone number must be between 5 and 50 characters',
        });
      }
      invitation.setPhoneNumber(phone_number);
    }

    if (status !== undefined) {
      if (!Object.values(InvitationStatus).includes(status)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'invalid_status',
          message: `Invalid status. Must be one of: ${Object.values(InvitationStatus).join(', ')}`,
        });
      }
      invitation.setStatus(status);
    }

    if (metadata !== undefined) {
      // const metadataValidation = validateMetadata(metadata);
      // if (!metadataValidation.valid) {
      //   return R.handleError(res, HttpStatus.BAD_REQUEST, {
      //     code: 'invalid_metadata',
      //     message: metadataValidation.error,
      //   });
      // }
      invitation.setMetadata(metadata);
    }

    await invitation.save();

    console.log(`✅ Invitation modifiée: GUID ${guid}`);
    return R.handleSuccess(res, invitation.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur modification invitation:', error);

    if (error.message.includes('already exists')) {
      R.handleError(res, HttpStatus.CONFLICT, {
        code: 'phone_already_exists',
        message: error.message,
      });
    } else {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'update_failed',
        message: error.message,
      });
    }
  }
});

/**
 * GET /:identifier - Recherche intelligente par ID ou GUID
 */
router.get('/:identifier', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    let invitation: Sponsor | null = null;

    if (/^\d+$/.test(identifier)) {
      const numericId = parseInt(identifier);

      // Essayer par ID d'abord
      invitation = await Sponsor._load(numericId);

      // Si pas trouvé, essayer par GUID
      if (!invitation) {
        invitation = await Sponsor._load(numericId, true);
      }
    }

    if (!invitation) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'invitation_not_found',
        message: `Invitation with identifier '${identifier}' not found`,
      });
    }

    R.handleSuccess(res, invitation.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur recherche invitation:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'search_failed',
      message: 'Failed to search invitation',
    });
  }
});

/**
 * DELETE /:guid - Supprimer une invitation par GUID
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const { guid } = req.params;

    if (!validateGuid(guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_guid',
        message: 'GUID must be exactly 6 digits',
      });
    }

    const invitation = await Sponsor._load(parseInt(guid), true);

    if (!invitation) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'invitation_not_found',
        message: 'Invitation not found',
      });
    }

    const deleted = await invitation.delete();

    if (deleted) {
      console.log(`✅ Invitation supprimée: GUID ${guid} (${invitation.getPhoneNumber()})`);
      R.handleSuccess(res, {
        message: 'Invitation deleted successfully',
        guid: guid,
        phone_number: invitation.getPhoneNumber(),
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'delete_failed',
        message: 'Failed to delete invitation',
      });
    }
  } catch (error: any) {
    console.error('❌ Erreur suppression invitation:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'delete_failed',
      message: error.message,
    });
  }
});

export default router;
