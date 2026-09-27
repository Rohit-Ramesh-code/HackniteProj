import React, { useState, useRef } from 'react';
import { Video, Square, Download, Sparkles, ShieldAlert, CheckCircle, RefreshCw, X } from 'lucide-react';
import { inferenceAPI } from '../utils/api';

export function VideoRecorderControl({ getCanvas }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = () => {
    const canvas = getCanvas();
    if (!canvas) {
      alert("Canvas WebGL surface not ready");
      return;
    }

    try {
      const stream = canvas.captureStream(30); // 30 FPS stream
      let recorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setAiResult(null);
    } catch (err) {
      console.error("Failed to start MediaRecorder: ", err);
      alert("Canvas recording error: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleEvaluateFeed = async () => {
    if (!recordedBlob) return;
    setEvaluating(true);
    try {
      const res = await inferenceAPI.evaluateFeed(recordedBlob);
      setAiResult(res);
      setShowResultModal(true);
    } catch (err) {
      alert("Gemini AI evaluation failed: " + err.message);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="flex items-center space-x-1.5 bg-cyber-alert text-white px-3 py-1.5 rounded-lg font-semibold text-xs hover:brightness-110 transition-all glow-alert active:scale-95"
        >
          <Video className="w-3.5 h-3.5" />
          <span>REC SYNTHETIC FEED</span>
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="flex items-center space-x-1.5 bg-amber-500 text-slate-950 px-3 py-1.5 rounded-lg font-bold text-xs animate-pulse hover:brightness-110 transition-all shadow-lg active:scale-95"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>STOP REC</span>
        </button>
      )}

      {recordedUrl && (
        <>
          <a
            href={recordedUrl}
            download="synthetic-spatial-surveillance.webm"
            className="flex items-center space-x-1 bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg font-semibold text-xs hover:bg-slate-700 transition-all border border-cyber-border"
          >
            <Download className="w-3.5 h-3.5" />
            <span>SAVE WEBM</span>
          </a>

          <button
            onClick={handleEvaluateFeed}
            disabled={evaluating}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-cyber-neon to-cyber-accent text-slate-950 font-extrabold px-3 py-1.5 rounded-lg text-xs hover:brightness-110 transition-all shadow-lg glow-accent active:scale-95"
          >
            {evaluating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{evaluating ? 'GEMINI INSPECTING...' : 'AI EVALUATE FEED'}</span>
          </button>
        </>
      )}

      {/* AI Evaluation Modal */}
      {showResultModal && aiResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyber-dark/80 backdrop-blur-md">
          <div className="glass-panel-accent w-full max-w-md rounded-2xl border border-cyber-accent/50 shadow-2xl overflow-hidden p-6 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-cyber-border pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-cyber-accent" />
                <h3 className="font-extrabold text-sm uppercase text-slate-100">
                  Gemini 3.8 Flash Vision Analysis
                </h3>
              </div>
              <button
                onClick={() => setShowResultModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className={`p-3 rounded-xl border flex items-center space-x-3 ${
                aiResult.threat_detected
                  ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                  : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              }`}>
                {aiResult.threat_detected ? (
                  <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 animate-bounce" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                )}
                <div>
                  <span className="font-extrabold block text-sm">
                    {aiResult.threat_detected ? 'SECURITY THREAT DETECTED' : 'SPATIAL AREA CLEAR'}
                  </span>
                  <span className="text-[10px] opacity-80">
                    {aiResult.threat_detected ? 'Intrusion threshold exceeded' : 'No target anomalies found'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-bold block mb-1 uppercase">AI Vision Rationale:</span>
                <p className="bg-cyber-dark p-3 rounded-lg border border-cyber-border text-slate-200 leading-relaxed">
                  {aiResult.rationale}
                </p>
              </div>

              {aiResult.alert_dispatched && (
                <div className="p-3 rounded-lg bg-cyber-accent/10 border border-cyber-accent/40 text-cyber-accent flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Automated SMTP Email Alert dispatched to security team!</span>
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowResultModal(false)}
                className="bg-cyber-accent text-cyber-dark font-bold px-4 py-2 rounded-lg text-xs"
              >
                CLOSE REPORT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
