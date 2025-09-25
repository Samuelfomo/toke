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
const sequelize_1 = require("sequelize");
const shared_1 = require("@toke/shared");
const db_base_js_1 = __importDefault(require("../database/db.base.js"));
const response_model_js_1 = require("../../utils/response.model.js");
const employee_license_db_js_1 = require("../database/data/employee.license.db.js");
class EmployeeLicenseModel extends db_base_js_1.default {
    constructor() {
        super();
        this.db = {
            tableName: response_model_js_1.tableName.EMPLOYEE_LICENSE,
            id: 'id',
            guid: 'guid',
            global_license: 'global_license',
            employee: 'employee',
            employee_code: 'employee_code',
            activation_date: 'activation_date',
            deactivation_date: 'deactivation_date',
            last_activity_date: 'last_activity_date',
            contractual_status: 'contractual_status',
            declared_long_leave: 'declared_long_leave',
            long_leave_declared_by: 'long_leave_declared_by',
            long_leave_declared_at: 'long_leave_declared_at',
            long_leave_type: 'long_leave_type',
            long_leave_reason: 'long_leave_reason',
            computed_billing_status: 'computed_billing_status',
            grace_period_start: 'grace_period_start',
            grace_period_end: 'grace_period_end',
        };
    }
    /**
     * Trouve un enregistrement par son ID
     */
    find(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.findOne(this.db.tableName, { [this.db.id]: id });
        });
    }
    /**
     * Trouve un enregistrement par son GUID
     */
    findByGuid(guid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.findOne(this.db.tableName, { [this.db.guid]: guid });
        });
    }
    /**
     * Trouve un enregistrement par employee ID
     */
    findByEmployee(employee) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.findOne(this.db.tableName, {
                [this.db.employee]: employee,
                [this.db.contractual_status]: shared_1.ContractualStatus.ACTIVE,
            });
        });
    }
    /**
     * Trouve un enregistrement par employee code
     */
    findByEmployeeCode(employee_code) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.findOne(this.db.tableName, { [this.db.employee_code]: employee_code });
        });
    }
    /**
     * Liste tous les enregistrements selon les conditions
     */
    listAll() {
        return __awaiter(this, arguments, void 0, function* (conditions = {}, paginationOptions = {}) {
            return yield this.findAll(this.db.tableName, conditions, paginationOptions);
        });
    }
    /**
     * Récupère toutes les licences employés par licence globale
     */
    listAllByGlobalLicense(global_license_1) {
        return __awaiter(this, arguments, void 0, function* (global_license, paginationOptions = {}) {
            return yield this.listAll({ [this.db.global_license]: global_license }, paginationOptions);
        });
    }
    /**
     * Récupère toutes les licences employés par statut contractuel
     */
    listAllByContractualStatus(contractual_status_1) {
        return __awaiter(this, arguments, void 0, function* (contractual_status, paginationOptions = {}) {
            return yield this.listAll({ [this.db.contractual_status]: contractual_status }, paginationOptions);
        });
    }
    /**
     * Récupère toutes les licences employés par statut de facturation
     */
    listAllByBillingStatus(billing_status_1) {
        return __awaiter(this, arguments, void 0, function* (billing_status, paginationOptions = {}) {
            return yield this.listAll({ [this.db.computed_billing_status]: billing_status }, paginationOptions);
        });
    }
    /**
     * Récupère tous les employés en congé long
     */
    listAllOnLongLeave() {
        return __awaiter(this, arguments, void 0, function* (paginationOptions = {}) {
            return yield this.listAll({ [this.db.declared_long_leave]: true }, paginationOptions);
        });
    }
    /**
     * Récupère tous les employés par type de congé
     */
    listAllByLeaveType(leave_type_1) {
        return __awaiter(this, arguments, void 0, function* (leave_type, paginationOptions = {}) {
            return yield this.listAll({
                [this.db.declared_long_leave]: true,
                [this.db.long_leave_type]: leave_type,
            }, paginationOptions);
        });
    }
    /**
     * Récupère tous les employés avec activité récente
     */
    listAllWithRecentActivity() {
        return __awaiter(this, arguments, void 0, function* (days = 7, paginationOptions = {}) {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - days);
            return yield this.findAll(this.db.tableName, {
                [this.db.last_activity_date]: {
                    [sequelize_1.Op.gte]: pastDate,
                },
            }, paginationOptions);
        });
    }
    /**
     * Compte les employés facturables pour une global_license spécifique
     */
    countBillableForLicense(globalLicenseId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.findAll(this.db.tableName, {
                [this.db.global_license]: globalLicenseId,
                [this.db.contractual_status]: shared_1.ContractualStatus.ACTIVE,
                // Utiliser la colonne calculée automatiquement
                [this.db.computed_billing_status]: {
                    [sequelize_1.Op.in]: [shared_1.BillingStatusComputed.BILLABLE, shared_1.BillingStatusComputed.GRACE_PERIOD], // Les deux sont facturables
                },
            });
            return result.length;
        });
    }
    /**
     * Récupère tous les employés sans activité récente
     */
    listAllWithoutRecentActivity() {
        return __awaiter(this, arguments, void 0, function* (days = 7, paginationOptions = {}) {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - days);
            return yield this.findAll(this.db.tableName, {
                [sequelize_1.Op.or]: [
                    { [this.db.last_activity_date]: null },
                    { [this.db.last_activity_date]: { [sequelize_1.Op.lt]: pastDate } },
                ],
            }, paginationOptions);
        });
    }
    /**
     * Récupère tous les employés en période de grâce
     */
    listAllInGracePeriod() {
        return __awaiter(this, arguments, void 0, function* (paginationOptions = {}) {
            const now = new Date();
            return yield this.findAll(this.db.tableName, {
                [this.db.grace_period_start]: { [sequelize_1.Op.lte]: now },
                [this.db.grace_period_end]: { [sequelize_1.Op.gte]: now },
                [this.db.computed_billing_status]: shared_1.BillingStatusComputed.GRACE_PERIOD,
            }, paginationOptions);
        });
    }
    /**
     * Récupère tous les employés dont la période de grâce expire bientôt
     */
    listAllGracePeriodExpiringSoon() {
        return __awaiter(this, arguments, void 0, function* (days = 7, paginationOptions = {}) {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);
            return yield this.findAll(this.db.tableName, {
                [this.db.grace_period_end]: {
                    [sequelize_1.Op.between]: [now, futureDate],
                },
                [this.db.computed_billing_status]: shared_1.BillingStatusComputed.GRACE_PERIOD,
            }, paginationOptions);
        });
    }
    /**
     * Récupère tous les employés activés dans une période
     */
    listAllActivatedBetween(startDate_1, endDate_1) {
        return __awaiter(this, arguments, void 0, function* (startDate, endDate, paginationOptions = {}) {
            return yield this.findAll(this.db.tableName, {
                [this.db.activation_date]: {
                    [sequelize_1.Op.between]: [startDate, endDate],
                },
            }, paginationOptions);
        });
    }
    /**
     * Récupère tous les employés désactivés dans une période
     */
    listAllDeactivatedBetween(startDate_1, endDate_1) {
        return __awaiter(this, arguments, void 0, function* (startDate, endDate, paginationOptions = {}) {
            return yield this.findAll(this.db.tableName, {
                [this.db.deactivation_date]: {
                    [sequelize_1.Op.between]: [startDate, endDate],
                },
            }, paginationOptions);
        });
    }
    /**
     * Récupère le nombre d'employés par statut de facturation pour une licence globale
     */
    getBillingStatusCountByGlobalLicense(global_license) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = yield this.findAll(this.db.tableName, {
                [this.db.global_license]: global_license,
            });
            const counts = {};
            Object.values(shared_1.BillingStatusComputed).forEach((status) => {
                counts[status] = 0;
            });
            results.forEach((result) => {
                if (result[this.db.computed_billing_status]) {
                    counts[result[this.db.computed_billing_status]]++;
                }
            });
            return counts;
        });
    }
    /**
     * Met à jour la date d'activité d'un employé
     */
    updateLastActivity(employee, activity_date) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateData = {
                [this.db.last_activity_date]: activity_date || new Date(),
            };
            const affected = yield this.updateOne(this.db.tableName, updateData, {
                [this.db.employee]: employee,
            });
            return !!affected;
        });
    }
    /**
     * Déclare un employé en congé long
     */
    declareLongLeave(employee, declared_by, leave_type, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateData = {
                [this.db.declared_long_leave]: true,
                [this.db.long_leave_declared_by]: declared_by,
                [this.db.long_leave_declared_at]: new Date(),
                [this.db.long_leave_type]: leave_type,
                [this.db.long_leave_reason]: reason || null,
            };
            const affected = yield this.updateOne(this.db.tableName, updateData, {
                [this.db.employee]: employee,
            });
            return !!affected;
        });
    }
    /**
     * Annule la déclaration de congé long
     */
    cancelLongLeave(employee) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateData = {
                [this.db.declared_long_leave]: false,
                [this.db.long_leave_declared_by]: null,
                [this.db.long_leave_declared_at]: null,
                [this.db.long_leave_type]: null,
                [this.db.long_leave_reason]: null,
            };
            const affected = yield this.updateOne(this.db.tableName, updateData, {
                [this.db.employee]: employee,
            });
            return !!affected;
        });
    }
    /**
     * Désactive un employé
     */
    deactivateEmployee(employee) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateData = {
                [this.db.deactivation_date]: new Date(),
                [this.db.contractual_status]: shared_1.ContractualStatus.TERMINATED,
            };
            const affected = yield this.updateOne(this.db.tableName, updateData, {
                [this.db.employee]: employee,
            });
            return !!affected;
        });
    }
    /**
     * Réactive un employé
     */
    reactivateEmployee(employee) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateData = {
                [this.db.deactivation_date]: null,
                [this.db.contractual_status]: shared_1.ContractualStatus.ACTIVE,
                [this.db.last_activity_date]: new Date(),
            };
            const affected = yield this.updateOne(this.db.tableName, updateData, {
                [this.db.employee]: employee,
            });
            return !!affected;
        });
    }
    /**
     * Crée une nouvelle licence employé
     */
    create() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.validate();
            // Générer le GUID automatiquement
            const guid = yield this.guidGenerator(this.db.tableName, 6);
            if (!guid) {
                throw new Error('Failed to generate GUID for employee master entry');
            }
            const lastID = yield this.insertOne(this.db.tableName, {
                [this.db.guid]: guid,
                [this.db.global_license]: this.global_license,
                [this.db.employee]: this.employee,
                [this.db.employee_code]: this.employee_code,
                [this.db.activation_date]: this.activation_date || new Date(),
                [this.db.deactivation_date]: this.deactivation_date || null,
                [this.db.last_activity_date]: this.last_activity_date || null,
                [this.db.contractual_status]: this.contractual_status || shared_1.ContractualStatus.ACTIVE,
                [this.db.declared_long_leave]: this.declared_long_leave || false,
                [this.db.long_leave_declared_by]: this.long_leave_declared_by || null,
                [this.db.long_leave_declared_at]: this.long_leave_declared_at || null,
                [this.db.long_leave_type]: this.long_leave_type || null,
                [this.db.long_leave_reason]: this.long_leave_reason || null,
                // computed_billing_status sera calculé automatiquement par PostgreSQL
                [this.db.grace_period_start]: this.grace_period_start || null,
                [this.db.grace_period_end]: this.grace_period_end || null,
            });
            console.log(`🟢 Licence employé créée - Employee: ${this.employee} | Code: ${this.employee_code} | GUID: ${guid}`);
            if (!lastID) {
                throw new Error('Failed to create employee master entry');
            }
            this.id = typeof lastID === 'object' ? lastID.id : lastID;
            this.guid = guid;
            console.log('✅ Licence employé créée avec ID:', this.id);
        });
    }
    /**
     * Met à jour une licence employé existante
     */
    update() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.validate();
            if (!this.id) {
                throw new Error('Employee License ID is required for update');
            }
            const updateData = {};
            if (this.global_license !== undefined)
                updateData[this.db.global_license] = this.global_license;
            if (this.employee !== undefined)
                updateData[this.db.employee] = this.employee;
            if (this.employee_code !== undefined)
                updateData[this.db.employee_code] = this.employee_code;
            if (this.activation_date !== undefined)
                updateData[this.db.activation_date] = this.activation_date;
            if (this.deactivation_date !== undefined)
                updateData[this.db.deactivation_date] = this.deactivation_date;
            if (this.last_activity_date !== undefined)
                updateData[this.db.last_activity_date] = this.last_activity_date;
            if (this.contractual_status !== undefined)
                updateData[this.db.contractual_status] = this.contractual_status;
            if (this.declared_long_leave !== undefined)
                updateData[this.db.declared_long_leave] = this.declared_long_leave;
            if (this.long_leave_declared_by !== undefined)
                updateData[this.db.long_leave_declared_by] = this.long_leave_declared_by;
            if (this.long_leave_declared_at !== undefined)
                updateData[this.db.long_leave_declared_at] = this.long_leave_declared_at;
            if (this.long_leave_type !== undefined)
                updateData[this.db.long_leave_type] = this.long_leave_type;
            if (this.long_leave_reason !== undefined)
                updateData[this.db.long_leave_reason] = this.long_leave_reason;
            if (this.grace_period_start !== undefined)
                updateData[this.db.grace_period_start] = this.grace_period_start;
            if (this.grace_period_end !== undefined)
                updateData[this.db.grace_period_end] = this.grace_period_end;
            // Ne pas mettre à jour computed_billing_status car c'est une colonne générée
            const affected = yield this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
            if (!affected) {
                throw new Error('Failed to update employee master entry');
            }
        });
    }
    /**
     * Supprime une licence employé
     */
    trash(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.deleteOne(this.db.tableName, { [this.db.id]: id });
        });
    }
    /**
     * Valide les données avant création/mise à jour
     */
    validate() {
        return __awaiter(this, void 0, void 0, function* () {
            // try {
            // Nettoyer les données en utilisant la structure de validation
            employee_license_db_js_1.EmployeeLicenseDbStructure.validation.cleanData(this);
            // Validations personnalisées supplémentaires
            if (!this.global_license) {
                throw new Error('Global master is required');
            }
            if (!this.employee) {
                throw new Error('Employee is required');
            }
            if (!this.employee_code) {
                throw new Error('Employee code is required');
            }
            // Validation des regex
            if (!employee_license_db_js_1.EmployeeLicenseDbStructure.validation.validateEmployee(this.employee)) {
                throw new Error('Invalid employee ID format');
            }
            if (!employee_license_db_js_1.EmployeeLicenseDbStructure.validation.validateEmployeeCode(this.employee_code)) {
                throw new Error('Invalid employee code format');
            }
            // Validation des dates
            if (this.activation_date &&
                !employee_license_db_js_1.EmployeeLicenseDbStructure.validation.validateActivationDate(this.activation_date)) {
                throw new Error('Invalid activation date');
            }
            if (this.deactivation_date &&
                !employee_license_db_js_1.EmployeeLicenseDbStructure.validation.validateDeactivationDate(this.deactivation_date)) {
                throw new Error('Invalid deactivation date');
            }
            if (this.last_activity_date &&
                !employee_license_db_js_1.EmployeeLicenseDbStructure.validation.validateLastActivityDate(this.last_activity_date)) {
                throw new Error('Invalid last activity date');
            }
            // Validation des statuts
            if (this.contractual_status &&
                !employee_license_db_js_1.EmployeeLicenseDbStructure.validation.validateContractualStatus(this.contractual_status)) {
                throw new Error('Invalid contractual status');
            }
            if (this.long_leave_type &&
                !employee_license_db_js_1.EmployeeLicenseDbStructure.validation.validateLongLeaveType(this.long_leave_type)) {
                throw new Error('Invalid long leave type');
            }
            // Validation de cohérence des dates
            if (this.activation_date &&
                this.deactivation_date &&
                this.deactivation_date <= this.activation_date) {
                throw new Error('Deactivation date must be after activation date');
            }
            // Validation des données de congé long
            if (this.declared_long_leave) {
                if (!this.long_leave_declared_by || !this.long_leave_declared_at) {
                    throw new Error('Long leave requires declared_by and declared_at fields');
                }
                // Validation anti-fraude : pas de congé déclaré avec activité récente
                if (this.last_activity_date) {
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    if (this.last_activity_date >= sevenDaysAgo) {
                        throw new Error('Cannot declare long leave with recent activity (within 7 days)');
                    }
                }
            }
            // Validation de la période de grâce
            if (this.grace_period_start && this.grace_period_end) {
                if (this.grace_period_end <= this.grace_period_start) {
                    throw new Error('Grace period end must be after start date');
                }
            }
            // Validation de la longueur de la raison de congé
            if (this.long_leave_reason &&
                !employee_license_db_js_1.EmployeeLicenseDbStructure.validation.validateLongLeaveReason(this.long_leave_reason)) {
                throw new Error('Long leave reason is too long (max 500 characters)');
            }
            // } catch (error: any) {
            //   console.error('⚠️ Erreur validation licence employé:', error.message);
            //   throw error;
            // }
        });
    }
}
exports.default = EmployeeLicenseModel;
