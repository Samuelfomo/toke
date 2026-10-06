import type { Sequelize } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';

import { changeSeatAssignment, SeatRequest } from './db.seat-assignment.js';

export default class SeatDb {
  constructor(private readonly connection?: Sequelize) {}
  change(input: SeatRequest, action: 'ASSIGN' | 'RELEASE') {
    const db = this.connection ?? TableInitializer.getModel('xa_global_license').sequelize;
    if (!db) throw new Error('Master database connection unavailable');
    return changeSeatAssignment(db, input, action);
  }
}
