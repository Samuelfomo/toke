import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';

import { tableName } from '../../../utils/response.model.js';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

export const EndpointDbStructure = {
  tableName: tableName.ENDPOINT,

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
      comment: 'Endpoint ID',
    },

    method: {
      type: DataTypes.ENUM(...Object.values(HttpMethod)),
      allowNull: false,
      validate: {
        isIn: {
          args: [[...Object.values(HttpMethod)]],
          msg: 'Invalid method',
        },
      },
      comment: 'Http method',
    },

    code: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: { name: 'unique_endpoint_code', msg: 'Endpoint code must be unique' },
      validate: {
        is: /^[a-zA-Z0-9_]{1,128}$/,
        len: [1, 128],
      },
      comment: 'Unique code for identification',
    },

    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: [10, 128],
      },
      comment: 'Detailed description',
    },
  } as ModelAttributes,

  options: {
    tableName: tableName.ENDPOINT,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    comment: 'Table of secure API endpoints',

    indexes: [
      {
        unique: true,
        fields: ['method', 'code'],
        name: 'idx_endpoint_unique_method_code',
      },
      {
        fields: ['method'],
        name: 'idx_endpoint_method',
      },
      {
        fields: ['code'],
        name: 'idx_endpoint_code',
      },
    ],
  } as ModelOptions,
};

// import { DataTypes, ModelAttributes, ModelOptions } from 'sequelize';
//
// import { tableName } from '../../../utils/response.model.js';
//
// export enum HttpMethod {
//   GET = `GET`,
//   POST = `POST`,
//   PUT = `PUT`,
//   PATCH = `PATCH`,
//   DELETE = `DELETE`,
//   OPTIONS = `OPTIONS`,
//   HEAD = `HEAD`,
// }
//
// export const EndpointDbStructure = {
//   tableName: tableName.ENDPOINT,
//   attributes: {
//     id: {
//       type: DataTypes.SMALLINT,
//       primaryKey: true,
//       autoIncrement: true,
//       validate: {
//         isInt: true,
//         min: 1,
//         max: 65535,
//       },
//       comment: 'Endpoint',
//     },
//     method: {
//       type: DataTypes.ENUM(...Object.values(HttpMethod)),
//       allowNull: false,
//       validate: {
//         isIn: {
//           args: [[...Object.values(HttpMethod)]],
//           msg: 'Invalid method',
//         },
//       },
//       comment: 'Http method',
//     },
//     code: {
//       type: DataTypes.STRING(128),
//       unique: { name: 'unique_endpoint_code', msg: 'Endpoint code must be unique' },
//       allowNull: false,
//       validate: {
//         is: /^[a-zA-Z0-9_]{1,128}$/,
//         len: [1, 128],
//       },
//       comment: 'Unique code for identification',
//     },
//     description: {
//       type: DataTypes.STRING(255),
//       allowNull: true,
//       validate: {
//         len: [10, 128],
//       },
//       comment: 'Detailed description',
//     },
//   } as ModelAttributes,
//   options: {
//     tableName: tableName.ENDPOINT,
//     timestamps: true,
//     createdAt: 'created_at',
//     updatedAt: 'updated_at',
//     underscored: true,
//     freezeTableName: true,
//     comment: 'Table of secure API endpoints',
//     indexes: [
//       {
//         unique: true,
//         fields: ['method', 'code'],
//         name: 'idx_endpoint_unique_method_code',
//       },
//       {
//         fields: ['method'],
//         name: 'idx_endpoint_method',
//       },
//       {
//         fields: ['code'],
//         name: 'idx_endpoint_code',
//       },
//     ],
//   } as ModelOptions,
// };
