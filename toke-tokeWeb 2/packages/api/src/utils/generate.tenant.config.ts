import crypto from 'crypto';

import { DbConstant } from './response.model.js';

export default class TenantConfig {
  static async generateTenantConfig(
    name: string,
    tenantGuid: number,
  ): Promise<{
    database_name: string;
    database_username: string;
    database_password: string;
  }> {
    const tenantConfig = new TenantConfig();
    const database_name = await tenantConfig.generateDatabaseName(name, tenantGuid);
    const database_username = tenantConfig.generateDatabaseUsername(name);
    const database_password = crypto.randomBytes(16).toString('hex'); // mot de passe fort

    return {
      database_name,
      database_username,
      database_password,
    };
  }

  private async generateDatabaseName(name: string, tenantGuid: number): Promise<string> {
    const normalized = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 30); // éviter trop long

    const uniqueSuffix = crypto.randomBytes(2).toString('hex'); // 4 caractères

    return `${normalized}_${DbConstant.TOKE}${tenantGuid}_${uniqueSuffix}`;
  }
  private generateDatabaseUsername(name: string): string {
    const normalized = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 15); // un peu plus court pour un username

    const uniqueSuffix = crypto.randomBytes(2).toString('hex'); // 4 caractères

    return `${normalized}_${DbConstant.USER}_${uniqueSuffix}`;
  }
}
