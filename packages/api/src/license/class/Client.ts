import ClientModel from '../model/ClientModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';

import ClientProfil from './ClientProfil.js';

export default class Client extends ClientModel {
  private profilObject?: ClientProfil;
  constructor() {
    super();
  }

  /**
   * Loads a client using the provided identifier and an optional token flag.
   *
   * @param {any} identifier - The unique identifier used to load the client.
   * @param {boolean} [byToken=false] - A flag indicating whether to load the client by token.
   * @return {Promise<Client | null>} A promise that resolves to the loaded client instance or null if not found.
   */
  static _load(identifier: any, byToken: boolean = false): Promise<Client | null> {
    return new Client().load(identifier, byToken);
  }

  /**
   * Retrieves a list of clients based on the specified conditions.
   *
   * @param {Record<string, any>} [conditions={}] - A set of key-value pairs representing the conditions for filtering the clients.
   * @return {Promise<Client[] | null>} A promise that resolves to an array of clients matching the conditions, or null if no clients are found.
   */
  static _list(conditions: Record<string, any> = {}): Promise<Client[] | null> {
    return new Client().list(conditions);
  }

  /**
   * Converts the given items into a Client object by hydrating the Client instance with the provided items.
   *
   * @param {any} data - The items to be converted into a Client object.
   * @return {Client} The hydrated Client object.
   */
  static _toObject(data: any): Client {
    return new Client().hydrate(data);
  }

  setName(name: string): Client {
    this.name = name;
    return this;
  }

  setSecret(secret: string): Client {
    this.secret = secret;
    return this;
  }

  setActive(active: boolean): Client {
    this.active = active;
    return this;
  }

  setProfil(profil: number): Client {
    this.profile = profil;
    this.profilObject = undefined;
    return this;
  }

  // GETTERS SIMPLES
  getName(): string | undefined {
    return this.name;
  }

  getSecret(): string | undefined {
    return this.secret;
  }

  getToken(): string | undefined {
    return this.token;
  }

  getId(): number | undefined {
    return this.id;
  }

  isActive(): boolean | undefined {
    return this.active;
  }

  /**
   * Récupère l'objet ClientProfil associé
   */
  async getProfil(): Promise<ClientProfil | null> {
    if (!this.profile) return null;
    if (!this.profilObject) {
      this.profilObject = (await ClientProfil._load(this.profile)) || undefined;
    }
    return this.profilObject || null;
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
      if (this.isNew()) {
        await this.create();
      } else {
        await this.update();
      }
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde:', error);
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
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Client Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  /**
   * Updates the status of the current object by toggling its active state.
   * Verifies the existence of an identifier prior to performing the update.
   * Saves the updated state to persist the changes.
   *
   * @return {Promise<void>} A promise that resolves when the status update and save operations are completed.
   */
  async patchStatus(): Promise<void> {
    await W.isOccur(!this.id, `${G.identifierMissing.code}: Client Patch Status`);
    this.active = !this.active;
    await this.save();
  }

  /**
   * Loads a client by a given identifier or token.
   *
   * @param {any} identifier - The identifier to locate the client, can be an ID or token.
   * @param {boolean} [byToken=false] - A flag indicating if the lookup should be by token (true) or by numeric identifier (false).
   * @return {Promise<Client|null>} A promise resolving to the found client object if successful, or null if not found.
   */
  async load(identifier: any, byToken: boolean = false): Promise<Client | null> {
    const data = byToken ? await this.findByToken(identifier) : await this.find(Number(identifier));
    if (!data) return null;
    return this.hydrate(data);
  }

  /**
   * Retrieves a list of clients based on the specified conditions.
   *
   * @param {Record<string, any>} [conditions={}] - An optional set of conditions to filter the clients.
   * @return {Promise<Client[] | null>} A promise that resolves to an array of hydrated Client instances or null if no clients are found.
   */
  async list(conditions: Record<string, any> = {}): Promise<Client[] | null> {
    const dataset = await this.listAll(conditions);
    if (!dataset) return null;
    return dataset.map((data) => new Client().hydrate(data));
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
  async toJSON(): Promise<object> {
    const profil = await this.getProfil();
    return {
      name: this.name,
      token: this.token,
      profil: profil?.toJSON() || null,
    };
  }

  /**
   * Returns a string representation of the Client object.
   * @return {string} A string containing the id, name, and active status of the Client.
   */
  toString(): string {
    return `Client { id: ${this.id}, name: "${this.name}", profil: ${this.profilObject?.getName()} , active: ${this.active} }`;
  }

  /**
   * Populates the instance properties with the provided items and returns the instance.
   *
   * @param {any} data - The items object containing properties to hydrate the instance.
   * @return {Client} The updated instance of the Client class.
   */
  private hydrate(data: any): Client {
    this.id = data.id;
    this.name = data.name;
    this.token = data.token;
    this.secret = data.secret;
    this.active = data.active;
    this.profile = data.profile;
    this.profilObject = undefined;
    return this;
  }
}
