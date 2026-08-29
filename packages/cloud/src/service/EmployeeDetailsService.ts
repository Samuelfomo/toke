import axiosClient from '@/tools/Fetch.Client';

const userBaseUrl = '/user';
const planningProfileBaseUrl = '/planning-profile';

export default class EmployeeDetailsService {
  static async daily(employeeGuid: string, managerGuid: string, date: string) {
    return await axiosClient.get(
      `${userBaseUrl}/attendance/employee/${encodeURIComponent(employeeGuid)}/daily`,
      {
        params: {
          manager: managerGuid,
          date,
          include_history: 'true',
        },
      },
    );
  }

  static async planningProfile(employeeGuid: string) {
    return await axiosClient.get(
      `${planningProfileBaseUrl}/user/${encodeURIComponent(employeeGuid)}`,
    );
  }
}
