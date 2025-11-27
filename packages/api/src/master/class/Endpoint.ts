import EndpointModel from '../model/EndpointModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import { HttpMethod } from '../database/data/endpoint.db.js';
import { responseStructure as RS } from '../../utils/response.model.js';

export default class Endpoint extends EndpointModel {
  constructor() {
    super();
  }

  static _load(identifier: any, byCode: boolean = false): Promise<Endpoint | null> {
    return new Endpoint().load(identifier, byCode);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<Endpoint[] | null> {
    return new Endpoint().list(conditions, paginationOptions);
  }

  static _listByMethod(
    method: HttpMethod,
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<Endpoint[] | null> {
    return new Endpoint().listByMethod(method, paginationOptions);
  }

  // === GETTERS FLUENT ===
  getId(): number | undefined {
    return this.id;
  }

  getCode(): string | undefined {
    return this.code;
  }

  getMethod(): HttpMethod | undefined {
    return this.method;
  }

  getDescription(): string | undefined {
    return this.description;
  }

  // === SETTERS ===
  setCode(code: string): Endpoint {
    this.code = code.toUpperCase();
    return this;
  }

  setMethod(method: HttpMethod): Endpoint {
    this.method = method;
    return this;
  }

  setDescription(description: string | undefined): Endpoint {
    this.description = description;
    return this;
  }

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
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Endpoint Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async load(identifier: any, byCode: boolean = false): Promise<Endpoint | null> {
    const data = byCode ? await this.findByCode(identifier) : await this.find(Number(identifier));
    if (!data) return null;
    return this.hydrate(data);
  }

  /**
   * Retrieves a list of Endpoint based on the specified conditions.
   *
   * @param {Record<string, any>} [conditions={}] - An optional set of conditions to filter the endpoint.
   * @param paginationOptions
   * @return {Promise<Endpoint[] | null>} A promise that resolves to an array of hydrated Endpoint instances or null if no endpoint are found.
   */
  async list(
    conditions: Record<string, any> = {},
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<Endpoint[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new Endpoint().hydrate(data));
  }

  async listByMethod(
    method: HttpMethod,
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<Endpoint[] | null> {
    const dataset = await this.listAllByMethod(method, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new Endpoint().hydrate(data));
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
  toJSON(): object {
    return {
      [RS.CODE]: this.code,
      [RS.METHOD]: this.method,
      [RS.DESCRIPTION]: this.description,
    };
  }

  /**
   * Returns a string representation of the Endpoint object.
   * @return {string} A string containing the id, name, and active status of the Endpoint.
   */
  toString(): string {
    return `Endpoint { ${RS.ID}: ${this.id}, ${RS.CODE}: "${this.code}", ${RS.METHOD}: "${this.method}", ${RS.DESCRIPTION}: ${this.description} }`;
  }

  // region Méthodes privées

  /**
   * Populates the instance properties with the provided items and returns the instance.
   *
   * @param {any} data - The items object containing properties to hydrate the instance.
   * @return {Endpoint} The updated instance of the Endpoint class.
   */
  private hydrate(data: any): Endpoint {
    this.id = data.id;
    this.code = data.code;
    this.method = data.method;
    this.description = data.description;
    return this;
  }
}
