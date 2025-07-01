"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToken = exports.connectCall = exports.handleIncomingCall = exports.callStatusWebhook = exports.bridgeCall = void 0;
const twilioClient_1 = require("../utils/twilioClient");
const bulkcallController_1 = require("./bulkcallController");
const callController_1 = require("./callController");
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
    console.log("[Webhook] Call Status Event");
    console.log(" SID:", CallSid, "Status:", CallStatus);
    console.log(" From:", From, " To:", To);
    // Release the lock for this customer number if call ends
    if (["completed", "failed", "busy", "no-answer"].includes((CallStatus || "").toLowerCase())) {
        // Remove any customer number whose sid matches CallSid
        for (const [customerNumber, sid] of callController_1.activeCustomerCalls.entries()) {
            if (sid === CallSid) {
                callController_1.activeCustomerCalls.delete(customerNumber);
                console.log(`[activeCustomerCalls] LOCK RELEASED for ${customerNumber} (sid: ${CallSid})`);
                // Log all current locks
                for (const [num, s] of callController_1.activeCustomerCalls.entries()) {
                    console.log(`  ${num}: ${s}`);
                }
                break;
            }
        }
        // Update bulk call result
        const idx = bulkcallController_1.bulkCallState.results.findIndex((r) => r && r.sid === CallSid);
        if (idx !== -1) {
            bulkcallController_1.bulkCallState.results[idx].status = CallStatus.toLowerCase() === "completed" ? "success" : "failed";
            bulkcallController_1.bulkCallState.currentIndex = idx + 1;
        }
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
    // Emit incoming call event via Socket.IO
    const io = req.app.get("io");
    if (io) {
        io.emit("incoming-call", {
            from: req.body.From,
            to: req.body.To,
            callSid: req.body.CallSid,
            timestamp: Date.now(),
        });
        console.log("✅ Emitted incoming-call via WebSocket");
    }
    else {
        console.warn("⚠️ Socket.IO instance not set in Express app");
    }
    res.type("text/xml").send(voiceResponse.toString());
};
exports.handleIncomingCall = handleIncomingCall;
// POST /api/twilio/connect
// Directly dials the provided customer number, no conference logic
const connectCall = (req, res) => {
    try {
        // Accept customer number from query or body
        // Extract customer number from all possible sources
        const customerNumber = req.query.customerNumber
            || req.body?.customerNumber
            || req.body?.To
            || req.body?.to;
        console.log(`[connectCall] Request to dial number: ${customerNumber}`);
        if (req.query.customerNumber)
            console.log('[connectCall] Used req.query.customerNumber');
        else if (req.body?.customerNumber)
            console.log('[connectCall] Used req.body.customerNumber');
        else if (req.body?.To)
            console.log('[connectCall] Used req.body.To');
        else if (req.body?.to)
            console.log('[connectCall] Used req.body.to');
        console.log("[connectCall] req.query:", req.query);
        console.log("[connectCall] req.body:", req.body);
        const response = new twilioClient_1.twiml.VoiceResponse();
        if (customerNumber && /^\+?\d{10,15}$/.test(customerNumber)) {
            const dial = response.dial({ answerOnBridge: true, callerId: process.env.TWILIO_NUMBER });
            dial.number(customerNumber);
            console.log(`[connectCall] TwiML generated for ${customerNumber} with callerId ${process.env.TWILIO_NUMBER}`);
        }
        else {
            response.say('Missing or invalid customer number');
            console.log('[connectCall] Missing or invalid customer number');
        }
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
const twilio_1 = require("twilio");
const AccessToken = twilio_1.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const getToken = (req, res) => {
    const { identity } = req.body;
    if (!identity) {
        res.status(400).json({ message: "Identity required" });
        return;
    }
    const token = new AccessToken(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET, { identity });
    const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: process.env.TWIML_APP_SID,
        incomingAllow: true,
    });
    token.addGrant(voiceGrant);
    res.json({ token: token.toJwt() });
};
exports.getToken = getToken;
