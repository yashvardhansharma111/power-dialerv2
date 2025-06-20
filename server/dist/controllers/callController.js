"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.terminateCall = exports.makeManualCall = void 0;
const twilioClient_1 = __importDefault(require("../utils/twilioClient"));
const makeManualCall = async (req, res) => {
    const { to, from } = req.body;
    const callerId = from || process.env.DEFAULT_TWILIO_NUMBER;
    if (!to || !callerId) {
        res.status(400).json({ error: "Missing 'to' or 'from' number" });
        return;
    }
    try {
        // Use /api/twilio/connect for manual call, no room param (defaults to ZifyRoom)
        const call = await twilioClient_1.default.calls.create({
            from: callerId,
            to,
            record: true,
            url: `${process.env.BASE_URL}/api/twilio/connect`,
            statusCallback: `${process.env.BASE_URL}/api/twilio/events`,
            statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
            statusCallbackMethod: "POST",
        });
        res.json({ message: "Call initiated", sid: call.sid });
    }
    catch (err) {
        console.error("❌ Call failed:", err.message);
        res.status(500).json({
            error: "Call failed",
            details: err.message,
        });
    }
};
exports.makeManualCall = makeManualCall;
const terminateCall = async (req, res) => {
    const { sid } = req.params;
    try {
        await twilioClient_1.default.calls(sid).update({ status: "completed" });
        res.json({ message: "Call terminated successfully." });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to terminate call", error: err.message });
    }
};
exports.terminateCall = terminateCall;
