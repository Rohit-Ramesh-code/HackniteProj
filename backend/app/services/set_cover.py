import time
import numpy as np
from typing import List, Dict, Set, Tuple
from app.schemas.optimization_schema import (
    OptimizationRequest,
    OptimizationResponse,
    SelectedCamera,
    CandidateCamera
)

from app.services.grid_generator import generate_candidate_camera_grid

class SetCoverOptimizerService:
    @staticmethod
    def _euler_to_forward_vector(rx_deg: float, ry_deg: float, rz_deg: float) -> np.ndarray:
        rx, ry, rz = np.radians([rx_deg, ry_deg, rz_deg])
        
        # Rotation matrices
        Rx = np.array([
            [1, 0, 0],
            [0, np.cos(rx), -np.sin(rx)],
            [0, np.sin(rx), np.cos(rx)]
        ])
        Ry = np.array([
            [np.cos(ry), 0, np.sin(ry)],
            [0, 1, 0],
            [-np.sin(ry), 0, np.cos(ry)]
        ])
        Rz = np.array([
            [np.cos(rz), -np.sin(rz), 0],
            [np.sin(rz), np.cos(rz), 0],
            [0, 0, 1]
        ])
        
        R = Rz @ Ry @ Rx
        # Default camera looking along -Z in camera space or +Z
        forward = R @ np.array([0, 0, -1])
        norm = np.linalg.norm(forward)
        return forward / norm if norm > 0 else np.array([0, 0, -1])

    @classmethod
    def _generate_voxel_grid(cls, bounds_min: List[float], bounds_max: List[float], step: float) -> np.ndarray:
        xs = np.arange(bounds_min[0], bounds_max[0] + step, step)
        ys = np.arange(bounds_min[1], bounds_max[1] + step, step)
        zs = np.arange(bounds_min[2], bounds_max[2] + step, step)
        
        grid = np.vstack(np.meshgrid(xs, ys, zs)).reshape(3, -1).T
        return grid

    @classmethod
    def _get_covered_voxel_indices(
        cls, 
        camera: CandidateCamera, 
        voxels: np.ndarray
    ) -> Set[int]:
        cam_pos = np.array(camera.position)
        forward = cls._euler_to_forward_vector(camera.rotation[0], camera.rotation[1], camera.rotation[2])
        max_dist = camera.max_range
        cos_half_fov = np.cos(np.radians(camera.fov_degrees / 2.0))

        # Vector from camera to each voxel
        vecs = voxels - cam_pos
        dists = np.linalg.norm(vecs, axis=1)

        # Distance filter
        dist_mask = (dists > 0.1) & (dists <= max_dist)
        valid_indices = np.where(dist_mask)[0]

        if len(valid_indices) == 0:
            return set()

        valid_vecs = vecs[valid_indices]
        valid_dists = dists[valid_indices]

        # Normalized direction vectors
        unit_vecs = valid_vecs / valid_dists[:, np.newaxis]
        dot_products = np.dot(unit_vecs, forward)

        # FOV cone mask
        fov_mask = dot_products >= cos_half_fov

        covered = valid_indices[fov_mask]
        return set(covered.tolist())

    @classmethod
    def optimize_placement(cls, req: OptimizationRequest) -> OptimizationResponse:
        start_time = time.time()

        bounds_min = req.bounds_min or [-5.0, 0.0, -5.0]
        bounds_max = req.bounds_max or [5.0, 2.5, 5.0]
        res = max(0.2, req.voxel_resolution)

        # 1. Generate 3D spatial target voxels
        voxels = cls._generate_voxel_grid(bounds_min, bounds_max, res)
        total_voxels = len(voxels)

        # 2. Build programmatic candidate camera grid if none provided (1m spacing, Y=2.5m ceiling, -30 deg pitch)
        candidates = req.candidates
        if not candidates:
            candidates = generate_candidate_camera_grid(
                bounds_min=bounds_min,
                bounds_max=bounds_max,
                step=1.0,
                ceiling_height=2.5,
                pitch_deg=-30.0
            )

        # 3. Calculate coverage set for each candidate
        camera_coverages: Dict[int, Set[int]] = {}
        candidate_map: Dict[int, CandidateCamera] = {}

        for cam in candidates:
            candidate_map[cam.id] = cam
            camera_coverages[cam.id] = cls._get_covered_voxel_indices(cam, voxels)

        # 4. Greedy Set Cover loop
        uncovered_voxels = set(range(total_voxels))
        selected_cameras: List[SelectedCamera] = []

        target_count = int((req.desired_coverage_pct / 100.0) * total_voxels)
        max_cams = req.max_cameras_allowed if req.max_cameras_allowed is not None else 6

        remaining_candidates = set(candidate_map.keys())

        while len(uncovered_voxels) > (total_voxels - target_count) and len(selected_cameras) < max_cams and remaining_candidates:
            best_cam_id = None
            best_new_coverage: Set[int] = set()

            for cam_id in remaining_candidates:
                cov = camera_coverages[cam_id]
                new_cov = cov.intersection(uncovered_voxels)
                if len(new_cov) > len(best_new_coverage):
                    best_cam_id = cam_id
                    best_new_coverage = new_cov

            # Break if no remaining camera can cover any new voxel
            if best_cam_id is None or len(best_new_coverage) == 0:
                break

            cam_obj = candidate_map[best_cam_id]
            selected_cameras.append(SelectedCamera(
                id=cam_obj.id,
                position=cam_obj.position,
                rotation=cam_obj.rotation,
                fov_degrees=cam_obj.fov_degrees,
                max_range=cam_obj.max_range,
                new_voxels_covered=len(best_new_coverage)
            ))

            uncovered_voxels.difference_update(best_new_coverage)
            remaining_candidates.remove(best_cam_id)

        total_covered = total_voxels - len(uncovered_voxels)
        pct = (total_covered / total_voxels * 100.0) if total_voxels > 0 else 0.0
        elapsed_ms = (time.time() - start_time) * 1000.0

        return OptimizationResponse(
            total_voxels=total_voxels,
            total_covered_voxels=total_covered,
            coverage_percentage=round(pct, 2),
            selected_cameras=selected_cameras,
            uncovered_voxels_count=len(uncovered_voxels),
            execution_time_ms=round(elapsed_ms, 2)
        )
