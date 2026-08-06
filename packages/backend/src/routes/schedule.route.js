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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ensured_routes_js_1 = __importDefault(require("@toke/api/dist/middle/ensured-routes.js"));
const response_js_1 = __importDefault(require("@toke/api/dist/tools/response.js"));
const shared_1 = require("@toke/shared");
const tenant_config_js_1 = require("../tools/tenant.config.js");
const schedule_service_js_1 = require("../services/schedule.service.js");
const router = (0, express_1.Router)();
router.get('/list', tenant_config_js_1.TenantConfig.authenticate, ensured_routes_js_1.default.get(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = req.client.reference;
        const result = yield schedule_service_js_1.ScheduleService.listSchedules(client);
        if (result.status !== shared_1.HttpStatus.SUCCESS) {
            return response_js_1.default.handleError(res, result.status, result.response);
        }
        return response_js_1.default.handleSuccess(res, result.response);
    }
    catch (error) {
        return response_js_1.default.handleError(res, shared_1.HttpStatus.INTERNAL_ERROR, {
            code: 'search_failed',
            message: error.message,
        });
    }
}));
router.get('/:guid', tenant_config_js_1.TenantConfig.authenticate, ensured_routes_js_1.default.get(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!shared_1.SessionTemplateValidationUtils.validateGuid(req.params.guid)) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.BAD_REQUEST, {
                code: shared_1.SESSION_TEMPLATE_CODES.INVALID_GUID,
                message: shared_1.SESSION_TEMPLATE_ERRORS.GUID_INVALID,
            });
        }
        const client = req.client.reference;
        const result = yield schedule_service_js_1.ScheduleService.getByGuid(req.params.guid, client);
        if (result.status !== shared_1.HttpStatus.SUCCESS) {
            return response_js_1.default.handleError(res, result.status, result.response);
        }
        return response_js_1.default.handleSuccess(res, result.response);
    }
    catch (error) {
        return response_js_1.default.handleError(res, shared_1.HttpStatus.INTERNAL_ERROR, {
            code: shared_1.SESSION_TEMPLATE_CODES.SEARCH_FAILED,
            message: error.message,
        });
    }
}));
router.post('/', tenant_config_js_1.TenantConfig.authenticate, ensured_routes_js_1.default.post(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = req.client.reference;
        const result = yield schedule_service_js_1.ScheduleService.saveSchedule(client, req.body);
        if (result.status !== shared_1.HttpStatus.CREATED) {
            return response_js_1.default.handleError(res, result.status, result.response);
        }
        return response_js_1.default.handleSuccess(res, result.response);
    }
    catch (error) {
        return response_js_1.default.handleError(res, shared_1.HttpStatus.INTERNAL_ERROR, {
            code: 'search_failed',
            message: error.message,
        });
    }
}));
router.put('/:guid', tenant_config_js_1.TenantConfig.authenticate, ensured_routes_js_1.default.put(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = req.client.reference;
        const { guid } = req.params;
        if (!guid) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.BAD_REQUEST, {
                code: 'guid_required',
                message: 'GUID is required',
            });
        }
        if (!shared_1.SessionTemplateValidationUtils.validateGuid(guid)) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.BAD_REQUEST, {
                code: 'guid_invalid',
                message: 'GUID is invalid',
            });
        }
        const result = yield schedule_service_js_1.ScheduleService.updatedSchedule(client, guid, req.body);
        if (result.status !== shared_1.HttpStatus.SUCCESS) {
            return response_js_1.default.handleError(res, result.status, result.response);
        }
        return response_js_1.default.handleSuccess(res, result.response);
    }
    catch (error) {
        return response_js_1.default.handleError(res, shared_1.HttpStatus.INTERNAL_ERROR, {
            code: 'search_failed',
            message: error.message,
        });
    }
}));
router.delete('/:guid', tenant_config_js_1.TenantConfig.authenticate, ensured_routes_js_1.default.delete(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!shared_1.SessionTemplateValidationUtils.validateGuid(req.params.guid)) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.BAD_REQUEST, {
                code: shared_1.SESSION_TEMPLATE_CODES.INVALID_GUID,
                message: shared_1.SESSION_TEMPLATE_ERRORS.GUID_INVALID,
            });
        }
        const client = req.client.reference;
        const result = yield schedule_service_js_1.ScheduleService.delete(req.params.guid, client);
        if (result.status !== shared_1.HttpStatus.SUCCESS) {
            return response_js_1.default.handleError(res, result.status, result.response);
        }
        return response_js_1.default.handleSuccess(res, result.response);
    }
    catch (error) {
        return response_js_1.default.handleError(res, shared_1.HttpStatus.INTERNAL_ERROR, {
            code: shared_1.SESSION_TEMPLATE_CODES.SEARCH_FAILED,
            message: error.message,
        });
    }
}));
exports.default = router;
