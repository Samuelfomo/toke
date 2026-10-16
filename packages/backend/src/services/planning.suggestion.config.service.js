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
exports.PlanningSuggestionConfigService = void 0;
const tenant_api_proxy_service_js_1 = require("./tenant.api.proxy.service.js");
const baseUrl = '/planning-config';
class PlanningSuggestionConfigService {
    static list(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, tenant_api_proxy_service_js_1.tenantApiRequest)(reference, {
                method: 'GET',
                url: baseUrl,
            });
        });
    }
    static getActive(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, tenant_api_proxy_service_js_1.tenantApiRequest)(reference, {
                method: 'GET',
                url: `${baseUrl}/active`,
            });
        });
    }
    static get(reference, guid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, tenant_api_proxy_service_js_1.tenantApiRequest)(reference, {
                method: 'GET',
                url: `${baseUrl}/${guid}`,
            });
        });
    }
    static create(reference, managerGuid, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, tenant_api_proxy_service_js_1.tenantApiRequest)(reference, {
                method: 'POST',
                url: `${baseUrl}/${managerGuid}`,
                data: payload,
            });
        });
    }
    static update(reference, guid, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, tenant_api_proxy_service_js_1.tenantApiRequest)(reference, {
                method: 'PUT',
                url: `${baseUrl}/${guid}`,
                data: payload,
            });
        });
    }
    static activate(reference, guid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, tenant_api_proxy_service_js_1.tenantApiRequest)(reference, {
                method: 'PATCH',
                url: `${baseUrl}/${guid}/activate`,
            });
        });
    }
    static deactivate(reference, guid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, tenant_api_proxy_service_js_1.tenantApiRequest)(reference, {
                method: 'PATCH',
                url: `${baseUrl}/${guid}/deactivate`,
            });
        });
    }
    static delete(reference, guid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, tenant_api_proxy_service_js_1.tenantApiRequest)(reference, {
                method: 'DELETE',
                url: `${baseUrl}/${guid}`,
            });
        });
    }
}
exports.PlanningSuggestionConfigService = PlanningSuggestionConfigService;
