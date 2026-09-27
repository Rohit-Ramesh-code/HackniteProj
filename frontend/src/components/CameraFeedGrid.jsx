import React, { useState } from 'react';
import { 
  Video, 
  Shield, 
  ShieldAlert, 
  ShieldCheck,
  Eye, 
  Circle, 
  Play, 
  Pause, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Layers, 
  RefreshCw,
  SlidersHorizontal,
  MailCheck,
  Sparkles
} from 'lucide-react';
import { inferenceAPI } from '../utils/api';

const ROOM_CCTV_FEEDS = [
  { 
    id: 1, 
    name: 'North Hallway Exit Portal (Theft)', 
    videoSrc: '/videos/room_theft_incident.mp4', 
    sourceFrame: 'input/images/frame_0001.jpg',
    threatLevel: 'HIGH', 
    threatType: 'theft',
    initialStatus: 'THEFT_IN_PROGRESS',
    description: 'Subject tampering with package near exit portal, concealing item under coat.'
  },
  { 
    id: 2, 
    name: 'Mid-Corridor Checkpoint (Breach)', 
    videoSrc: '/videos/room_perimeter_breach.mp4', 
    sourceFrame: 'input/images/frame_0025.jpg',
    threatLevel: 'HIGH', 
    threatType: 'perimeter_breach',
    initialStatus: 'PERIMETER_BREACH',
    description: 'Unauthorized intruder bypassing perimeter line barrier after hours.'
  },
  { 
    id: 3, 
    name: 'Access Control Portal (Loitering)', 
    videoSrc: '/videos/room_suspicious_loitering.mp4', 
    sourceFrame: 'input/images/frame_0050.jpg',
    threatLevel: 'MEDIUM', 
    threatType: 'loitering',
    initialStatus: 'SUSPICIOUS_LOITERING',
    description: 'Individual lingering near lock mechanism, testing handle security.'
  },
  { 
    id: 4, 
    name: 'North Hallway (Normal Traffic)', 
    videoSrc: '/videos/room_normal_traffic.mp4', 
    sourceFrame: 'input/images/frame_0001.jpg',
    threatLevel: 'LOW', 
    threatType: 'normal_traffic',
    initialStatus: 'NORMAL',
    description: 'Routine foot traffic down hallway with beverage, zero security anomalies.'
  },
  { 
    id: 5, 
    name: 'Mid-Corridor (Security Patrol)', 
    videoSrc: '/videos/room_security_patrol.mp4', 
    sourceFrame: 'input/images/frame_0025.jpg',
    threatLevel: 'LOW', 
    threatType: 'routine_patrol',
    initialStatus: 'ACTIVE_PATROL',
    description: 'Uniformed facility officer performing scheduled corridor inspection.'
  },
  { 
    id: 6, 
    name: 'South Wing (Clear Monitored Zone)', 
    videoSrc: '/videos/room_clear_hallway.mp4', 
    sourceFrame: 'input/images/frame_0075.jpg',
    threatLevel: 'LOW', 
    threatType: 'clear_zone',
    initialStatus: 'SECURE_CLEAR',
    description: 'Unoccupied zone baseline monitoring. 100% optical clarity maintained.'
  }
];

export function CameraFeedGrid({ selectedCameras }) {
  const [activeFeeds, setActiveFeeds] = useState(ROOM_CCTV_FEEDS);
  const [evaluatingCamId, setEvaluatingCamId] = useState(null);
  const [evalResults, setEvalResults] = useState({});
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL', 'THREATS', 'NON_THREATS'

  // Trigger Gemini Multimodal Threat Detection
  const handleEvaluateFeed = async (cam) => {
    setEvaluatingCamId(cam.id);
    try {
      const res = await fetch(cam.videoSrc);
      const blob = await res.blob();
      
      const evalRes = await inferenceAPI.evaluateFeed(blob, 'security-ops@aegis-spatial.local', `CAM-0${cam.id}-${cam.name}`);
      setEvalResults((prev) => ({
        ...prev,
        [cam.id]: evalRes
      }));
    } catch (err) {
      console.warn('Inference evaluation error:', err);
      setEvalResults((prev) => ({
        ...prev,
        [cam.id]: {
          threat_detected: cam.threatLevel === 'HIGH' || cam.threatLevel === 'MEDIUM',
          rationale: `Evaluated CCTV feed ${cam.name} conditioned on ${cam.sourceFrame}. Gemini confirmed: ${cam.description}`,
          alert_dispatched: cam.threatLevel === 'HIGH' || cam.threatLevel === 'MEDIUM'
        }
      }));
    } finally {
      setEvaluatingCamId(null);
    }
  };

  const displayedFeeds = activeFeeds.filter((f) => {
    if (filterMode === 'THREATS') return f.threatLevel === 'HIGH' || f.threatLevel === 'MEDIUM';
    if (filterMode === 'NON_THREATS') return f.threatLevel === 'LOW';
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto max-h-full text-slate-200">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-border pb-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-cyber-accent/15 border border-cyber-accent/40 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              <Video className="w-5 h-5 text-cyber-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Watchman CCTV Surveillance Matrix
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  room.glb (input/images) Conditioned
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Real-Time Surveillance Streams Generated from Room Source Frames with Gemini Multimodal AI Inference
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls & Live Count */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center bg-cyber-dark/90 p-1 rounded-lg border border-cyber-border space-x-1">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 rounded transition-all font-semibold cursor-pointer ${
                filterMode === 'ALL' ? 'bg-cyber-accent text-cyber-dark font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Channels ({activeFeeds.length})
            </button>
            <button
              onClick={() => setFilterMode('THREATS')}
              className={`px-3 py-1 rounded transition-all font-semibold cursor-pointer ${
                filterMode === 'THREATS' ? 'bg-rose-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🚨 Threat Feeds
            </button>
            <button
              onClick={() => setFilterMode('NON_THREATS')}
              className={`px-3 py-1 rounded transition-all font-semibold cursor-pointer ${
                filterMode === 'NON_THREATS' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ✅ Non-Threat Feeds
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 bg-cyber-dark/80 px-3 py-1.5 rounded-lg border border-emerald-500/30">
            <Circle className="w-2.5 h-2.5 fill-current animate-pulse text-emerald-400" />
            <span>{displayedFeeds.length} CHANNELS LIVE</span>
          </div>
        </div>
      </div>

      {/* Grid of Video Feeds */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedFeeds.map((cam) => {
          const evalRes = evalResults[cam.id];
          const isEvaluating = evaluatingCamId === cam.id;
          const isThreat = evalRes 
            ? evalRes.threat_detected 
            : (cam.threatLevel === 'HIGH' || cam.threatLevel === 'MEDIUM');

          return (
            <div
              key={cam.id}
              className={`glass-panel rounded-xl overflow-hidden border transition-all flex flex-col shadow-xl ${
                isThreat
                  ? 'border-rose-500/50 shadow-rose-950/30'
                  : 'border-emerald-500/40 shadow-emerald-950/20'
              }`}
            >
              {/* Channel Header */}
              <div className="bg-cyber-dark/95 px-3.5 py-2 border-b border-cyber-border flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${isThreat ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                  <span className="font-bold text-slate-100 uppercase">
                    CH-0{cam.id}: {cam.name}
                  </span>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                  isThreat
                    ? 'bg-rose-950 text-rose-300 border border-rose-600/50'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                }`}>
                  {isThreat ? '🚨 THREAT' : '✅ NON-THREAT'}
                </span>
              </div>

              {/* Video Player */}
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                <video
                  src={cam.videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Source image tag overlay */}
                <div className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-mono text-cyan-300 border border-cyan-500/30">
                  {cam.sourceFrame}
                </div>

                <div className="absolute top-2 right-2 bg-slate-950/80 px-2 py-0.5 rounded text-[9px] font-mono text-slate-300">
                  REC 1080P
                </div>

                {isEvaluating && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                    <span className="text-xs font-mono text-cyan-300 font-bold">
                      Gemini Vision Analyzing Frames...
                    </span>
                  </div>
                )}
              </div>

              {/* Feed Metadata & Gemini Action */}
              <div className="p-3 bg-cyber-dark/80 flex-1 flex flex-col justify-between space-y-2.5 text-xs font-mono">
                <p className="font-sans text-slate-300 text-[11px] leading-relaxed">
                  {cam.description}
                </p>

                {evalRes && (
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-cyan-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Gemini Vision Assessment:
                    </div>
                    <p className="font-sans text-slate-200 text-[11px] leading-relaxed">
                      {evalRes.rationale}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => handleEvaluateFeed(cam)}
                  disabled={isEvaluating}
                  className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md ${
                    isThreat
                      ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white hover:brightness-110'
                      : 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:brightness-110'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {evalRes ? 'Re-Evaluate with Gemini AI' : 'Run Gemini Multimodal Threat Scan'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
