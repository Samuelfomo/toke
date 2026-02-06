import AppConfigModel from '../model/AppConfigModel.js';
import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import { responseStructure as RS } from '../../utils/response.model.js';

export default class AppConfig extends AppConfigModel {
  constructor() {
    super();
  }

  //=== SETTERS SECTION ===//

  static _load(identifier: any, byKey: boolean = false): Promise<AppConfig | null> {
    return new AppConfig().load(identifier, byKey);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<AppConfig[] | null> {
    return new AppConfig().list(conditions, paginationOptions);
  }

  static _listByStatus(
    status: boolean,
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<AppConfig[] | null> {
    return new AppConfig().listByStatus(status, paginationOptions);
  }

  setKey(key: string): AppConfig {
    this.key = key.toUpperCase();
    return this;
  }

  setLink(link: string): AppConfig {
    this.link = link;
    return this;
  }

  //=== GETTERS SECTION ===//

  setActive(value: boolean): AppConfig {
    this.active = value;
    return this;
  }

  getId(): number | undefined {
    return this.id;
  }

  getKey(): string | undefined {
    return this.key;
  }

  getLink(): string | undefined {
    return this.link;
  }

  isActive(): boolean | undefined {
    return this.active;
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<AppConfig[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new AppConfig().hydrate(data));
  }

  async listByStatus(
    status: boolean,
    paginationOptions: {
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<AppConfig[] | null> {
    const dataset = await this.listAllByStatus(status, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new AppConfig().hydrate(data));
  }

  async load(identifier: any, byKey: boolean = false): Promise<AppConfig | null> {
    const data = byKey ? await this.findByKey(identifier) : await this.find(Number(identifier));
    if (!data) return null;
    return this.hydrate(data);
  }

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

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: AppConfig Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async patchStatus(): Promise<void> {
    await W.isOccur(!this.id, `${G.identifierMissing.code}: AppConfig Patch Status`);
    this.active = !this.active;
    await this.save();
  }

  isNew(): boolean {
    return this.id === undefined;
  }

  toJSON(): object {
    return {
      [RS.KEY]: this.key,
      [RS.LINK]: this.link,
      [RS.ACTIVE]: this.active,
    };
  }

  /**
   * Hydrate l'instance avec les données
   */
  private hydrate(data: any): AppConfig {
    this.id = data.id;
    this.key = data.key;
    this.link = data.link;
    this.active = data.active;
    return this;
  }
}
