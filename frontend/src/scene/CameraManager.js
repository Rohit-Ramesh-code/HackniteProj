import * as THREE from 'three';

export class CameraManager {
  constructor(scene) {
    this.scene = scene;
    this.cameraGroup = new THREE.Group();
    this.scene.add(this.cameraGroup);
    this.cameraMeshes = [];
  }

  updateCameras(candidateCameras, selectedCameraIds = []) {
    // Clear existing
    while (this.cameraGroup.children.length > 0) {
      const obj = this.cameraGroup.children[0];
      this.cameraGroup.remove(obj);
    }
    this.cameraMeshes = [];

    const selectedSet = new Set(selectedCameraIds);

    candidateCameras.forEach((cam) => {
      const isSelected = selectedSet.has(cam.id);
      
      const camObj = new THREE.Group();
      camObj.position.set(cam.position[0], cam.position[1], cam.position[2]);
      camObj.rotation.set(
        THREE.MathUtils.degToRad(cam.rotation[0]),
        THREE.MathUtils.degToRad(cam.rotation[1]),
        THREE.MathUtils.degToRad(cam.rotation[2])
      );

      // Camera body mesh - Sleek compact camera indicator
      const scaleFactor = isSelected ? 1.0 : 0.45;
      const bodyGeo = new THREE.BoxGeometry(0.3 * scaleFactor, 0.3 * scaleFactor, 0.5 * scaleFactor);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0x00ff66 : 0x334155,
        metalness: 0.8,
        roughness: 0.2,
        emissive: isSelected ? 0x00ff66 : 0x1e293b,
        emissiveIntensity: isSelected ? 0.6 : 0.2
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      camObj.add(bodyMesh);

      // Lens cone
      const lensGeo = new THREE.ConeGeometry(0.15 * scaleFactor, 0.25 * scaleFactor, 10);
      lensGeo.rotateX(-Math.PI / 2);
      const lensMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x00ffcc : 0x475569,
        wireframe: true
      });
      const lensMesh = new THREE.Mesh(lensGeo, lensMat);
      lensMesh.position.set(0, 0, -0.3 * scaleFactor);
      camObj.add(lensMesh);

      // Truncated Camera Frustum Pyramid (Strictly truncated at 3.0 meters to eliminate grid clutter)
      if (isSelected) {
        const fovRad = THREE.MathUtils.degToRad(cam.fov_degrees || 65);
        const height = 3.0; // Strictly truncated at 3.0 meters far plane
        const radius = height * Math.tan(fovRad / 2.0);

        const frustumGeo = new THREE.ConeGeometry(radius, height, 4, 1, true);
        frustumGeo.rotateX(-Math.PI / 2);
        frustumGeo.translate(0, 0, -height / 2.0);

        const frustumMat = new THREE.MeshBasicMaterial({
          color: 0x00ff66,
          wireframe: true,
          transparent: true,
          opacity: 0.5
        });
        const frustumMesh = new THREE.Mesh(frustumGeo, frustumMat);
        camObj.add(frustumMesh);
      }

      this.cameraGroup.add(camObj);
      this.cameraMeshes.push({ id: cam.id, object: camObj, isSelected });
    });
  }
}
