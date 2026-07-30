import { generateSuggestion } from '../suggestion.engine.js';

import { PlanningSolver, PlanningSolverInput } from './planning.solver.js';

export default class GreedyPlanningSolver implements PlanningSolver {
  readonly type = 'GREEDY' as const;
  readonly version = 'greedy-v2.3-pharmacy-final';

  async solve(input: PlanningSolverInput) {
    return generateSuggestion(
      input.employees,
      input.requirements,
      input.historicalAssignments,
      input.periodFrom,
      input.periodTo,
      input.config,
    );
  }
}
