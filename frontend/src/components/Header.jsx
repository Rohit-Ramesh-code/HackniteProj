import React from 'react';
import { Shield, ShieldAlert, Cpu, Radio, Bell } from 'lucide-react';

export function Header({ onOpenAlertModal, activeTab, setActiveTab }) {
  return (
    <header className="h-16 border-b border-cyber-border bg-cyber-card/80 backdrop-blur-md px-6 flex items-center justify-between z-20 shrink-0">
      {/* Brand Title */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-cyber-accent/10 border border-cyber-accent/40 flex items-center justify-center shadow-lg shadow-cyber-accent/10">
          <Shield className="w-6 h-6 text-cyber-accent" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg tracking-wider text-slate-50 uppercase flex items-center gap-2">
            AEGIS<span className="text-cyber-accent">SPATIAL</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/40">
              v2.0-AEGIS
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">3D Spatial Security & Synthetic Video Intelligence</p>
        </div>
      </div>

      {/* Center Nav Tabs */}
      <div className="flex items-center space-x-1 bg-cyber-dark/80 p-1 rounded-lg border border-cyber-border">
        <button
          onClick={() => setActiveTab('viewport')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'viewport'
              ? 'bg-cyber-accent text-cyber-dark font-bold shadow-md shadow-cyber-accent/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          3D Viewport
        </button>
        <button
          onClick={() => setActiveTab('optimization')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'optimization'
              ? 'bg-cyber-accent text-cyber-dark font-bold shadow-md shadow-cyber-accent/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Optimization Engine
        </button>
        <button
          onClick={() => setActiveTab('synthetic')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'synthetic'
              ? 'bg-cyber-accent text-cyber-dark font-bold shadow-md shadow-cyber-accent/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-accent animate-ping" />
          Synthetic Studio
        </button>
        <button
          onClick={() => setActiveTab('feeds')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'feeds'
              ? 'bg-cyber-accent text-cyber-dark font-bold shadow-md shadow-cyber-accent/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Watchman CCTV Matrix
        </button>
        <button
          onClick={() => setActiveTab('colmap')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'colmap'
              ? 'bg-cyber-accent text-cyber-dark font-bold shadow-md shadow-cyber-accent/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Scan Ingestion
        </button>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-cyber-dark/60 px-3 py-1.5 rounded border border-cyber-border">
          <span className="w-2 h-2 rounded-full bg-cyber-success animate-pulse"></span>
          <span>SYSTEM ACTIVE</span>
        </div>

        <button
          onClick={onOpenAlertModal}
          className="flex items-center space-x-2 bg-gradient-to-r from-rose-600 to-cyber-alert text-white px-4 py-2 rounded-lg font-semibold text-xs hover:opacity-90 transition-all shadow-lg shadow-rose-900/40 glow-alert active:scale-95"
        >
          <Bell className="w-4 h-4 animate-bounce" />
          <span>DISPATCH SMTP ALERT</span>
        </button>
      </div>
    </header>
  );
}
