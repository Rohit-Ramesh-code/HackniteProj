import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Film, 
  Sun, 
  Moon, 
  CloudSun, 
  Zap, 
  Eye, 
  Play, 
  RefreshCw, 
  ShieldAlert, 
  Video, 
  Layers, 
  Clock, 
  Compass, 
  Radio, 
  Sliders, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { syntheticAPI } from '../utils/api';

const LIGHTING_OPTIONS = [
  { id: 'daylight', label: 'Daylight', icon: Sun, color: 'text-amber-400', desc: 'Natural bright lighting with crisp shadows' },
  { id: 'dusk', label: 'Dusk', icon: CloudSun, color: 'text-orange-400', desc: 'Golden hour twilight ambience and long shadows' },
  { id: 'night', label: 'Night Mode', icon: Moon, color: 'text-indigo-400', desc: 'Low ambient infrared / security spotlight grain' },
  { id: 'overcast', label: 'Overcast', icon: CloudSun, color: 'text-slate-400', desc: 'Soft diffused outdoor lighting' },
  { id: 'interior_fluorescent', label: 'Fluorescent', icon: Zap, color: 'text-cyan-400', desc: 'Overhead indoor commercial facility lighting' },
];

const SCENARIO_OPTIONS = [
  { id: 'normal_traffic', label: 'Normal Traffic', icon: Eye, color: 'text-emerald-400', desc: 'Routine pedestrian motion, casual pace' },
  { id: 'loitering', label: 'Suspicious Loitering', icon: Clock, color: 'text-amber-400', desc: 'Lingering near entrance, checking surroundings' },
  { id: 'theft', label: 'Theft / Tampering', icon: ShieldAlert, color: 'text-rose-400', desc: 'Concealing unattended bag / item' },
  { id: 'disturbance', label: 'Disturbance', icon: AlertCircle, color: 'text-red-500', desc: 'Aggressive physical altercation' },
  { id: 'perimeter_breach', label: 'Perimeter Breach', icon: Radio, color: 'text-fuchsia-400', desc: 'Unauthorized restricted zone trespass' },
];

export function SyntheticGeneratorPanel({ candidates, selectedCameras }) {
  // Config state
  const [lighting, setLighting] = useState('daylight');
  const [scenario, setScenario] = useState('loitering');
  const [actorDesc, setActorDesc] = useState('a person in a dark jacket and backpack');
  const [duration, setDuration] = useState(5.0);
  const [diffusionSteps, setDiffusionSteps] = useState(15);
  const [useMock, setUseMock] = useState(true);

  // 3D Waypoints [x, y, z]
  const [waypoints, setWaypoints] = useState([
    { t: 0.0, position: [-2.0, 0.0, 3.0] },
    { t: 2.5, position: [0.0, 0.0, 1.5] },
    { t: 5.0, position: [2.0, 0.0, 0.0] },
  ]);

  // System status & preview results
  const [systemCaps, setSystemCaps] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Live WebSocket Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationTotal, setGenerationTotal] = useState(15);
  const [generationPercent, setGenerationPercent] = useState(0);
  const [livePreviewUrl, setLivePreviewUrl] = useState(null);
  const [generationStatusMsg, setGenerationStatusMsg] = useState('');
  const [generatedVideoOutput, setGeneratedVideoOutput] = useState(null);
  const wsRef = useRef(null);

  // Active cameras to simulate
  const activeCameras = (selectedCameras && selectedCameras.length > 0)
    ? selectedCameras
    : (candidates && candidates.slice(0, 4)) || [
        { id: 1, name: 'Lobby Cam 1', position: [0, 2.5, 5], rotation: [-20, 0, 0], fov_degrees: 65, max_range: 15 },
        { id: 2, name: 'Corridor Cam 2', position: [-4, 2.5, 0], rotation: [-20, 90, 0], fov_degrees: 65, max_range: 15 }
      ];

  // Room Conditioned Synthetic Dataset State
  const [roomCatalog, setRoomCatalog] = useState([]);
  const [loadingRoomGen, setLoadingRoomGen] = useState(false);
  const [selectedRoomVideo, setSelectedRoomVideo] = useState(null);

  // Fetch presets & capabilities on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const caps = await syntheticAPI.getPresets();
        setSystemCaps(caps);
        if (caps.cuda_available) {
          setUseMock(false);
        }
      } catch (err) {
        console.warn('Could not load presets:', err);
      }

      try {
        const catalogRes = await syntheticAPI.getCatalog();
        if (catalogRes?.catalog) {
          setRoomCatalog(catalogRes.catalog);
        }
      } catch (err) {
        console.warn('Could not load room catalog:', err);
      }
    }
    loadInitialData();
  }, []);

  const handleGenerateRoomDataset = async () => {
    setLoadingRoomGen(true);
    try {
      const res = await syntheticAPI.generateRoomDataset();
      if (res?.catalog) {
        setRoomCatalog(res.catalog);
      }
    } catch (err) {
      console.error('Failed to generate room dataset:', err);
    } finally {
      setLoadingRoomGen(false);
    }
  };

  // Update waypoint position helper
  const handleWaypointChange = (index, axisIdx, val) => {
    const num = parseFloat(val) || 0;
    setWaypoints((prev) => {
      const copy = [...prev];
      const newPos = [...copy[index].position];
      newPos[axisIdx] = num;
      copy[index] = { ...copy[index], position: newPos };
      return copy;
    });
  };

  // Preview Prompts & 3D Spatial Visibility
  const handlePreviewPrompts = async () => {
    setPreviewLoading(true);
    try {
      const payload = {
        cameras: activeCameras.map((c) => ({
          id: c.id,
          name: c.name || `Camera ${c.id}`,
          position: c.position || [0, 2.5, 5],
          rotation: c.rotation || [-20, 0, 0],
          fov_degrees: c.fov_degrees || 65,
          max_range: c.max_range || 15,
        })),
        actor: {
          description: actorDesc,
          scenario_preset: scenario,
        },
        waypoints: waypoints,
        duration: duration,
        lighting: lighting,
        evaluation_time: duration / 2.0,
      };

      const res = await syntheticAPI.previewPrompts(payload);
      setPreviewResult(res);
    } catch (err) {
      console.error('Failed to preview prompts:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Trigger Live WebSocket Generation
  const handleStartGeneration = () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setGenerationStep(0);
    setGenerationTotal(diffusionSteps);
    setGenerationPercent(0);
    setLivePreviewUrl(null);
    setGeneratedVideoOutput(null);
    setGenerationStatusMsg('Connecting to Video Generation Pipeline...');

    const targetCam = activeCameras[0] || { id: 1, position: [0, 2.5, 5], rotation: [-20, 0, 0] };
    const promptText = previewResult?.prompts?.[0]?.prompt || `Security camera footage, CCTV surveillance, ${lighting} lighting. ${actorDesc}, ${scenario}. Photorealistic.`;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/api/synthetic/ws/generate`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setGenerationStatusMsg('Dispatched generation job to diffusion worker...');
        ws.send(JSON.stringify({
          camera: {
            id: targetCam.id,
            name: targetCam.name || `Camera ${targetCam.id}`,
            position: targetCam.position || [0, 2.5, 5],
            rotation: targetCam.rotation || [-20, 0, 0],
            fov_degrees: targetCam.fov_degrees || 65,
            max_range: targetCam.max_range || 15,
          },
          prompt: promptText,
          steps: diffusionSteps,
          fps: 16,
          use_mock: useMock,
          visible: true,
        }));
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'status') {
            setGenerationStatusMsg(msg.message);
          } else if (msg.type === 'progress') {
            setGenerationStep(msg.step);
            setGenerationTotal(msg.total);
            setGenerationPercent(msg.percentage);
            if (msg.preview) {
              setLivePreviewUrl(msg.preview);
            }
            setGenerationStatusMsg(`Denoising Step ${msg.step}/${msg.total} (${msg.percentage}%)`);
          } else if (msg.type === 'done') {
            setGeneratedVideoOutput(msg);
            setIsGenerating(false);
            setGenerationStatusMsg('Synthetic CCTV Clip Generation Complete!');
            ws.close();
          } else if (msg.type === 'error') {
            setGenerationStatusMsg(`Error: ${msg.message}`);
            setIsGenerating(false);
            ws.close();
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('WS error, fallback:', err);
        setGenerationStatusMsg('WebSocket error. Check backend connection.');
        setIsGenerating(false);
      };

      ws.onclose = () => {
        setIsGenerating(false);
      };
    } catch (e) {
      console.error('WS launch error:', e);
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto p-6 space-y-6 bg-cyber-dark text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-border/70 pb-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-cyber-accent/15 border border-cyber-accent/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyber-accent animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Synthetic CCTV Video Studio
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/40">
                  Wan 2.2 / Hunyuan I2V
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Multi-Camera Perspective Prompt Synthesis & Diffusion Video Generation
              </p>
            </div>
          </div>
        </div>

        {/* System Capability Tag */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className={`px-3 py-1.5 rounded-lg border flex items-center space-x-2 ${
            systemCaps?.cuda_available
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${systemCaps?.cuda_available ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{systemCaps?.cuda_available ? 'CUDA ACCELERATION READY' : 'TELEMETRY / MOCK PIPELINE ACTIVE'}</span>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer bg-cyber-card px-3 py-1.5 rounded-lg border border-cyber-border hover:border-cyber-accent/40 transition-all">
            <input
              type="checkbox"
              checked={useMock}
              onChange={(e) => setUseMock(e.target.checked)}
              className="accent-cyber-accent rounded"
            />
            <span className="text-slate-300 text-xs">Force Fast Mock Mode</span>
          </label>
        </div>
      </div>

      {/* Main Grid: Left Controls / Right Telemetry & Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Config Column (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Lighting Presets */}
          <div className="glass-panel p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              1. Ambient Lighting Preset
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LIGHTING_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = lighting === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setLighting(opt.id)}
                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-cyber-accent/15 border-cyber-accent text-slate-100 shadow-md shadow-cyber-accent/20'
                        : 'bg-cyber-card/60 border-cyber-border hover:border-slate-600 text-slate-400'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-cyber-accent' : opt.color}`} />
                    <span className="text-xs font-semibold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security Threat Scenario Presets */}
          <div className="glass-panel p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyber-alert" />
              2. Security Threat Scenario
            </h3>
            <div className="space-y-2">
              {SCENARIO_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = scenario === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setScenario(opt.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyber-alert/10 border-cyber-alert text-slate-100'
                        : 'bg-cyber-card/60 border-cyber-border hover:border-slate-600 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-cyber-alert' : opt.color}`} />
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{opt.label}</p>
                        <p className="text-[10px] text-slate-400">{opt.desc}</p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-cyber-alert shrink-0" />}
                  </div>
                );
              })}
            </div>

            {/* Custom Actor Description */}
            <div className="pt-2">
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Actor Visual Appearance Description:
              </label>
              <input
                type="text"
                value={actorDesc}
                onChange={(e) => setActorDesc(e.target.value)}
                className="w-full bg-cyber-dark/80 border border-cyber-border rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyber-accent"
                placeholder="e.g. a person in a dark hoodie and backpack"
              />
            </div>
          </div>

          {/* 3D Waypoint Path (Trajectory) */}
          <div className="glass-panel p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                3. 3D Spatial Actor Trajectory
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Duration: {duration}s</span>
            </div>

            <div className="space-y-2">
              {waypoints.map((wp, idx) => (
                <div key={idx} className="flex items-center space-x-2 text-xs font-mono bg-cyber-dark/60 p-2 rounded-lg border border-cyber-border">
                  <span className="w-12 text-slate-400 font-bold">t={wp.t}s:</span>
                  <div className="flex items-center space-x-1.5 flex-1">
                    <span className="text-slate-500">X:</span>
                    <input
                      type="number"
                      step="0.5"
                      value={wp.position[0]}
                      onChange={(e) => handleWaypointChange(idx, 0, e.target.value)}
                      className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-slate-100"
                    />
                    <span className="text-slate-500">Y:</span>
                    <input
                      type="number"
                      step="0.5"
                      value={wp.position[1]}
                      onChange={(e) => handleWaypointChange(idx, 1, e.target.value)}
                      className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-slate-100"
                    />
                    <span className="text-slate-500">Z:</span>
                    <input
                      type="number"
                      step="0.5"
                      value={wp.position[2]}
                      onChange={(e) => handleWaypointChange(idx, 2, e.target.value)}
                      className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-slate-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handlePreviewPrompts}
              disabled={previewLoading || isGenerating}
              className="flex-1 flex items-center justify-center space-x-2 bg-cyber-card border border-cyber-accent/60 text-cyber-accent hover:bg-cyber-accent/15 px-4 py-2.5 rounded-lg font-semibold text-xs transition-all shadow-md shadow-cyber-accent/10 active:scale-98 disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              <span>{previewLoading ? 'Evaluating 3D Frustums...' : 'Preview Prompts & Visibility'}</span>
            </button>

            <button
              onClick={handleStartGeneration}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-cyber-accent text-slate-950 px-4 py-2.5 rounded-lg font-bold text-xs hover:opacity-95 transition-all shadow-lg shadow-cyber-accent/20 active:scale-98 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isGenerating ? 'Generating Video...' : 'Synthesize CCTV Video'}</span>
            </button>
          </div>
        </div>

        {/* Right Preview & Telemetry Column (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Live Generation Telemetry & Preview Player */}
          <div className="glass-panel p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyber-border pb-3">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Video className="w-4 h-4 text-cyber-neon" />
                Live Diffusion Video Pipeline & Telemetry
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {generationStatusMsg || 'Standing by'}
              </span>
            </div>

            {/* Video / Live Preview Window */}
            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-950 border border-cyber-border flex items-center justify-center shadow-inner">
              {livePreviewUrl ? (
                <img
                  src={livePreviewUrl}
                  alt="Live Latent Preview"
                  className="w-full h-full object-cover"
                />
              ) : generatedVideoOutput ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900">
                  <Film className="w-12 h-12 text-cyber-accent mb-2 animate-bounce" />
                  <p className="text-sm font-bold text-slate-100">Video Generation Complete!</p>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    {generatedVideoOutput.frames} Frames @ {generatedVideoOutput.fps} FPS ({generatedVideoOutput.duration}s)
                  </p>
                  <a
                    href={generatedVideoOutput.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 px-4 py-1.5 rounded-lg bg-cyber-accent text-cyber-dark font-bold text-xs hover:opacity-90"
                  >
                    View / Download Output MP4
                  </a>
                </div>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <Film className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-mono">
                    Select scenario parameters & click "Synthesize CCTV Video" to view real-time diffusion denoising steps.
                  </p>
                </div>
              )}

              {/* Progress Overlay when generating */}
              {isGenerating && (
                <div className="absolute bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-md p-3 border-t border-cyber-border space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-slate-300">
                    <span>Denoising Step {generationStep} / {generationTotal}</span>
                    <span className="text-cyber-accent font-bold">{generationPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-cyber-accent h-full transition-all duration-150"
                      style={{ width: `${generationPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Perspective Prompts & 3D Frustum Visibility Details */}
          <div className="glass-panel p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyber-border pb-3">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyber-accent" />
                Synthesized Multi-Camera Prompts & Visibility Metrics
              </h3>
              {previewResult && (
                <span className="text-[10px] font-mono text-slate-400">
                  Evaluated at t={previewResult.evaluated_at_t}s
                </span>
              )}
            </div>

            {previewResult ? (
              <div className="space-y-3">
                {previewResult.prompts.map((p, idx) => (
                  <div
                    key={p.camera_id}
                    className={`p-3.5 rounded-lg border text-xs space-y-2 transition-all ${
                      p.visible
                        ? 'bg-cyber-card/70 border-cyber-accent/40'
                        : 'bg-slate-900/40 border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-slate-100 flex items-center gap-2">
                        <Video className="w-3.5 h-3.5 text-cyber-accent" />
                        {p.camera_name}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        p.visible
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {p.visible ? 'ACTOR IN FOV CONE' : 'UNOCCUPIED / OUTSIDE FOV'}
                      </span>
                    </div>

                    {p.visibility_metrics && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-cyber-dark/80 p-2 rounded border border-cyber-border">
                        <div>
                          <span className="text-slate-500">Distance: </span>
                          <span className="text-slate-200">{p.visibility_metrics.distance_meters}m</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Angle: </span>
                          <span className="text-slate-200">{p.visibility_metrics.angle_offset_deg}°</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Frame Pos: </span>
                          <span className="text-slate-200">{p.visibility_metrics.horizontal_category}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Motion: </span>
                          <span className="text-slate-200">{p.visibility_metrics.relative_motion}</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-[11px] font-mono text-slate-400 mb-1">Synthesized Wan 2.2 Prompt:</p>
                      <p className="text-slate-200 bg-slate-950/80 p-2.5 rounded border border-cyber-border font-sans leading-relaxed text-[11px]">
                        {p.prompt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 space-y-2 text-slate-500 font-mono text-xs">
                <Sliders className="w-8 h-8 mx-auto opacity-50 text-slate-600" />
                <p>Click "Preview Prompts & Visibility" to test 3D camera frustums and prompt generation.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Room Conditioned Dataset & Gemini Multimodal AI Classification Gallery */}
      <div className="glass-panel p-6 rounded-2xl border border-cyber-accent/30 space-y-5 bg-slate-950/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyber-border pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-400/40 flex items-center justify-center">
              <Film className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Room-Conditioned Synthetic Dataset & Gemini AI Classifications
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  room.glb Source Frames
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Surveillance video dataset generated directly from hallway camera POV images and evaluated via Gemini Vision
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateRoomDataset}
            disabled={loadingRoomGen}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRoomGen ? 'animate-spin' : ''}`} />
            {loadingRoomGen ? 'Synthesizing & Classifying with Gemini...' : 'Re-Generate & Classify All Scenarios'}
          </button>
        </div>

        {/* Video Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roomCatalog.map((item) => {
            const isThreat = item.is_threat;
            return (
              <div
                key={item.id}
                className={`bg-slate-900/90 rounded-xl overflow-hidden border p-3.5 space-y-3 transition-all hover:scale-[1.01] shadow-xl ${
                  isThreat
                    ? 'border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                    : 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                }`}
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center group">
                  <video
                    src={item.video_url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                    {item.camera_name}
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                      isThreat
                        ? 'bg-rose-950/90 text-rose-300 border border-rose-600/50'
                        : 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/50'
                    }`}>
                      {isThreat ? '🚨 THREAT' : '✅ NON-THREAT'}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[9px] font-mono text-slate-400">
                    Source: {item.source_frame}
                  </div>
                  <button
                    onClick={() => setSelectedRoomVideo(item)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <div className="p-3 rounded-full bg-cyan-400 text-slate-950 shadow-lg hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current" />
                    </div>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-slate-100">{item.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${
                      isThreat
                        ? 'bg-rose-950 text-rose-400 border border-rose-700/40'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-700/40'
                    }`}>
                      {item.severity || 'NONE'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] font-sans text-slate-300 space-y-1">
                    <div className="text-[10px] font-mono text-cyan-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Gemini AI Spatial Rationale:
                    </div>
                    <p className="leading-relaxed text-slate-300 text-[11px]">
                      {item.rationale || item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Room Video Modal */}
      {selectedRoomVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-4xl w-full rounded-2xl overflow-hidden border border-cyan-400/60 shadow-2xl p-5 space-y-4 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5 font-mono text-sm">
                <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                <span className="font-bold text-slate-100">{selectedRoomVideo.camera_name}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  selectedRoomVideo.is_threat
                    ? 'bg-rose-950 text-rose-400 border border-rose-600/50'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-600/50'
                }`}>
                  {selectedRoomVideo.is_threat ? '🚨 CONFIRMED THREAT' : '✅ NORMAL NON-THREAT'}
                </span>
              </div>
              <button
                onClick={() => setSelectedRoomVideo(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner border border-slate-800">
              <video
                src={selectedRoomVideo.video_url}
                autoPlay
                controls
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-cyan-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> GEMINI AI VISION EVALUATION
                </span>
                <span className="text-slate-400 text-[11px]">
                  Confidence: {((selectedRoomVideo.confidence || 0.95) * 100).toFixed(0)}%
                </span>
              </div>
              <p className="font-sans text-slate-200 text-xs leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                {selectedRoomVideo.rationale || selectedRoomVideo.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

