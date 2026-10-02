import { HttpStatus } from '@toke/shared';

import EmployeeLicenseService, { Activity } from './employee.license.service.js';

export default class ActivityService {
  static async sendEmployeeLastActivity(data: Activity): Promise<boolean> {
    console.log('Sending employee last activity:', data);
    if (!data.employee_license) {
      return false;
    }

    try {
      // const occurredDate = new Date(data.occurred_at);

      // Compatibilité : la valeur reçue contient l'heure locale de Douala.
      const localDate =
        data.occurred_at instanceof Date
          ? data.occurred_at.toISOString()
          : String(data.occurred_at);

      const occurredDate = new Date(localDate.replace(/Z$/i, '+01:00'));

      if (Number.isNaN(occurredDate.getTime())) {
        console.error('Invalid occurredAt date:', data.occurred_at);
        return false;
      }

      const response = await EmployeeLicenseService.sendLastActivity({
        tenant: data.tenant,
        employee_license: data.employee_license,
        occurred_at: occurredDate.toISOString(),
      });
      console.log('Employee last activity sent:', response.status, response.response);

      return response.status === HttpStatus.SUCCESS;
    } catch (error) {
      console.error('Unable to send employee last activity:', error);
      return false;
    }
  }
}
