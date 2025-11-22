import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';
import { HttpMethod } from '../database/data/endpoint.db.js';

export default class EndpointModel extends BaseModel {
  public readonly db = {
    tableName: tableName.ENDPOINT,
    id: 'id',
    method: 'method',
    code: 'code',
    description: 'description',
  } as const;
  protected id?: number;
  protected method?: HttpMethod;
  protected code?: string;
  protected description?: string;

  protected constructor() {
    super();
  }

  /**
   * Trouve un enregistrement par son ID
   */
  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Trouve un enregistrement par son NAME
   */
  protected async findByCode(code: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.code]: code.toUpperCase() });
  }

  /**
   * Liste tous les enregistrements selon les conditions
   */
  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  protected async listAllByMethod(
    method: HttpMethod,
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.method]: method }, paginationOptions);
  }

  /**
   * Créer un endpoint
   */
  protected async create(): Promise<void> {
    await this.validate();

    const existCode = await this.findByCode(this.code!);
    if (existCode) {
      throw new Error(`Endpoint code '${this.code}' already exists`);
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.code]: this.code?.toUpperCase(),
      [this.db.method]: this.method,
      [this.db.description]: this.description,
    });

    console.log(`🌍 Endpoint créé - Code: ${this.code}`);
    if (!lastID) {
      throw new Error(`Endpoint creation failed`);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    console.log('✅ Endpoint créé avec ID:', this.id);
  }

  /**
   * Mettre à jour un endpoint
   */
  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error('Enpoint ID is required for update');
    }

    const updateData: Record<string, any> = {};
    if (this.code !== undefined) {
      const existCode = await this.findByCode(this.code!);
      if (existCode && existCode.id !== this.id) {
        throw new Error('Endpoint code already exists');
      }
      updateData[this.db.code] = this.code.toUpperCase();
    }
    if (this.method !== undefined) updateData[this.db.method] = this.method;
    if (this.description !== undefined) updateData[this.db.description] = this.description;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update endpoint');
    }
  }

  /**
   * Supprime un endpoint
   */
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  private async validate(): Promise<void> {
    // Valider le code
    // Valider la methode
    //valider la description
    // Nettoie les données
  }
}
