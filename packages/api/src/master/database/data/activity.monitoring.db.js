"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityMonitoringDbStructure = void 0;
const sequelize_1 = require("sequelize");
const shared_1 = require("@toke/shared");
const response_model_js_1 = require("../../../utils/response.model.js");
exports.ActivityMonitoringDbStructure = {
    tableName: response_model_js_1.tableName.ACTIVITY_MONITORING,
    attributes: {
        id: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            validate: {
                isInt: true,
                min: 1,
                max: 2147483647,
            },
            comment: 'Activity monitoring',
        },
        guid: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            unique: { name: 'unique_activity_guid', msg: 'This GUID must be unique.' },
            validate: {
                isUUID: 4,
            },
            comment: 'Unique identifier',
        },
        employee_license: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: response_model_js_1.tableName.EMPLOYEE_LICENSE,
                key: 'id',
            },
            validate: {
                isInt: true,
                min: 1,
                max: 2147483647,
            },
            comment: 'Employee master',
        },
        monitoring_date: {
            type: sequelize_1.DataTypes.DATEONLY,
            allowNull: false,
            validate: {
                isDate: true,
            },
            comment: 'Date of the monitoring',
        },
        last_punch_date: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
            validate: {
                isDate: true,
            },
            comment: 'Date of the last punch',
        },
        punch_count_7_days: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                isInt: true,
                min: 0,
                max: 2147483647,
            },
            comment: 'Number of punches in the last 7 days',
        },
        punch_count_30_days: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                isInt: true,
                min: 0,
                max: 2147483647,
            },
            comment: 'Number of punches in the last 30 days',
        },
        consecutive_absent_days: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                isInt: true,
                min: 0,
                max: 2147483647,
            },
            comment: 'Number of consecutive absent days',
        },
        status_at_date: {
            type: sequelize_1.DataTypes.ENUM(...Object.values(shared_1.ActivityStatus)),
            allowNull: false,
            validate: {
                isIn: {
                    args: [[...Object.values(shared_1.ActivityStatus)]],
                    msg: 'Invalid status at the monitoring date',
                },
            },
            comment: 'Status at the monitoring date',
        },
    },
    options: {
        tableName: response_model_js_1.tableName.ACTIVITY_MONITORING,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        underscored: true,
        freezeTableName: true,
        comment: 'Activity monitoring table with geographical and validation information',
        indexes: [
        // {
        //   fields: ['guid'],
        //   name: 'idx_activity_monitoring_guid',
        // },
        // {
        //   fields: ['employee_license'],
        //   name: 'idx_activity_monitoring_employee_license',
        // },
        // {
        //   fields: ['monitoring_date'],
        //   name: 'idx_activity_monitoring_monitoring_date',
        // },
        // {
        //   fields: ['last_punch_date'],
        //   name: 'idx_activity_monitoring_last_punch_date',
        // },
        // {
        //   fields: ['punch_count_7_days'],
        //   name: 'idx_activity_monitoring_punch_count_7_days',
        // },
        // {
        //   fields: ['punch_count_30_days'],
        //   name: 'idx_activity_monitoring_punch_count_30_days',
        // },
        // {
        //   fields: ['consecutive_absent_days'],
        //   name: 'idx_activity_monitoring_consecutive_absent_days',
        // },
        // {
        //   fields: ['status_at_date'],
        //   name: 'idx_activity_monitoring_status_at_date',
        // },
        // {
        //   unique: true,
        //   fields: ['employee_license', 'monitoring_date'],
        //   name: 'idx_activity_monitoring_employee_licence_monitory_date',
        // },
        ],
    },
    validation: {
        validateStatusAtDate(status) {
            // const trimmed = status.trim();
            // const statusRegex = /^(ACTIVE|INACTIVE|SUSPICIOUS)$/;
            // return statusRegex.test(trimmed);
            return Object.values(shared_1.ActivityStatus).includes(status);
        },
        validateEmployeeLicense(id) {
            const trimmed = id.toString().trim();
            const idRegex = /^[0-9]+$/;
            return idRegex.test(trimmed);
        },
        validateMonitoringDate(date) {
            return !isNaN(new Date(date).getDate());
        },
        validateLastPunchDate(date) {
            const trimmed = date.trim();
            const dateRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/;
            return dateRegex.test(trimmed);
        },
        validatePunchCount7Days(count) {
            const trimmed = count.toString().trim();
            const countRegex = /^[0-9]+$/;
            return countRegex.test(trimmed);
        },
        validatePunchCount30Days(count) {
            const trimmed = count.toString().trim();
            const countRegex = /^[0-9]+$/;
            return countRegex.test(trimmed);
        },
        validateConsecutiveAbsentDays(count) {
            const trimmed = count.toString().trim();
            const countRegex = /^[0-9]+$/;
            return countRegex.test(trimmed);
        },
        cleanData: (data) => {
            if (data.status_at_date) {
                data.status_at_date = data.status_at_date.trim();
            }
            if (data.employee_license) {
                data.employee_license = data.employee_license.trim();
            }
            if (data.monitoring_date) {
                data.monitoring_date = data.monitoring_date.trim();
            }
            if (data.last_punch_date) {
                data.last_punch_date = data.last_punch_date.trim();
            }
            if (data.punch_count_7_days) {
                data.punch_count_7_days = data.punch_count_7_days.trim();
            }
            if (data.punch_count_30_days) {
                data.punch_count_30_days = data.punch_count_30_days.trim();
            }
            if (data.consecutive_absent_days) {
                data.consecutive_absent_days = data.consecutive_absent_days.trim();
            }
        },
    },
};
