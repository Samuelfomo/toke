// Compatibilite pour les appels internes ; la projection publique est dans la classe metier.
export {
  changeSeatAssignment,
  SeatAssignmentError,
} from '../database/base_model/db.seat-assignment.js';
export type { SeatRequest } from '../database/base_model/db.seat-assignment.js';
