import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Viewport3D } from './components/Viewport3D';
import { ColmapUploader } from './components/ColmapUploader';
import { OptimizationPanel } from './components/OptimizationPanel';
import { CameraFeedGrid } from './components/CameraFeedGrid';
import { SyntheticGeneratorPanel } from './components/SyntheticGeneratorPanel';
import { OllamaAssistantBar } from './components/OllamaAssistantBar';
import { AlertModal } from './components/AlertModal';
import { colmapAPI, optimizationAPI } from './utils/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('viewport');
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // State shared across components
  const [colmapData, setColmapData] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // On App Mount: Automatically generate candidate camera grid across 10m x 10m room
  useEffect(() => {
    async function loadCandidateGrid() {
      try {
        const gridCandidates = await optimizationAPI.getCandidateGrid();
        setCandidates(gridCandidates);
        setColmapData({
          frame_count: gridCandidates.length,
          camera_model: "Ceiling Grid (1m step, Y=2.5m, -30° pitch)",
          source: "Programmatic 3D Spatial Grid"
        });

        // Compute 3D Greedy Set Cover solution to find the 6 optimal camera placements
        if (gridCandidates && gridCandidates.length > 0) {
          const optRes = await optimizationAPI.runSetCover({
            candidates: gridCandidates,
            voxel_resolution: 1.0,
            desired_coverage_pct: 95.0,
            max_cameras_allowed: 6,
            bounds_min: [-5.0, 0.0, -5.0],
            bounds_max: [5.0, 2.5, 5.0]
          });
          setOptimizationResult(optRes);
        }
      } catch (err) {
        console.warn("Failed to load programmatic candidate grid, retrying with defaults:", err);
        try {
          const optRes = await optimizationAPI.runSetCover({
            voxel_resolution: 1.0,
            desired_coverage_pct: 95.0,
            max_cameras_allowed: 6
          });
          setOptimizationResult(optRes);
        } catch (e) {
          console.error("Set cover error:", e);
        }
      } finally {
        setLoadingInitial(false);
      }
    }

    loadCandidateGrid();
  }, []);

  const handleRoomLoaded = async (info) => {
    if (!info || !info.dimensions) return;
    try {
      const [dimX, dimY, dimZ] = info.dimensions;
      const minX = -Math.max(1.2, Math.round((dimX / 2 + 0.4) * 10) / 10);
      const maxX = Math.max(1.2, Math.round((dimX / 2 + 0.4) * 10) / 10);
      const minZ = -Math.max(1.8, Math.round((dimZ / 2 + 0.4) * 10) / 10);
      const maxZ = Math.max(1.8, Math.round((dimZ / 2 + 0.4) * 10) / 10);
      const ceilingH = Math.max(2.1, Math.round(dimY * 10) / 10);
      const step = 0.5;

      const realGrid = await optimizationAPI.getCandidateGrid({
        min_x: minX,
        max_x: maxX,
        min_z: minZ,
        max_z: maxZ,
        ceiling_height: ceilingH,
        step: step
      });

      setCandidates(realGrid);
      setColmapData({
        frame_count: realGrid.length,
        camera_model: `Ceiling Grid (${step}m step, Y=${ceilingH}m, -30° pitch)`,
        source: `Real Room Scan (${dimX}m × ${dimY}m × ${dimZ}m)`
      });

      const optRes = await optimizationAPI.runSetCover({
        candidates: realGrid,
        voxel_resolution: 0.4,
        desired_coverage_pct: 95.0,
        max_cameras_allowed: 6,
        bounds_min: [minX, 0.0, minZ],
        bounds_max: [maxX, ceilingH, maxZ]
      });

      setOptimizationResult(optRes);
    } catch (e) {
      console.warn("Failed to dynamically optimize for real room bounds:", e);
    }
  };

  const handleColmapLoaded = (summary, extractedCandidates) => {
    setColmapData(summary);
    if (extractedCandidates && extractedCandidates.length > 0) {
      setCandidates(extractedCandidates);
    }
    setActiveTab('optimization');
  };

  const handleOptimizationResult = (res) => {
    setOptimizationResult(res);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-cyber-dark">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAlertModal={() => setIsAlertModalOpen(true)}
      />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation & Quick Stats Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          colmapStats={colmapData}
          optimizationStats={optimizationResult}
        />

        {/* Viewport & View Panels */}
        <main className="flex-1 relative overflow-hidden bg-cyber-dark">
          {activeTab === 'viewport' && (
            <Viewport3D
              candidates={candidates}
              selectedCameras={optimizationResult?.selected_cameras}
              colmapData={colmapData}
              onRoomLoaded={handleRoomLoaded}
            />
          )}

          {activeTab === 'colmap' && (
            <ColmapUploader
              currentData={colmapData}
              onColmapLoaded={handleColmapLoaded}
            />
          )}

          {activeTab === 'optimization' && (
            <OptimizationPanel
              candidates={candidates}
              result={optimizationResult}
              onOptimizationResult={handleOptimizationResult}
            />
          )}

          {activeTab === 'feeds' && (
            <CameraFeedGrid
              selectedCameras={optimizationResult?.selected_cameras}
            />
          )}

          {activeTab === 'synthetic' && (
            <SyntheticGeneratorPanel
              candidates={candidates}
              selectedCameras={optimizationResult?.selected_cameras}
            />
          )}

          {/* Floating Ollama Security Assistant Query Bar */}
          <OllamaAssistantBar />
        </main>
      </div>

      {/* Security SMTP Dispatcher Modal */}
      <AlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
      />
    </div>
  );
}
