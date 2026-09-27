from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class LightingPreset(str, Enum):
    DAYLIGHT = "daylight"
    DUSK = "dusk"
    NIGHT = "night"
    OVERCAST = "overcast"
    INTERIOR_FLUORESCENT = "interior_fluorescent"

class ScenarioPreset(str, Enum):
    NORMAL_TRAFFIC = "normal_traffic"
    LOITERING = "loitering"
    THEFT = "theft"
    DISTURBANCE = "disturbance"
    PERIMETER_BREACH = "perimeter_breach"

class Waypoint(BaseModel):
    t: float = Field(..., description="Timestamp in seconds from start of scene")
    position: List[float] = Field(..., min_items=3, max_items=3, description="3D World position [x, y, z] in meters")

class ActorConfig(BaseModel):
    description: str = Field(default="a person in dark hoodie and jeans", description="Visual description of actor")
    scenario: Optional[str] = Field(default="walking casually through the area", description="Specific scenario action")
    scenario_preset: Optional[ScenarioPreset] = Field(default=ScenarioPreset.NORMAL_TRAFFIC)

class SyntheticCameraConfig(BaseModel):
    id: int | str = Field(..., description="Camera ID")
    name: Optional[str] = Field(default=None, description="Human readable name (e.g. Lobby North)")
    position: List[float] = Field(..., min_items=3, max_items=3, description="3D World position [x, y, z]")
    rotation: List[float] = Field(default=[0.0, 0.0, 0.0], min_items=3, max_items=3, description="Euler angles [rx, ry, rz] in degrees")
    fov_degrees: float = Field(default=60.0, description="Field of View in degrees")
    max_range: float = Field(default=15.0, description="Effective detection range in meters")
    base_image: Optional[str] = Field(default=None, description="Optional base64 JPEG/PNG conditioning image")
    scene_desc: Optional[str] = Field(default=None, description="Static description of scene (e.g. corporate office hallway)")

class PromptPreviewRequest(BaseModel):
    cameras: List[SyntheticCameraConfig]
    actor: ActorConfig
    waypoints: List[Waypoint]
    duration: float = Field(default=5.0, description="Total clip duration in seconds")
    lighting: LightingPreset = Field(default=LightingPreset.DAYLIGHT)
    evaluation_time: Optional[float] = Field(default=None, description="Time t in seconds to evaluate visibility (defaults to midpoint)")

class VisibilityMetrics(BaseModel):
    visible: bool
    distance_meters: float
    angle_offset_deg: float
    frame_x: float = Field(..., description="-1.0 (far left) to +1.0 (far right)")
    frame_y: float = Field(..., description="-1.0 (bottom) to +1.0 (top)")
    depth_category: str = Field(..., description="foreground / mid-range / background")
    horizontal_category: str = Field(..., description="left side / center / right side")
    relative_motion: str = Field(..., description="approaching / moving away / crossing")

class CameraPromptResult(BaseModel):
    camera_id: int | str
    camera_name: Optional[str]
    prompt: str
    visible: bool
    visibility_metrics: Optional[VisibilityMetrics] = None

class PromptPreviewResponse(BaseModel):
    prompts: List[CameraPromptResult]
    lighting: str
    scenario: str
    evaluated_at_t: float

class GenerationJobRequest(BaseModel):
    cameras: List[SyntheticCameraConfig]
    actor: ActorConfig
    waypoints: List[Waypoint]
    duration: float = Field(default=5.0, description="Total clip duration in seconds")
    lighting: LightingPreset = Field(default=LightingPreset.DAYLIGHT)
    num_frames: int = Field(default=17, description="Number of video frames (e.g. 17 or 81)")
    fps: int = Field(default=16, description="Video framerate")
    steps: int = Field(default=20, description="Inference denoising steps")
    guidance_scale: float = Field(default=5.0, description="Classifier-free guidance scale")
    width: int = Field(default=832, description="Frame width")
    height: int = Field(default=480, description="Frame height")
    seed: int = Field(default=-1, description="Random seed (-1 for random)")
    use_mock: bool = Field(default=True, description="Use fast mock generator (Phase 1)")

class CameraVideoOutput(BaseModel):
    camera_id: int | str
    camera_name: Optional[str]
    prompt: str
    video_url: str
    thumbnail_url: Optional[str] = None
    frames_count: int
    fps: int
    duration_seconds: float
    visible: bool

class GenerationJobResponse(BaseModel):
    job_id: str
    status: str = Field(..., description="pending | running | completed | failed")
    progress_percentage: float = 0.0
    outputs: List[CameraVideoOutput] = []
    error: Optional[str] = None
    created_at: float
    completed_at: Optional[float] = None
