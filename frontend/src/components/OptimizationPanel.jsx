import React, { useState } from 'react';
import { Sliders, Cpu, CheckCircle2, ShieldCheck, Zap, Award, Target, Layers } from 'lucide-react';
import { optimizationAPI } from '../utils/api';

export function OptimizationPanel({ candidates, onOptimizationResult, result }) {
  const [voxelRes, setVoxelRes] = useState(1.0);
  const [desiredCoverage, setDesiredCoverage] = useState(95);
  const [maxCams, setMaxCams] = useState(6);
  const [loading, setLoading] = useState(false);

  const candidateCount = candidates ? candidates.length : 121;

  const handleRunOptimization = async () => {
    setLoading(true);
    try {
      const payload = {
        candidates: candidates || undefined,
        voxel_resolution: parseFloat(voxelRes),
        desired_coverage_pct: parseFloat(desiredCoverage),
        max_cameras_allowed: parseInt(maxCams),
        bounds_min: [-5.0, 0.0, -5.0],
        bounds_max: [5.0, 2.5, 5.0]
      };

      const res = await optimizationAPI.runSetCover(payload);
      onOptimizationResult(res);
    } catch (e) {
      alert("Set Cover execution error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const hardwareReductionPct = result
    ? Math.max(0, Math.round((1 - result.selected_cameras.length / candidateCount) * 100))
    : 85;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-y-auto max-h-full">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-cyber-border pb-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-wide uppercase text-slate-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyber-accent" />
            3D Greedy Set Cover Optimization Engine
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Compute minimal optimal subset of camera sensors to achieve maximum spatial voxel visibility
          </p>
        </div>
        <button
          onClick={handleRunOptimization}
          disabled={loading}
          className="flex items-center space-x-2 bg-gradient-to-r from-cyber-accent to-emerald-400 text-cyber-dark px-5 py-2.5 rounded-lg font-extrabold text-xs hover:brightness-110 transition-all shadow-lg glow-accent active:scale-95"
        >
          <Zap className={`w-4 h-4 ${loading ? 'animate-spin' : 'fill-current'}`} />
          <span>{loading ? 'SOLVING OPTIMIZATION...' : 'COMPUTE OPTIMAL PLACEMENT'}</span>
        </button>
      </div>

      {/* Control Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-bold">Voxel Grid Step Size</span>
            <span className="text-cyber-accent font-bold">{voxelRes}m</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={voxelRes}
            onChange={(e) => setVoxelRes(e.target.value)}
            className="w-full accent-cyber-accent cursor-pointer"
          />
          <p className="text-[11px] text-slate-400">Smaller values increase 3D precision & calculation density.</p>
        </div>

        <div className="glass-panel p-5 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-bold">Target Spatial Coverage</span>
            <span className="text-cyber-success font-bold">{desiredCoverage}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="100"
            step="1"
            value={desiredCoverage}
            onChange={(e) => setDesiredCoverage(e.target.value)}
            className="w-full accent-cyber-success cursor-pointer"
          />
          <p className="text-[11px] text-slate-400">Required percentage of total volume covered by camera vision cones.</p>
        </div>

        <div className="glass-panel p-5 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-bold">Max Camera Budget</span>
            <span className="text-cyber-neon font-bold">{maxCams} CCTVs</span>
          </div>
          <input
            type="range"
            min="1"
            max="12"
            step="1"
            value={maxCams}
            onChange={(e) => setMaxCams(e.target.value)}
            className="w-full accent-cyber-neon cursor-pointer"
          />
          <p className="text-[11px] text-slate-400">Maximum allowed CCTV sensor deployments for economic constraint.</p>
        </div>
      </div>

      {/* Results & Mathematical Victory Banner */}
      {result && (
        <div className="glass-panel-accent p-6 rounded-xl space-y-5 border border-cyber-accent/40 shadow-2xl">
          {/* Mathematical Victory Header */}
          <div className="bg-cyber-dark/80 p-4 rounded-xl border border-cyber-success/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-cyber-success/15 border border-cyber-success/40 flex items-center justify-center shrink-0 glow-accent">
                <Award className="w-6 h-6 text-cyber-success" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-cyber-success uppercase font-bold tracking-widest block">
                  MATHEMATICAL OPTIMIZATION VICTORY
                </span>
                <h3 className="text-base font-extrabold text-slate-100 font-mono">
                  Achieved {result.coverage_percentage}% floor coverage with {result.selected_cameras.length} optimal cameras
                </h3>
              </div>
            </div>

            <div className="text-right text-xs font-mono shrink-0">
              <span className="text-slate-400 block text-[10px]">ANALYZED COORDINATES</span>
              <span className="text-cyber-accent font-bold text-sm">
                {candidateCount} Spatial Poses
              </span>
            </div>
          </div>

          {/* Detailed Metric Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="bg-cyber-dark/80 p-3 rounded-lg border border-cyber-border">
              <span className="text-slate-400 block text-[10px]">CANDIDATE POSES ANALYZED</span>
              <span className="text-lg font-extrabold text-slate-100">{candidateCount} Poses</span>
            </div>

            <div className="bg-cyber-dark/80 p-3 rounded-lg border border-cyber-border">
              <span className="text-slate-400 block text-[10px]">3D VOXELS COVERED</span>
              <span className="text-lg font-extrabold text-cyber-success">
                {result.total_covered_voxels} / {result.total_voxels}
              </span>
            </div>

            <div className="bg-cyber-dark/80 p-3 rounded-lg border border-cyber-border">
              <span className="text-slate-400 block text-[10px]">FINAL COVERAGE RATIO</span>
              <span className="text-lg font-extrabold text-cyber-accent">{result.coverage_percentage}%</span>
            </div>

            <div className="bg-cyber-dark/80 p-3 rounded-lg border border-cyber-border">
              <span className="text-slate-400 block text-[10px]">HARDWARE REDUCTION</span>
              <span className="text-lg font-extrabold text-cyber-neon">-{hardwareReductionPct}% Sensors</span>
            </div>
          </div>

          {/* Selected Camera Placement Specs */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
              <Target className="w-4 h-4 text-cyber-accent" />
              Deployed Camera Placement Specs:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.selected_cameras.map((cam) => (
                <div key={cam.id} className="bg-cyber-dark/90 p-3 rounded-lg border border-cyber-border flex justify-between items-center text-xs font-mono">
                  <div>
                    <span className="text-cyber-accent font-bold">CAM #{cam.id}</span>
                    <p className="text-[11px] text-slate-400">
                      Pos: [{cam.position.join(', ')}]
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-cyber-success font-bold">+{cam.new_voxels_covered} voxels</span>
                    <p className="text-[10px] text-slate-400">FOV {cam.fov_degrees}° / {cam.max_range}m</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
