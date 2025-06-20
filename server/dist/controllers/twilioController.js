"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinConference = exports.getToken = exports.connectCall = exports.handleIncomingCall = exports.callStatusWebhook = exports.bridgeCall = void 0;
const twilioClient_1 = require("../utils/twilioClient");
const twilio_1 = __importDefault(require("twilio"));
const bulkcallController_1 = require("./bulkcallController");
// POST /api/twilio/bridge
// ✅ This bridges Twilio call directly to the customer
const bridgeCall = (req, res) => {
    try {
        const customerNumber = decodeURIComponent((req.query.customerNumber || "").trim());
        const response = new twilioClient_1.twiml.VoiceResponse();
        // 🔍 Validate number
        if (!customerNumber || !/^\+?\d{10,15}$/.test(customerNumber)) {
            response.say("Invalid customer number.");
            res.status(400).type("text/xml").send(response.toString());
            return;
        }
        // ✅ Directly connect to customer
        const dial = response.dial({ answerOnBridge: true });
        dial.number(customerNumber); // ← ye connect karega
        res.status(200).type("text/xml").send(response.toString());
    }
    catch (err) {
        console.error("❌ Error:", err.message);
        res.status(500).type("text/xml").send(`<Response><Say>Error occurred.</Say></Response>`);
    }
};
exports.bridgeCall = bridgeCall;
// POST /api/twilio/events
const callStatusWebhook = (req, res) => {
    const { CallSid, CallStatus, From, To } = req.body;
    console.log("📡 [Webhook] Call Status Event");
    console.log("📞 SID:", CallSid, "Status:", CallStatus);
    console.log("👤 From:", From, "➡️ To:", To);
    // Fix: always match by sid only
    if (["completed", "failed", "busy", "no-answer"].includes((CallStatus || "").toLowerCase())) {
        const idx = bulkcallController_1.bulkCallState.results.findIndex((r) => r && r.sid === CallSid);
        if (idx !== -1) {
            bulkcallController_1.bulkCallState.results[idx].status = CallStatus.toLowerCase() === "completed" ? "success" : "failed";
            bulkcallController_1.bulkCallState.currentIndex = idx + 1;
        }
        setTimeout(() => {
            (0, bulkcallController_1.dialNextNumber)();
        }, 1000);
    }
    else if (CallStatus.toLowerCase() === 'in-progress') {
        const idx = bulkcallController_1.bulkCallState.results.findIndex((r) => r && r.sid === CallSid);
        if (idx !== -1) {
            bulkcallController_1.bulkCallState.results[idx].status = 'in-progress';
        }
    }
    const io = req.app.get("io");
    if (io) {
        io.emit("call-status", {
            sid: CallSid,
            from: From,
            to: To,
            status: CallStatus,
        });
        console.log("✅ Emitted status via WebSocket");
    }
    else {
        console.warn("⚠️ Socket.IO instance not set in Express app");
    }
    res.sendStatus(200);
};
exports.callStatusWebhook = callStatusWebhook;
// POST /api/twilio/incoming
const handleIncomingCall = (req, res) => {
    console.log("📞 [Twilio] Incoming call hit");
    const voiceResponse = new twilioClient_1.twiml.VoiceResponse();
    voiceResponse.say("Thank you for calling. Please hold.");
    res.type("text/xml").send(voiceResponse.toString());
};
exports.handleIncomingCall = handleIncomingCall;
const connectCall = (req, res) => {
    try {
        // Accept room from query or body, or use default for manual call
        const roomName = req.query.room || req.body?.room || req.body?.conference || "ZifyRoom";
        console.log(`📞 [connectCall] Request to join room: ${roomName}`);
        console.log("[connectCall] req.query:", req.query);
        console.log("[connectCall] req.body:", req.body);
        const response = new twilioClient_1.twiml.VoiceResponse();
        const dial = response.dial({ answerOnBridge: true });
        dial.conference({
            startConferenceOnEnter: true,
            endConferenceOnExit: false,
            waitUrl: 'http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical',
        }, roomName);
        res.status(200).type("text/xml").send(response.toString());
    }
    catch (error) {
        console.error("❌ [connectCall] Error:", error.message);
        res.status(500).type("text/xml").send(`<Response><Say>Internal error occurred.</Say></Response>`);
    }
};
exports.connectCall = connectCall;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const applicationSid = process.env.TWIML_APP_SID; // 🟡 IMPORTANT: You must create a TwiML App in Twilio Console
const getToken = (req, res) => {
    const capability = new twilio_1.default.jwt.ClientCapability({
        accountSid,
        authToken,
    });
    // ✅ Required: pass applicationSid for OutgoingClientScope
    capability.addScope(new twilio_1.default.jwt.ClientCapability.OutgoingClientScope({
        applicationSid, // 👈 Use the SID of your TwiML App
    }));
    const token = capability.toJwt();
    res.json({ token });
};
exports.getToken = getToken;
const joinConference = (req, res) => {
    const response = new twilioClient_1.twiml.VoiceResponse();
    const dial = response.dial();
    dial.conference({
        startConferenceOnEnter: true,
        endConferenceOnExit: true,
    }, "ZifyRoom");
    res.type("text/xml");
    res.send(response.toString());
};
exports.joinConference = joinConference;
