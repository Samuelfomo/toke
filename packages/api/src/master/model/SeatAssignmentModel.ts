import SeatDb from '../database/base_model/db.seat.js';
import type { SeatRequest } from '../database/base_model/db.seat-assignment.js';

/** Operation sur les affectations existantes, sans nouvelle table. */
export default class SeatAssignmentModel {
  constructor(protected readonly data: SeatDb = new SeatDb()) {}
  protected changeData(input: SeatRequest, action: 'ASSIGN' | 'RELEASE') {
    return this.data.change(input, action);
  }
}
