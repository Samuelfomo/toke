import { Request, Response, Router } from 'express';

import ClientProfil from '../license/class/ClientProfil.js';
import R from '../tools/response.js';
import HttpStatus from '../tools/http-status.js';
import Ensure from '../license/middle/ensured-routes.js';
import ExtractQueryParams from '../utils/extract.query.params.js';

const router = Router();

/**
 * GET / - Lister tous les profils
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = await ExtractQueryParams.extractPaginationFromQuery(req.query);

    const profiles = await ClientProfil._list();
    if (!profiles) {
      return R.handleSuccess(res, {
        profiles: {
          pagination: {
            offset: paginationOptions.offset || 0,
            limit: paginationOptions.limit || 0,
            count: 0,
          },
          items: [],
        },
      });
    }

    // Pagination manuelle
    const startIndex = paginationOptions.offset || 0;
    const endIndex = startIndex + (paginationOptions.limit || profiles.length);
    const paginatedProfiles = profiles.slice(startIndex, endIndex);

    const profilesJson = paginatedProfiles.map((profile) => ({
      id: profile.getId(),
      name: profile.getName(),
      description: profile.getDescription(),
      root: profile.isRoot(),
      ...profile.toJSON(),
    }));

    const result = {
      pagination: {
        offset: startIndex,
        limit: paginationOptions.limit || profiles.length,
        count: profilesJson.length,
        total: profiles.length,
      },
      items: profilesJson,
    };

    return R.handleSuccess(res, { profiles: result });
  } catch (error: any) {
    console.error('Erreur listing profiles:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'profiles_listing_failed',
      message: 'Failed to list profiles',
    });
  }
});

/**
 * GET /:id - Récupérer un profil par ID
 */
router.get('/:id', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_profile_id',
        message: 'Profile ID must be a valid number',
      });
    }

    const profile = await ClientProfil._load(id);
    if (!profile) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'profile_not_found',
        message: 'Profile not found',
      });
    }

    return R.handleSuccess(res, {
      profile: {
        id: profile.getId(),
        name: profile.getName(),
        description: profile.getDescription(),
        root: profile.isRoot(),
        ...profile.toJSON(),
      },
    });
  } catch (error: any) {
    console.error('Erreur récupération profile:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'profile_fetch_failed',
      message: 'Failed to fetch profile',
    });
  }
});

/**
 * GET /check-admin - Vérifier s'il existe déjà un profil admin
 */
router.get('/check-admin', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const hasAdmin = await new ClientProfil().getExitAdmin();
    return R.handleSuccess(res, {
      hasAdmin,
      message: hasAdmin ? 'Admin profile exists' : 'No admin profile found',
    });
  } catch (error: any) {
    console.error('Erreur vérification admin:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'admin_check_failed',
      message: 'Failed to check admin status',
    });
  }
});

/**
 * POST / - Créer un nouveau profil
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { name, description, root } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_name',
        message: 'Profile name is required',
      });
    }

    if (name.trim().length < 2 || name.trim().length > 128) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_name_length',
        message: 'Profile name must be between 2 and 128 characters',
      });
    }

    if (description && (description.length < 10 || description.length > 500)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_description_length',
        message: 'Profile description must be between 10 and 500 characters',
      });
    }

    // Vérifier s'il y a déjà un admin si on veut créer un profil root
    if (root === true) {
      const hasAdmin = await new ClientProfil().getExitAdmin();
      if (hasAdmin) {
        return R.handleError(res, HttpStatus.CONFLICT, {
          code: 'admin_already_exists',
          message: 'Admin profile already exists',
        });
      }
    }

    const profile = new ClientProfil()
      .setName(name.trim())
      .setDescription(description?.trim() || undefined)
      .setRoot(root === true);

    await profile.save();

    console.log('Profil créé avec succès:', profile.getName());
    return R.handleCreated(res, {
      id: profile.getId(),
      name: profile.getName(),
      description: profile.getDescription(),
      root: profile.isRoot(),
      ...profile.toJSON(),
    });
  } catch (error: any) {
    console.error('Erreur création profil:', error);

    if (error.message.includes('already exists') || error.message.includes('unique')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: 'profile_already_exists',
        message: error.message,
      });
    }

    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'profile_creation_failed',
      message: error.message,
    });
  }
});

/**
 * PUT /:id - Mettre à jour un profil
 */
router.put('/:id', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_profile_id',
        message: 'Profile ID must be a valid number',
      });
    }

    const profile = await ClientProfil._load(id);
    if (!profile) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'profile_not_found',
        message: 'Profile not found',
      });
    }

    const { name, description, root } = req.body;

    // Mise à jour conditionnelle du nom
    if (name && name.trim()) {
      if (name.trim().length < 2 || name.trim().length > 128) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'invalid_name_length',
          message: 'Profile name must be between 2 and 128 characters',
        });
      }
      profile.setName(name.trim());
    }

    // Mise à jour de la description
    if (description !== undefined) {
      if (description && (description.length < 10 || description.length > 500)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: 'invalid_description_length',
          message: 'Profile description must be between 10 and 500 characters',
        });
      }
      profile.setDescription(description?.trim() || undefined);
    }

    // Gestion du statut root
    if (root !== undefined && typeof root === 'boolean') {
      if (root === true && !profile.isRoot()) {
        // Vérifier s'il y a déjà un admin
        const hasAdmin = await new ClientProfil().getExitAdmin();
        if (hasAdmin) {
          return R.handleError(res, HttpStatus.CONFLICT, {
            code: 'admin_already_exists',
            message: 'Admin profile already exists',
          });
        }
      }
      profile.setRoot(root);
    }

    await profile.save();

    return R.handleSuccess(res, {
      id: profile.getId(),
      name: profile.getName(),
      description: profile.getDescription(),
      root: profile.isRoot(),
      ...profile.toJSON(),
    });
  } catch (error: any) {
    console.error('Erreur mise à jour profil:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'profile_update_failed',
      message: error.message,
    });
  }
});

/**
 * DELETE /:id - Supprimer un profil
 */
router.delete('/:id', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_profile_id',
        message: 'Profile ID must be a valid number',
      });
    }

    const profile = await ClientProfil._load(id);
    if (!profile) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'profile_not_found',
        message: 'Profile not found',
      });
    }

    const profileName = profile.getName();
    const deleted = await profile.delete();

    if (deleted) {
      console.log(`Profil supprimé: ID ${id} (${profileName})`);
      return R.handleSuccess(res, {
        message: 'Profile deleted successfully',
        id: id,
        name: profileName,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'deletion_failed',
        message: 'Failed to delete profile',
      });
    }
  } catch (error: any) {
    console.error('Erreur suppression profil:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'profile_deletion_failed',
      message: error.message,
    });
  }
});

export default router;
