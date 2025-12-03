import BaseModel from '../database/db.base.js';
// import G from '../tools/glossary';
import { FeatureDbStructure } from '../database/data/feature.db.js';
import { tableName } from '../../utils/response.model.js';

export default class FeatureModel extends BaseModel {
  public readonly db = {
    tableName: tableName.FEATURE,
    id: 'id',
    guid: 'guid',
    name: 'name',
    code: 'code',
    description: 'description',
  } as const;

  protected id?: number;
  protected guid?: number;
  protected name?: string;
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
  protected async findByGuid(guid: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }

  protected async findByName(name: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.name]: name });
  }

  /**
   * Trouve un enregistrement par son code
   */
  protected async findByCode(code: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.code]: code });
  }

  /**
   * Liste tous les enregistrements selon les conditions
   */
  protected async listAll(conditions: Record<string, any> = {}): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions);
  }

  protected async create(): Promise<void> {
    this.validate();

    const guid = await this.guidGenerator(this.db.tableName, 6);
    if (!guid) {
      throw new Error('Failed to generate GUID for feature entry');
    }

    const existingCode = await this.findByCode(this.code!);
    if (existingCode) {
      throw new Error(`Feature with code ${this.code} already exists`);
    }

    const existingName = await this.findByName(this.name!);
    if (existingName) {
      throw new Error(`Feature with name ${this.name} already exists`);
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.name]: this.name,
      [this.db.code]: this.code,
      [this.db.description]: this.description,
    });

    if (!lastID) {
      throw new Error('Failed to create feature');
    }

    this.id = lastID;
    this.guid = guid;
    console.log('✅ Feature créé avec ID:', this.id);
  }

  protected async update(): Promise<void> {
    this.validate();

    if (!this.id) {
      throw new Error('Feature ID is required for update');
    }

    if (this.code) {
      const existingFeature = await this.findByCode(this.code);
      if (existingFeature && existingFeature.id !== this.id) {
        throw new Error(`Feature with code ${this.code} already exists`);
      }
    }
    if (this.name) {
      const existingFeature = await this.findByName(this.name);
      if (existingFeature && existingFeature.id !== this.id) {
        throw new Error(`Feature with name ${this.name} already exists`);
      }
    }

    const updateData: Record<string, any> = {};
    if (this.name !== undefined) updateData[this.db.name] = this.name;
    if (this.code !== undefined) updateData[this.db.code] = this.code;
    if (this.description !== undefined) updateData[this.db.description] = this.description;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update feature');
    }
  }

  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async getLastModification(): Promise<Date | null> {
    try {
      return await this.findLastModification(this.db.tableName);
    } catch (error: any) {
      console.log(`Failed to get last modification time: ${error.message}`);
      return null;
    }
  }

  private validate(): void {
    if (!this.name) {
      throw new Error('Feature name is required');
    }
    if (!FeatureDbStructure.validation.validateName(this.name)) {
      throw new Error('Invalid feature name format');
    }

    if (!this.code) {
      throw new Error('Feature code is required');
    }

    if (!FeatureDbStructure.validation.validateCode(this.code)) {
      throw new Error('Invalid feature code format');
    }

    if (this.description && !FeatureDbStructure.validation.validateDescription(this.description)) {
      throw new Error('Description too long (max 255 characters)');
    }

    // Nettoie les données avant insertion et mise à jour
    FeatureDbStructure.validation.cleanData(this);
  }
}
