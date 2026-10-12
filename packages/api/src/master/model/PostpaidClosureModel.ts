import PostpaidClosureDb, {
  type ClosureInput,
} from '../database/base_model/db.postpaid-closure.js';

export default class PostpaidClosureModel {
  constructor(protected readonly data: PostpaidClosureDb = new PostpaidClosureDb()) {}
  protected closeData(input: ClosureInput) {
    return this.data.close(input);
  }
}
