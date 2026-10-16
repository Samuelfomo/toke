"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteService = void 0;
const api_factory_js_1 = require("../tools/api.factory.js");
const baseUrl = '/site';
class SiteService {
    static exportSites(reference_1) {
        return __awaiter(this, arguments, void 0, function* (reference, query = {}) {
            return this.request(reference, 'get', '/', { params: query });
        });
    }
    static getRevision(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'get', '/revision');
        });
    }
    static listSites(reference_1) {
        return __awaiter(this, arguments, void 0, function* (reference, query = {}) {
            return this.request(reference, 'get', '/list', { params: query });
        });
    }
    // ─── Listing / lecture ────────────────────────────────────────────────────
    static listSitesByType(reference, siteType) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'get', `/type/${encodeURIComponent(siteType)}/list`);
        });
    }
    static listActiveSites(reference_1) {
        return __awaiter(this, arguments, void 0, function* (reference, query = {}) {
            return this.request(reference, 'get', '/active', { params: query });
        });
    }
    static listPublicSites(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'get', '/public');
        });
    }
    static listSitesByCreator(reference, guid) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'get', `/creator/${encodeURIComponent(guid)}/list`);
        });
    }
    static listActiveSitesByCreator(reference, guid) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'get', `/creator/${encodeURIComponent(guid)}/active`);
        });
    }
    static getSite(reference, guid) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'get', `/${encodeURIComponent(guid)}`);
        });
    }
    static getStatistics(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'get', '/statistics/overview');
        });
    }
    static createSite(reference, site) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'post', '/', { data: site });
        });
    }
    static updateSite(reference, guid, site) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'put', `/${encodeURIComponent(guid)}`, { data: site });
        });
    }
    static deleteSite(reference, guid) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'delete', `/${encodeURIComponent(guid)}`);
        });
    }
    // ─── CRUD ─────────────────────────────────────────────────────────────────
    static setSiteStatus(reference, guid, active) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'patch', `/${encodeURIComponent(guid)}/status`, {
                params: { active },
            });
        });
    }
    static regenerateQRCode(reference, guid, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'patch', `/${encodeURIComponent(guid)}/regenerate-qr`, {
                data: reason ? { reason } : {},
            });
        });
    }
    static validateQRCode(reference, qrToken) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'patch', '/validate-qr', {
                data: { qr_token: qrToken },
            });
        });
    }
    static generateQRCode(reference, siteGuid, managerGuid) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'post', '/generate-qr-code', {
                data: {
                    site: siteGuid,
                    manager: managerGuid,
                },
            });
        });
    }
    // ─── QR codes ─────────────────────────────────────────────────────────────
    static addTeamMembers(reference, guid, userGuids, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'post', `/${encodeURIComponent(guid)}/team/add`, {
                data: Object.assign({ user_guids: userGuids }, (reason ? { reason } : {})),
            });
        });
    }
    static removeTeamMembers(reference, guid, userGuids, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'post', `/${encodeURIComponent(guid)}/team/remove`, {
                data: Object.assign({ user_guids: userGuids }, (reason ? { reason } : {})),
            });
        });
    }
    static listExpiringTemporarySites(reference_1) {
        return __awaiter(this, arguments, void 0, function* (reference, days = 7) {
            return this.request(reference, 'get', '/temporary/expiring', {
                params: { days },
            });
        });
    }
    // ─── Équipe ───────────────────────────────────────────────────────────────
    static extendTemporarySiteValidity(reference, guid, newEndDate, approvedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'patch', `/${encodeURIComponent(guid)}/extend-validity`, {
                data: {
                    new_end_date: newEndDate,
                    approved_by: approvedBy,
                },
            });
        });
    }
    static deactivateExpiredSites(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(reference, 'patch', '/maintenance/deactivate-expired');
        });
    }
    // ─── Sites temporaires / maintenance ─────────────────────────────────────
    static success(response) {
        var _a, _b;
        return {
            status: response.status,
            response: (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : response.data,
        };
    }
    static failure(error) {
        if (error.response) {
            return {
                status: error.response.status,
                response: error.response.data,
            };
        }
        if (error.request) {
            return {
                status: 500,
                response: {
                    message: 'No response from server',
                    details: error.message,
                },
            };
        }
        return {
            status: 500,
            response: {
                message: 'Unexpected error',
                details: error.message,
            },
        };
    }
    static request(reference_1, method_1, path_1) {
        return __awaiter(this, arguments, void 0, function* (reference, method, path, options = {}) {
            try {
                const api = yield (0, api_factory_js_1.getApiClient)(reference);
                const response = yield api.request(Object.assign(Object.assign({ method, url: `${baseUrl}${path}` }, (options.data !== undefined ? { data: options.data } : {})), (options.params ? { params: options.params } : {})));
                return this.success(response);
            }
            catch (error) {
                return this.failure(error);
            }
        });
    }
}
exports.SiteService = SiteService;
// import { SI } from '@toke/shared';
//
// import { getApiClient } from '../tools/api.factory.js';
//
// const baseUrl: string = '/site';
//
// export class SiteService {
//   static async listSites(reference: string): Promise<{ status: number; response: object }> {
//     try {
//       const api = await getApiClient(reference);
//
//       const response = await api.get(`${baseUrl}/list`);
//
//       return {
//         status: response.status,
//         response: response.data.data,
//       };
//     } catch (error: any) {
//       if (error.response) {
//         return {
//           status: error.response.status,
//           response: error.response.data,
//         };
//       } else if (error.request) {
//         return {
//           status: 500,
//           response: { message: 'No response from server', details: error.message },
//         };
//       } else {
//         return {
//           status: 500,
//           response: { message: 'Unexpected error', details: error.message },
//         };
//       }
//     }
//   }
//
//   static async getSite(
//     reference: string,
//     guid: string,
//   ): Promise<{ status: number; response: object }> {
//     try {
//       const api = await getApiClient(reference);
//
//       const response = await api.get(`${baseUrl}/${guid}`);
//
//       return {
//         status: response.status,
//         response: response.data.data,
//       };
//     } catch (error: any) {
//       if (error.response) {
//         return {
//           status: error.response.status,
//           response: error.response.data,
//         };
//       } else if (error.request) {
//         return {
//           status: 500,
//           response: { message: 'No response from server', details: error.message },
//         };
//       } else {
//         return {
//           status: 500,
//           response: { message: 'Unexpected error', details: error.message },
//         };
//       }
//     }
//   }
//
//   static async createSite(
//     reference: string,
//     site: SI.CreateSite,
//   ): Promise<{ status: number; response: object }> {
//     try {
//       const api = await getApiClient(reference);
//
//       const response = await api.post(`${baseUrl}/`, site);
//
//       return {
//         status: response.status,
//         response: response.data.data,
//       };
//     } catch (error: any) {
//       if (error.response) {
//         return {
//           status: error.response.status,
//           response: error.response.data,
//         };
//       } else if (error.request) {
//         return {
//           status: 500,
//           response: { message: 'No response from server', details: error.message },
//         };
//       } else {
//         return {
//           status: 500,
//           response: { message: 'Unexpected error', details: error.message },
//         };
//       }
//     }
//   }
//
//   static async updateSite(
//     reference: string,
//     guid: string,
//     site: SI.UpdateSite,
//   ): Promise<{ status: number; response: object }> {
//     try {
//       const api = await getApiClient(reference);
//
//       const response = await api.put(`${baseUrl}/${guid}`, site);
//
//       return {
//         status: response.status,
//         response: response.data.data,
//       };
//     } catch (error: any) {
//       if (error.response) {
//         return {
//           status: error.response.status,
//           response: error.response.data,
//         };
//       } else if (error.request) {
//         return {
//           status: 500,
//           response: { message: 'No response from server', details: error.message },
//         };
//       } else {
//         return {
//           status: 500,
//           response: { message: 'Unexpected error', details: error.message },
//         };
//       }
//     }
//   }
// }
