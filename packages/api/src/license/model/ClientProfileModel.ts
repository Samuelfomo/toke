import BaseModel from '../database/db.base.js';
import { ClientProfileDbStructure } from '../database/data/client.profile.db';
import { tableName } from '../../utils/response.model';

export default class ClientProfileModel extends BaseModel {
  public readonly db = {
    tableName: tableName.PROFILE,
    id: 'id',
    name: 'name',
    root: 'root',
    description: 'description',
  } as const;
  protected id?: number;
  protected name?: string;
  protected root: boolean = false;
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
  protected async findByName(name: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.name]: name });
  }

  protected async existAdmin(): Promise<boolean> {
    const admin = await this.findOne(this.db.tableName, { [this.db.root]: true });
    return admin !== null && admin !== undefined;
  }

  /**
   * Liste tous les enregistrements selon les conditions
   */
  protected async listAll(conditions: Record<string, any> = {}): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions);
  }

  /**
   * Créer un profil
   */
  protected async create(): Promise<void> {
    if (!this.root) {
      this.root = false;
    }
    await this.validate();

    const existName = await this.findByName(this.name!);
    if (existName) {
      throw new Error(`profil name '${this.name}' already exists`);
    }
    // const existRoot = await this.findOne(this.db.tableName, { [this.db.root]: true });
    const existRoot = await this.existAdmin();
    if (existRoot) {
      throw new Error(`profil admin root already exists`);
    }
    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.name]: this.name,
      [this.db.root]: this.root,
      [this.db.description]: this.description,
    });

    console.log(`🌍 Profil créé - Name: ${this.name}`);
    if (!lastID) {
      throw new Error(`profil admin root already exists`);
    }

    this.id = lastID.id;
    console.log('✅ ClientProfil créé avec ID:', this.id);
  }

  /**
   * Mettre à jour un profil
   */
  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error('Profile ID is required for update');
    }

    const updateData: Record<string, any> = {};
    if (this.name !== undefined) updateData[this.db.name] = this.name;
    if (this.description !== undefined) updateData[this.db.description] = this.description;
    if (this.root !== undefined) updateData[this.db.root] = this.root;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update profile');
    }
  }

  /**
   * Supprime un profil
   */
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  private async validate(): Promise<void> {
    // Valider le nom
    if (!this.name || !ClientProfileDbStructure.validation.validateName(this.name)) {
      throw new Error('Profile name must be between 2 and 128 characters');
    }

    //valider la description
    if (
      this.description &&
      !ClientProfileDbStructure.validation.validateDescription(this.description)
    ) {
      throw new Error('Profile description must be between 10 and 500 characters');
    }

    // Valider le nom
    if (typeof this.root !== 'boolean') {
      throw new Error('Profile root must be boolean');
    }

    // Nettoie les données avant mise à jour
    ClientProfileDbStructure.validation.cleanData(this);
  }
}
