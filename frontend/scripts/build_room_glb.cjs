const fs = require('fs');
const path = require('path');

// Polyfill FileReader for Node.js GLTFExporter
globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buf => {
      this.result = buf;
      if (this.onloadend) this.onloadend();
    }).catch(err => {
      if (this.onerror) this.onerror(err);
    });
  }
};

const THREE = require('three');
const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter.js');

function createRoomScene() {
  const room = new THREE.Group();
  room.name = "PolycamRoomMesh";

  // Materials
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
    metalness: 0.2,
    name: "FloorMaterial"
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.DoubleSide,
    name: "WallMaterial"
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.8,
    name: "AccentMaterial"
  });

  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.7,
    metalness: 0.3,
    name: "PillarMaterial"
  });

  const furnitureMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.4,
    metalness: 0.6,
    name: "FurnitureMaterial"
  });

  // 1. Floor (10m x 10m centered at origin)
  const floorGeo = new THREE.BoxGeometry(10, 0.1, 10);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, -0.05, 0);
  floor.receiveShadow = true;
  room.add(floor);

  // 2. Base perimeter trim
  const trimGeo = new THREE.BoxGeometry(10.2, 0.15, 10.2);
  const trim = new THREE.Mesh(trimGeo, accentMat);
  trim.position.set(0, 0.05, 0);
  room.add(trim);

  // 3. Walls (10m wide, 2.8m high)
  const wallHeight = 2.8;
  const wallThickness = 0.2;

  // North Wall (+Z)
  const northWallGeo = new THREE.BoxGeometry(10, wallHeight, wallThickness);
  const northWall = new THREE.Mesh(northWallGeo, wallMat);
  northWall.position.set(0, wallHeight / 2, 5);
  room.add(northWall);

  // South Wall (-Z) with Doorway cutout (two segments)
  const southWallLeftGeo = new THREE.BoxGeometry(4, wallHeight, wallThickness);
  const southWallLeft = new THREE.Mesh(southWallLeftGeo, wallMat);
  southWallLeft.position.set(-3, wallHeight / 2, -5);
  room.add(southWallLeft);

  const southWallRightGeo = new THREE.BoxGeometry(4, wallHeight, wallThickness);
  const southWallRight = new THREE.Mesh(southWallRightGeo, wallMat);
  southWallRight.position.set(3, wallHeight / 2, -5);
  room.add(southWallRight);

  // Door lintel
  const lintelGeo = new THREE.BoxGeometry(2, 0.6, wallThickness);
  const lintel = new THREE.Mesh(lintelGeo, wallMat);
  lintel.position.set(0, wallHeight - 0.3, -5);
  room.add(lintel);

  // East Wall (+X)
  const eastWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, 10);
  const eastWall = new THREE.Mesh(eastWallGeo, wallMat);
  eastWall.position.set(5, wallHeight / 2, 0);
  room.add(eastWall);

  // West Wall (-X)
  const westWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, 10);
  const westWall = new THREE.Mesh(westWallGeo, wallMat);
  westWall.position.set(-5, wallHeight / 2, 0);
  room.add(westWall);

  // 4. Structural Columns / Pillars
  const pillarGeo = new THREE.BoxGeometry(0.5, wallHeight, 0.5);
  const pillarCoords = [
    [-4.7, -4.7], [4.7, -4.7], [-4.7, 4.7], [4.7, 4.7]
  ];
  pillarCoords.forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(px, wallHeight / 2, pz);
    room.add(pillar);
  });

  // 5. Ceiling Beams (Y = 2.8)
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
  for (let z = -4; z <= 4; z += 2) {
    const beamGeo = new THREE.BoxGeometry(10, 0.2, 0.2);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, wallHeight, z);
    room.add(beam);
  }

  // 6. Security Monitoring Desks / Console Stations inside room
  const deskGeo = new THREE.BoxGeometry(2.4, 0.75, 1.2);
  const desk = new THREE.Mesh(deskGeo, furnitureMat);
  desk.position.set(0, 0.75 / 2, 1.5);
  room.add(desk);

  // Monitors on desk
  const monitorGeo = new THREE.BoxGeometry(0.8, 0.5, 0.05);
  for (let m = -0.6; m <= 0.6; m += 0.6) {
    const monitor = new THREE.Mesh(monitorGeo, accentMat);
    monitor.position.set(m, 0.75 + 0.3, 1.4);
    room.add(monitor);
  }

  // Server rack in corner
  const rackGeo = new THREE.BoxGeometry(0.9, 2.2, 0.9);
  const rack = new THREE.Mesh(rackGeo, furnitureMat);
  rack.position.set(4.0, 1.1, 4.0);
  room.add(rack);

  // Rack glowing indicator LEDs
  const ledGeo = new THREE.BoxGeometry(0.7, 0.05, 0.05);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
  for (let y = 0.5; y <= 1.8; y += 0.3) {
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(4.0, y, 3.52);
    room.add(led);
  }

  return room;
}

async function exportGLB() {
  const scene = new THREE.Scene();
  const room = createRoomScene();
  scene.add(room);

  const exporter = new GLTFExporter();
  const outputPath = path.resolve(__dirname, '../public/room.glb');

  exporter.parse(
    scene,
    (glbBuffer) => {
      fs.writeFileSync(outputPath, Buffer.from(glbBuffer));
      const stats = fs.statSync(outputPath);
      console.log(`Successfully generated room.glb at ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
    },
    (err) => {
      console.error('Error generating GLB:', err);
    },
    { binary: true }
  );
}

exportGLB();
