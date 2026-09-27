import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box, Upload, Info, RefreshCw, CheckCircle2 } from 'lucide-react';
import { MeshViewer } from '../scene/MeshViewer';

export { MeshViewer };

export function MeshViewerComponent({ onModelReady, className = "" }) {
  const containerRef = useRef(null);
  const meshViewerRef = useRef(null);
  const [modelStats, setModelStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d14);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 10, 15);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const viewer = new MeshViewer(
      scene,
      (info) => {
        setModelStats(info);
        setLoading(false);
        if (onModelReady) onModelReady(info);
      },
      (err) => {
        setLoading(false);
      }
    );
    meshViewerRef.current = viewer;

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      viewer.update();
      renderer.render(scene, camera);
    };
    animate();

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
      viewer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && meshViewerRef.current) {
      setLoading(true);
      meshViewerRef.current.loadGLTF(file);
    }
  };

  return (
    <div className={`relative w-full h-full rounded-xl overflow-hidden glass-panel border border-cyber-border ${className}`}>
      <div ref={containerRef} className="w-full h-full min-h-[300px]" />

      {/* Overlay Header Info */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
        <div className="glass-panel px-3 py-1.5 rounded-lg flex items-center space-x-2 text-xs font-mono text-slate-200">
          <Box className="w-4 h-4 text-cyber-accent" />
          <span className="font-bold">Polycam 3D Mesh:</span>
          <span className="text-cyber-accent">{modelStats ? modelStats.name : 'room.glb'}</span>
        </div>
      </div>

      {/* Upload/Replace Button */}
      <div className="absolute top-3 right-3 z-10 flex items-center space-x-2">
        <label className="cursor-pointer glass-panel px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs font-mono text-slate-300 hover:text-cyber-accent transition-colors border border-cyber-border">
          <Upload className="w-3.5 h-3.5" />
          <span>Load Polycam .glb</span>
          <input
            type="file"
            accept=".glb,.gltf"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {/* Model Stats Bar */}
      {modelStats && (
        <div className="absolute bottom-3 left-3 right-3 z-10 glass-panel-accent p-2.5 rounded-lg flex items-center justify-between text-xs font-mono text-slate-300">
          <div className="flex items-center space-x-4">
            <span>Dimensions: <strong className="text-slate-100">{modelStats.dimensions.join(' × ')}m</strong></span>
            <span>Vertices: <strong className="text-cyber-accent">{modelStats.vertices.toLocaleString()}</strong></span>
            <span>Polygons: <strong className="text-cyber-success">{modelStats.triangles.toLocaleString()}</strong></span>
          </div>
          <span className="flex items-center text-cyber-success gap-1 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" /> PBR Lighting Active
          </span>
        </div>
      )}
    </div>
  );
}

export default MeshViewerComponent;
