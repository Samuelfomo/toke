import PermissionModel from '../model/PermissionModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import { HttpMethod } from '../database/data/endpoint.db.js';
import { responseStructure as RS, responseValue, ViewMode } from '../../utils/response.model.js';

import ClientProfile from './ClientProfile.js';
import Endpoint from './Endpoint.js';

export default class Permission extends PermissionModel {
  private profileObject?: ClientProfile;
  private endpointObject?: Endpoint;
  constructor() {
    super();
  }

  // === GETTERS FLUENT ===

  static _load(identifier: any, byPermission: boolean = false): Promise<Permission | null> {
    return new Permission().load(identifier, byPermission);
  }

  /**
   * Retrieves a list of permissions based on the specified conditions.
   *
   * @param {Record<string, any>} [conditions={}] - A set of key-value pairs representing the conditions for filtering the permissions.
   * @param paginationOptions
   * @return {Promise<Permission[] | null>} A promise that resolves to an array of permissions matching the conditions, or null if no permissions are found.
   */
  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<Permission[] | null> {
    return new Permission().list(conditions, paginationOptions);
  }

  static _listByRoute(
    method: HttpMethod,
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<Permission[] | null> {
    return new Permission().listByRoute(method, paginationOptions);
  }

  getId(): number | undefined {
    return this.id;
  }

  getProfile(): number | undefined {
    return this.profile;
  }

  getEndpoint(): number | undefined {
    return this.endpoint;
  }

  // === SETTERS ===

  async getProfileObject(): Promise<ClientProfile | null> {
    if (!this.profile) return null;
    if (!this.profileObject) {
      this.profileObject = (await ClientProfile._load(this.profile)) || undefined;
    }
    return this.profileObject || null;
  }

  async getEndpointObject(): Promise<Endpoint | null> {
    if (!this.endpoint) return null;
    if (!this.endpointObject) {
      this.endpointObject = (await Endpoint._load(this.endpoint)) || undefined;
    }
    return this.endpointObject || null;
  }

  getRoute(): string | undefined {
    return this.route;
  }

  // region Méthodes privées

  setProfile(profile: number): Permission {
    this.profile = profile;
    this.profileObject = undefined;
    return this;
  }

  setEndpoint(endpoint: number): Permission {
    this.endpoint = endpoint;
    this.endpointObject = undefined;
    return this;
  }

  setRoute(route: string): Permission {
    this.route = route;
    return this;
  }

  /**
   * Persists the current state of the instance.
   * Depending on whether the instance is new or existing,
   * it either creates a new record or updates the existing one.
   *
   * @throws {Error} If an error occurs during the save operation.
   * @return {Promise<void>} A promise that resolves when the save operation completes successfully.
   */
  async save(): Promise<void> {
    try {
      this.isNew() ? await this.create() : await this.update();
    } catch (error: any) {
      throw new Error(error);
    }
  }

  /**
   * Deletes the resource associated with the current instance identifier.
   * Ensures that the identifier exists before proceeding with the deletion process.
   *
   * @return {Promise<boolean>} Returns a promise that resolves to a boolean value indicating whether the delete operation was successful.
   */
  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Permission Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async load(identifier: any, byPermission: boolean = false): Promise<Permission | null> {
    const data = byPermission
      ? await this.findByPermission(identifier.profile, identifier.endpoint)
      : await this.find(Number(identifier));
    if (!data) return null;
    return this.hydrate(data);
  }

  /**
   * Retrieves a list of permissions based on the specified conditions.
   *
   * @param {Record<string, any>} [conditions={}] - An optional set of conditions to filter the permissions.
   * @return {Promise<Permission[] | null>} A promise that resolves to an array of hydrated Permission instances or null if no permissions are found.
   */
  async list(
    conditions: Record<string, any> = {},
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<Permission[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new Permission().hydrate(data));
  }

  /**
   * Checks whether the current instance is in a 'new' state.
   *
   * @return {boolean} True if the instance has no defined ID, indicating it is new; otherwise, false.
   */
  isNew(): boolean {
    return this.id === undefined;
  }

  /**
   * Converts the instance properties to a JSON object representation.
   * @return {object} A JSON object containing the `name` and `token` properties of the instance.
   */
  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const profile = await this.getProfileObject();
    const endpoint = await this.getEndpointObject();
    const baseData = {
      [RS.ROUTE]: this.route,
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.PROFILE]: profile?.getName(),
        [RS.ENDPOINT]: endpoint?.getCode(),
      };
    }

    return {
      ...baseData,
      [RS.PROFILE]: profile?.toJSON(),
      [RS.ENDPOINT]: endpoint?.toJSON(),
    };
  }

  /**
   * Returns a string representation of the ClientProfile object.
   * @return {string} A string containing the id, name, and active status of the ClientProfile.
   */
  toString(): string {
    return `Profile { id: ${this.id}, profile: "${this.profileObject?.getName()}", endpoint: "${this.endpointObject?.getCode()}", route: ${this.route} }`;
  }

  async listByRoute(
    method: HttpMethod,
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<Permission[] | null> {
    const dataset = await this.listAllByRoute(method, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new Permission().hydrate(data));
  }

  /**
   * Populates the instance properties with the provided items and returns the instance.
   *
   * @param {any} data - The items object containing properties to hydrate the instance.
   * @return {Permission} The updated instance of the Permission class.
   */
  private hydrate(data: any): Permission {
    this.id = data.id;
    this.profile = data.profile;
    this.endpoint = data.endpoint;
    this.route = data.route;
    return this;
  }
}

// export default class Permission extends PermissionModel {
//   private profileObject?: ClientProfile;
//   private endpointObject?: Endpoint;
//
//   constructor() {
//     super();
//   }
//
//   static _load(identifier: any, byPermission: boolean = false): Promise<Permission | null> {
//     return new Permission().load(identifier, byPermission);
//   }
//
//   static _list(
//     conditions: Record<string, any> = {},
//     paginationOptions: {
//       offset?: number;
//       limit?: number;
//     } = {},
//   ): Promise<Permission[] | null> {
//     return new Permission().list(conditions, paginationOptions);
//   }
//
//   static _listByRoute(
//     method: HttpMethod,
//     paginationOptions: {
//       offset?: number;
//       limit?: number;
//     } = {},
//   ): Promise<Permission[] | null> {
//     return new Permission().listByRoute(method, paginationOptions);
//   }
//
//   // === GETTERS FLUENT ===
//   getId(): number | undefined {
//     return this.id;
//   }
//
//   getProfile(): number | undefined {
//     return this.profile;
//   }
//
//   getEndpoint(): number | undefined {
//     return this.endpoint;
//   }
//
//   getRoute(): string | undefined {
//     return this.route;
//   }
//
//   async getProfileObject(): Promise<ClientProfile | null> {
//     if (!this.profile) return null;
//     if (!this.profileObject) {
//       this.profileObject = (await ClientProfile._load(this.profile)) || undefined;
//     }
//     return this.profileObject || null;
//   }
//
//   async getEndpointObject(): Promise<Endpoint | null> {
//     if (!this.endpoint) return null;
//     if (!this.endpointObject) {
//       this.endpointObject = (await Endpoint._load(this.profile)) || undefined;
//     }
//     return this.endpointObject || null;
//   }
//
//   // === SETTERS ===
//   setProfile(profile: number): Permission {
//     this.profile = profile;
//     return this;
//   }
//
//   setEndpoint(endpoint: number): Permission {
//     this.endpoint = endpoint;
//     return this;
//   }
//
//   setRoute(route: string): Permission {
//     this.route = route;
//     return this;
//   }
//
//   async save(): Promise<void> {
//     try {
//       this.isNew() ? await this.create() : await this.update();
//     } catch (error: any) {
//       throw new Error(error);
//     }
//   }
//
//   /**
//    * Deletes the resource associated with the current instance identifier.
//    * Ensures that the identifier exists before proceeding with the deletion process.
//    *
//    * @return {Promise<boolean>} Returns a promise that resolves to a boolean value indicating whether the delete operation was successful.
//    */
//   async delete(): Promise<boolean> {
//     if (this.id !== undefined) {
//       await W.isOccur(!this.id, `${G.identifierMissing.code}: Permission delete`);
//       return await this.trash(this.id);
//     }
//     return false;
//   }
//
//   async load(identifier: any, byPermission: boolean = false): Promise<Permission | null> {
//     const data = byPermission
//       ? await this.findByPermission(identifier.profile, identifier.endpoint)
//       : await this.find(Number(identifier));
//     if (!data) return null;
//     return this.hydrate(data);
//   }
//
//   /**
//    * Retrieves a list of Endpoint based on the specified conditions.
//    *
//    * @param {Record<string, any>} [conditions={}] - An optional set of conditions to filter the permission.
//    * @param paginationOptions
//    * @return {Promise<Permission[] | null>} A promise that resolves to an array of hydrated permission instances or null if no permission are found.
//    */
//   async list(
//     conditions: Record<string, any> = {},
//     paginationOptions: {
//       offset?: number;
//       limit?: number;
//     } = {},
//   ): Promise<Permission[] | null> {
//     const dataset = await this.listAll(conditions, paginationOptions);
//     if (!dataset) return null;
//     return dataset.map((data) => new Permission().hydrate(data));
//   }
//
//   async listByRoute(
//     method: HttpMethod,
//     paginationOptions: {
//       offset?: number;
//       limit?: number;
//     } = {},
//   ): Promise<Permission[] | null> {
//     const dataset = await this.listAllByRoute(method, paginationOptions);
//     if (!dataset) return null;
//     return dataset.map((data) => new Permission().hydrate(data));
//   }
//
//   /**
//    * Checks whether the current instance is in a 'new' state.
//    *
//    * @return {boolean} True if the instance has no defined ID, indicating it is new; otherwise, false.
//    */
//   isNew(): boolean {
//     return this.id === undefined;
//   }
//
//   /**
//    * Converts the instance properties to a JSON object representation.
//    * @return {object} A JSON object containing the `name` and `token` properties of the instance.
//    */
//   async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
//     const profile = await this.getProfileObject();
//     const endpoint = await this.getEndpointObject();
//     const baseData = {
//       [RS.ROUTE]: this.route,
//     };
//
//     if (view === responseValue.MINIMAL) {
//       return {
//         ...baseData,
//         [RS.PROFILE]: profile?.getName(),
//         [RS.ENDPOINT]: endpoint?.getCode(),
//       };
//     }
//
//     return {
//       ...baseData,
//       [RS.PROFILE]: profile?.toJSON(),
//       [RS.ENDPOINT]: endpoint?.toJSON(),
//     };
//   }
//
//   /**
//    * Returns a string representation of the Permission object.
//    * @return {string} A string containing the id, name, and active status of the Permission.
//    */
//   toString(): string {
//     return `Permission { ${RS.ID}: ${this.id}, ${RS.PROFILE}: "${this.profile}", ${RS.ENDPOINT}: "${this.endpoint}", ${RS.ROUTE}: ${this.route} }`;
//   }
//
//   // region Méthodes privées
//
//   /**
//    * Populates the instance properties with the provided items and returns the instance.
//    *
//    * @param {any} data - The items object containing properties to hydrate the instance.
//    * @return {Permission} The updated instance of the permission class.
//    */
//   private hydrate(data: any): Permission {
//     this.id = data.id;
//     this.profile = data.profile;
//     this.endpoint = data.endpoint;
//     this.route = data.route;
//     return this;
//   }
// }
