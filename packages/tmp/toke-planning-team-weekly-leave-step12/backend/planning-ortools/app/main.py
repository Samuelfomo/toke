from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.schemas import PlanningSolverInput, SolverResponse
from app.solver import solve_planning


app = FastAPI(
    title="Toké Planning OR-Tools",
    version="1.2.0",
)


@app.get("/health")
def health():
    return {
        "success": True,
        "service": "toke-planning-ortools",
        "solverVersion": "ortools-cp-sat-v1.2-team-weekly-leave",
    }


@app.post(
    "/solve",
    response_model=SolverResponse,
)
def solve(request: PlanningSolverInput):
    try:
        response = solve_planning(request)
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "PLANNING_SOLVER_INVALID_INPUT",
                "message": str(error),
            },
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "PLANNING_SOLVER_INTERNAL_ERROR",
                "message": str(error),
            },
        ) from error

    return JSONResponse(
        status_code=200,
        content=response.model_dump(mode="json"),
    )
