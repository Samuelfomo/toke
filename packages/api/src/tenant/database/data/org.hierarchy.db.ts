import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';
import { RelationshipType } from '@toke/shared';

import { tableName } from '../../../utils/response.model.js';

export const OrgHierarchyDbStructure = {
  tableName: tableName.ORG_HIERARCHY,
  attributes: {
    id: {
      type: DataTypes.SMALLINT,
      primaryKey: true,
      autoIncrement: true,
      validate: {
        isInt: true,
        min: 1,
        max: 65535,
      },
      comment: 'Org hierarchy ID',
    },
    guid: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_org_hierarchy_guid', msg: 'Org hierarchy GUID must be unique.' },
      defaultValue: DataTypes.UUIDV4,
      validate: {
        len: [1, 128],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    subordinate: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      // onUpdate: 'CASCADE',
      OnDelete: 'CASCADE',
      comment: 'User',
    },
    supervisor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      // onUpdate: 'CASCADE',
      OnDelete: 'CASCADE',
      comment: 'User',
    },
    relationship_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: RelationshipType.DIRECT_REPORT,
      validate: {
        len: [1, 50],
      },
      comment: 'Relationship type',
    },
    effective_from: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: () => new Date().toISOString().slice(0, 10), // 'YYYY-MM-DD',
      validate: {
        isDate: true,
      },
      comment: 'Effective from date',
    },
    effective_to: {
      type: DataTypes.DATEONLY, // -- NULL = relation active
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'Effective to date',
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [1, 100],
      },
      comment: 'Department',
    },
    cost_center: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [1, 50],
      },
      comment: 'Cost center',
    },
    delegation_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      comment: 'Delegation level',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.ORG_HIERARCHY,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Org hierarchy table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_org_hierarchy_guid',
      },
      {
        fields: ['subordinate'],
        name: 'idx_org_hierarchy_subordinate',
      },
      {
        fields: ['supervisor'],
        name: 'idx_org_hierarchy_supervisor',
      },
      {
        fields: ['effective_from'],
        name: 'idx_org_hierarchy_effective_from',
      },
      {
        unique: true,
        fields: ['subordinate', 'supervisor', 'effective_from'],
        name: 'idx_org_hierarchy_subordinate_supervisor_effective_from',
      },
      {
        fields: ['relationship_type'],
        name: 'idx_org_hierarchy_relationship_type',
      },
      {
        fields: ['effective_to'],
        name: 'idx_org_hierarchy_effective_to',
      },
      {
        fields: ['department'],
        name: 'idx_org_hierarchy_department',
      },
      {
        fields: ['cost_center'],
        name: 'idx_org_hierarchy_cost_center',
      },
      {
        fields: ['delegation_level'],
        name: 'idx_org_hierarchy_delegation_level',
      },
      {
        fields: ['created_at'],
        name: 'idx_org_hierarchy_created_at',
      },
    ],
  } as ModelOptions,
};
