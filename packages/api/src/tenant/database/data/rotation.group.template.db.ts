import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

// ==========================================
// ROTATION GROUP TEMPLATES
// ==========================================
// Table de jointure entre RotationGroups et les snapshots de SessionTemplate.
// Chaque ligne représente UN template à une POSITION donnée dans le cycle
// d'un RotationGroup. Le snapshot JSONB garantit l'isolation totale : toute
// modification ultérieure du SessionTemplate source n'affecte pas cette ligne.
// ==========================================
export const RotationGroupTemplateDbStructure = {
  tableName: tableName.ROTATION_GROUP_TEMPLATE,
  attributes: {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      comment: 'Rotation Group Template ID',
    },
    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_rotation_group_template_guid',
        msg: 'Rotation Group Template GUID must be unique.',
      },
      validate: {
        len: [1, 255],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    rotation_group: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: tableName.ROTATION_GROUPS,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'Reference to the parent RotationGroup',
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 0,
      },
      comment: 'Zero-based position of this template in the rotation cycle (0, 1, 2, …)',
    },
    template_snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment:
        'Full copy of the SessionTemplate at the time the RotationGroup was created or updated (isolated from future changes to the source template)',
    },
    // Référence informative vers la source — nullable intentionnellement :
    // si le SessionTemplate source est supprimé, le snapshot reste valide.
    source_template: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: tableName.SESSION_TEMPLATES,
        key: 'id',
      },
      validate: {
        isInt: true,
      },
      comment: 'Informational FK to the original SessionTemplate (nullable if source deleted)',
    },
    source_template_guid: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: [1, 255],
      },
      comment: 'GUID of the original SessionTemplate for auditability without strict FK dependency',
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true,
      },
      comment: 'Soft delete timestamp',
    },
  } as ModelAttributes,
  options: {
    tableName: tableName.ROTATION_GROUP_TEMPLATE,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    underscored: true,
    freezeTableName: true,
    comment:
      'Ordered template snapshots for each RotationGroup cycle — isolated from SessionTemplate mutations',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_rg_templates_guid',
      },
      {
        fields: ['rotation_group'],
        name: 'idx_rg_templates_rotation_group',
      },
      {
        fields: ['position'],
        name: 'idx_rg_templates_position',
      },
      {
        // Primary read path: fetch all templates for a group in order
        fields: ['rotation_group', 'position'],
        name: 'idx_rg_templates_group_position',
      },
      {
        // Enforce unique position per group (no two snapshots at same slot)
        unique: true,
        fields: ['rotation_group', 'position'],
        name: 'unique_rg_templates_group_position',
        where: { deleted_at: null },
      },
      {
        fields: ['source_template'],
        name: 'idx_rg_templates_source_template',
      },
      {
        fields: ['template_snapshot'],
        name: 'idx_rg_templates_snapshot',
        using: 'GIN',
      },
      {
        fields: ['deleted_at'],
        name: 'idx_rg_templates_deleted_at',
      },
    ],
  } as ModelOptions,
};
