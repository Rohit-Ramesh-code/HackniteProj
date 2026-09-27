from fastapi import APIRouter
from typing import Dict, Any, List
from app.schemas.optimization_schema import CandidateCamera
from app.services.grid_generator import generate_candidate_camera_grid

router = APIRouter(prefix="/api/colmap", tags=["Camera Candidates & Poses"])

@router.post("/extract-candidates", response_model=List[CandidateCamera])
async def extract_camera_candidates(data: Dict[str, Any] = None):
    """
    Superseded: Replaced COLMAP transforms.json parsing with programmatic 3D ceiling grid generator.
    Returns 2D grid of candidate camera coordinates spaced 1m apart at Y=2.5m ceiling height,
    angled downwards at -30 degrees.
    """
    return generate_candidate_camera_grid()

@router.get("/candidates", response_model=List[CandidateCamera])
async def get_camera_candidates():
    """
    Programmatically generate candidate camera poses across 10m x 10m ceiling grid.
    """
    return generate_candidate_camera_grid()
