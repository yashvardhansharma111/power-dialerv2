"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamRecordingAudio = exports.getRecordingBySid = exports.getCallLogsByNumber = exports.getAllCallLogs = void 0;
const twilioClient_1 = __importDefault(require("../utils/twilioClient"));
const axios_1 = __importDefault(require("axios"));
// Get all call logs (limit 100 or more if needed)
const getAllCallLogs = async (_req, res) => {
    try {
        const calls = await twilioClient_1.default.calls.list({ limit: 100 });
        res.json(calls.map(call => ({
            sid: call.sid,
            from: call.from,
            to: call.to,
            status: call.status,
            startTime: call.startTime,
            duration: call.duration,
            direction: call.direction,
            price: call.price,
            recordingUrl: call.subresourceUris?.recordings,
        })));
    }
    catch (error) {
        console.error("Error fetching all call logs:", error);
        res.status(500).json({ message: "Failed to fetch call logs" });
    }
};
exports.getAllCallLogs = getAllCallLogs;
// Get logs for a specific number (either from/to)
const getCallLogsByNumber = async (req, res) => {
    const { number } = req.params;
    try {
        const calls = await twilioClient_1.default.calls.list({
            limit: 50,
            to: number, // Optional: you can also add `from: number` if needed
        });
        res.json(calls.map(call => ({
            sid: call.sid,
            from: call.from,
            to: call.to,
            status: call.status,
            startTime: call.startTime,
            duration: call.duration,
            direction: call.direction,
            price: call.price,
            recordingUrl: call.subresourceUris?.recordings,
        })));
    }
    catch (error) {
        console.error("Error fetching call logs by number:", error);
        res.status(500).json({ message: "Failed to fetch logs for the number" });
    }
};
exports.getCallLogsByNumber = getCallLogsByNumber;
// Get recording URL for a call SID
const getRecordingBySid = async (req, res) => {
    const { sid } = req.params;
    try {
        const recordings = await twilioClient_1.default.recordings.list({ callSid: sid, limit: 1 });
        if (!recordings.length) {
            res.status(404).json({ message: "No recording found for this call." });
            return;
        }
        const recording = recordings[0];
        const url = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
        res.json({ url });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch recording.", error: err instanceof Error ? err.message : String(err) });
    }
};
exports.getRecordingBySid = getRecordingBySid;
const streamRecordingAudio = async (req, res) => {
    const { sid } = req.params;
    try {
        const recordings = await twilioClient_1.default.recordings.list({ callSid: sid, limit: 1 });
        if (!recordings.length) {
            res.status(404).json({ message: "No recording found for this call." });
            return;
        }
        const recording = recordings[0];
        const url = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
        const twilioAuth = {
            username: process.env.TWILIO_ACCOUNT_SID,
            password: process.env.TWILIO_AUTH_TOKEN,
        };
        const response = await axios_1.default.get(url, {
            responseType: "stream",
            auth: twilioAuth,
        });
        res.setHeader("Content-Type", "audio/mpeg");
        response.data.pipe(res);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to stream recording.", error: err instanceof Error ? err.message : String(err) });
    }
};
exports.streamRecordingAudio = streamRecordingAudio;
