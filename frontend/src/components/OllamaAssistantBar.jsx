import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Video, 
  ShieldAlert, 
  ShieldCheck,
  ChevronUp, 
  ChevronDown, 
  X, 
  Play, 
  Radio, 
  CornerDownLeft, 
  MessageSquare,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info
} from 'lucide-react';
import { ollamaAPI } from '../utils/api';

const QUICK_PROMPTS = [
  "Give me a video of threat",
  "Give me a video of non-threat",
  "Show me theft in the hallway",
  "Show me perimeter breach",
  "Show me routine security patrol",
  "Was there any suspicious loitering?"
];

export function OllamaAssistantBar({ onSelectVideo }) {
  const [isOpen, setIsOpen] = useState(true);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '👋 Hello! I am your AegisSpatial AI Assistant powered by Google Gemini Vision & Spatial Intelligence. You can ask me to retrieve and analyze surveillance footage, e.g.: "Give me a video of threat" or "Give me a video of non-threat".',
      videos: []
    }
  ]);
  const [activeVideoModal, setActiveVideoModal] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState({ online: true, primary_engine: 'Gemini Multimodal AI' });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const s = await ollamaAPI.getStatus();
        setOllamaStatus(s);
      } catch (e) {
        console.warn('AI status check failed:', e);
      }
    }
    checkStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendQuery = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || loading) return;

    const userMsg = { role: 'user', text: textToSend, videos: [] };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await ollamaAPI.query(textToSend);
      const assistantMsg = {
        role: 'assistant',
        text: res.answer,
        videos: res.matched_videos || [],
        model: res.model_used
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('AI query error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Error processing your query. Please verify that the backend server is active.',
          videos: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isThreatVideo = (vid) => {
    if (vid.is_threat !== undefined) return Boolean(vid.is_threat);
    const nonThreatTypes = ['normal', 'normal_traffic', 'routine_patrol', 'clear_zone', 'safe', 'none'];
    return !nonThreatTypes.includes(vid.threat_type?.toLowerCase());
  };

  return (
    <>
      {/* Floating Bottom AI Query Bar */}
      <div className="absolute bottom-3 left-4 right-4 md:left-16 md:right-16 z-30 transition-all duration-300">
        <div className="glass-panel rounded-2xl border border-cyan-500/40 shadow-2xl overflow-hidden bg-slate-950/95 backdrop-blur-xl">
          
          {/* Header Strip */}
          <div className="bg-slate-900/90 px-4 py-2 border-b border-cyber-border/70 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-500/30 to-emerald-500/30 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
              </div>
              <span className="font-bold text-slate-100 flex items-center gap-2">
                GEMINI AI SURVEILLANCE COPILOT
                <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  {ollamaStatus?.primary_engine || 'GEMINI FLASH ACTIVE'}
                </span>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-all"
                title={isOpen ? 'Collapse Chat' : 'Expand Chat'}
              >
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Expanded Chat Messages & Video Drawer */}
          {isOpen && (
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto border-b border-cyber-border/50 text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}
                >
                  <div
                    className={`max-w-3xl px-4 py-3 rounded-2xl ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-semibold font-sans shadow-lg'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-200 font-sans leading-relaxed shadow-md'
                    }`}
                  >
                    <div className="whitespace-pre-line">{m.text}</div>
                    {m.model && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 text-[10px] text-cyan-400/70 font-mono flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Evaluated via {m.model}
                      </div>
                    )}
                  </div>

                  {/* Matched Video Cards for Assistant Responses */}
                  {m.videos && m.videos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-4xl pt-1">
                      {m.videos.map((vid) => {
                        const isThreat = isThreatVideo(vid);
                        return (
                          <div
                            key={vid.id}
                            className={`bg-slate-900/95 rounded-xl overflow-hidden border p-2.5 space-y-2 group shadow-xl transition-all hover:scale-[1.01] ${
                              isThreat 
                                ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                                : 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            }`}
                          >
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
                              <video
                                src={vid.video_url}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-1.5 left-1.5 bg-slate-950/85 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                                {vid.camera_name}
                              </div>
                              <div className="absolute top-1.5 right-1.5">
                                <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                                  isThreat 
                                    ? 'bg-rose-950/90 text-rose-300 border border-rose-600/50' 
                                    : 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/50'
                                }`}>
                                  {isThreat ? '🚨 THREAT' : '✅ NON-THREAT'}
                                </span>
                              </div>
                              <button
                                onClick={() => setActiveVideoModal(vid)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer"
                              >
                                <div className="p-2.5 rounded-full bg-cyan-400 text-slate-950 shadow-lg hover:scale-110 transition-transform">
                                  <Play className="w-4 h-4 fill-current" />
                                </div>
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                              <span className="font-bold text-slate-200 uppercase flex items-center gap-1">
                                {isThreat ? (
                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                ) : (
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                )}
                                {vid.threat_type?.replace('_', ' ')}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                                isThreat
                                  ? 'bg-rose-950 text-rose-400 border border-rose-700/40'
                                  : 'bg-emerald-950 text-emerald-400 border border-emerald-700/40'
                              }`}>
                                {vid.severity || 'STANDARD'}
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-300 font-sans line-clamp-2 leading-relaxed">
                              {vid.description}
                            </p>

                            <button
                              onClick={() => setActiveVideoModal(vid)}
                              className="w-full py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono flex items-center justify-center gap-1 transition-all"
                            >
                              <Play className="w-3 h-3" /> Expand & Inspect Rationale
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Quick Prompts Pills Strip */}
          <div className="px-4 py-2 bg-slate-950 flex items-center space-x-2 overflow-x-auto no-scrollbar border-t border-slate-900">
            <span className="text-[10px] font-mono text-cyan-400 uppercase shrink-0 flex items-center gap-1 font-bold">
              <Zap className="w-3 h-3 text-cyan-400" /> Quick Prompts:
            </span>
            {QUICK_PROMPTS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuery(q)}
                className="shrink-0 px-3 py-1 rounded-full text-[11px] bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/50 hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Prompt Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="p-3 bg-slate-950 flex items-center space-x-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask Gemini AI: 'Give me a video of threat' or 'Show me non-threat footage'..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 hover:brightness-110 transition-all font-bold disabled:opacity-40 cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Expanded Modal Video Player */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-accent max-w-4xl w-full rounded-2xl overflow-hidden border border-cyan-400/60 shadow-2xl p-5 space-y-4 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5 font-mono text-sm">
                <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                <span className="font-bold text-slate-100">{activeVideoModal.camera_name}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  isThreatVideo(activeVideoModal)
                    ? 'bg-rose-950 text-rose-400 border border-rose-600/50'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-600/50'
                }`}>
                  {isThreatVideo(activeVideoModal) ? '🚨 CONFIRMED THREAT' : '✅ NORMAL NON-THREAT'}
                </span>
              </div>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner border border-slate-800">
              <video
                src={activeVideoModal.video_url}
                autoPlay
                controls
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-cyan-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> GEMINI AI VISION CLASSIFICATION RATIONALE:
                </span>
                <span className="text-[11px] text-slate-400">
                  Scenario: {activeVideoModal.threat_type?.toUpperCase()}
                </span>
              </div>
              <p className="font-sans text-slate-200 text-xs leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                {activeVideoModal.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
