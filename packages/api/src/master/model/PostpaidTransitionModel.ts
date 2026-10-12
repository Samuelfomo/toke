import PostpaidTransitionDb, {
  type TransitionInput,
} from '../database/base_model/db.postpaid-transition.js';

export default class PostpaidTransitionModel {
  constructor(protected readonly data: PostpaidTransitionDb = new PostpaidTransitionDb()) {}
  protected applyData(input: TransitionInput, dryRun: boolean) {
    return this.data.apply(input, dryRun);
  }
  protected eventData(tenant: number, license: number) {
    return this.data.events(tenant, license);
  }
}
