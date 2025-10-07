import { Request, Response, Router } from 'express';
import {
  HttpStatus,
  ORG_HIERARCHY_CODES,
  ORG_HIERARCHY_ERRORS,
  OrgHierarchyValidationUtils,
  paginationSchema,
  RelationshipType,
  USERS_CODES,
  USERS_ERRORS,
  UsersValidationUtils,
  validateOrgHierarchyCreation,
  validateOrgHierarchyFilters,
  validateOrgHierarchyUpdate,
} from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import User from '../class/User.js';
import OrgHierarchy from '../class/OrgHierarchy.js';
import Revision from '../../tools/revision.js';
import { responseValue, tableName } from '../../utils/response.model.js';
import UserRole from '../class/UserRole.js';

const router = Router();

// === ROUTES DE LISTAGE GÉNÉRAL ===

router.get('/', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationData = paginationSchema.parse(req.query);
    const exportableHierarchies = await OrgHierarchy.exportable({}, paginationData);

    return R.handleSuccess(res, {
      exportableHierarchies,
    });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.PAGINATION_INVALID,
        message: ORG_HIERARCHY_ERRORS.PAGINATION_INVALID,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ORG_HIERARCHY_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

router.get('/revision', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const revision = await Revision.getRevision(tableName.ORG_HIERARCHY);

    R.handleSuccess(res, {
      revision,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ORG_HIERARCHY_CODES.REVISION_FAILED,
      message: error.message,
    });
  }
});

router.get('/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const filters = validateOrgHierarchyFilters(req.query);
    const paginationOptions = paginationSchema.parse(req.query);
    const conditions: Record<string, any> = {};

    if (filters.department) {
      conditions.department = filters.department;
    }
    if (filters.cost_center) {
      conditions.cost_center = filters.cost_center;
    }
    if (filters.relationship_type) {
      conditions.relationship_type = filters.relationship_type;
    }
    if (filters.delegation_level) {
      conditions.delegation_level = filters.delegation_level;
    }

    const hierarchyEntries = await OrgHierarchy._list(conditions, paginationOptions);
    const hierarchies = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || hierarchyEntries?.length || 0,
        count: hierarchyEntries?.length || 0,
      },
      items: hierarchyEntries
        ? await Promise.all(hierarchyEntries.map(async (hierarchy) => await hierarchy.toJSON()))
        : [],
    };

    return R.handleSuccess(res, { hierarchies });
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.VALIDATION_FAILED,
        message: ORG_HIERARCHY_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ORG_HIERARCHY_CODES.LISTING_FAILED,
        message: error.message,
      });
    }
  }
});

// === RELATIONS ACTIVES ===

router.get('/active', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const paginationOptions = paginationSchema.parse(req.query);
    const hierarchyEntries = await OrgHierarchy._listActiveRelations();

    // Application de la pagination côté application
    const offset = paginationOptions.offset || 0;
    const limit = paginationOptions.limit;
    const paginatedItems = limit
      ? hierarchyEntries?.slice(offset, offset + limit)
      : hierarchyEntries?.slice(offset);

    const hierarchies = {
      pagination: {
        offset,
        limit: limit || paginatedItems?.length || 0,
        count: paginatedItems?.length || 0,
        total: hierarchyEntries?.length || 0,
      },
      items: paginatedItems
        ? await Promise.all(paginatedItems.map(async (hierarchy) => await hierarchy.toJSON()))
        : [],
    };

    return R.handleSuccess(res, { activeHierarchies: hierarchies });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ORG_HIERARCHY_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// // === 🔍 Get complete hierarchical list of all employees under manager's responsibility (recursive) === //
// router.get('/employee/all-subordinates', Ensure.get(), async (req: Request, res: Response) => {
//   try {
//     const { supervisor } = req.query;
//
//     // Vérification du GUID
//     if (!supervisor || !UsersValidationUtils.validateGuid(String(supervisor))) {
//       return R.handleError(res, HttpStatus.BAD_REQUEST, {
//         code: ORG_HIERARCHY_CODES.INVALID_GUID,
//         message: ORG_HIERARCHY_ERRORS.GUID_INVALID,
//       });
//     }
//
//     // Chargement du superviseur
//     const supervisorObj = await User._load(String(supervisor), true);
//     if (!supervisorObj) {
//       return R.handleError(res, HttpStatus.NOT_FOUND, {
//         code: USERS_CODES.USER_NOT_FOUND,
//         message: USERS_ERRORS.NOT_FOUND,
//       });
//     }
//
//     // Appel de la méthode récursive
//     const allSubordinates = await OrgHierarchy._getAllSubordinates(supervisorObj.getId()!);
//
//     const allRoles = await Promise.all(
//       allSubordinates.map(async (user) => await UserRole._listByUser(user.getId()!)),
//     );
//
//     return R.handleSuccess(res, {
//       supervisor: supervisorObj.toPublicJSON(),
//       total: allSubordinates.length,
//       allSubordinates: allSubordinates.map((s) => s.toPublicJSON()),
//     });
//   } catch (error: any) {
//     return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
//       code: ORG_HIERARCHY_CODES.LISTING_FAILED,
//       message: error.message,
//     });
//   }
// });

// === 🔍 Get complete hierarchical list of all employees under manager's responsibility (recursive) === //
router.get('/employee/all-subordinates', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { supervisor } = req.query;

    // Vérification du GUID
    if (!supervisor || !UsersValidationUtils.validateGuid(String(supervisor))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.INVALID_GUID,
        message: ORG_HIERARCHY_ERRORS.GUID_INVALID,
      });
    }

    // Chargement du superviseur
    const supervisorObj = await User._load(String(supervisor), true);
    if (!supervisorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    // Construction hiérarchique récursive
    const hierarchyTree = await OrgHierarchy._buildHierarchyTree(supervisorObj.getId()!);

    // Rôles du superviseur lui-même
    const supervisorRoles = await UserRole._listByUser(supervisorObj.getId()!);

    return R.handleSuccess(res, {
      supervisor: supervisorObj.toPublicJSON(),
      supervisor_roles: supervisorRoles
        ? await Promise.all(supervisorRoles.map(async (r) => await r.toJSON(responseValue.MINIMAL)))
        : [],
      total_subordinates: hierarchyTree.length,
      hierarchy: hierarchyTree,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ORG_HIERARCHY_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === CRÉATION DE RELATION HIÉRARCHIQUE ===

router.post('/', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const validatedData = validateOrgHierarchyCreation(req.body);

    // Vérification de l'existence du subordonné
    const subordinateObj = await User._load(validatedData.subordinate, true);
    if (!subordinateObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'Subordinate user not found',
      });
    }

    // Vérification de l'existence du superviseur
    const supervisorObj = await User._load(validatedData.supervisor, true);
    if (!supervisorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'Supervisor user not found',
      });
    }

    const hierarchyObj = new OrgHierarchy()
      .setSubordinate(subordinateObj.getId()!)
      .setSupervisor(supervisorObj.getId()!)
      .setRelationshipType(validatedData.relationship_type || RelationshipType.DIRECT_REPORT)
      .setEffectiveFrom(validatedData.effective_from);

    if (validatedData.effective_to) {
      hierarchyObj.setEffectiveTo(validatedData.effective_to);
    }
    if (validatedData.department) {
      hierarchyObj.setDepartment(validatedData.department);
    }
    if (validatedData.cost_center) {
      hierarchyObj.setCostCenter(validatedData.cost_center);
    }
    if (validatedData.delegation_level) {
      hierarchyObj.setDelegationLevel(validatedData.delegation_level);
    }

    await hierarchyObj.save();

    return R.handleCreated(res, await hierarchyObj.toJSON());
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.VALIDATION_FAILED,
        message: ORG_HIERARCHY_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('org_hierarchy_already_exists')) {
      return R.handleError(res, HttpStatus.CONFLICT, {
        code: ORG_HIERARCHY_CODES.ORG_HIERARCHY_ALREADY_EXISTS,
        message: ORG_HIERARCHY_ERRORS.DUPLICATE_HIERARCHY,
      });
    } else if (error.message.includes('self_supervision')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.SELF_SUPERVISION_INVALID,
        message: ORG_HIERARCHY_ERRORS.SELF_SUPERVISION_INVALID,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ORG_HIERARCHY_CODES.CREATION_FAILED,
        message: error.message,
      });
    }
  }
});

// === RÉCUPÉRATION PAR GUID ===

router.get('/:guid', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!OrgHierarchyValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.INVALID_GUID,
        message: ORG_HIERARCHY_ERRORS.GUID_INVALID,
      });
    }

    const hierarchyObj = await OrgHierarchy._load(req.params.guid, true);
    if (!hierarchyObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ORG_HIERARCHY_CODES.ORG_HIERARCHY_NOT_FOUND,
        message: ORG_HIERARCHY_ERRORS.NOT_FOUND,
      });
    }

    return R.handleSuccess(res, {
      hierarchy: await hierarchyObj.toJSON(),
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ORG_HIERARCHY_CODES.RETRIEVAL_FAILED,
      message: error.message,
    });
  }
});

// === MISE À JOUR DE RELATION ===

router.put('/:guid', Ensure.put(), async (req: Request, res: Response) => {
  try {
    if (!OrgHierarchyValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.INVALID_GUID,
        message: ORG_HIERARCHY_ERRORS.GUID_INVALID,
      });
    }

    const hierarchyObj = await OrgHierarchy._load(req.params.guid, true);
    if (!hierarchyObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ORG_HIERARCHY_CODES.ORG_HIERARCHY_NOT_FOUND,
        message: ORG_HIERARCHY_ERRORS.NOT_FOUND,
      });
    }

    const validatedData = validateOrgHierarchyUpdate(req.body);

    if (validatedData.subordinate) {
      const subordinateObj = await User._load(validatedData.subordinate, true);
      if (!subordinateObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: 'Subordinate user not found',
        });
      }
      hierarchyObj.setSubordinate(subordinateObj.getId()!);
    }

    if (validatedData.supervisor) {
      const supervisorObj = await User._load(validatedData.supervisor, true);
      if (!supervisorObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: 'Supervisor user not found',
        });
      }
      hierarchyObj.setSupervisor(supervisorObj.getId()!);
    }

    if (validatedData.relationship_type) {
      hierarchyObj.setRelationshipType(validatedData.relationship_type);
    }
    if (validatedData.effective_from) {
      hierarchyObj.setEffectiveFrom(validatedData.effective_from);
    }
    if (validatedData.effective_to !== undefined) {
      hierarchyObj.setEffectiveTo(validatedData.effective_to);
    }
    if (validatedData.department) {
      hierarchyObj.setDepartment(validatedData.department);
    }
    if (validatedData.cost_center) {
      hierarchyObj.setCostCenter(validatedData.cost_center);
    }
    if (validatedData.delegation_level) {
      hierarchyObj.setDelegationLevel(validatedData.delegation_level);
    }

    await hierarchyObj.save();
    return R.handleSuccess(res, await hierarchyObj.toJSON());
  } catch (error: any) {
    if (error.issues) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.VALIDATION_FAILED,
        message: ORG_HIERARCHY_ERRORS.VALIDATION_FAILED,
        details: error.issues,
      });
    } else if (error.message.includes('self_supervision')) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.SELF_SUPERVISION_INVALID,
        message: ORG_HIERARCHY_ERRORS.SELF_SUPERVISION_INVALID,
      });
    } else {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ORG_HIERARCHY_CODES.UPDATE_FAILED,
        message: error.message,
      });
    }
  }
});

// === SUPPRESSION DE RELATION ===

router.delete('/:guid', Ensure.delete(), async (req: Request, res: Response) => {
  try {
    if (!OrgHierarchyValidationUtils.validateGuid(req.params.guid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.INVALID_GUID,
        message: ORG_HIERARCHY_ERRORS.GUID_INVALID,
      });
    }

    const hierarchyObj = await OrgHierarchy._load(req.params.guid, true);
    if (!hierarchyObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ORG_HIERARCHY_CODES.ORG_HIERARCHY_NOT_FOUND,
        message: ORG_HIERARCHY_ERRORS.NOT_FOUND,
      });
    }

    await hierarchyObj.delete();
    return R.handleSuccess(res, {
      message: 'Organizational hierarchy deleted successfully',
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ORG_HIERARCHY_CODES.DELETE_FAILED,
      message: error.message,
    });
  }
});

// === ROUTES PAR UTILISATEUR ===

// === Liste des relations où cet utilisateur est le subordonné ===
router.get('/subordinate/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!OrgHierarchyValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.INVALID_GUID,
        message: ORG_HIERARCHY_ERRORS.GUID_INVALID,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const hierarchyEntries = await OrgHierarchy._listBySubordinate(
      userObj.getId()!,
      paginationOptions,
    );
    const hierarchies = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || hierarchyEntries?.length || 0,
        count: hierarchyEntries?.length || 0,
      },
      user: userObj.toPublicJSON(),
      relations: hierarchyEntries
        ? await Promise.all(
            hierarchyEntries.map(
              async (hierarchy) => await hierarchy.toJSON(responseValue.MINIMAL),
            ),
          )
        : [],
    };

    return R.handleSuccess(res, { hierarchies });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ORG_HIERARCHY_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === Liste les subordonnés immédiats d’un superviseur (1er niveau seulement). ===
router.get('/supervisor/:userGuid/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!OrgHierarchyValidationUtils.validateGuid(req.params.userGuid)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.INVALID_GUID,
        message: ORG_HIERARCHY_ERRORS.GUID_INVALID,
      });
    }

    const paginationOptions = paginationSchema.parse(req.query);

    const userObj = await User._load(req.params.userGuid, true);
    if (!userObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    const hierarchyEntries = await OrgHierarchy._listBySupervisor(
      userObj.getId()!,
      paginationOptions,
    );
    const hierarchies = {
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || hierarchyEntries?.length || 0,
        count: hierarchyEntries?.length || 0,
      },
      supervisor: userObj.toPublicJSON(),
      subordinates: hierarchyEntries
        ? await Promise.all(
            hierarchyEntries.map(
              async (hierarchy) => await hierarchy.toJSON(responseValue.MINIMAL),
            ),
          )
        : [],
    };

    return R.handleSuccess(res, { hierarchies });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ORG_HIERARCHY_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === RÉSOLUTION HIÉRARCHIQUE ===

// === Trouver le superviseur actif d’un subordonné (à une date donnée) ===
router.get(
  '/subordinate/:userGuid/current-supervisor',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      if (!OrgHierarchyValidationUtils.validateGuid(req.params.userGuid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ORG_HIERARCHY_CODES.INVALID_GUID,
          message: ORG_HIERARCHY_ERRORS.GUID_INVALID,
        });
      }

      const userObj = await User._load(req.params.userGuid, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: USERS_ERRORS.NOT_FOUND,
        });
      }

      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const currentSupervisor = await OrgHierarchy.getCurrentSupervisor(userObj.getId()!, date);

      if (!currentSupervisor) {
        return R.handleSuccess(res, {
          subordinate: userObj.toPublicJSON(),
          current_supervisor: null,
          message: 'No active supervisor found for this user',
        });
      }

      return R.handleSuccess(res, {
        subordinate: userObj.toPublicJSON(),
        current_supervisor: await currentSupervisor.toJSON(),
      });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ORG_HIERARCHY_CODES.SUPERVISOR_RESOLUTION_FAILED,
        message: error.message,
      });
    }
  },
);

// === Trouver les subordonnés actifs directs d’un superviseur (à une date donnée) ===
router.get(
  '/supervisor/:userGuid/active-subordinates',
  Ensure.get(),
  async (req: Request, res: Response) => {
    try {
      if (!OrgHierarchyValidationUtils.validateGuid(req.params.userGuid)) {
        return R.handleError(res, HttpStatus.BAD_REQUEST, {
          code: ORG_HIERARCHY_CODES.INVALID_GUID,
          message: ORG_HIERARCHY_ERRORS.GUID_INVALID,
        });
      }

      const paginationOptions = paginationSchema.parse(req.query);

      const userObj = await User._load(req.params.userGuid, true);
      if (!userObj) {
        return R.handleError(res, HttpStatus.NOT_FOUND, {
          code: USERS_CODES.USER_NOT_FOUND,
          message: USERS_ERRORS.NOT_FOUND,
        });
      }

      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const activeSubordinates = await OrgHierarchy.getActiveSubordinates(
        userObj.getId()!,
        date,
        paginationOptions,
      );

      const subordinatesData = {
        pagination: {
          offset: paginationOptions.offset || 0,
          limit: paginationOptions.limit || activeSubordinates?.length || 0,
          count: activeSubordinates?.length || 0,
        },
        supervisor: userObj.toPublicJSON(),
        active_subordinates: activeSubordinates
          ? await Promise.all(activeSubordinates.map(async (hierarchy) => await hierarchy.toJSON()))
          : [],
      };

      return R.handleSuccess(res, { subordinatesData });
    } catch (error: any) {
      return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
        code: ORG_HIERARCHY_CODES.SUBORDINATES_RESOLUTION_FAILED,
        message: error.message,
      });
    }
  },
);

// === TRANSFERT D'EMPLOYÉ ===

// ↔️ Transfer employee to another manager within the organization hierarchy
router.post('/reassign', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const { subordinate, new_supervisor, effective_date } = req.body;

    if (!subordinate || !new_supervisor || !effective_date) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.VALIDATION_FAILED,
        message: 'subordinate, new_supervisor and effective_date are required',
      });
    }

    if (!UsersValidationUtils.validateGuid(subordinate)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.SUBORDINATE_INVALID,
        message: ORG_HIERARCHY_ERRORS.SUBORDINATE_INVALID,
      });
    }

    if (!UsersValidationUtils.validateGuid(new_supervisor)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.VALIDATION_FAILED,
        message: ORG_HIERARCHY_ERRORS.SUPERVISOR_INVALID,
      });
    }

    if (!OrgHierarchyValidationUtils.validateEffectiveFrom(effective_date)) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.VALIDATION_FAILED,
        message: ORG_HIERARCHY_ERRORS.EFFECTIVE_FROM_INVALID,
      });
    }

    // Vérification des utilisateurs
    const subordinateObj = await User._load(subordinate, true);
    if (!subordinateObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'Subordinate user not found',
      });
    }

    const newSupervisorObj = await User._load(new_supervisor, true);
    if (!newSupervisorObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: 'New supervisor user not found',
      });
    }

    // Effectuer le transfert
    const hierarchyObj = new OrgHierarchy();
    await hierarchyObj.transferEmployee(
      subordinateObj.getId()!,
      newSupervisorObj.getId()!,
      effective_date,
    );

    return R.handleSuccess(res, {
      message: 'Employee transfer completed successfully',
      subordinate: subordinateObj.toPublicJSON(),
      new_supervisor: newSupervisorObj.toPublicJSON(),
      effective_date,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ORG_HIERARCHY_CODES.TRANSFER_FAILED,
      message: error.message,
    });
  }
});

// === RECHERCHES PAR DÉPARTEMENT ===

router.get('/department/:department/list', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { department } = req.params;
    const paginationOptions = paginationSchema.parse(req.query);

    const hierarchyEntries = await OrgHierarchy._listByDepartment(department);

    // Application de la pagination
    const offset = paginationOptions.offset || 0;
    const limit = paginationOptions.limit;
    const paginatedItems = limit
      ? hierarchyEntries?.slice(offset, offset + limit)
      : hierarchyEntries?.slice(offset);

    const hierarchies = {
      department,
      pagination: {
        offset,
        limit: limit || paginatedItems?.length || 0,
        count: paginatedItems?.length || 0,
        total: hierarchyEntries?.length || 0,
      },
      items: paginatedItems
        ? await Promise.all(paginatedItems.map(async (hierarchy) => await hierarchy.toJSON()))
        : [],
    };

    return R.handleSuccess(res, { hierarchies });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ORG_HIERARCHY_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

// === STATISTIQUES ===

router.get('/statistics/overview', Ensure.get(), async (_req: Request, res: Response) => {
  try {
    const hierarchyObj = new OrgHierarchy();
    const statistics = await hierarchyObj.getHierarchyStatistics();

    return R.handleSuccess(res, { statistics });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ORG_HIERARCHY_CODES.STATISTICS_FAILED,
      message: error.message,
    });
  }
});

// ===  👥 Get Peer Managers ===
// 🤝 List managers at same hierarchical level for collaboration and coordination
router.get('/my-level', Ensure.get(), async (req: Request, res: Response) => {
  try {
    const { manager } = req.query;

    // 🔎 Validation du GUID du manager
    if (!manager || !UsersValidationUtils.validateGuid(String(manager))) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: ORG_HIERARCHY_CODES.INVALID_GUID,
        message: ORG_HIERARCHY_ERRORS.GUID_INVALID,
      });
    }

    // 🧠 Chargement du manager
    const managerObj = await User._load(String(manager), true);
    if (!managerObj) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: USERS_CODES.USER_NOT_FOUND,
        message: USERS_ERRORS.NOT_FOUND,
      });
    }

    // 🪜 Trouver le superviseur direct du manager
    const currentSupervisor = await OrgHierarchy.getCurrentSupervisor(managerObj.getId()!);
    if (!currentSupervisor) {
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: ORG_HIERARCHY_CODES.SUPERVISOR_NOT_FOUND,
        message: 'Aucun superviseur trouvé pour ce manager',
      });
    }

    // 👥 Récupérer tous les subordonnés actifs de ce superviseur
    const peerHierarchies = await OrgHierarchy.getActiveSubordinates(currentSupervisor.getId()!);

    // ✅ Vérification de null avant d’utiliser peerHierarchies
    if (!peerHierarchies || peerHierarchies.length === 0) {
      return R.handleSuccess(res, {
        manager: managerObj.toJSON(),
        supervisor: await currentSupervisor.toJSON(),
        total_peers: 0,
        peers: [],
        message: 'Aucun pair trouvé à ce niveau hiérarchique',
      });
    }

    // 🎯 Exclure le manager lui-même pour ne garder que ses pairs
    const peers = peerHierarchies
      .filter((h: any) => h.subordinate_id !== managerObj.getId())
      .map((h: any) => h.subordinate);

    // 🧩 Charger les rôles de chaque pair
    const peersWithRoles = await Promise.all(
      peers.map(async (peer: any) => {
        const roles = await UserRole.getUserRoles(peer.id);
        return {
          ...peer.toJSON(),
          roles: roles ? roles.map((r) => r.toJSON()) : [],
        };
      }),
    );

    // ✅ Réponse finale
    return R.handleSuccess(res, {
      manager: managerObj.toJSON(),
      supervisor: await currentSupervisor.toJSON(),
      total_peers: peersWithRoles.length,
      peers: peersWithRoles,
    });
  } catch (error: any) {
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: ORG_HIERARCHY_CODES.LISTING_FAILED,
      message: error.message,
    });
  }
});

export default router;
