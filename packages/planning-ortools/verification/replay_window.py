"""Compare the production objective and pure feasibility on a captured window."""
import argparse
import json
import logging
from pathlib import Path
from time import perf_counter

from ortools.sat.python import cp_model

from app.schemas import PlanningSolverInput
from app.solver import OrToolsPlanner


class FirstSolution(cp_model.CpSolverSolutionCallback):
    first_seconds = None

    def on_solution_callback(self):
        if self.first_seconds is None:
            self.first_seconds = self.WallTime()


def replay(request, feasibility_only):
    planner = OrToolsPlanner(request)
    build_original = planner.build
    solve_original = planner.solver.Solve
    callback = FirstSolution()
    parameters = {}
    original_objective = None

    def build():
        nonlocal original_objective
        build_original()
        objective = planner.model.Proto().objective
        original_objective = (list(objective.vars), list(objective.coeffs), objective.offset, objective.scaling_factor)
        if feasibility_only:
            planner.model.ClearObjective()

    def solve(model):
        parameters.update(
            search_seconds=planner.solver.parameters.max_time_in_seconds,
            workers=planner.solver.parameters.num_search_workers,
        )
        return solve_original(model, callback)

    planner.build = build
    planner.solver.Solve = solve
    started = perf_counter()
    response = planner.solve()
    result = {
        "mode": "feasibility" if feasibility_only else "production_objective",
        "status": response.status,
        "first_solution_seconds": callback.first_seconds,
        "total_seconds": perf_counter() - started,
        "solver_stats": response.solverStats.model_dump() if response.solverStats else None,
        **parameters,
    }
    if response.result:
        diagnostics = response.result.diagnostics
        variables, coefficients, offset, scale = original_objective

        def value(index):
            variable = planner.model.GetIntVarFromProtoIndex(index if index >= 0 else -index - 1)
            return planner.solver.Value(variable) if index >= 0 else -planner.solver.Value(variable)

        result.update(
            coverage_score=diagnostics.coverageScore,
            fairness_score=diagnostics.fairnessScore,
            assigned=sum(entry.assigned for entry in diagnostics.coverage),
            minimum=sum(entry.minimum for entry in diagnostics.coverage),
            coverage_statuses={status: sum(entry.status == status for entry in diagnostics.coverage)
                               for status in sorted({entry.status for entry in diagnostics.coverage})},
            original_objective=scale * (offset + sum(coeff * value(index) for index, coeff in zip(variables, coefficients))),
        )
        if not feasibility_only:
            result["objective_bound"] = planner.solver.BestObjectiveBound()
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("capture", type=Path)
    args = parser.parse_args()
    logging.getLogger("uvicorn.error").setLevel(logging.CRITICAL)
    capture = json.loads(args.capture.read_text())
    request = PlanningSolverInput.model_validate(capture["payload"])
    for feasibility_only in (False, True):
        print(json.dumps(replay(request, feasibility_only)), flush=True)
