import { Request, Response, Router } from 'express';
import Ensure from '@toke/api/dist/middle/ensured-routes.js';
import R from '@toke/api/dist/tools/response.js';
import { HttpStatus } from '@toke/shared';

import { TenantConfig } from '../tools/tenant.config.js';
import {
  handleBffRouteError,
  relayTenantApiResponse,
  tenantReference,
} from '../tools/bff.proxy.response.js';
import {
  getLicenseTenantContext,
  requireGlobalLicenseGuid,
} from '../tools/license.tenant.context.js';
import { LicenseService } from '../services/license.service.js';

const router = Router();

function rejectScope(res: Response, message: string): void {
  R.handleError(res, HttpStatus.FORBIDDEN, {
    code: 'BFF_LICENSE_SCOPE_FORBIDDEN',
    message,
  });
}

async function resolveScope(req: Request) {
  return await getLicenseTenantContext(tenantReference(req));
}

router.get(
  '/tenant/:tenantGuid/license-status',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = await resolveScope(req);
      if (String(req.params.tenantGuid) !== scope.tenantGuid) {
        rejectScope(res, 'The requested tenant does not match the authenticated tenant.');
        return;
      }

      relayTenantApiResponse(res, await LicenseService.getTenantLicenseStatus(scope.tenantGuid));
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_LICENSE_STATUS_FAILED');
    }
  },
);

router.post(
  '/global-license/',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = await resolveScope(req);
      relayTenantApiResponse(
        res,
        await LicenseService.createSubscription(scope.tenantGuid, req.body),
      );
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_LICENSE_SUBSCRIPTION_CREATE_FAILED');
    }
  },
);

router.patch(
  '/tenant/:tenantGuid/subdomain',
  TenantConfig.authenticate,
  Ensure.patch(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = await resolveScope(req);
      if (String(req.params.tenantGuid) !== scope.tenantGuid) {
        rejectScope(res, 'The requested tenant does not match the authenticated tenant.');
        return;
      }

      relayTenantApiResponse(
        res,
        await LicenseService.provisionSubdomain(scope.tenantGuid, req.body),
      );
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_LICENSE_SUBDOMAIN_PROVISION_FAILED');
    }
  },
);

router.get(
  '/payment-method/active/true',
  TenantConfig.authenticate,
  Ensure.get(),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      relayTenantApiResponse(res, await LicenseService.listActivePaymentMethods());
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PAYMENT_METHOD_ACTIVE_LIST_FAILED');
    }
  },
);

router.get(
  '/payment-method/currency/:currency',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      relayTenantApiResponse(
        res,
        await LicenseService.listPaymentMethodsByCurrency(req.params.currency as string),
      );
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_PAYMENT_METHOD_CURRENCY_LIST_FAILED');
    }
  },
);

router.get(
  '/employee-license/global/:licenseGuid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = await resolveScope(req);
      const globalLicenseGuid = requireGlobalLicenseGuid(scope);
      if (String(req.params.licenseGuid) !== globalLicenseGuid) {
        rejectScope(res, 'The requested global license does not belong to the authenticated tenant.');
        return;
      }

      relayTenantApiResponse(res, await LicenseService.listEmployeeLicenses(globalLicenseGuid));
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_EMPLOYEE_LICENSE_LIST_FAILED');
    }
  },
);

router.get(
  '/employee-license/employee/:employeeGuid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = await resolveScope(req);
      const globalLicenseGuid = requireGlobalLicenseGuid(scope);
      relayTenantApiResponse(
        res,
        await LicenseService.getEmployeeLicenseByEmployee(
          req.params.employeeGuid as string,
          globalLicenseGuid,
        ),
      );
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_EMPLOYEE_LICENSE_BY_EMPLOYEE_FAILED');
    }
  },
);

router.get(
  '/employee-license/:employeeLicenseGuid',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = await resolveScope(req);
      const globalLicenseGuid = requireGlobalLicenseGuid(scope);
      relayTenantApiResponse(
        res,
        await LicenseService.getEmployeeLicense(
          req.params.employeeLicenseGuid as string,
          globalLicenseGuid,
        ),
      );
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_EMPLOYEE_LICENSE_GET_FAILED');
    }
  },
);

router.get(
  '/license-renewals/:licenseGuid/preview',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = await resolveScope(req);
      const globalLicenseGuid = requireGlobalLicenseGuid(scope);
      if (String(req.params.licenseGuid) !== globalLicenseGuid) {
        rejectScope(res, 'The requested global license does not belong to the authenticated tenant.');
        return;
      }

      relayTenantApiResponse(res, await LicenseService.previewRenewal(globalLicenseGuid));
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_LICENSE_RENEWAL_PREVIEW_FAILED');
    }
  },
);

router.post(
  '/license-renewals/:licenseGuid/prepare',
  TenantConfig.authenticate,
  Ensure.post(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = await resolveScope(req);
      const globalLicenseGuid = requireGlobalLicenseGuid(scope);
      if (String(req.params.licenseGuid) !== globalLicenseGuid) {
        rejectScope(res, 'The requested global license does not belong to the authenticated tenant.');
        return;
      }

      relayTenantApiResponse(
        res,
        await LicenseService.prepareRenewal(globalLicenseGuid, req.body),
      );
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_LICENSE_RENEWAL_PREPARE_FAILED');
    }
  },
);

router.get(
  '/cash-installments/:transactionGuid/balance',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = await resolveScope(req);
      const globalLicenseGuid = requireGlobalLicenseGuid(scope);
      relayTenantApiResponse(
        res,
        await LicenseService.getCashInstallmentBalance(
          req.params.transactionGuid as string,
          globalLicenseGuid,
        ),
      );
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_CASH_INSTALLMENT_BALANCE_FAILED');
    }
  },
);

router.get(
  '/activity-monitoring/licenses/:licenseGuid/monthly-usage',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = await resolveScope(req);
      const globalLicenseGuid = requireGlobalLicenseGuid(scope);
      if (String(req.params.licenseGuid) !== globalLicenseGuid) {
        rejectScope(res, 'The requested global license does not belong to the authenticated tenant.');
        return;
      }

      relayTenantApiResponse(
        res,
        await LicenseService.getMonthlyUsage(globalLicenseGuid, req.query),
      );
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_LICENSE_MONTHLY_USAGE_FAILED');
    }
  },
);

router.get(
  '/license-admin/licenses/:licenseGuid/monthly-preview',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = await resolveScope(req);
      const globalLicenseGuid = requireGlobalLicenseGuid(scope);
      if (String(req.params.licenseGuid) !== globalLicenseGuid) {
        rejectScope(res, 'The requested global license does not belong to the authenticated tenant.');
        return;
      }

      relayTenantApiResponse(
        res,
        await LicenseService.getMonthlyPreview(globalLicenseGuid, req.query),
      );
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_LICENSE_MONTHLY_PREVIEW_FAILED');
    }
  },
);

router.get(
  '/license-admin/licenses/:licenseGuid/access',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = await resolveScope(req);
      const globalLicenseGuid = requireGlobalLicenseGuid(scope);
      if (String(req.params.licenseGuid) !== globalLicenseGuid) {
        rejectScope(res, 'The requested global license does not belong to the authenticated tenant.');
        return;
      }

      relayTenantApiResponse(
        res,
        await LicenseService.getLicenseAccess(
          scope.tenantGuid,
          globalLicenseGuid,
          req.query as Record<string, unknown>,
        ),
      );
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_LICENSE_ACCESS_FAILED');
    }
  },
);

router.get(
  '/license-admin/licenses/:licenseGuid/events',
  TenantConfig.authenticate,
  Ensure.get(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = await resolveScope(req);
      const globalLicenseGuid = requireGlobalLicenseGuid(scope);
      if (String(req.params.licenseGuid) !== globalLicenseGuid) {
        rejectScope(res, 'The requested global license does not belong to the authenticated tenant.');
        return;
      }

      relayTenantApiResponse(
        res,
        await LicenseService.getLicenseEvents(
          scope.tenantGuid,
          globalLicenseGuid,
          req.query as Record<string, unknown>,
        ),
      );
    } catch (error: unknown) {
      handleBffRouteError(res, error, 'BFF_LICENSE_EVENTS_FAILED');
    }
  },
);

export default router;
