from __future__ import annotations

import logging
import time

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from app.schemas import PlanningSolverInput, SolverResponse
from app.solver import solve_planning


SOLVER_VERSION = "ortools-cp-sat-v1.5-arbitrary-horizon"
logger = logging.getLogger("uvicorn.error")

app = FastAPI(
    title="Toké Planning OR-Tools",
    version="1.5.0",
)


@app.get("/health")
def health():
    return {
        "success": True,
        "service": "toke-planning-ortools",
        "solverVersion": SOLVER_VERSION,
    }


@app.post(
    "/solve",
    response_model=SolverResponse,
)
def solve(request: PlanningSolverInput):
    started = time.perf_counter()
    requested_from = request.requestedPeriodFrom or request.periodFrom
    requested_to = request.requestedPeriodTo or request.periodTo

    logger.info(
        "planning.solve.start requested=%s..%s solve=%s..%s employees=%d requirements=%d history=%d",
        requested_from,
        requested_to,
        request.periodFrom,
        request.periodTo,
        len(request.employees),
        len(request.requirements),
        len(request.historicalAssignments),
    )

    try:
        response = solve_planning(request)
    except ValueError as error:
        logger.warning(
            "planning.solve.invalid requested=%s..%s solve=%s..%s message=%s",
            requested_from,
            requested_to,
            request.periodFrom,
            request.periodTo,
            str(error),
        )
        raise HTTPException(
            status_code=422,
            detail={
                "code": "PLANNING_SOLVER_INVALID_INPUT",
                "message": str(error),
                "requestedPeriod": {
                    "from": requested_from,
                    "to": requested_to,
                },
                "solvePeriod": {
                    "from": request.periodFrom,
                    "to": request.periodTo,
                },
            },
        ) from error
    except Exception as error:
        logger.exception(
            "planning.solve.error requested=%s..%s solve=%s..%s",
            requested_from,
            requested_to,
            request.periodFrom,
            request.periodTo,
        )
        raise HTTPException(
            status_code=500,
            detail={
                "code": "PLANNING_SOLVER_INTERNAL_ERROR",
                "message": str(error),
            },
        ) from error

    elapsed_ms = round((time.perf_counter() - started) * 1000)
    stats = response.solverStats
    logger.info(
        "planning.solve.done status=%s requested=%s..%s solve=%s..%s durationMs=%d conflicts=%s branches=%s booleans=%s",
        response.status,
        requested_from,
        requested_to,
        request.periodFrom,
        request.periodTo,
        elapsed_ms,
        stats.numConflicts if stats else None,
        stats.numBranches if stats else None,
        stats.numBooleans if stats else None,
    )

    return JSONResponse(
        status_code=200,
        content=response.model_dump(mode="json"),
    )
