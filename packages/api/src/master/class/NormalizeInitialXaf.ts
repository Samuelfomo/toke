import NormalizeInitialXafModel from '../model/NormalizeInitialXafModel.js';

import { guid } from './payment-attempt-contract.js';

export default class NormalizeInitialXaf extends NormalizeInitialXafModel {
  preview(transaction: number) {
    return this.runStored(guid(transaction), false);
  }
  apply(transaction: number) {
    return this.runStored(guid(transaction), true);
  }
}
