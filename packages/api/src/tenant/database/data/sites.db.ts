import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export enum SiteType {
  MANAGER = 'manager_site',
  GLOBAL = 'global_site',
  TEMPORARY = 'temporary_site',
  PUBLIC = 'public_site',
}

export const SitesDbStructure = {
  tableName: tableName.SITES,
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
      comment: 'Site ID',
    },
    guid: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_site_guid', msg: 'Site GUID must be unique.' },
      defaultValue: DataTypes.UUIDV4,
      validate: {
        len: [1, 128],
      },
      comment: 'Unique, automatically generated digital GUID',
    },
    tenant: {
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: {
        len: [1, 128],
        notEmpty: true,
      },
      comment: 'Tenant Reference ',
    },
    created_by: {
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
      OnDelete: 'CASCADE',
      comment: 'Users',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
        notEmpty: true,
      },
      comment: 'Site name',
    },
    site_type: {
      type: DataTypes.ENUM(...Object.values(SiteType)),
      allowNull: false,
      defaultValue: SiteType.MANAGER,
      validate: {
        isIn: {
          args: [Object.values(SiteType)],
          msg: 'Site type must be one of: manager_site, global_site, temporary_site, public_site',
        },
      },
      comment: 'Site type',
    },
    address: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidAddress(value: any) {
          if (value === null || value === undefined) return;
          if (typeof value !== 'object') {
            throw new Error('Address must be an object');
          }
          const requiredFields = ['city', 'location', 'place_name'];
          for (const field of requiredFields) {
            if (!value[field] || typeof value[field] !== 'string') {
              throw new Error(`Address must contain a valid ${field}`);
            }
          }
        },
      },
      comment: 'Sites address as JSON object with city, location, place_name',
    },
    geofence_polygon: {
      type: DataTypes.GEOMETRY('POLYGON', 4326),
      allowNull: false,
      // defaultValue: { type: 'Polygon', coordinates: [[[0,0],[0,100],[100,100],[100,0],[0,0]]] }
      validate: {
        isPolygon: true,
      },
      comment: 'Sites geofence polygon',
    },
    geofence_radius: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      validate: {
        isInt: true,
        min: 1,
        max: 10000, // 10 km,
      },
      comment: 'Sites geofence radius',
    },
    qr_reference: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: tableName.USERS,
        key: 'id',
      },
      validate: {
        isInt: true,
        min: 1,
        max: 2147483647,
      },
      comment: 'QR reference users',
    },
    qr_code_data: {
      type: DataTypes.JSONB,
      allowNull: false,
      // validate: {
      //   isValidQRCodeData(value: any) {
      //     // if (value === null || value === undefined) return;
      //     if (typeof value !== 'object') {
      //       throw new Error('QR code data must be an object');
      //     }
      //     const requiredFields = [
      //       'site_id',
      //       'site_name',
      //       'site_type',
      //       'site_address',
      //       'site_geofence_polygon',
      //       'site_geofence_radius',
      //     ];
      //     for (const field of requiredFields) {
      //       if (!value[field] || typeof value[field] !== 'string') {
      //         throw new Error(`QR code data must contain a valid ${field}`);
      //       }
      //     }
      //   },
      // },
      comment: 'QR code data as JSON object',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      validate: {
        isBoolean: true,
      },
      comment: 'Site is active',
    },
    public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: true,
      },
      comment: 'Site is public',
    },
    allowed_roles: {
      type: DataTypes.JSONB,
      allowNull: true,
      // validate: {
      //   isValidAllowedRoles(value: any) {
      //     if (value === null || value === undefined) return;
      //     if (typeof value !== 'object') {
      //       throw new Error('Allowed roles must be an object');
      //     }
      //     const requiredFields = ['manager', 'employee', 'guest'];
      //     for (const field of requiredFields) {
      //       if (!value[field] || typeof value[field] !== 'string') {
      //         throw new Error(`Allowed roles must contain a valid ${field}`);
      //       }
      //     }
      //   }
      // }
      comment: 'Allowed roles as JSON object',
    },
    // allowed_roles: {
    //   type: DataTypes.ARRAY(DataTypes.STRING),
    //   allowNull: false,
    //   defaultValue: [],
    //   validate: {
    //     isArray: true,
    //   },
    //   comment: 'Allowed roles',
    // },
  } as ModelAttributes,
  options: {
    tableName: tableName.SITES,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Sites table with validation information',
    indexes: [
      {
        fields: ['guid'],
        name: 'idx_site_guid',
      },
      {
        fields: ['tenant'],
        name: 'idx_site_tenant',
      },
      {
        fields: ['created_by'],
        name: 'idx_site_created_by',
      },
      {
        fields: ['name'],
        name: 'idx_site_name',
      },
      {
        fields: ['site_type'],
        name: 'idx_site_type',
      },
      {
        fields: ['address'],
        name: 'idx_site_address',
      },
      {
        fields: ['geofence_polygon'],
        name: 'idx_site_geofence_polygon',
        using: 'GIST',
      },
      {
        fields: ['geofence_radius'],
        name: 'idx_site_geofence_radius',
      },
      {
        fields: ['qr_reference'],
        name: 'idx_site_qr_reference',
      },
      {
        fields: ['qr_code_data'],
        name: 'idx_site_qr_code_data',
      },
      {
        fields: ['active'],
        name: 'idx_site_active',
      },
      {
        fields: ['public'],
        name: 'idx_site_public',
      },
      {
        fields: ['allowed_roles'],
        name: 'idx_site_allowed_roles',
        using: 'GIN',
      },
      {
        fields: ['created_at'],
        name: 'idx_site_created_at',
      },
    ],
  } as ModelOptions,
};
