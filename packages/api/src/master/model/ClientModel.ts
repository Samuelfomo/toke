import { v4 as uuidv4 } from 'uuid';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class ClientModel extends BaseModel {
  public readonly db = {
    tableName: tableName.CLIENT,
    id: 'id',
    name: 'name',
    token: 'token',
    secret: 'secret',
    profile: 'profile',
    active: 'active',
  } as const;

  protected id?: number;
  protected name?: string;
  protected token?: string;
  protected secret?: string;
  protected profile?: number;
  protected active?: boolean;

  protected constructor() {
    super();
  }

  /**
   * Finds and retrieves a record from the database table by its unique identifier.
   *
   * @param {number} id - The unique identifier of the record to be retrieved.
   * @return {Promise<any>} A promise resolving to the found record or null if not found.
   */
  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Finds a record in the database using the provided token.
   * This method queries the database table specified in the `db.tableName` property and searches for a record where the token matches the given value.
   *
   * @param {string} token - The token used to identify the specific record in the database.
   * @return {Promise<any>} A promise that resolves to the found record or null if no record is found.
   */
  protected async findByToken(token: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.token]: token });
  }

  /**
   * Retrieves a list of all records from the specified table, optionally filtered by provided conditions.
   *
   * @param {Record<string, any>} [conditions={}] An optional object representing the conditions to filter the records. Keys represent column names, and values represent the expected values for filtering.
   * @return {Promise<any[]>} A promise that resolves to an array of records that match the provided conditions.
   */
  protected async listAll(conditions: Record<string, any> = {}): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions);
  }

  /**
   * Retrieves a list of all records from the specified table, optionally filtered by provided conditions.
   *
   * @param {Record<string, any>} [profil] An optional object representing the conditions to filter the records. Keys represent column names, and values represent the expected values for filtering.
   * @return {Promise<any[]>} A promise that resolves to an array of records that match the provided conditions.
   */
  protected async listByProfil(profil: number): Promise<any[]> {
    return await this.listAll({ [this.db.profile]: profil });
  }

  /**
   * Creates a new API key with a unique token and stores it in the database.
   * Validates the necessary conditions before creation and checks for token collisions.
   * If a unique token is successfully created and stored, updates the instance state.
   *
   * @return {Promise<void>} Resolves when the API key is successfully created, or rejects with an error if the process fails.
   */
  protected async create(): Promise<void> {
    this.validate();

    // Generate unique token
    const token = uuidv4();

    // const existingToken = await this.findByToken(tokenPart);
    // if (existingToken) {
    //   throw new Error('Token collision detected, please retry');
    // }

    console.log('💾 Appel insertOne...', this.profile);
    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.name]: this.name,
      [this.db.token]: token,
      [this.db.secret]: this.secret,
      [this.db.profile]: this.profile,
      [this.db.active]: true,
    });

    console.log(`🔑 Token généré - API Key: ${token}`);

    if (!lastID) {
      throw new Error('Failed to create client');
    }

    this.id = lastID.id;
    this.token = token;
    this.active = true;

    console.log('✅ Client créé avec ID:', this.id);
  }

  /**
   * Updates the current client record in the database.
   * Validates required fields and builds the items object for updating the record.
   * Throws an error if the client ID is missing or if the update operation fails.
   *
   * @return {Promise<void>} Resolves when the update operation completes successfully.
   * @throws {Error} If client ID is not provided or the update fails.
   */
  protected async update(): Promise<void> {
    this.validate();

    if (!this.id) {
      throw new Error('Client ID is required for update');
    }

    const updateData: Record<string, any> = {};
    if (this.name !== undefined) updateData[this.db.name] = this.name;
    if (this.active !== undefined) updateData[this.db.active] = this.active;
    if (this.profile !== undefined) updateData[this.db.profile] = this.profile;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update client');
    }
  }

  /**
   * Deletes a record from the database with the specified ID.
   *
   * @param {number} id - The unique identifier of the record to be deleted.
   * @return {Promise<boolean>} A promise that resolves to true if the deletion is successful, otherwise false.
   */
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Validates the required properties of a client object.
   * Ensures that the name property is non-empty and that the secret property meets the minimum length requirement.
   * Throws an error if validation fails.
   *
   * @return {void} This method does not return a value.
   */
  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Client name is required');
    }

    if (!this.secret || this.secret.trim().length < 8) {
      throw new Error('Client secret must be at least 8 characters');
    }

    if (!this.profile || isNaN(this.profile)) {
      throw new Error('Profile ID is required and must be a number');
    }
  }
}
