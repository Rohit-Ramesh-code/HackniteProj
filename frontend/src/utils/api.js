import axios from 'axios';

const API_BASE = '/api';

export const colmapAPI = {
  processJSON: async (jsonData) => {
    const res = await axios.post(`${API_BASE}/colmap/process-json`, jsonData);
    return res.data;
  },
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${API_BASE}/colmap/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  extractCandidates: async (jsonData) => {
    const res = await axios.post(`${API_BASE}/colmap/extract-candidates`, jsonData);
    return res.data;
  }
};

export const optimizationAPI = {
  runSetCover: async (payload) => {
    const res = await axios.post(`${API_BASE}/optimization/set-cover`, payload);
    return res.data;
  },
  getCandidateGrid: async (params = {}) => {
    const res = await axios.get(`${API_BASE}/optimization/candidate-grid`, { params });
    return res.data;
  }
};

export const alertsAPI = {
  dispatch: async (payload) => {
    const res = await axios.post(`${API_BASE}/alerts/dispatch`, payload);
    return res.data;
  }
};

export const inferenceAPI = {
  evaluateFeed: async (videoBlob, recipientEmail = "security-ops@aegis-spatial.local", cameraId = "CAM-01-OPTIMIZED") => {
    const formData = new FormData();
    formData.append('file', videoBlob, 'recorded-feed.webm');
    formData.append('recipient_email', recipientEmail);
    formData.append('camera_id', cameraId);

    const res = await axios.post(`${API_BASE}/inference/evaluate-feed`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }
};

export const syntheticAPI = {
  getPresets: async () => {
    const res = await axios.get(`${API_BASE}/synthetic/presets`);
    return res.data;
  },
  previewPrompts: async (payload) => {
    const res = await axios.post(`${API_BASE}/synthetic/preview-prompts`, payload);
    return res.data;
  },
  startGeneration: async (payload) => {
    const res = await axios.post(`${API_BASE}/synthetic/generate`, payload);
    return res.data;
  },
  getJobStatus: async (jobId) => {
    const res = await axios.get(`${API_BASE}/synthetic/jobs/${jobId}`);
    return res.data;
  },
  getCatalog: async () => {
    const res = await axios.get(`${API_BASE}/synthetic/catalog`);
    return res.data;
  },
  generateRoomDataset: async () => {
    const res = await axios.post(`${API_BASE}/synthetic/generate-room-dataset`);
    return res.data;
  }
};

export const ollamaAPI = {
  getStatus: async () => {
    const res = await axios.get(`${API_BASE}/ollama/status`);
    return res.data;
  },
  getIncidents: async () => {
    const res = await axios.get(`${API_BASE}/ollama/incidents`);
    return res.data;
  },
  query: async (question, model = 'llama3.2') => {
    const res = await axios.post(`${API_BASE}/ollama/query`, { question, model });
    return res.data;
  }
};



