from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class FramePose(BaseModel):
    file_path: Optional[str] = None
    sharpness: Optional[float] = None
    transform_matrix: List[List[float]] = Field(
        ..., 
        description="4x4 transformation matrix for camera pose"
    )

class ColmapTransforms(BaseModel):
    camera_angle_x: Optional[float] = None
    camera_angle_y: Optional[float] = None
    fl_x: Optional[float] = None
    fl_y: Optional[float] = None
    cx: Optional[float] = None
    cy: Optional[float] = None
    w: Optional[int] = None
    h: Optional[int] = None
    aabb_scale: Optional[int] = 1
    frames: List[FramePose]

class ColmapSummaryResponse(BaseModel):
    frame_count: int
    camera_intrinsics: Dict[str, Any]
    bounding_box: Dict[str, List[float]]
    sample_poses: List[List[List[float]]]
