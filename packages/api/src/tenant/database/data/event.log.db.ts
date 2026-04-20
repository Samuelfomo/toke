import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export enum EventEntityType {
  SESSION_TEMPLATE = 'SessionTemplate',
  ROTATION_GROUP = 'RotationGroup',
  ROTATION_ASSIGNMENT = 'RotationAssignment',
  SCHEDULE_ASSIGNMENT = 'ScheduleAssignment',
  ROTATION_GROUP_TEMPLATE = 'RotationGroupTemplate',
}

export enum Source {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
}

// ==========================================
// EVENT LOG (AUDIT GÉNÉRIQUE)
// ==========================================
export const EventLogDbStructure = {
  tableName: tableName.EVENT_LOG,

  attributes: {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      validate: { isInt: true, min: 1, max: 2147483647 },
      comment: 'Event Log ID',
    },

    guid: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: {
        name: 'unique_event_log_guid',
        msg: 'Event Log GUID must be unique.',
      },
      validate: { len: [1, 255] },
      comment: 'Unique identifier',
    },

    // ==========================================
    // ENTITÉ CIBLE
    // ==========================================
    entity_type: {
      type: DataTypes.ENUM(...Object.values(EventEntityType)),
      validate: {
        isIn: {
          args: [Object.values(EventEntityType)],
          msg: 'Invalid entity type',
        },
      },
      allowNull: false,
      comment: 'Type of entity affected',
    },

    entity_id: {
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: {
        len: [1, 128],
      },
      comment: 'GUID of affected entity',
    },

    // ==========================================
    // CHANGEMENTS (GENERIC JSON)
    // ==========================================
    previous_state: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'State before change (flexible JSON)',
    },

    new_state: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'State after change (flexible JSON)',
    },

    changed_fields: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Computed diff between previous_state and new_state',
    },

    // ==========================================
    // MÉTADONNÉES
    // ==========================================
    source: {
      type: DataTypes.ENUM(...Object.values(Source)),
      allowNull: false,
      defaultValue: Source.SYSTEM,
      validate: {
        isIn: {
          args: [Object.values(Source)],
          msg: 'Invalid source type',
        },
      },
      comment: 'Origin of the event',
    },

    modified_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: { isInt: true },
      comment: 'User who triggered the event (null = system/cron)',
    },

    executed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Execution timestamp',
    },
  } as ModelAttributes,

  options: {
    tableName: tableName.EVENT_LOG,
    timestamps: false,
    underscored: true,
    freezeTableName: true,
    comment: 'Generic audit log for system events',

    indexes: [
      {
        fields: ['guid'],
        name: 'idx_event_log_guid',
      },

      // 🔥 Recherche rapide des événements d'une entité
      {
        fields: ['entity_type', 'entity_id'],
        name: 'idx_event_entity',
      },

      // 🔥 Tri chronologique (très utilisé en audit)
      {
        fields: ['executed_at'],
        name: 'idx_event_executed_at',
      },

      // 🔥 Analyse des actions système vs user
      {
        fields: ['source'],
        name: 'idx_event_source',
      },

      // 🔥 Debug utilisateur
      {
        fields: ['modified_by'],
        name: 'idx_event_modified_by',
      },
    ],
  } as ModelOptions,
};
