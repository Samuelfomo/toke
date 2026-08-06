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
exports.RotationAssignmentService = void 0;
const api_factory_js_1 = require("../tools/api.factory.js");
const baseUrl = '/rotation-assignments';
class RotationAssignmentService {
    static listRotationAssignments(reference, manager) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const api = yield (0, api_factory_js_1.getApiClient)(reference);
                const response = yield api.get(`${baseUrl}/${manager}/list`);
                return {
                    status: response.status,
                    response: response.data.data,
                };
            }
            catch (error) {
                if (error.response) {
                    return {
                        status: error.response.status,
                        response: error.response.data,
                    };
                }
                else if (error.request) {
                    return {
                        status: 500,
                        response: { message: 'No response from server', details: error.message },
                    };
                }
                else {
                    return {
                        status: 500,
                        response: { message: 'Unexpected error', details: error.message },
                    };
                }
            }
        });
    }
    static saveRotationAssignment(reference, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const api = yield (0, api_factory_js_1.getApiClient)(reference);
                const response = yield api.post(`${baseUrl}/`, payload);
                return {
                    status: response.status,
                    response: response.data.data,
                };
            }
            catch (error) {
                if (error.response) {
                    return {
                        status: error.response.status,
                        response: error.response.data,
                    };
                }
                else if (error.request) {
                    return {
                        status: 500,
                        response: { message: 'No response from server', details: error.message },
                    };
                }
                else {
                    return {
                        status: 500,
                        response: { message: 'Unexpected error', details: error.message },
                    };
                }
            }
        });
    }
    static updatedRotationAssignment(reference, guid, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const api = yield (0, api_factory_js_1.getApiClient)(reference);
                const response = yield api.put(`${baseUrl}/${guid}`, payload);
                return {
                    status: response.status,
                    response: response.data.data,
                };
            }
            catch (error) {
                if (error.response) {
                    return {
                        status: error.response.status,
                        response: error.response.data,
                    };
                }
                else if (error.request) {
                    return {
                        status: 500,
                        response: { message: 'No response from server', details: error.message },
                    };
                }
                else {
                    return {
                        status: 500,
                        response: { message: 'Unexpected error', details: error.message },
                    };
                }
            }
        });
    }
}
exports.RotationAssignmentService = RotationAssignmentService;
