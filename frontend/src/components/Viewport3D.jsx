import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CameraManager } from '../scene/CameraManager';
import { ModelSimulator } from '../scene/ModelSimulator';
import { MeshViewer } from '../scene/MeshViewer';
import { VideoRecorderControl } from './VideoRecorderControl';
import { Play, Pause, RotateCcw, Eye, EyeOff, ShieldAlert, CheckCircle2, UserCheck, Box } from 'lucide-react';

export function Viewport3D({ candidates, selectedCameras, colmapData, onRoomLoaded }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraManagerRef = useRef(null);
  const simulatorRef = useRef(null);
  const meshViewerRef = useRef(null);
  const rendererRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(3.5);
  const [showCameras, setShowCameras] = useState(true);
  const [simMode, setSimMode] = useState('INTRUDER'); // 'INTRUDER', 'EMPTY_ROOM', 'NORMAL_STAFF'
  const [entityPos, setEntityPos] = useState([0, 0, 0]);
  const [modelInfo, setModelInfo] = useState(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d14);
    scene.fog = new THREE.FogExp2(0x0a0d14, 0.025);
    sceneRef.current = scene;

    // Perspective Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 5, 7);
    camera.lookAt(0, 1, 0);

    // WebGL Renderer with Shadow Support
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Primary Scene Lighting: AmbientLight & DirectionalLight so Polycam mesh does not render black
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    fillLight.position.set(-10, 15, -10);
    scene.add(fillLight);

    // Spatial Ground Grid Helper
    const gridHelper = new THREE.GridHelper(30, 30, 0x00f0ff, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Bounding Box Visualizer for room space reference
    const boxGeo = new THREE.BoxGeometry(2.5, 2.2, 3.8);
    const boxMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.18 });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.position.y = 1.1;
    scene.add(boxMesh);

    // Initialize Camera Manager for overlaying the 6 optimized camera frustums
    const cameraManager = new CameraManager(scene);
    cameraManagerRef.current = cameraManager;

    const simulator = new ModelSimulator(scene);
    simulatorRef.current = simulator;

    // Load Polycam GLTF Room Mesh via MeshViewer
    const meshViewer = new MeshViewer(
      scene,
      (info) => {
        setModelInfo(info);
        if (info && info.dimensions) {
          // Adapt simulator trajectory waypoints to walk inside the real room
          simulator.adaptToBounds(info.dimensions);

          // Adapt bounding box visualizer to match scanned space
          boxMesh.geometry.dispose();
          boxMesh.geometry = new THREE.BoxGeometry(
            Math.max(1.8, info.dimensions[0] * 1.05),
            info.dimensions[1],
            Math.max(2.4, info.dimensions[2] * 1.05)
          );
          boxMesh.position.y = info.dimensions[1] / 2;

          // Smoothly frame camera onto the scanned space
          const maxDim = Math.max(info.dimensions[0], info.dimensions[1], info.dimensions[2]);
          const dist = Math.max(3.8, maxDim * 1.5);
          camera.position.set(0, dist * 0.75, dist * 0.9);
          camera.lookAt(0, info.dimensions[1] * 0.35, 0);
          spherical.setFromVector3(camera.position);

          // Notify parent app of loaded room dimensions
          if (onRoomLoaded) {
            onRoomLoaded(info);
          }
        }
      },
      (err) => {
        console.warn("Failed to load /room.glb:", err);
      }
    );
    meshViewerRef.current = meshViewer;

    // Orbit Controller manual drag logic
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let spherical = new THREE.Spherical().setFromVector3(camera.position);

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouse.x;
      const deltaY = e.clientY - prevMouse.y;

      spherical.theta -= deltaX * 0.005;
      spherical.phi -= deltaY * 0.005;
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.01, spherical.phi));

      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);

      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e) => {
      spherical.radius += e.deltaY * 0.02;
      spherical.radius = Math.max(3, Math.min(60, spherical.radius));
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel);

    // Animation Loop
    let clock = new THREE.Clock();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (simulatorRef.current) {
        simulatorRef.current.update(delta);
        setEntityPos(simulatorRef.current.getPosition());
      }

      if (meshViewerRef.current) {
        meshViewerRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      if (meshViewerRef.current) {
        meshViewerRef.current.dispose();
      }
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
    };
  }, []);

  // Update cameras in 3D scene when candidates or selectedCameras change
  useEffect(() => {
    if (cameraManagerRef.current && showCameras) {
      const selectedIds = (selectedCameras || []).map(c => c.id);
      cameraManagerRef.current.updateCameras(candidates || [], selectedIds);
    }
  }, [candidates, selectedCameras, showCameras]);

  const togglePlay = () => {
    if (simulatorRef.current) {
      if (isPlaying) {
        simulatorRef.current.pause();
      } else {
        simulatorRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const resetSim = () => {
    if (simulatorRef.current) {
      simulatorRef.current.reset();
      setIsPlaying(false);
    }
  };

  const handleModeChange = (mode) => {
    setSimMode(mode);
    if (simulatorRef.current) {
      simulatorRef.current.setMode(mode);
    }
  };

  const handleSpeedChange = (e) => {
    const val = parseFloat(e.target.value);
    setSimSpeed(val);
    if (simulatorRef.current) {
      simulatorRef.current.setSpeed(val);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-cyber-dark select-none flex flex-col">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top HUD Stats Overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-3 pointer-events-none">
        <div className="glass-panel px-3 py-2 rounded-lg flex items-center space-x-2 text-xs font-mono border border-cyber-accent/40 shadow-lg glow-accent">
          <span className="w-2 h-2 rounded-full bg-cyber-accent animate-ping" />
          <Box className="w-3.5 h-3.5 text-cyber-accent" />
          <span className="text-cyber-accent font-bold">
            3D POLYCAM MESH: {modelInfo ? modelInfo.name : 'room.glb'} ({modelInfo ? `${modelInfo.triangles.toLocaleString()} Polys` : 'PBR Lighted'})
          </span>
        </div>
        <div className="glass-panel px-3 py-2 rounded-lg text-xs font-mono text-slate-300">
          MODE: <span className={`font-bold ${
            simMode === 'INTRUDER' ? 'text-cyber-alert' : simMode === 'EMPTY_ROOM' ? 'text-slate-400' : 'text-cyber-success'
          }`}>{simMode}</span> | XYZ: <span className="font-bold text-slate-100">[{entityPos.join(', ')}]</span>
        </div>
      </div>


      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-3 glass-panel-accent p-2 rounded-xl border border-cyber-accent/40 shadow-2xl">
        {/* Simulation Mode Toggle Group */}
        <div className="flex items-center bg-cyber-dark/80 p-1 rounded-lg border border-cyber-border space-x-1">
          <button
            onClick={() => handleModeChange('INTRUDER')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
              simMode === 'INTRUDER' ? 'bg-cyber-alert text-white shadow-md glow-alert' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Red Intruder Target Mode"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>INTRUDER</span>
          </button>
          <button
            onClick={() => handleModeChange('EMPTY_ROOM')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
              simMode === 'EMPTY_ROOM' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Empty Room (Negative Case Test)"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>EMPTY ROOM</span>
          </button>
          <button
            onClick={() => handleModeChange('NORMAL_STAFF')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
              simMode === 'NORMAL_STAFF' ? 'bg-cyber-success text-cyber-dark' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Authorized Staff Mode"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>STAFF</span>
          </button>
        </div>

        <div className="h-6 w-px bg-slate-700 mx-1" />

        <button
          onClick={togglePlay}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
            isPlaying ? 'bg-cyber-warning text-cyber-dark' : 'bg-cyber-accent text-cyber-dark hover:brightness-110'
          }`}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </button>

        <button
          onClick={resetSim}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
          title="Reset Simulation Path"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="h-6 w-px bg-slate-700 mx-1" />

        <button
          onClick={() => setShowCameras(!showCameras)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            showCameras ? 'bg-slate-800 text-cyber-accent border border-cyber-accent/40' : 'bg-slate-800/50 text-slate-400'
          }`}
        >
          {showCameras ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>CCTVs</span>
        </button>

        <div className="h-6 w-px bg-slate-700 mx-1" />

        <VideoRecorderControl getCanvas={() => rendererRef.current?.domElement} />
      </div>
    </div>
  );
}
