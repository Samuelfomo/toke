import PostpaidCashDb, { type PostpaidCashInput } from '../database/base_model/db.postpaid-cash.js';

export default class PostpaidCashModel {
  constructor(protected readonly data: PostpaidCashDb = new PostpaidCashDb()) {}
  protected receiveData(input: PostpaidCashInput) {
    return this.data.receive(input);
  }
  protected accessData(tenant: number, license: number) {
    return this.data.access(tenant, license);
  }
}
