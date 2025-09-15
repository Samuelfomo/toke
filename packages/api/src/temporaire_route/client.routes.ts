import { Request, Response, Router } from 'express';

import Client from '../license/class/Client.js';
import R from '../tools/response.js';
import HttpStatus from '../tools/http-status.js';
import Ensure from '../license/middle/ensured-routes.js';
import ExtractQueryParams from '../utils/extract.query.params.js';
import ClientProfil from '../license/class/ClientProfil.js';
import G from '../tools/glossary.js';

const router = Router();

/**
 * GET / - Lister tous les clients
 */
router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = await ExtractQueryParams.extractPaginationFromQuery(req.query);

    const clients = await Client._list();
    if (!clients) {
      return R.handleSuccess(res, {
        clients: {
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
    const endIndex = startIndex + (paginationOptions.limit || clients.length);
    const paginatedClients = clients.slice(startIndex, endIndex);

    const clientsWithProfiles = await Promise.all(
      paginatedClients.map(async (client) => await client.toJSON()),
    );

    const result = {
      pagination: {
        offset: startIndex,
        limit: paginationOptions.limit || clients.length,
        count: clientsWithProfiles.length,
        total: clients.length,
      },
      items: clientsWithProfiles,
    };

    return R.handleSuccess(res, { clients: result });
  } catch (error: any) {
    console.error('Erreur listing clients:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'clients_listing_failed',
      message: 'Failed to list clients',
    });
  }
});

/**
 * GET /:id - Récupérer un client par ID
 */
router.get('/:id', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_client_id',
        message: 'Client ID must be a valid number',
      });
    }

    const client = await Client._load(id);
    if (!client) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'client_not_found',
        message: 'Client not found',
      });
    }

    return R.handleSuccess(res, { client: await client.toJSON() });
  } catch (error: any) {
    console.error('Erreur récupération client:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'client_fetch_failed',
      message: 'Failed to fetch client',
    });
  }
});

/**
 * POST / - Créer un nouveau client
 */
router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { name, secret, profile } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_name',
        message: 'Client name is required',
      });
    }

    if (!secret || secret.length < 8) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_secret',
        message: 'Client secret must be at least 8 characters',
      });
    }

    if (!profile || isNaN(parseInt(profile))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_profile',
        message: 'Valid profile ID is required',
      });
    }

    const ProfileObj = await ClientProfil._load(profile);
    if (!ProfileObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, G.dataNotFound);
    }

    const client = new Client().setName(name.trim()).setSecret(secret).setProfil(parseInt(profile));

    await client.save();

    console.log('Client créé avec succès:', client.getName());
    return R.handleCreated(res, await client.toJSON());
  } catch (error: any) {
    console.error('Erreur création client:', error);

    if (error.message.includes('already exists') || error.message.includes('unique')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: 'client_already_exists',
        message: error.message,
      });
    }

    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'client_creation_failed',
      message: error.message,
    });
  }
});

/**
 * PUT /:id - Mettre à jour un client
 */
router.put('/:id', Ensure.put(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_client_id',
        message: 'Client ID must be a valid number',
      });
    }

    const client = await Client._load(id);
    if (!client) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'client_not_found',
        message: 'Client not found',
      });
    }

    const { name, profile } = req.body;

    // Mise à jour conditionnelle
    if (name && name.trim()) {
      client.setName(name.trim());
    }

    if (profile && !isNaN(parseInt(profile))) {
      client.setProfil(parseInt(profile));
    }

    await client.save();

    return R.handleSuccess(res, await client.toJSON());
  } catch (error: any) {
    console.error('Erreur mise à jour client:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'client_update_failed',
      message: error.message,
    });
  }
});

/**
 * PATCH /:id/status - Changer le statut d'un client
 */
router.patch('/:id/status', Ensure.patch(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_client_id',
        message: 'Client ID must be a valid number',
      });
    }

    const client = await Client._load(id);
    if (!client) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'client_not_found',
        message: 'Client not found',
      });
    }

    await client.patchStatus();

    return R.handleSuccess(res, await client.toJSON());
  } catch (error: any) {
    console.error('Erreur changement statut client:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'client_status_change_failed',
      message: error.message,
    });
  }
});

/**
 * DELETE /:id - Supprimer un client
 */
router.delete('/:id', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_client_id',
        message: 'Client ID must be a valid number',
      });
    }

    const client = await Client._load(id);
    if (!client) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'client_not_found',
        message: 'Client not found',
      });
    }

    const clientName = client.getName();
    const deleted = await client.delete();

    if (deleted) {
      console.log(`Client supprimé: ID ${id} (${clientName})`);
      return R.handleSuccess(res, {
        message: 'Client deleted successfully',
        id: id,
        name: clientName,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: 'deletion_failed',
        message: 'Failed to delete client',
      });
    }
  } catch (error: any) {
    console.error('Erreur suppression client:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'client_deletion_failed',
      message: error.message,
    });
  }
});

export default router;
