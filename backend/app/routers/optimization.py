from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.schemas.optimization_schema import (
    OptimizationRequest,
    OptimizationResponse,
    CandidateCamera
)
from app.services.set_cover import SetCoverOptimizerService
from app.services.grid_generator import generate_candidate_camera_grid

router = APIRouter(prefix="/api/optimization", tags=["Set Cover Optimization"])

@router.get("/candidate-grid", response_model=List[CandidateCamera])
async def get_candidate_camera_grid(
    step: float = Query(1.0, description="Grid spacing in meters (default 1.0m)"),
    ceiling_height: float = Query(2.5, description="Camera ceiling height in meters (default 2.5m)"),
    pitch_deg: float = Query(-30.0, description="Camera downward pitch angle (default -30 degrees)"),
    min_x: float = Query(-5.0, description="Room min X coordinate"),
    max_x: float = Query(5.0, description="Room max X coordinate"),
    min_z: float = Query(-5.0, description="Room min Z coordinate"),
    max_z: float = Query(5.0, description="Room max Z coordinate")
):
    """
    Programmatically generate candidate camera poses across a 2D grid (X and Z axes)
    spaced 1 meter apart, mapped to the bounding box of a 10m x 10m room.
    Height is fixed at 2.5m (near the ceiling), angled downwards at -30 degrees.
    """
    try:
        return generate_candidate_camera_grid(
            bounds_min=[min_x, 0.0, min_z],
            bounds_max=[max_x, ceiling_height, max_z],
            step=step,
            ceiling_height=ceiling_height,
            pitch_deg=pitch_deg
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate candidate grid: {str(e)}")

@router.post("/set-cover", response_model=OptimizationResponse)
async def run_greedy_set_cover(request: OptimizationRequest):
    """
    Execute 3D Greedy Set Cover algorithm to compute the 6 optimal camera locations
    from the candidate 3D ceiling grid.
    """
    try:
        # If candidates are not provided, programmatically generate the 10m x 10m ceiling grid
        if not request.candidates:
            request.candidates = generate_candidate_camera_grid(
                bounds_min=request.bounds_min or [-5.0, 0.0, -5.0],
                bounds_max=request.bounds_max or [5.0, 2.5, 5.0],
                step=1.0,
                ceiling_height=2.5,
                pitch_deg=-30.0
            )

        # Enforce budget of 6 optimal camera deployments if not specified
        if request.max_cameras_allowed is None:
            request.max_cameras_allowed = 6

        return SetCoverOptimizerService.optimize_placement(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization execution error: {str(e)}")
