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
const Fetch_Client_1 = require("@/tools/Fetch.Client");
const baseUrl = '/planning-suggestion-requirements';
class PlanningSuggestionRequirementService {
    static listByConfig(configGuid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield (0, Fetch_Client_1.apiRequest)({ path: `${baseUrl}/config/${configGuid}`, method: 'GET' });
            }
            catch (error) {
                console.error('PlanningSuggestionRequirementService.listByConfig', error);
                return error;
            }
        });
    }
    static getByGuid(guid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield (0, Fetch_Client_1.apiRequest)({ path: `${baseUrl}/${guid}`, method: 'GET' });
            }
            catch (error) {
                console.error('PlanningSuggestionRequirementService.getByGuid', error);
                return error;
            }
        });
    }
    static create(configGuid, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield (0, Fetch_Client_1.apiRequest)({
                    path: `${baseUrl}/config/${configGuid}`,
                    method: 'POST',
                    data: payload,
                });
            }
            catch (error) {
                console.error('PlanningSuggestionRequirementService.create', error);
                return error;
            }
        });
    }
    static update(guid, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield (0, Fetch_Client_1.apiRequest)({ path: `${baseUrl}/${guid}`, method: 'PUT', data: payload });
            }
            catch (error) {
                console.error('PlanningSuggestionRequirementService.update', error);
                return error;
            }
        });
    }
    static delete(guid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield (0, Fetch_Client_1.apiRequest)({ path: `${baseUrl}/${guid}`, method: 'DELETE' });
            }
            catch (error) {
                console.error('PlanningSuggestionRequirementService.delete', error);
                return error;
            }
        });
    }
}
exports.default = PlanningSuggestionRequirementService;
