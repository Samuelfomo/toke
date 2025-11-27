import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class PermissionModel extends BaseModel {
  public readonly db = {
    tableName: tableName.PERMISSION,
    id: 'id',
    profile: 'profile',
    endpoint: 'endpoint',
    route: 'route',
  } as const;
  protected id?: number;
  protected profile?: number;
  protected endpoint?: number;
  protected route?: string;

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
   * Trouve une permission
   */
  protected async findByPermission(profile: number, endpoint: number): Promise<any> {
    return await this.findOne(this.db.tableName, {
      [this.db.profile]: profile,
      [this.db.endpoint]: endpoint,
    });
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

  protected async listAllByRoute(
    route: string,
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.route]: route.toUpperCase() }, paginationOptions);
  }

  /**
   * Create permission
   */
  protected async create(): Promise<void> {
    await this.validate();

    const existCode = await this.findByPermission(this.profile!, this.endpoint!);
    if (existCode) {
      throw new Error(`Permission already exists`);
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.profile]: this.profile,
      [this.db.endpoint]: this.endpoint,
      [this.db.route]: this.route?.toUpperCase(),
    });

    console.log(`🌍 Permission créé - route: ${this.route}`);
    if (!lastID) {
      throw new Error(`Permission creation failed`);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    console.log('✅ Permission créé avec ID:', this.id);
  }

  /**
   * Update permission
   */
  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error('Permission ID is required for update');
    }

    const updateData: Record<string, any> = {};
    if (this.profile !== undefined || this.endpoint !== undefined) {
      const existPermission = await this.findByPermission(this.profile!, this.endpoint!);
      if (existPermission && existPermission.id !== this.id) {
        throw new Error('Permission already exists');
      }
      updateData[this.db.profile] = this.profile;
      updateData[this.db.endpoint] = this.endpoint;
    }
    if (this.route !== undefined) updateData[this.db.route] = this.route;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update permission');
    }
  }

  /**
   * Delete permission
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
