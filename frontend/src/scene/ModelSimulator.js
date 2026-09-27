import * as THREE from 'three';

export class ModelSimulator {
  constructor(scene) {
    this.scene = scene;
    this.waypoints = [
      new THREE.Vector3(-8, 0.5, -8),
      new THREE.Vector3(-4, 0.5, -2),
      new THREE.Vector3(0, 0.5, 3),
      new THREE.Vector3(5, 0.5, 0),
      new THREE.Vector3(8, 0.5, -6),
      new THREE.Vector3(2, 0.5, -8),
      new THREE.Vector3(-8, 0.5, -8)
    ];

    this.currentWaypointIndex = 0;
    this.speed = 3.5;
    this.isPlaying = false;
    this.progress = 0;
    this.mode = 'INTRUDER'; // 'INTRUDER', 'EMPTY_ROOM', 'NORMAL_STAFF'

    // Create 3D Entity Mesh
    this.entityGroup = new THREE.Group();
    
    // Core Sphere Avatar scaled for realistic indoor rooms
    const sphereGeo = new THREE.SphereGeometry(0.2, 16, 16);
    this.sphereMat = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      emissive: 0xff0055,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });
    this.entityMesh = new THREE.Mesh(sphereGeo, this.sphereMat);
    this.entityGroup.add(this.entityMesh);

    // Radar Ring
    const ringGeo = new THREE.RingGeometry(0.25, 0.35, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    this.ringMesh = new THREE.Mesh(ringGeo, this.ringMat);
    this.entityGroup.add(this.ringMesh);

    this.scene.add(this.entityGroup);

    // Path Line Visualization
    const curve = new THREE.CatmullRomCurve3(this.waypoints);
    const points = curve.getPoints(100);
    const pathGeo = new THREE.BufferGeometry().setFromPoints(points);
    this.pathMat = new THREE.LineDashedMaterial({
      color: 0xff0055,
      dashSize: 0.4,
      gapSize: 0.2,
      scale: 1,
      transparent: true,
      opacity: 0.6
    });
    this.pathLine = new THREE.Line(pathGeo, this.pathMat);
    this.pathLine.computeLineDistances();
    this.scene.add(this.pathLine);

    this.entityGroup.position.copy(this.waypoints[0]);
  }

  setMode(newMode) {
    this.mode = newMode;
    if (newMode === 'EMPTY_ROOM') {
      this.entityGroup.visible = false;
      this.pathLine.visible = false;
    } else if (newMode === 'NORMAL_STAFF') {
      this.entityGroup.visible = true;
      this.pathLine.visible = false;
      this.sphereMat.color.setHex(0x00ff66);
      this.sphereMat.emissive.setHex(0x004411);
      this.ringMat.color.setHex(0x00ff66);
    } else { // INTRUDER
      this.entityGroup.visible = true;
      this.pathLine.visible = true;
      this.sphereMat.color.setHex(0xff0055);
      this.sphereMat.emissive.setHex(0xff0055);
      this.ringMat.color.setHex(0xff0055);
    }
  }

  setSpeed(newSpeed) {
    this.speed = newSpeed;
  }

  play() {
    this.isPlaying = true;
  }

  pause() {
    this.isPlaying = false;
  }

  reset() {
    this.isPlaying = false;
    this.currentWaypointIndex = 0;
    this.entityGroup.position.copy(this.waypoints[0]);
  }

  update(delta) {
    if (!this.isPlaying || this.mode === 'EMPTY_ROOM') return;

    const startPt = this.waypoints[this.currentWaypointIndex];
    const nextIdx = (this.currentWaypointIndex + 1) % this.waypoints.length;
    const endPt = this.waypoints[nextIdx];

    const segmentDist = startPt.distanceTo(endPt);
    const step = (this.speed * delta) / segmentDist;
    this.progress += step;

    if (this.progress >= 1.0) {
      this.progress = 0.0;
      this.currentWaypointIndex = nextIdx;
    } else {
      this.entityGroup.position.lerpVectors(startPt, endPt, this.progress);
      this.ringMesh.rotation.z += delta * 2.0;
      this.ringMesh.scale.setScalar(1 + 0.15 * Math.sin(Date.now() * 0.005));
    }
  }

  adaptToBounds(dims) {
    if (!dims || dims.length < 3) return;
    const [dx, dy, dz] = dims;
    const halfX = Math.min(Math.max(0.3, dx * 0.35), 4.0);
    const halfZ = Math.min(Math.max(0.6, dz * 0.4), 5.0);
    const y = Math.min(0.35, Math.max(0.15, dy * 0.15));

    this.waypoints = [
      new THREE.Vector3(-halfX * 0.7, y, -halfZ * 0.8),
      new THREE.Vector3(0, y, -halfZ * 0.3),
      new THREE.Vector3(halfX * 0.7, y, 0),
      new THREE.Vector3(0, y, halfZ * 0.7),
      new THREE.Vector3(-halfX * 0.5, y, halfZ * 0.4),
      new THREE.Vector3(-halfX * 0.7, y, -halfZ * 0.8)
    ];

    const curve = new THREE.CatmullRomCurve3(this.waypoints);
    const points = curve.getPoints(100);
    this.pathLine.geometry.dispose();
    this.pathLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.pathLine.computeLineDistances();
    this.reset();
  }

  getPosition() {
    if (this.mode === 'EMPTY_ROOM') return ["N/A", "N/A", "N/A"];
    return [
      parseFloat(this.entityGroup.position.x.toFixed(2)),
      parseFloat(this.entityGroup.position.y.toFixed(2)),
      parseFloat(this.entityGroup.position.z.toFixed(2))
    ];
  }
}
