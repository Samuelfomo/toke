import AppConfigModel from '../model/AppConfigModel.js';

export default class AppConfig extends AppConfigModel {
  constructor() {
    super();
  }

  //=== SETTERS SECTION ===//

  setKey(key: string): AppConfig {
    this.key = key;
    return this;
  }

  setLink(link: string): AppConfig {
    this.link = link;
    return this;
  }

  setActive(value: boolean): AppConfig {
    this.active = value;
    return this;
  }

  //=== GETTERS SECTION ===//

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

  async save(): Promise<void> {}
 
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
