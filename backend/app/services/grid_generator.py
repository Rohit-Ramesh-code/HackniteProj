import numpy as np
from typing import List, Optional
from app.schemas.optimization_schema import CandidateCamera

def generate_candidate_camera_grid(
    bounds_min: Optional[List[float]] = None,
    bounds_max: Optional[List[float]] = None,
    step: float = 1.0,
    ceiling_height: float = 2.5,
    pitch_deg: float = -30.0,
    fov_degrees: float = 70.0,
    max_range: float = 12.0
) -> List[CandidateCamera]:
    """
    Programmatically generate candidate camera poses across a 2D grid (X and Z axes)
    spaced 1 meter apart, mapped to the bounding box of a typical 10m x 10m room.
    
    Fixed Y-axis (height): 2.5 meters (near the ceiling).
    Pitch: Angled downwards at -30 degrees.
    Yaw: Angled towards the center of the room to observe interior volume.
    """
    b_min = bounds_min if bounds_min is not None else [-5.0, 0.0, -5.0]
    b_max = bounds_max if bounds_max is not None else [5.0, 2.5, 5.0]

    min_x, max_x = float(b_min[0]), float(b_max[0])
    min_z, max_z = float(b_min[2]), float(b_max[2])

    xs = np.arange(min_x, max_x + 0.001, step)
    zs = np.arange(min_z, max_z + 0.001, step)

    center_x = (min_x + max_x) / 2.0
    center_z = (min_z + max_z) / 2.0

    candidates: List[CandidateCamera] = []
    cam_id = 1

    for x in xs:
        for z in zs:
            # Angle inward toward room center
            dx = center_x - x
            dz = center_z - z

            if abs(dx) < 1e-4 and abs(dz) < 1e-4:
                yaw_deg = 0.0
            else:
                yaw_deg = float(np.degrees(np.arctan2(dx, -dz)))

            candidates.append(
                CandidateCamera(
                    id=cam_id,
                    name=f"Ceiling Cam #{cam_id} ({x:.1f}m, {ceiling_height:.1f}m, {z:.1f}m)",
                    position=[round(float(x), 2), float(ceiling_height), round(float(z), 2)],
                    rotation=[float(pitch_deg), round(float(yaw_deg), 1), 0.0],
                    fov_degrees=float(fov_degrees),
                    max_range=float(max_range)
                )
            )
            cam_id += 1

    return candidates
