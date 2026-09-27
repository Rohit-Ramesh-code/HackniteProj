from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class CandidateCamera(BaseModel):
    id: int
    name: Optional[str] = None
    position: List[float] = Field(..., min_items=3, max_items=3, description="[x, y, z]")
    rotation: List[float] = Field(default=[0, 0, 0], description="Euler angles [rx, ry, rz] in degrees")
    fov_degrees: float = Field(default=60.0, description="Field of view in degrees")
    max_range: float = Field(default=15.0, description="Effective vision range in meters")

class OptimizationRequest(BaseModel):
    candidates: Optional[List[CandidateCamera]] = None
    voxel_resolution: float = Field(default=1.0, description="Grid voxel resolution step size")
    desired_coverage_pct: float = Field(default=95.0, description="Target percentage of area to cover (0-100)")
    max_cameras_allowed: Optional[int] = Field(default=None, description="Upper bound budget for camera deployment")
    bounds_min: Optional[List[float]] = Field(default=[-10.0, 0.0, -10.0])
    bounds_max: Optional[List[float]] = Field(default=[10.0, 5.0, 10.0])

class SelectedCamera(BaseModel):
    id: int
    position: List[float]
    rotation: List[float]
    fov_degrees: float
    max_range: float
    new_voxels_covered: int

class OptimizationResponse(BaseModel):
    total_voxels: int
    total_covered_voxels: int
    coverage_percentage: float
    selected_cameras: List[SelectedCamera]
    uncovered_voxels_count: int
    execution_time_ms: float
