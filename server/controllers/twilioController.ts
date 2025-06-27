import { Request, Response } from "express";
import { twiml } from "../utils/twilioClient";
import twilio from "twilio";
import { dialNextNumber, bulkCallState } from "./bulkcallController";
import { activeCustomerCalls } from "./callController";

// POST /api/twilio/bridge
// ✅ This bridges Twilio call directly to the customer
export const bridgeCall = (req: Request, res: Response): void => {
  try {
    const customerNumber = decodeURIComponent((req.query.customerNumber as string || "").trim());

    const response = new twiml.VoiceResponse();

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
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    res.status(500).type("text/xml").send(`<Response><Say>Error occurred.</Say></Response>`);
  }
};


// POST /api/twilio/events
export const callStatusWebhook = (req: Request, res: Response): void => {
  const { CallSid, CallStatus, From, To } = req.body;

  console.log("[Webhook] Call Status Event");
  console.log(" SID:", CallSid, "Status:", CallStatus);
  console.log(" From:", From, " To:", To);

  // Release the lock for this customer number if call ends
  if (["completed", "failed", "busy", "no-answer"].includes((CallStatus || "").toLowerCase())) {
    // Remove any customer number whose sid matches CallSid
    for (const [customerNumber, sid] of activeCustomerCalls.entries()) {
      if (sid === CallSid) {
        activeCustomerCalls.delete(customerNumber);
        console.log(`[activeCustomerCalls] LOCK RELEASED for ${customerNumber} (sid: ${CallSid})`);
        // Log all current locks
        for (const [num, s] of activeCustomerCalls.entries()) {
          console.log(`  ${num}: ${s}`);
        }
        break;
      }
    }
    // Bulk call state logic (leave as is)
    const idx = bulkCallState.results.findIndex((r: any) => r && r.sid === CallSid);
    if (idx !== -1) {
      bulkCallState.results[idx].status = CallStatus.toLowerCase() === "completed" ? "success" : "failed";
      bulkCallState.currentIndex = idx + 1;
    }
    setTimeout(() => {
      dialNextNumber();
    }, 1000);
  } else if (CallStatus.toLowerCase() === 'in-progress') {
    const idx = bulkCallState.results.findIndex((r: any) => r && r.sid === CallSid);
    if (idx !== -1) {
      bulkCallState.results[idx].status = 'in-progress';
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
  } else {
    console.warn("⚠️ Socket.IO instance not set in Express app");
  }

  res.sendStatus(200);
};

// POST /api/twilio/incoming
export const handleIncomingCall = (req: Request, res: Response): void => {
  console.log("📞 [Twilio] Incoming call hit");
  const voiceResponse = new twiml.VoiceResponse();
  voiceResponse.say("Thank you for calling. Please hold.");
  res.type("text/xml").send(voiceResponse.toString());
};


// POST /api/twilio/connect
// Directly dials the provided customer number, no conference logic
export const connectCall = (req: Request, res: Response): void => {
  try {
    // Accept customer number from query or body
    // Extract customer number from all possible sources
    const customerNumber = req.query.customerNumber 
      || req.body?.customerNumber 
      || req.body?.To 
      || req.body?.to;
    console.log(`[connectCall] Request to dial number: ${customerNumber}`);
    if (req.query.customerNumber) console.log('[connectCall] Used req.query.customerNumber');
    else if (req.body?.customerNumber) console.log('[connectCall] Used req.body.customerNumber');
    else if (req.body?.To) console.log('[connectCall] Used req.body.To');
    else if (req.body?.to) console.log('[connectCall] Used req.body.to');
    console.log("[connectCall] req.query:", req.query);
    console.log("[connectCall] req.body:", req.body);

    const response = new twiml.VoiceResponse();
    if (customerNumber && /^\+?\d{10,15}$/.test(customerNumber)) {
      const dial = response.dial({ answerOnBridge: true, callerId: process.env.TWILIO_NUMBER });
      dial.number(customerNumber);
      console.log(`[connectCall] TwiML generated for ${customerNumber} with callerId ${process.env.TWILIO_NUMBER}`);
    } else {
      response.say('Missing or invalid customer number');
      console.log('[connectCall] Missing or invalid customer number');
    }
    res.status(200).type("text/xml").send(response.toString());
  } catch (error: any) {
    console.error("❌ [connectCall] Error:", error.message);
    res.status(500).type("text/xml").send(`<Response><Say>Internal error occurred.</Say></Response>`);
  }
};

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const applicationSid = process.env.TWIML_APP_SID!; // 🟡 IMPORTANT: You must create a TwiML App in Twilio Console

export const getToken = (req: Request, res: Response) => {
  const capability = new twilio.jwt.ClientCapability({
    accountSid,
    authToken,
  });

  // ✅ Required: pass applicationSid for OutgoingClientScope
  capability.addScope(
    new twilio.jwt.ClientCapability.OutgoingClientScope({
      applicationSid, // 👈 Use the SID of your TwiML App
    })
  );

  const token = capability.toJwt();
  res.json({ token });
};

export const joinConference = (req:Request, res:Response) => {
  const response = new twiml.VoiceResponse();
  const dial = response.dial();
  dial.conference({
    startConferenceOnEnter: true,
    endConferenceOnExit: true,
  }, "ZifyRoom");

  res.type("text/xml");
  res.send(response.toString());
};


