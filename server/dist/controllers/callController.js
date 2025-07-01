"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.terminateCall = exports.activeCustomerCalls = exports.makeManualCall = void 0;
const twilioClient_1 = __importDefault(require("../utils/twilioClient"));
// In-memory store for active calls by customer number
const activeCustomerCalls = new Map(); // customerNumber -> CallSid
exports.activeCustomerCalls = activeCustomerCalls;
function logActiveCalls() {
    console.log('[activeCustomerCalls] Current locks:');
    for (const [num, sid] of activeCustomerCalls.entries()) {
        console.log(`  ${num}: ${sid}`);
    }
}
const makeManualCall = async (req, res) => {
    const { to, from } = req.body;
    const callerId = from || process.env.DEFAULT_TWILIO_NUMBER;
    if (!to || !callerId) {
        res.status(400).json({ error: "Missing 'to' or 'from' number" });
        return;
    }
    // Prevent multiple concurrent calls to the same customer
    if (activeCustomerCalls.has(to)) {
        res.status(409).json({ error: "A call to this customer is already in progress. Please wait until the current call ends." });
        return;
    }
    try {
        const call = await twilioClient_1.default.calls.create({
            from: callerId,
            to,
            record: true,
            url: `${process.env.BASE_URL}/api/twilio/connect?customerNumber=${encodeURIComponent(to)}`,
            statusCallback: `${process.env.BASE_URL}/api/twilio/events`,
            statusCallbackEvent: ["initiated", "ringing", "answered", "completed", "failed", "busy", "no-answer"],
            statusCallbackMethod: "POST",
        });
        // Mark this number as in-progress
        activeCustomerCalls.set(to, call.sid);
        console.log(`[activeCustomerCalls] LOCK SET for ${to} (sid: ${call.sid})`);
        logActiveCalls();
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
