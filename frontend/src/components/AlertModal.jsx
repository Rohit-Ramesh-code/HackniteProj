import React, { useState } from 'react';
import { Bell, X, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { alertsAPI } from '../utils/api';

export function AlertModal({ isOpen, onClose }) {
  const [recipient, setRecipient] = useState('security-ops@aegis-spatial.local');
  const [subject, setSubject] = useState('[SECURITY ALERT] Unauthorized Spatial Intrusion');
  const [severity, setSeverity] = useState('HIGH');
  const [alertType, setAlertType] = useState('INTRUSION');
  const [description, setDescription] = useState('Synthetic entity detected violating restricted spatial perimeter in Zone 3.');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);

  if (!isOpen) return null;

  const handleSendAlert = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResultMessage(null);

    try {
      const res = await alertsAPI.dispatch({
        recipient_email: recipient,
        subject: subject,
        severity: severity,
        alert_type: alertType,
        camera_id: 'CAM-01-OPTIMIZED',
        location_coords: [1.5, 0.5, -3.2],
        description: description
      });

      setResultMessage(res);
    } catch (err) {
      setResultMessage({
        status: 'ERROR',
        message: 'Alert failed: ' + err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyber-dark/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel-accent w-full max-w-lg rounded-2xl border border-cyber-alert/50 shadow-2xl overflow-hidden glow-alert">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950 to-cyber-card p-4 border-b border-cyber-alert/30 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-cyber-alert animate-bounce" />
            <h3 className="font-extrabold text-sm uppercase text-slate-100 tracking-wider">
              SMTP Security Dispatcher
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSendAlert} className="p-6 space-y-4 text-xs font-mono">
          <div>
            <label className="block text-slate-400 mb-1">RECIPIENT EMAIL</label>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              className="w-full bg-cyber-dark text-slate-100 p-2.5 rounded-lg border border-cyber-border focus:border-cyber-alert focus:ring-1 focus:ring-cyber-alert outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">ALERT TYPE</label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value)}
                className="w-full bg-cyber-dark text-slate-100 p-2.5 rounded-lg border border-cyber-border focus:border-cyber-alert outline-none"
              >
                <option value="INTRUSION">INTRUSION DETECTED</option>
                <option value="CAMERA_OFFLINE">CAMERA OFFLINE</option>
                <option value="ANOMALY">SPATIAL ANOMALY</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">SEVERITY LEVEL</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-cyber-dark text-slate-100 p-2.5 rounded-lg border border-cyber-border focus:border-cyber-alert outline-none"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">EMAIL SUBJECT</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full bg-cyber-dark text-slate-100 p-2.5 rounded-lg border border-cyber-border focus:border-cyber-alert outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">ALERT DESCRIPTION</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              className="w-full bg-cyber-dark text-slate-100 p-2.5 rounded-lg border border-cyber-border focus:border-cyber-alert outline-none resize-none"
            />
          </div>

          {resultMessage && (
            <div className={`p-3 rounded-lg flex items-center space-x-2 ${
              resultMessage.status.includes('SUCCESS')
                ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
            }`}>
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{resultMessage.message}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-3 border-t border-cyber-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 bg-gradient-to-r from-rose-600 to-cyber-alert text-white px-5 py-2 rounded-lg font-bold hover:brightness-110 transition-all shadow-lg glow-alert"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'DISPATCHING...' : 'SEND SMTP ALERT'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
