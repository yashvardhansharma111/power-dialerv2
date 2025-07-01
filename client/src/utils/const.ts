const API_BASE = "http://localhost:8001/api";

export const API = {
  LOGIN: `${API_BASE}/auth/login`,
  MANUAL_CALL: `${API_BASE}/calls/manual`,
  BULK_UPLOAD: `${API_BASE}/calls/upload`,
  TERMINATE: (sid: string) => `${API_BASE}/calls/terminate/${sid}`,
  GET_NUMBERS: `${API_BASE}/numbers/available`,
  CALL_LOGS: `${API_BASE}/call-logs/all`,
  GET_TWILIO_TOKEN: `${API_BASE}/twilio/token`,
  CALL_LOGS_BY_NUMBER: (num: string) => `${API_BASE}/call-logs/${num}`,
  DASHBOARD_STATS: `${API_BASE}/dashboard/stats`,
  CALL_RECORDING_AUDIO: (sid: string) => `${API_BASE}/call-logs/recording/audio/${sid}`,
  CALL_RECORDING_META: (sid: string) => `${API_BASE}/call-logs/recording/${sid}`,

  // 🆕 Bulk Call Endpoints
  BULK_CALLS: {
    UPLOAD_EXCEL: `${API_BASE}/bulk-calls/upload-excel`,
    START: `${API_BASE}/bulk-calls/start`,
    PAUSE: `${API_BASE}/bulk-calls/pause`,
    RESUME: `${API_BASE}/bulk-calls/resume`,
    STOP: `${API_BASE}/bulk-calls/stop`,
    STATUS: `${API_BASE}/bulk-calls/status`,
  },

  // 🆕 Messaging Endpoints
  MESSAGES: {
    SEND: `${API_BASE}/messages/send`,                     // POST
    ALL: `${API_BASE}/messages/all`,                       // GET
    FILTER: (status: string) => `${API_BASE}/messages/filter?status=${status}`, // GET
    CONVERSATION: (number: string, from: string) =>
      `${API_BASE}/messages/conversation/${number}?from=${from}`,              // GET
    STATUS_CALLBACK: `${API_BASE}/messages/status-callback`, // POST (used by Twilio internally)
  },

  AGENT_JOIN_CONFERENCE: `${API_BASE}/twilio/agent-join`,
};
