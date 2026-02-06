import W from '../../tools/watcher.js';
import G from '../../tools/glossary.js';
import SponsorModel from '../model/SponsorModel.js';
import { InvitationStatus } from '../database/data/sponsor.db';
import { responseStructure as RS } from '../../utils/response.model.js';

export default class Sponsor extends SponsorModel {
  constructor() {
    super();
  }

  // === GETTERS FLUENT ===

  static _load(
    identifier: any,
    byGuid: boolean = false,
    byPhone: boolean = false,
  ): Promise<Sponsor | null> {
    return new Sponsor().load(identifier, byGuid, byPhone);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Sponsor[] | null> {
    return new Sponsor().list(conditions, paginationOptions);
  }

  static _listByStatus(
    status: InvitationStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Sponsor[] | null> {
    return new Sponsor().listByStatus(status, paginationOptions);
  }

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getPhoneNumber(): string | undefined {
    return this.phone_number;
  }

  getCountry(): string | undefined {
    return this.country;
  }

  getStatus(): InvitationStatus | undefined | string {
    return this.status;
  }

  getMetadata(): object | undefined {
    return this.metadata;
  }

  // === SETTERS ===

  setPhoneNumber(phone: string): Sponsor {
    this.phone_number = phone;
    return this;
  }

  setCountry(country: string): Sponsor {
    this.country = country;
    return this;
  }

  setStatus(status: InvitationStatus): Sponsor {
    this.status = status;
    return this;
  }

  setMetadata(metadata: object): Sponsor {
    this.metadata = metadata;
    return this;
  }

  async save(): Promise<void> {
    try {
      this.isNew() ? await this.create() : await this.update();
    } catch (error: any) {
      throw new Error(error);
    }
  }

  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      await W.isOccur(!this.id, `${G.identifierMissing.code}: Sponsor Delete`);
      return await this.trash(this.id);
    }
    return false;
  }

  async load(
    identifier: any,
    byGuid: boolean = false,
    byPhone: boolean = false,
  ): Promise<Sponsor | null> {
    const data = byGuid
      ? await this.findByGuid(identifier)
      : byPhone
        ? await this.findByPhoneNumber(identifier)
        : await this.find(Number(identifier));
    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Sponsor[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new Sponsor().hydrate(data));
  }

  async listByStatus(
    status: InvitationStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<Sponsor[] | null> {
    const dataset = await this.listAllByStatus(status, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new Sponsor().hydrate(data));
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
      [RS.GUID]: this.guid,
      [RS.PHONE_NUMBER]: this.phone_number,
      [RS.COUNTRY]: this.country,
      [RS.STATUS]: this.status,
      [RS.METADATA]: this.metadata,
    };
  }

  private hydrate(data: any): Sponsor {
    this.id = data.id;
    this.guid = data.guid;
    this.phone_number = data.phone_number;
    this.country = data.country;
    this.status = data.status;
    this.metadata = data.metadata;
    return this;
  }
}
