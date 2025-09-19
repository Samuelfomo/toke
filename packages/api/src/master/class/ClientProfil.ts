import ClientProfileModel from '../model/ClientProfileModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';

export default class ClientProfil extends ClientProfileModel {
  constructor() {
    super();
  }

  // === GETTERS FLUENT ===

  /**
   * Loads a client using the provided identifier and an optional token flag.
   *
   * @param {any} identifier - The unique identifier used to load the profil.
   * @param {boolean} [byName=false] - A flag indicating whether to load the profil by token.
   * @return {Promise<ClientProfil | null>} A promise that resolves to the loaded profil instance or null if not found.
   */
  static _load(identifier: any, byName: boolean = false): Promise<ClientProfil | null> {
    return new ClientProfil().load(identifier, byName);
  }

  /**
   * Retrieves a list of profiles based on the specified conditions.
   *
   * @param {Record<string, any>} [conditions={}] - A set of key-value pairs representing the conditions for filtering the profiles.
   * @return {Promise<ClientProfil[] | null>} A promise that resolves to an array of profiles matching the conditions, or null if no profiles are found.
   */
  static _list(conditions: Record<string, any> = {}): Promise<ClientProfil[] | null> {
    return new ClientProfil().list(conditions);
  }

  getId(): number | undefined {
    return this.id;
  }

  getName(): string | undefined {
    return this.name;
  }

  // === SETTERS ===

  isRoot(): boolean {
    return this.root;
  }

  getDescription(): string | undefined {
    return this.description;
  }

  setName(name: string | undefined): ClientProfil {
    this.name = name;
    return this;
  }

  // region Méthodes privées

  setRoot(root: boolean): ClientProfil {
    this.root = root;
    return this;
  }

  setDescription(description: string | undefined) {
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
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Profile Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  /**
   * Loads a profile by a given identifier or name.
   *
   * @param {any} identifier - The identifier to locate the client, can be an ID or name.
   * @param {boolean} [byName=false] - A flag indicating if the lookup should be by name (true) or by numeric identifier (false).
   * @return {Promise<ClientProfil|null>} A promise resolving to the found client object if successful, or null if not found.
   */
  async load(identifier: any, byName: boolean = false): Promise<ClientProfil | null> {
    const data = byName ? await this.findByName(identifier) : await this.find(Number(identifier));
    if (!data) return null;
    return this.hydrate(data);
  }

  async getExitAdmin(): Promise<boolean> {
    return await this.existAdmin();
  }

  /**
   * Retrieves a list of clients based on the specified conditions.
   *
   * @param {Record<string, any>} [conditions={}] - An optional set of conditions to filter the profiles.
   * @return {Promise<ClientProfil[] | null>} A promise that resolves to an array of hydrated ClientProfil instances or null if no profiles are found.
   */
  async list(conditions: Record<string, any> = {}): Promise<ClientProfil[] | null> {
    const dataset = await this.listAll(conditions);
    if (!dataset) return null;
    return dataset.map((data) => new ClientProfil().hydrate(data));
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
      name: this.name,
      description: this.description,
    };
  }

  /**
   * Returns a string representation of the ClientProfil object.
   * @return {string} A string containing the id, name, and active status of the ClientProfil.
   */
  toString(): string {
    return `Profil { id: ${this.id}, name: "${this.name}", description: ${this.description} }`;
  }

  /**
   * Populates the instance properties with the provided items and returns the instance.
   *
   * @param {any} data - The items object containing properties to hydrate the instance.
   * @return {ClientProfil} The updated instance of the ClientProfil class.
   */
  private hydrate(data: any): ClientProfil {
    this.id = data.id;
    this.name = data.name;
    this.root = data.root;
    this.description = data.description;
    return this;
  }
}
