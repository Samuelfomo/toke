import { sessionClientFromEnvironment } from '@toke/api/dist/tools/user-session.client.js';

/** BFF is a verifier/relay, never an issuer of human identity. */
export class UserSessionService {
  static async verify(token: string, tenantGuid: string) {
    return sessionClientFromEnvironment().verify(token, tenantGuid);
  }
  static async logout(token: string): Promise<void> {
    await sessionClientFromEnvironment().logout(token);
  }
}
