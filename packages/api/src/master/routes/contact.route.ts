import { Request, Response, Router } from 'express';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { ERROR_CODES, HttpStatus, paginationSchema, UsersValidationUtils } from '@toke/shared';

import { Contact } from '../class/Contact.js';
import R from '../../tools/response.js';
import Ensure from '../../middle/ensured-routes.js';
import Revision from '../../tools/revision.js';
import { tableName as TS } from '../../utils/response.model.js';

const router = Router();

// region ROUTES D'EXPORT

/**
 * GET /revision - Récupérer uniquement la révision actuelle
 */
router.get('/revision', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(TS.CONTACT);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Erreur récupération révision:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'revision_check_failed',
      message: 'Failed to get current revision',
    });
  }
});

/**
 * GET /tenant/:tenant - Lister les contacts par tenant
 */
router.get('/tenant/:tenant', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { tenant } = req.params;
    const paginationOptions = paginationSchema.parse(req.query);

    const contactsData = await Contact._listByTenant(tenant, paginationOptions);

    const contacts = {
      tenant,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || contactsData?.length || 0,
        count: contactsData?.length || 0,
      },
      items: contactsData?.map((contact) => contact.toJSON()) || [],
    };

    R.handleSuccess(res, { contacts });
  } catch (error: any) {
    console.error('❌ Erreur recherche par tenant:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'tenant_search_failed',
      message: `Failed to search contacts by tenant: ${req.params.tenant}`,
    });
  }
});

/**
 * GET /phone/:phone - Rechercher un contact par numéro de téléphone
 */
router.get('/phone/:phone', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;

    // Validation du numéro avec libphonenumber-js
    if (!isValidPhoneNumber(phone)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_phone',
        message:
          'Invalid phone number format. Please use E.164 format with + prefix. Example: +33612345678',
      });
    }

    const contact = await Contact._load(phone, false, true);

    if (!contact) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'contact_not_found',
        message: 'Contact search failed. Contact not found.',
      });
    }

    R.handleSuccess(res, contact.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur recherche par téléphone:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'phone_search_failed',
      message: 'Failed to search contact by phone',
    });
  }
});

// endregion

// region ROUTES CRUD

/**
 * POST / - Créer un nouveau contact
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { phone, tenant } = req.body;
    if (!phone) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'phone_required',
        message: 'Phone number is required',
      });
    }
    if (!isValidPhoneNumber(phone)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_phone',
        message:
          'Invalid phone number format. Please use E.164 format with + prefix. Example: +33612345678',
      });
    }
    if (tenant && typeof tenant !== 'string') {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'tenant_invalid',
        message: 'Invalid tenant format. Please use a string.',
      });
    }
    // const validatedData = validateContactCreation(req.body);

    const contact = new Contact().setPhone(phone);

    if (tenant) {
      contact.setTenant(tenant);
    }

    await contact.save();

    console.log(`✅ Contact créé: ${phone} (GUID: ${contact.getGuid()})`);
    return R.handleCreated(res, contact.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur création contact:', error.message);

    if (error.message.includes('already exists') || error.message.includes('unique')) {
      R.handleError(res, HttpStatus.CONFLICT, {
        code: 'contact_already_exists',
        message: 'Contact already exists. Please use a different phone number.',
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ERROR_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * PUT /:guid - Modifier un contact par GUID
 */
router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    // Validation du GUID
    if (!UsersValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.INVALID_GUID,
        message: 'Contact guid invalid',
      });
    }

    const { phone, tenant } = req.body;
    if (phone !== undefined && !isValidPhoneNumber(phone)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_phone',
        message:
          'Invalid phone number format. Please use E.164 format with + prefix. Example: +33612345678',
      });
    }
    if (tenant !== undefined && typeof tenant !== 'string') {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'tenant_invalid',
        message: 'Invalid tenant format. Please use a string.',
      });
    }

    const contact = await Contact._load(req.params.guid, true);
    if (!contact) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'contact_not_found',
        message: 'Contact not found. Please check the GUID and try again.',
      });
    }

    // Mise à jour des champs fournis
    if (phone !== undefined) contact.setPhone(phone);
    if (tenant !== undefined) contact.setTenant(tenant!);

    await contact.save();

    console.log(`✅ Contact modifié: GUID ${req.params.guid}`);
    return R.handleSuccess(res, contact.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur modification contact:', error);
    if (error.message.includes('already exists') || error.message.includes('unique')) {
      R.handleError(res, HttpStatus.CONFLICT, {
        code: 'contact_already_exists',
        message: 'Contact already exists. Please use a different phone number.',
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ERROR_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

/**
 * DELETE /:guid - Supprimer un contact par GUID
 */
router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!UsersValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.INVALID_GUID,
        message: 'Invalid contact GUID. Please provide a valid GUID.',
      });
    }

    const contact = await Contact._load(req.params.guid, true);
    if (!contact) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'contact_not_found',
        message: 'Contact not found. Please check the GUID and try again.',
      });
    }

    const deleted = await contact.delete();

    if (deleted) {
      console.log(`✅ Contact supprimé: GUID ${req.params.guid} (${contact.getPhone()})`);
      R.handleSuccess(res, {
        message: 'Contact deleted successfully',
        guid: contact.getGuid(),
        phone: contact.getPhone(),
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ERROR_CODES.DELETE_FAILED,
        message: 'Contact deletion failed',
      });
    }
  } catch (error: any) {
    console.error('❌ Erreur suppression contact:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ERROR_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

// endregion

// region ROUTES UTILITAIRES

/**
 * GET /list - Lister tous les contacts avec filtres
 */
router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);

    const conditions: Record<string, any> = {};

    const contactEntries = await Contact._list(conditions, paginationOptions);

    const contacts = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || contactEntries?.length || 0,
        count: contactEntries?.length || 0,
      },
      items: contactEntries?.map((contact) => contact.toJSON()) || [],
    };

    R.handleSuccess(res, { contacts });
  } catch (error: any) {
    console.error('❌ Erreur listing contacts:', error);

    if (error.issues) {
      R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Invalid filters or pagination parameters',
        details: error.issues,
      });
    } else {
      R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ERROR_CODES.LISTING_FAILED,
        message: 'Failed to export contacts',
      });
    }
  }
});

/**
 * GET /:identifier - Recherche intelligente par ID, GUID ou téléphone
 */
router.get('/:identifier', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    let contact: Contact | null = null;

    // Essayer différentes méthodes de recherche selon le format
    if (/^\d+$/.test(identifier) && identifier.length <= 10) {
      // Petit nombre : essayer par ID
      const numericId = parseInt(identifier);
      contact = await Contact._load(numericId);

      // Si pas trouvé, essayer par GUID
      if (!contact && identifier.length === 16) {
        contact = await Contact._load(identifier, true);
      }
    } else if (identifier.length === 16 && /^[a-zA-Z0-9]{16}$/.test(identifier)) {
      // Format GUID
      contact = await Contact._load(identifier, true);
    } else if (/^\+?\d+$/.test(identifier)) {
      // Format téléphone
      contact = await Contact._load(identifier, false, true);
    }

    if (!contact) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'contact_not_found',
        message: `Contact with identifier '${identifier}' not found`,
      });
    }

    R.handleSuccess(res, contact.toJSON());
  } catch (error: any) {
    console.error('❌ Erreur recherche contact:', error);
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'search_failed',
      message: 'Failed to search contact',
    });
  }
});

// endregion

export default router;
