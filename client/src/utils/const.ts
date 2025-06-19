const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api"

export const API = {
  LOGIN: `${API_BASE}/auth/login`,
  MANUAL_CALL: `${API_BASE}/calls/manual`,
  BULK_UPLOAD: `${API_BASE}/calls/upload`,
  TERMINATE: (sid: string) => `${API_BASE}/calls/terminate/${sid}`,
  GET_NUMBERS: `${API_BASE}/numbers/available`,
  CALL_LOGS: `${API_BASE}/call-logs/all`,
  GET_TWILIO_TOKEN: `${API_BASE}/twilio/token`,
  CALL_LOGS_BY_NUMBER: (num: string) => `${API_BASE}/call-logs/${num}`,

  // 🆕 Bulk Call Endpoints
  BULK_CALLS: {
    UPLOAD_EXCEL: `${API_BASE}/bulk-calls/upload-excel`,
    START: `${API_BASE}/bulk-calls/start`,
    PAUSE: `${API_BASE}/bulk-calls/pause`,
    RESUME: `${API_BASE}/bulk-calls/resume`,
    STOP: `${API_BASE}/bulk-calls/stop`,
    STATUS: `${API_BASE}/bulk-calls/status`,
  },
}

