import React from 'react';
import { Box, Layers, Sliders, Video, Sparkles, ShieldAlert, FileText, Database } from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab, colmapStats, optimizationStats }) {
  const menuItems = [
    { id: 'viewport', label: '3D Spatial Viewport', icon: Box },
    { id: 'optimization', label: 'Optimization Engine', icon: Sliders },
    { id: 'synthetic', label: 'Synthetic Studio', icon: Sparkles },
    { id: 'feeds', label: 'Watchman CCTV Feeds', icon: Video },
    { id: 'colmap', label: 'Scan & Pose Data', icon: Layers },
  ];

  return (
    <aside className="w-64 border-r border-cyber-border bg-cyber-card/60 backdrop-blur-md flex flex-col justify-between p-4 z-10 shrink-0">
      <div className="space-y-6">
        <div>
          <p className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest px-2 mb-3">
            Core Modules
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-cyber-accent/15 text-cyber-accent border border-cyber-accent/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyber-accent' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Real-time System Metrics Quick Card */}
        <div className="glass-panel p-3.5 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-mono border-b border-cyber-border/60 pb-2">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyber-accent" />
              COLMAP Frames
            </span>
            <span className="text-slate-100 font-bold">{colmapStats?.frame_count || 12}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono border-b border-cyber-border/60 pb-2">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyber-success" />
              Coverage Target
            </span>
            <span className="text-cyber-success font-bold">
              {optimizationStats?.coverage_percentage ? `${optimizationStats.coverage_percentage}%` : '95.0%'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-cyber-neon" />
              CCTVs Selected
            </span>
            <span className="text-slate-100 font-bold">
              {optimizationStats?.selected_cameras?.length || 4}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-[11px] font-mono text-slate-500 border-t border-cyber-border/50 pt-3">
        <p className="flex justify-between">
          <span>WebGL Engine:</span> <span className="text-slate-300">Three.js r160</span>
        </p>
        <p className="flex justify-between">
          <span>3D Architecture:</span> <span className="text-cyber-accent">Polycam GLTF</span>
        </p>
      </div>
    </aside>
  );
}
