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
const shared_1 = require("@toke/shared");
const GlobalLicenseModel_js_1 = __importDefault(require("../model/GlobalLicenseModel.js"));
const watcher_js_1 = __importDefault(require("../../tools/watcher.js"));
const glossary_js_1 = __importDefault(require("../../tools/glossary.js"));
const response_model_js_1 = require("../../utils/response.model.js");
const revision_js_1 = __importDefault(require("../../tools/revision.js"));
const Tenant_js_1 = __importDefault(require("./Tenant.js"));
class GlobalLicense extends GlobalLicenseModel_js_1.default {
    constructor() {
        super();
    }
    /**
     * Exports global master items with revision information.
     */
    static exportable() {
        return __awaiter(this, arguments, void 0, function* (paginationOptions = {}) {
            const revision = yield revision_js_1.default.getRevision(response_model_js_1.tableName.GLOBAL_LICENSE);
            let data = [];
            const allLicenses = yield this._list({ ['license_status']: shared_1.LicenseStatus.ACTIVE }, paginationOptions);
            if (allLicenses) {
                data = yield Promise.all(allLicenses.map((license) => __awaiter(this, void 0, void 0, function* () { return yield license.toJSON(); })));
            }
            return {
                revision,
                pagination: {
                    offset: paginationOptions.offset || 0,
                    limit: paginationOptions.limit || data.length,
                    count: data.length,
                },
                items: data,
            };
        });
    }
    /**
     * Loads a global master based on the provided identifier.
     */
    static _load(identifier, byGuid = false, byTenant = false) {
        return new GlobalLicense().load(identifier, byGuid, byTenant);
    }
    /**
     * Liste les licences globales selon les conditions
     */
    static _list(conditions = {}, paginationOptions = {}) {
        return new GlobalLicense().list(conditions, paginationOptions);
    }
    /**
     * Liste les licences globales par tenant
     */
    static _listByTenant(tenant, paginationOptions = {}) {
        return new GlobalLicense().listByTenant(tenant, paginationOptions);
    }
    /**
     * Liste les licences globales par type de licence
     */
    static _listByLicenseType(license_type, paginationOptions = {}) {
        return new GlobalLicense().listByLicenseType(license_type, paginationOptions);
    }
    /**
     * Liste les licences globales par cycle de facturation
     */
    static _listByBillingCycle(billing_cycle_months, paginationOptions = {}) {
        return new GlobalLicense().listByBillingCycle(billing_cycle_months, paginationOptions);
    }
    /**
     * Liste les licences globales par statut
     */
    static _listByStatus(license_status, paginationOptions = {}) {
        return new GlobalLicense().listByStatus(license_status, paginationOptions);
    }
    /**
     * Liste les licences globales expirant bientôt
     */
    static _listExpiringSoon(days = 30, paginationOptions = {}) {
        return new GlobalLicense().listExpiringSoon(days, paginationOptions);
    }
    /**
     * Liste les licences globales expirées
     */
    static _listExpired(paginationOptions = {}) {
        return new GlobalLicense().listExpired(paginationOptions);
    }
    /**
     * Convertit des données en objet GlobalLicense
     */
    static _toObject(data) {
        return new GlobalLicense().hydrate(data);
    }
    // === SETTERS FLUENT ===
    setTenant(tenant) {
        this.tenant = tenant;
        return this;
    }
    setLicenseType(license_type) {
        this.license_type = license_type;
        return this;
    }
    setBillingCycleMonths(billing_cycle_months) {
        this.billing_cycle_months = billing_cycle_months;
        return this;
    }
    setBasePriceUsd(base_price_usd) {
        this.base_price_usd = base_price_usd;
        return this;
    }
    setMinimumSeats(minimum_seats) {
        this.minimum_seats = minimum_seats;
        return this;
    }
    setCurrentPeriodStart(current_period_start) {
        this.current_period_start = current_period_start;
        return this;
    }
    setCurrentPeriodEnd(current_period_end) {
        this.current_period_end = current_period_end;
        return this;
    }
    setNextRenewalDate(next_renewal_date) {
        this.next_renewal_date = next_renewal_date;
        return this;
    }
    // ❌ SUPPRIMÉ: setTotalSeatsPurchased() - colonne générée automatiquement
    setLicenseStatus(license_status) {
        this.license_status = license_status;
        return this;
    }
    // === GETTERS ===
    getId() {
        return this.id;
    }
    getGuid() {
        return this.guid;
    }
    getTenant() {
        return this.tenant;
    }
    getTenantObject() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.tenant)
                return null;
            if (!this.tenantObject) {
                this.tenantObject = (yield Tenant_js_1.default._load(this.tenant)) || undefined;
            }
            return this.tenantObject || null;
        });
    }
    getLicenseType() {
        return this.license_type;
    }
    getBillingCycleMonths() {
        return this.billing_cycle_months;
    }
    getBasePriceUsd() {
        return this.base_price_usd;
    }
    getMinimumSeats() {
        return this.minimum_seats;
    }
    getCurrentPeriodStart() {
        return this.current_period_start;
    }
    getCurrentPeriodEnd() {
        return this.current_period_end;
    }
    getNextRenewalDate() {
        return this.next_renewal_date;
    }
    /**
     * ✅ Getter pour total_seats_purchased (colonne calculée)
     */
    getTotalSeatsPurchased() {
        return this.getTotalSeatsPurchasedValue();
    }
    /**
     * ✅ Getter pour billing_status (colonne calculée)
     */
    getBillingStatus() {
        return this.getBillingStatusValue();
    }
    getLicenseStatus() {
        return this.license_status;
    }
    /**
     * Obtient l'identifiant sous forme de chaîne (GUID)
     */
    getIdentifier() {
        var _a;
        return ((_a = this.guid) === null || _a === void 0 ? void 0 : _a.toString()) || 'Unknown';
    }
    /**
     * Vérifie si la licence est active
     */
    isActive() {
        return this.license_status === shared_1.LicenseStatus.ACTIVE && !this.isExpired();
    }
    /**
     * Vérifie si la licence est suspendue
     */
    isSuspended() {
        return this.license_status === shared_1.LicenseStatus.SUSPENDED;
    }
    /**
     * Vérifie si la licence est expirée
     */
    isExpired() {
        if (!this.current_period_end)
            return false;
        return new Date() > new Date(this.current_period_end);
    }
    /**
     * Vérifie si la licence expire bientôt
     */
    isExpiringSoon(days = 30) {
        if (!this.current_period_end)
            return false;
        const warningDate = new Date();
        warningDate.setDate(warningDate.getDate() + days);
        return new Date(this.current_period_end) <= warningDate && !this.isExpired();
    }
    /**
     * Calcule le prix mensuel basé sur les sièges
     * ✅ Utilise getTotalSeatsPurchased() au lieu d'accéder directement à la propriété
     */
    calculateMonthlyPrice() {
        if (!this.base_price_usd || !this.minimum_seats)
            return 0;
        const seatsToCharge = Math.max(this.getTotalSeatsPurchased(), this.minimum_seats);
        return this.base_price_usd * seatsToCharge;
    }
    /**
     * Calcule le prix pour la période de facturation
     */
    calculatePeriodPrice() {
        if (!this.billing_cycle_months)
            return 0;
        return this.calculateMonthlyPrice() * Number(this.billing_cycle_months);
    }
    /**
     * Obtient le nombre de jours restants dans la période actuelle
     */
    getDaysRemaining() {
        if (!this.current_period_end)
            return 0;
        const now = new Date();
        const end = new Date(this.current_period_end);
        const diffTime = end.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    /**
     * Sauvegarde la licence globale (création ou mise à jour)
     */
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.isNew()) {
                    yield this.create();
                }
                else {
                    yield this.update();
                }
            }
            catch (error) {
                console.error('⚠️ Erreur sauvegarde licence globale:', error.message);
                throw new Error(error);
            }
        });
    }
    /**
     * Supprime la licence globale
     */
    delete() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.id !== undefined) {
                yield watcher_js_1.default.isOccur(!this.id, `${glossary_js_1.default.identifierMissing.code}: GlobalLicense Delete`);
                return yield this.trash(this.id);
            }
            return false;
        });
    }
    /**
     * Loads a GlobalLicense object based on the provided identifier and search method.
     * ✅ Les colonnes calculées sont automatiquement chargées dans les méthodes find*()
     */
    load(identifier_1) {
        return __awaiter(this, arguments, void 0, function* (identifier, byGuid = false, byTenant = false) {
            const data = byGuid
                ? yield this.findByGuid(identifier)
                : byTenant
                    ? yield this.findByTenant(identifier)
                    : yield this.find(Number(identifier));
            if (!data)
                return null;
            // ✅ hydrate() charge maintenant aussi les colonnes calculées depuis data
            return this.hydrate(data);
        });
    }
    /**
     * Liste les licences globales selon les conditions
     */
    list() {
        return __awaiter(this, arguments, void 0, function* (conditions = {}, paginationOptions = {}) {
            const dataset = yield this.listAll(conditions, paginationOptions);
            if (!dataset)
                return null;
            return dataset.map((data) => new GlobalLicense().hydrate(data));
        });
    }
    /**
     * Liste les licences globales par tenant
     */
    listByTenant(tenant_1) {
        return __awaiter(this, arguments, void 0, function* (tenant, paginationOptions = {}) {
            const dataset = yield this.listAllByTenant(tenant, paginationOptions);
            if (!dataset)
                return null;
            return dataset.map((data) => new GlobalLicense().hydrate(data));
        });
    }
    /**
     * Liste les licences globales par type de licence
     */
    listByLicenseType(license_type_1) {
        return __awaiter(this, arguments, void 0, function* (license_type, paginationOptions = {}) {
            const dataset = yield this.listAllByLicenseType(license_type, paginationOptions);
            if (!dataset)
                return null;
            return dataset.map((data) => new GlobalLicense().hydrate(data));
        });
    }
    /**
     * Liste les licences globales par cycle de facturation
     */
    listByBillingCycle(billing_cycle_months_1) {
        return __awaiter(this, arguments, void 0, function* (billing_cycle_months, paginationOptions = {}) {
            const dataset = yield this.listAllByBillingCycle(billing_cycle_months, paginationOptions);
            if (!dataset)
                return null;
            return dataset.map((data) => new GlobalLicense().hydrate(data));
        });
    }
    /**
     * Liste les licences globales par statut
     */
    listByStatus(license_status_1) {
        return __awaiter(this, arguments, void 0, function* (license_status, paginationOptions = {}) {
            const dataset = yield this.listAllByStatus(license_status, paginationOptions);
            if (!dataset)
                return null;
            return dataset.map((data) => new GlobalLicense().hydrate(data));
        });
    }
    /**
     * Liste les licences globales expirant bientôt
     */
    listExpiringSoon() {
        return __awaiter(this, arguments, void 0, function* (days = 30, paginationOptions = {}) {
            const dataset = yield this.listAllExpiringSoon(days, paginationOptions);
            if (!dataset)
                return null;
            return dataset.map((data) => new GlobalLicense().hydrate(data));
        });
    }
    /**
     * Liste les licences globales expirées
     */
    listExpired() {
        return __awaiter(this, arguments, void 0, function* (paginationOptions = {}) {
            const dataset = yield this.listAllExpired(paginationOptions);
            if (!dataset)
                return null;
            return dataset.map((data) => new GlobalLicense().hydrate(data));
        });
    }
    /**
     * Vérifie si la licence globale est nouvelle
     */
    isNew() {
        return this.id === undefined;
    }
    /**
     * Conversion JSON pour API
     * ✅ Utilise getTotalSeatsPurchased() pour accéder à la colonne calculée
     */
    toJSON() {
        return __awaiter(this, arguments, void 0, function* (view = response_model_js_1.responseValue.FULL) {
            const tenant = yield this.getTenantObject();
            const baseData = {
                [response_model_js_1.responseStructure.GUID]: this.guid,
                [response_model_js_1.responseStructure.LICENSE_TYPE]: this.license_type,
                [response_model_js_1.responseStructure.BILLING_CYCLE_MONTHS]: this.billing_cycle_months,
                [response_model_js_1.responseStructure.BASE_PRICE_USD]: this.base_price_usd,
                [response_model_js_1.responseStructure.MINIMUM_SEATS]: this.minimum_seats,
                [response_model_js_1.responseStructure.CURRENT_PERIOD_START]: this.current_period_start,
                [response_model_js_1.responseStructure.CURRENT_PERIOD_END]: this.current_period_end,
                [response_model_js_1.responseStructure.NEXT_RENEWAL_DATE]: this.next_renewal_date,
                [response_model_js_1.responseStructure.TOTAL_SEATS_PURCHASED]: this.getTotalSeatsPurchased(), // ✅ Utilise le getter
                [response_model_js_1.responseStructure.LICENSE_STATUS]: this.license_status,
            };
            if (view === response_model_js_1.responseValue.MINIMAL) {
                return Object.assign(Object.assign({}, baseData), { [response_model_js_1.responseStructure.TENANT]: tenant === null || tenant === void 0 ? void 0 : tenant.getGuid() });
            }
            return Object.assign(Object.assign({}, baseData), { [response_model_js_1.responseStructure.TENANT]: tenant === null || tenant === void 0 ? void 0 : tenant.toJSON() });
        });
    }
    /**
     * Représentation string
     */
    toString() {
        return `GlobalLicense { ${response_model_js_1.responseStructure.ID}: ${this.id}, ${response_model_js_1.responseStructure.GUID}: ${this.guid}, ${response_model_js_1.responseStructure.LICENSE_TYPE}: "${this.license_type}", ${response_model_js_1.responseStructure.LICENSE_STATUS}: "${this.license_status}" }`;
    }
    /**
     * Hydrate l'instance avec les données
     * ✅ Hydrate aussi les colonnes calculées si elles sont présentes dans data
     */
    hydrate(data) {
        this.id = data.id;
        this.guid = data.guid;
        this.tenant = data.tenant;
        this.license_type = data.license_type;
        this.billing_cycle_months = data.billing_cycle_months;
        this.base_price_usd = data.base_price_usd;
        this.minimum_seats = data.minimum_seats;
        this.current_period_start = data.current_period_start;
        this.current_period_end = data.current_period_end;
        this.next_renewal_date = data.next_renewal_date;
        this.license_status = data.license_status;
        // ✅ Hydrater les colonnes calculées si présentes dans data
        // (elles sont retournées par les raw queries dans GlobalLicenseModel)
        if (data.total_seats_purchased !== undefined) {
            this['_total_seats_purchased'] = data.total_seats_purchased;
        }
        if (data.billing_status !== undefined) {
            this['_billing_status'] = data.billing_status;
        }
        return this;
    }
}
exports.default = GlobalLicense;
