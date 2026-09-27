import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class MeshViewer {
  constructor(scene, onModelLoaded = null, onModelError = null) {
    this.scene = scene;
    this.onModelLoaded = onModelLoaded;
    this.onModelError = onModelError;
    this.loader = new GLTFLoader();
    this.meshGroup = new THREE.Group();
    this.meshGroup.name = "PolycamRoomMeshGroup";
    this.scene.add(this.meshGroup);

    this.isLoaded = false;
    this.modelInfo = null;

    // Inject Scene Lighting required for Polycam PBR meshes
    this.initLighting();

    // Automatically load /room.glb from public directory
    this.loadGLTF('/room.glb');
  }

  initLighting() {
    // Ambient Light: Broad ambient fill so interior shadows aren't pitch black
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.ambientLight.name = "PolycamAmbientLight";
    this.scene.add(this.ambientLight);

    // Primary Directional Light: Key light for realistic specular & depth
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.6);
    this.directionalLight.name = "PolycamDirectionalLight";
    this.directionalLight.position.set(10, 20, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.bias = -0.0005;
    this.scene.add(this.directionalLight);

    // Secondary Fill Light: Soft cyan fill from opposite angle
    this.fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    this.fillLight.name = "PolycamFillLight";
    this.fillLight.position.set(-10, 15, -10);
    this.scene.add(this.fillLight);

    // Hemisphere Light: Ground bounce illumination
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.5);
    this.hemiLight.name = "PolycamHemisphereLight";
    this.scene.add(this.hemiLight);
  }

  async loadGLTF(urlOrFile = '/room.glb') {
    let sourceUrl = urlOrFile;
    if (urlOrFile instanceof File) {
      sourceUrl = URL.createObjectURL(urlOrFile);
    }

    try {
      this.loader.load(
        sourceUrl,
        (gltf) => {
          // Clear any previous meshes in group
          while (this.meshGroup.children.length > 0) {
            const child = this.meshGroup.children[0];
            this.meshGroup.remove(child);
          }

          const model = gltf.scene || gltf.scenes[0];

          // Traverse and optimize mesh materials for Polycam photogrammetry
          let vertexCount = 0;
          let triangleCount = 0;

          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              if (child.geometry) {
                if (child.geometry.attributes.position) {
                  vertexCount += child.geometry.attributes.position.count;
                }
                if (child.geometry.index) {
                  triangleCount += child.geometry.index.count / 3;
                } else if (child.geometry.attributes.position) {
                  triangleCount += child.geometry.attributes.position.count / 3;
                }
              }

              if (child.material) {
                // Ensure double-sided rendering for mobile Polycam scans
                child.material.side = THREE.DoubleSide;
                // Preserve vibrant color texture
                if (child.material.map) {
                  child.material.map.colorSpace = THREE.SRGBColorSpace;
                }
                child.material.needsUpdate = true;
              }
            }
          });

          // Calculate bounding box and center model
          const bbox = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const center = new THREE.Vector3();
          bbox.getCenter(center);

          // Center on X and Z, align bottom to Y=0
          model.position.x = -center.x;
          model.position.z = -center.z;
          model.position.y = -bbox.min.y;

          this.meshGroup.add(model);
          this.isLoaded = true;

          this.modelInfo = {
            name: typeof urlOrFile === 'string' ? urlOrFile.split('/').pop() : urlOrFile.name,
            dimensions: [
              parseFloat(size.x.toFixed(2)),
              parseFloat(size.y.toFixed(2)),
              parseFloat(size.z.toFixed(2))
            ],
            vertices: vertexCount,
            triangles: Math.round(triangleCount)
          };

          if (this.onModelLoaded) {
            this.onModelLoaded(this.modelInfo);
          }
        },
        undefined,
        (err) => {
          console.warn("Could not load GLTF mesh from", sourceUrl, err);
          if (this.onModelError) {
            this.onModelError(err);
          }
        }
      );
    } catch (e) {
      console.error("GLTF load exception:", e);
      if (this.onModelError) this.onModelError(e);
    }
  }

  update() {
    // Hook for any per-frame shader or animation updates
  }

  dispose() {
    if (this.ambientLight) this.scene.remove(this.ambientLight);
    if (this.directionalLight) this.scene.remove(this.directionalLight);
    if (this.fillLight) this.scene.remove(this.fillLight);
    if (this.hemiLight) this.scene.remove(this.hemiLight);
    if (this.meshGroup) this.scene.remove(this.meshGroup);
  }
}
