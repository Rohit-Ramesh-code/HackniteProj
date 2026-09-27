import numpy as np
from typing import Dict, Any, List
from app.schemas.colmap_schema import ColmapTransforms, ColmapSummaryResponse

class ColmapParserService:
    @staticmethod
    def parse_transforms(data: Dict[str, Any]) -> ColmapSummaryResponse:
        frames = data.get("frames", [])
        camera_positions = []

        for frame in frames:
            mat = np.array(frame.get("transform_matrix", np.eye(4)))
            # The translation component of 4x4 transform is matrix column 3 (x, y, z)
            pos = mat[:3, 3].tolist()
            camera_positions.append(pos)

        if camera_positions:
            pos_arr = np.array(camera_positions)
            min_bounds = pos_arr.min(axis=0).tolist()
            max_bounds = pos_arr.max(axis=0).tolist()
        else:
            min_bounds = [-5.0, 0.0, -5.0]
            max_bounds = [5.0, 3.0, 5.0]

        intrinsics = {
            "fl_x": data.get("fl_x"),
            "fl_y": data.get("fl_y"),
            "cx": data.get("cx"),
            "cy": data.get("cy"),
            "w": data.get("w"),
            "h": data.get("h"),
            "camera_angle_x": data.get("camera_angle_x")
        }

        sample_poses = [
            f.get("transform_matrix") for f in frames[:5]
        ] if frames else []

        return ColmapSummaryResponse(
            frame_count=len(frames),
            camera_intrinsics=intrinsics,
            bounding_box={
                "min": min_bounds,
                "max": max_bounds
            },
            sample_poses=sample_poses
        )

    @staticmethod
    def extract_candidates_from_transforms(data: Dict[str, Any]) -> List[Dict[str, Any]]:
        frames = data.get("frames", [])
        candidates = []
        fov = 60.0
        if "camera_angle_x" in data:
            fov = float(np.degrees(data["camera_angle_x"]))

        for idx, frame in enumerate(frames):
            mat = np.array(frame.get("transform_matrix", np.eye(4)))
            raw_pos = mat[:3, 3].tolist()
            
            # Elevation adjustment: Offset eye-level walking path upward (+1.8m up-axis) for wall/ceiling mounting
            elevated_pos = [
                round(raw_pos[0], 2),
                round(raw_pos[1] + 1.8, 2), # Wall/ceiling mount elevation
                round(raw_pos[2], 2)
            ]

            # Extract orientation angles
            rot_matrix = mat[:3, :3]
            sy = np.sqrt(rot_matrix[0, 0] ** 2 + rot_matrix[1, 0] ** 2)
            singular = sy < 1e-6

            if not singular:
                x = np.arctan2(rot_matrix[2, 1], rot_matrix[2, 2])
                y = np.arctan2(-rot_matrix[2, 0], sy)
                z = np.arctan2(rot_matrix[1, 0], rot_matrix[0, 0])
            else:
                x = np.arctan2(-rot_matrix[1, 2], rot_matrix[1, 1])
                y = np.arctan2(-rot_matrix[2, 0], sy)
                z = 0

            # Pitch downward slightly (-20 deg) to look down from wall mount
            pitch_deg = float(np.degrees(x)) - 20.0
            yaw_deg = float(np.degrees(y))
            roll_deg = float(np.degrees(z))

            candidates.append({
                "id": idx + 1,
                "name": f"Wall Mount Cam #{idx + 1}",
                "position": elevated_pos,
                "rotation": [pitch_deg, yaw_deg, roll_deg],
                "fov_degrees": fov,
                "max_range": 18.0
            })


        return candidates
