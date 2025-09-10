import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model';

export default class PaymentMethodModel extends BaseModel {
  public readonly db = {
    tableName: tableName.PAYMENT_METHOD,
    id: 'id',
    guid: 'guid',
    code: 'code',
    name: 'name',
    method_type: 'method_type',
    supported_currencies: 'supported_currencies',
    active: 'active',
    processing_fee_rate: 'processing_fee_rate',
    min_amount_usd: 'min_amount_usd',
    max_amount_usd: 'max_amount_usd',
  } as const;
  protected id?: number;
  protected guid?: number;
  protected code?: string;
  protected name?: string;
  protected method_type?: string;
  protected supported_currencies?: Array<string> | string;
  protected active?: boolean;
  protected processing_fee_rate?: number;
  protected min_amount_usd?: number;
  protected max_amount_usd?: number;

  protected constructor() {
    super();
  }

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }
  protected async findByCode(code: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.code]: code });
  }
  protected async findByGuid(guid: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }
  protected async listAll(conditions: Record<string, any> = {}, paginationOptions: { offset?: number; limit?: number } = {}): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }
  protected async listAllByActiveStatus(active: boolean, paginationOptions: { offset?: number; limit?: number } = {}): Promise<any[]> {
    return await this.listAll({[this.db.active] : active}, paginationOptions);
  }
}